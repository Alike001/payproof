// @vitest-environment node

import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAddress } from "viem";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { verifyPaymentAttempt } from "@/features/payments/verification-service.server";
import { readLatestPublicPaymentResult } from "@/features/payments/payment-result-read.server";
import type { Database } from "@/lib/database/types";
import { BASE_SEPOLIA_USDC_ADDRESS } from "@/lib/telegraph/constants";
import type { requestTransactionEvidence } from "@/lib/telegraph/miners/service.server";

const enabled = process.env.PAYPROOF_LOCAL_VERIFICATION_TEST === "1";
const recipient = "0x1234567890AbcdEF1234567890aBcdef12345678";
const payer = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";

describe.skipIf(!enabled)("local verification service integration", () => {
  let admin: SupabaseClient<Database>;
  let userId = "";
  const invoiceIds: string[] = [];

  async function createPaymentFixture(hashCharacter: string) {
    const invoiceResult = await admin
      .from("invoices")
      .insert({
        creator_user_id: userId,
        creator_wallet: recipient,
        recipient_wallet: recipient,
        freelancer_name: "Verification Test Studio",
        description: `Verification case ${hashCharacter}`,
        currency: "USD",
        amount_minor: 5_000,
        due_date: "2026-09-07",
      })
      .select("id,public_id")
      .single();
    if (invoiceResult.error || !invoiceResult.data) {
      throw new Error("Verification invoice fixture failed.");
    }
    const invoice = invoiceResult.data;
    invoiceIds.push(invoice.id);
    const quoteResult = await admin
      .from("quotes")
      .insert({
        invoice_id: invoice.id,
        source_kind: "usd_parity",
        source_currency: "USD",
        source_amount_minor: 5_000,
        rate_decimal: 1,
        usdc_amount_units: 50_000_000,
        quoted_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
        source_name: "Nominal 1 USD = 1 test USDC",
      })
      .select("id")
      .single();
    if (quoteResult.error || !quoteResult.data) {
      throw new Error("Verification quote fixture failed.");
    }
    const txHash = `0x${hashCharacter.repeat(64)}`;
    const paymentResult = await admin
      .from("payments")
      .insert({
        invoice_id: invoice.id,
        quote_id: quoteResult.data.id,
        tx_hash: txHash,
        submitted_by_wallet: payer,
      })
      .select("id")
      .single();
    if (paymentResult.error || !paymentResult.data) {
      throw new Error("Verification payment fixture failed.");
    }
    return {
      invoiceId: invoice.id,
      publicId: invoice.public_id,
      quoteId: quoteResult.data.id,
      paymentId: paymentResult.data.id,
      txHash,
    };
  }

  function minedReadiness() {
    return vi.fn().mockResolvedValue({
      kind: "mined",
      status: "success",
      blockNumber: "123",
    });
  }

  function successfulRequester(input: {
    fixture: Awaited<ReturnType<typeof createPaymentFixture>>;
    amountUnits?: string;
  }) {
    return vi.fn(async (request: {
      actionKey: string;
      invoiceId: string;
      paymentId: string;
    }) => {
      const call = await admin
        .from("telegraph_calls")
        .insert({
          action_key: request.actionKey,
          invoice_id: request.invoiceId,
          payment_id: request.paymentId,
          intent: "ONCHAIN_TX_LOOKUP",
          miner_id: "8453",
          miner_name: "Truvian Exact On-Chain Truth Engine",
          attempt_role: "primary",
          status: "paid_success",
          request_sanitized: {
            chainId: 84_532,
            txHash: input.fixture.txHash,
          },
          completed_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (call.error || !call.data) throw new Error("Call fixture failed.");
      return {
        available: true,
        role: "primary" as const,
        failures: [],
        evidence: {
          chainId: 84_532 as const,
          txHash: input.fixture.txHash,
          exists: true,
          lifecycle: "mined" as const,
          status: "success" as const,
          blockNumber: "123",
          sender: payer,
          recipient: BASE_SEPOLIA_USDC_ADDRESS,
          transfers: [
            {
              token: BASE_SEPOLIA_USDC_ADDRESS,
              from: payer,
              to: recipient,
              amountUnits: input.amountUnits ?? "50000000",
              logIndex: 1,
            },
          ],
          observedAt: new Date().toISOString(),
          source: "Controlled receipt-derived facts",
          evidenceScope: { receipt: true, logs: true, erc20Transfers: true },
          minerId: "8453",
          minerName: "Truvian Exact On-Chain Truth Engine",
          telegraphCallId: call.data.id,
        },
      };
    }) as unknown as typeof requestTransactionEvidence;
  }

  beforeAll(async () => {
    admin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const created = await admin.auth.admin.createUser({
      email: `verification-service-${randomUUID()}@payproof.test`,
      password: `${randomUUID()}Aa1!`,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      throw new Error("Unable to create verification test user.");
    }
    userId = created.data.user.id;
  });

  afterAll(async () => {
    if (invoiceIds.length) {
      await admin
        .from("payments")
        .update({
          state: "submitted",
          mismatch_code: null,
          mismatch_details: null,
          observed_chain_id: null,
          observed_token: null,
          observed_recipient: null,
          observed_amount_units: null,
          observed_tx_status: null,
          verification_call_id: null,
          verification_observed_at: null,
          verification_source: null,
          last_checked_at: null,
          verified_transfer_sender: null,
          verified_at: null,
        })
        .in("invoice_id", invoiceIds);
      await admin
        .from("invoices")
        .update({ lifecycle: "open", verified_at: null, cancelled_at: null })
        .in("id", invoiceIds);
      await admin.from("usage_events").delete().in("invoice_id", invoiceIds);
      await admin.from("telegraph_calls").delete().in("invoice_id", invoiceIds);
      await admin.from("payments").delete().in("invoice_id", invoiceIds);
      await admin.from("quotes").delete().in("invoice_id", invoiceIds);
      await admin.from("invoices").delete().in("id", invoiceIds);
    }
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("atomically turns exact Telegraph evidence into the locked receipt", async () => {
    const fixture = await createPaymentFixture("e");
    const requester = successfulRequester({ fixture });
    const dependencies = {
      database: admin,
      now: () => new Date(),
      networkHash: () => "a".repeat(64),
      readiness: minedReadiness(),
      requestTransaction: requester,
    };
    const result = await verifyPaymentAttempt(
      fixture.publicId,
      fixture.paymentId,
      new Headers(),
      dependencies,
    );
    expect(result).toMatchObject({
      ok: true,
      saved: true,
      result: {
        state: "verified",
        code: null,
        expected: {
          chainId: 84_532,
          tokenAddress: BASE_SEPOLIA_USDC_ADDRESS,
          recipientAddress: recipient,
          usdcAmountUnits: "50000000",
          usdcAmountFormatted: "50.000000",
        },
        observed: {
          amountUnits: "50000000",
          transactionStatus: "success",
        },
        evidence: { minerId: "8453", attemptRole: "primary" },
        receipt: { payerAddress: getAddress(payer) },
      },
    });
    expect(requester).toHaveBeenCalledOnce();

    const saved = await verifyPaymentAttempt(
      fixture.publicId,
      fixture.paymentId,
      new Headers(),
      dependencies,
    );
    expect(saved).toMatchObject({
      ok: true,
      saved: true,
      result: { state: "verified" },
    });
    expect(requester).toHaveBeenCalledOnce();

    const [{ data: invoice }, { data: payment }, { count: verifiedEvents }] =
      await Promise.all([
        admin.from("invoices").select("lifecycle").eq("id", fixture.invoiceId).single(),
        admin.from("payments").select("state").eq("id", fixture.paymentId).single(),
        admin
          .from("usage_events")
          .select("id", { count: "exact", head: true })
          .eq("invoice_id", fixture.invoiceId)
          .eq("event_name", "payment_verified"),
      ]);
    expect(invoice?.lifecycle).toBe("verified");
    expect(payment?.state).toBe("verified");
    expect(verifiedEvents).toBe(1);
    expect(
      await readLatestPublicPaymentResult({
        publicId: fixture.publicId,
        invoiceId: fixture.invoiceId,
        database: admin,
      }),
    ).toMatchObject({
      state: "verified",
      transaction: { hash: fixture.txHash },
      receipt: { payerAddress: getAddress(payer) },
    });
  });

  it("persists a wrong amount as Mismatch without verifying the invoice", async () => {
    const fixture = await createPaymentFixture("f");
    const result = await verifyPaymentAttempt(
      fixture.publicId,
      fixture.paymentId,
      new Headers(),
      {
        database: admin,
        now: () => new Date(),
        networkHash: () => "b".repeat(64),
        readiness: minedReadiness(),
        requestTransaction: successfulRequester({
          fixture,
          amountUnits: "49999999",
        }),
      },
    );
    expect(result).toMatchObject({
      ok: true,
      saved: true,
      result: {
        state: "mismatch",
        code: "WRONG_AMOUNT",
        expected: { usdcAmountUnits: "50000000" },
        observed: { amountUnits: "49999999" },
        receipt: null,
      },
    });
    const { data: invoice } = await admin
      .from("invoices")
      .select("lifecycle")
      .eq("id", fixture.invoiceId)
      .single();
    expect(invoice?.lifecycle).toBe("open");
  });

  it("keeps the database finalizer fail-closed on mismatched observed facts", async () => {
    const fixture = await createPaymentFixture("7");
    const call = await admin
      .from("telegraph_calls")
      .insert({
        action_key: `guard:${randomUUID()}`,
        invoice_id: fixture.invoiceId,
        payment_id: fixture.paymentId,
        intent: "ONCHAIN_TX_LOOKUP",
        miner_id: "8453",
        miner_name: "Truvian Exact On-Chain Truth Engine",
        attempt_role: "primary",
        status: "paid_success",
      })
      .select("id")
      .single();
    expect(call.error).toBeNull();
    const guarded = await admin.rpc("finalize_verified_payment", {
      p_payment_id: fixture.paymentId,
      p_verification_call_id: call.data!.id,
      p_verified_transfer_sender: payer,
      p_observed_chain_id: 84_532,
      p_observed_token: BASE_SEPOLIA_USDC_ADDRESS,
      p_observed_recipient: recipient,
      p_observed_amount_units: 49_999_999,
      p_observed_tx_status: "success",
      p_verification_observed_at: new Date().toISOString(),
      p_verification_source: "Controlled mismatched evidence",
    });
    expect(guarded.error?.message).toMatch(/do not match/i);
    const [invoice, payment] = await Promise.all([
      admin.from("invoices").select("lifecycle").eq("id", fixture.invoiceId).single(),
      admin.from("payments").select("state").eq("id", fixture.paymentId).single(),
    ]);
    expect(invoice.data?.lifecycle).toBe("open");
    expect(payment.data?.state).toBe("submitted");
  });

  it("does not buy Telegraph evidence while Base still reports pending", async () => {
    const fixture = await createPaymentFixture("9");
    const requester = vi.fn() as unknown as typeof requestTransactionEvidence;
    const dependencies = {
      database: admin,
      now: () => new Date(),
      networkHash: () => "c".repeat(64),
      readiness: vi.fn().mockResolvedValue({ kind: "pending" }),
      requestTransaction: requester,
    };
    for (let request = 0; request < 6; request += 1) {
      expect(
        await verifyPaymentAttempt(
          fixture.publicId,
          fixture.paymentId,
          new Headers(),
          dependencies,
        ),
      ).toMatchObject({
        ok: true,
        saved: false,
        result: { state: "submitted", code: "TRANSACTION_PENDING" },
      });
    }
    expect(
      await verifyPaymentAttempt(
        fixture.publicId,
        fixture.paymentId,
        new Headers(),
        dependencies,
      ),
    ).toMatchObject({ ok: false, code: "VERIFICATION_RATE_LIMITED" });
    expect(requester).not.toHaveBeenCalled();
  });

  it("stores honest unavailability and observes the paid-attempt cooldown", async () => {
    const fixture = await createPaymentFixture("8");
    const requester = vi.fn(async (request: {
      actionKey: string;
      invoiceId: string;
      paymentId: string;
    }) => {
      const inserted = await admin.from("telegraph_calls").insert([
        {
          action_key: request.actionKey,
          invoice_id: request.invoiceId,
          payment_id: request.paymentId,
          intent: "ONCHAIN_TX_LOOKUP",
          miner_id: "8453",
          miner_name: "Truvian Exact On-Chain Truth Engine",
          attempt_role: "primary",
          status: "paid_error",
        },
        {
          action_key: request.actionKey,
          invoice_id: request.invoiceId,
          payment_id: request.paymentId,
          intent: "ONCHAIN_TX_LOOKUP",
          miner_id: "9007",
          miner_name: "INTERLOCK On-Chain Transaction Lookup",
          attempt_role: "backup",
          status: "paid_error",
        },
      ]);
      if (inserted.error) throw new Error("Unavailable call fixtures failed.");
      return {
        available: false,
        failures: [
          { role: "primary" as const, code: "MINER_UNAVAILABLE", message: "Unavailable" },
          { role: "backup" as const, code: "MINER_UNAVAILABLE", message: "Unavailable" },
        ],
      };
    }) as unknown as typeof requestTransactionEvidence;
    const fixedNow = new Date();
    const dependencies = {
      database: admin,
      now: () => fixedNow,
      networkHash: () => "d".repeat(64),
      readiness: minedReadiness(),
      requestTransaction: requester,
    };
    expect(
      await verifyPaymentAttempt(
        fixture.publicId,
        fixture.paymentId,
        new Headers(),
        dependencies,
      ),
    ).toMatchObject({
      ok: true,
      saved: true,
      result: { state: "unavailable", code: "VERIFICATION_UNAVAILABLE" },
    });
    expect(
      await verifyPaymentAttempt(
        fixture.publicId,
        fixture.paymentId,
        new Headers(),
        dependencies,
      ),
    ).toMatchObject({
      ok: true,
      saved: true,
      result: {
        state: "unavailable",
        code: "VERIFICATION_UNAVAILABLE",
        retryAfterSeconds: expect.any(Number),
      },
    });
    expect(requester).toHaveBeenCalledOnce();
  });
});
