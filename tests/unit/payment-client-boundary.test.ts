import { afterEach, describe, expect, it, vi } from "vitest";
import { savePaymentAttempt } from "@/features/payments/payment-client-boundary";

const publicId = "11111111-1111-4111-8111-111111111111";
const quoteId = "22222222-2222-4222-8222-222222222222";
const paymentId = "33333333-3333-4333-8333-333333333333";
const txHash = `0x${"a".repeat(64)}`;
const wallet = "0x1234567890AbcdEF1234567890aBcdef12345678";

afterEach(() => vi.unstubAllGlobals());

describe("payment client boundary", () => {
  it("sends only the server-required post-broadcast identity", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        ok: true,
        reused: false,
        payment: {
          paymentId,
          quoteId,
          txHash,
          submittedByWallet: wallet,
          state: "submitted",
          submittedAt: "2026-09-02T12:00:00.000Z",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const input = { quoteId, txHash, submittedByWallet: wallet };
    expect(await savePaymentAttempt(publicId, input)).toMatchObject({
      ok: true,
      reused: false,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/invoices/${publicId}/payments`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
    );
  });

  it("fails closed on a malformed success payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({ ok: true }) }),
    );
    expect(
      await savePaymentAttempt(publicId, {
        quoteId,
        txHash,
        submittedByWallet: wallet,
      }),
    ).toMatchObject({ ok: false, code: "PAYMENT_UNAVAILABLE" });
  });
});
