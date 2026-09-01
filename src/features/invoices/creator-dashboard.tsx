"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  CancelInvoiceResult,
  CreatorInvoiceItem,
  InvoiceStatus,
} from "@/features/invoices/types";
import styles from "./creator-dashboard.module.css";

function StatusBadge({ status }: { status: InvoiceStatus }) {
  switch (status) {
    case "open":
      return <span className={`${styles.badge} ${styles.badgeOpen}`}>Open</span>;
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
    case "mismatch":
      return (
        <span className={`${styles.badge} ${styles.badgeMismatch}`}>
          Mismatch
        </span>
      );
    case "verified":
      return (
        <span className={`${styles.badge} ${styles.badgeVerified}`}>
          ✓ Verified
        </span>
      );
    default:
      return <span className={styles.badge}>{status}</span>;
  }
}

export function CreatorDashboard({
  items = [],
  recipientAddress,
  onCancelInvoice,
  isLoading = false,
  error = null,
}: {
  items?: CreatorInvoiceItem[];
  recipientAddress: string;
  onCancelInvoice?: (invoiceId: string) => Promise<CancelInvoiceResult>;
  isLoading?: boolean;
  error?: string | null;
}) {
  const [invoiceList, setInvoiceList] = useState<CreatorInvoiceItem[]>(items);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCopyLink(item: CreatorInvoiceItem) {
    try {
      await navigator.clipboard.writeText(item.publicUrl);
      setCopiedId(item.invoiceId);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // Fallback
    }
  }

  async function handleConfirmCancel(invoiceId: string) {
    setActionError(null);
    setCancellingId(invoiceId);

    try {
      if (onCancelInvoice) {
        const res = await onCancelInvoice(invoiceId);
        if (res.ok) {
          setInvoiceList((prev) =>
            prev.map((inv) =>
              inv.invoiceId === invoiceId ? res.invoice : inv,
            ),
          );
        } else {
          setActionError(res.message);
        }
      } else {
        // Fallback UI state update for unwired callback
        setInvoiceList((prev) =>
          prev.map((inv) =>
            inv.invoiceId === invoiceId
              ? { ...inv, status: "cancelled" as const, canCancel: false }
              : inv,
          ),
        );
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to cancel invoice.",
      );
    } finally {
      setCancellingId(null);
      setConfirmCancelId(null);
    }
  }

  return (
    <section className={styles.dashboardContainer} aria-label="Creator invoice history">
      <div className={styles.srOnly} role="status" aria-live="polite">
        {isLoading
          ? "Loading invoice history…"
          : `Showing ${invoiceList.length} invoices.`}
      </div>

      <div className={styles.headerRow}>
        <div>
          <h2>Your Invoices</h2>
          <p className={styles.subtitle}>
            Invoices created by your verified wallet (
            <span className={styles.walletAddr} title={recipientAddress}>
              {recipientAddress.slice(0, 6)}…{recipientAddress.slice(-4)}
            </span>
            )
          </p>
        </div>
        <Link className={styles.createButton} href="/invoices/new">
          + Create an invoice
        </Link>
      </div>

      {error ? (
        <div className={styles.errorBox} role="alert">
          {error}
        </div>
      ) : null}

      {actionError ? (
        <div className={styles.errorBox} role="alert">
          {actionError}
        </div>
      ) : null}

      {isLoading ? (
        <div className={styles.loadingBox} role="status">
          <div className={styles.spinner} aria-hidden="true" />
          <span>Loading your invoices…</span>
        </div>
      ) : invoiceList.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">
            📄
          </div>
          <h3>No invoices yet</h3>
          <p>
            You have not created any invoices with this wallet address yet. Price your work in NGN, USD, EUR, or GBP and receive verified Base Sepolia test USDC.
          </p>
          <Link className={styles.createButton} href="/invoices/new">
            Create your first invoice
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {invoiceList.map((item) => (
            <article className={styles.card} key={item.invoiceId}>
              <div className={styles.cardHeader}>
                <div className={styles.refCol}>
                  <strong className={styles.refText}>{item.reference}</strong>
                  {item.clientReference ? (
                    <span className={styles.clientRefText}>
                      Client: {item.clientReference}
                    </span>
                  ) : null}
                </div>
                <StatusBadge status={item.status} />
              </div>

              <p className={styles.description}>{item.description}</p>

              <div className={styles.metaRow}>
                <div className={styles.metaCol}>
                  <span className={styles.metaLabel}>Amount</span>
                  <strong className={styles.amountText}>
                    {item.localAmountFormatted}
                  </strong>
                </div>
                <div className={styles.metaCol}>
                  <span className={styles.metaLabel}>Due Date</span>
                  <span className={styles.dateText}>{item.dueDate}</span>
                </div>
              </div>

              {confirmCancelId === item.invoiceId ? (
                <div className={styles.cancelConfirmBox}>
                  <span>Cancel this unpaid invoice? Payment will be permanently disabled.</span>
                  <div className={styles.cancelConfirmActions}>
                    <button
                      className={styles.dangerButton}
                      disabled={cancellingId === item.invoiceId}
                      onClick={() => handleConfirmCancel(item.invoiceId)}
                      type="button"
                    >
                      {cancellingId === item.invoiceId
                        ? "Cancelling…"
                        : "Yes, cancel invoice"}
                    </button>
                    <button
                      className={styles.secondaryButton}
                      disabled={cancellingId === item.invoiceId}
                      onClick={() => setConfirmCancelId(null)}
                      type="button"
                    >
                      Keep invoice
                    </button>
                  </div>
                </div>
              ) : null}

              <div className={styles.actionsRow}>
                <Link
                  className={styles.primaryActionLink}
                  href={item.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open invoice ↗
                </Link>
                <button
                  className={styles.secondaryActionButton}
                  onClick={() => handleCopyLink(item)}
                  type="button"
                >
                  {copiedId === item.invoiceId ? "Copied! ✓" : "Copy link"}
                </button>

                <Link
                  className={styles.secondaryActionButton}
                  href={`/invoices/new?duplicate_ref=${item.publicId}`}
                >
                  Duplicate
                </Link>

                {item.canCancel && confirmCancelId !== item.invoiceId ? (
                  <button
                    className={styles.cancelActionButton}
                    onClick={() => setConfirmCancelId(item.invoiceId)}
                    type="button"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
