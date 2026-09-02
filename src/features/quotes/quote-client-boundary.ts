"use client";

import { z } from "zod";
import type { QuoteRequestResult } from "@/features/quotes/types";

const quoteSourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("usd_parity"),
    name: z.literal("Nominal 1 USD = 1 test USDC"),
    minerId: z.null(),
    minerName: z.null(),
    attemptRole: z.null(),
  }),
  z.object({
    kind: z.literal("telegraph_fx"),
    name: z.string().min(1).max(120),
    minerId: z.string().min(1).max(100),
    minerName: z.string().min(1).max(120),
    attemptRole: z.enum(["primary", "backup"]),
  }),
]);

const publicQuoteSchema = z.object({
  quoteId: z.uuid(),
  sourceCurrency: z.enum(["NGN", "USD", "EUR", "GBP"]),
  targetCurrency: z.literal("USD"),
  localAmountFormatted: z.string().min(1),
  rateToUsd: z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/),
  usdcAmountUnits: z.string().regex(/^[1-9]\d*$/),
  usdcAmountFormatted: z.string().regex(/^\d+\.\d{6}$/),
  quotedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  sourceObservedAt: z.iso.datetime().nullable(),
  source: quoteSourceSchema,
});

const quoteRequestResultSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    quote: publicQuoteSchema,
    reused: z.boolean(),
  }),
  z.object({
    ok: z.literal(false),
    code: z.enum([
      "INVOICE_NOT_FOUND",
      "INVOICE_NOT_PAYABLE",
      "QUOTE_RATE_LIMITED",
      "QUOTE_COOLDOWN",
      "QUOTE_UNAVAILABLE",
    ]),
    message: z.string().min(1),
    retryable: z.boolean(),
    retryAfterSeconds: z.number().int().positive().optional(),
  }),
]);

function unavailable(): QuoteRequestResult {
  return {
    ok: false,
    code: "QUOTE_UNAVAILABLE",
    message: "A trustworthy quote is temporarily unavailable. Payment remains paused.",
    retryable: true,
  };
}

export async function requestQuote(
  publicId: string,
): Promise<QuoteRequestResult> {
  try {
    const response = await fetch(
      `/api/invoices/${encodeURIComponent(publicId)}/quote`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      },
    );
    const result = quoteRequestResultSchema.safeParse(await response.json());
    return result.success ? result.data : unavailable();
  } catch {
    return unavailable();
  }
}
