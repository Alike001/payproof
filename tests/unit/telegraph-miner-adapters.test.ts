import { describe, expect, it, vi } from "vitest";
import fxNgn from "../fixtures/telegraph/fx-rate-mirror-ngn.json";
import fxEur from "../fixtures/telegraph/fx-rate-mirror-eur.json";
import fxGbp from "../fixtures/telegraph/fx-rate-mirror-gbp.json";
import preflightNgn from "../fixtures/telegraph/preflight-fx-ngn.json";
import truvianTx from "../fixtures/telegraph/truvian-base-sepolia-usdc.json";
import interlockTx from "../fixtures/telegraph/interlock-base-sepolia-usdc.json";
import { BASE_SEPOLIA_USDC_ADDRESS } from "@/lib/telegraph/constants";
import { parseFxRateMirror } from "@/lib/telegraph/miners/fx-rate-mirror";
import { parsePreflightFx } from "@/lib/telegraph/miners/preflight-fx";
import { parseTruvianTransaction } from "@/lib/telegraph/miners/truvian";
import { parseInterlockTransaction } from "@/lib/telegraph/miners/interlock";
import { runPrimaryBackup } from "@/lib/telegraph/miners/orchestration";
import {
  fxRateMirrorRequest,
  interlockTransactionRequest,
  preflightFxRequest,
  truvianTransactionRequest,
} from "@/lib/telegraph/miners/requests";

const knownTxHash =
  "0xe48e753799e30db9d85d1c4ec627bfff0f4117cd7a8c2beb2f8f8b9a13dac7d2";
const nowMs = Date.parse("2026-09-01T13:41:00.000Z");
const maxAgeMs = 15 * 60 * 1_000;

describe("FX Miner adapters", () => {
  it.each([
    ["NGN", fxNgn, "0.000748"],
    ["EUR", fxEur, "1.16"],
    ["GBP", fxGbp, "1.35"],
  ] as const)("normalizes fresh %s/USD mirror evidence", (currency, body, rate) => {
    const evidence = parseFxRateMirror({
      body,
      expectedMinerId: "20260827",
      currency,
      nowMs,
      maxAgeMs,
    });
    expect(evidence).toMatchObject({
      currency,
      quoteCurrency: "USD",
      rateToUsd: rate,
      minerId: "20260827",
    });
  });

  it("normalizes Preflight using the structured decimal string, not prose or a float", () => {
    const body = structuredClone(preflightNgn);
    Object.assign(body.result, {
      rate: 0,
      reason: "Rounded prose says 0.0 USD and must be ignored.",
    });
    const evidence = parsePreflightFx({
      body,
      expectedMinerId: "20260828",
      currency: "NGN",
      nowMs,
      maxAgeMs,
    });
    expect(evidence.rateToUsd).toBe("0.000747537");
    expect(evidence.observedAt).toBe("2026-09-01T13:40:30.234Z");
    expect(evidence.sourceAsOf).toBe("2026-09-01T00:02:31.000Z");
  });

  it("rejects wrong pairs, stale evidence, weak confidence, partial checks, and invalid rates", () => {
    const wrongPair = structuredClone(fxNgn);
    wrongPair.result.pair = "USD/NGN";
    expect(() =>
      parseFxRateMirror({
        body: wrongPair,
        expectedMinerId: "20260827",
        currency: "NGN",
        nowMs,
        maxAgeMs,
      }),
    ).toThrow(/different currency pair/i);

    const stale = structuredClone(fxNgn);
    stale.result.as_of = "2026-09-01T12:00:00Z";
    expect(() =>
      parseFxRateMirror({
        body: stale,
        expectedMinerId: "20260827",
        currency: "NGN",
        nowMs,
        maxAgeMs,
      }),
    ).toThrow(/stale/i);

    const weakConfidence = structuredClone(fxNgn);
    weakConfidence.result.confidence = 0.79;
    expect(() =>
      parseFxRateMirror({
        body: weakConfidence,
        expectedMinerId: "20260827",
        currency: "NGN",
        nowMs,
        maxAgeMs,
      }),
    ).toThrow(/confidence/i);

    const partial = structuredClone(fxNgn);
    partial.result.checks_passed = 3;
    expect(() =>
      parseFxRateMirror({
        body: partial,
        expectedMinerId: "20260827",
        currency: "NGN",
        nowMs,
        maxAgeMs,
      }),
    ).toThrow(/source checks/i);

    const invalid = structuredClone(fxNgn);
    invalid.result.rate = "-1";
    expect(() =>
      parseFxRateMirror({
        body: invalid,
        expectedMinerId: "20260827",
        currency: "NGN",
        nowMs,
        maxAgeMs,
      }),
    ).toThrow(/plain decimal/i);
  });

  it("rejects weak Preflight confidence", () => {
    const weakConfidence = structuredClone(preflightNgn);
    weakConfidence.result.confidence = 0.5;
    expect(() =>
      parsePreflightFx({
        body: weakConfidence,
        expectedMinerId: "20260828",
        currency: "NGN",
        nowMs,
        maxAgeMs,
      }),
    ).toThrow(/confidence/i);
  });
});

describe("transaction Miner adapters", () => {
  it("normalizes Truvian's Base Sepolia receipt and official-USDC transfers", () => {
    const evidence = parseTruvianTransaction({
      body: truvianTx,
      expectedMinerId: "8453",
      expectedTxHash: knownTxHash,
      nowMs,
      maxAgeMs,
    });
    expect(evidence).toMatchObject({
      chainId: 84_532,
      txHash: knownTxHash,
      lifecycle: "mined",
      status: "success",
      blockNumber: "46236673",
    });
    expect(evidence.transfers[0]).toMatchObject({
      token: BASE_SEPOLIA_USDC_ADDRESS,
      amountUnits: "500000",
      logIndex: 3,
    });
  });

  it("normalizes INTERLOCK to the same transaction evidence contract", () => {
    const evidence = parseInterlockTransaction({
      body: interlockTx,
      expectedMinerId: "9007",
      expectedTxHash: knownTxHash,
      nowMs,
      maxAgeMs,
    });
    expect(evidence).toMatchObject({
      chainId: 84_532,
      txHash: knownTxHash,
      lifecycle: "mined",
      status: "success",
      blockNumber: "46236673",
      evidenceScope: {
        receipt: true,
        logs: true,
        erc20Transfers: true,
      },
    });
    expect(evidence.transfers.map((transfer) => transfer.amountUnits)).toEqual([
      "500000",
      "2500",
    ]);
  });

  it("rejects wrong chain, wrong hash, malformed amount, and weak evidence scope", () => {
    const wrongChain = structuredClone(truvianTx);
    wrongChain.result.chainId = 8_453;
    wrongChain.result.chain = "base";
    expect(() =>
      parseTruvianTransaction({
        body: wrongChain,
        expectedMinerId: "8453",
        expectedTxHash: knownTxHash,
        nowMs,
        maxAgeMs,
      }),
    ).toThrow(/different chain/i);

    const wrongHash = structuredClone(interlockTx);
    wrongHash.result.txHash = `0x${"11".repeat(32)}`;
    expect(() =>
      parseInterlockTransaction({
        body: wrongHash,
        expectedMinerId: "9007",
        expectedTxHash: knownTxHash,
        nowMs,
        maxAgeMs,
      }),
    ).toThrow(/different transaction/i);

    const malformedAmount = structuredClone(truvianTx);
    malformedAmount.result.erc20Transfers[0].amount = "0.5";
    expect(() =>
      parseTruvianTransaction({
        body: malformedAmount,
        expectedMinerId: "8453",
        expectedTxHash: knownTxHash,
        nowMs,
        maxAgeMs,
      }),
    ).toThrow(/non-integer/i);

    const weakScope = structuredClone(interlockTx);
    weakScope.result.evidenceScope.erc20Transfers = false;
    expect(() =>
      parseInterlockTransaction({
        body: weakScope,
        expectedMinerId: "9007",
        expectedTxHash: knownTxHash,
        nowMs,
        maxAgeMs,
      }),
    ).toThrow(/inconsistent/i);
  });
});

describe("Miner request and fallback contracts", () => {
  it("builds only the version-controlled Miner endpoints", () => {
    expect(fxRateMirrorRequest("NGN")).toEqual({
      method: "GET",
      endpoint: "/rate",
      payload: { from: "NGN", to: "USD" },
    });
    expect(preflightFxRequest("EUR")).toEqual({
      method: "GET",
      endpoint: "/fx-rate",
      payload: { pair: "EUR/USD" },
    });
    expect(truvianTransactionRequest(knownTxHash)).toEqual({
      method: "GET",
      endpoint: "/tx",
      payload: { hash: knownTxHash, chain: "base-sepolia" },
    });
    expect(interlockTransactionRequest(knownTxHash)).toEqual({
      method: "POST",
      endpoint: "/miner/onchain-tx-lookup",
      payload: { chainId: 84_532, txHash: knownTxHash },
    });
  });

  it("does not call backup after any valid primary evidence", async () => {
    const primary = vi.fn().mockResolvedValue({ status: "reverted" });
    const backup = vi.fn().mockResolvedValue({ status: "success" });
    const result = await runPrimaryBackup({ primary, backup });
    expect(result).toMatchObject({
      available: true,
      role: "primary",
      evidence: { status: "reverted" },
    });
    expect(backup).not.toHaveBeenCalled();
  });

  it("uses backup only after primary failure and reports honest unavailability", async () => {
    const backupEvidence = { rateToUsd: "1.2" };
    const recovered = await runPrimaryBackup({
      primary: async () => {
        throw new Error("invalid evidence");
      },
      backup: async () => backupEvidence,
    });
    expect(recovered).toMatchObject({
      available: true,
      role: "backup",
      evidence: backupEvidence,
      failures: [{ role: "primary" }],
    });

    const unavailable = await runPrimaryBackup({
      primary: async () => {
        throw new Error("timeout");
      },
      backup: async () => {
        throw new Error("malformed");
      },
    });
    expect(unavailable).toMatchObject({
      available: false,
      failures: [{ role: "primary" }, { role: "backup" }],
    });
  });

  it("does not call backup when the caller marks a primary failure as unsafe to retry", async () => {
    const duplicate = Object.assign(new Error("already reserved"), {
      code: "DUPLICATE_ACTION",
    });
    const backup = vi.fn().mockResolvedValue({ rateToUsd: "1.2" });

    const result = await runPrimaryBackup({
      primary: async () => {
        throw duplicate;
      },
      backup,
      shouldTryBackup: (error) =>
        !(
          error instanceof Error &&
          "code" in error &&
          error.code === "DUPLICATE_ACTION"
        ),
    });

    expect(result).toMatchObject({
      available: false,
      failures: [{ role: "primary", code: "DUPLICATE_ACTION" }],
    });
    expect(backup).not.toHaveBeenCalled();
  });
});
