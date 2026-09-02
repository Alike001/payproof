"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit/components";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { requestQuote } from "@/features/quotes/quote-client-boundary";
import type {
  PublicQuoteDto,
  QuoteRequestResult,
} from "@/features/quotes/types";
import { savePaymentAttempt } from "@/features/payments/payment-client-boundary";
import { requestPaymentVerification } from "@/features/payments/verification-client-boundary";
import type {
  PaymentSubmissionResult,
  PaymentVerificationResult,
  PublicPaymentResultDto,
  SubmitPaymentInput,
} from "@/features/payments/types";
import {
  buildUsdcTransferRequest,
  type UsdcTransferRequest,
} from "@/features/payments/usdc-abi";
import type { PublicInvoiceDto } from "@/features/invoices/types";
import {
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_USDC_ADDRESS,
} from "@/lib/telegraph/constants";
import styles from "./public-invoice-payment.module.css";

function shortAddress(addr: string) {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatCountdown(secondsRemaining: number): string {
  if (secondsRemaining <= 0) return "00:00";
  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function quoteRequiresReview(
  previous: PublicQuoteDto,
  next: PublicQuoteDto,
): boolean {
  return (
    previous.quoteId !== next.quoteId ||
    previous.rateToUsd !== next.rateToUsd ||
    previous.usdcAmountUnits !== next.usdcAmountUnits ||
    previous.expiresAt !== next.expiresAt
  );
}

function walletTransactionError(error: unknown): string {
  if (
    typeof error === "object" &&
    error &&
    "code" in error &&
    error.code === 4001
  ) {
    return "Transaction cancelled in wallet. No test USDC was sent.";
  }
  if (
    error instanceof Error &&
    /reject|denied|cancel|user rejected/i.test(error.message)
  ) {
    return "Transaction cancelled in wallet. No test USDC was sent.";
  }
  if (error instanceof Error && /insufficient funds|gas/i.test(error.message)) {
    return "Your wallet needs Base Sepolia test ETH for gas and enough test USDC for this payment.";
  }
  return "The wallet did not broadcast the payment. No transaction hash was saved. Check your wallet and try again.";
}

function explorerUrl(txHash: string): string {
  return `${baseSepolia.blockExplorers.default.url.replace(/\/$/, "")}/tx/${txHash}`;
}

type ComparisonStatus = "match" | "mismatch" | "unknown";

function exactComparisonStatus(
  observed: string | null,
  expected: string,
  caseInsensitive = false,
): ComparisonStatus {
  if (observed === null) return "unknown";
  const observedValue = caseInsensitive ? observed.toLowerCase() : observed;
  const expectedValue = caseInsensitive ? expected.toLowerCase() : expected;
  return observedValue === expectedValue ? "match" : "mismatch";
}

function ComparisonStatusCell({ status }: { status: ComparisonStatus }) {
  const content =
    status === "match"
      ? "Match ✓"
      : status === "mismatch"
        ? "Mismatch ✗"
        : "Not observed —";

  return (
    <td
      className={
        status === "match"
          ? styles.cellStatusMatch
          : status === "mismatch"
            ? styles.cellStatusMismatch
            : styles.cellStatusUnknown
      }
    >
      {content}
    </td>
  );
}

type PaymentFlowStep =
  "quote" | "review" | "submitted" | "unavailable" | "mismatch" | "verified";

type BroadcastState = {
  paymentId?: string;
  quoteId: string;
  txHash: `0x${string}`;
  submittedByWallet: `0x${string}`;
  explorerUrl: string;
  saved: boolean;
  saveError: string | null;
  verificationUnavailable: boolean;
};

function blocksAnotherTransfer(
  payment: PublicPaymentResultDto | null | undefined,
) {
  return (
    payment?.state === "submitted" ||
    payment?.state === "unavailable" ||
    payment?.state === "verified" ||
    payment?.state === "mismatch"
  );
}

function broadcastFromPayment(
  payment: PublicPaymentResultDto | null | undefined,
): BroadcastState | null {
  if (!payment) return null;
  if (payment.state !== "submitted" && payment.state !== "unavailable") {
    return null;
  }
  return {
    paymentId: payment.paymentId,
    quoteId: payment.quoteId,
    txHash: payment.transaction.hash as `0x${string}`,
    submittedByWallet: payment.transaction.submittedByWallet as `0x${string}`,
    explorerUrl: payment.transaction.explorerUrl,
    saved: true,
    saveError: null,
    verificationUnavailable: payment.state === "unavailable",
  };
}

function initialStepFromPayment(
  payment: PublicPaymentResultDto | null | undefined,
): PaymentFlowStep {
  if (payment?.state === "verified") return "verified";
  if (payment?.state === "mismatch") return "mismatch";
  if (payment?.state === "unavailable") return "unavailable";
  if (payment?.state === "submitted") return "submitted";
  return "quote";
}

export function PublicInvoicePayment({
  invoice,
  initialPayment = null,
  onFetchQuote = requestQuote,
  onSavePayment = savePaymentAttempt,
  onVerifyPayment = requestPaymentVerification,
  onWriteContract,
  onVerified,
}: {
  invoice: PublicInvoiceDto;
  initialPayment?: PublicPaymentResultDto | null;
  onFetchQuote?: (publicId: string) => Promise<QuoteRequestResult>;
  onSavePayment?: (
    publicId: string,
    input: SubmitPaymentInput,
  ) => Promise<PaymentSubmissionResult>;
  onVerifyPayment?: (
    publicId: string,
    paymentId: string,
  ) => Promise<PaymentVerificationResult>;
  onWriteContract?: (request: UsdcTransferRequest) => Promise<`0x${string}`>;
  onVerified?: () => void;
}) {
  const baseId = useId();
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const initialBroadcast = broadcastFromPayment(initialPayment);

  const [quote, setQuote] = useState<PublicQuoteDto | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(
    !blocksAnotherTransfer(initialPayment) && invoice.status !== "verified",
  );
  const [quoteRefreshing, setQuoteRefreshing] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(
    initialPayment?.retryAfterSeconds ?? null,
  );

  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [step, setStep] = useState<PaymentFlowStep>(
    initialStepFromPayment(initialPayment),
  );
  const [paymentResult, setPaymentResult] =
    useState<PublicPaymentResultDto | null>(initialPayment);
  const [broadcastPaymentId, setBroadcastPaymentId] = useState<string | null>(
    initialPayment?.paymentId ?? null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  );
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [broadcast, setBroadcast] = useState<BroadcastState | null>(
    initialBroadcast,
  );
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>("");
  const [receiptFeedback, setReceiptFeedback] = useState<string | null>(null);
  const receiptFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const quoteTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMilestoneAnnouncedRef = useRef<number | null>(null);
  const initialQuoteRequestForRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (receiptFeedbackTimer.current) {
        clearTimeout(receiptFeedbackTimer.current);
      }
    },
    [],
  );

  // Fetch initial quote on mount / publicId change
  useEffect(() => {
    if (
      blocksAnotherTransfer(initialPayment) ||
      invoice.status === "verified"
    ) {
      return;
    }
    if (initialQuoteRequestForRef.current === invoice.publicId) {
      return;
    }
    initialQuoteRequestForRef.current = invoice.publicId;

    async function fetchInitialQuote() {
      try {
        const result = await onFetchQuote(invoice.publicId);
        if (result.ok) {
          setQuote(result.quote);
          const expMs = new Date(result.quote.expiresAt).getTime();
          const rem = Math.max(0, Math.floor((expMs - Date.now()) / 1000));
          setSecondsRemaining(rem);
          setStatusAnnouncement(
            `Live quote ready: ${result.quote.usdcAmountFormatted} test USDC. Valid for 15 minutes.`,
          );
        } else {
          setQuoteError(result.message);
          setStatusAnnouncement(result.message);
          if (result.retryAfterSeconds && result.retryAfterSeconds > 0) {
            setCooldownSeconds(result.retryAfterSeconds);
          }
        }
      } catch {
        setQuoteError(
          "A trustworthy quote is temporarily unavailable. Payment remains paused.",
        );
        setStatusAnnouncement(
          "A trustworthy quote is temporarily unavailable. Payment remains paused.",
        );
      } finally {
        setQuoteLoading(false);
      }
    }

    fetchInitialQuote();
  }, [initialPayment, invoice.publicId, invoice.status, onFetchQuote]);

  // Refresh quote on demand
  const handleRefreshQuote = useCallback(async () => {
    setQuoteRefreshing(true);
    setQuoteError(null);
    setPaymentError(null);

    try {
      const result = await onFetchQuote(invoice.publicId);
      if (result.ok) {
        if (quote && quoteRequiresReview(quote, result.quote)) {
          setStep("quote");
          setStatusAnnouncement(
            `Quote updated. New rate: ${result.quote.usdcAmountFormatted} test USDC. Please review the updated quote.`,
          );
        } else {
          setStatusAnnouncement(
            `Live quote ready: ${result.quote.usdcAmountFormatted} test USDC. Valid for 15 minutes.`,
          );
        }
        setQuote(result.quote);
        const expMs = new Date(result.quote.expiresAt).getTime();
        const rem = Math.max(0, Math.floor((expMs - Date.now()) / 1000));
        setSecondsRemaining(rem);
        lastMilestoneAnnouncedRef.current = null;
      } else {
        setQuoteError(result.message);
        setStatusAnnouncement(result.message);
        if (result.retryAfterSeconds && result.retryAfterSeconds > 0) {
          setCooldownSeconds(result.retryAfterSeconds);
        }
      }
    } catch {
      setQuoteError(
        "A trustworthy quote is temporarily unavailable. Payment remains paused.",
      );
      setStatusAnnouncement(
        "A trustworthy quote is temporarily unavailable. Payment remains paused.",
      );
    } finally {
      setQuoteRefreshing(false);
    }
  }, [invoice.publicId, onFetchQuote, quote]);

  // Expiry countdown timer (visual update every second; accessible milestone announcements)
  useEffect(() => {
    if (!quote) return;

    if (quoteTimerRef.current) clearInterval(quoteTimerRef.current);

    quoteTimerRef.current = setInterval(() => {
      const expMs = new Date(quote.expiresAt).getTime();
      const rem = Math.max(0, Math.floor((expMs - Date.now()) / 1000));
      setSecondsRemaining(rem);

      if (rem <= 0) {
        if (quoteTimerRef.current) clearInterval(quoteTimerRef.current);
        if (step === "review") setStep("quote");
        setStatusAnnouncement("Quote has expired. Refresh quote to continue.");
        return;
      }

      // Milestone announcements (avoid per-second live region noise)
      if (rem === 300 && lastMilestoneAnnouncedRef.current !== 300) {
        lastMilestoneAnnouncedRef.current = 300;
        setStatusAnnouncement("5 minutes remaining on current quote.");
      } else if (rem === 60 && lastMilestoneAnnouncedRef.current !== 60) {
        lastMilestoneAnnouncedRef.current = 60;
        setStatusAnnouncement("1 minute remaining on current quote.");
      } else if (rem === 30 && lastMilestoneAnnouncedRef.current !== 30) {
        lastMilestoneAnnouncedRef.current = 30;
        setStatusAnnouncement("30 seconds remaining on current quote.");
      }
    }, 1000);

    return () => {
      if (quoteTimerRef.current) clearInterval(quoteTimerRef.current);
    };
  }, [quote, step]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds === null || cooldownSeconds <= 0) return;

    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);

    cooldownTimerRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev === null || prev <= 1) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, [cooldownSeconds]);

  const isExpired = secondsRemaining <= 0;
  const isExpiringSoon = secondsRemaining > 0 && secondsRemaining <= 120;
  const isWrongNetwork = isConnected && chainId !== baseSepolia.id;

  const transferRequest = useMemo(() => {
    if (!quote || isExpired) return null;
    try {
      return buildUsdcTransferRequest({
        quote,
        recipientAddress: invoice.recipientAddress,
      });
    } catch {
      return null;
    }
  }, [quote, isExpired, invoice.recipientAddress]);

  function handleStartReview() {
    setPaymentError(null);
    if (!quote || isExpired || !transferRequest) {
      setPaymentError("A valid, current quote is required before payment.");
      return;
    }
    setStep("review");
    setStatusAnnouncement(
      `Reviewing payment: ${quote.usdcAmountFormatted} test USDC to recipient ${shortAddress(invoice.recipientAddress)} on Base Sepolia.`,
    );
  }

  async function handleSwitchNetwork() {
    setNetworkError(null);
    try {
      await switchChainAsync({ chainId: baseSepolia.id });
    } catch {
      setNetworkError(
        "Network switch was not completed. Choose Base Sepolia in your wallet and try again.",
      );
    }
  }

  async function saveBroadcast(record: BroadcastState) {
    try {
      const result = await onSavePayment(invoice.publicId, {
        quoteId: record.quoteId,
        txHash: record.txHash,
        submittedByWallet: record.submittedByWallet,
      });

      if (result.ok) {
        setBroadcast({
          ...record,
          paymentId: result.payment.paymentId,
          explorerUrl: explorerUrl(result.payment.txHash),
          saved: true,
          saveError: null,
        });
        setBroadcastPaymentId(result.payment.paymentId);
        setStatusAnnouncement(
          "Payment transaction hash saved. Telegraph verification can now check it.",
        );
        return;
      }

      setBroadcast({ ...record, saveError: result.message });
      setStatusAnnouncement(
        "The payment may have been broadcast, but its transaction hash is not yet saved. Do not pay again.",
      );
    } catch {
      setBroadcast({
        ...record,
        saveError:
          "PayProof could not save the transaction hash. Do not pay again; retry saving this hash.",
      });
      setStatusAnnouncement(
        "The payment may have been broadcast, but its transaction hash is not yet saved. Do not pay again.",
      );
    }
  }

  async function handleConfirmPayment() {
    if (!quote || isExpired || !transferRequest) {
      setPaymentError(
        "The quote expired before payment. Please refresh the quote.",
      );
      setStep("quote");
      return;
    }

    if (quoteRefreshing) {
      setPaymentError(
        "Wait for the refreshed quote, then review its exact amount again.",
      );
      return;
    }

    if (!address || isWrongNetwork) {
      setPaymentError(
        "Please connect your wallet to Base Sepolia before confirming.",
      );
      return;
    }

    setIsSubmitting(true);
    setPaymentError(null);

    let txHash: `0x${string}`;
    try {
      const writeFn = onWriteContract ?? writeContractAsync;
      txHash = await writeFn(transferRequest);
    } catch (error) {
      const message = walletTransactionError(error);
      setPaymentError(message);
      setStatusAnnouncement(message);
      setIsSubmitting(false);
      return;
    }

    const record: BroadcastState = {
      quoteId: quote.quoteId,
      txHash,
      submittedByWallet: address,
      explorerUrl: explorerUrl(txHash),
      saved: false,
      saveError: null,
      verificationUnavailable: false,
    };
    setBroadcast(record);
    setStep("submitted");
    setStatusAnnouncement(
      "Payment broadcast. PayProof is saving the transaction hash now.",
    );
    await saveBroadcast(record);
    setIsSubmitting(false);
  }

  async function handleRetrySave() {
    if (!broadcast || broadcast.saved || isSubmitting) return;
    setIsSubmitting(true);
    setBroadcast({ ...broadcast, saveError: null });
    await saveBroadcast({ ...broadcast, saveError: null });
    setIsSubmitting(false);
  }

  async function handleCheckVerification() {
    const paymentId =
      paymentResult?.paymentId || broadcastPaymentId || broadcast?.paymentId;
    if (!paymentId || isVerifying) return;

    setIsVerifying(true);
    setVerificationError(null);
    setStatusAnnouncement(
      "Checking payment verification with Telegraph intelligence…",
    );

    try {
      const result = await onVerifyPayment(invoice.publicId, paymentId);
      if (result.ok) {
        setPaymentResult(result.result);
        setCooldownSeconds(result.result.retryAfterSeconds ?? null);
        if (result.result.state === "verified") {
          setStep("verified");
          onVerified?.();
          setStatusAnnouncement(
            "Payment verified by Telegraph intelligence! Verified receipt is ready.",
          );
        } else if (result.result.state === "mismatch") {
          setStep("mismatch");
          setStatusAnnouncement(`Payment mismatch: ${result.result.message}`);
        } else if (result.result.state === "unavailable") {
          setStep("unavailable");
          setStatusAnnouncement(result.result.message);
        } else if (result.result.state === "submitted") {
          setStep("submitted");
          setStatusAnnouncement(result.result.message);
        }
      } else {
        setVerificationError(result.message);
        setStatusAnnouncement(result.message);
        if (result.retryAfterSeconds) {
          setCooldownSeconds(result.retryAfterSeconds);
        }
        if (
          result.code === "VERIFICATION_UNAVAILABLE" ||
          result.code === "VERIFICATION_RATE_LIMITED"
        ) {
          setStep("unavailable");
        }
      }
    } catch {
      const fallbackMsg =
        "Payment verification is temporarily unavailable. The saved transaction hash is safe to retry.";
      setVerificationError(fallbackMsg);
      setStatusAnnouncement(fallbackMsg);
      setStep("unavailable");
    } finally {
      setIsVerifying(false);
    }
  }

  function announceReceiptFeedback(msg: string) {
    if (receiptFeedbackTimer.current) {
      clearTimeout(receiptFeedbackTimer.current);
    }
    setReceiptFeedback(msg);
    setStatusAnnouncement(msg);
    receiptFeedbackTimer.current = setTimeout(() => {
      setReceiptFeedback(null);
      receiptFeedbackTimer.current = null;
    }, 3500);
  }

  async function handleShareReceipt() {
    const shareUrl =
      invoice.publicUrl ||
      (typeof window !== "undefined" ? window.location.href : "");
    const shareData = {
      title: `PayProof Verified Receipt — ${invoice.reference}`,
      text: `Verified receipt for invoice ${invoice.reference} (${invoice.localAmountFormatted}) to ${invoice.freelancerName}.`,
      url: shareUrl,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        announceReceiptFeedback("Receipt shared successfully!");
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
      }
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(shareUrl);
      announceReceiptFeedback("Receipt link copied to clipboard!");
    } catch {
      announceReceiptFeedback(
        "Could not copy link automatically. Copy from browser URL bar.",
      );
    }
  }

  async function handleCopyReceiptLink() {
    const shareUrl =
      invoice.publicUrl ||
      (typeof window !== "undefined" ? window.location.href : "");
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(shareUrl);
      announceReceiptFeedback("Receipt link copied to clipboard!");
    } catch {
      announceReceiptFeedback(
        "Could not copy link automatically. Copy from browser URL bar.",
      );
    }
  }

  function handlePrintReceipt() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  return (
    <section
      className={styles.paymentContainer}
      aria-label="Invoice payment and verification"
    >
      <div
        className={styles.srOnly}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {statusAnnouncement}
      </div>

      {step === "verified" && paymentResult ? (
        /* ============================================================
           Verified Receipt State
           ============================================================ */
        <div
          className={styles.receiptCard}
          role="region"
          aria-labelledby="verified-receipt-title"
        >
          <div className={styles.receiptHeader}>
            <div>
              <span className={styles.receiptEyebrow}>
                Official Testnet Receipt
              </span>
              <h3 id="verified-receipt-title" className={styles.receiptTitle}>
                Telegraph Verified Receipt
              </h3>
            </div>
            <span className={styles.badgeVerified}>
              <span aria-hidden="true">✓</span> Verified Receipt
            </span>
          </div>

          <p className={styles.receiptSubtitle}>
            Payment for invoice <strong>{invoice.reference}</strong> has been
            confirmed on Base Sepolia by Telegraph intelligence.
          </p>

          <div className={styles.receiptFactsGrid}>
            <div className={styles.receiptFactItem}>
              <span className={styles.receiptFactLabel}>Invoice Reference</span>
              <span className={styles.receiptFactValue}>
                {invoice.reference}
              </span>
            </div>

            <div className={styles.receiptFactItem}>
              <span className={styles.receiptFactLabel}>
                Freelancer / Payee
              </span>
              <span className={styles.receiptFactValue}>
                {invoice.freelancerName}
              </span>
            </div>

            {invoice.clientReference ? (
              <div className={styles.receiptFactItem}>
                <span className={styles.receiptFactLabel}>
                  Client Reference
                </span>
                <span className={styles.receiptFactValue}>
                  {invoice.clientReference}
                </span>
              </div>
            ) : null}

            <div className={styles.receiptFactItem}>
              <span className={styles.receiptFactLabel}>Work Description</span>
              <span className={styles.receiptFactValue}>
                {invoice.description}
              </span>
            </div>

            <div className={styles.receiptFactItem}>
              <span className={styles.receiptFactLabel}>
                Original Invoiced Amount
              </span>
              <span className={styles.receiptFactValue}>
                {invoice.localAmountFormatted}
              </span>
            </div>

            <div className={styles.receiptFactItem}>
              <span className={styles.receiptFactLabel}>Due Date</span>
              <span className={styles.receiptFactValue}>{invoice.dueDate}</span>
            </div>

            <div className={styles.receiptFactItem}>
              <span className={styles.receiptFactLabel}>
                Verified Settlement
              </span>
              <span className={styles.receiptAmount}>
                {paymentResult.expected.usdcAmountFormatted} test USDC
              </span>
            </div>

            <div className={styles.receiptFactItem}>
              <span className={styles.receiptFactLabel}>
                Conversion Rate / Rule
              </span>
              <span className={styles.receiptFactValue}>
                {invoice.currency === "USD"
                  ? "1 USD = 1 test USDC (Nominal testnet parity)"
                  : `Locked conversion: ${invoice.localAmountFormatted} → ${paymentResult.expected.usdcAmountFormatted} test USDC`}
              </span>
            </div>

            <div className={styles.receiptFactItem}>
              <span className={styles.receiptFactLabel}>
                Payer Wallet Address
              </span>
              <span
                className={styles.receiptMonospace}
                title={paymentResult.receipt?.payerAddress}
              >
                {paymentResult.receipt?.payerAddress}
              </span>
            </div>

            <div className={styles.receiptFactItem}>
              <span className={styles.receiptFactLabel}>Recipient Address</span>
              <span
                className={styles.receiptMonospace}
                title={paymentResult.expected.recipientAddress}
              >
                {paymentResult.expected.recipientAddress}
              </span>
            </div>

            <div className={styles.receiptFactItem}>
              <span className={styles.receiptFactLabel}>
                Base Sepolia Transaction Hash
              </span>
              <span
                className={styles.receiptMonospace}
                title={paymentResult.transaction.hash}
              >
                {paymentResult.transaction.hash}
              </span>
              <a
                className={styles.explorerLink}
                href={paymentResult.transaction.explorerUrl}
                target="_blank"
                rel="noreferrer"
              >
                View on BaseScan Explorer ↗
              </a>
            </div>

            <div className={styles.receiptFactItem}>
              <span className={styles.receiptFactLabel}>
                Verification Timestamp
              </span>
              <span className={styles.receiptFactValue}>
                {paymentResult.receipt?.verifiedAt
                  ? new Date(paymentResult.receipt.verifiedAt).toLocaleString()
                  : "Verified"}
              </span>
            </div>
          </div>

          {paymentResult.evidence ? (
            <div className={styles.provenanceBox}>
              <span className={styles.provenanceTitle}>
                Telegraph Intelligence Provenance
              </span>
              <div className={styles.provenanceGrid}>
                <div className={styles.provenanceItem}>
                  <span className={styles.provenanceLabel}>
                    Intelligence Source
                  </span>
                  <span className={styles.provenanceValue}>
                    {paymentResult.evidence.minerName} (
                    {paymentResult.evidence.minerId})
                  </span>
                </div>
                <div className={styles.provenanceItem}>
                  <span className={styles.provenanceLabel}>
                    Verification Role
                  </span>
                  <span className={styles.provenanceValue}>
                    {paymentResult.evidence.attemptRole === "primary"
                      ? "Primary Miner"
                      : "Backup Miner"}
                  </span>
                </div>
                <div className={styles.provenanceItem}>
                  <span className={styles.provenanceLabel}>Observed At</span>
                  <span className={styles.provenanceValue}>
                    {new Date(
                      paymentResult.evidence.observedAt,
                    ).toLocaleString()}
                  </span>
                </div>
                <div className={styles.provenanceItem}>
                  <span className={styles.provenanceLabel}>Checked At</span>
                  <span className={styles.provenanceValue}>
                    {new Date(
                      paymentResult.evidence.checkedAt,
                    ).toLocaleString()}
                  </span>
                </div>
                <div
                  className={styles.provenanceItem}
                  style={{ gridColumn: "1 / -1" }}
                >
                  <span className={styles.provenanceLabel}>
                    Provenance Source Record
                  </span>
                  <span className={styles.provenanceValue}>
                    {paymentResult.evidence.source}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <div className={styles.receiptActionsRow}>
            <button
              className={styles.printReceiptButton}
              onClick={handlePrintReceipt}
              type="button"
              aria-label="Print or save verified receipt as PDF"
            >
              <span aria-hidden="true">🖨</span> Print / Save PDF
            </button>
            <button
              className={styles.shareReceiptButton}
              onClick={handleShareReceipt}
              type="button"
            >
              Share receipt ↗
            </button>
            <button
              className={styles.copyReceiptButton}
              onClick={handleCopyReceiptLink}
              type="button"
            >
              Copy receipt link
            </button>
            {receiptFeedback ? (
              <div className={styles.receiptFeedback} role="status">
                {receiptFeedback}
              </div>
            ) : null}
          </div>

          <div className={styles.receiptDisclaimer}>
            <strong>Scope notice:</strong> PayProof verifies payment facts only
            — NOT work delivery, identity, tax, quality, or disputes.
          </div>
        </div>
      ) : step === "mismatch" && paymentResult ? (
        /* ============================================================
           Payment Mismatch State
           ============================================================ */
        <div
          className={styles.mismatchCard}
          role="alert"
          aria-labelledby="mismatch-title"
        >
          <div className={styles.mismatchHeader}>
            <div>
              <span className={styles.mismatchEyebrow}>
                Verification Mismatch
              </span>
              <h3 id="mismatch-title" className={styles.mismatchTitle}>
                Payment Mismatch Detected
              </h3>
            </div>
            <span className={styles.badgeMismatch}>
              <span aria-hidden="true">⚠</span> Payment Mismatch
            </span>
          </div>

          <p className={styles.mismatchMessage}>{paymentResult.message}</p>

          <div className={styles.failedFactBanner}>
            <strong>Failed Requirement: </strong>
            {paymentResult.code === "WRONG_AMOUNT"
              ? `Payment Amount Mismatch — Expected ${paymentResult.expected.usdcAmountFormatted} test USDC, observed ${paymentResult.observed.amountFormatted ? `${paymentResult.observed.amountFormatted} test USDC` : "different amount"}.`
              : paymentResult.code === "WRONG_RECIPIENT"
                ? `Recipient Mismatch — Expected ${paymentResult.expected.recipientAddress}, observed ${paymentResult.observed.recipientAddress ?? "different address"}.`
                : paymentResult.code === "WRONG_TOKEN"
                  ? `Token Mismatch — Expected official Base Sepolia test USDC (${paymentResult.expected.tokenAddress}), observed ${paymentResult.observed.tokenAddress ?? "different token"}.`
                  : paymentResult.code === "WRONG_CHAIN"
                    ? `Network Mismatch — Expected Base Sepolia (Chain ID 84532), observed Chain ID ${paymentResult.observed.chainId ?? "unsupported"}.`
                    : paymentResult.code === "TRANSACTION_REVERTED"
                      ? "Transaction Reverted — The transaction was mined on-chain but reverted during execution."
                      : paymentResult.code === "USDC_TRANSFER_NOT_FOUND"
                        ? "ERC-20 Transfer Not Found — No matching USDC transfer event was found in the transaction."
                        : paymentResult.code === "WRONG_TRANSACTION_HASH"
                          ? "Transaction Hash Mismatch — The transaction evidence does not match the recorded hash."
                          : "Payment details do not match the locked invoice requirements."}
          </div>

          <div className={styles.comparisonContainer}>
            <table className={styles.comparisonTable}>
              <thead>
                <tr>
                  <th scope="col">Payment Fact</th>
                  <th scope="col">Invoice Expectation</th>
                  <th scope="col">Observed on Base Sepolia</th>
                  <th scope="col">Match Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Network / Chain</strong>
                  </td>
                  <td>Base Sepolia (84532)</td>
                  <td>
                    {paymentResult.observed.chainId
                      ? `Chain ID ${paymentResult.observed.chainId}`
                      : "Not detected"}
                  </td>
                  <ComparisonStatusCell
                    status={exactComparisonStatus(
                      paymentResult.observed.chainId,
                      String(paymentResult.expected.chainId),
                    )}
                  />
                </tr>
                <tr>
                  <td>
                    <strong>Token Contract</strong>
                  </td>
                  <td>
                    <code>
                      {shortAddress(paymentResult.expected.tokenAddress)}
                    </code>
                  </td>
                  <td>
                    <code>
                      {paymentResult.observed.tokenAddress
                        ? shortAddress(paymentResult.observed.tokenAddress)
                        : "None detected"}
                    </code>
                  </td>
                  <ComparisonStatusCell
                    status={exactComparisonStatus(
                      paymentResult.observed.tokenAddress,
                      paymentResult.expected.tokenAddress,
                      true,
                    )}
                  />
                </tr>
                <tr>
                  <td>
                    <strong>Recipient Address</strong>
                  </td>
                  <td>
                    <code>
                      {shortAddress(paymentResult.expected.recipientAddress)}
                    </code>
                  </td>
                  <td>
                    <code>
                      {paymentResult.observed.recipientAddress
                        ? shortAddress(paymentResult.observed.recipientAddress)
                        : "None detected"}
                    </code>
                  </td>
                  <ComparisonStatusCell
                    status={exactComparisonStatus(
                      paymentResult.observed.recipientAddress,
                      paymentResult.expected.recipientAddress,
                      true,
                    )}
                  />
                </tr>
                <tr>
                  <td>
                    <strong>Payment Amount</strong>
                  </td>
                  <td>
                    <strong>
                      {paymentResult.expected.usdcAmountFormatted} test USDC
                    </strong>
                  </td>
                  <td>
                    {paymentResult.observed.amountFormatted
                      ? `${paymentResult.observed.amountFormatted} test USDC`
                      : "None detected"}
                  </td>
                  <ComparisonStatusCell
                    status={exactComparisonStatus(
                      paymentResult.observed.amountUnits,
                      paymentResult.expected.usdcAmountUnits,
                    )}
                  />
                </tr>
                <tr>
                  <td>
                    <strong>Transaction Status</strong>
                  </td>
                  <td>Mined & Succeeded</td>
                  <td>
                    {paymentResult.observed.transactionStatus ?? "Unknown"}
                  </td>
                  <ComparisonStatusCell
                    status={exactComparisonStatus(
                      paymentResult.observed.transactionStatus,
                      "success",
                      true,
                    )}
                  />
                </tr>
              </tbody>
            </table>
          </div>

          {paymentResult.evidence ? (
            <div className={styles.provenanceBox}>
              <span className={styles.provenanceTitle}>
                Telegraph Intelligence Check
              </span>
              <div className={styles.provenanceGrid}>
                <div className={styles.provenanceItem}>
                  <span className={styles.provenanceLabel}>
                    Intelligence Source
                  </span>
                  <span className={styles.provenanceValue}>
                    {paymentResult.evidence.minerName} (
                    {paymentResult.evidence.minerId})
                  </span>
                </div>
                <div className={styles.provenanceItem}>
                  <span className={styles.provenanceLabel}>
                    Verification Role
                  </span>
                  <span className={styles.provenanceValue}>
                    {paymentResult.evidence.attemptRole === "primary"
                      ? "Primary Miner"
                      : "Backup Miner"}
                  </span>
                </div>
                <div className={styles.provenanceItem}>
                  <span className={styles.provenanceLabel}>Checked At</span>
                  <span className={styles.provenanceValue}>
                    {new Date(
                      paymentResult.evidence.checkedAt,
                    ).toLocaleString()}
                  </span>
                </div>
                <div className={styles.provenanceItem}>
                  <span className={styles.provenanceLabel}>Source Record</span>
                  <span className={styles.provenanceValue}>
                    {paymentResult.evidence.source}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <div className={styles.txBox}>
            <span className={styles.txLabel}>Transaction Hash</span>
            <code
              className={styles.txHash}
              title={paymentResult.transaction.hash}
            >
              {paymentResult.transaction.hash}
            </code>
            <a
              className={styles.explorerLink}
              href={paymentResult.transaction.explorerUrl}
              target="_blank"
              rel="noreferrer"
            >
              View on BaseScan Explorer ↗
            </a>
          </div>

          <div className={styles.mismatchActionsRow}>
            {invoice.status === "open" || invoice.status === "overdue" ? (
              <button
                className={styles.tryAgainButton}
                onClick={() => {
                  setPaymentResult(null);
                  setBroadcast(null);
                  setStep("quote");
                  handleRefreshQuote();
                }}
                type="button"
              >
                Pay this invoice again →
              </button>
            ) : null}
          </div>
        </div>
      ) : step === "unavailable" ? (
        /* ============================================================
           Verification Unavailable State
           ============================================================ */
        <div
          className={styles.unavailableCard}
          role="status"
          aria-labelledby="unavailable-title"
        >
          <div className={styles.unavailableHeader}>
            <div>
              <span className={styles.unavailableEyebrow}>
                Verification Notice
              </span>
              <h3 id="unavailable-title" className={styles.unavailableTitle}>
                Verification Temporarily Unavailable
              </h3>
            </div>
            <span className={styles.badgeUnavailable}>
              <span aria-hidden="true">⚡</span> Verification Unavailable
            </span>
          </div>

          <p className={styles.unavailableMessage}>
            {verificationError ||
              paymentResult?.message ||
              "Trustworthy Telegraph evidence is temporarily unavailable. The saved transaction hash is safe to retry."}
          </p>

          <p className={styles.disclaimerText}>
            The transaction hash has been safely recorded in PayProof. You do
            NOT need to send another payment. You can retry verification once
            Telegraph services resume.
          </p>

          {paymentResult?.transaction.hash || broadcast?.txHash ? (
            <div className={styles.txBox}>
              <span className={styles.txLabel}>Transaction Hash</span>
              <code
                className={styles.txHash}
                title={
                  paymentResult?.transaction.hash || broadcast?.txHash || ""
                }
              >
                {paymentResult?.transaction.hash || broadcast?.txHash}
              </code>
              <a
                className={styles.explorerLink}
                href={
                  paymentResult?.transaction.explorerUrl ||
                  broadcast?.explorerUrl
                }
                target="_blank"
                rel="noreferrer"
              >
                View on BaseScan Explorer ↗
              </a>
            </div>
          ) : null}

          {cooldownSeconds !== null && cooldownSeconds > 0 ? (
            <p className={styles.cooldownText}>
              Cooldown active: retry available in {cooldownSeconds}s
            </p>
          ) : null}

          <button
            className={styles.retryVerifyButton}
            disabled={
              isVerifying || (cooldownSeconds !== null && cooldownSeconds > 0)
            }
            onClick={handleCheckVerification}
            type="button"
          >
            {isVerifying
              ? "Checking Telegraph evidence…"
              : "Retry verification"}
          </button>
        </div>
      ) : step === "submitted" && (broadcast || paymentResult) ? (
        /* ============================================================
           Submitted / Pending Verification State
           ============================================================ */
        <div
          className={`${styles.submittedCard} ${
            broadcast?.saved || paymentResult?.state === "submitted"
              ? ""
              : styles.submittedCardUnsaved
          }`}
          role="status"
        >
          <div className={styles.submittedBadge}>
            {broadcast?.saved || paymentResult?.state === "submitted" ? (
              <>
                <span aria-hidden="true">✓</span> Transaction hash saved
              </>
            ) : (
              "Save needs attention"
            )}
          </div>
          <h4>
            {broadcast?.saved || paymentResult?.state === "submitted"
              ? "Payment Broadcast"
              : "Payment broadcast — hash not saved yet"}
          </h4>
          <p>
            {broadcast?.saved || paymentResult?.state === "submitted"
              ? "PayProof recorded this Base Sepolia transaction hash. Do not send another payment while it is being checked."
              : "Your wallet returned a transaction hash, but PayProof has not confirmed that it was recorded. Do not pay again. Keep this page open and retry saving the same hash."}
          </p>

          <div className={styles.txBox}>
            <span className={styles.txLabel}>Transaction Hash</span>
            <code
              className={styles.txHash}
              title={broadcast?.txHash || paymentResult?.transaction.hash}
            >
              {broadcast?.txHash || paymentResult?.transaction.hash}
            </code>
            <a
              className={styles.explorerLink}
              href={
                broadcast?.explorerUrl || paymentResult?.transaction.explorerUrl
              }
              target="_blank"
              rel="noreferrer"
            >
              View on BaseScan Explorer ↗
            </a>
          </div>

          {broadcast?.saved || paymentResult?.state === "submitted" ? (
            <div>
              <div className={styles.verificationNotice}>
                <strong>
                  {broadcast?.verificationUnavailable
                    ? "Verification temporarily unavailable:"
                    : "Ready for verification:"}
                </strong>{" "}
                {broadcast?.verificationUnavailable
                  ? "The hash is safe. Telegraph can retry checking it without another payment."
                  : "Telegraph intelligence must check the transaction before PayProof can issue a verified receipt."}
              </div>

              {paymentResult?.code === "TRANSACTION_PENDING" ? (
                <p
                  className={styles.cooldownText}
                  style={{ marginTop: "10px" }}
                >
                  {paymentResult.message}
                </p>
              ) : null}

              {verificationError ? (
                <p className={styles.verificationError} role="alert">
                  {verificationError}
                </p>
              ) : null}

              <button
                className={styles.checkVerifyButton}
                disabled={
                  isVerifying ||
                  (cooldownSeconds !== null && cooldownSeconds > 0)
                }
                aria-busy={isVerifying}
                onClick={handleCheckVerification}
                type="button"
              >
                {isVerifying
                  ? "Checking Telegraph evidence…"
                  : cooldownSeconds !== null && cooldownSeconds > 0
                    ? `Check again in ${cooldownSeconds}s`
                    : "Check verification status"}
              </button>
            </div>
          ) : (
            <div className={styles.unsavedActions}>
              {broadcast?.saveError ? (
                <p className={styles.unsavedMessage}>{broadcast.saveError}</p>
              ) : (
                <p className={styles.unsavedMessage}>
                  Saving transaction hash…
                </p>
              )}
              <button
                className={styles.retrySaveButton}
                disabled={isSubmitting || !broadcast?.saveError}
                onClick={handleRetrySave}
                type="button"
              >
                {isSubmitting ? "Saving hash…" : "Retry saving this hash"}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ============================================================
           Quote & Review Payment Step
           ============================================================ */
        <>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.eyebrow}>
                Step 2 · Currency Conversion & Settlement
              </span>
              <h3 id="payment-section-title">Client Payment Step</h3>
            </div>
            <span className={styles.badgeBase}>Base Sepolia (84532)</span>
          </div>

          <p className={styles.disclaimerText}>
            Pay exact test USDC on Base Sepolia. Telegraph currency intelligence
            verifies the conversion rate and checks payment integrity.
          </p>

          {/* Quote Card */}
          <div className={styles.quoteCard}>
            <div className={styles.quoteHeader}>
              <span className={styles.quoteTitle}>
                15-Minute Conversion Quote
              </span>
              {quote && !quoteLoading && (
                <span
                  className={`${styles.countdownBadge} ${
                    isExpired
                      ? styles.countdownExpired
                      : isExpiringSoon
                        ? styles.countdownWarning
                        : styles.countdownActive
                  }`}
                  role="status"
                >
                  {isExpired
                    ? "Quote Expired"
                    : `${formatCountdown(secondsRemaining)} remaining`}
                </span>
              )}
            </div>

            {quoteLoading ? (
              <div className={styles.loadingBox} role="status">
                <div className={styles.spinner} aria-hidden="true" />
                <span>Fetching live Telegraph FX quote…</span>
              </div>
            ) : quoteError ? (
              <div className={styles.quoteErrorBox} role="alert">
                <p>
                  <strong>Quote Unavailable:</strong> {quoteError}
                </p>
                {cooldownSeconds !== null ? (
                  <p className={styles.cooldownText}>
                    Cooldown active: retry available in {cooldownSeconds}s
                  </p>
                ) : null}
                <button
                  className={styles.retryButton}
                  disabled={
                    quoteRefreshing ||
                    (cooldownSeconds !== null && cooldownSeconds > 0)
                  }
                  onClick={() => handleRefreshQuote()}
                  type="button"
                >
                  {quoteRefreshing ? "Retrying quote…" : "Try again"}
                </button>
              </div>
            ) : quote ? (
              <div className={styles.quoteDetails}>
                <div className={styles.quoteRowMain}>
                  <div>
                    <span className={styles.quoteLabel}>
                      Original Invoiced Amount
                    </span>
                    <strong className={styles.localAmountText}>
                      {quote.localAmountFormatted}
                    </strong>
                  </div>
                  <div className={styles.arrowIcon} aria-hidden="true">
                    →
                  </div>
                  <div className={styles.usdcCol}>
                    <span className={styles.quoteLabel}>Required Payment</span>
                    <strong className={styles.usdcAmountText}>
                      {quote.usdcAmountFormatted} test USDC
                    </strong>
                  </div>
                </div>

                <div className={styles.quoteMetaGrid}>
                  <div className={styles.quoteMetaItem}>
                    <span>Conversion Rule / Rate</span>
                    <strong>
                      {quote.source.kind === "usd_parity"
                        ? "1 USD = 1 test USDC (Nominal testnet parity)"
                        : `1 ${quote.sourceCurrency} = ${quote.rateToUsd} USD`}
                    </strong>
                  </div>
                  <div className={styles.quoteMetaItem}>
                    <span>Intelligence Source</span>
                    <strong>
                      {quote.source.kind === "usd_parity"
                        ? "Nominal 1:1 USD test parity"
                        : `${quote.source.name} (${quote.source.minerName} [${quote.source.attemptRole}])`}
                    </strong>
                  </div>
                  <div className={styles.quoteMetaItem}>
                    <span>Quoted Timestamp</span>
                    <span>{new Date(quote.quotedAt).toLocaleTimeString()}</span>
                  </div>
                  <div className={styles.quoteMetaItem}>
                    <span>Expires At</span>
                    <span>
                      {new Date(quote.expiresAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div className={styles.quoteActionsRow}>
                  <button
                    className={styles.refreshButton}
                    disabled={quoteRefreshing || isSubmitting}
                    onClick={() => handleRefreshQuote()}
                    type="button"
                    aria-label="Refresh conversion quote"
                  >
                    {quoteRefreshing ? "Refreshing quote…" : "↻ Refresh quote"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Wallet Status & Actions */}
          <div className={styles.walletBox}>
            <div className={styles.walletHeader}>
              <span className={styles.walletTitle}>Payer Wallet</span>
              {isConnected && address ? (
                <span className={styles.connectedTag}>
                  Connected: {shortAddress(address)}
                </span>
              ) : (
                <span className={styles.disconnectedTag}>Disconnected</span>
              )}
            </div>

            {isWrongNetwork ? (
              <div className={styles.networkWarning} role="alert">
                <span>
                  You are connected to an unsupported network. Switch to Base
                  Sepolia (84532) to pay.
                </span>
                <button
                  className={styles.switchButton}
                  onClick={handleSwitchNetwork}
                  type="button"
                >
                  Switch to Base Sepolia
                </button>
              </div>
            ) : null}

            {networkError ? (
              <div className={styles.paymentError} role="alert">
                {networkError}
              </div>
            ) : null}

            <div className={styles.walletActions}>
              <ConnectButton
                accountStatus={{
                  smallScreen: "avatar",
                  largeScreen: "address",
                }}
                chainStatus="icon"
                showBalance={false}
              />
            </div>

            <p className={styles.faucetNotice}>
              <strong>Testnet Notice:</strong> You need Base Sepolia test ETH
              for network gas and official test USDC (
              <code>{shortAddress(BASE_SEPOLIA_USDC_ADDRESS)}</code>). PayProof
              never sells, swaps, or custodies tokens.
            </p>
          </div>

          {paymentError ? (
            <div className={styles.paymentError} role="alert">
              {paymentError}
            </div>
          ) : null}

          {/* Review Modal */}
          {step === "review" && quote && transferRequest ? (
            <div
              className={styles.reviewModal}
              role="region"
              aria-labelledby={`${baseId}-review-title`}
            >
              <div className={styles.reviewContent}>
                <h4 id={`${baseId}-review-title`}>
                  Confirm Payment Transaction
                </h4>
                <p className={styles.reviewSubtitle}>
                  Please review the exact ERC-20 transfer parameters before
                  approving in your wallet.
                </p>

                <div className={styles.reviewSummaryList}>
                  <div className={styles.reviewSummaryRow}>
                    <span>Transfer Amount</span>
                    <strong className={styles.reviewUsdcAmount}>
                      {quote.usdcAmountFormatted} test USDC
                    </strong>
                  </div>
                  <div className={styles.reviewSummaryRow}>
                    <span>Network</span>
                    <strong>
                      Base Sepolia (Chain ID: {BASE_SEPOLIA_CHAIN_ID})
                    </strong>
                  </div>
                  <div className={styles.reviewSummaryRow}>
                    <span>Token Contract</span>
                    <strong
                      className={styles.mono}
                      title={BASE_SEPOLIA_USDC_ADDRESS}
                    >
                      {BASE_SEPOLIA_USDC_ADDRESS}
                    </strong>
                  </div>
                  <div className={styles.reviewSummaryRow}>
                    <span>Recipient (Payee)</span>
                    <strong
                      className={styles.mono}
                      title={invoice.recipientAddress}
                    >
                      {invoice.recipientAddress}
                    </strong>
                  </div>
                  <div className={styles.reviewSummaryRow}>
                    <span>Payer Wallet</span>
                    <strong className={styles.mono} title={address || ""}>
                      {address}
                    </strong>
                  </div>
                  <div className={styles.reviewSummaryRow}>
                    <span>Supporting Quote</span>
                    <span>
                      {quote.quoteId.slice(0, 8)}… (Expires in{" "}
                      {formatCountdown(secondsRemaining)})
                    </span>
                  </div>
                </div>

                <div className={styles.reviewActionButtons}>
                  <button
                    className={styles.cancelReviewButton}
                    disabled={isSubmitting}
                    onClick={() => setStep("quote")}
                    type="button"
                  >
                    Back to quote
                  </button>
                  <button
                    className={styles.confirmPayButton}
                    disabled={
                      isSubmitting ||
                      quoteRefreshing ||
                      isExpired ||
                      isWrongNetwork ||
                      !isConnected
                    }
                    aria-busy={isSubmitting}
                    onClick={handleConfirmPayment}
                    type="button"
                  >
                    {isSubmitting
                      ? "Awaiting wallet signature…"
                      : `Confirm & Pay ${quote.usdcAmountFormatted} USDC`}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {step === "quote" ? (
            <div className={styles.payActionRow}>
              <button
                className={styles.primaryPayButton}
                disabled={
                  !quote ||
                  quoteLoading ||
                  isExpired ||
                  Boolean(quoteError) ||
                  quoteRefreshing ||
                  !isConnected ||
                  isWrongNetwork ||
                  isSubmitting
                }
                onClick={handleStartReview}
                type="button"
              >
                {!isConnected
                  ? "Connect wallet to pay"
                  : isWrongNetwork
                    ? "Switch to Base Sepolia"
                    : isExpired
                      ? "Quote expired — Refresh to pay"
                      : quote
                        ? `Review & Pay ${quote.usdcAmountFormatted} test USDC →`
                        : "Fetching quote…"}
              </button>
            </div>
          ) : null}
        </>
      )}

      {step !== "verified" ? (
        <div className={styles.trustBanner}>
          <span>
            <strong>Non-custodial:</strong> PayProof never holds, swaps, sells,
            bridges, or supplies funds. Payments are direct ERC-20 transfers on
            Base Sepolia.
          </span>
        </div>
      ) : null}
    </section>
  );
}
