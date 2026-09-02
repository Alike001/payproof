import { z } from "zod";
import type { Database } from "@/lib/database/types";
import {
  formatLocalAmount,
  type SupportedCurrency,
} from "@/lib/money";
import type {
  CreateInvoiceInput,
  CreatorInvoiceItem,
  InvoiceStatus,
  PublicInvoiceDto,
  PublicInvoiceStatus,
} from "@/features/invoices/types";

export type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];

export const invoiceIdSchema = z.uuid();

function supportedCurrency(value: string): SupportedCurrency {
  return z.enum(["NGN", "USD", "EUR", "GBP"]).parse(value);
}

function amountMinor(row: InvoiceRow): bigint {
  if (!Number.isSafeInteger(row.amount_minor) || row.amount_minor <= 0) {
    throw new Error("Invoice storage contains an invalid amount.");
  }
  return BigInt(row.amount_minor);
}

function invoiceReference(row: InvoiceRow): string {
  const year = row.created_at.slice(0, 4);
  const suffix = row.public_id.replaceAll("-", "").slice(0, 8).toUpperCase();
  return `INV-${year}-${suffix}`;
}

function publicUrl(appUrl: string, publicId: string): string {
  return new URL(`/i/${publicId}`, appUrl).toString();
}

function isOverdue(row: InvoiceRow, today: string): boolean {
  return row.lifecycle === "open" && row.due_date < today;
}

function creatorStatus(
  row: InvoiceRow,
  today: string,
  latestPaymentState?: string | null,
): InvoiceStatus {
  if (row.lifecycle === "cancelled") return "cancelled";
  if (row.lifecycle === "verified") return "verified";
  if (latestPaymentState === "mismatch") return "mismatch";
  return isOverdue(row, today) ? "overdue" : "open";
}

function publicStatus(row: InvoiceRow, today: string): PublicInvoiceStatus {
  return creatorStatus(row, today) as PublicInvoiceStatus;
}

export function toCreatorInvoiceItem(input: {
  row: InvoiceRow;
  appUrl: string;
  today: string;
  latestPaymentState?: string | null;
}): CreatorInvoiceItem {
  const currency = supportedCurrency(input.row.currency);
  return {
    invoiceId: input.row.id,
    publicId: input.row.public_id,
    publicUrl: publicUrl(input.appUrl, input.row.public_id),
    reference: invoiceReference(input.row),
    clientReference: input.row.client_reference,
    description: input.row.description,
    localAmountFormatted: formatLocalAmount(amountMinor(input.row), currency),
    currency,
    dueDate: input.row.due_date,
    status: creatorStatus(
      input.row,
      input.today,
      input.latestPaymentState,
    ),
    canCancel: input.row.lifecycle === "open",
    createdAt: input.row.created_at,
  };
}

export function toPublicInvoiceDto(input: {
  row: InvoiceRow;
  appUrl: string;
  today: string;
}): PublicInvoiceDto {
  const currency = supportedCurrency(input.row.currency);
  const recipient = input.row.recipient_wallet;
  return {
    publicId: input.row.public_id,
    publicUrl: publicUrl(input.appUrl, input.row.public_id),
    reference: invoiceReference(input.row),
    freelancerName: input.row.freelancer_name,
    clientReference: input.row.client_reference,
    description: input.row.description,
    currency,
    localAmountFormatted: formatLocalAmount(amountMinor(input.row), currency),
    dueDate: input.row.due_date,
    recipientAddress: recipient,
    recipientDisplay: `${recipient.slice(0, 6)}…${recipient.slice(-4)}`,
    status: publicStatus(input.row, input.today),
    createdAt: input.row.created_at,
  };
}

export function toDuplicatePrefill(row: InvoiceRow): CreateInvoiceInput {
  const units = amountMinor(row);
  return {
    freelancerName: row.freelancer_name,
    clientReference: row.client_reference ?? undefined,
    description: row.description,
    currency: supportedCurrency(row.currency),
    amount: `${units / 100n}.${(units % 100n).toString().padStart(2, "0")}`,
    dueDate: row.due_date,
  };
}
