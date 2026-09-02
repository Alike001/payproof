import { describe, expect, it } from "vitest";
import {
  toCreatorInvoiceItem,
  toDuplicatePrefill,
  toPublicInvoiceDto,
  type InvoiceRow,
} from "@/features/invoices/model";

const row: InvoiceRow = {
  id: "11111111-1111-4111-8111-111111111111",
  public_id: "22222222-2222-4222-8222-222222222222",
  creator_user_id: "33333333-3333-4333-8333-333333333333",
  creator_wallet: "0x1234567890abcdef1234567890abcdef12345678",
  freelancer_name: "Ada Studio",
  client_reference: "Launch photos",
  description: "Event photography",
  currency: "NGN",
  amount_minor: 25_000_000,
  minor_unit_decimals: 2,
  recipient_wallet: "0x1234567890abcdef1234567890abcdef12345678",
  due_date: "2026-09-05",
  lifecycle: "open",
  created_at: "2026-09-02T05:00:00.000Z",
  cancelled_at: null,
  verified_at: null,
};

describe("invoice DTO mapping", () => {
  it("builds a stable creator item without floating-point money arithmetic", () => {
    const item = toCreatorInvoiceItem({
      row,
      appUrl: "https://payproof.example",
      today: "2026-09-02",
    });
    expect(item).toEqual({
      invoiceId: row.id,
      publicId: row.public_id,
      publicUrl: `https://payproof.example/i/${row.public_id}`,
      reference: "INV-2026-22222222",
      clientReference: "Launch photos",
      description: "Event photography",
      localAmountFormatted: "₦250,000.00",
      currency: "NGN",
      dueDate: "2026-09-05",
      status: "open",
      canCancel: true,
      createdAt: row.created_at,
    });
  });

  it("computes overdue without mutating lifecycle and preserves terminal states", () => {
    expect(
      toCreatorInvoiceItem({
        row,
        appUrl: "https://payproof.example",
        today: "2026-09-06",
      }).status,
    ).toBe("overdue");
    expect(
      toCreatorInvoiceItem({
        row: { ...row, lifecycle: "cancelled", cancelled_at: row.created_at },
        appUrl: "https://payproof.example",
        today: "2026-09-06",
      }),
    ).toMatchObject({ status: "cancelled", canCancel: false });
    expect(
      toCreatorInvoiceItem({
        row: { ...row, lifecycle: "verified", verified_at: row.created_at },
        appUrl: "https://payproof.example",
        today: "2026-09-06",
      }),
    ).toMatchObject({ status: "verified", canCancel: false });
  });

  it("exposes only the accepted public invoice fields", () => {
    const invoice = toPublicInvoiceDto({
      row,
      appUrl: "https://payproof.example",
      today: "2026-09-02",
    });
    expect(invoice).toMatchObject({
      publicId: row.public_id,
      freelancerName: "Ada Studio",
      recipientDisplay: "0x1234…5678",
      localAmountFormatted: "₦250,000.00",
    });
    expect(invoice).not.toHaveProperty("creator_user_id");
    expect(invoice).not.toHaveProperty("creator_wallet");
    expect(invoice).not.toHaveProperty("amount_minor");
    expect(invoice).not.toHaveProperty("cancelled_at");
  });

  it("creates an exact duplicate prefill without creating another invoice", () => {
    expect(toDuplicatePrefill(row)).toEqual({
      freelancerName: "Ada Studio",
      clientReference: "Launch photos",
      description: "Event photography",
      currency: "NGN",
      amount: "250000.00",
      dueDate: "2026-09-05",
    });
  });

  it("fails closed on unsafe stored money", () => {
    expect(() =>
      toPublicInvoiceDto({
        row: { ...row, amount_minor: Number.MAX_SAFE_INTEGER + 1 },
        appUrl: "https://payproof.example",
        today: "2026-09-02",
      }),
    ).toThrow(/invalid amount/i);
  });
});
