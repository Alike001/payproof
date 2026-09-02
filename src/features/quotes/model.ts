import Decimal from "decimal.js";
import { z } from "zod";
import {
  formatLocalAmount,
  formatUsdcUnits,
  MAX_SAFE_DATABASE_UNITS,
  parseFxRate,
  type SupportedCurrency,
} from "@/lib/money";
import type { PublicQuoteDto, QuoteSource } from "@/features/quotes/types";

export const QUOTE_TTL_MS = 15 * 60 * 1_000;
export const QUOTE_RETRY_COOLDOWN_MS = 10 * 1_000;

const currencySchema = z.enum(["NGN", "USD", "EUR", "GBP"]);

function positiveSafeUnits(value: string, field: string): bigint {
  if (!/^[1-9]\d*$/.test(value)) throw new Error(`${field} is invalid.`);
  const units = BigInt(value);
  if (units > MAX_SAFE_DATABASE_UNITS) throw new Error(`${field} is unsafe.`);
  return units;
}

function canonicalTimestamp(value: string, field: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(`${field} is invalid.`);
  return new Date(timestamp).toISOString();
}

export function normalizeRateForStorage(rate: string): string {
  return parseFxRate(rate)
    .toDecimalPlaces(18, Decimal.ROUND_HALF_UP)
    .toFixed();
}

export function isQuoteCurrent(expiresAt: string, nowMs: number): boolean {
  const expiresMs = Date.parse(expiresAt);
  return Number.isFinite(expiresMs) && expiresMs > nowMs;
}

export function toPublicQuoteDto(input: {
  quoteId: string;
  sourceCurrency: string;
  sourceAmountMinor: string;
  rateDecimal: string;
  usdcAmountUnits: string;
  quotedAt: string;
  expiresAt: string;
  sourceObservedAt: string | null;
  source: QuoteSource;
}): PublicQuoteDto {
  const currency: SupportedCurrency = currencySchema.parse(input.sourceCurrency);
  const localUnits = positiveSafeUnits(
    input.sourceAmountMinor,
    "Stored local amount",
  );
  const usdcUnits = positiveSafeUnits(
    input.usdcAmountUnits,
    "Stored USDC amount",
  );
  const rate = normalizeRateForStorage(input.rateDecimal);
  if (!z.uuid().safeParse(input.quoteId).success) {
    throw new Error("Stored quote ID is invalid.");
  }
  const quotedAt = canonicalTimestamp(input.quotedAt, "Stored quote timestamp");
  const expiresAt = canonicalTimestamp(input.expiresAt, "Stored quote expiry");
  const sourceObservedAt = input.sourceObservedAt
    ? canonicalTimestamp(input.sourceObservedAt, "Stored source timestamp")
    : null;

  return {
    quoteId: input.quoteId,
    sourceCurrency: currency,
    targetCurrency: "USD",
    localAmountFormatted: formatLocalAmount(localUnits, currency),
    rateToUsd: rate,
    usdcAmountUnits: usdcUnits.toString(),
    usdcAmountFormatted: formatUsdcUnits(usdcUnits),
    quotedAt,
    expiresAt,
    sourceObservedAt,
    source: input.source,
  };
}
