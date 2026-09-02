// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({ submitPaymentAttempt: vi.fn() }));
vi.mock("@/features/payments/payment-service.server", () => service);

import { POST } from "@/app/api/invoices/[publicId]/payments/route";

const publicId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => vi.clearAllMocks());

describe("payment submission Route Handler", () => {
  it("returns 201 only after the hash is stored", async () => {
    service.submitPaymentAttempt.mockResolvedValue({
      ok: true,
      reused: false,
      payment: { paymentId: "22222222-2222-4222-8222-222222222222" },
    });
    const request = new Request(
      `https://payproof.example/api/invoices/${publicId}/payments`,
      { method: "POST", body: "{}" },
    );
    const response = await POST(request, {
      params: Promise.resolve({ publicId }),
    });
    expect(response.status).toBe(201);
    expect(service.submitPaymentAttempt).toHaveBeenCalledWith(
      publicId,
      {},
      request.headers,
    );
    expect(await response.json()).toMatchObject({
      ok: true,
      requestId: expect.any(String),
    });
  });

  it("returns an idempotent retry with 200", async () => {
    service.submitPaymentAttempt.mockResolvedValue({
      ok: true,
      reused: true,
      payment: { paymentId: "22222222-2222-4222-8222-222222222222" },
    });
    const response = await POST(
      new Request(`https://payproof.example/api/invoices/${publicId}/payments`, {
        method: "POST",
        body: "{}",
      }),
      { params: Promise.resolve({ publicId }) },
    );
    expect(response.status).toBe(200);
  });

  it("maps submission throttling to 429 with Retry-After", async () => {
    service.submitPaymentAttempt.mockResolvedValue({
      ok: false,
      code: "PAYMENT_RATE_LIMITED",
      message: "Wait.",
      retryable: true,
      retryAfterSeconds: 9,
    });
    const response = await POST(
      new Request(`https://payproof.example/api/invoices/${publicId}/payments`, {
        method: "POST",
        body: "{}",
      }),
      { params: Promise.resolve({ publicId }) },
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("9");
  });

  it("fails safely when the service throws unexpectedly", async () => {
    service.submitPaymentAttempt.mockRejectedValue(new Error("secret detail"));
    const response = await POST(
      new Request(`https://payproof.example/api/invoices/${publicId}/payments`, {
        method: "POST",
        body: "{}",
      }),
      { params: Promise.resolve({ publicId }) },
    );
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("secret detail");
  });
});
