"use client";

import { z } from "zod";
import type { PaymentVerificationResult } from "@/features/payments/types";

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

const addressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const nullableAddressSchema = addressSchema.nullable();
const exactUnitsSchema = z.string().regex(/^(?:0|[1-9]\d*)$/);
const resultDtoSchema = z
  .object({
    paymentId: z.uuid(),
    quoteId: z.uuid(),
    state: z.enum(["submitted", "unavailable", "mismatch", "verified"]),
    code: verificationCodeSchema.nullable(),
    message: z.string().min(1),
    retryable: z.boolean(),
    retryAfterSeconds: z.number().int().positive().optional(),
    transaction: z.object({
      hash: z.string().regex(/^0x[0-9a-f]{64}$/),
      explorerUrl: z.url(),
      submittedByWallet: addressSchema,
      submittedAt: z.iso.datetime(),
    }),
    expected: z.object({
      chainId: z.literal(84_532),
      network: z.literal("Base Sepolia"),
      token: z.literal("USDC"),
      tokenAddress: addressSchema,
      recipientAddress: addressSchema,
      usdcAmountUnits: z.string().regex(/^[1-9]\d*$/),
      usdcAmountFormatted: z.string().regex(/^\d+\.\d{6}$/),
    }),
    observed: z.object({
      chainId: exactUnitsSchema.nullable(),
      tokenAddress: nullableAddressSchema,
      recipientAddress: nullableAddressSchema,
      amountUnits: exactUnitsSchema.nullable(),
      amountFormatted: z.string().regex(/^\d+\.\d{6}$/).nullable(),
      transactionStatus: z.string().nullable(),
    }),
    evidence: z
      .object({
        minerId: z.string().min(1).max(100),
        minerName: z.string().min(1).max(120),
        attemptRole: z.enum(["primary", "backup"]),
        observedAt: z.iso.datetime(),
        checkedAt: z.iso.datetime(),
        source: z.string().min(1).max(200),
      })
      .nullable(),
    receipt: z
      .object({ payerAddress: addressSchema, verifiedAt: z.iso.datetime() })
      .nullable(),
  })
  .superRefine((value, context) => {
    const verifiedShape =
      value.code === null &&
      !value.retryable &&
      value.receipt !== null &&
      value.evidence !== null &&
      value.observed.chainId !== null &&
      value.observed.tokenAddress !== null &&
      value.observed.recipientAddress !== null &&
      value.observed.amountUnits !== null &&
      value.observed.transactionStatus === "success";
    if (value.state === "verified" && !verifiedShape) {
      context.addIssue({
        code: "custom",
        message: "Verified response is missing exact receipt evidence.",
      });
    }
    if (value.state !== "verified" && value.receipt !== null) {
      context.addIssue({
        code: "custom",
        message: "A non-verified response cannot contain a receipt.",
      });
    }
    if (value.state === "mismatch" && (value.code === null || !value.evidence)) {
      context.addIssue({
        code: "custom",
        message: "Mismatch response is missing its Telegraph evidence.",
      });
    }
  });

const verificationResultSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    result: resultDtoSchema,
    saved: z.boolean(),
  }),
  z.object({
    ok: z.literal(false),
    code: z.enum([
      "INVOICE_NOT_FOUND",
      "PAYMENT_NOT_FOUND",
      "INVOICE_NOT_PAYABLE",
      "VERIFICATION_RATE_LIMITED",
      "VERIFICATION_UNAVAILABLE",
    ]),
    message: z.string().min(1),
    retryable: z.boolean(),
    retryAfterSeconds: z.number().int().positive().optional(),
  }),
]);

function unavailable(): PaymentVerificationResult {
  return {
    ok: false,
    code: "VERIFICATION_UNAVAILABLE",
    message: "Payment verification is temporarily unavailable. The saved transaction hash is safe to retry.",
    retryable: true,
  };
}

export async function requestPaymentVerification(
  publicId: string,
  paymentId: string,
): Promise<PaymentVerificationResult> {
  try {
    const response = await fetch(
      `/api/invoices/${encodeURIComponent(publicId)}/payments/${encodeURIComponent(paymentId)}/verify`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      },
    );
    const parsed = verificationResultSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : unavailable();
  } catch {
    return unavailable();
  }
}
