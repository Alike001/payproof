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
import type {
  PaymentSubmissionResult,
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

type PaymentFlowStep = "quote" | "review" | "submitted";

type BroadcastState = {
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
  return payment?.state === "submitted" || payment?.state === "unavailable";
}

function broadcastFromPayment(
  payment: PublicPaymentResultDto | null | undefined,
): BroadcastState | null {
  if (!blocksAnotherTransfer(payment) || !payment) return null;
  return {
    quoteId: payment.quoteId,
    txHash: payment.transaction.hash as `0x${string}`,
    submittedByWallet: payment.transaction.submittedByWallet as `0x${string}`,
    explorerUrl: payment.transaction.explorerUrl,
    saved: true,
    saveError: null,
    verificationUnavailable: payment.state === "unavailable",
  };
}

export function PublicInvoicePayment({
  invoice,
  initialPayment = null,
  onFetchQuote = requestQuote,
  onSavePayment = savePaymentAttempt,
  onWriteContract,
}: {
  invoice: PublicInvoiceDto;
  initialPayment?: PublicPaymentResultDto | null;
  onFetchQuote?: (publicId: string) => Promise<QuoteRequestResult>;
  onSavePayment?: (
    publicId: string,
    input: SubmitPaymentInput,
  ) => Promise<PaymentSubmissionResult>;
  onWriteContract?: (request: UsdcTransferRequest) => Promise<`0x${string}`>;
}) {
  const baseId = useId();
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const initialBroadcast = broadcastFromPayment(initialPayment);

  const [quote, setQuote] = useState<PublicQuoteDto | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(!initialBroadcast);
  const [quoteRefreshing, setQuoteRefreshing] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [step, setStep] = useState<PaymentFlowStep>(
    initialBroadcast ? "submitted" : "quote",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [broadcast, setBroadcast] = useState<BroadcastState | null>(
    initialBroadcast,
  );
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>("");

  const quoteTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMilestoneAnnouncedRef = useRef<number | null>(null);

  // Fetch initial quote on mount / publicId change
  useEffect(() => {
    if (blocksAnotherTransfer(initialPayment)) {
      return;
    }

    let active = true;
    async function fetchInitialQuote() {
      try {
        const result = await onFetchQuote(invoice.publicId);
        if (!active) return;
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
        if (!active) return;
        setQuoteError(
          "A trustworthy quote is temporarily unavailable. Payment remains paused.",
        );
        setStatusAnnouncement(
          "A trustworthy quote is temporarily unavailable. Payment remains paused.",
        );
      } finally {
        if (active) {
          setQuoteLoading(false);
        }
      }
    }

    fetchInitialQuote();
    return () => {
      active = false;
    };
  }, [initialPayment, invoice.publicId, onFetchQuote]);

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
          explorerUrl: explorerUrl(result.payment.txHash),
          saved: true,
          saveError: null,
        });
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

  return (
    <section
      className={styles.paymentContainer}
      aria-labelledby="payment-section-title"
    >
      <div
        className={styles.srOnly}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {statusAnnouncement}
      </div>

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
          <span className={styles.quoteTitle}>15-Minute Conversion Quote</span>
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
                <span>{new Date(quote.expiresAt).toLocaleTimeString()}</span>
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
            accountStatus={{ smallScreen: "avatar", largeScreen: "address" }}
            chainStatus="icon"
            showBalance={false}
          />
        </div>

        <p className={styles.faucetNotice}>
          <strong>Testnet Notice:</strong> You need Base Sepolia test ETH for
          network gas and official test USDC (
          <code>{shortAddress(BASE_SEPOLIA_USDC_ADDRESS)}</code>). PayProof
          never sells, swaps, or custodies tokens.
        </p>
      </div>

      {paymentError ? (
        <div className={styles.paymentError} role="alert">
          {paymentError}
        </div>
      ) : null}

      {/* Review Modal / State */}
      {step === "review" && quote && transferRequest ? (
        <div
          className={styles.reviewModal}
          role="region"
          aria-labelledby={`${baseId}-review-title`}
        >
          <div className={styles.reviewContent}>
            <h4 id={`${baseId}-review-title`}>Confirm Payment Transaction</h4>
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

      {/* Submitted State */}
      {step === "submitted" && broadcast ? (
        <div
          className={`${styles.submittedCard} ${
            broadcast.saved ? "" : styles.submittedCardUnsaved
          }`}
          role="status"
        >
          <div className={styles.submittedBadge}>
            {broadcast.saved ? (
              <>
                <span aria-hidden="true">✓</span> Transaction hash saved
              </>
            ) : (
              "Save needs attention"
            )}
          </div>
          <h4>
            {broadcast.saved
              ? "Payment Broadcast"
              : "Payment broadcast — hash not saved yet"}
          </h4>
          <p>
            {broadcast.saved
              ? "PayProof recorded this Base Sepolia transaction hash. Do not send another payment while it is being checked."
              : "Your wallet returned a transaction hash, but PayProof has not confirmed that it was recorded. Do not pay again. Keep this page open and retry saving the same hash."}
          </p>

          <div className={styles.txBox}>
            <span className={styles.txLabel}>Transaction Hash</span>
            <code className={styles.txHash} title={broadcast.txHash}>
              {broadcast.txHash}
            </code>
            <a
              className={styles.explorerLink}
              href={broadcast.explorerUrl}
              target="_blank"
              rel="noreferrer"
            >
              View on BaseScan Explorer ↗
            </a>
          </div>

          {broadcast.saved ? (
            <div className={styles.verificationNotice}>
              <strong>
                {broadcast.verificationUnavailable
                  ? "Verification temporarily unavailable:"
                  : "Ready for verification:"}
              </strong>{" "}
              {broadcast.verificationUnavailable
                ? "The hash is safe. Telegraph can retry checking it without another payment."
                : "Telegraph intelligence must check the transaction before PayProof can issue a verified receipt."}
            </div>
          ) : (
            <div className={styles.unsavedActions}>
              {broadcast.saveError ? (
                <p className={styles.unsavedMessage}>{broadcast.saveError}</p>
              ) : (
                <p className={styles.unsavedMessage}>
                  Saving transaction hash…
                </p>
              )}
              <button
                className={styles.retrySaveButton}
                disabled={isSubmitting || !broadcast.saveError}
                onClick={handleRetrySave}
                type="button"
              >
                {isSubmitting ? "Saving hash…" : "Retry saving this hash"}
              </button>
            </div>
          )}
        </div>
      ) : step === "quote" ? (
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

      <div className={styles.trustBanner}>
        <span>
          <strong>Non-custodial:</strong> PayProof never holds, swaps, sells,
          bridges, or supplies funds. Payments are direct ERC-20 transfers on
          Base Sepolia.
        </span>
      </div>
    </section>
  );
}
