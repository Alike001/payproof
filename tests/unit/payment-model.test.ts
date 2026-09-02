import { describe, expect, it } from "vitest";
import {
  normalizeSubmitPaymentInput,
  toPublicPaymentAttemptDto,
} from "@/features/payments/model";
import {
  buildUsdcTransferRequest,
  USDC_TRANSFER_ABI,
} from "@/features/payments/usdc-abi";
import {
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_USDC_ADDRESS,
} from "@/lib/telegraph/constants";

const quoteId = "11111111-1111-4111-8111-111111111111";
const paymentId = "22222222-2222-4222-8222-222222222222";
const recipient = "0x1234567890AbcdEF1234567890aBcdef12345678";
const txHash = `0x${"A".repeat(64)}`;

describe("payment model", () => {
  it("normalizes only the strict post-broadcast submission fields", () => {
    expect(
      normalizeSubmitPaymentInput({
        quoteId,
        txHash,
        submittedByWallet: recipient.toLowerCase(),
      }),
    ).toEqual({
      quoteId,
      txHash: txHash.toLowerCase(),
      submittedByWallet: recipient,
    });
    expect(() =>
      normalizeSubmitPaymentInput({
        quoteId,
        txHash,
        submittedByWallet: recipient,
        amount: "1",
      }),
    ).toThrow();
  });

  it("builds only the official Base Sepolia USDC transfer with exact bigint units", () => {
    const request = buildUsdcTransferRequest({
      quote: {
        usdcAmountUnits: "160307500",
        expiresAt: "2026-09-02T12:15:00.000Z",
      },
      recipientAddress: recipient,
      nowMs: Date.parse("2026-09-02T12:00:00.000Z"),
    });
    expect(request).toEqual({
      chainId: BASE_SEPOLIA_CHAIN_ID,
      address: BASE_SEPOLIA_USDC_ADDRESS,
      abi: USDC_TRANSFER_ABI,
      functionName: "transfer",
      args: [recipient, 160307500n],
    });
  });

  it("refuses an expired quote or unsafe token amount before opening the wallet", () => {
    expect(() =>
      buildUsdcTransferRequest({
        quote: {
          usdcAmountUnits: "1000000",
          expiresAt: "2026-09-02T12:15:00.000Z",
        },
        recipientAddress: recipient,
        nowMs: Date.parse("2026-09-02T12:15:00.000Z"),
      }),
    ).toThrow(/current quote/i);
    expect(() =>
      buildUsdcTransferRequest({
        quote: {
          usdcAmountUnits: "9007199254740992",
          expiresAt: "2026-09-02T12:15:00.000Z",
        },
        recipientAddress: recipient,
        nowMs: Date.parse("2026-09-02T12:00:00.000Z"),
      }),
    ).toThrow(/safe bound/i);
  });

  it("returns a canonical sanitized payment DTO", () => {
    expect(
      toPublicPaymentAttemptDto({
        paymentId,
        quoteId,
        txHash,
        submittedByWallet: recipient.toLowerCase(),
        state: "submitted",
        submittedAt: "2026-09-02T12:00:00+00:00",
      }),
    ).toEqual({
      paymentId,
      quoteId,
      txHash: txHash.toLowerCase(),
      submittedByWallet: recipient,
      state: "submitted",
      submittedAt: "2026-09-02T12:00:00.000Z",
    });
  });
});
