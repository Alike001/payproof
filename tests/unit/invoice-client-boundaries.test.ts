import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cancelInvoiceRequest,
  publishInvoiceRequest,
} from "@/features/invoices/invoice-client-boundaries";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("invoice client API boundaries", () => {
  it("sends exact validated decimal strings to publication", async () => {
    const invoice = {
      invoiceId: "11111111-1111-4111-8111-111111111111",
      publicId: "22222222-2222-4222-8222-222222222222",
      publicUrl:
        "https://payproof.example/i/22222222-2222-4222-8222-222222222222",
      reference: "INV-2026-22222222",
      clientReference: null,
      description: "Design sprint",
      localAmountFormatted: "$150.00",
      currency: "USD",
      dueDate: "2026-09-07",
      status: "open",
      canCancel: true,
      createdAt: "2026-09-02T05:00:00.000Z",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, invoice }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const input = {
      freelancerName: "Ada Studio",
      description: "Design sprint",
      currency: "USD" as const,
      amount: "150.00",
      dueDate: "2026-09-07",
    };
    expect(await publishInvoiceRequest(input)).toEqual({ ok: true, invoice });
    expect(fetchMock).toHaveBeenCalledWith("/api/invoices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
  });

  it("fails closed when publication returns malformed data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({ invoice: "invented" }) }),
    );
    const result = await publishInvoiceRequest({
      freelancerName: "Ada Studio",
      description: "Design sprint",
      currency: "USD",
      amount: "150.00",
      dueDate: "2026-09-07",
    });
    expect(result).toMatchObject({
      ok: false,
      code: "PUBLISH_UNAVAILABLE",
    });
  });

  it("targets only the selected invoice cancellation endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        ok: false,
        code: "VERIFIED_INVOICE",
        message: "A verified invoice cannot be cancelled.",
        retryable: false,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const invoiceId = "11111111-1111-4111-8111-111111111111";
    expect(await cancelInvoiceRequest(invoiceId)).toMatchObject({
      ok: false,
      code: "VERIFIED_INVOICE",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/invoices/${invoiceId}/cancel`,
      { method: "POST" },
    );
  });
});
