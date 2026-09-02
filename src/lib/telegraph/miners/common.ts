import Decimal from "decimal.js";
import { z } from "zod";
import { normalizeAddress } from "@/lib/address";

const transactionHashSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/)
  .transform((value) => value.toLowerCase());

export class MinerAdapterError extends Error {
  constructor(
    public readonly code:
      | "INVALID_ENGINE_ENVELOPE"
      | "WRONG_MINER"
      | "INVALID_MINER_RESULT"
      | "WRONG_PAIR"
      | "STALE_EVIDENCE"
      | "WRONG_CHAIN"
      | "WRONG_TRANSACTION"
      | "INSUFFICIENT_EVIDENCE",
    message: string,
  ) {
    super(message);
    this.name = "MinerAdapterError";
  }
}

const engineEnvelopeSchema = z.object({
  miner_id: z.string().min(1),
  miner_name: z.string().min(1),
  result: z.unknown(),
  cost_usd: z.number().nonnegative().optional(),
  duration_ms: z.number().int().nonnegative().optional(),
  timestamp: z.iso.datetime(),
  endpoint: z.string().optional(),
});

export type EngineDirectAskEnvelope = z.infer<typeof engineEnvelopeSchema>;

export function parseEngineDirectAskEnvelope(
  value: unknown,
  expectedMinerId: string,
): EngineDirectAskEnvelope {
  const parsed = engineEnvelopeSchema.safeParse(value);
  if (!parsed.success) {
    throw new MinerAdapterError(
      "INVALID_ENGINE_ENVELOPE",
      "Telegraph returned an invalid direct-ask envelope.",
    );
  }
  if (parsed.data.miner_id !== expectedMinerId) {
    throw new MinerAdapterError(
      "WRONG_MINER",
      "Telegraph returned evidence from a different Miner.",
    );
  }
  return parsed.data;
}

export function parseTransactionHash(value: string): string {
  const parsed = transactionHashSchema.safeParse(value);
  if (!parsed.success) {
    throw new MinerAdapterError(
      "WRONG_TRANSACTION",
      "The Miner returned an invalid transaction hash.",
    );
  }
  return parsed.data;
}

export function requireExpectedHash(actual: string, expected: string): string {
  const normalizedActual = parseTransactionHash(actual);
  const normalizedExpected = parseTransactionHash(expected);
  if (normalizedActual !== normalizedExpected) {
    throw new MinerAdapterError(
      "WRONG_TRANSACTION",
      "The Miner returned evidence for a different transaction.",
    );
  }
  return normalizedActual;
}

export function requireFreshTimestamp(input: {
  value: string;
  nowMs: number;
  maxAgeMs: number;
}): string {
  const timestampMs = Date.parse(input.value);
  const futureSkewMs = 5 * 60 * 1_000;
  if (
    !Number.isFinite(timestampMs) ||
    timestampMs > input.nowMs + futureSkewMs ||
    input.nowMs - timestampMs > input.maxAgeMs
  ) {
    throw new MinerAdapterError(
      "STALE_EVIDENCE",
      "The Miner evidence is stale or has an invalid timestamp.",
    );
  }
  return new Date(timestampMs).toISOString();
}

export function requirePositiveDecimalString(value: string): string {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    throw new MinerAdapterError(
      "INVALID_MINER_RESULT",
      "The Miner rate is not a plain decimal string.",
    );
  }
  const decimal = new Decimal(value);
  if (!decimal.isFinite() || !decimal.isPositive()) {
    throw new MinerAdapterError(
      "INVALID_MINER_RESULT",
      "The Miner rate must be positive.",
    );
  }
  return decimal.toFixed();
}

export function requireMinimumConfidence(
  value: number,
  minimum = 0.8,
): string {
  if (!Number.isFinite(value) || value < minimum || value > 1) {
    throw new MinerAdapterError(
      "INSUFFICIENT_EVIDENCE",
      "The Miner confidence is below the accepted threshold.",
    );
  }
  return value.toString();
}

export function normalizeMinerAddress(value: string): string {
  try {
    return normalizeAddress(value);
  } catch {
    throw new MinerAdapterError(
      "INVALID_MINER_RESULT",
      "The Miner returned an invalid EVM address.",
    );
  }
}

export function requireIntegerString(value: string): string {
  if (!/^(?:0|[1-9]\d*)$/.test(value)) {
    throw new MinerAdapterError(
      "INVALID_MINER_RESULT",
      "The Miner returned a non-integer token amount.",
    );
  }
  return value;
}
