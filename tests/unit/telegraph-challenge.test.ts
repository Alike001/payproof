import { describe, expect, it } from "vitest";
import {
  TelegraphPolicyError,
  validateX402Challenge,
} from "@/lib/telegraph/challenge-policy";
import {
  BASE_SEPOLIA_USDC_ADDRESS,
  TELEGRAPH_X402_NETWORK,
} from "@/lib/telegraph/constants";

const origin = "https://devnode.telegraphprotocol.com";
const requestUrl = `${origin}/engine/v1/ask/8453`;

function challenge(overrides: Record<string, unknown> = {}) {
  return {
    x402Version: 2,
    resource: { url: requestUrl },
    accepts: [
      {
        scheme: "exact",
        network: TELEGRAPH_X402_NETWORK as string,
        asset: BASE_SEPOLIA_USDC_ADDRESS as string,
        amount: "10000",
        payTo: "0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8",
        maxTimeoutSeconds: 60,
        extra: { name: "USDC", version: "2" },
      },
    ],
    ...overrides,
  };
}

function validate(value: unknown, overrides: Record<string, unknown> = {}) {
  return validateX402Challenge({
    challenge: value,
    requestUrl,
    allowedOrigin: origin,
    maxAmountUnits: 50_000n,
    ...overrides,
  });
}

function expectCode(run: () => unknown, code: TelegraphPolicyError["code"]) {
  try {
    run();
    throw new Error("Expected policy validation to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(TelegraphPolicyError);
    expect((error as TelegraphPolicyError).code).toBe(code);
  }
}

describe("Telegraph x402 challenge policy", () => {
  it("accepts only the official Base Sepolia USDC option and narrows signer input", () => {
    const result = validate(challenge());
    expect(result.amountUnits).toBe(10_000n);
    expect(result.paymentRequired.accepts).toHaveLength(1);
    expect(result.requirement.network).toBe("eip155:84532");
  });

  it("accepts only Telegraph's observed same-host reverse-proxy resource rewrite", () => {
    const result = validate(
      challenge({
        resource: { url: "http://devnode.telegraphprotocol.com/v1/ask/8453" },
      }),
    );
    expect(result.requirement.amount).toBe("10000");

    expectCode(
      () =>
        validate(
          challenge({
            resource: { url: "http://devnode.telegraphprotocol.com/v1/ask/9007" },
          }),
        ),
      "UNTRUSTED_ORIGIN",
    );
  });

  it.each(["eip155:8453", "solana:devnet", "eip155:1"])(
    "rejects unsupported network %s before signing",
    (network) => {
      const value = challenge();
      value.accepts[0].network = network;
      expectCode(() => validate(value), "UNSUPPORTED_NETWORK");
    },
  );

  it("rejects a non-official asset before signing", () => {
    const value = challenge();
    value.accepts[0].asset = "0x1111111111111111111111111111111111111111";
    expectCode(() => validate(value), "UNSUPPORTED_ASSET");
  });

  it("rejects an invalid asset or payment recipient", () => {
    const badAsset = challenge();
    badAsset.accepts[0].asset = "USDC";
    expectCode(() => validate(badAsset), "UNSUPPORTED_ASSET");

    const badRecipient = challenge();
    badRecipient.accepts[0].payTo = "not-an-address";
    expectCode(() => validate(badRecipient), "INVALID_CHALLENGE");
  });

  it("rejects a resource or request outside the configured HTTPS origin", () => {
    expectCode(
      () =>
        validate(
          challenge({ resource: { url: "https://evil.example/engine/v1/ask/8453" } }),
        ),
      "UNTRUSTED_ORIGIN",
    );
    expectCode(
      () => validate(challenge(), { requestUrl: "https://evil.example/ask" }),
      "UNTRUSTED_ORIGIN",
    );
    expectCode(
      () => validate(challenge(), { allowedOrigin: "http://devnode.telegraphprotocol.com" }),
      "UNTRUSTED_ORIGIN",
    );
  });

  it("rejects zero, malformed, and over-cap amounts", () => {
    const zero = challenge();
    zero.accepts[0].amount = "0";
    expectCode(() => validate(zero), "INVALID_AMOUNT");

    const malformed = challenge();
    malformed.accepts[0].amount = "0.01";
    expectCode(() => validate(malformed), "INVALID_CHALLENGE");

    const overCap = challenge();
    overCap.accepts[0].amount = "50001";
    expectCode(() => validate(overCap), "CALL_CAP_EXCEEDED");
  });

  it("honors a configured cap below the hard cap", () => {
    expectCode(
      () => validate(challenge(), { maxAmountUnits: 9_999n }),
      "CALL_CAP_EXCEEDED",
    );
  });

  it("rejects unsupported versions and malformed envelopes", () => {
    expectCode(
      () => validate(challenge({ x402Version: 1 })),
      "UNSUPPORTED_X402_VERSION",
    );
    expectCode(() => validate({ accepts: [] }), "INVALID_CHALLENGE");
  });
});
