import type { SupportedCurrency } from "@/lib/money";

export type FxCurrency = Exclude<SupportedCurrency, "USD">;

export type FxEvidence = {
  currency: FxCurrency;
  quoteCurrency: "USD";
  rateToUsd: string;
  observedAt: string;
  sourceAsOf: string;
  source: string;
  confidence: string;
  minerId: string;
  minerName: string;
};
export type NormalizedTokenTransfer = {
  token: string;
  from: string;
  to: string;
  amountUnits: string;
  logIndex: number;
};

export type TransactionLifecycle = "not_found" | "pending" | "mined";
export type TransactionStatus =
  | "not_found"
  | "pending"
  | "success"
  | "reverted";

export type TransactionEvidence = {
  chainId: 84_532;
  txHash: string;
  exists: boolean;
  lifecycle: TransactionLifecycle;
  status: TransactionStatus;
  blockNumber: string | null;
  sender: string | null;
  recipient: string | null;
  transfers: NormalizedTokenTransfer[];
  observedAt: string;
  source: string;
  evidenceScope: {
    receipt: boolean;
    logs: boolean;
    erc20Transfers: boolean;
  };
  minerId: string;
  minerName: string;
};
