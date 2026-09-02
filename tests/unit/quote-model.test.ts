import { describe, expect, it } from "vitest";
import {
  isQuoteCurrent,
  normalizeRateForStorage,
  QUOTE_TTL_MS,
  toPublicQuoteDto,
} from "@/features/quotes/model";

const quoteId = "11111111-1111-4111-8111-111111111111";

describe("quote model", () => {
  it("normalizes stored rates to the database 18-decimal contract", () => {
    expect(normalizeRateForStorage("1.234567890123456789")).toBe(
      "1.234567890123456789",
    );
    expect(normalizeRateForStorage("1.230000000000000000")).toBe("1.23");
  });

  it("treats expiry as exclusive at exactly fifteen minutes", () => {
    const quotedAt = Date.parse("2026-09-02T12:00:00.000Z");
    const expiresAt = new Date(quotedAt + QUOTE_TTL_MS).toISOString();
    expect(isQuoteCurrent(expiresAt, quotedAt + QUOTE_TTL_MS - 1)).toBe(true);
    expect(isQuoteCurrent(expiresAt, quotedAt + QUOTE_TTL_MS)).toBe(false);
  });

  it("returns exact decimal-string and integer-string public amounts", () => {
    expect(
      toPublicQuoteDto({
        quoteId,
        sourceCurrency: "NGN",
        sourceAmountMinor: "25000000",
        rateDecimal: "0.00064123",
        usdcAmountUnits: "160307500",
        quotedAt: "2026-09-02T12:00:00.000Z",
        expiresAt: "2026-09-02T12:15:00.000Z",
        sourceObservedAt: "2026-09-02T11:59:00.000Z",
        source: {
          kind: "telegraph_fx",
          name: "Structured FX feed",
          minerId: "20260827",
          minerName: "FX Rate Mirror",
          attemptRole: "primary",
        },
      }),
    ).toEqual({
      quoteId,
      sourceCurrency: "NGN",
      targetCurrency: "USD",
      localAmountFormatted: "₦250,000.00",
      rateToUsd: "0.00064123",
      usdcAmountUnits: "160307500",
      usdcAmountFormatted: "160.307500",
      quotedAt: "2026-09-02T12:00:00.000Z",
      expiresAt: "2026-09-02T12:15:00.000Z",
      sourceObservedAt: "2026-09-02T11:59:00.000Z",
      source: {
        kind: "telegraph_fx",
        name: "Structured FX feed",
        minerId: "20260827",
        minerName: "FX Rate Mirror",
        attemptRole: "primary",
      },
    });
  });

  it("fails closed on unsafe stored integer values", () => {
    expect(() =>
      toPublicQuoteDto({
        quoteId,
        sourceCurrency: "USD",
        sourceAmountMinor: "9007199254740992",
        rateDecimal: "1",
        usdcAmountUnits: "1000000",
        quotedAt: "2026-09-02T12:00:00.000Z",
        expiresAt: "2026-09-02T12:15:00.000Z",
        sourceObservedAt: null,
        source: {
          kind: "usd_parity",
          name: "Nominal 1 USD = 1 test USDC",
          minerId: null,
          minerName: null,
          attemptRole: null,
        },
      }),
    ).toThrow(/unsafe/i);
  });
});
