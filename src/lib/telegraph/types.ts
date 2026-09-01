export type TelegraphIntent = "CURRENCY_EXCHANGE" | "ONCHAIN_TX_LOOKUP";
export type TelegraphAttemptRole = "primary" | "backup";

export type DirectAskEnvelope = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  endpoint: `/${string}`;
  payload: Record<string, unknown>;
};

export type X402PaymentRequirement = {
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra: Record<string, unknown>;
};

export type X402PaymentRequired = {
  x402Version: number;
  resource: {
    url: string;
    description?: string;
    mimeType?: string;
  };
  accepts: X402PaymentRequirement[];
  error?: string;
  extensions?: Record<string, unknown>;
};

export type X402SettlementProof = {
  success: boolean;
  transaction: string;
  network: string;
  amount?: string;
  payer?: string;
  errorReason?: string;
};

export type TelegraphCallStatus =
  | "started"
  | "rejected_budget"
  | "paid_success"
  | "paid_invalid"
  | "paid_error"
  | "unpaid_error";
