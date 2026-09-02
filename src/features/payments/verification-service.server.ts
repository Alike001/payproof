import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/database/types";
import { getAdminDatabaseClient } from "@/lib/database/admin.server";
import { MAX_SAFE_DATABASE_UNITS } from "@/lib/money";
import { dailyNetworkHash } from "@/lib/request-identity.server";
import { readBaseSepoliaReceiptReadiness } from "@/lib/base/public-client.server";
import { requestTransactionEvidence } from "@/lib/telegraph/miners/service.server";
import type { TransactionEvidence } from "@/lib/telegraph/miners/types";
import { VERIFICATION_RETRY_COOLDOWN_MS } from "@/lib/telegraph/constants";
import {
  officialExpectedPayment,
  verifyInvoicePayment,
  type ObservedPaymentEvidence,
  type PaymentVerificationDecision,
} from "@/features/payments/verifier";
import {
  toPublicPaymentResultDto,
} from "@/features/payments/result-model";
import { loadPaymentResultSnapshot } from "@/features/payments/payment-result-read.server";
import type { PaymentVerificationResult } from "@/features/payments/types";

type AdminDatabase = SupabaseClient<Database>;
type TransactionRequester = typeof requestTransactionEvidence;
type ReadinessReader = typeof readBaseSepoliaReceiptReadiness;

export type VerificationServiceDependencies = {
  database?: AdminDatabase;
  now?: () => Date;
  networkHash?: (headers: Headers, now: Date) => string;
  readiness?: ReadinessReader;
  requestTransaction?: TransactionRequester;
};

const idSchema = z.uuid();
const verificationRateLimit = 6;
const verificationRateWindowSeconds = 60;

function errorResult(
  code: Exclude<PaymentVerificationResult, { ok: true }>["code"],
  message: string,
  retryable: boolean,
  retryAfterSeconds?: number,
): PaymentVerificationResult {
  return {
    ok: false,
    code,
    message,
    retryable,
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
  };
}

function unavailable(): PaymentVerificationResult {
  return errorResult(
    "VERIFICATION_UNAVAILABLE",
    "Payment verification is temporarily unavailable. The saved transaction hash is safe to retry.",
    true,
  );
}

async function consumeRateLimit(input: {
  database: AdminDatabase;
  paymentId: string;
  networkHash: string;
}) {
  const { data, error } = await input.database.rpc(
    "consume_verification_rate_limit",
    {
      p_payment_id: input.paymentId,
      p_network_hash: input.networkHash,
      p_limit: verificationRateLimit,
      p_window_seconds: verificationRateWindowSeconds,
    },
  );
  if (error || !data?.[0]) throw new Error("Verification rate limit failed.");
  return data[0];
}

async function cooldownSeconds(
  database: AdminDatabase,
  paymentId: string,
  now: Date,
): Promise<number> {
  const { data, error } = await database
    .from("telegraph_calls")
    .select("created_at")
    .eq("payment_id", paymentId)
    .eq("intent", "ONCHAIN_TX_LOOKUP")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Verification cooldown lookup failed.");
  if (!data) return 0;
  const elapsedMs = now.getTime() - Date.parse(data.created_at);
  if (!Number.isFinite(elapsedMs) || elapsedMs >= VERIFICATION_RETRY_COOLDOWN_MS) {
    return 0;
  }
  return Math.max(
    1,
    Math.ceil((VERIFICATION_RETRY_COOLDOWN_MS - elapsedMs) / 1_000),
  );
}

function safeObservedInteger(value: string | null): number | null {
  if (value === null || !/^(?:0|[1-9]\d*)$/.test(value)) return null;
  const units = BigInt(value);
  return units <= MAX_SAFE_DATABASE_UNITS ? Number(units) : null;
}

function nullableString(value: string | null): string {
  return value as unknown as string;
}

function nullableNumber(value: number | null): number {
  return value as unknown as number;
}

async function recordDecision(input: {
  database: AdminDatabase;
  paymentId: string;
  state: "mismatch" | "unavailable";
  code: string;
  callId: string | null;
  observed: ObservedPaymentEvidence | null;
  evidence: TransactionEvidence | null;
}) {
  const { error } = await input.database.rpc(
    "record_payment_verification_result",
    {
      p_payment_id: input.paymentId,
      p_verification_call_id: nullableString(input.callId),
      p_state: input.state,
      p_code: input.code,
      p_details: { code: input.code },
      p_observed_chain_id: nullableNumber(input.observed?.chainId ?? null),
      p_observed_token: nullableString(input.observed?.token ?? null),
      p_observed_recipient: nullableString(input.observed?.recipient ?? null),
      p_observed_amount_units: nullableNumber(
        safeObservedInteger(input.observed?.amountUnits ?? null),
      ),
      p_observed_tx_status: nullableString(input.observed?.status ?? null),
      p_verification_observed_at: nullableString(
        input.evidence?.observedAt ?? null,
      ),
      p_verification_source: nullableString(input.evidence?.source ?? null),
    },
  );
  if (error) throw new Error("Verification result storage failed.");
}

async function finalizeVerified(input: {
  database: AdminDatabase;
  paymentId: string;
  decision: Extract<PaymentVerificationDecision, { outcome: "verified" }>;
  callId: string;
}) {
  const { decision } = input;
  const { error } = await input.database.rpc("finalize_verified_payment", {
    p_payment_id: input.paymentId,
    p_verification_call_id: input.callId,
    p_verified_transfer_sender: decision.matchedTransfer.from,
    p_observed_chain_id: decision.observed.chainId,
    p_observed_token: decision.matchedTransfer.token,
    p_observed_recipient: decision.matchedTransfer.to,
    p_observed_amount_units: Number(BigInt(decision.matchedTransfer.amountUnits)),
    p_observed_tx_status: decision.observed.status,
    p_verification_observed_at: decision.evidence.observedAt,
    p_verification_source: decision.evidence.source,
  });
  if (error) throw new Error("Verified payment finalization failed.");
}

export async function verifyPaymentAttempt(
  publicId: string,
  paymentId: string,
  headers: Headers,
  dependencies: VerificationServiceDependencies = {},
): Promise<PaymentVerificationResult> {
  if (!idSchema.safeParse(publicId).success) {
    return errorResult(
      "INVOICE_NOT_FOUND",
      "This invoice link is invalid or no longer available.",
      false,
    );
  }
  if (!idSchema.safeParse(paymentId).success) {
    return errorResult(
      "PAYMENT_NOT_FOUND",
      "That payment attempt is not attached to this invoice.",
      false,
    );
  }

  try {
    const database = dependencies.database ?? getAdminDatabaseClient();
    const now = (dependencies.now ?? (() => new Date()))();
    let snapshot = await loadPaymentResultSnapshot({ database, publicId, paymentId });
    if (!snapshot) {
      return errorResult(
        "PAYMENT_NOT_FOUND",
        "That payment attempt is not attached to this invoice.",
        false,
      );
    }
    const networkHash = (dependencies.networkHash ?? dailyNetworkHash)(
      headers,
      now,
    );
    const limit = await consumeRateLimit({ database, paymentId, networkHash });
    if (!limit.allowed) {
      return errorResult(
        "VERIFICATION_RATE_LIMITED",
        "Too many verification checks. Wait before trying again.",
        true,
        limit.retry_after_seconds,
      );
    }

    if (snapshot.payment.state === "verified" || snapshot.payment.state === "mismatch") {
      return {
        ok: true,
        result: toPublicPaymentResultDto({ snapshot }),
        saved: true,
      };
    }
    if (snapshot.invoice.lifecycle !== "open") {
      return errorResult(
        "INVOICE_NOT_PAYABLE",
        "This invoice no longer accepts payment verification.",
        false,
      );
    }

    const readiness = await (dependencies.readiness ??
      readBaseSepoliaReceiptReadiness)(snapshot.payment.tx_hash);
    if (readiness.kind === "pending") {
      return {
        ok: true,
        result: toPublicPaymentResultDto({
          snapshot,
          codeOverride: "TRANSACTION_PENDING",
          retryAfterSeconds: 4,
        }),
        saved: false,
      };
    }
    if (readiness.kind === "unavailable") {
      return {
        ok: true,
        result: toPublicPaymentResultDto({
          snapshot,
          codeOverride: "VERIFICATION_UNAVAILABLE",
          retryAfterSeconds: 8,
        }),
        saved: false,
      };
    }

    const retryAfterSeconds = await cooldownSeconds(database, paymentId, now);
    if (retryAfterSeconds > 0) {
      return {
        ok: true,
        result: toPublicPaymentResultDto({
          snapshot,
          codeOverride: "VERIFICATION_UNAVAILABLE",
          retryAfterSeconds,
        }),
        saved: snapshot.payment.state === "unavailable",
      };
    }

    const actionWindow = Math.floor(
      now.getTime() / VERIFICATION_RETRY_COOLDOWN_MS,
    );
    const intelligence = await (dependencies.requestTransaction ??
      requestTransactionEvidence)({
      txHash: snapshot.payment.tx_hash,
      actionKey: `verify:${paymentId}:${snapshot.payment.tx_hash}:${actionWindow}`,
      invoiceId: snapshot.invoice.id,
      paymentId,
      nowMs: now.getTime(),
    });
    if (!intelligence.available) {
      await recordDecision({
        database,
        paymentId,
        state: "unavailable",
        code: "VERIFICATION_UNAVAILABLE",
        callId: null,
        observed: null,
        evidence: null,
      });
      snapshot = (await loadPaymentResultSnapshot({ database, publicId, paymentId }))!;
      return {
        ok: true,
        result: toPublicPaymentResultDto({
          snapshot,
          retryAfterSeconds: VERIFICATION_RETRY_COOLDOWN_MS / 1_000,
        }),
        saved: true,
      };
    }

    const decision = verifyInvoicePayment({
      expected: officialExpectedPayment({
        txHash: snapshot.payment.tx_hash,
        recipient: snapshot.invoice.recipient_wallet,
        amountUnits: BigInt(snapshot.quote.usdc_amount_units).toString(),
      }),
      evidence: intelligence.evidence,
    });
    if (decision.outcome === "verified") {
      await finalizeVerified({
        database,
        paymentId,
        decision,
        callId: intelligence.evidence.telegraphCallId,
      });
    } else {
      await recordDecision({
        database,
        paymentId,
        state: decision.outcome,
        code: decision.code,
        callId: intelligence.evidence.telegraphCallId,
        observed: decision.observed,
        evidence: decision.evidence,
      });
    }
    snapshot = (await loadPaymentResultSnapshot({ database, publicId, paymentId }))!;
    return {
      ok: true,
      result: toPublicPaymentResultDto({
        snapshot,
        ...(decision.outcome === "unavailable"
          ? { retryAfterSeconds: VERIFICATION_RETRY_COOLDOWN_MS / 1_000 }
          : {}),
      }),
      saved: true,
    };
  } catch {
    return unavailable();
  }
}
