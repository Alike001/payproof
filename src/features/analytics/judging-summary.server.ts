import "server-only";
import { getAdminDatabaseClient } from "@/lib/database/admin.server";

export type JudgingSummary = {
  generatedAt: string;
  creators: number;
  payerWallets: number;
  invoices: number;
  quotes: number;
  paymentAttempts: number;
  paymentOutcomes: Record<"submitted" | "unavailable" | "mismatch" | "verified", number>;
  verifiedReceipts: number;
  publicViewers: number;
  usageBySource: Record<"internal" | "recruited" | "organic" | "unknown", number>;
  telegraph: {
    calls: number;
    paidSuccessfulCalls: number;
    testUsdcUnitsSpent: string;
    intents: Record<string, number>;
    minerLeaderboardVolumeClaimed: false;
    note: string;
  };
};

export function summarizeJudgingRows(input: {
  invoices: Array<{ creator_user_id: string }>;
  payments: Array<{ submitted_by_wallet: string; state: string }>;
  quoteCount: number;
  usageEvents: Array<{
    anonymous_session_hash: string | null;
    actor_wallet_hash: string | null;
    event_name: string;
    traffic_source: string;
  }>;
  telegraphCalls: Array<{
    intent: string;
    status: string;
    x402_amount_units: number | null;
  }>;
  now?: Date;
}): JudgingSummary {
  const outcomes = { submitted: 0, unavailable: 0, mismatch: 0, verified: 0 };
  for (const payment of input.payments) {
    if (payment.state in outcomes) {
      outcomes[payment.state as keyof typeof outcomes] += 1;
    }
  }
  const source = { internal: 0, recruited: 0, organic: 0, unknown: 0 };
  const viewers = new Set<string>();
  for (const event of input.usageEvents) {
    if (event.traffic_source in source) {
      source[event.traffic_source as keyof typeof source] += 1;
    }
    if (event.event_name === "invoice_viewed" || event.event_name === "receipt_viewed") {
      const identity = event.anonymous_session_hash ?? event.actor_wallet_hash;
      if (identity) viewers.add(identity);
    }
  }
  const intents: Record<string, number> = {};
  let paidSuccessfulCalls = 0;
  let spent = 0n;
  for (const call of input.telegraphCalls) {
    intents[call.intent] = (intents[call.intent] ?? 0) + 1;
    if (call.status === "paid_success") paidSuccessfulCalls += 1;
    if (call.x402_amount_units) spent += BigInt(call.x402_amount_units);
  }
  return {
    generatedAt: (input.now ?? new Date()).toISOString(),
    creators: new Set(input.invoices.map((row) => row.creator_user_id)).size,
    payerWallets: new Set(
      input.payments.map((row) => row.submitted_by_wallet.toLowerCase()),
    ).size,
    invoices: input.invoices.length,
    quotes: input.quoteCount,
    paymentAttempts: input.payments.length,
    paymentOutcomes: outcomes,
    verifiedReceipts: outcomes.verified,
    publicViewers: viewers.size,
    usageBySource: source,
    telegraph: {
      calls: input.telegraphCalls.length,
      paidSuccessfulCalls,
      testUsdcUnitsSpent: spent.toString(),
      intents,
      minerLeaderboardVolumeClaimed: false,
      note: "Direct Miner/x402 calls prove application integration; PayProof does not claim them as Miner leaderboard volume.",
    },
  };
}

export async function getJudgingSummary(): Promise<JudgingSummary> {
  const database = getAdminDatabaseClient();
  const [invoices, payments, quotes, usage, calls] = await Promise.all([
    database.from("invoices").select("creator_user_id"),
    database.from("payments").select("submitted_by_wallet,state"),
    database.from("quotes").select("id", { count: "exact", head: true }),
    database
      .from("usage_events")
      .select("anonymous_session_hash,actor_wallet_hash,event_name,traffic_source"),
    database.from("telegraph_calls").select("intent,status,x402_amount_units"),
  ]);
  const error =
    invoices.error ?? payments.error ?? quotes.error ?? usage.error ?? calls.error;
  if (error) throw new Error("Judging summary is temporarily unavailable.");
  return summarizeJudgingRows({
    invoices: invoices.data ?? [],
    payments: payments.data ?? [],
    quoteCount: quotes.count ?? 0,
    usageEvents: usage.data ?? [],
    telegraphCalls: calls.data ?? [],
  });
}
