import { describe, expect, it, vi } from "vitest";
import {
  BASE_SEPOLIA_USDC_ADDRESS,
  TELEGRAPH_X402_NETWORK,
} from "@/lib/telegraph/constants";
import {
  executeSpendSafeDirectAsk,
  TelegraphTransportError,
  type TelegraphSpendStore,
  type X402Codec,
} from "@/lib/telegraph/transport";

const requestUrl = new URL(
  "https://devnode.telegraphprotocol.com/engine/v1/ask/8453",
);
const paymentRequired = {
  x402Version: 2,
  resource: { url: requestUrl.toString() },
  accepts: [
    {
      scheme: "exact",
      network: TELEGRAPH_X402_NETWORK,
      asset: BASE_SEPOLIA_USDC_ADDRESS,
      amount: "10000",
      payTo: "0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8",
      maxTimeoutSeconds: 60,
      extra: { name: "USDC", version: "2" },
    },
  ],
};

function input() {
  return {
    requestUrl,
    envelope: {
      method: "GET" as const,
      endpoint: "/tx" as const,
      payload: { hash: "0x123" },
    },
    actionKey: "verify:payment-id",
    paymentId: "00000000-0000-0000-0000-000000000001",
    intent: "ONCHAIN_TX_LOOKUP" as const,
    minerId: "8453",
    minerName: "Truvian",
    attemptRole: "primary" as const,
    requestSanitized: { hash: "0x123" },
    allowedOrigin: requestUrl.origin,
    maxAmountUnits: 50_000n,
    dailyBudgetUnits: 5_000_000n,
    timeoutMs: 1_000,
  };
}

function dependencies(options: {
  reservation?: { callId: string; reserved: boolean; callStatus: string };
  paidStatus?: number;
  settlement?: unknown;
  signingError?: Error;
} = {}) {
  const reservation = options.reservation ?? {
    callId: "call-id",
    reserved: true,
    callStatus: "started",
  };
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "payment required" }), { status: 402 }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ result: { found: true } }), {
        status: options.paidStatus ?? 200,
      }),
    );
  const createPaymentHeaders = options.signingError
    ? vi.fn().mockRejectedValue(options.signingError)
    : vi.fn().mockResolvedValue({ "PAYMENT-SIGNATURE": "never-persist-this" });
  const codec: X402Codec = {
    parseChallenge: vi.fn().mockReturnValue(paymentRequired),
    createPaymentHeaders,
    parseSettlement: vi.fn().mockReturnValue(
      options.settlement === undefined
        ? {
            success: true,
            transaction: "0xsettlement",
            network: TELEGRAPH_X402_NETWORK,
            amount: "10000",
          }
        : options.settlement,
    ),
  };
  const store: TelegraphSpendStore = {
    reserve: vi.fn().mockResolvedValue(reservation),
    finalize: vi.fn().mockResolvedValue(undefined),
  };
  return { fetcher, codec, store };
}

async function expectTransportCode(
  promise: Promise<unknown>,
  code: TelegraphTransportError["code"],
) {
  await expect(promise).rejects.toMatchObject({ code });
}

describe("spend-safe Telegraph transport", () => {
  it("reserves before signing, pays once, and persists only normalized proof", async () => {
    const deps = dependencies();
    const result = await executeSpendSafeDirectAsk(input(), deps);
    expect(result.callId).toBe("call-id");
    expect(deps.store.reserve).toHaveBeenCalledOnce();
    expect(deps.codec.createPaymentHeaders).toHaveBeenCalledOnce();
    expect(vi.mocked(deps.store.reserve).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(deps.codec.createPaymentHeaders).mock.invocationCallOrder[0],
    );
    expect(deps.fetcher).toHaveBeenCalledTimes(2);
    expect(deps.store.finalize).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "paid_success",
        settlement: expect.objectContaining({ transaction: "0xsettlement" }),
      }),
    );
    expect(JSON.stringify(vi.mocked(deps.store.finalize).mock.calls)).not.toContain(
      "never-persist-this",
    );
  });

  it("stops before signing when the daily budget is exhausted", async () => {
    const deps = dependencies({
      reservation: {
        callId: "budget-id",
        reserved: false,
        callStatus: "rejected_budget",
      },
    });
    await expectTransportCode(
      executeSpendSafeDirectAsk(input(), deps),
      "BUDGET_EXHAUSTED",
    );
    expect(deps.codec.createPaymentHeaders).not.toHaveBeenCalled();
    expect(deps.fetcher).toHaveBeenCalledOnce();
  });

  it("stops before signing when the same action role was already reserved", async () => {
    const deps = dependencies({
      reservation: {
        callId: "existing-id",
        reserved: false,
        callStatus: "started",
      },
    });
    await expectTransportCode(
      executeSpendSafeDirectAsk(input(), deps),
      "DUPLICATE_ACTION",
    );
    expect(deps.codec.createPaymentHeaders).not.toHaveBeenCalled();
  });

  it("rejects an invalid challenge before reserving or signing", async () => {
    const deps = dependencies();
    vi.mocked(deps.codec.parseChallenge).mockReturnValue({
      ...paymentRequired,
      accepts: [
        { ...paymentRequired.accepts[0], network: "eip155:8453" },
      ],
    });
    await expect(executeSpendSafeDirectAsk(input(), deps)).rejects.toMatchObject({
      code: "UNSUPPORTED_NETWORK",
    });
    expect(deps.store.reserve).not.toHaveBeenCalled();
    expect(deps.codec.createPaymentHeaders).not.toHaveBeenCalled();
  });

  it("records signing failure as unpaid without exposing the secret", async () => {
    const deps = dependencies({
      signingError: new Error(`bad signature 0x${"ab".repeat(64)}`),
    });
    await expectTransportCode(
      executeSpendSafeDirectAsk(input(), deps),
      "PAYMENT_CREATION_FAILED",
    );
    expect(deps.store.finalize).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "unpaid_error",
        errorMessage: expect.not.stringContaining("abababababababab"),
      }),
    );
  });

  it("records a rejected paid request as paid_error and never retries it", async () => {
    const deps = dependencies({ paidStatus: 500 });
    await expectTransportCode(
      executeSpendSafeDirectAsk(input(), deps),
      "PAID_REQUEST_FAILED",
    );
    expect(deps.fetcher).toHaveBeenCalledTimes(2);
    expect(deps.store.finalize).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "paid_error",
        responseSanitized: { result: { found: true } },
      }),
    );
  });

  it("fails closed when settlement proof is absent or mismatched", async () => {
    for (const settlement of [
      null,
      { success: false, transaction: "0x1", network: TELEGRAPH_X402_NETWORK },
      { success: true, transaction: "0x1", network: "eip155:8453" },
      {
        success: true,
        transaction: "0x1",
        network: TELEGRAPH_X402_NETWORK,
        amount: "9999",
      },
    ]) {
      const deps = dependencies({ settlement });
      await expect(executeSpendSafeDirectAsk(input(), deps)).rejects.toBeInstanceOf(
        TelegraphTransportError,
      );
      expect(deps.store.finalize).toHaveBeenCalledWith(
        expect.objectContaining({ status: "paid_error" }),
      );
    }
  });

  it("does not reserve or sign when the first response is not a 402 challenge", async () => {
    const deps = dependencies();
    vi.mocked(deps.fetcher).mockReset().mockResolvedValue(
      new Response(JSON.stringify({ result: "unexpected free result" }), { status: 200 }),
    );
    await expectTransportCode(
      executeSpendSafeDirectAsk(input(), deps),
      "PAYMENT_REQUIRED_MISSING",
    );
    expect(deps.store.reserve).not.toHaveBeenCalled();
    expect(deps.codec.createPaymentHeaders).not.toHaveBeenCalled();
  });
});
