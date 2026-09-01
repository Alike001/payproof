"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  PublicInvoicePageState,
  PublicInvoiceStatus,
} from "@/features/invoices/types";
import styles from "./public-invoice-card.module.css";

function StatusBadge({ status }: { status: PublicInvoiceStatus }) {
  switch (status) {
    case "open":
      return <span className={`${styles.badge} ${styles.badgeOpen}`}>Awaiting Payment</span>;
    case "overdue":
      return (
        <span className={`${styles.badge} ${styles.badgeOverdue}`}>
          ⚠ Overdue
        </span>
      );
    case "cancelled":
      return (
        <span className={`${styles.badge} ${styles.badgeCancelled}`}>
          Cancelled
        </span>
      );
    case "verified":
      return (
        <span className={`${styles.badge} ${styles.badgeVerified}`}>
          ✓ Verified Receipt
        </span>
      );
    default:
      return <span className={styles.badge}>{status}</span>;
  }
}

export function PublicInvoiceCard({
  state,
}: {
  state: PublicInvoicePageState;
}) {
  const [copied, setCopied] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (feedbackTimer.current) {
        clearTimeout(feedbackTimer.current);
      }
    },
    [],
  );

  function clearFeedbackAfter(delayMs: number) {
    if (feedbackTimer.current) {
      clearTimeout(feedbackTimer.current);
    }
    feedbackTimer.current = setTimeout(() => {
      setCopied(false);
      setFeedbackMessage(null);
      feedbackTimer.current = null;
    }, delayMs);
  }

  if (state.kind === "not_found") {
    return (
      <section className={styles.card} aria-labelledby="not-found-title">
        <div className={styles.srOnly} role="status" aria-live="polite">
          Invoice not found.
        </div>
        <div className={styles.errorIcon} aria-hidden="true">
          🔍
        </div>
        <h2 id="not-found-title">Invoice Not Found</h2>
        <p className={styles.errorMessage}>{state.message}</p>
        <div className={styles.actionRow}>
          <Link className={styles.primaryButton} href="/">
            Go to PayProof home
          </Link>
        </div>
      </section>
    );
  }

  if (state.kind === "unavailable") {
    return (
      <section className={styles.card} aria-labelledby="unavailable-title">
        <div className={styles.srOnly} role="status" aria-live="polite">
          Invoice temporarily unavailable.
        </div>
        <div className={styles.errorIcon} aria-hidden="true">
          ⚡
        </div>
        <h2 id="unavailable-title">Temporarily Unavailable</h2>
        <p className={styles.errorMessage}>{state.message}</p>
        <div className={styles.actionRow}>
          <button
            className={styles.primaryButton}
            onClick={() => window.location.reload()}
            type="button"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  const { invoice } = state;

  async function handleShare() {
    setFeedbackMessage(null);
    const shareData = {
      title: `PayProof Invoice ${invoice.reference}`,
      text: `Invoice from ${invoice.freelancerName} for ${invoice.localAmountFormatted}`,
      url: invoice.publicUrl || window.location.href,
    };

    if (navigator.share && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        setFeedbackMessage("Shared successfully!");
        clearFeedbackAfter(3000);
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
      }
    }

    // Fallback to clipboard copying
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      setFeedbackMessage("Link copied to clipboard!");
      clearFeedbackAfter(3000);
    } catch {
      setCopied(false);
      setFeedbackMessage("Could not copy link automatically. Copy from browser URL bar.");
      clearFeedbackAfter(4000);
    }
  }

  return (
    <section className={styles.card} aria-labelledby="public-invoice-title">
      <div
        className={styles.srOnly}
        role="status"
        aria-atomic="true"
        aria-live="polite"
      >
        {feedbackMessage ?? ""}
      </div>

      <div className={styles.testnetNoticeBanner} role="note">
        <span className={styles.testnetDot} aria-hidden="true" />
        <span>Base Sepolia testnet • Test USDC has no real monetary value</span>
      </div>

      <div className={styles.headerRow}>
        <div>
          <span className={styles.eyebrow}>PayProof Invoice</span>
          <h2 id="public-invoice-title">{invoice.reference}</h2>
        </div>
        <StatusBadge status={invoice.status} />
      </div>

      <p className={styles.privacyNotice}>
        <strong>Public view:</strong> Anyone with this link can view this invoice. PayProof never exposes private emails, phone numbers, or passwords.
      </p>

      {invoice.status === "cancelled" ? (
        <div className={styles.cancelledBanner} role="alert">
          <strong>Invoice Cancelled:</strong> The creator cancelled this invoice. Payment is permanently disabled. Please do not send test funds.
        </div>
      ) : null}

      {invoice.status === "overdue" ? (
        <div className={styles.overdueBanner} role="status">
          <strong>Past Due Date:</strong> This invoice passed its due date ({invoice.dueDate}) but remains open for payment.
        </div>
      ) : null}

      {invoice.status === "verified" ? (
        <div className={styles.verifiedBanner} role="status">
          <strong>Verified Receipt:</strong> Payment for this invoice has been confirmed on Base Sepolia by Telegraph intelligence.
        </div>
      ) : null}

      <div className={styles.detailsGrid}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Freelancer / Payee</span>
          <span className={styles.detailValue}>{invoice.freelancerName}</span>
        </div>

        {invoice.clientReference ? (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Client Reference</span>
            <span className={styles.detailValue}>{invoice.clientReference}</span>
          </div>
        ) : null}

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Work Description</span>
          <span className={styles.detailValue}>{invoice.description}</span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Invoice Amount</span>
          <span className={styles.detailAmount}>{invoice.localAmountFormatted}</span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Due Date</span>
          <span className={styles.detailValue}>{invoice.dueDate}</span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Recipient Address</span>
          <span className={styles.detailMonospace} title={invoice.recipientAddress}>
            {invoice.recipientDisplay || invoice.recipientAddress}
          </span>
        </div>
      </div>

      <div className={styles.shareSection}>
        <div className={styles.shareRow}>
          <button
            className={styles.sharePrimaryButton}
            onClick={handleShare}
            type="button"
          >
            {copied ? "Link Copied! ✓" : "Share invoice link ↗"}
          </button>
        </div>
        {feedbackMessage ? (
          <div className={styles.feedbackText}>
            {feedbackMessage}
          </div>
        ) : null}
      </div>

      {invoice.status === "open" || invoice.status === "overdue" ? (
        <div className={styles.paymentSection}>
          <h3>Client Payment Step</h3>
          <p>
            Connect your wallet to get a live 15-minute Telegraph FX quote and pay exact test USDC on Base Sepolia.
          </p>
          <div className={styles.paymentBox}>
            <span>Network: Base Sepolia (84532)</span>
            <span>Token: Official Test USDC</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
