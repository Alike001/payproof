"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { createInvoiceInputSchema } from "@/features/invoices/schemas";
import type {
  CreateInvoiceFieldErrors,
  CreateInvoiceInput,
  CreatorInvoiceItem,
  PublishInvoiceResult,
  SupportedCurrency,
} from "@/features/invoices/types";
import styles from "./invoice-form.module.css";

const CURRENCIES: { label: string; value: SupportedCurrency }[] = [
  { label: "NGN · Nigerian Naira", value: "NGN" },
  { label: "USD · US Dollar", value: "USD" },
  { label: "EUR · Euro", value: "EUR" },
  { label: "GBP · British Pound", value: "GBP" },
];

function shortAddress(addr: string) {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

type FormStep = "form" | "review" | "published";

export function InvoiceForm({
  recipientAddress,
  initialPrefill,
  onPublish,
}: {
  recipientAddress: string;
  initialPrefill?: CreateInvoiceInput | null;
  onPublish?: (input: CreateInvoiceInput) => Promise<PublishInvoiceResult>;
}) {
  const baseId = useId();

  const todayStr = new Date().toISOString().split("T")[0];
  const [freelancerName, setFreelancerName] = useState(
    initialPrefill?.freelancerName || "",
  );
  const [clientReference, setClientReference] = useState(
    initialPrefill?.clientReference || "",
  );
  const [description, setDescription] = useState(
    initialPrefill?.description || "",
  );
  const [currency, setCurrency] = useState<SupportedCurrency>(
    initialPrefill?.currency || "NGN",
  );
  const [amount, setAmount] = useState(initialPrefill?.amount || "");
  const [dueDate, setDueDate] = useState(initialPrefill?.dueDate || todayStr);

  const [step, setStep] = useState<FormStep>("form");
  const [fieldErrors, setFieldErrors] = useState<CreateInvoiceFieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishedInvoice, setPublishedInvoice] =
    useState<CreatorInvoiceItem | null>(null);
  const [copied, setCopied] = useState(false);

  function getFormData(): CreateInvoiceInput {
    return {
      freelancerName: freelancerName.trim(),
      clientReference: clientReference.trim() || undefined,
      description: description.trim(),
      currency,
      amount: amount.trim(),
      dueDate: dueDate.trim(),
    };
  }

  function validateForm(): CreateInvoiceInput | null {
    setFieldErrors({});
    setGeneralError(null);
    const rawData = getFormData();
    const result = createInvoiceInputSchema.safeParse(rawData);

    if (!result.success) {
      const errors: CreateInvoiceFieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof CreateInvoiceInput;
        if (field && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return null;
    }
    return rawData;
  }

  function handleReviewClick(e: React.FormEvent) {
    e.preventDefault();
    const valid = validateForm();
    if (valid) {
      setStep("review");
    }
  }

  async function handlePublish() {
    const validData = validateForm();
    if (!validData) {
      setStep("form");
      return;
    }

    setGeneralError(null);
    setIsSubmitting(true);

    try {
      if (onPublish) {
        const result = await onPublish(validData);
        if (result.ok) {
          setPublishedInvoice(result.invoice);
          setStep("published");
        } else {
          setGeneralError(result.message);
          if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
            setFieldErrors(result.fieldErrors);
            setStep("form");
          }
        }
      } else {
        // Fallback presentation mode for testing/unwired state
        const mockItem: CreatorInvoiceItem = {
          invoiceId: "inv_demo",
          publicId: "demo-invoice",
          publicUrl: `${typeof window !== "undefined" ? window.location.origin : ""}/invoices/demo-invoice`,
          reference: "INV-DEMO-001",
          clientReference: validData.clientReference || null,
          description: validData.description,
          localAmountFormatted: `${validData.amount} ${validData.currency}`,
          currency: validData.currency,
          dueDate: validData.dueDate,
          status: "open",
          canCancel: true,
          createdAt: new Date().toISOString(),
        };
        setPublishedInvoice(mockItem);
        setStep("published");
      }
    } catch (err) {
      setGeneralError(
        err instanceof Error ? err.message : "Failed to publish invoice.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyLink() {
    if (!publishedInvoice?.publicUrl) return;
    try {
      await navigator.clipboard.writeText(publishedInvoice.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API is restricted
    }
  }

  function resetForm() {
    setFreelancerName("");
    setClientReference("");
    setDescription("");
    setCurrency("NGN");
    setAmount("");
    setDueDate(todayStr);
    setFieldErrors({});
    setGeneralError(null);
    setPublishedInvoice(null);
    setStep("form");
  }

  return (
    <div className={styles.container}>
      <div className={styles.srOnly} role="status" aria-live="polite">
        {step === "review"
          ? "Reviewing invoice details."
          : step === "published"
            ? "Invoice published successfully."
            : "Editing invoice creation form."}
      </div>

      {generalError ? (
        <div className={styles.generalError} role="alert">
          {generalError}
        </div>
      ) : null}

      {step === "published" && publishedInvoice ? (
        <section
          className={styles.publishedCard}
          aria-labelledby="published-title"
        >
          <div className={styles.successBadge}>
            <span aria-hidden="true">✓</span> Published & Ready
          </div>
          <h2 id="published-title">Invoice Published</h2>
          <p className={styles.publishedSubtitle}>
            Share this link with your client. They can pay in test USDC on Base
            Sepolia directly from this link.
          </p>

          <div className={styles.referenceGrid}>
            <div className={styles.referenceItem}>
              <span>Invoice Reference</span>
              <strong>{publishedInvoice.reference}</strong>
            </div>
            <div className={styles.referenceItem}>
              <span>Local Amount</span>
              <strong>{publishedInvoice.localAmountFormatted}</strong>
            </div>
            <div className={styles.referenceItem}>
              <span>Due Date</span>
              <strong>{publishedInvoice.dueDate}</strong>
            </div>
            <div className={styles.referenceItem}>
              <span>Recipient Wallet</span>
              <strong title={recipientAddress}>
                {shortAddress(recipientAddress)}
              </strong>
            </div>
          </div>

          <div className={styles.linkCard}>
            <span className={styles.linkLabel}>Public Payment Link</span>
            <div className={styles.linkInputRow}>
              <input
                className={styles.linkInput}
                readOnly
                value={publishedInvoice.publicUrl}
                aria-label="Public payment URL"
              />
              <button
                className={styles.copyButton}
                onClick={handleCopyLink}
                type="button"
              >
                {copied ? "Copied! ✓" : "Copy link"}
              </button>
            </div>
          </div>

          <div className={styles.publishedActions}>
            <Link
              className={styles.primaryLinkButton}
              href={publishedInvoice.publicUrl}
              target="_blank"
              rel="noreferrer"
            >
              View public invoice page ↗
            </Link>
            <button
              className={styles.secondaryButton}
              onClick={resetForm}
              type="button"
            >
              Create another invoice
            </button>
          </div>
        </section>
      ) : step === "review" ? (
        <section className={styles.reviewCard} aria-labelledby="review-title">
          <div className={styles.headerRow}>
            <h2 id="review-title">Review Invoice Details</h2>
            <span className={styles.reviewBadge}>Step 2 of 2</span>
          </div>

          <p className={styles.reviewNotice}>
            Please review the details below. Once published, the invoice
            amount, description, and currency cannot be modified.
          </p>

          <div className={styles.summaryList}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Freelancer / Creator</span>
              <span className={styles.summaryValue}>{freelancerName}</span>
            </div>
            {clientReference ? (
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Client Reference</span>
                <span className={styles.summaryValue}>{clientReference}</span>
              </div>
            ) : null}
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Work Description</span>
              <span className={styles.summaryValue}>{description}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Amount & Currency</span>
              <span className={styles.summaryValueHighlight}>
                {amount} {currency}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Due Date</span>
              <span className={styles.summaryValue}>{dueDate}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Receiving Address</span>
              <span className={styles.summaryValueMonospace} title={recipientAddress}>
                {recipientAddress}
              </span>
            </div>
          </div>

          <div className={styles.actionRow}>
            <button
              className={styles.secondaryButton}
              disabled={isSubmitting}
              onClick={() => setStep("form")}
              type="button"
            >
              Edit details
            </button>
            <button
              className={styles.primaryButton}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              onClick={handlePublish}
              type="button"
            >
              {isSubmitting ? "Publishing invoice…" : "Confirm & publish"}
            </button>
          </div>
        </section>
      ) : (
        <form
          className={styles.formCard}
          onSubmit={handleReviewClick}
          noValidate
          aria-labelledby="form-title"
        >
          <div className={styles.headerRow}>
            <h2 id="form-title">Create an Invoice</h2>
            <span className={styles.networkTag}>Base Sepolia</span>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor={`${baseId}-freelancerName`}>
              Your Display Name / Business Name
            </label>
            <input
              className={`${styles.input} ${fieldErrors.freelancerName ? styles.inputError : ""}`}
              id={`${baseId}-freelancerName`}
              type="text"
              value={freelancerName}
              onChange={(e) => setFreelancerName(e.target.value)}
              placeholder="e.g. Ada Lovelace Design"
              aria-invalid={Boolean(fieldErrors.freelancerName)}
              aria-describedby={
                fieldErrors.freelancerName ? `${baseId}-freelancerName-err` : undefined
              }
              required
            />
            {fieldErrors.freelancerName ? (
              <span className={styles.fieldErrorText} id={`${baseId}-freelancerName-err`} role="alert">
                {fieldErrors.freelancerName}
              </span>
            ) : null}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor={`${baseId}-clientReference`}>
              Client Name or Reference <span className={styles.optionalText}>(Optional)</span>
            </label>
            <input
              className={`${styles.input} ${fieldErrors.clientReference ? styles.inputError : ""}`}
              id={`${baseId}-clientReference`}
              type="text"
              value={clientReference}
              onChange={(e) => setClientReference(e.target.value)}
              placeholder="e.g. Acme Corp / Project #402"
              aria-invalid={Boolean(fieldErrors.clientReference)}
              aria-describedby={
                fieldErrors.clientReference ? `${baseId}-clientReference-err` : undefined
              }
            />
            {fieldErrors.clientReference ? (
              <span className={styles.fieldErrorText} id={`${baseId}-clientReference-err`} role="alert">
                {fieldErrors.clientReference}
              </span>
            ) : null}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor={`${baseId}-description`}>
              Work Description
            </label>
            <textarea
              className={`${styles.textarea} ${fieldErrors.description ? styles.inputError : ""}`}
              id={`${baseId}-description`}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the services, deliverables, or milestone completed"
              aria-invalid={Boolean(fieldErrors.description)}
              aria-describedby={
                fieldErrors.description ? `${baseId}-description-err` : undefined
              }
              required
            />
            {fieldErrors.description ? (
              <span className={styles.fieldErrorText} id={`${baseId}-description-err`} role="alert">
                {fieldErrors.description}
              </span>
            ) : null}
          </div>

          <div className={styles.rowTwoCols}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor={`${baseId}-currency`}>
                Currency
              </label>
              <select
                className={`${styles.select} ${fieldErrors.currency ? styles.inputError : ""}`}
                id={`${baseId}-currency`}
                value={currency}
                onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                aria-invalid={Boolean(fieldErrors.currency)}
                aria-describedby={
                  fieldErrors.currency ? `${baseId}-currency-err` : undefined
                }
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              {fieldErrors.currency ? (
                <span className={styles.fieldErrorText} id={`${baseId}-currency-err`} role="alert">
                  {fieldErrors.currency}
                </span>
              ) : null}
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor={`${baseId}-amount`}>
                Amount
              </label>
              <input
                className={`${styles.input} ${fieldErrors.amount ? styles.inputError : ""}`}
                id={`${baseId}-amount`}
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 250.00"
                aria-invalid={Boolean(fieldErrors.amount)}
                aria-describedby={
                  fieldErrors.amount ? `${baseId}-amount-err` : undefined
                }
                required
              />
              {fieldErrors.amount ? (
                <span className={styles.fieldErrorText} id={`${baseId}-amount-err`} role="alert">
                  {fieldErrors.amount}
                </span>
              ) : null}
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor={`${baseId}-dueDate`}>
              Due Date
            </label>
            <input
              className={`${styles.input} ${fieldErrors.dueDate ? styles.inputError : ""}`}
              id={`${baseId}-dueDate`}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              aria-invalid={Boolean(fieldErrors.dueDate)}
              aria-describedby={
                fieldErrors.dueDate ? `${baseId}-dueDate-err` : undefined
              }
              required
            />
            {fieldErrors.dueDate ? (
              <span className={styles.fieldErrorText} id={`${baseId}-dueDate-err`} role="alert">
                {fieldErrors.dueDate}
              </span>
            ) : null}
          </div>

          <div className={styles.readOnlyWalletBox}>
            <span className={styles.walletBoxLabel}>Payment Receiving Wallet</span>
            <div className={styles.walletBoxRow}>
              <span className={styles.walletAddressDisplay} title={recipientAddress}>
                {recipientAddress}
              </span>
              <span className={styles.verifiedTag}>Verified Session</span>
            </div>
            <p className={styles.walletNotice}>
              Payment goes directly to your verified signed-in session address to prevent address tampering.
            </p>
          </div>

          <div className={styles.actionRow}>
            <button className={styles.primaryButton} type="submit">
              Review invoice →
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
