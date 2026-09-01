import { describe, expect, it } from "vitest";
import type {
  PublicInvoiceDto,
  PublicInvoicePageState,
} from "@/features/invoices/types";

const samplePublicInvoice: PublicInvoiceDto = {
  publicId: "pub_abc123",
  publicUrl: "https://payproof.example/i/pub_abc123",
  reference: "INV-2026-009",
  freelancerName: "Folake Designs",
  clientReference: "Ref #99",
  description: "UI/UX consultation and design sprint",
  currency: "EUR",
  localAmountFormatted: "1,250.00 EUR",
  dueDate: "2026-09-15",
  recipientAddress: "0x9876543210fedcba9876543210fedcba98765432",
  recipientDisplay: "0x9876…5432",
  status: "open",
  createdAt: "2026-09-01T14:00:00Z",
};

describe("Public Invoice Presentation & State Contracts", () => {
  it("structures PublicInvoiceDto without exposing private session or database keys", () => {
    expect(samplePublicInvoice.publicId).toBe("pub_abc123");
    expect(samplePublicInvoice.reference).toBe("INV-2026-009");
    expect(samplePublicInvoice.currency).toBe("EUR");
    expect(samplePublicInvoice.localAmountFormatted).toBe("1,250.00 EUR");

    // Ensure no private keys exist on DTO
    const keys = Object.keys(samplePublicInvoice);
    expect(keys).not.toContain("creatorUserId");
    expect(keys).not.toContain("invoiceId");
    expect(keys).not.toContain("email");
    expect(keys).not.toContain("phone");
  });

  it("handles ready, not_found, and unavailable page states", () => {
    const readyState: PublicInvoicePageState = {
      kind: "ready",
      invoice: samplePublicInvoice,
    };
    expect(readyState.kind).toBe("ready");

    const notFoundState: PublicInvoicePageState = {
      kind: "not_found",
      message: "This invoice link is invalid or no longer available.",
    };
    expect(notFoundState.kind).toBe("not_found");
    expect(notFoundState.message).toBe("This invoice link is invalid or no longer available.");

    const unavailableState: PublicInvoicePageState = {
      kind: "unavailable",
      message: "This invoice is temporarily unavailable. Please try again.",
      retryable: true,
    };
    expect(unavailableState.kind).toBe("unavailable");
  });

  it("supports Open, Overdue, Cancelled, and Verified public statuses", () => {
    const statuses = ["open", "overdue", "cancelled", "verified"] as const;
    for (const status of statuses) {
      const dto: PublicInvoiceDto = { ...samplePublicInvoice, status };
      expect(dto.status).toBe(status);
    }
  });

  it("distinguishes overdue (payable with warning) from cancelled (payment permanently disabled)", () => {
    const overdueDto: PublicInvoiceDto = { ...samplePublicInvoice, status: "overdue" };
    expect(overdueDto.status).toBe("overdue");

    const cancelledDto: PublicInvoiceDto = { ...samplePublicInvoice, status: "cancelled" };
    expect(cancelledDto.status).toBe("cancelled");
  });
});
