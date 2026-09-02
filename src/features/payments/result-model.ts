import { getAddress } from "viem";
import { baseSepolia } from "viem/chains";
import { z } from "zod";
import type { Database } from "@/lib/database/types";
import { formatUsdcUnits } from "@/lib/money";
import {
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_USDC_ADDRESS,
} from "@/lib/telegraph/constants";
import { transactionHashSchema } from "@/features/payments/model";
import type {
  PublicPaymentResultDto,
  PublicVerificationEvidence,
} from "@/features/payments/types";

export type PaymentResultSnapshot = {
  payment: Pick<
    Database["public"]["Tables"]["payments"]["Row"],
    | "id"
    | "invoice_id"
    | "quote_id"
    | "tx_hash"
    | "submitted_by_wallet"
    | "state"
    | "mismatch_code"
    | "observed_chain_id"
    | "observed_token"
    | "observed_recipient"
    | "observed_amount_units"
    | "observed_tx_status"
    | "verification_call_id"
    | "verification_observed_at"
    | "verification_source"
    | "submitted_at"
    | "last_checked_at"
    | "verified_transfer_sender"
    | "verified_at"
  >;
  invoice: Pick<
    Database["public"]["Tables"]["invoices"]["Row"],
    "id" | "public_id" | "recipient_wallet" | "lifecycle"
  >;
  quote: Pick<
    Database["public"]["Tables"]["quotes"]["Row"],
    "id" | "invoice_id" | "usdc_amount_units"
  >;
  call:
    | Pick<
        Database["public"]["Tables"]["telegraph_calls"]["Row"],
        "id" | "miner_id" | "miner_name" | "attempt_role"
      >
    | null;
};

export type PublicVerificationCode =
  | "TRANSACTION_NOT_FOUND"
  | "TRANSACTION_PENDING"
  | "TRANSACTION_REVERTED"
  | "WRONG_CHAIN"
  | "WRONG_TRANSACTION_HASH"
  | "USDC_TRANSFER_NOT_FOUND"
  | "WRONG_TOKEN"
  | "WRONG_RECIPIENT"
  | "WRONG_AMOUNT"
  | "INVOICE_ALREADY_VERIFIED"
  | "INVOICE_NOT_PAYABLE"
  | "VERIFICATION_UNAVAILABLE";

const verificationCodeSchema = z.enum([
  "TRANSACTION_NOT_FOUND",
  "TRANSACTION_PENDING",
  "TRANSACTION_REVERTED",
  "WRONG_CHAIN",
  "WRONG_TRANSACTION_HASH",
  "USDC_TRANSFER_NOT_FOUND",
  "WRONG_TOKEN",
  "WRONG_RECIPIENT",
  "WRONG_AMOUNT",
  "INVOICE_ALREADY_VERIFIED",
  "INVOICE_NOT_PAYABLE",
  "VERIFICATION_UNAVAILABLE",
]);
const paymentStateSchema = z.enum([
  "submitted",
  "unavailable",
  "mismatch",
  "verified",
]);

function safeUnits(value: number, allowZero = false): bigint {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new Error("Stored payment amount is invalid.");
  }
  return BigInt(value);
}

function timestamp(value: string, field: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`${field} is invalid.`);
  return new Date(parsed).toISOString();
}

function messageFor(
  state: PublicPaymentResultDto["state"],
  code: PublicVerificationCode | null,
): string {
  if (state === "verified") {
    return "Telegraph evidence matches the exact Base Sepolia test-USDC payment.";
  }
  const messages: Record<PublicVerificationCode, string> = {
    TRANSACTION_NOT_FOUND:
      "The saved transaction is not visible to Telegraph yet. It can be checked again.",
    TRANSACTION_PENDING:
      "The transaction hash is saved and is still waiting to be mined.",
    TRANSACTION_REVERTED:
      "The transaction was mined but reverted, so no receipt was issued.",
    WRONG_CHAIN:
      "The transaction evidence belongs to the wrong network.",
    WRONG_TRANSACTION_HASH:
      "The evidence does not match the saved transaction hash.",
    USDC_TRANSFER_NOT_FOUND:
      "No ERC-20 transfer was found in the transaction.",
    WRONG_TOKEN:
      "The transaction transferred a token other than official Base Sepolia test USDC.",
    WRONG_RECIPIENT:
      "The official test USDC was sent to a different recipient.",
    WRONG_AMOUNT:
      "The official test-USDC transfer amount does not exactly match the locked quote.",
    INVOICE_ALREADY_VERIFIED:
      "Another transaction already verified this invoice.",
    INVOICE_NOT_PAYABLE:
      "The invoice was cancelled before verification completed.",
    VERIFICATION_UNAVAILABLE:
      "Trustworthy Telegraph evidence is temporarily unavailable. The saved hash can be retried.",
  };
  return code ? messages[code] : messages.VERIFICATION_UNAVAILABLE;
}

function evidenceDto(
  snapshot: PaymentResultSnapshot,
): PublicVerificationEvidence | null {
  const { payment, call } = snapshot;
  if (!call) return null;
  if (
    !payment.verification_observed_at ||
    !payment.verification_source ||
    !payment.last_checked_at ||
    (call.attempt_role !== "primary" && call.attempt_role !== "backup")
  ) {
    throw new Error("Stored verification provenance is incomplete.");
  }
  return {
    minerId: call.miner_id,
    minerName: call.miner_name,
    attemptRole: call.attempt_role,
    observedAt: timestamp(
      payment.verification_observed_at,
      "Verification observation time",
    ),
    checkedAt: timestamp(payment.last_checked_at, "Verification check time"),
    source: payment.verification_source,
  };
}

export function toPublicPaymentResultDto(input: {
  snapshot: PaymentResultSnapshot;
  codeOverride?: PublicVerificationCode;
  retryAfterSeconds?: number;
}): PublicPaymentResultDto {
  const { payment, invoice, quote } = input.snapshot;
  const state = paymentStateSchema.parse(payment.state);
  const expectedUnits = safeUnits(quote.usdc_amount_units);
  const observedUnits =
    payment.observed_amount_units === null
      ? null
      : safeUnits(payment.observed_amount_units, true);
  const code =
    state === "verified"
      ? null
      : input.codeOverride ??
        (payment.mismatch_code
          ? verificationCodeSchema.parse(payment.mismatch_code)
          : state === "submitted"
            ? "TRANSACTION_PENDING"
            : "VERIFICATION_UNAVAILABLE");
  const verified = state === "verified";
  const txHash = transactionHashSchema.parse(payment.tx_hash);
  const explorerOrigin = baseSepolia.blockExplorers.default.url.replace(/\/$/, "");

  return {
    paymentId: z.uuid().parse(payment.id),
    quoteId: z.uuid().parse(quote.id),
    state,
    code,
    message: messageFor(state, code),
    retryable: state === "submitted" || state === "unavailable",
    ...(input.retryAfterSeconds
      ? { retryAfterSeconds: input.retryAfterSeconds }
      : {}),
    transaction: {
      hash: txHash,
      explorerUrl: `${explorerOrigin}/tx/${txHash}`,
      submittedByWallet: getAddress(payment.submitted_by_wallet),
      submittedAt: timestamp(payment.submitted_at, "Payment submission time"),
    },
    expected: {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      network: "Base Sepolia",
      token: "USDC",
      tokenAddress: getAddress(BASE_SEPOLIA_USDC_ADDRESS),
      recipientAddress: getAddress(invoice.recipient_wallet),
      usdcAmountUnits: expectedUnits.toString(),
      usdcAmountFormatted: formatUsdcUnits(expectedUnits),
    },
    observed: {
      chainId:
        payment.observed_chain_id === null
          ? null
          : safeUnits(payment.observed_chain_id, true).toString(),
      tokenAddress: payment.observed_token
        ? getAddress(payment.observed_token)
        : null,
      recipientAddress: payment.observed_recipient
        ? getAddress(payment.observed_recipient)
        : null,
      amountUnits: observedUnits?.toString() ?? null,
      amountFormatted:
        observedUnits === null ? null : formatUsdcUnits(observedUnits),
      transactionStatus: payment.observed_tx_status,
    },
    evidence: evidenceDto(input.snapshot),
    receipt: verified
      ? {
          payerAddress: getAddress(payment.verified_transfer_sender!),
          verifiedAt: timestamp(payment.verified_at!, "Payment verification time"),
        }
      : null,
  };
}
