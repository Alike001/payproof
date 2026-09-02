import { getAddress } from "viem";
import type {
  NormalizedTokenTransfer,
  TransactionEvidence,
} from "@/lib/telegraph/miners/types";
import {
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_USDC_ADDRESS,
} from "@/lib/telegraph/constants";

export type PaymentMismatchCode =
  | "WRONG_CHAIN"
  | "WRONG_TRANSACTION_HASH"
  | "TRANSACTION_REVERTED"
  | "USDC_TRANSFER_NOT_FOUND"
  | "WRONG_TOKEN"
  | "WRONG_RECIPIENT"
  | "WRONG_AMOUNT";

export type PaymentUnavailableCode =
  | "TRANSACTION_NOT_FOUND"
  | "TRANSACTION_PENDING";

export type ExpectedPaymentEvidence = {
  chainId: typeof BASE_SEPOLIA_CHAIN_ID;
  txHash: string;
  token: string;
  recipient: string;
  amountUnits: string;
};

export type ObservedPaymentEvidence = {
  chainId: number;
  txHash: string;
  status: TransactionEvidence["status"];
  token: string | null;
  recipient: string | null;
  amountUnits: string | null;
};

export type PaymentVerificationDecision =
  | {
      outcome: "verified";
      matchedTransfer: NormalizedTokenTransfer;
      observed: ObservedPaymentEvidence;
      evidence: TransactionEvidence;
    }
  | {
      outcome: "mismatch";
      code: PaymentMismatchCode;
      observed: ObservedPaymentEvidence;
      evidence: TransactionEvidence;
    }
  | {
      outcome: "unavailable";
      code: PaymentUnavailableCode;
      observed: ObservedPaymentEvidence;
      evidence: TransactionEvidence;
    };

export class PaymentVerifierError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentVerifierError";
  }
}

function normalizedExpected(
  expected: ExpectedPaymentEvidence,
): ExpectedPaymentEvidence {
  if (!/^0x[0-9a-fA-F]{64}$/.test(expected.txHash)) {
    throw new PaymentVerifierError("Expected transaction hash is invalid.");
  }
  if (!/^[1-9]\d*$/.test(expected.amountUnits)) {
    throw new PaymentVerifierError("Expected payment amount is invalid.");
  }
  return {
    chainId: BASE_SEPOLIA_CHAIN_ID,
    txHash: expected.txHash.toLowerCase(),
    token: getAddress(expected.token),
    recipient: getAddress(expected.recipient),
    amountUnits: BigInt(expected.amountUnits).toString(),
  };
}

function observed(
  evidence: TransactionEvidence,
  transfer: NormalizedTokenTransfer | null = null,
): ObservedPaymentEvidence {
  return {
    chainId: evidence.chainId,
    txHash: evidence.txHash.toLowerCase(),
    status: evidence.status,
    token: transfer?.token ?? null,
    recipient: transfer?.to ?? null,
    amountUnits: transfer?.amountUnits ?? null,
  };
}

function mismatch(
  code: PaymentMismatchCode,
  evidence: TransactionEvidence,
  transfer: NormalizedTokenTransfer | null = null,
): PaymentVerificationDecision {
  return { outcome: "mismatch", code, observed: observed(evidence, transfer), evidence };
}

export function verifyInvoicePayment(input: {
  expected: ExpectedPaymentEvidence;
  evidence: TransactionEvidence;
}): PaymentVerificationDecision {
  const expected = normalizedExpected(input.expected);
  const evidence = input.evidence;

  if (evidence.chainId !== expected.chainId) {
    return mismatch("WRONG_CHAIN", evidence);
  }
  if (evidence.txHash.toLowerCase() !== expected.txHash) {
    return mismatch("WRONG_TRANSACTION_HASH", evidence);
  }
  if (!evidence.exists || evidence.lifecycle === "not_found") {
    return {
      outcome: "unavailable",
      code: "TRANSACTION_NOT_FOUND",
      observed: observed(evidence),
      evidence,
    };
  }
  if (evidence.lifecycle === "pending" || evidence.status === "pending") {
    return {
      outcome: "unavailable",
      code: "TRANSACTION_PENDING",
      observed: observed(evidence),
      evidence,
    };
  }
  if (
    evidence.lifecycle !== "mined" ||
    !evidence.evidenceScope.receipt ||
    !evidence.evidenceScope.logs ||
    !evidence.evidenceScope.erc20Transfers
  ) {
    throw new PaymentVerifierError("Mined transaction evidence is incomplete.");
  }
  if (evidence.status === "reverted") {
    return mismatch("TRANSACTION_REVERTED", evidence);
  }
  if (evidence.status !== "success") {
    throw new PaymentVerifierError("Transaction status is inconsistent.");
  }

  if (evidence.transfers.length === 0) {
    return mismatch("USDC_TRANSFER_NOT_FOUND", evidence);
  }
  const tokenTransfers = evidence.transfers.filter(
    (transfer) => getAddress(transfer.token) === expected.token,
  );
  if (tokenTransfers.length === 0) {
    return mismatch("WRONG_TOKEN", evidence, evidence.transfers[0]);
  }
  const recipientTransfers = tokenTransfers.filter(
    (transfer) => getAddress(transfer.to) === expected.recipient,
  );
  if (recipientTransfers.length === 0) {
    return mismatch("WRONG_RECIPIENT", evidence, tokenTransfers[0]);
  }
  const matchedTransfer = recipientTransfers.find(
    (transfer) => BigInt(transfer.amountUnits) === BigInt(expected.amountUnits),
  );
  if (!matchedTransfer) {
    return mismatch("WRONG_AMOUNT", evidence, recipientTransfers[0]);
  }

  return {
    outcome: "verified",
    matchedTransfer,
    observed: observed(evidence, matchedTransfer),
    evidence,
  };
}

export function officialExpectedPayment(input: {
  txHash: string;
  recipient: string;
  amountUnits: string;
}): ExpectedPaymentEvidence {
  return {
    chainId: BASE_SEPOLIA_CHAIN_ID,
    txHash: input.txHash,
    token: BASE_SEPOLIA_USDC_ADDRESS,
    recipient: input.recipient,
    amountUnits: input.amountUnits,
  };
}
