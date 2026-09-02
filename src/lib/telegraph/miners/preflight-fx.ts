import { z } from "zod";
import {
  MinerAdapterError,
  parseEngineDirectAskEnvelope,
  requireFreshTimestamp,
  requireMinimumConfidence,
  requirePositiveDecimalString,
} from "@/lib/telegraph/miners/common";
import type { FxCurrency, FxEvidence } from "@/lib/telegraph/miners/types";

const resultSchema = z.object({
  query: z.string(),
  source: z.string().min(1),
  confidence: z.number().min(0).max(1),
  checked_at: z.iso.datetime(),
  base: z.string(),
  quote: z.string(),
  rate_formatted: z.string(),
  as_of: z.iso.datetime(),
  found: z.literal(true),
  verdict: z.literal("found"),
});

export function parsePreflightFx(input: {
  body: unknown;
  expectedMinerId: string;
  currency: FxCurrency;
  nowMs: number;
  maxAgeMs: number;
}): FxEvidence {
  const envelope = parseEngineDirectAskEnvelope(
    input.body,
    input.expectedMinerId,
  );
  requireFreshTimestamp({
    value: envelope.timestamp,
    nowMs: input.nowMs,
    maxAgeMs: input.maxAgeMs,
  });
  const parsed = resultSchema.safeParse(envelope.result);
  if (!parsed.success) {
    throw new MinerAdapterError(
      "INVALID_MINER_RESULT",
      "Preflight returned invalid FX evidence.",
    );
  }
  if (
    parsed.data.base !== input.currency ||
    parsed.data.quote !== "USD" ||
    parsed.data.query !== `${input.currency}/USD`
  ) {
    throw new MinerAdapterError(
      "WRONG_PAIR",
      "Preflight returned a different currency pair.",
    );
  }

  const observedAt = requireFreshTimestamp({
    value: parsed.data.checked_at,
    nowMs: input.nowMs,
    maxAgeMs: input.maxAgeMs,
  });
  return {
    currency: input.currency,
    quoteCurrency: "USD",
    rateToUsd: requirePositiveDecimalString(parsed.data.rate_formatted),
    observedAt,
    sourceAsOf: new Date(parsed.data.as_of).toISOString(),
    source: parsed.data.source,
    confidence: requireMinimumConfidence(parsed.data.confidence),
    minerId: envelope.miner_id,
    minerName: envelope.miner_name,
  };
}
