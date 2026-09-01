import { describe, expect, it } from "vitest";
import { createInvoiceInputSchema } from "@/features/invoices/schemas";
import type {
  CancelInvoiceResult,
  CreateInvoiceInput,
  CreatorInvoiceItem,
  PublishInvoiceResult,
} from "@/features/invoices/types";

const sampleInput: CreateInvoiceInput = {
  freelancerName: "Tunde Creative",
  clientReference: "Client #101",
  description: "Web development sprint",
  currency: "NGN",
  amount: "150000.00",
  dueDate: "2026-09-30",
};

const sampleItem: CreatorInvoiceItem = {
  invoiceId: "inv_123",
  publicId: "pub_123",
  publicUrl: "https://payproof.example/invoices/pub_123",
  reference: "INV-2026-001",
  clientReference: "Client #101",
  description: "Web development sprint",
  localAmountFormatted: "150,000.00 NGN",
  currency: "NGN",
  dueDate: "2026-09-30",
  status: "open",
  canCancel: true,
  createdAt: "2026-09-01T12:00:00Z",
};

describe("Invoice Creator Presentation Contracts", () => {
  it("strictly enforces the four supported currencies", () => {
    for (const currency of ["NGN", "USD", "EUR", "GBP"] as const) {
      expect(
        createInvoiceInputSchema.safeParse({ ...sampleInput, currency }).success,
      ).toBe(true);
    }

    for (const invalid of ["CAD", "JPY", "AUD", "BTC", "USDC"]) {
      expect(
        createInvoiceInputSchema.safeParse({ ...sampleInput, currency: invalid })
          .success,
      ).toBe(false);
    }
  });

  it("rejects invalid, negative, zero, or over-precise amounts", () => {
    expect(
      createInvoiceInputSchema.safeParse({ ...sampleInput, amount: "0" }).success,
    ).toBe(false);
    expect(
      createInvoiceInputSchema.safeParse({ ...sampleInput, amount: "-50.00" })
        .success,
    ).toBe(false);
    expect(
      createInvoiceInputSchema.safeParse({ ...sampleInput, amount: "10.001" })
        .success,
    ).toBe(false);
    expect(
      createInvoiceInputSchema.safeParse({ ...sampleInput, amount: "abc" }).success,
    ).toBe(false);
  });

  it("structures PublishInvoiceResult and CancelInvoiceResult contracts cleanly", () => {
    const okPublish: PublishInvoiceResult = {
      ok: true,
      invoice: sampleItem,
    };
    expect(okPublish.ok).toBe(true);

    const errPublish: PublishInvoiceResult = {
      ok: false,
      code: "INVALID_AMOUNT",
      message: "Amount must be a positive number with at most two decimals.",
      fieldErrors: { amount: "Enter a positive amount." },
      retryable: true,
    };
    expect(errPublish.ok).toBe(false);

    const okCancel: CancelInvoiceResult = {
      ok: true,
      invoice: { ...sampleItem, status: "cancelled", canCancel: false },
    };
    expect(okCancel.ok).toBe(true);
  });

  it("supports all 5 defined invoice statuses", () => {
    const statuses = ["open", "overdue", "cancelled", "mismatch", "verified"] as const;
    for (const status of statuses) {
      const item: CreatorInvoiceItem = { ...sampleItem, status };
      expect(item.status).toBe(status);
    }
  });
});
