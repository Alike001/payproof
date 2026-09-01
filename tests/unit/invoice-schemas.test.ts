import { describe, expect, it } from "vitest";
import { createInvoiceInputSchema } from "@/features/invoices/schemas";

const validInvoice = {
  freelancerName: "Ada Studio",
  description: "Brand identity design",
  currency: "NGN",
  amount: "250000.00",
  dueDate: "2026-09-07",
};

describe("createInvoiceInputSchema", () => {
  it("accepts the four-currency invoice boundary", () => {
    for (const currency of ["NGN", "USD", "EUR", "GBP"]) {
      expect(createInvoiceInputSchema.safeParse({ ...validInvoice, currency }).success).toBe(true);
    }
  });

  it("normalizes an empty optional client reference", () => {
    const parsed = createInvoiceInputSchema.parse({
      ...validInvoice,
      clientReference: "",
    });
    expect(parsed.clientReference).toBeUndefined();
  });

  it("rejects unknown fields and invalid commercial values", () => {
    expect(
      createInvoiceInputSchema.safeParse({ ...validInvoice, currency: "CAD" }).success,
    ).toBe(false);
    expect(
      createInvoiceInputSchema.safeParse({ ...validInvoice, amount: "1.001" }).success,
    ).toBe(false);
    expect(
      createInvoiceInputSchema.safeParse({ ...validInvoice, hidden: "unexpected" }).success,
    ).toBe(false);
  });
});
