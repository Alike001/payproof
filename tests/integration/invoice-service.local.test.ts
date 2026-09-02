// @vitest-environment node

import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CreatorSession } from "@/features/auth/creator-session.server";
import {
  cancelCreatorInvoice,
  publishInvoice,
  readPublicInvoicePageState,
} from "@/features/invoices/invoice-service.server";
import type { Database } from "@/lib/database/types";

const enabled = process.env.PAYPROOF_LOCAL_INVOICE_TEST === "1";

describe.skipIf(!enabled)("local invoice service integration", () => {
  let admin: SupabaseClient<Database>;
  let creator: CreatorSession;
  const createdInvoiceIds: string[] = [];

  beforeAll(async () => {
    admin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await admin.auth.admin.createUser({
      email: `invoice-service-${randomUUID()}@payproof.test`,
      password: `${randomUUID()}Aa1!`,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error("Unable to create local test user.");
    creator = {
      user: data.user,
      userId: data.user.id,
      address: "0x1234567890AbcdEF1234567890aBcdef12345678",
    };
  });

  afterAll(async () => {
    if (createdInvoiceIds.length > 0) {
      await admin.from("invoices").delete().in("id", createdInvoiceIds);
    }
    if (creator?.userId) await admin.auth.admin.deleteUser(creator.userId);
  });

  it("rejects forged publication fields at the strict API boundary", async () => {
    const result = await publishInvoice(
      {
        freelancerName: "Ada Studio",
        description: "Design sprint",
        currency: "USD",
        amount: "100.00",
        dueDate: "2026-09-07",
        recipientWallet: "0x0000000000000000000000000000000000000000",
      },
      creator,
    );
    expect(result).toMatchObject({ ok: false, code: "INVALID_INVOICE" });
  });

  it("publishes, reads publicly, and cancels one immutable invoice", async () => {
    const published = await publishInvoice(
      {
        freelancerName: "Ada Studio",
        clientReference: "Launch photos",
        description: "Event photography",
        currency: "NGN",
        amount: "250000.00",
        dueDate: "2026-09-07",
      },
      creator,
    );
    expect(published.ok).toBe(true);
    if (!published.ok) return;
    createdInvoiceIds.push(published.invoice.invoiceId);

    const { data: stored } = await admin
      .from("invoices")
      .select("creator_user_id,creator_wallet,recipient_wallet,amount_minor")
      .eq("id", published.invoice.invoiceId)
      .single();
    expect(stored).toEqual({
      creator_user_id: creator.userId,
      creator_wallet: creator.address,
      recipient_wallet: creator.address,
      amount_minor: 25_000_000,
    });

    const publicState = await readPublicInvoicePageState(
      published.invoice.publicId,
    );
    expect(publicState).toMatchObject({
      kind: "ready",
      invoice: {
        freelancerName: "Ada Studio",
        localAmountFormatted: "₦250,000.00",
        recipientAddress: creator.address,
        status: "open",
      },
    });
    expect(JSON.stringify(publicState)).not.toContain(creator.userId);

    const cancelled = await cancelCreatorInvoice(
      published.invoice.invoiceId,
      creator,
    );
    expect(cancelled).toMatchObject({
      ok: true,
      invoice: { status: "cancelled", canCancel: false },
    });
    expect(
      await cancelCreatorInvoice(published.invoice.invoiceId, creator),
    ).toMatchObject({ ok: true, invoice: { status: "cancelled" } });
    expect(
      await readPublicInvoicePageState(published.invoice.publicId),
    ).toMatchObject({ kind: "ready", invoice: { status: "cancelled" } });
  });
});
