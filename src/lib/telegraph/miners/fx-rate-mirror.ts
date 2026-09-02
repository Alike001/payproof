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
  rate: z.string(),
  pair: z.string(),
  as_of: z.iso.datetime(),
  status: z.literal("ok"),
  stale: z.literal(false),
  source: z.string().min(1),
  confidence: z.number().min(0).max(1),
  checks_passed: z.number().int().nonnegative(),
  checks_total: z.number().int().positive(),
});

export function parseFxRateMirror(input: {
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
      "FX Rate Mirror returned invalid rate evidence.",
    );
  }
  if (parsed.data.pair !== `${input.currency}/USD`) {
    throw new MinerAdapterError(
      "WRONG_PAIR",
      "FX Rate Mirror returned a different currency pair.",
    );
  }
  if (parsed.data.checks_passed !== parsed.data.checks_total) {
    throw new MinerAdapterError(
      "INSUFFICIENT_EVIDENCE",
      "FX Rate Mirror did not pass all declared source checks.",
    );
  }

  const observedAt = requireFreshTimestamp({
    value: parsed.data.as_of,
    nowMs: input.nowMs,
    maxAgeMs: input.maxAgeMs,
  });
  return {
    currency: input.currency,
    quoteCurrency: "USD",
    rateToUsd: requirePositiveDecimalString(parsed.data.rate),
    observedAt,
    sourceAsOf: observedAt,
    source: parsed.data.source,
    confidence: requireMinimumConfidence(parsed.data.confidence),
    minerId: envelope.miner_id,
    minerName: envelope.miner_name,
  };
}
