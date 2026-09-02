import { z } from "zod";
import {
  MinerAdapterError,
  normalizeMinerAddress,
  parseEngineDirectAskEnvelope,
  requireExpectedHash,
  requireFreshTimestamp,
  requireIntegerString,
} from "@/lib/telegraph/miners/common";
import type {
  NormalizedTokenTransfer,
  TransactionEvidence,
} from "@/lib/telegraph/miners/types";

const erc20TransferSchema = z.object({
  kind: z.literal("erc20"),
  token: z.string(),
  from: z.string(),
  to: z.string(),
  amount: z.string(),
  logIndex: z.number().int().nonnegative(),
});

const resultSchema = z.object({
  intent: z.literal("ONCHAIN_TX_LOOKUP"),
  chainId: z.number().int(),
  txHash: z.string(),
  exists: z.boolean(),
  lifecycle: z.enum(["not_found", "pending", "mined"]),
  status: z.enum(["not_found", "pending", "success", "reverted"]).nullable(),
  blockNumber: z.number().int().nonnegative().nullable(),
  from: z.string().nullable(),
  to: z.string().nullable(),
  transfers: z.array(z.unknown()),
  observedAt: z.iso.datetime(),
  evidenceScope: z.object({
    receipt: z.boolean(),
    logs: z.boolean(),
    erc20Transfers: z.boolean(),
  }),
});

function normalizeErc20Transfers(values: unknown[]): NormalizedTokenTransfer[] {
  return values.flatMap((value) => {
    if (
      typeof value !== "object" ||
      value === null ||
      !("kind" in value) ||
      value.kind !== "erc20"
    ) {
      return [];
    }
    const parsed = erc20TransferSchema.safeParse(value);
    if (!parsed.success) {
      throw new MinerAdapterError(
        "INVALID_MINER_RESULT",
        "INTERLOCK returned a malformed ERC-20 transfer.",
      );
    }
    return [
      {
        token: normalizeMinerAddress(parsed.data.token),
        from: normalizeMinerAddress(parsed.data.from),
        to: normalizeMinerAddress(parsed.data.to),
        amountUnits: requireIntegerString(parsed.data.amount),
        logIndex: parsed.data.logIndex,
      },
    ];
  });
}

export function parseInterlockTransaction(input: {
  body: unknown;
  expectedMinerId: string;
  expectedTxHash: string;
  nowMs: number;
  maxAgeMs: number;
}): TransactionEvidence {
  const envelope = parseEngineDirectAskEnvelope(
    input.body,
    input.expectedMinerId,
  );
  const parsed = resultSchema.safeParse(envelope.result);
  if (!parsed.success) {
    throw new MinerAdapterError(
      "INVALID_MINER_RESULT",
      "INTERLOCK returned invalid transaction evidence.",
    );
  }
  if (parsed.data.chainId !== 84_532) {
    throw new MinerAdapterError(
      "WRONG_CHAIN",
      "INTERLOCK returned evidence from a different chain.",
    );
  }
  const txHash = requireExpectedHash(
    parsed.data.txHash,
    input.expectedTxHash,
  );
  const observedAt = requireFreshTimestamp({
    value: parsed.data.observedAt,
    nowMs: input.nowMs,
    maxAgeMs: input.maxAgeMs,
  });
  const mined = parsed.data.lifecycle === "mined";
  const semanticsValid =
    (mined &&
      parsed.data.exists &&
      (parsed.data.status === "success" || parsed.data.status === "reverted") &&
      parsed.data.blockNumber !== null &&
      parsed.data.from !== null &&
      parsed.data.evidenceScope.receipt &&
      parsed.data.evidenceScope.logs &&
      parsed.data.evidenceScope.erc20Transfers) ||
    (parsed.data.lifecycle === "pending" &&
      parsed.data.exists &&
      parsed.data.status === "pending") ||
    (parsed.data.lifecycle === "not_found" &&
      !parsed.data.exists &&
      parsed.data.status === "not_found");
  if (!semanticsValid) {
    throw new MinerAdapterError(
      "INSUFFICIENT_EVIDENCE",
      "INTERLOCK lifecycle and receipt evidence are inconsistent.",
    );
  }

  return {
    chainId: 84_532,
    txHash,
    exists: parsed.data.exists,
    lifecycle: parsed.data.lifecycle,
    status: parsed.data.status as TransactionEvidence["status"],
    blockNumber:
      parsed.data.blockNumber === null
        ? null
        : parsed.data.blockNumber.toString(),
    sender: parsed.data.from ? normalizeMinerAddress(parsed.data.from) : null,
    recipient: parsed.data.to ? normalizeMinerAddress(parsed.data.to) : null,
    transfers: normalizeErc20Transfers(parsed.data.transfers),
    observedAt,
    source: "INTERLOCK receipt-derived Base Sepolia facts",
    evidenceScope: parsed.data.evidenceScope,
    minerId: envelope.miner_id,
    minerName: envelope.miner_name,
  };
}
