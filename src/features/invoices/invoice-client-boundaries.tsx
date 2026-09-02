"use client";

import { CreatorDashboard } from "@/features/invoices/creator-dashboard";
import { InvoiceForm } from "@/features/invoices/invoice-form";
import type {
  CancelInvoiceResult,
  CreateInvoiceInput,
  CreatorInvoiceItem,
  PublishInvoiceResult,
} from "@/features/invoices/types";

function publishUnavailable(): PublishInvoiceResult {
  return {
    ok: false,
    code: "PUBLISH_UNAVAILABLE",
    message: "Invoice publishing is temporarily unavailable. Your invoice was not created.",
    fieldErrors: {},
    retryable: true,
  };
}

function cancelUnavailable(): CancelInvoiceResult {
  return {
    ok: false,
    code: "CANCEL_UNAVAILABLE",
    message: "Invoice cancellation failed safely. The invoice was not changed.",
    retryable: true,
  };
}

export async function publishInvoiceRequest(
  input: CreateInvoiceInput,
): Promise<PublishInvoiceResult> {
  try {
    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const result: unknown = await response.json();
    if (
      typeof result !== "object" ||
      result === null ||
      !("ok" in result) ||
      typeof result.ok !== "boolean"
    ) {
      return publishUnavailable();
    }
    return result as PublishInvoiceResult;
  } catch {
    return publishUnavailable();
  }
}

export async function cancelInvoiceRequest(
  invoiceId: string,
): Promise<CancelInvoiceResult> {
  try {
    const response = await fetch(
      `/api/invoices/${encodeURIComponent(invoiceId)}/cancel`,
      { method: "POST" },
    );
    const result: unknown = await response.json();
    if (
      typeof result !== "object" ||
      result === null ||
      !("ok" in result) ||
      typeof result.ok !== "boolean"
    ) {
      return cancelUnavailable();
    }
    return result as CancelInvoiceResult;
  } catch {
    return cancelUnavailable();
  }
}

export function ConnectedInvoiceForm(props: {
  recipientAddress: string;
  initialPrefill?: CreateInvoiceInput | null;
}) {
  return <InvoiceForm {...props} onPublish={publishInvoiceRequest} />;
}

export function ConnectedCreatorDashboard(props: {
  items: CreatorInvoiceItem[];
  recipientAddress: string;
  error?: string | null;
}) {
  return (
    <CreatorDashboard
      {...props}
      onCancelInvoice={cancelInvoiceRequest}
    />
  );
}
