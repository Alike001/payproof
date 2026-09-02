import type { SupportedCurrency } from "@/lib/money";

export type QuoteSource =
  | {
      kind: "usd_parity";
      name: "Nominal 1 USD = 1 test USDC";
      minerId: null;
      minerName: null;
      attemptRole: null;
    }
  | {
      kind: "telegraph_fx";
      name: string;
      minerId: string;
      minerName: string;
      attemptRole: "primary" | "backup";
    };

export type PublicQuoteDto = {
  quoteId: string;
  sourceCurrency: SupportedCurrency;
  targetCurrency: "USD";
  localAmountFormatted: string;
  rateToUsd: string;
  usdcAmountUnits: string;
  usdcAmountFormatted: string;
  quotedAt: string;
  expiresAt: string;
  sourceObservedAt: string | null;
  source: QuoteSource;
};

export type QuoteRequestResult =
  | { ok: true; quote: PublicQuoteDto; reused: boolean }
  | {
      ok: false;
      code:
        | "INVOICE_NOT_FOUND"
        | "INVOICE_NOT_PAYABLE"
        | "QUOTE_RATE_LIMITED"
        | "QUOTE_COOLDOWN"
        | "QUOTE_UNAVAILABLE";
      message: string;
      retryable: boolean;
      retryAfterSeconds?: number;
    };
