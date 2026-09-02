import "server-only";
import {
  createPublicClient,
  http,
  TransactionReceiptNotFoundError,
  type Hash,
} from "viem";
import { baseSepolia } from "viem/chains";
import { transactionHashSchema } from "@/features/payments/model";

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

type ReceiptLookup = (hash: Hash) => Promise<{
  transactionHash: Hash;
  blockNumber: bigint;
  status: "success" | "reverted";
}>;

export type BaseSepoliaReadiness =
  | { kind: "pending" }
  | {
      kind: "mined";
      status: "success" | "reverted";
      blockNumber: string;
    }
  | { kind: "unavailable" };

export async function readBaseSepoliaReceiptReadiness(
  rawHash: string,
  receiptLookup: ReceiptLookup = async (hash) =>
    client.getTransactionReceipt({ hash }),
): Promise<BaseSepoliaReadiness> {
  const parsed = transactionHashSchema.safeParse(rawHash);
  if (!parsed.success) return { kind: "unavailable" };
  try {
    const receipt = await receiptLookup(parsed.data);
    if (receipt.transactionHash.toLowerCase() !== parsed.data) {
      return { kind: "unavailable" };
    }
    return {
      kind: "mined",
      status: receipt.status,
      blockNumber: receipt.blockNumber.toString(),
    };
  } catch (error) {
    if (error instanceof TransactionReceiptNotFoundError) {
      return { kind: "pending" };
    }
    return { kind: "unavailable" };
  }
}
