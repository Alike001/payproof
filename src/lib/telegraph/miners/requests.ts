import { z } from "zod";
import type { DirectAskEnvelope } from "@/lib/telegraph/types";
import type { FxCurrency } from "@/lib/telegraph/miners/types";

const fxCurrencySchema = z.enum(["NGN", "EUR", "GBP"]);
const txHashSchema = z.string().regex(/^0x[0-9a-fA-F]{64}$/);

export function fxRateMirrorRequest(currency: FxCurrency): DirectAskEnvelope {
  const from = fxCurrencySchema.parse(currency);
  return {
    method: "GET",
    endpoint: "/rate",
    payload: { from, to: "USD" },
  };
}

export function preflightFxRequest(currency: FxCurrency): DirectAskEnvelope {
  const from = fxCurrencySchema.parse(currency);
  return {
    method: "GET",
    endpoint: "/fx-rate",
    payload: { pair: `${from}/USD` },
  };
}

export function truvianTransactionRequest(txHash: string): DirectAskEnvelope {
  const hash = txHashSchema.parse(txHash).toLowerCase();
  return {
    method: "GET",
    endpoint: "/tx",
    payload: { hash, chain: "base-sepolia" },
  };
}

export function interlockTransactionRequest(txHash: string): DirectAskEnvelope {
  const hash = txHashSchema.parse(txHash).toLowerCase();
  return {
    method: "POST",
    endpoint: "/miner/onchain-tx-lookup",
    payload: { chainId: 84_532, txHash: hash },
  };
}
