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

const transferSchema = z.object({
  token: z.string(),
  from: z.string(),
  to: z.string(),
  amount: z.string(),
  logIndex: z.number().int().nonnegative(),
});

const resultSchema = z.object({
  source: z.string().min(1).max(200),
  confidence: z.number().min(0).max(1),
  chain: z.string(),
  chainId: z.number().int(),
  txHash: z.string(),
  status: z.enum(["not_found", "pending", "success", "reverted"]),
  blockNumber: z.string().nullable().optional(),
  from: z.string().nullable().optional(),
  to: z.string().nullable().optional(),
  erc20Transfers: z.array(transferSchema),
});

function normalizeTransfer(
  transfer: z.infer<typeof transferSchema>,
): NormalizedTokenTransfer {
  return {
    token: normalizeMinerAddress(transfer.token),
    from: normalizeMinerAddress(transfer.from),
    to: normalizeMinerAddress(transfer.to),
    amountUnits: requireIntegerString(transfer.amount),
    logIndex: transfer.logIndex,
  };
}
export function parseTruvianTransaction(input: {
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
  const observedAt = requireFreshTimestamp({
    value: envelope.timestamp,
    nowMs: input.nowMs,
    maxAgeMs: input.maxAgeMs,
  });
  const parsed = resultSchema.safeParse(envelope.result);
  if (!parsed.success) {
    throw new MinerAdapterError(
      "INVALID_MINER_RESULT",
      "Truvian returned invalid transaction evidence.",
    );
  }
  if (parsed.data.chainId !== 84_532 || parsed.data.chain !== "base-sepolia") {
    throw new MinerAdapterError(
      "WRONG_CHAIN",
      "Truvian returned evidence from a different chain.",
    );
  }
  const txHash = requireExpectedHash(
    parsed.data.txHash,
    input.expectedTxHash,
  );
  const mined = parsed.data.status === "success" || parsed.data.status === "reverted";
  if (mined && (!parsed.data.blockNumber || !parsed.data.from)) {
    throw new MinerAdapterError(
      "INSUFFICIENT_EVIDENCE",
      "Truvian mined evidence is missing receipt facts.",
    );
  }

  return {
    chainId: 84_532,
    txHash,
    exists: parsed.data.status !== "not_found",
    lifecycle: mined
      ? "mined"
      : parsed.data.status === "pending"
        ? "pending"
        : "not_found",
    status: parsed.data.status,
    blockNumber: parsed.data.blockNumber ?? null,
    sender: parsed.data.from ? normalizeMinerAddress(parsed.data.from) : null,
    recipient: parsed.data.to ? normalizeMinerAddress(parsed.data.to) : null,
    transfers: parsed.data.erc20Transfers.map(normalizeTransfer),
    observedAt,
    source: parsed.data.source,
    evidenceScope: { receipt: mined, logs: true, erc20Transfers: true },
    minerId: envelope.miner_id,
    minerName: envelope.miner_name,
  };
}
