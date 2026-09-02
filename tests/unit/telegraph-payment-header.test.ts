import { describe, expect, it } from "vitest";
import { x402Client, x402HTTPClient } from "@x402/core/client";
import type { PaymentRequired } from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const paymentRequired = {
  x402Version: 2,
  resource: {
    url: "http://devnode.telegraphprotocol.com/v1/ask/20260827",
    description: "Telegraph inference",
    mimeType: "application/json",
  },
  accepts: [
    {
      scheme: "exact",
      network: "eip155:84532",
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      amount: "10000",
      payTo: "0x5a2324aA18613FAD4e44bDF0d6c73Ec1f6D87ff8",
      maxTimeoutSeconds: 60,
      extra: { name: "USDC", version: "2" },
    },
  ],
  extensions: {},
} satisfies PaymentRequired;

describe("Telegraph x402 payment header", () => {
  it("uses the standard x402 v2 EVM payload without a custom envelope", async () => {
    const signer = privateKeyToAccount(
      `0x${"11".repeat(32)}` as `0x${string}`,
    );
    const client = new x402Client().register(
      "eip155:84532",
      new ExactEvmScheme(signer),
    );
    const httpClient = new x402HTTPClient(client);
    const payment = await httpClient.createPaymentPayload(paymentRequired);
    const headers = httpClient.encodePaymentSignatureHeader(payment);
    expect(Object.keys(headers)).toEqual(["PAYMENT-SIGNATURE"]);

    const decoded = JSON.parse(
      Buffer.from(headers["PAYMENT-SIGNATURE"], "base64").toString("utf8"),
    );
    expect(decoded).toMatchObject({
      x402Version: 2,
      accepted: paymentRequired.accepts[0],
      payload: {
        authorization: {
          from: signer.address,
          to: paymentRequired.accepts[0].payTo,
          value: "10000",
          validAfter: "0",
          nonce: expect.stringMatching(/^0x[0-9a-f]{64}$/),
        },
        signature: expect.stringMatching(/^0x[0-9a-f]{130}$/),
      },
      resource: paymentRequired.resource,
      extensions: {},
    });
    expect(decoded).not.toHaveProperty("scheme");
    expect(decoded).not.toHaveProperty("network");
  });
});
