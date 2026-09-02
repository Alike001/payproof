import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { withExternalChrome } from "./external-chrome";
import type { Database } from "@/lib/database/types";
import { parseLocalAmount } from "@/lib/money";

type DisposableData = {
  userId: string;
  creatorWallet: string;
  invoiceIds: string[];
  openInvoiceId: string;
  openPublicId: string;
  cancelledPublicId: string;
  overduePublicId: string;
};

type PartialDisposableData = Pick<DisposableData, "userId" | "invoiceIds">;

const hasDatabaseAdminConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
);

test.skip(
  !hasDatabaseAdminConfig,
  "requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY for real invoice fixtures",
);

function getAdminClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error("Supabase admin configuration is unavailable.");
  }

  return createClient<Database>(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function cleanupDisposableData(
  admin: SupabaseClient<Database>,
  data: PartialDisposableData,
): Promise<void> {
  const failures: Error[] = [];

  if (data.invoiceIds.length > 0) {
    const { data: deletedRows, error } = await admin
      .from("invoices")
      .delete()
      .in("id", data.invoiceIds)
      .select("id");

    if (error) {
      failures.push(
        new Error(`Could not delete E2E invoices: ${error.message}`),
      );
    } else if (deletedRows.length !== data.invoiceIds.length) {
      failures.push(
        new Error(
          `Expected to delete ${data.invoiceIds.length} E2E invoices, deleted ${deletedRows.length}.`,
        ),
      );
    }
  }

  if (data.userId) {
    const { error } = await admin.auth.admin.deleteUser(data.userId);
    if (error) {
      failures.push(new Error(`Could not delete E2E user: ${error.message}`));
    }
  }

  if (failures.length > 0) {
    throw new AggregateError(failures, "E2E fixture cleanup failed.");
  }
}

async function insertInvoice(
  admin: SupabaseClient<Database>,
  invoiceIds: string[],
  values: Database["public"]["Tables"]["invoices"]["Insert"],
): Promise<{ id: string; publicId: string }> {
  const { data, error } = await admin
    .from("invoices")
    .insert(values)
    .select("id, public_id")
    .single();

  if (error || !data) {
    throw new Error(
      `Could not create E2E invoice: ${error?.message ?? "no row returned"}`,
    );
  }

  invoiceIds.push(data.id);
  return { id: data.id, publicId: data.public_id };
}

async function setupDisposableData(
  admin: SupabaseClient<Database>,
): Promise<DisposableData> {
  const partial: PartialDisposableData = { userId: "", invoiceIds: [] };

  try {
    const testEmail = `e2e-journey-${randomUUID()}@payproof.test`;
    const { data: userData, error: userError } =
      await admin.auth.admin.createUser({
        email: testEmail,
        password: `${randomUUID()}Aa1!`,
        email_confirm: true,
      });

    if (userError || !userData.user) {
      throw new Error(
        `Could not create E2E user: ${userError?.message ?? "no user returned"}`,
      );
    }

    partial.userId = userData.user.id;
    const creatorWallet = "0x1234567890AbcdEF1234567890aBcdef12345678";

    const openInvoice = await insertInvoice(admin, partial.invoiceIds, {
      creator_user_id: partial.userId,
      creator_wallet: creatorWallet,
      recipient_wallet: creatorWallet,
      freelancer_name: "Ada Lovelace Engineering",
      client_reference: "E2E Ref #402",
      description: "Quantum Computing Consultation & Architecture",
      currency: "NGN",
      amount_minor: Number(parseLocalAmount("750000.00")),
      due_date: "2026-10-15",
      lifecycle: "open",
    });

    const cancelledInvoice = await insertInvoice(admin, partial.invoiceIds, {
      creator_user_id: partial.userId,
      creator_wallet: creatorWallet,
      recipient_wallet: creatorWallet,
      freelancer_name: "Ada Lovelace Engineering",
      client_reference: "Cancelled Ref",
      description: "Cancelled Design Workshop",
      currency: "USD",
      amount_minor: Number(parseLocalAmount("300.00")),
      due_date: "2026-10-15",
      lifecycle: "cancelled",
      cancelled_at: new Date().toISOString(),
    });

    const overdueInvoice = await insertInvoice(admin, partial.invoiceIds, {
      creator_user_id: partial.userId,
      creator_wallet: creatorWallet,
      recipient_wallet: creatorWallet,
      freelancer_name: "Ada Lovelace Engineering",
      client_reference: "Overdue Ref",
      description: "Overdue Technical Audit",
      currency: "EUR",
      amount_minor: Number(parseLocalAmount("1200.00")),
      due_date: "2025-01-01",
      lifecycle: "open",
    });

    return {
      userId: partial.userId,
      creatorWallet,
      invoiceIds: partial.invoiceIds,
      openInvoiceId: openInvoice.id,
      openPublicId: openInvoice.publicId,
      cancelledPublicId: cancelledInvoice.publicId,
      overduePublicId: overdueInvoice.publicId,
    };
  } catch (setupError) {
    try {
      await cleanupDisposableData(admin, partial);
    } catch (cleanupError) {
      throw new AggregateError(
        [setupError, cleanupError],
        "E2E fixture setup and cleanup both failed.",
      );
    }
    throw setupError;
  }
}

async function expectNoHorizontalOverflow(page: Page) {
  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
}

test("Item 6 public invoice browser journey and responsive proof", async ({
  baseURL,
}, testInfo) => {
  const viewport =
    testInfo.project.name === "mobile-chrome"
      ? { width: 390, height: 844 }
      : { width: 1440, height: 1000 };
  const admin = getAdminClient();
  let data: DisposableData | undefined;

  try {
    const fixture = await setupDisposableData(admin);
    data = fixture;

    await withExternalChrome(viewport, async (page) => {
      const quotedAt = new Date();
      const expiresAt = new Date(quotedAt.getTime() + 15 * 60 * 1_000);

      await page.addInitScript(() => {
        Object.defineProperty(navigator, "share", {
          configurable: true,
          value: undefined,
        });
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: { writeText: () => Promise.resolve() },
        });
      });

      await page.route(
        `**/api/invoices/${fixture.openPublicId}/quote`,
        async (route) => {
          expect(route.request().method()).toBe("POST");
          await route.fulfill({
            contentType: "application/json",
            status: 200,
            body: JSON.stringify({
              ok: true,
              reused: true,
              quote: {
                quoteId: "88888888-8888-4888-8888-888888888888",
                sourceCurrency: "NGN",
                targetCurrency: "USD",
                localAmountFormatted: "₦750,000.00",
                rateToUsd: "0.000666666666666667",
                usdcAmountUnits: "500000000",
                usdcAmountFormatted: "500.000000",
                quotedAt: quotedAt.toISOString(),
                expiresAt: expiresAt.toISOString(),
                sourceObservedAt: quotedAt.toISOString(),
                source: {
                  kind: "telegraph_fx",
                  name: "Structured FX feed",
                  minerId: "20260827",
                  minerName: "FX Rate Mirror",
                  attemptRole: "primary",
                },
              },
            }),
          });
        },
      );

      const notFoundResponse = await page.goto(
        `${baseURL}/i/invalid-public-id-999`,
      );
      expect(notFoundResponse?.status()).toBe(200);
      await expect(
        page.getByRole("heading", { name: "Invoice Not Found" }),
      ).toBeVisible();
      await expect(
        page.getByText("Base Sepolia testnet", { exact: false }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Go to PayProof home" }),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const openResponse = await page.goto(
        `${baseURL}/i/${fixture.openPublicId}`,
      );
      expect(openResponse?.status()).toBe(200);
      await expect(
        page.getByText(
          "Base Sepolia testnet • Test USDC has no real monetary value",
        ),
      ).toBeVisible();
      await expect(
        page.getByText("Anyone with this link can view this invoice", {
          exact: false,
        }),
      ).toBeVisible();
      await expect(
        page.getByText("Awaiting Payment", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText("Ada Lovelace Engineering")).toBeVisible();
      await expect(
        page.getByText("Quantum Computing Consultation & Architecture"),
      ).toBeVisible();
      await expect(
        page.getByText("₦750,000.00", { exact: true }).first(),
      ).toBeVisible();
      await expect(page.getByText("2026-10-15")).toBeVisible();
      await expect(page.getByText("0x1234…5678")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Client Payment Step" }),
      ).toBeVisible();
      await expect(
        page.getByText("500.000000 test USDC", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("1 NGN = 0.000666666666666667 USD"),
      ).toBeVisible();
      await expect(page.getByText(/FX Rate Mirror \[primary\]/)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Connect wallet to pay" }),
      ).toBeDisabled();

      const content = await page.content();
      expect(content).not.toContain(fixture.userId);
      expect(content).not.toContain(fixture.openInvoiceId);

      const shareButton = page.getByRole("button", {
        name: "Share invoice link ↗",
      });
      await expect(shareButton).toBeVisible();
      await shareButton.click();
      await expect(
        page.getByText("Link copied to clipboard!", { exact: true }).last(),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const cancelledResponse = await page.goto(
        `${baseURL}/i/${fixture.cancelledPublicId}`,
      );
      expect(cancelledResponse?.status()).toBe(200);
      await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
      await expect(
        page.getByText("Payment is permanently disabled", { exact: false }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Client Payment Step" }),
      ).toHaveCount(0);
      await expectNoHorizontalOverflow(page);

      const overdueResponse = await page.goto(
        `${baseURL}/i/${fixture.overduePublicId}`,
      );
      expect(overdueResponse?.status()).toBe(200);
      await expect(page.getByText("⚠ Overdue", { exact: true })).toBeVisible();
      await expect(
        page.getByText(
          "This invoice passed its due date (2025-01-01) but remains open for payment.",
          { exact: false },
        ),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Client Payment Step" }),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  } finally {
    if (data) {
      await cleanupDisposableData(admin, data);
    }
  }
});
