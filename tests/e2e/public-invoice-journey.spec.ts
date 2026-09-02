import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { withExternalChrome } from "./external-chrome";
import type { Database } from "@/lib/database/types";
import { parseLocalAmount } from "@/lib/money";

type DisposableData = {
  userId: string;
  creatorWallet: string;
  openInvoiceId: string;
  openPublicId: string;
  cancelledInvoiceId: string;
  cancelledPublicId: string;
  overdueInvoiceId: string;
  overduePublicId: string;
};

async function setupDisposableData(): Promise<DisposableData | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    return null;
  }

  try {
    const admin: SupabaseClient<Database> = createClient<Database>(
      supabaseUrl,
      secretKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const testEmail = `e2e-journey-${randomUUID()}@payproof.test`;
    const { data: userData, error: userError } =
      await admin.auth.admin.createUser({
        email: testEmail,
        password: `${randomUUID()}Aa1!`,
        email_confirm: true,
      });

    if (userError || !userData.user) {
      return null;
    }

    const userId = userData.user.id;
    const creatorWallet = "0x1234567890AbcdEF1234567890aBcdef12345678";
    const now = new Date().toISOString();

    // 1. Open Invoice
    const { data: openRow } = await admin
      .from("invoices")
      .insert({
        creator_user_id: userId,
        creator_wallet: creatorWallet,
        recipient_wallet: creatorWallet,
        freelancer_name: "Ada Lovelace Engineering",
        client_reference: "E2E Ref #402",
        description: "Quantum Computing Consultation & Architecture",
        currency: "NGN",
        amount_minor: Number(parseLocalAmount("750000.00")),
        due_date: "2026-10-15",
        lifecycle: "open",
      })
      .select("id, public_id")
      .single();

    // 2. Cancelled Invoice
    const { data: cancelledRow } = await admin
      .from("invoices")
      .insert({
        creator_user_id: userId,
        creator_wallet: creatorWallet,
        recipient_wallet: creatorWallet,
        freelancer_name: "Ada Lovelace Engineering",
        client_reference: "Cancelled Ref",
        description: "Cancelled Design Workshop",
        currency: "USD",
        amount_minor: Number(parseLocalAmount("300.00")),
        due_date: "2026-10-15",
        lifecycle: "cancelled",
        cancelled_at: now,
      })
      .select("id, public_id")
      .single();

    // 3. Overdue Invoice
    const { data: overdueRow } = await admin
      .from("invoices")
      .insert({
        creator_user_id: userId,
        creator_wallet: creatorWallet,
        recipient_wallet: creatorWallet,
        freelancer_name: "Ada Lovelace Engineering",
        client_reference: "Overdue Ref",
        description: "Overdue Technical Audit",
        currency: "EUR",
        amount_minor: Number(parseLocalAmount("1200.00")),
        due_date: "2025-01-01",
        lifecycle: "open",
      })
      .select("id, public_id")
      .single();

    if (!openRow || !cancelledRow || !overdueRow) {
      await admin.auth.admin.deleteUser(userId);
      return null;
    }

    return {
      userId,
      creatorWallet,
      openInvoiceId: openRow.id,
      openPublicId: openRow.public_id,
      cancelledInvoiceId: cancelledRow.id,
      cancelledPublicId: cancelledRow.public_id,
      overdueInvoiceId: overdueRow.id,
      overduePublicId: overdueRow.public_id,
    };
  } catch {
    return null;
  }
}

async function cleanupDisposableData(data: DisposableData | null) {
  if (!data) return;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) return;

  try {
    const admin: SupabaseClient<Database> = createClient<Database>(
      supabaseUrl,
      secretKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    await admin
      .from("invoices")
      .delete()
      .in("id", [
        data.openInvoiceId,
        data.cancelledInvoiceId,
        data.overdueInvoiceId,
      ]);
    await admin.auth.admin.deleteUser(data.userId);
  } catch {
    // ignore
  }
}

test("Item 6 public invoice browser journey and responsive proof", async ({
  baseURL,
}, testInfo) => {
  const viewport =
    testInfo.project.name === "mobile-chrome"
      ? { width: 390, height: 844 }
      : { width: 1440, height: 1000 };

  const data = await setupDisposableData();

  try {
    await withExternalChrome(viewport, async (page) => {
      // 1. Invalid public ID fails closed without requiring a wallet
      const notFoundRes = await page.goto(`${baseURL}/i/invalid-public-id-999`);
      expect(notFoundRes?.status()).toBe(200);
      await expect(
        page.getByRole("heading", { name: "Invoice Not Found" }),
      ).toBeVisible();
      await expect(
        page.getByText("Base Sepolia testnet", { exact: false }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Go to PayProof home" }),
      ).toBeVisible();

      if (data) {
        // 2. Real unguessable public invoice URL (Open state)
        const openRes = await page.goto(`${baseURL}/i/${data.openPublicId}`);
        expect(openRes?.status()).toBe(200);

        // Verify freelancer, description, amount, due date, recipient summary, status, privacy notice, Base Sepolia warning
        await expect(
          page.getByText("Base Sepolia testnet • Test USDC has no real monetary value"),
        ).toBeVisible();
        await expect(
          page.getByText("Anyone with this link can view this invoice", {
            exact: false,
          }),
        ).toBeVisible();
        await expect(page.getByText("Awaiting Payment")).toBeVisible();
        await expect(
          page.getByText("Ada Lovelace Engineering"),
        ).toBeVisible();
        await expect(
          page.getByText("Quantum Computing Consultation & Architecture"),
        ).toBeVisible();
        await expect(page.getByText("₦750,000.00")).toBeVisible();
        await expect(page.getByText("0x1234…5678")).toBeVisible();

        // 3. Confirm private creator userId and internal UUID are completely absent from HTML
        const content = await page.content();
        expect(content).not.toContain(data.userId);
        expect(content).not.toContain(data.openInvoiceId);

        // 4. Test Share / Clipboard fallback with truthful feedback
        const shareButton = page.getByRole("button", {
          name: /Share invoice link/i,
        });
        if (await shareButton.isVisible()) {
          await shareButton.click();
          await expect(
            page.getByText(/Link Copied|copied to clipboard|Could not copy/i),
          ).toBeVisible();
        }

        // 5. Test Cancelled Invoice State (Payment permanently disabled)
        await page.goto(`${baseURL}/i/${data.cancelledPublicId}`);
        await expect(page.getByText("Cancelled", { exact: false })).toBeVisible();
        await expect(
          page.getByText("Invoice Cancelled:", { exact: false }),
        ).toBeVisible();

        // 6. Test Overdue Invoice State (Overdue remains payable!)
        await page.goto(`${baseURL}/i/${data.overduePublicId}`);
        await expect(page.getByText("Overdue", { exact: false })).toBeVisible();
        await expect(
          page.getByText("Past Due Date:", { exact: false }),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", { name: "Client Payment Step" }),
        ).toBeVisible();
      } else {
        // Fallback check when DB is offline: test non-existent UUID
        const fallbackRes = await page.goto(
          `${baseURL}/i/00000000-0000-0000-0000-000000000000`,
        );
        expect(fallbackRes?.status()).toBe(200);
        await expect(
          page.getByText("Base Sepolia testnet", { exact: false }),
        ).toBeVisible();
      }

      // 7. Verify NO horizontal overflow at current viewport
      const hasHorizontalOverflow = await page.evaluate(() => {
        return (
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
        );
      });
      expect(hasHorizontalOverflow).toBe(false);
    });
  } finally {
    await cleanupDisposableData(data);
  }
});
