import { getAddress } from "viem";
import { z } from "zod";
import { normalizeAddress } from "@/lib/address";
import type {
  PaymentAttemptState,
  PublicPaymentAttemptDto,
  SubmitPaymentInput,
} from "@/features/payments/types";

export const transactionHashSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/, {
    message: "Enter a complete Base Sepolia transaction hash.",
  })
  .transform((value) => value.toLowerCase() as `0x${string}`);

export const submitPaymentInputSchema = z.strictObject({
  quoteId: z.uuid("Select a valid current quote."),
  txHash: transactionHashSchema,
  submittedByWallet: z.string().transform((value, context) => {
    try {
      return normalizeAddress(value);
    } catch {
      context.addIssue({
        code: "custom",
        message: "Connect the wallet that submitted this transaction.",
      });
      return z.NEVER;
    }
  }),
});

const paymentStateSchema = z.enum([
  "submitted",
  "unavailable",
  "mismatch",
  "verified",
]);

export function toPublicPaymentAttemptDto(input: {
  paymentId: string;
  quoteId: string;
  txHash: string;
  submittedByWallet: string;
  state: string;
  submittedAt: string;
}): PublicPaymentAttemptDto {
  const submittedAtMs = Date.parse(input.submittedAt);
  if (!Number.isFinite(submittedAtMs)) {
    throw new Error("Stored payment timestamp is invalid.");
  }
  return {
    paymentId: z.uuid().parse(input.paymentId),
    quoteId: z.uuid().parse(input.quoteId),
    txHash: transactionHashSchema.parse(input.txHash),
    submittedByWallet: getAddress(input.submittedByWallet),
    state: paymentStateSchema.parse(input.state) as PaymentAttemptState,
    submittedAt: new Date(submittedAtMs).toISOString(),
  };
}

export function normalizeSubmitPaymentInput(input: unknown): SubmitPaymentInput {
  return submitPaymentInputSchema.parse(input);
}
