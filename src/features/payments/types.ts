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
