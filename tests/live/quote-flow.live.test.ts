// @vitest-environment node

import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requestInvoiceQuote } from "@/features/quotes/quote-service.server";
import { normalizeRateForStorage } from "@/features/quotes/model";
import type { Database } from "@/lib/database/types";

const liveRequested = process.env.RUN_LIVE_QUOTE_FLOW_TESTS === "1";
loadEnvConfig(process.cwd(), true);

const requiredEnvironment = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "TELEGRAPH_NODE_URL",
  "TELEGRAPH_EVM_PRIVATE_KEY",
  "X402_MAX_CALL_USDC_UNITS",
  "X402_DAILY_BUDGET_USDC_UNITS",
  "FX_MAX_SOURCE_AGE_MINUTES",
  "ANALYTICS_HASH_SECRET",
] as const;
const missingEnvironment = requiredEnvironment.filter(
  (name) => (process.env[name]?.trim().length ?? 0) === 0,
);
const liveEnabled = liveRequested && missingEnvironment.length === 0;

if (liveRequested && !liveEnabled) {
  console.warn(
    `Live quote-flow test skipped; missing: ${missingEnvironment.join(", ")}`,
  );
}

describe.skipIf(!liveEnabled)("paid live Telegraph quote flow", () => {
  let admin: SupabaseClient<Database>;
  let userId = "";
  let invoiceId = "";
  let publicId = "";

  beforeAll(async () => {
    admin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const created = await admin.auth.admin.createUser({
      email: `live-quote-${randomUUID()}@payproof.test`,
      password: `${randomUUID()}Aa1!`,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      throw new Error("Unable to create the live quote test user.");
    }
    userId = created.data.user.id;

    const invoice = await admin
      .from("invoices")
      .insert({
        creator_user_id: userId,
        creator_wallet: "0x1234567890AbcdEF1234567890aBcdef12345678",
        recipient_wallet: "0x1234567890AbcdEF1234567890aBcdef12345678",
        freelancer_name: "PayProof internal quote proof",
        description: "One capped Telegraph-backed NGN quote",
        currency: "NGN",
        amount_minor: 25_000_000,
        due_date: "2026-09-07",
      })
      .select("id,public_id")
      .single();
    if (invoice.error || !invoice.data) {
      await admin.auth.admin.deleteUser(userId);
      throw new Error("Unable to create the live quote test invoice.");
    }
    invoiceId = invoice.data.id;
    publicId = invoice.data.public_id;
  });

  afterAll(async () => {
    if (invoiceId) {
      await admin.from("usage_events").delete().eq("invoice_id", invoiceId);
      await admin.from("quotes").delete().eq("invoice_id", invoiceId);
      await admin
        .from("telegraph_calls")
        .update({ invoice_id: null })
        .eq("invoice_id", invoiceId);
      await admin.from("invoices").delete().eq("id", invoiceId);
    }
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("stores one capped paid quote and reuses it without a second Miner call", async () => {
    const first = await requestInvoiceQuote(publicId, new Headers(), {
      database: admin,
      networkHash: () => "f".repeat(64),
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first).toMatchObject({
      reused: false,
      quote: {
        sourceCurrency: "NGN",
        targetCurrency: "USD",
        localAmountFormatted: "₦250,000.00",
        source: {
          kind: "telegraph_fx",
          minerId: "20260827",
          minerName: "FX Rate Mirror",
          attemptRole: "primary",
        },
      },
    });
    expect(first.quote.rateToUsd).toMatch(/^\d+(?:\.\d+)?$/);
    expect(first.quote.usdcAmountUnits).toMatch(/^[1-9]\d*$/);

    const storedQuote = await admin.rpc("read_current_quote", {
      p_invoice_id: invoiceId,
      p_now: new Date().toISOString(),
    });
    expect(storedQuote.error).toBeNull();
    expect(storedQuote.data?.[0]).toMatchObject({
      id: first.quote.quoteId,
      source_currency: "NGN",
      source_amount_minor_text: "25000000",
      usdc_amount_units_text: first.quote.usdcAmountUnits,
      miner_id: "20260827",
      miner_name: "FX Rate Mirror",
      attempt_role: "primary",
    });
    expect(
      normalizeRateForStorage(storedQuote.data![0].rate_decimal_text),
    ).toBe(first.quote.rateToUsd);

    const callId = storedQuote.data![0].telegraph_call_id!;
    const storedCall = await admin
      .from("telegraph_calls")
      .select(
        "id,status,miner_id,miner_name,attempt_role,x402_network,x402_amount_units,x402_transaction,completed_at",
      )
      .eq("id", callId)
      .single();
    expect(storedCall.error).toBeNull();
    expect(storedCall.data).toMatchObject({
      status: "paid_success",
      miner_id: "20260827",
      miner_name: "FX Rate Mirror",
      attempt_role: "primary",
      x402_network: "eip155:84532",
      x402_amount_units: 10_000,
    });
    expect(storedCall.data!.x402_amount_units).toBeLessThanOrEqual(
      Number(process.env.X402_MAX_CALL_USDC_UNITS),
    );
    expect(storedCall.data!.x402_transaction).toMatch(/^0x[0-9a-fA-F]{64}$/);

    const second = await requestInvoiceQuote(publicId, new Headers(), {
      database: admin,
      networkHash: () => "f".repeat(64),
    });
    expect(second).toMatchObject({
      ok: true,
      reused: true,
      quote: { quoteId: first.quote.quoteId },
    });

    console.info(
      "LIVE_QUOTE_EVIDENCE",
      JSON.stringify({
        quoteId: first.quote.quoteId,
        sourceCurrency: first.quote.sourceCurrency,
        localAmount: first.quote.localAmountFormatted,
        rateToUsd: first.quote.rateToUsd,
        usdcAmountUnits: first.quote.usdcAmountUnits,
        usdcAmount: first.quote.usdcAmountFormatted,
        quotedAt: first.quote.quotedAt,
        expiresAt: first.quote.expiresAt,
        sourceObservedAt: first.quote.sourceObservedAt,
        minerId: storedCall.data!.miner_id,
        minerName: storedCall.data!.miner_name,
        attemptRole: storedCall.data!.attempt_role,
        x402Network: storedCall.data!.x402_network,
        x402AmountUnits: storedCall.data!.x402_amount_units,
        x402Transaction: storedCall.data!.x402_transaction,
      }),
    );
  }, 60_000);
});
