// @vitest-environment node

import { describe, expect, it } from "vitest";
import { summarizeJudgingRows } from "@/features/analytics/judging-summary.server";

describe("server-only judging summary", () => {
  it("counts unique people and outcomes without exposing identifiers", () => {
    const summary = summarizeJudgingRows({
      invoices: [{ creator_user_id: "creator-a" }, { creator_user_id: "creator-a" }],
      payments: [
        { submitted_by_wallet: "0xABC", state: "verified" },
        { submitted_by_wallet: "0xabc", state: "mismatch" },
      ],
      quoteCount: 3,
      usageEvents: [
        { anonymous_session_hash: "viewer-a", actor_wallet_hash: null, event_name: "invoice_viewed", traffic_source: "internal" },
        { anonymous_session_hash: "viewer-a", actor_wallet_hash: null, event_name: "invoice_viewed", traffic_source: "internal" },
        { anonymous_session_hash: "viewer-b", actor_wallet_hash: null, event_name: "receipt_viewed", traffic_source: "recruited" },
      ],
      telegraphCalls: [
        { intent: "CURRENCY_EXCHANGE", status: "paid_success", x402_amount_units: 10_000 },
        { intent: "ONCHAIN_TX_LOOKUP", status: "paid_success", x402_amount_units: 10_000 },
      ],
      now: new Date("2026-09-03T12:00:00Z"),
    });
    expect(summary).toMatchObject({
      creators: 1,
      payerWallets: 1,
      invoices: 2,
      quotes: 3,
      paymentAttempts: 2,
      paymentOutcomes: { verified: 1, mismatch: 1 },
      publicViewers: 2,
      usageBySource: { internal: 2, recruited: 1 },
      telegraph: {
        calls: 2,
        paidSuccessfulCalls: 2,
        testUsdcUnitsSpent: "20000",
        minerLeaderboardVolumeClaimed: false,
      },
    });
    expect(JSON.stringify(summary)).not.toContain("viewer-a");
    expect(JSON.stringify(summary)).not.toContain("creator-a");
  });
});
