import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/database/types";
import { getAdminDatabaseClient } from "@/lib/database/admin.server";
import { dailyNetworkHash } from "@/lib/request-identity.server";
import {
  normalizeSubmitPaymentInput,
  toPublicPaymentAttemptDto,
} from "@/features/payments/model";
import type { PaymentSubmissionResult } from "@/features/payments/types";

type AdminDatabase = SupabaseClient<Database>;

export type PaymentServiceDependencies = {
  database?: AdminDatabase;
  now?: () => Date;
  networkHash?: (headers: Headers, now: Date) => string;
};

const publicIdSchema = z.uuid();
const paymentRateLimit = 6;
const paymentRateWindowSeconds = 60;

function failure(
  code: Exclude<PaymentSubmissionResult, { ok: true }>["code"],
  message: string,
  retryable: boolean,
  retryAfterSeconds?: number,
): PaymentSubmissionResult {
  return {
    ok: false,
    code,
    message,
    retryable,
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
  };
}

function unavailable(): PaymentSubmissionResult {
  return failure(
    "PAYMENT_UNAVAILABLE",
    "The transaction hash could not be saved safely. Do not send another payment yet.",
    true,
  );
}

export async function submitPaymentAttempt(
  publicId: string,
  rawInput: unknown,
  headers: Headers,
  dependencies: PaymentServiceDependencies = {},
): Promise<PaymentSubmissionResult> {
  if (!publicIdSchema.safeParse(publicId).success) {
    return failure(
      "INVOICE_NOT_FOUND",
      "This invoice link is invalid or no longer available.",
      false,
    );
  }
  const parsed = normalizeSubmitPaymentInputSafe(rawInput);
  if (!parsed.ok) return parsed.result;

  try {
    const database = dependencies.database ?? getAdminDatabaseClient();
    const now = (dependencies.now ?? (() => new Date()))();
    const networkHash = (dependencies.networkHash ?? dailyNetworkHash)(
      headers,
      now,
    );
    const { data, error } = await database.rpc("submit_payment_attempt", {
      p_public_id: publicId,
      p_quote_id: parsed.input.quoteId,
      p_tx_hash: parsed.input.txHash,
      p_submitted_by_wallet: parsed.input.submittedByWallet,
      p_network_hash: networkHash,
      p_now: now.toISOString(),
      p_limit: paymentRateLimit,
      p_window_seconds: paymentRateWindowSeconds,
    });
    if (error || !data?.[0]) return unavailable();
    const row = data[0];

    if (row.outcome === "created" || row.outcome === "idempotent") {
      return {
        ok: true,
        payment: toPublicPaymentAttemptDto({
          paymentId: row.payment_id,
          quoteId: row.quote_id,
          txHash: row.tx_hash,
          submittedByWallet: row.submitted_by_wallet,
          state: row.payment_state,
          submittedAt: row.submitted_at,
        }),
        reused: row.outcome === "idempotent",
      };
    }

    switch (row.outcome) {
      case "invoice_not_found":
        return failure(
          "INVOICE_NOT_FOUND",
          "This invoice link is invalid or no longer available.",
          false,
        );
      case "invoice_not_payable":
        return failure(
          "INVOICE_NOT_PAYABLE",
          "This invoice no longer accepts payment.",
          false,
        );
      case "quote_not_found":
        return failure(
          "QUOTE_NOT_FOUND",
          "That quote does not belong to this invoice. Request a new quote.",
          true,
        );
      case "quote_expired":
        return failure(
          "QUOTE_EXPIRED",
          "The quote expired before the transaction hash was saved. Do not pay again; check the submitted transaction first.",
          true,
        );
      case "transaction_already_used":
        return failure(
          "TRANSACTION_ALREADY_USED",
          "That transaction hash is already attached to another payment.",
          false,
        );
      case "payment_in_progress":
        return failure(
          "PAYMENT_IN_PROGRESS",
          "Another transaction is already being checked for this invoice.",
          false,
        );
      case "rate_limited":
        return failure(
          "PAYMENT_RATE_LIMITED",
          "Too many payment submissions. Wait before trying again.",
          true,
          row.retry_after_seconds,
        );
      default:
        return unavailable();
    }
  } catch {
    return unavailable();
  }
}

function normalizeSubmitPaymentInputSafe(rawInput: unknown):
  | { ok: true; input: ReturnType<typeof normalizeSubmitPaymentInput> }
  | { ok: false; result: PaymentSubmissionResult } {
  try {
    return { ok: true, input: normalizeSubmitPaymentInput(rawInput) };
  } catch {
    return {
      ok: false,
      result: failure(
        "INVALID_PAYMENT",
        "Use the current quote and a complete Base Sepolia transaction hash.",
        false,
      ),
    };
  }
}
