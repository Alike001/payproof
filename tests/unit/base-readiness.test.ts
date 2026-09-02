// @vitest-environment node

import { TransactionReceiptNotFoundError } from "viem";
import { describe, expect, it, vi } from "vitest";
import { readBaseSepoliaReceiptReadiness } from "@/lib/base/public-client.server";

const txHash = `0x${"a".repeat(64)}` as const;

describe("Base Sepolia readiness-only client", () => {
  it("reports a mined RPC receipt without claiming payment verification", async () => {
    const result = await readBaseSepoliaReceiptReadiness(
      txHash,
      vi.fn().mockResolvedValue({
        transactionHash: txHash,
        blockNumber: 123n,
        status: "success",
      }),
    );
    expect(result).toEqual({
      kind: "mined",
      status: "success",
      blockNumber: "123",
    });
    expect(result).not.toHaveProperty("verified");
  });

  it("distinguishes not-yet-mined from an unavailable RPC", async () => {
    expect(
      await readBaseSepoliaReceiptReadiness(
        txHash,
        vi.fn().mockRejectedValue(new TransactionReceiptNotFoundError({ hash: txHash })),
      ),
    ).toEqual({ kind: "pending" });
    expect(
      await readBaseSepoliaReceiptReadiness(
        txHash,
        vi.fn().mockRejectedValue(new Error("RPC offline")),
      ),
    ).toEqual({ kind: "unavailable" });
  });
});
