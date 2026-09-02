import "server-only";
import { getServerEnv } from "@/lib/env.server";
import { safeErrorMessage } from "@/lib/telegraph/redaction";
import { askTelegraphMiner } from "@/lib/telegraph/x402-client.server";
import { markTelegraphCallInvalid } from "@/lib/telegraph/store.server";
import { MinerAdapterError } from "@/lib/telegraph/miners/common";
import { parseFxRateMirror } from "@/lib/telegraph/miners/fx-rate-mirror";
import { parsePreflightFx } from "@/lib/telegraph/miners/preflight-fx";
import { parseTruvianTransaction } from "@/lib/telegraph/miners/truvian";
import { parseInterlockTransaction } from "@/lib/telegraph/miners/interlock";
import { runPrimaryBackup } from "@/lib/telegraph/miners/orchestration";
import {
  fxRateMirrorRequest,
  interlockTransactionRequest,
  preflightFxRequest,
  truvianTransactionRequest,
} from "@/lib/telegraph/miners/requests";
import type {
  FxCurrency,
  FxEvidence,
  TransactionEvidence,
} from "@/lib/telegraph/miners/types";

const FX_RATE_MIRROR_ID = "20260827";
const PREFLIGHT_ID = "20260828";
const TRUVIAN_ID = "8453";
const INTERLOCK_ID = "9007";
const TRANSACTION_EVIDENCE_MAX_AGE_MS = 5 * 60 * 1_000;

async function parsePaidResult<T extends object>(input: {
  call: () => ReturnType<typeof askTelegraphMiner>;
  parse: (body: unknown) => T;
}): Promise<T & { telegraphCallId: string }> {
  const response = await input.call();
  try {
    return {
      ...input.parse(response.body),
      telegraphCallId: response.callId,
    };
  } catch (error) {
    if (error instanceof MinerAdapterError) {
      await markTelegraphCallInvalid({
        callId: response.callId,
        errorCode: error.code,
        errorMessage: safeErrorMessage(error),
      });
    }
    throw error;
  }
}

export async function requestFxEvidence(input: {
  currency: FxCurrency;
  actionKey: string;
  invoiceId: string;
  quoteId?: string | null;
  nowMs?: number;
}) {
  const environment = getServerEnv();
  const nowMs = input.nowMs ?? Date.now();
  const maxAgeMs = environment.FX_MAX_SOURCE_AGE_MINUTES * 60 * 1_000;
  const primaryMinerId =
    environment.TELEGRAPH_FX_PRIMARY_MINER_ID ?? FX_RATE_MIRROR_ID;
  const backupMinerId =
    environment.TELEGRAPH_FX_BACKUP_MINER_ID ?? PREFLIGHT_ID;

  const attempt = (
    role: "primary" | "backup",
    minerId: string,
  ): Promise<FxEvidence & { telegraphCallId: string }> => {
    if (minerId !== FX_RATE_MIRROR_ID && minerId !== PREFLIGHT_ID) {
      return Promise.reject(
        new Error(`No validated FX adapter is configured for Miner ${minerId}.`),
      );
    }
    const isMirror = minerId === FX_RATE_MIRROR_ID;
    return parsePaidResult({
      call: () =>
        askTelegraphMiner({
          actionKey: input.actionKey,
          invoiceId: input.invoiceId,
          quoteId: input.quoteId,
          intent: "CURRENCY_EXCHANGE",
          minerId,
          minerName: isMirror
            ? "FX Rate Mirror"
            : "PREFLIGHT Infrastructure Signals",
          attemptRole: role,
          requestSanitized: { currency: input.currency, quoteCurrency: "USD" },
          envelope: isMirror
            ? fxRateMirrorRequest(input.currency)
            : preflightFxRequest(input.currency),
        }),
      parse: (body) =>
        isMirror
          ? parseFxRateMirror({
              body,
              expectedMinerId: minerId,
              currency: input.currency,
              nowMs,
              maxAgeMs,
            })
          : parsePreflightFx({
              body,
              expectedMinerId: minerId,
              currency: input.currency,
              nowMs,
              maxAgeMs,
            }),
    });
  };

  const result = await runPrimaryBackup<
    FxEvidence & { telegraphCallId: string }
  >({
    primary: () => attempt("primary", primaryMinerId),
    backup: () => attempt("backup", backupMinerId),
  });
  return result;
}

export async function requestTransactionEvidence(input: {
  txHash: string;
  actionKey: string;
  invoiceId: string;
  paymentId: string;
  nowMs?: number;
}) {
  const environment = getServerEnv();
  const nowMs = input.nowMs ?? Date.now();
  const primaryMinerId =
    environment.TELEGRAPH_TX_PRIMARY_MINER_ID ?? TRUVIAN_ID;
  const backupMinerId =
    environment.TELEGRAPH_TX_BACKUP_MINER_ID ?? INTERLOCK_ID;

  const attempt = (
    role: "primary" | "backup",
    minerId: string,
  ): Promise<TransactionEvidence & { telegraphCallId: string }> => {
    if (minerId !== TRUVIAN_ID && minerId !== INTERLOCK_ID) {
      return Promise.reject(
        new Error(
          `No validated transaction adapter is configured for Miner ${minerId}.`,
        ),
      );
    }
    const isTruvian = minerId === TRUVIAN_ID;
    return parsePaidResult({
      call: () =>
        askTelegraphMiner({
          actionKey: input.actionKey,
          invoiceId: input.invoiceId,
          paymentId: input.paymentId,
          intent: "ONCHAIN_TX_LOOKUP",
          minerId,
          minerName: isTruvian
            ? "Truvian Exact On-Chain Truth Engine"
            : "INTERLOCK On-Chain Transaction Lookup",
          attemptRole: role,
          requestSanitized: { chainId: 84_532, txHash: input.txHash },
          envelope: isTruvian
            ? truvianTransactionRequest(input.txHash)
            : interlockTransactionRequest(input.txHash),
        }),
      parse: (body) =>
        isTruvian
          ? parseTruvianTransaction({
              body,
              expectedMinerId: minerId,
              expectedTxHash: input.txHash,
              nowMs,
              maxAgeMs: TRANSACTION_EVIDENCE_MAX_AGE_MS,
            })
          : parseInterlockTransaction({
              body,
              expectedMinerId: minerId,
              expectedTxHash: input.txHash,
              nowMs,
              maxAgeMs: TRANSACTION_EVIDENCE_MAX_AGE_MS,
            }),
    });
  };

  const result = await runPrimaryBackup<
    TransactionEvidence & { telegraphCallId: string }
  >({
    primary: () => attempt("primary", primaryMinerId),
    backup: () => attempt("backup", backupMinerId),
  });
  return result;
}
