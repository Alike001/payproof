import { describe, expect, it } from "vitest";
import {
  officialExpectedPayment,
  verifyInvoicePayment,
} from "@/features/payments/verifier";
import { BASE_SEPOLIA_USDC_ADDRESS } from "@/lib/telegraph/constants";
import type { TransactionEvidence } from "@/lib/telegraph/miners/types";

const txHash = `0x${"a".repeat(64)}`;
const recipient = "0x1234567890AbcdEF1234567890aBcdef12345678";
const payer = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const amountUnits = "160307500";
const expected = officialExpectedPayment({ txHash, recipient, amountUnits });

function evidence(
  overrides: Partial<TransactionEvidence> = {},
): TransactionEvidence {
  return {
    chainId: 84_532,
    txHash,
    exists: true,
    lifecycle: "mined",
    status: "success",
    blockNumber: "123",
    sender: payer,
    recipient: BASE_SEPOLIA_USDC_ADDRESS,
    transfers: [
      {
        token: BASE_SEPOLIA_USDC_ADDRESS,
        from: payer,
        to: recipient,
        amountUnits,
        logIndex: 1,
      },
    ],
    observedAt: "2026-09-02T12:00:00.000Z",
    source: "Receipt-derived facts",
    evidenceScope: { receipt: true, logs: true, erc20Transfers: true },
    minerId: "8453",
    minerName: "Truvian Exact On-Chain Truth Engine",
    ...overrides,
  };
}

describe("exact payment verifier", () => {
  it("verifies only the exact official-USDC Transfer and derives its payer", () => {
    const result = verifyInvoicePayment({ expected, evidence: evidence() });
    expect(result).toMatchObject({
      outcome: "verified",
      matchedTransfer: { from: payer, to: recipient, amountUnits },
    });
  });

  it.each([
    ["WRONG_CHAIN", { chainId: 8_453 }],
    ["WRONG_TRANSACTION_HASH", { txHash: `0x${"b".repeat(64)}` }],
    ["TRANSACTION_REVERTED", { status: "reverted" }],
    ["USDC_TRANSFER_NOT_FOUND", { transfers: [] }],
    [
      "WRONG_TOKEN",
      {
        transfers: [
          {
            token: "0x1111111111111111111111111111111111111111",
            from: payer,
            to: recipient,
            amountUnits,
            logIndex: 1,
          },
        ],
      },
    ],
    [
      "WRONG_RECIPIENT",
      {
        transfers: [
          {
            token: BASE_SEPOLIA_USDC_ADDRESS,
            from: payer,
            to: "0x2222222222222222222222222222222222222222",
            amountUnits,
            logIndex: 1,
          },
        ],
      },
    ],
    [
      "WRONG_AMOUNT",
      {
        transfers: [
          {
            token: BASE_SEPOLIA_USDC_ADDRESS,
            from: payer,
            to: recipient,
            amountUnits: "160307499",
            logIndex: 1,
          },
        ],
      },
    ],
  ] as const)("returns the final %s mismatch", (code, overrides) => {
    expect(
      verifyInvoicePayment({
        expected,
        evidence: evidence(overrides as Partial<TransactionEvidence>),
      }),
    ).toMatchObject({ outcome: "mismatch", code });
  });

  it.each([
    [
      "TRANSACTION_NOT_FOUND",
      { exists: false, lifecycle: "not_found", status: "not_found" },
    ],
    ["TRANSACTION_PENDING", { lifecycle: "pending", status: "pending" }],
  ] as const)("keeps %s retryable instead of issuing a mismatch", (code, overrides) => {
    expect(
      verifyInvoicePayment({
        expected,
        evidence: evidence(overrides as Partial<TransactionEvidence>),
      }),
    ).toMatchObject({ outcome: "unavailable", code });
  });

  it("does not outcome-shop when another unrelated transfer is also present", () => {
    const result = verifyInvoicePayment({
      expected,
      evidence: evidence({
        transfers: [
          {
            token: BASE_SEPOLIA_USDC_ADDRESS,
            from: payer,
            to: "0x2222222222222222222222222222222222222222",
            amountUnits,
            logIndex: 0,
          },
          evidence().transfers[0],
        ],
      }),
    });
    expect(result).toMatchObject({ outcome: "verified", matchedTransfer: { logIndex: 1 } });
  });
});
