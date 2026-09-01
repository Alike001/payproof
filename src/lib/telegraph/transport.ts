import { z } from "zod";
import { validateX402Challenge } from "@/lib/telegraph/challenge-policy";
import { redactForPersistence, safeErrorMessage } from "@/lib/telegraph/redaction";
import { fetchWithTimeout } from "@/lib/telegraph/request";
import type {
  DirectAskEnvelope,
  TelegraphAttemptRole,
  TelegraphCallStatus,
  TelegraphIntent,
  X402PaymentRequired,
  X402SettlementProof,
} from "@/lib/telegraph/types";

const settlementSchema = z.strictObject({
  success: z.boolean(),
  transaction: z.string().min(1),
  network: z.string(),
  amount: z.string().regex(/^[0-9]+$/).optional(),
  payer: z.string().optional(),
  errorReason: z.string().optional(),
});

export class TelegraphTransportError extends Error {
  constructor(
    public readonly code:
      | "PAYMENT_REQUIRED_MISSING"
      | "BUDGET_EXHAUSTED"
      | "DUPLICATE_ACTION"
      | "PAYMENT_CREATION_FAILED"
      | "PAID_REQUEST_FAILED"
      | "SETTLEMENT_PROOF_MISSING"
      | "SETTLEMENT_FAILED",
    message: string,
    public readonly callId?: string,
  ) {
    super(message);
    this.name = "TelegraphTransportError";
  }
}
export type TelegraphSpendReservation = {
  callId: string;
  reserved: boolean;
  callStatus: string;
};

export type TelegraphSpendStore = {
  reserve(input: {
    actionKey: string;
    invoiceId: string | null;
    quoteId: string | null;
    paymentId: string | null;
    intent: TelegraphIntent;
    minerId: string;
    minerName: string;
    attemptRole: TelegraphAttemptRole;
    requestSanitized: unknown;
    network: string;
    amountUnits: bigint;
    dailyBudgetUnits: bigint;
  }): Promise<TelegraphSpendReservation>;
  finalize(input: {
    callId: string;
    status: TelegraphCallStatus;
    responseSanitized: unknown | null;
    errorCode: string | null;
    errorMessage: string | null;
    settlement: X402SettlementProof | null;
    latencyMs: number;
  }): Promise<void>;
};

export type X402Codec = {
  parseChallenge(headers: Headers, body: unknown): unknown;
  createPaymentHeaders(challenge: X402PaymentRequired): Promise<Record<string, string>>;
  parseSettlement(headers: Headers): unknown | null;
};

export type SpendSafeDirectAskInput = {
  requestUrl: URL;
  envelope: DirectAskEnvelope;
  actionKey: string;
  invoiceId?: string | null;
  quoteId?: string | null;
  paymentId?: string | null;
  intent: TelegraphIntent;
  minerId: string;
  minerName: string;
  attemptRole: TelegraphAttemptRole;
  requestSanitized: unknown;
  allowedOrigin: string;
  maxAmountUnits: bigint;
  dailyBudgetUnits: bigint;
  timeoutMs: number;
};

export type SpendSafeDirectAskResult = {
  callId: string;
  body: unknown;
  status: number;
  settlement: X402SettlementProof;
  latencyMs: number;
};

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Telegraph returned a non-JSON response." };
  }
}

function validateSettlement(
  value: unknown,
  expectedNetwork: string,
  expectedAmount: bigint,
): X402SettlementProof {
  const parsed = settlementSchema.safeParse(value);
  if (!parsed.success) {
    throw new TelegraphTransportError(
      "SETTLEMENT_PROOF_MISSING",
      "Telegraph did not return a valid x402 settlement proof.",
    );
  }
  if (!parsed.data.success || parsed.data.network !== expectedNetwork) {
    throw new TelegraphTransportError(
      "SETTLEMENT_FAILED",
      "The x402 settlement was not successful on Base Sepolia.",
    );
  }
  if (parsed.data.amount && BigInt(parsed.data.amount) !== expectedAmount) {
    throw new TelegraphTransportError(
      "SETTLEMENT_FAILED",
      "The settled x402 amount does not match the approved challenge.",
    );
  }
  return parsed.data;
}

export async function executeSpendSafeDirectAsk(
  input: SpendSafeDirectAskInput,
  dependencies: {
    fetcher: typeof fetch;
    codec: X402Codec;
    store: TelegraphSpendStore;
    now?: () => number;
  },
): Promise<SpendSafeDirectAskResult> {
  const startedAt = (dependencies.now ?? Date.now)();
  const body = JSON.stringify(input.envelope);
  const requestInit: RequestInit = {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body,
    cache: "no-store",
  };

  const unpaidResponse = await fetchWithTimeout(
    dependencies.fetcher,
    input.requestUrl,
    requestInit,
    input.timeoutMs,
  );
  const unpaidBody = await readJson(unpaidResponse);
  if (unpaidResponse.status !== 402) {
    throw new TelegraphTransportError(
      "PAYMENT_REQUIRED_MISSING",
      "Telegraph did not return the required unpaid x402 challenge.",
    );
  }

  const challenge = validateX402Challenge({
    challenge: dependencies.codec.parseChallenge(unpaidResponse.headers, unpaidBody),
    requestUrl: input.requestUrl.toString(),
    allowedOrigin: input.allowedOrigin,
    maxAmountUnits: input.maxAmountUnits,
  });

  const reservation = await dependencies.store.reserve({
    actionKey: input.actionKey,
    invoiceId: input.invoiceId ?? null,
    quoteId: input.quoteId ?? null,
    paymentId: input.paymentId ?? null,
    intent: input.intent,
    minerId: input.minerId,
    minerName: input.minerName,
    attemptRole: input.attemptRole,
    requestSanitized: redactForPersistence(input.requestSanitized),
    network: challenge.requirement.network,
    amountUnits: challenge.amountUnits,
    dailyBudgetUnits: input.dailyBudgetUnits,
  });

  if (!reservation.reserved) {
    if (reservation.callStatus === "rejected_budget") {
      throw new TelegraphTransportError(
        "BUDGET_EXHAUSTED",
        "The daily Telegraph test-USDC budget is exhausted.",
        reservation.callId,
      );
    }
    throw new TelegraphTransportError(
      "DUPLICATE_ACTION",
      "This Telegraph action and attempt role has already been reserved.",
      reservation.callId,
    );
  }

  let paymentCreated = false;
  try {
    let paymentHeaders: Record<string, string>;
    try {
      paymentHeaders = await dependencies.codec.createPaymentHeaders(
        challenge.paymentRequired,
      );
      paymentCreated = true;
    } catch (error) {
      throw new TelegraphTransportError(
        "PAYMENT_CREATION_FAILED",
        safeErrorMessage(error),
        reservation.callId,
      );
    }

    const paidResponse = await fetchWithTimeout(
      dependencies.fetcher,
      input.requestUrl,
      {
        ...requestInit,
        headers: { ...requestInit.headers, ...paymentHeaders },
      },
      input.timeoutMs,
    );
    const paidBody = await readJson(paidResponse);
    if (!paidResponse.ok) {
      throw new TelegraphTransportError(
        "PAID_REQUEST_FAILED",
        `Telegraph rejected the paid request with status ${paidResponse.status}.`,
        reservation.callId,
      );
    }

    const settlement = validateSettlement(
      dependencies.codec.parseSettlement(paidResponse.headers),
      challenge.requirement.network,
      challenge.amountUnits,
    );
    const latencyMs = Math.max(0, (dependencies.now ?? Date.now)() - startedAt);
    await dependencies.store.finalize({
      callId: reservation.callId,
      status: "paid_success",
      responseSanitized: redactForPersistence(paidBody),
      errorCode: null,
      errorMessage: null,
      settlement,
      latencyMs,
    });
    return {
      callId: reservation.callId,
      body: paidBody,
      status: paidResponse.status,
      settlement,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Math.max(0, (dependencies.now ?? Date.now)() - startedAt);
    await dependencies.store.finalize({
      callId: reservation.callId,
      status: paymentCreated ? "paid_error" : "unpaid_error",
      responseSanitized: null,
      errorCode:
        error instanceof TelegraphTransportError ? error.code : "TRANSPORT_ERROR",
      errorMessage: safeErrorMessage(error),
      settlement: null,
      latencyMs,
    });
    throw error;
  }
}
