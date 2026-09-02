import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({
  publishInvoice: vi.fn(),
  cancelCreatorInvoice: vi.fn(),
}));

vi.mock("@/features/invoices/invoice-service.server", () => ({
  ...service,
  CreatorAuthenticationError: class CreatorAuthenticationError extends Error {},
}));

import { POST as publishPost } from "@/app/api/invoices/route";
import { POST as cancelPost } from "@/app/api/invoices/[invoiceRef]/cancel/route";

const invoiceItem = {
  invoiceId: "11111111-1111-4111-8111-111111111111",
  publicId: "22222222-2222-4222-8222-222222222222",
  publicUrl:
    "https://payproof.example/i/22222222-2222-4222-8222-222222222222",
  reference: "INV-2026-22222222",
  clientReference: null,
  description: "Design sprint",
  localAmountFormatted: "$100.00",
  currency: "USD" as const,
  dueDate: "2026-09-07",
  status: "open" as const,
  canCancel: true,
  createdAt: "2026-09-02T05:00:00.000Z",
};

beforeEach(() => vi.clearAllMocks());

describe("invoice Route Handlers", () => {
  it("rejects malformed JSON before calling the publication service", async () => {
    const response = await publishPost(
      new Request("https://payproof.example/api/invoices", {
        method: "POST",
        body: "{broken",
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      code: "INVALID_JSON",
    });
    expect(service.publishInvoice).not.toHaveBeenCalled();
  });

  it("publishes through the service and returns 201", async () => {
    service.publishInvoice.mockResolvedValue({ ok: true, invoice: invoiceItem });
    const input = {
      freelancerName: "Ada Studio",
      description: "Design sprint",
      currency: "USD",
      amount: "100.00",
      dueDate: "2026-09-07",
    };
    const response = await publishPost(
      new Request("https://payproof.example/api/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }),
    );
    expect(response.status).toBe(201);
    expect(service.publishInvoice).toHaveBeenCalledWith(input);
    expect(await response.json()).toEqual({ ok: true, invoice: invoiceItem });
  });

  it("preserves field errors and uses 400 for invalid invoice input", async () => {
    service.publishInvoice.mockResolvedValue({
      ok: false,
      code: "INVALID_INVOICE",
      message: "Review the highlighted invoice details.",
      fieldErrors: { amount: "Enter a valid amount." },
      retryable: false,
    });
    const response = await publishPost(
      new Request("https://payproof.example/api/invoices", {
        method: "POST",
        body: JSON.stringify({ amount: "1.001" }),
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      fieldErrors: { amount: "Enter a valid amount." },
    });
  });

  it("awaits the dynamic invoice ID and maps verified cancellation to 409", async () => {
    service.cancelCreatorInvoice.mockResolvedValue({
      ok: false,
      code: "VERIFIED_INVOICE",
      message: "A verified invoice cannot be cancelled.",
      retryable: false,
    });
    const invoiceId = "11111111-1111-4111-8111-111111111111";
    const response = await cancelPost(
      new Request(`https://payproof.example/api/invoices/${invoiceId}/cancel`, {
        method: "POST",
      }),
      { params: Promise.resolve({ invoiceRef: invoiceId }) },
    );
    expect(service.cancelCreatorInvoice).toHaveBeenCalledWith(invoiceId);
    expect(response.status).toBe(409);
  });

  it("returns a safe unavailable response when a service throws", async () => {
    service.cancelCreatorInvoice.mockRejectedValue(new Error("sensitive detail"));
    const response = await cancelPost(
      new Request("https://payproof.example/api/invoices/bad/cancel", {
        method: "POST",
      }),
      { params: Promise.resolve({ invoiceRef: "bad" }) },
    );
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).toContain("failed safely");
    expect(body).not.toContain("sensitive detail");
  });
});
