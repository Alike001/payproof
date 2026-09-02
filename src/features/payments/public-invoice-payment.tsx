"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit/components";
import { QueryClient, QueryClientContext, QueryClientProvider } from "@tanstack/react-query";
import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useAccount,
  useConnect,
  useSwitchChain,
  useWriteContract,
  WagmiContext,
  WagmiProvider,
} from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { getWalletConfig } from "@/lib/wallet/config";
import { requestQuote } from "@/features/quotes/quote-client-boundary";
import type { PublicQuoteDto, QuoteRequestResult } from "@/features/quotes/types";
import { savePaymentAttempt } from "@/features/payments/payment-client-boundary";
import type {
  PaymentSubmissionResult,
  PublicPaymentAttemptDto,
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

type PaymentFlowStep = "quote" | "review" | "submitted";

export function PublicInvoicePayment({
  invoice,
  onFetchQuote = requestQuote,
  onSavePayment = savePaymentAttempt,
  onWriteContract,
}: {
  invoice: PublicInvoiceDto;
  onFetchQuote?: (publicId: string) => Promise<QuoteRequestResult>;
  onSavePayment?: (
    publicId: string,
    input: SubmitPaymentInput,
  ) => Promise<PaymentSubmissionResult>;
  onWriteContract?: (request: UsdcTransferRequest) => Promise<`0x${string}`>;
}) {
  const queryClient = useContext(QueryClientContext);
  const wagmiCtx = useContext(WagmiContext);

  // If rendered in an isolated test without providers, self-wrap so hooks don't throw
  if (!queryClient || !wagmiCtx) {
    return (
      <IsolatedPaymentWrapper
        invoice={invoice}
        onFetchQuote={onFetchQuote}
        onSavePayment={onSavePayment}
        onWriteContract={onWriteContract}
      />
    );
  }

  return (
    <PublicInvoicePaymentInner
      invoice={invoice}
      onFetchQuote={onFetchQuote}
      onSavePayment={onSavePayment}
      onWriteContract={onWriteContract}
    />
  );
}

function IsolatedPaymentWrapper(props: {
  invoice: PublicInvoiceDto;
  onFetchQuote?: (publicId: string) => Promise<QuoteRequestResult>;
  onSavePayment?: (
    publicId: string,
    input: SubmitPaymentInput,
  ) => Promise<PaymentSubmissionResult>;
  onWriteContract?: (request: UsdcTransferRequest) => Promise<`0x${string}`>;
}) {
  const [queryClient] = useState(() => new QueryClient());
  const [config] = useState(getWalletConfig);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <PublicInvoicePaymentInner {...props} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function PublicInvoicePaymentInner({
  invoice,
  onFetchQuote = requestQuote,
  onSavePayment = savePaymentAttempt,
  onWriteContract,
}: {
  invoice: PublicInvoiceDto;
  onFetchQuote?: (publicId: string) => Promise<QuoteRequestResult>;
  onSavePayment?: (
    publicId: string,
    input: SubmitPaymentInput,
  ) => Promise<PaymentSubmissionResult>;
  onWriteContract?: (request: UsdcTransferRequest) => Promise<`0x${string}`>;
}) {
  const baseId = useId();
  const { address, chainId, isConnected } = useAccount();
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [quote, setQuote] = useState<PublicQuoteDto | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [quoteRefreshing, setQuoteRefreshing] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [step, setStep] = useState<PaymentFlowStep>("quote");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [submittedPayment, setSubmittedPayment] =
    useState<PublicPaymentAttemptDto | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>("");

  const quoteTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMilestoneAnnouncedRef = useRef<number | null>(null);

  // Fetch initial quote on mount / publicId change
  useEffect(() => {
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
  }, [invoice.publicId, onFetchQuote]);

  // Refresh quote on demand
  const handleRefreshQuote = useCallback(async () => {
    setQuoteRefreshing(true);
    setQuoteError(null);
    setPaymentError(null);

    try {
      const result = await onFetchQuote(invoice.publicId);
      if (result.ok) {
        if (quote && quote.quoteId !== result.quote.quoteId) {
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

  async function handleConfirmPayment() {
    if (!quote || isExpired || !transferRequest) {
      setPaymentError("The quote expired before payment. Please refresh the quote.");
      setStep("quote");
      return;
    }

    if (!address || isWrongNetwork) {
      setPaymentError("Please connect your wallet to Base Sepolia before confirming.");
      return;
    }

    setIsSubmitting(true);
    setPaymentError(null);

    try {
      // 1. Send transaction to wallet
      const writeFn = onWriteContract ?? writeContractAsync;
      const txHash = await writeFn(transferRequest);

      // 2. IMMEDIATE SAVE: Save broadcast attempt immediately after hash is returned
      const saveRes = await onSavePayment(invoice.publicId, {
        quoteId: quote.quoteId,
        txHash,
        submittedByWallet: address,
      });

      if (saveRes.ok) {
        setSubmittedPayment(saveRes.payment);
        setStep("submitted");
        setStatusAnnouncement(
          `Payment submitted! Transaction hash: ${txHash}. Verification by Telegraph intelligence is in progress.`,
        );
      } else {
        setPaymentError(
          `${saveRes.message} Transaction Hash: ${txHash}. Save this hash for reference.`,
        );
        setSubmittedPayment({
          paymentId: "pending",
          quoteId: quote.quoteId,
          txHash,
          submittedByWallet: address,
          state: "submitted",
          submittedAt: new Date().toISOString(),
        });
        setStep("submitted");
      }
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err &&
        "code" in err &&
        (err.code === 4001 || (err as { code: number }).code === 4001)
      ) {
        setPaymentError("Transaction cancelled in wallet. No test USDC was sent.");
        setStatusAnnouncement("Transaction cancelled in wallet. No funds were sent.");
      } else if (
        err instanceof Error &&
        /reject|denied|cancel|user rejected/i.test(err.message)
      ) {
        setPaymentError("Transaction cancelled in wallet. No test USDC was sent.");
        setStatusAnnouncement("Transaction cancelled in wallet. No funds were sent.");
      } else {
        const msg =
          err instanceof Error
            ? err.message
            : "Payment transaction failed. Please check your wallet and try again.";
        setPaymentError(msg);
        setStatusAnnouncement("Payment transaction failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
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
          <span className={styles.eyebrow}>Step 2 · Currency Conversion & Settlement</span>
          <h3 id="payment-section-title">Client Payment Step</h3>
        </div>
        <span className={styles.badgeBase}>Base Sepolia (84532)</span>
      </div>

      <p className={styles.disclaimerText}>
        Pay exact test USDC on Base Sepolia. Telegraph currency intelligence verifies the conversion rate and checks payment integrity.
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
              {isExpired ? "Quote Expired" : `${formatCountdown(secondsRemaining)} remaining`}
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
            <p><strong>Quote Unavailable:</strong> {quoteError}</p>
            {cooldownSeconds !== null ? (
              <p className={styles.cooldownText}>
                Cooldown active: retry available in {cooldownSeconds}s
              </p>
            ) : null}
            <button
              className={styles.retryButton}
              disabled={quoteRefreshing || (cooldownSeconds !== null && cooldownSeconds > 0)}
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
                <span className={styles.quoteLabel}>Original Invoiced Amount</span>
                <strong className={styles.localAmountText}>{quote.localAmountFormatted}</strong>
              </div>
              <div className={styles.arrowIcon} aria-hidden="true">→</div>
              <div className={styles.usdcCol}>
                <span className={styles.quoteLabel}>Required Payment</span>
                <strong className={styles.usdcAmountText}>{quote.usdcAmountFormatted} test USDC</strong>
              </div>
            </div>

            <div className={styles.quoteMetaGrid}>
              <div className={styles.quoteMetaItem}>
                <span>Conversion Rule / Rate</span>
                <strong>
                  {quote.source.kind === "usd_parity"
                    ? "1 USD = 1 test USDC (Nominal testnet parity)"
                    : `1 USD = ${quote.rateToUsd} ${quote.sourceCurrency}`}
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
            <span>You are connected to an unsupported network. Switch to Base Sepolia (84532) to pay.</span>
            <button
              className={styles.switchButton}
              onClick={() => switchChainAsync({ chainId: baseSepolia.id })}
              type="button"
            >
              Switch to Base Sepolia
            </button>
          </div>
        ) : null}

        <div className={styles.walletActions}>
          {isConnected ? (
            <ConnectButton
              accountStatus={{ smallScreen: "avatar", largeScreen: "address" }}
              chainStatus="icon"
              showBalance={false}
            />
          ) : (
            connectors.map((connector) => (
              <button
                className={styles.secondaryButton}
                disabled={isConnecting || isSubmitting}
                key={connector.uid}
                onClick={async () => {
                  try {
                    await connectAsync({ connector });
                  } catch {
                    // ignore handled by wagmi
                  }
                }}
                type="button"
              >
                {isConnecting
                  ? "Connecting…"
                  : connector.id === "walletConnect"
                    ? "WalletConnect"
                    : "Connect browser wallet"}
              </button>
            ))
          )}
        </div>

        <p className={styles.faucetNotice}>
          <strong>Testnet Notice:</strong> You need Base Sepolia test ETH for network gas and official test USDC (<code>{shortAddress(BASE_SEPOLIA_USDC_ADDRESS)}</code>). PayProof never sells, swaps, or custodies tokens.
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
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${baseId}-review-title`}
        >
          <div className={styles.reviewContent}>
            <h4 id={`${baseId}-review-title`}>Confirm Payment Transaction</h4>
            <p className={styles.reviewSubtitle}>
              Please review the exact ERC-20 transfer parameters before approving in your wallet.
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
                <strong>Base Sepolia (Chain ID: {BASE_SEPOLIA_CHAIN_ID})</strong>
              </div>
              <div className={styles.reviewSummaryRow}>
                <span>Token Contract</span>
                <strong className={styles.mono} title={BASE_SEPOLIA_USDC_ADDRESS}>
                  {BASE_SEPOLIA_USDC_ADDRESS}
                </strong>
              </div>
              <div className={styles.reviewSummaryRow}>
                <span>Recipient (Payee)</span>
                <strong className={styles.mono} title={invoice.recipientAddress}>
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
                <span>{quote.quoteId.slice(0, 8)}… (Expires in {formatCountdown(secondsRemaining)})</span>
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
                disabled={isSubmitting || isExpired || isWrongNetwork || !isConnected}
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
      {step === "submitted" && submittedPayment ? (
        <div className={styles.submittedCard} role="status">
          <div className={styles.submittedBadge}>
            <span aria-hidden="true">✓</span> Payment Broadcast
          </div>
          <h4>Payment Successfully Broadcast</h4>
          <p>
            Your payment has been sent to the Base Sepolia network. The transaction hash has been recorded.
          </p>

          <div className={styles.txBox}>
            <span className={styles.txLabel}>Transaction Hash</span>
            <code className={styles.txHash} title={submittedPayment.txHash}>
              {submittedPayment.txHash}
            </code>
            <a
              className={styles.explorerLink}
              href={`https://sepolia.basescan.org/tx/${submittedPayment.txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              View on BaseScan Explorer ↗
            </a>
          </div>

          <div className={styles.verificationNotice}>
            <strong>Verification in progress:</strong> Telegraph decentralized intelligence will check this transaction against the invoice boundary and produce an immutable verified receipt.
          </div>
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
          <strong>Non-custodial:</strong> PayProof never holds, swaps, sells, bridges, or supplies funds. Payments are direct ERC-20 transfers on Base Sepolia.
        </span>
      </div>
    </section>
  );
}
