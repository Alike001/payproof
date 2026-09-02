import { loadEnvConfig } from "@next/env";
import { describe, expect, it } from "vitest";

loadEnvConfig(process.cwd(), true);

const requiredNonemptyEnvironment = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID",
  "SUPABASE_SECRET_KEY",
  "TELEGRAPH_NODE_URL",
  "TELEGRAPH_EVM_PRIVATE_KEY",
  "X402_MAX_CALL_USDC_UNITS",
  "X402_DAILY_BUDGET_USDC_UNITS",
  "FX_MAX_SOURCE_AGE_MINUTES",
  "ANALYTICS_HASH_SECRET",
] as const;
const missingLiveEnvironment = requiredNonemptyEnvironment.filter(
  (name) => (process.env[name]?.trim().length ?? 0) === 0,
);
const internalWalletsConfigured =
  process.env.INTERNAL_TEST_WALLETS !== undefined;
const liveEnabled =
  process.env.RUN_LIVE_TELEGRAPH_TESTS === "1" &&
  missingLiveEnvironment.length === 0 &&
  internalWalletsConfigured;

if (process.env.RUN_LIVE_TELEGRAPH_TESTS === "1" && !liveEnabled) {
  const missing = [
    ...missingLiveEnvironment,
    ...(internalWalletsConfigured ? [] : ["INTERNAL_TEST_WALLETS"]),
  ];
  console.warn(`Live Telegraph tests skipped; missing: ${missing.join(", ")}`);
}

const knownTxHash =
  "0xe48e753799e30db9d85d1c4ec627bfff0f4117cd7a8c2beb2f8f8b9a13dac7d2";

describe.skipIf(!liveEnabled)("paid live Telegraph Miner smoke tests", () => {
  it.each(["NGN", "EUR", "GBP"] as const)(
    "buys and validates %s from FX Rate Mirror",
    async (currency) => {
      const [
        { askTelegraphMiner },
        { fxRateMirrorRequest },
        { parseFxRateMirror },
      ] = await Promise.all([
        import("@/lib/telegraph/x402-client.server"),
        import("@/lib/telegraph/miners/requests"),
        import("@/lib/telegraph/miners/fx-rate-mirror"),
      ]);
      const nowMs = Date.now();
      const response = await askTelegraphMiner({
        actionKey: `live:fx-mirror:${currency}:${nowMs}`,
        intent: "CURRENCY_EXCHANGE",
        minerId: "20260827",
        minerName: "FX Rate Mirror",
        attemptRole: "primary",
        requestSanitized: { currency, quoteCurrency: "USD", liveSmoke: true },
        envelope: fxRateMirrorRequest(currency),
      });
      const evidence = parseFxRateMirror({
        body: response.body,
        expectedMinerId: "20260827",
        currency,
        nowMs: Date.now(),
        maxAgeMs: 15 * 60 * 1_000,
      });
      expect(evidence.rateToUsd).toMatch(/^\d+(?:\.\d+)?$/);
      expect(response.settlement).toMatchObject({
        success: true,
        network: "eip155:84532",
      });
    },
    45_000,
  );

  it("buys and validates Preflight FX backup evidence", async () => {
    const [{ askTelegraphMiner }, { preflightFxRequest }, { parsePreflightFx }] =
      await Promise.all([
        import("@/lib/telegraph/x402-client.server"),
        import("@/lib/telegraph/miners/requests"),
        import("@/lib/telegraph/miners/preflight-fx"),
      ]);
    const nowMs = Date.now();
    const response = await askTelegraphMiner({
      actionKey: `live:fx-preflight:NGN:${nowMs}`,
      intent: "CURRENCY_EXCHANGE",
      minerId: "20260828",
      minerName: "PREFLIGHT Infrastructure Signals",
      attemptRole: "backup",
      requestSanitized: { currency: "NGN", quoteCurrency: "USD", liveSmoke: true },
      envelope: preflightFxRequest("NGN"),
    });
    expect(
      parsePreflightFx({
        body: response.body,
        expectedMinerId: "20260828",
        currency: "NGN",
        nowMs: Date.now(),
        maxAgeMs: 15 * 60 * 1_000,
      }).rateToUsd,
    ).toMatch(/^\d+(?:\.\d+)?$/);
    expect(response.settlement.transaction).toBeTruthy();
  }, 45_000);

  it("buys and validates both Base Sepolia transaction Miners", async () => {
    const [
      { askTelegraphMiner },
      { truvianTransactionRequest, interlockTransactionRequest },
      { parseTruvianTransaction },
      { parseInterlockTransaction },
    ] = await Promise.all([
      import("@/lib/telegraph/x402-client.server"),
      import("@/lib/telegraph/miners/requests"),
      import("@/lib/telegraph/miners/truvian"),
      import("@/lib/telegraph/miners/interlock"),
    ]);
    const cases = [
      {
        minerId: "8453",
        minerName: "Truvian Exact On-Chain Truth Engine",
        role: "primary" as const,
        envelope: truvianTransactionRequest(knownTxHash),
        parse: parseTruvianTransaction,
      },
      {
        minerId: "9007",
        minerName: "INTERLOCK On-Chain Transaction Lookup",
        role: "backup" as const,
        envelope: interlockTransactionRequest(knownTxHash),
        parse: parseInterlockTransaction,
      },
    ];
    for (const entry of cases) {
      const nowMs = Date.now();
      const response = await askTelegraphMiner({
        actionKey: `live:tx:${entry.minerId}:${nowMs}`,
        intent: "ONCHAIN_TX_LOOKUP",
        minerId: entry.minerId,
        minerName: entry.minerName,
        attemptRole: entry.role,
        requestSanitized: { chainId: 84_532, txHash: knownTxHash, liveSmoke: true },
        envelope: entry.envelope,
      });
      const evidence = entry.parse({
        body: response.body,
        expectedMinerId: entry.minerId,
        expectedTxHash: knownTxHash,
        nowMs: Date.now(),
        maxAgeMs: 5 * 60 * 1_000,
      });
      expect(evidence).toMatchObject({
        chainId: 84_532,
        txHash: knownTxHash,
        lifecycle: "mined",
        status: "success",
      });
      expect(evidence.transfers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
            amountUnits: "500000",
          }),
        ]),
      );
      expect(response.settlement.transaction).toBeTruthy();
    }
  }, 90_000);
});
