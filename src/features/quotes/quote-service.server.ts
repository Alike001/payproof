import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/database/types";
import { getAdminDatabaseClient } from "@/lib/database/admin.server";
import { calculateFxUsdcUnits, calculateUsdParityUnits } from "@/lib/money";
import { dailyNetworkHash } from "@/lib/request-identity.server";
import { requestFxEvidence } from "@/lib/telegraph/miners/service.server";
import type { FxCurrency } from "@/lib/telegraph/miners/types";
import {
  isQuoteCurrent,
  normalizeRateForStorage,
  QUOTE_RETRY_COOLDOWN_MS,
  QUOTE_TTL_MS,
  toPublicQuoteDto,
} from "@/features/quotes/model";
import type {
  PublicQuoteDto,
  QuoteRequestResult,
  QuoteSource,
} from "@/features/quotes/types";

type AdminDatabase = SupabaseClient<Database>;
type InvoiceQuoteRow = Pick<
  Database["public"]["Tables"]["invoices"]["Row"],
  "id" | "public_id" | "currency" | "amount_minor" | "lifecycle"
>;
type CurrentQuoteRow =
  Database["public"]["Functions"]["read_current_quote"]["Returns"][number];
type FxRequester = typeof requestFxEvidence;

export type QuoteServiceDependencies = {
  database?: AdminDatabase;
  now?: () => Date;
  networkHash?: (headers: Headers, now: Date) => string;
  requestFx?: FxRequester;
};

const publicIdSchema = z.uuid();
const quoteRateLimit = 6;
const quoteRateWindowSeconds = 60;

function unavailable(): QuoteRequestResult {
  return {
    ok: false,
    code: "QUOTE_UNAVAILABLE",
    message: "A trustworthy quote is temporarily unavailable. Payment remains paused.",
    retryable: true,
  };
}

function safeInvoiceAmount(value: number): bigint {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("Invoice storage contains an invalid amount.");
  }
  return BigInt(value);
}

function sourceFromCurrent(row: CurrentQuoteRow): QuoteSource {
  if (row.source_kind === "usd_parity") {
    return {
      kind: "usd_parity",
      name: "Nominal 1 USD = 1 test USDC",
      minerId: null,
      minerName: null,
      attemptRole: null,
    };
  }
  if (
    row.source_kind !== "telegraph_fx" ||
    !row.miner_id ||
    !row.miner_name ||
    (row.attempt_role !== "primary" && row.attempt_role !== "backup")
  ) {
    throw new Error("Stored quote provenance is invalid.");
  }
  return {
    kind: "telegraph_fx",
    name: row.source_name,
    minerId: row.miner_id,
    minerName: row.miner_name,
    attemptRole: row.attempt_role,
  };
}

function currentQuoteDto(row: CurrentQuoteRow): PublicQuoteDto {
  return toPublicQuoteDto({
    quoteId: row.id,
    sourceCurrency: row.source_currency,
    sourceAmountMinor: row.source_amount_minor_text,
    rateDecimal: row.rate_decimal_text,
    usdcAmountUnits: row.usdc_amount_units_text,
    quotedAt: row.quoted_at,
    expiresAt: row.expires_at,
    sourceObservedAt: row.source_observed_at,
    source: sourceFromCurrent(row),
  });
}

async function readCurrentQuote(
  database: AdminDatabase,
  invoiceId: string,
  now: Date,
): Promise<PublicQuoteDto | null> {
  const { data, error } = await database.rpc("read_current_quote", {
    p_invoice_id: invoiceId,
    p_now: now.toISOString(),
  });
  if (error) throw new Error("Current quote lookup failed.");
  const row = data?.[0];
  if (!row) return null;
  const quote = currentQuoteDto(row);
  return isQuoteCurrent(quote.expiresAt, now.getTime()) ? quote : null;
}

async function consumeRateLimit(input: {
  database: AdminDatabase;
  invoiceId: string;
  networkHash: string;
}): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const { data, error } = await input.database.rpc("consume_quote_rate_limit", {
    p_invoice_id: input.invoiceId,
    p_network_hash: input.networkHash,
    p_limit: quoteRateLimit,
    p_window_seconds: quoteRateWindowSeconds,
  });
  if (error || !data?.[0]) throw new Error("Quote rate limit is unavailable.");
  return {
    allowed: data[0].allowed,
    retryAfterSeconds: data[0].retry_after_seconds,
  };
}

async function cooldownSeconds(
  database: AdminDatabase,
  invoiceId: string,
  now: Date,
): Promise<number> {
  const { data, error } = await database
    .from("telegraph_calls")
    .select("created_at")
    .eq("invoice_id", invoiceId)
    .eq("intent", "CURRENCY_EXCHANGE")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Quote cooldown lookup failed.");
  if (!data) return 0;
  const elapsedMs = now.getTime() - Date.parse(data.created_at);
  if (!Number.isFinite(elapsedMs) || elapsedMs >= QUOTE_RETRY_COOLDOWN_MS) {
    return 0;
  }
  return Math.max(1, Math.ceil((QUOTE_RETRY_COOLDOWN_MS - elapsedMs) / 1_000));
}

async function insertQuote(input: {
  database: AdminDatabase;
  invoice: InvoiceQuoteRow;
  rate: string;
  usdcUnits: bigint;
  quotedAt: string;
  expiresAt: string;
  sourceObservedAt: string | null;
  sourceName: string;
  telegraphCallId: string | null;
  sourceKind: "usd_parity" | "telegraph_fx";
  source: QuoteSource;
}): Promise<PublicQuoteDto> {
  const amountMinor = safeInvoiceAmount(input.invoice.amount_minor);
  const { data, error } = await input.database
    .from("quotes")
    .insert({
      invoice_id: input.invoice.id,
      source_kind: input.sourceKind,
      source_currency: input.invoice.currency,
      source_amount_minor: Number(amountMinor),
      // Supabase generates numeric columns as number, but PostgREST accepts the
      // exact decimal string. No JavaScript floating-point arithmetic occurs.
      rate_decimal: input.rate as unknown as number,
      usdc_amount_units: Number(input.usdcUnits),
      quoted_at: input.quotedAt,
      expires_at: input.expiresAt,
      telegraph_call_id: input.telegraphCallId,
      source_observed_at: input.sourceObservedAt,
      source_name: input.sourceName,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("Quote storage failed.");
  return toPublicQuoteDto({
    quoteId: data.id,
    sourceCurrency: input.invoice.currency,
    sourceAmountMinor: amountMinor.toString(),
    rateDecimal: input.rate,
    usdcAmountUnits: input.usdcUnits.toString(),
    quotedAt: input.quotedAt,
    expiresAt: input.expiresAt,
    sourceObservedAt: input.sourceObservedAt,
    source: input.source,
  });
}

export async function requestInvoiceQuote(
  publicId: string,
  headers: Headers,
  dependencies: QuoteServiceDependencies = {},
): Promise<QuoteRequestResult> {
  if (!publicIdSchema.safeParse(publicId).success) {
    return {
      ok: false,
      code: "INVOICE_NOT_FOUND",
      message: "This invoice link is invalid or no longer available.",
      retryable: false,
    };
  }

  const database = dependencies.database ?? getAdminDatabaseClient();
  const now = (dependencies.now ?? (() => new Date()))();
  try {
    const { data: invoice, error } = await database
      .from("invoices")
      .select("id,public_id,currency,amount_minor,lifecycle")
      .eq("public_id", publicId)
      .maybeSingle();
    if (error) return unavailable();
    if (!invoice) {
      return {
        ok: false,
        code: "INVOICE_NOT_FOUND",
        message: "This invoice link is invalid or no longer available.",
        retryable: false,
      };
    }
    if (invoice.lifecycle !== "open") {
      return {
        ok: false,
        code: "INVOICE_NOT_PAYABLE",
        message: "This invoice no longer accepts payment.",
        retryable: false,
      };
    }

    const networkHash = (
      dependencies.networkHash ?? dailyNetworkHash
    )(headers, now);
    const limit = await consumeRateLimit({
      database,
      invoiceId: invoice.id,
      networkHash,
    });
    if (!limit.allowed) {
      return {
        ok: false,
        code: "QUOTE_RATE_LIMITED",
        message: "Too many quote requests. Please wait before trying again.",
        retryable: true,
        retryAfterSeconds: limit.retryAfterSeconds,
      };
    }

    const current = await readCurrentQuote(database, invoice.id, now);
    if (current) return { ok: true, quote: current, reused: true };

    const amountMinor = safeInvoiceAmount(invoice.amount_minor);
    const quotedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + QUOTE_TTL_MS).toISOString();
    if (invoice.currency === "USD") {
      const source: QuoteSource = {
        kind: "usd_parity",
        name: "Nominal 1 USD = 1 test USDC",
        minerId: null,
        minerName: null,
        attemptRole: null,
      };
      const quote = await insertQuote({
        database,
        invoice,
        rate: "1",
        usdcUnits: calculateUsdParityUnits(amountMinor),
        quotedAt,
        expiresAt,
        sourceObservedAt: null,
        sourceName: source.name,
        telegraphCallId: null,
        sourceKind: "usd_parity",
        source,
      });
      return { ok: true, quote, reused: false };
    }

    const retryAfterSeconds = await cooldownSeconds(database, invoice.id, now);
    if (retryAfterSeconds > 0) {
      return {
        ok: false,
        code: "QUOTE_COOLDOWN",
        message: "A quote attempt just ran. Please wait before trying again.",
        retryable: true,
        retryAfterSeconds,
      };
    }

    const actionWindow = Math.floor(now.getTime() / QUOTE_RETRY_COOLDOWN_MS);
    const result = await (dependencies.requestFx ?? requestFxEvidence)({
      currency: invoice.currency as FxCurrency,
      actionKey: `quote:${invoice.id}:${invoice.currency}:${amountMinor}:${actionWindow}`,
      invoiceId: invoice.id,
      nowMs: now.getTime(),
    });
    if (!result.available) {
      const racedQuote = await readCurrentQuote(database, invoice.id, now);
      if (racedQuote) return { ok: true, quote: racedQuote, reused: true };
      return {
        ok: false,
        code: "QUOTE_UNAVAILABLE",
        message: "A trustworthy quote is temporarily unavailable. Payment remains paused.",
        retryable: true,
        retryAfterSeconds: quoteRateWindowSeconds / quoteRateLimit,
      };
    }

    const rate = normalizeRateForStorage(result.evidence.rateToUsd);
    const source: QuoteSource = {
      kind: "telegraph_fx",
      name: result.evidence.source,
      minerId: result.evidence.minerId,
      minerName: result.evidence.minerName,
      attemptRole: result.role,
    };
    const quote = await insertQuote({
      database,
      invoice,
      rate,
      usdcUnits: calculateFxUsdcUnits(amountMinor, rate),
      quotedAt,
      expiresAt,
      sourceObservedAt: result.evidence.sourceAsOf,
      sourceName: result.evidence.source,
      telegraphCallId: result.evidence.telegraphCallId,
      sourceKind: "telegraph_fx",
      source,
    });
    return { ok: true, quote, reused: false };
  } catch {
    return unavailable();
  }
}
