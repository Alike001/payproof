export type PaymentAttemptState =
  | "submitted"
  | "unavailable"
  | "mismatch"
  | "verified";

export type SubmitPaymentInput = {
  quoteId: string;
  txHash: string;
  submittedByWallet: string;
};

export type PublicPaymentAttemptDto = {
  paymentId: string;
  quoteId: string;
  txHash: string;
  submittedByWallet: string;
  state: PaymentAttemptState;
  submittedAt: string;
};

export type PaymentSubmissionResult =
  | {
      ok: true;
      payment: PublicPaymentAttemptDto;
      reused: boolean;
    }
  | {
      ok: false;
      code:
        | "INVALID_PAYMENT"
        | "INVOICE_NOT_FOUND"
        | "INVOICE_NOT_PAYABLE"
        | "QUOTE_NOT_FOUND"
        | "QUOTE_EXPIRED"
        | "TRANSACTION_ALREADY_USED"
        | "PAYMENT_IN_PROGRESS"
        | "PAYMENT_RATE_LIMITED"
        | "PAYMENT_UNAVAILABLE";
      message: string;
      retryable: boolean;
      retryAfterSeconds?: number;
    };

export type PublicExpectedPayment = {
  chainId: 84_532;
  network: "Base Sepolia";
  token: "USDC";
  tokenAddress: string;
  recipientAddress: string;
  usdcAmountUnits: string;
  usdcAmountFormatted: string;
};

export type PublicObservedPayment = {
  chainId: string | null;
  tokenAddress: string | null;
  recipientAddress: string | null;
  amountUnits: string | null;
  amountFormatted: string | null;
  transactionStatus: string | null;
};

export type PublicVerificationEvidence = {
  minerId: string;
  minerName: string;
  attemptRole: "primary" | "backup";
  observedAt: string;
  checkedAt: string;
  source: string;
};

export type PublicPaymentResultDto = {
  paymentId: string;
  quoteId: string;
  state: PaymentAttemptState;
  code:
    | "TRANSACTION_NOT_FOUND"
    | "TRANSACTION_PENDING"
    | "TRANSACTION_REVERTED"
    | "WRONG_CHAIN"
    | "WRONG_TRANSACTION_HASH"
    | "USDC_TRANSFER_NOT_FOUND"
    | "WRONG_TOKEN"
    | "WRONG_RECIPIENT"
    | "WRONG_AMOUNT"
    | "INVOICE_ALREADY_VERIFIED"
    | "INVOICE_NOT_PAYABLE"
    | "VERIFICATION_UNAVAILABLE"
    | null;
  message: string;
  retryable: boolean;
  retryAfterSeconds?: number;
  transaction: {
    hash: string;
    explorerUrl: string;
    submittedByWallet: string;
    submittedAt: string;
  };
  expected: PublicExpectedPayment;
  observed: PublicObservedPayment;
  evidence: PublicVerificationEvidence | null;
  receipt: {
    payerAddress: string;
    verifiedAt: string;
  } | null;
};

export type PaymentVerificationResult =
  | { ok: true; result: PublicPaymentResultDto; saved: boolean }
  | {
      ok: false;
      code:
        | "INVOICE_NOT_FOUND"
        | "PAYMENT_NOT_FOUND"
        | "INVOICE_NOT_PAYABLE"
        | "VERIFICATION_RATE_LIMITED"
        | "VERIFICATION_UNAVAILABLE";
      message: string;
      retryable: boolean;
      retryAfterSeconds?: number;
    };
