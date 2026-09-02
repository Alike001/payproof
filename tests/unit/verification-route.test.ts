// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({ verifyPaymentAttempt: vi.fn() }));
vi.mock("@/features/payments/verification-service.server", () => service);

import { POST } from "@/app/api/invoices/[invoiceRef]/payments/[paymentId]/verify/route";

const publicId = "11111111-1111-4111-8111-111111111111";
const paymentId = "22222222-2222-4222-8222-222222222222";

beforeEach(() => vi.clearAllMocks());

describe("payment verification Route Handler", () => {
  it("requires a strict empty request so callers cannot supply verdicts", async () => {
    const response = await POST(
      new Request(
        `https://payproof.example/api/invoices/${publicId}/payments/${paymentId}/verify`,
        { method: "POST", body: JSON.stringify({ verified: true }) },
      ),
      { params: Promise.resolve({ invoiceRef: publicId, paymentId }) },
    );
    expect(response.status).toBe(400);
    expect(service.verifyPaymentAttempt).not.toHaveBeenCalled();
  });

  it("returns only the service decision with a request ID", async () => {
    service.verifyPaymentAttempt.mockResolvedValue({
      ok: true,
      saved: false,
      result: { state: "submitted", code: "TRANSACTION_PENDING" },
    });
    const request = new Request(
      `https://payproof.example/api/invoices/${publicId}/payments/${paymentId}/verify`,
      { method: "POST", body: "{}" },
    );
    const response = await POST(request, {
      params: Promise.resolve({ invoiceRef: publicId, paymentId }),
    });
    expect(response.status).toBe(200);
    expect(service.verifyPaymentAttempt).toHaveBeenCalledWith(
      publicId,
      paymentId,
      request.headers,
    );
    expect(await response.json()).toMatchObject({
      ok: true,
      requestId: expect.any(String),
    });
  });

  it("maps endpoint limiting to 429 with Retry-After", async () => {
    service.verifyPaymentAttempt.mockResolvedValue({
      ok: false,
      code: "VERIFICATION_RATE_LIMITED",
      message: "Wait.",
      retryable: true,
      retryAfterSeconds: 7,
    });
    const response = await POST(
      new Request(
        `https://payproof.example/api/invoices/${publicId}/payments/${paymentId}/verify`,
        { method: "POST", body: "{}" },
      ),
      { params: Promise.resolve({ invoiceRef: publicId, paymentId }) },
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("7");
  });
});
