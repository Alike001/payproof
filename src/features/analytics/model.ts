import { createHmac } from "node:crypto";
import { z } from "zod";
import { normalizeAddress } from "@/lib/address";

export const usageEventNameSchema = z.enum([
  "landing_view",
  "creator_signed_in",
  "invoice_created",
  "invoice_viewed",
  "invoice_shared",
  "invoice_cancelled",
  "quote_requested",
  "quote_ready",
  "payment_started",
  "payment_submitted",
  "verification_requested",
  "payment_verified",
  "payment_mismatch",
  "verification_unavailable",
  "receipt_viewed",
]);

export type UsageEventName = z.infer<typeof usageEventNameSchema>;
export type TrafficSource = "internal" | "recruited" | "organic" | "unknown";

export function privacyHash(secret: string, namespace: string, value: string) {
  return createHmac("sha256", secret)
    .update(`${namespace}:${value}`)
    .digest("hex");
}

export function internalWalletSet(raw: string): Set<string> {
  const wallets = new Set<string>();
  for (const entry of raw.split(",")) {
    if (!entry.trim()) continue;
    try {
      wallets.add(normalizeAddress(entry.trim()));
    } catch {
      // Ignore malformed configuration entries instead of weakening matching.
    }
  }
  return wallets;
}

export function trafficSourceForWallet(
  wallet: string | null,
  configuredInternalWallets: string,
  requestedSource: Exclude<TrafficSource, "internal"> = "unknown",
): TrafficSource {
  if (!wallet) return requestedSource;
  try {
    return internalWalletSet(configuredInternalWallets).has(normalizeAddress(wallet))
      ? "internal"
      : requestedSource;
  } catch {
    return requestedSource;
  }
}

export function usageDedupeKey(input: {
  secret: string;
  event: UsageEventName;
  identityHash: string;
  invoiceId?: string | null;
  bucket: string;
}) {
  return privacyHash(
    input.secret,
    "usage-dedupe",
    [input.event, input.identityHash, input.invoiceId ?? "none", input.bucket].join(":"),
  );
}
