import { getAddress, type Address } from "viem";
import type { PublicQuoteDto } from "@/features/quotes/types";
import {
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_USDC_ADDRESS,
} from "@/lib/telegraph/constants";
import { MAX_SAFE_DATABASE_UNITS } from "@/lib/money";

export const USDC_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export type UsdcTransferRequest = {
  chainId: typeof BASE_SEPOLIA_CHAIN_ID;
  address: Address;
  abi: typeof USDC_TRANSFER_ABI;
  functionName: "transfer";
  args: readonly [Address, bigint];
};

export function buildUsdcTransferRequest(input: {
  quote: Pick<PublicQuoteDto, "usdcAmountUnits" | "expiresAt">;
  recipientAddress: string;
  nowMs?: number;
}): UsdcTransferRequest {
  const nowMs = input.nowMs ?? Date.now();
  const expiresAt = Date.parse(input.quote.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) {
    throw new Error("A current quote is required before payment.");
  }
  if (!/^[1-9]\d*$/.test(input.quote.usdcAmountUnits)) {
    throw new Error("The quote contains an invalid test-USDC amount.");
  }
  const units = BigInt(input.quote.usdcAmountUnits);
  if (units > MAX_SAFE_DATABASE_UNITS) {
    throw new Error("The quote amount exceeds PayProof's safe bound.");
  }

  return {
    chainId: BASE_SEPOLIA_CHAIN_ID,
    address: getAddress(BASE_SEPOLIA_USDC_ADDRESS),
    abi: USDC_TRANSFER_ABI,
    functionName: "transfer",
    args: [getAddress(input.recipientAddress), units],
  };
}
