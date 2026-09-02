// @vitest-environment node

import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { submitPaymentAttempt } from "@/features/payments/payment-service.server";
import type { Database } from "@/lib/database/types";

const enabled = process.env.PAYPROOF_LOCAL_PAYMENT_TEST === "1";
const wallet = "0x1234567890AbcdEF1234567890aBcdef12345678";
const otherWallet = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const now = new Date("2026-09-02T12:00:00.000Z");

describe.skipIf(!enabled)("local payment submission integration", () => {
  let admin: SupabaseClient<Database>;
  let userId = "";
  const invoiceIds: string[] = [];

  async function createInvoice(description: string) {
    const result = await admin
      .from("invoices")
      .insert({
        creator_user_id: userId,
        creator_wallet: wallet,
        recipient_wallet: wallet,
        freelancer_name: "Payment Test Studio",
        description,
        currency: "USD",
        amount_minor: 2_500,
        due_date: "2026-09-07",
      })
      .select("id,public_id")
      .single();
    if (result.error || !result.data) throw new Error("Invoice fixture failed.");
    invoiceIds.push(result.data.id);
    return result.data;
  }

  async function createQuote(invoiceId: string, quotedAt: string, expiresAt: string) {
    const result = await admin
      .from("quotes")
      .insert({
        invoice_id: invoiceId,
        source_kind: "usd_parity",
        source_currency: "USD",
        source_amount_minor: 2_500,
        rate_decimal: 1,
        usdc_amount_units: 25_000_000,
        quoted_at: quotedAt,
        expires_at: expiresAt,
        source_name: "Nominal 1 USD = 1 test USDC",
      })
      .select("id")
      .single();
    if (result.error || !result.data) throw new Error("Quote fixture failed.");
    return result.data.id;
  }

  beforeAll(async () => {
    admin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const created = await admin.auth.admin.createUser({
      email: `payment-service-${randomUUID()}@payproof.test`,
      password: `${randomUUID()}Aa1!`,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      throw new Error("Unable to create payment test user.");
    }
    userId = created.data.user.id;
  });

  afterAll(async () => {
    if (invoiceIds.length) {
      await admin.from("usage_events").delete().in("invoice_id", invoiceIds);
      await admin.from("payments").delete().in("invoice_id", invoiceIds);
      await admin.from("quotes").delete().in("invoice_id", invoiceIds);
      await admin.from("invoices").delete().in("id", invoiceIds);
    }
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("stores one post-broadcast hash idempotently and blocks competing attempts", async () => {
    const invoice = await createInvoice("Idempotent submission");
    const quoteId = await createQuote(
      invoice.id,
      "2026-09-02T11:59:00.000Z",
      "2026-09-02T12:14:00.000Z",
    );
    const txHash = `0x${"a".repeat(64)}`;
    const dependencies = {
      database: admin,
      now: () => now,
      networkHash: () => "a".repeat(64),
    };
    const input = { quoteId, txHash, submittedByWallet: wallet };

    const created = await submitPaymentAttempt(
      invoice.public_id,
      input,
      new Headers(),
      dependencies,
    );
    expect(created).toMatchObject({
      ok: true,
      reused: false,
      payment: {
        quoteId,
        txHash,
        submittedByWallet: wallet,
        state: "submitted",
      },
    });
    const repeated = await submitPaymentAttempt(
      invoice.public_id,
      input,
      new Headers(),
      dependencies,
    );
    expect(repeated).toMatchObject({ ok: true, reused: true });
    if (created.ok && repeated.ok) {
      expect(repeated.payment.paymentId).toBe(created.payment.paymentId);
    }

    expect(
      await submitPaymentAttempt(
        invoice.public_id,
        { ...input, submittedByWallet: otherWallet },
        new Headers(),
        dependencies,
      ),
    ).toMatchObject({ ok: false, code: "TRANSACTION_ALREADY_USED" });
    expect(
      await submitPaymentAttempt(
        invoice.public_id,
        { ...input, txHash: `0x${"b".repeat(64)}` },
        new Headers(),
        dependencies,
      ),
    ).toMatchObject({ ok: false, code: "PAYMENT_IN_PROGRESS" });

    const { count } = await admin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("invoice_id", invoice.id);
    expect(count).toBe(1);
  });

  it("serializes concurrent hashes so only one payment can remain pending", async () => {
    const invoice = await createInvoice("Concurrent submission");
    const quoteId = await createQuote(
      invoice.id,
      "2026-09-02T11:59:00.000Z",
      "2026-09-02T12:14:00.000Z",
    );
    const common = {
      quoteId,
      submittedByWallet: wallet,
    };
    const [first, second] = await Promise.all([
      submitPaymentAttempt(
        invoice.public_id,
        { ...common, txHash: `0x${"1".repeat(64)}` },
        new Headers(),
        {
          database: admin,
          now: () => now,
          networkHash: () => "f".repeat(64),
        },
      ),
      submitPaymentAttempt(
        invoice.public_id,
        { ...common, txHash: `0x${"2".repeat(64)}` },
        new Headers(),
        {
          database: admin,
          now: () => now,
          networkHash: () => "e".repeat(64),
        },
      ),
    ]);
    expect([first, second].filter((result) => result.ok)).toHaveLength(1);
    expect([first, second]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ok: false, code: "PAYMENT_IN_PROGRESS" }),
      ]),
    );
    const { count } = await admin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("invoice_id", invoice.id);
    expect(count).toBe(1);
  });

  it("rejects an expired quote at the exact boundary", async () => {
    const invoice = await createInvoice("Expired quote submission");
    const quoteId = await createQuote(
      invoice.id,
      "2026-09-02T11:45:00.000Z",
      now.toISOString(),
    );
    expect(
      await submitPaymentAttempt(
        invoice.public_id,
        {
          quoteId,
          txHash: `0x${"c".repeat(64)}`,
          submittedByWallet: wallet,
        },
        new Headers(),
        {
          database: admin,
          now: () => now,
          networkHash: () => "b".repeat(64),
        },
      ),
    ).toMatchObject({ ok: false, code: "QUOTE_EXPIRED" });
  });

  it("atomically limits repeated valid-format submissions", async () => {
    const invoice = await createInvoice("Rate limited submission");
    const dependencies = {
      database: admin,
      now: () => now,
      networkHash: () => "c".repeat(64),
    };
    for (let attempt = 0; attempt < 6; attempt += 1) {
      expect(
        await submitPaymentAttempt(
          invoice.public_id,
          {
            quoteId: randomUUID(),
            txHash: `0x${attempt.toString(16).padStart(64, "0")}`,
            submittedByWallet: wallet,
          },
          new Headers(),
          dependencies,
        ),
      ).toMatchObject({ ok: false, code: "QUOTE_NOT_FOUND" });
    }
    expect(
      await submitPaymentAttempt(
        invoice.public_id,
        {
          quoteId: randomUUID(),
          txHash: `0x${"f".repeat(64)}`,
          submittedByWallet: wallet,
        },
        new Headers(),
        dependencies,
      ),
    ).toMatchObject({ ok: false, code: "PAYMENT_RATE_LIMITED" });
  });

  it("rejects a cancelled invoice before accepting a hash", async () => {
    const invoice = await createInvoice("Cancelled submission");
    await admin
      .from("invoices")
      .update({ lifecycle: "cancelled", cancelled_at: now.toISOString() })
      .eq("id", invoice.id);
    expect(
      await submitPaymentAttempt(
        invoice.public_id,
        {
          quoteId: randomUUID(),
          txHash: `0x${"d".repeat(64)}`,
          submittedByWallet: wallet,
        },
        new Headers(),
        {
          database: admin,
          now: () => now,
          networkHash: () => "d".repeat(64),
        },
      ),
    ).toMatchObject({ ok: false, code: "INVOICE_NOT_PAYABLE" });
  });
});
