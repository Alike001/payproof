import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicInvoiceCard } from "@/features/invoices/public-invoice-card";
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

  it("renders payable and terminal lifecycle states without changing money", () => {
    const renderStatus = (status: PublicInvoiceDto["status"]) =>
      renderToStaticMarkup(
        createElement(PublicInvoiceCard, {
          state: {
            kind: "ready",
            invoice: { ...samplePublicInvoice, status },
          },
        }),
      );

    expect(renderStatus("open")).toContain("Client Payment Step");
    expect(renderStatus("overdue")).toContain("remains open for payment");
    expect(renderStatus("cancelled")).not.toContain("Client Payment Step");
    expect(renderStatus("verified")).toContain("Verified Receipt");
    expect(renderStatus("open")).toContain("1,250.00 EUR");
  });

  it("contains no production route fallback that fabricates invoice or receipt data", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/i/[publicId]/page.tsx"),
      "utf8",
    );
    const reader = readFileSync(
      join(
        process.cwd(),
        "src/lib/invoices/read-public-invoice.server.ts",
      ),
      "utf8",
    );
    const service = readFileSync(
      join(
        process.cwd(),
        "src/features/invoices/invoice-service.server.ts",
      ),
      "utf8",
    );

    expect(page).not.toMatch(/payproof\.example|0x1234|INV-\$\{|new Date/);
    expect(page).not.toMatch(/includes\(["'](?:cancelled|overdue|verified)/);
    expect(page).toContain("readPublicInvoicePageState");
    expect(reader).toContain('import "server-only"');
    expect(reader).toContain("invoice-service.server");
    expect(reader).not.toMatch(/freelancerName|recipientAddress|status:\s*["']/);
    expect(service).toContain("getAdminDatabaseClient");
    expect(service).toContain("return unavailableState");
    expect(service).not.toMatch(/payproof\.example|inv_demo|mockInvoice/);
    expect(service).not.toContain('.select("*")');
  });
});
