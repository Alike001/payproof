"use client";

import { z } from "zod";
import type {
  PaymentSubmissionResult,
  SubmitPaymentInput,
} from "@/features/payments/types";

const paymentSchema = z.object({
  paymentId: z.uuid(),
  quoteId: z.uuid(),
  txHash: z.string().regex(/^0x[0-9a-f]{64}$/),
  submittedByWallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  state: z.enum(["submitted", "unavailable", "mismatch", "verified"]),
  submittedAt: z.iso.datetime(),
});

const resultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), payment: paymentSchema, reused: z.boolean() }),
  z.object({
    ok: z.literal(false),
    code: z.enum([
      "INVALID_PAYMENT",
      "INVOICE_NOT_FOUND",
      "INVOICE_NOT_PAYABLE",
      "QUOTE_NOT_FOUND",
      "QUOTE_EXPIRED",
      "TRANSACTION_ALREADY_USED",
      "PAYMENT_IN_PROGRESS",
      "PAYMENT_RATE_LIMITED",
      "PAYMENT_UNAVAILABLE",
    ]),
    message: z.string().min(1),
    retryable: z.boolean(),
    retryAfterSeconds: z.number().int().positive().optional(),
  }),
]);

function unavailable(): PaymentSubmissionResult {
  return {
    ok: false,
    code: "PAYMENT_UNAVAILABLE",
    message: "The transaction hash could not be saved safely. Do not send another payment yet.",
    retryable: true,
  };
}

export async function savePaymentAttempt(
  publicId: string,
  input: SubmitPaymentInput,
): Promise<PaymentSubmissionResult> {
  try {
    const response = await fetch(
      `/api/invoices/${encodeURIComponent(publicId)}/payments`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    const parsed = resultSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : unavailable();
  } catch {
    return unavailable();
  }
}
