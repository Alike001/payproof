import "server-only";
import type { PublicInvoicePageState } from "@/features/invoices/types";

const publicInvoiceIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const notFoundState: PublicInvoicePageState = {
  kind: "not_found",
  message: "This invoice link is invalid or no longer available.",
};

const unavailableState: PublicInvoicePageState = {
  kind: "unavailable",
  message: "This invoice is temporarily unavailable. Please try again.",
  retryable: true,
};

export async function readPublicInvoicePageState(
  publicId: string,
): Promise<PublicInvoicePageState> {
  if (!publicInvoiceIdPattern.test(publicId)) {
    return notFoundState;
  }

  // The lead-owned sanitized database reader is delivered with checklist item 6.
  // Until then, valid-looking links fail closed instead of fabricating an invoice.
  return unavailableState;
}
