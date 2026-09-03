// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  internalWalletSet,
  privacyHash,
  trafficSourceForWallet,
  usageDedupeKey,
} from "@/features/analytics/model";

const wallet = "0x1111111111111111111111111111111111111111";

describe("privacy-safe analytics model", () => {
  it("creates stable one-way identifiers without retaining the input", () => {
    const hash = privacyHash("a".repeat(32), "wallet", wallet);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(wallet);
  });

  it("deduplicates the same event bucket but separates dates", () => {
    const base = {
      secret: "a".repeat(32),
      event: "invoice_viewed" as const,
      identityHash: "b".repeat(64),
      invoiceId: "invoice-1",
    };
    expect(usageDedupeKey({ ...base, bucket: "2026-09-03" })).toBe(
      usageDedupeKey({ ...base, bucket: "2026-09-03" }),
    );
    expect(usageDedupeKey({ ...base, bucket: "2026-09-03" })).not.toBe(
      usageDedupeKey({ ...base, bucket: "2026-09-04" }),
    );
  });

  it("tags only configured valid wallets as internal", () => {
    expect(internalWalletSet(`invalid, ${wallet}`).size).toBe(1);
    expect(trafficSourceForWallet(wallet, wallet, "recruited")).toBe("internal");
    expect(
      trafficSourceForWallet(
        "0x2222222222222222222222222222222222222222",
        wallet,
        "recruited",
      ),
    ).toBe("recruited");
  });
});
