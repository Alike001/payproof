export type SupportedCurrency = "NGN" | "USD" | "EUR" | "GBP";

export type InvoiceStatus =
  | "open"
  | "overdue"
  | "cancelled"
  | "mismatch"
  | "verified";

export type PublicInvoiceStatus =
  | "open"
  | "overdue"
  | "cancelled"
  | "mismatch"
  | "verified";

export type CreateInvoiceInput = {
  freelancerName: string;
  clientReference?: string;
  description: string;
  currency: SupportedCurrency;
  amount: string;
  dueDate: string; // YYYY-MM-DD
};

export type CreateInvoiceField = keyof CreateInvoiceInput;
export type CreateInvoiceFieldErrors = Partial<
  Record<CreateInvoiceField, string>
>;

export type CreatorInvoiceItem = {
  invoiceId: string;
  publicId: string;
  publicUrl: string;
  reference: string;
  clientReference: string | null;
  description: string;
  localAmountFormatted: string;
  currency: SupportedCurrency;
  dueDate: string;
  status: InvoiceStatus;
  canCancel: boolean;
  createdAt: string;
};

export type PublicInvoiceDto = {
  publicId: string;
  publicUrl: string;
  reference: string;
  freelancerName: string;
  clientReference: string | null;
  description: string;
  currency: SupportedCurrency;
  localAmountFormatted: string;
  dueDate: string;
  recipientAddress: string;
  recipientDisplay: string;
  status: PublicInvoiceStatus;
  createdAt: string;
};

export type PublicInvoicePageState =
  | {
      kind: "ready";
      invoice: PublicInvoiceDto;
      payment: PublicPaymentResultDto | null;
    }
  | {
      kind: "not_found";
      message: "This invoice link is invalid or no longer available.";
    }
  | {
      kind: "unavailable";
      message: "This invoice is temporarily unavailable. Please try again.";
      retryable: true;
    };

export type PublishInvoiceResult =
  | { ok: true; invoice: CreatorInvoiceItem }
  | {
      ok: false;
      code: string;
      message: string;
      fieldErrors: CreateInvoiceFieldErrors;
      retryable: boolean;
    };

export type CancelInvoiceResult =
  | { ok: true; invoice: CreatorInvoiceItem }
  | { ok: false; code: string; message: string; retryable: boolean };

export type InvoiceCreatorPageModel = {
  recipientAddress: string;
  duplicatePrefill: CreateInvoiceInput | null;
};

export type DashboardPageModel = {
  items: CreatorInvoiceItem[];
  nextCursor: string | null;
};
import type { PublicPaymentResultDto } from "@/features/payments/types";
