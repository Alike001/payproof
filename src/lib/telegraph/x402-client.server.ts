import "server-only";
import { x402Client, x402HTTPClient } from "@x402/core/client";
import type {
  PaymentRequired,
  SettleResponse,
} from "@x402/core/types";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import { getServerEnv } from "@/lib/env.server";
import {
  BASE_SEPOLIA_USDC_ADDRESS,
  TELEGRAPH_REQUEST_TIMEOUT_MS,
  TELEGRAPH_X402_NETWORK,
} from "@/lib/telegraph/constants";
import {
  buildDirectAskUrl,
  createDirectAskEnvelope,
} from "@/lib/telegraph/direct-ask";
import { telegraphSpendStore } from "@/lib/telegraph/store.server";
import {
  executeSpendSafeDirectAsk,
  type SpendSafeDirectAskInput,
  type X402Codec,
} from "@/lib/telegraph/transport";
import type {
  DirectAskEnvelope,
  X402SettlementProof,
} from "@/lib/telegraph/types";

function createCodec(): X402Codec {
  const environment = getServerEnv();
  const account = privateKeyToAccount(
    environment.TELEGRAPH_EVM_PRIVATE_KEY as `0x${string}`,
  );
  const client = new x402Client()
    .register(TELEGRAPH_X402_NETWORK, new ExactEvmScheme(account))
    .setSpendControls({
      maxAmountPerPayment: "$0.05",
      allowedAssets: [
        {
          network: TELEGRAPH_X402_NETWORK,
          asset: BASE_SEPOLIA_USDC_ADDRESS,
          maxAmountPerPayment: environment.X402_MAX_CALL_USDC_UNITS.toString(),
        },
      ],
    })
    .registerPolicy((_version, requirements) =>
      requirements.filter(
        (requirement) =>
          requirement.network === TELEGRAPH_X402_NETWORK &&
          requirement.asset.toLowerCase() === BASE_SEPOLIA_USDC_ADDRESS.toLowerCase() &&
          BigInt(requirement.amount) <= environment.X402_MAX_CALL_USDC_UNITS,
      ),
    );
  const httpClient = new x402HTTPClient(client);

  return {
    parseChallenge(headers, body) {
      return httpClient.getPaymentRequiredResponse(
        (name) => headers.get(name),
        body,
      );
    },
    async createPaymentHeaders(challenge) {
      const payment = await httpClient.createPaymentPayload(
        challenge as PaymentRequired,
      );
      return httpClient.encodePaymentSignatureHeader(payment);
    },
    parseSettlement(headers) {
      try {
        const proof = httpClient.getPaymentSettleResponse(
          (name) => headers.get(name),
        ) as SettleResponse;
        return {
          success: proof.success,
          transaction: proof.transaction,
          network: proof.network,
          amount: proof.amount,
          payer: proof.payer,
          errorReason: proof.errorReason,
        } satisfies X402SettlementProof;
      } catch {
        return null;
      }
    },
  };
}

export type AskTelegraphMinerInput = Omit<
  SpendSafeDirectAskInput,
  | "requestUrl"
  | "envelope"
  | "allowedOrigin"
  | "maxAmountUnits"
  | "dailyBudgetUnits"
  | "timeoutMs"
> & {
  envelope: DirectAskEnvelope;
};

export async function askTelegraphMiner(input: AskTelegraphMinerInput) {
  const environment = getServerEnv();
  const requestUrl = buildDirectAskUrl(
    environment.TELEGRAPH_NODE_URL,
    input.minerId,
  );
  return executeSpendSafeDirectAsk(
    {
      ...input,
      requestUrl,
      envelope: createDirectAskEnvelope(input.envelope),
      allowedOrigin: new URL(environment.TELEGRAPH_NODE_URL).origin,
      maxAmountUnits: environment.X402_MAX_CALL_USDC_UNITS,
      dailyBudgetUnits: environment.X402_DAILY_BUDGET_USDC_UNITS,
      timeoutMs: TELEGRAPH_REQUEST_TIMEOUT_MS,
    },
    {
      fetcher: fetch,
      codec: createCodec(),
      store: telegraphSpendStore,
    },
  );
}
