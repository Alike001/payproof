// @vitest-environment node

import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { requestInvoiceQuote } from "@/features/quotes/quote-service.server";
import type { Database } from "@/lib/database/types";
import type { requestFxEvidence } from "@/lib/telegraph/miners/service.server";

const enabled = process.env.PAYPROOF_LOCAL_QUOTE_TEST === "1";

describe.skipIf(!enabled)("local quote service integration", () => {
  let admin: SupabaseClient<Database>;
  let userId = "";
  let invoiceId = "";
  let publicId = "";
  const requestFx = vi.fn() as unknown as typeof requestFxEvidence;
  const now = new Date("2026-09-02T12:00:00.000Z");

  beforeAll(async () => {
    admin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const created = await admin.auth.admin.createUser({
      email: `quote-service-${randomUUID()}@payproof.test`,
      password: `${randomUUID()}Aa1!`,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      throw new Error("Unable to create local quote test user.");
    }
    userId = created.data.user.id;
    const inserted = await admin
      .from("invoices")
      .insert({
        creator_user_id: userId,
        creator_wallet: "0x1234567890AbcdEF1234567890aBcdef12345678",
        recipient_wallet: "0x1234567890AbcdEF1234567890aBcdef12345678",
        freelancer_name: "Quote Test Studio",
        description: "USD parity integration",
        currency: "USD",
        amount_minor: 12_550,
        due_date: "2026-09-07",
      })
      .select("id,public_id")
      .single();
    if (inserted.error || !inserted.data) {
      await admin.auth.admin.deleteUser(userId);
      throw new Error("Unable to create local quote test invoice.");
    }
    invoiceId = inserted.data.id;
    publicId = inserted.data.public_id;
  });

  afterAll(async () => {
    if (invoiceId) {
      await admin.from("usage_events").delete().eq("invoice_id", invoiceId);
      await admin.from("quotes").delete().eq("invoice_id", invoiceId);
      await admin.from("invoices").delete().eq("id", invoiceId);
    }
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("creates exact USD parity once and reuses the saved quote", async () => {
    const dependencies = {
      database: admin,
      now: () => now,
      networkHash: () => "a".repeat(64),
      requestFx,
    };
    const first = await requestInvoiceQuote(publicId, new Headers(), dependencies);
    expect(first).toMatchObject({
      ok: true,
      reused: false,
      quote: {
        sourceCurrency: "USD",
        localAmountFormatted: "$125.50",
        rateToUsd: "1",
        usdcAmountUnits: "125500000",
        usdcAmountFormatted: "125.500000",
        quotedAt: "2026-09-02T12:00:00.000Z",
        expiresAt: "2026-09-02T12:15:00.000Z",
        source: { kind: "usd_parity", minerId: null },
      },
    });
    expect(requestFx).not.toHaveBeenCalled();

    const second = await requestInvoiceQuote(publicId, new Headers(), dependencies);
    expect(second).toMatchObject({ ok: true, reused: true });
    if (first.ok && second.ok) {
      expect(second.quote.quoteId).toBe(first.quote.quoteId);
    }
    const { count } = await admin
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("invoice_id", invoiceId);
    expect(count).toBe(1);
  });

  it("atomically limits the seventh request in one minute", async () => {
    const dependencies = {
      database: admin,
      now: () => now,
      networkHash: () => "b".repeat(64),
      requestFx,
    };
    for (let attempt = 0; attempt < 6; attempt += 1) {
      expect(
        await requestInvoiceQuote(publicId, new Headers(), dependencies),
      ).toMatchObject({ ok: true, reused: true });
    }
    expect(
      await requestInvoiceQuote(publicId, new Headers(), dependencies),
    ).toMatchObject({
      ok: false,
      code: "QUOTE_RATE_LIMITED",
      retryable: true,
    });
  });

  it("stores exact non-USD evidence and sanitized Miner provenance", async () => {
    const insertedInvoice = await admin
      .from("invoices")
      .insert({
        creator_user_id: userId,
        creator_wallet: "0x1234567890AbcdEF1234567890aBcdef12345678",
        recipient_wallet: "0x1234567890AbcdEF1234567890aBcdef12345678",
        freelancer_name: "Quote Test Studio",
        description: "NGN Telegraph quote integration",
        currency: "NGN",
        amount_minor: 25_000_000,
        due_date: "2026-09-07",
      })
      .select("id,public_id")
      .single();
    expect(insertedInvoice.error).toBeNull();
    const ngnInvoice = insertedInvoice.data!;
    const insertedCall = await admin
      .from("telegraph_calls")
      .insert({
        action_key: `test:quote:${randomUUID()}`,
        invoice_id: ngnInvoice.id,
        intent: "CURRENCY_EXCHANGE",
        miner_id: "20260827",
        miner_name: "FX Rate Mirror",
        attempt_role: "primary",
        status: "paid_success",
        request_sanitized: { currency: "NGN", quoteCurrency: "USD" },
        created_at: "2026-09-02T11:00:00.000Z",
        completed_at: "2026-09-02T11:00:01.000Z",
      })
      .select("id")
      .single();
    expect(insertedCall.error).toBeNull();
    const callId = insertedCall.data!.id;

    try {
      const controlledFx = vi.fn().mockResolvedValue({
        available: true,
        role: "primary",
        failures: [],
        evidence: {
          currency: "NGN",
          quoteCurrency: "USD",
          rateToUsd: "0.00064123",
          observedAt: "2026-09-02T12:00:00.000Z",
          sourceAsOf: "2026-09-02T11:59:00.000Z",
          source: "Structured FX feed",
          confidence: "0.99",
          minerId: "20260827",
          minerName: "FX Rate Mirror",
          telegraphCallId: callId,
        },
      }) as unknown as typeof requestFxEvidence;
      const result = await requestInvoiceQuote(
        ngnInvoice.public_id,
        new Headers(),
        {
          database: admin,
          now: () => now,
          networkHash: () => "d".repeat(64),
          requestFx: controlledFx,
        },
      );
      expect(result).toMatchObject({
        ok: true,
        reused: false,
        quote: {
          rateToUsd: "0.00064123",
          usdcAmountUnits: "160307500",
          usdcAmountFormatted: "160.307500",
          source: {
            kind: "telegraph_fx",
            minerId: "20260827",
            minerName: "FX Rate Mirror",
            attemptRole: "primary",
          },
        },
      });
      expect(controlledFx).toHaveBeenCalledOnce();
    } finally {
      await admin.from("usage_events").delete().eq("invoice_id", ngnInvoice.id);
      await admin.from("quotes").delete().eq("invoice_id", ngnInvoice.id);
      await admin.from("telegraph_calls").delete().eq("id", callId);
      await admin.from("invoices").delete().eq("id", ngnInvoice.id);
    }
  });

  it("enforces the ten-second paid-action cooldown before calling a Miner", async () => {
    const insertedInvoice = await admin
      .from("invoices")
      .insert({
        creator_user_id: userId,
        creator_wallet: "0x1234567890AbcdEF1234567890aBcdef12345678",
        recipient_wallet: "0x1234567890AbcdEF1234567890aBcdef12345678",
        freelancer_name: "Quote Test Studio",
        description: "Quote cooldown integration",
        currency: "GBP",
        amount_minor: 8_000,
        due_date: "2026-09-07",
      })
      .select("id,public_id")
      .single();
    expect(insertedInvoice.error).toBeNull();
    const gbpInvoice = insertedInvoice.data!;
    const recentCall = await admin
      .from("telegraph_calls")
      .insert({
        action_key: `test:quote-cooldown:${randomUUID()}`,
        invoice_id: gbpInvoice.id,
        intent: "CURRENCY_EXCHANGE",
        miner_id: "20260827",
        miner_name: "FX Rate Mirror",
        attempt_role: "primary",
        status: "paid_error",
        request_sanitized: { currency: "GBP", quoteCurrency: "USD" },
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    expect(recentCall.error).toBeNull();
    const controlledFx = vi.fn() as unknown as typeof requestFxEvidence;

    try {
      const result = await requestInvoiceQuote(
        gbpInvoice.public_id,
        new Headers(),
        {
          database: admin,
          now: () => new Date(),
          networkHash: () => "e".repeat(64),
          requestFx: controlledFx,
        },
      );
      expect(result).toMatchObject({
        ok: false,
        code: "QUOTE_COOLDOWN",
        retryable: true,
        retryAfterSeconds: expect.any(Number),
      });
      expect(controlledFx).not.toHaveBeenCalled();
    } finally {
      await admin.from("usage_events").delete().eq("invoice_id", gbpInvoice.id);
      await admin.from("telegraph_calls").delete().eq("id", recentCall.data!.id);
      await admin.from("invoices").delete().eq("id", gbpInvoice.id);
    }
  });

  it("rejects a cancelled invoice before creating or returning a quote", async () => {
    const { error } = await admin
      .from("invoices")
      .update({ lifecycle: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", invoiceId);
    expect(error).toBeNull();
    expect(
      await requestInvoiceQuote(publicId, new Headers(), {
        database: admin,
        now: () => now,
        networkHash: () => "c".repeat(64),
        requestFx,
      }),
    ).toMatchObject({
      ok: false,
      code: "INVOICE_NOT_PAYABLE",
      retryable: false,
    });
  });
});
