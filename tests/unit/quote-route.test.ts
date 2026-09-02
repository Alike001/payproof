import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({ requestInvoiceQuote: vi.fn() }));
vi.mock("@/features/quotes/quote-service.server", () => service);

import { POST } from "@/app/api/invoices/[publicId]/quote/route";

const publicId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => vi.clearAllMocks());

describe("quote Route Handler", () => {
  it("requires a strict empty JSON object", async () => {
    const response = await POST(
      new Request(`https://payproof.example/api/invoices/${publicId}/quote`, {
        method: "POST",
        body: JSON.stringify({ rate: "invented" }),
      }),
      { params: Promise.resolve({ publicId }) },
    );
    expect(response.status).toBe(400);
    expect(service.requestInvoiceQuote).not.toHaveBeenCalled();
  });

  it("returns a current saved quote without changing exact strings", async () => {
    service.requestInvoiceQuote.mockResolvedValue({
      ok: true,
      reused: true,
      quote: { usdcAmountUnits: "125500000", rateToUsd: "1" },
    });
    const request = new Request(
      `https://payproof.example/api/invoices/${publicId}/quote`,
      { method: "POST", body: "{}" },
    );
    const response = await POST(request, {
      params: Promise.resolve({ publicId }),
    });
    expect(response.status).toBe(200);
    expect(service.requestInvoiceQuote).toHaveBeenCalledWith(
      publicId,
      request.headers,
    );
    expect(await response.json()).toMatchObject({
      ok: true,
      reused: true,
      requestId: expect.any(String),
      quote: { usdcAmountUnits: "125500000" },
    });
  });

  it("maps rate limiting to 429 and a Retry-After header", async () => {
    service.requestInvoiceQuote.mockResolvedValue({
      ok: false,
      code: "QUOTE_RATE_LIMITED",
      message: "Too many quote requests.",
      retryable: true,
      retryAfterSeconds: 12,
    });
    const response = await POST(
      new Request(`https://payproof.example/api/invoices/${publicId}/quote`, {
        method: "POST",
        body: "{}",
      }),
      { params: Promise.resolve({ publicId }) },
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("12");
  });
});
