import { afterEach, describe, expect, it, vi } from "vitest";
import { requestPaymentVerification } from "@/features/payments/verification-client-boundary";

const publicId = "11111111-1111-4111-8111-111111111111";
const paymentId = "22222222-2222-4222-8222-222222222222";

afterEach(() => vi.unstubAllGlobals());

describe("verification client boundary", () => {
  it("accepts a complete Telegraph-verified receipt DTO", async () => {
    const txHash = `0x${"a".repeat(64)}`;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          ok: true,
          saved: true,
          result: {
            paymentId,
            quoteId: "33333333-3333-4333-8333-333333333333",
            state: "verified",
            code: null,
            message: "Verified.",
            retryable: false,
            transaction: {
              hash: txHash,
              explorerUrl: `https://sepolia.basescan.org/tx/${txHash}`,
              submittedByWallet: "0x1234567890AbcdEF1234567890aBcdef12345678",
              submittedAt: "2026-09-02T12:00:00.000Z",
            },
            expected: {
              chainId: 84_532,
              network: "Base Sepolia",
              token: "USDC",
              tokenAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
              recipientAddress: "0x1234567890AbcdEF1234567890aBcdef12345678",
              usdcAmountUnits: "1000000",
              usdcAmountFormatted: "1.000000",
            },
            observed: {
              chainId: "84532",
              tokenAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
              recipientAddress: "0x1234567890AbcdEF1234567890aBcdef12345678",
              amountUnits: "1000000",
              amountFormatted: "1.000000",
              transactionStatus: "success",
            },
            evidence: {
              minerId: "8453",
              minerName: "Truvian Exact On-Chain Truth Engine",
              attemptRole: "primary",
              observedAt: "2026-09-02T12:01:00.000Z",
              checkedAt: "2026-09-02T12:01:01.000Z",
              source: "Receipt-derived facts",
            },
            receipt: {
              payerAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
              verifiedAt: "2026-09-02T12:01:01.000Z",
            },
          },
        }),
      }),
    );
    expect(await requestPaymentVerification(publicId, paymentId)).toMatchObject({
      ok: true,
      result: { state: "verified", receipt: { payerAddress: expect.any(String) } },
    });
  });

  it("sends an empty request and accepts a bounded service error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        ok: false,
        code: "VERIFICATION_RATE_LIMITED",
        message: "Wait before trying again.",
        retryable: true,
        retryAfterSeconds: 8,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await requestPaymentVerification(publicId, paymentId)).toEqual({
      ok: false,
      code: "VERIFICATION_RATE_LIMITED",
      message: "Wait before trying again.",
      retryable: true,
      retryAfterSeconds: 8,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/invoices/${publicId}/payments/${paymentId}/verify`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      },
    );
  });

  it("fails closed when a server response claims Verified without receipt evidence", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          ok: true,
          saved: true,
          result: { state: "verified", receipt: null },
        }),
      }),
    );
    expect(await requestPaymentVerification(publicId, paymentId)).toMatchObject({
      ok: false,
      code: "VERIFICATION_UNAVAILABLE",
    });
  });
});
