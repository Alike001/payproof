import { getAddress } from "viem";
import { z } from "zod";
import {
  BASE_SEPOLIA_USDC_ADDRESS,
  HARD_X402_MAX_CALL_USDC_UNITS,
  TELEGRAPH_X402_NETWORK,
} from "@/lib/telegraph/constants";
import type {
  X402PaymentRequired,
  X402PaymentRequirement,
} from "@/lib/telegraph/types";

const paymentRequirementSchema = z.strictObject({
  scheme: z.string(),
  network: z.string(),
  asset: z.string(),
  amount: z.string().regex(/^[0-9]+$/),
  payTo: z.string(),
  maxTimeoutSeconds: z.number().int().positive(),
  extra: z.record(z.string(), z.unknown()).default({}),
});

const paymentRequiredSchema = z.strictObject({
  x402Version: z.number().int(),
  error: z.string().optional(),
  resource: z.strictObject({
    url: z.url(),
    description: z.string().optional(),
    mimeType: z.string().optional(),
    serviceName: z.string().optional(),
    tags: z.array(z.string()).optional(),
    iconUrl: z.string().optional(),
  }),
  accepts: z.array(paymentRequirementSchema).min(1),
  extensions: z.record(z.string(), z.unknown()).optional(),
});

export class TelegraphPolicyError extends Error {
  constructor(
    public readonly code:
      | "INVALID_CHALLENGE"
      | "UNSUPPORTED_X402_VERSION"
      | "UNTRUSTED_ORIGIN"
      | "UNSUPPORTED_NETWORK"
      | "UNSUPPORTED_ASSET"
      | "INVALID_AMOUNT"
      | "CALL_CAP_EXCEEDED",
    message: string,
  ) {
    super(message);
    this.name = "TelegraphPolicyError";
  }
}

function requireHttpsOrigin(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new TelegraphPolicyError(
      "UNTRUSTED_ORIGIN",
      "Telegraph payment resources must use HTTPS.",
    );
  }
  return url.origin;
}

function assertResourceMatchesRequest(
  resourceValue: string,
  requestValue: string,
  allowedOrigin: string,
): void {
  const resource = new URL(resourceValue);
  const request = new URL(requestValue);
  const allowed = new URL(allowedOrigin);
  const canonicalRequestPath = request.pathname.replace(
    /\/engine(?=\/v1\/ask\/)/,
    "",
  );
  const pathMatches =
    resource.pathname === request.pathname ||
    resource.pathname === canonicalRequestPath;
  const sameHost = resource.host === allowed.host;
  const knownProxyProtocol =
    resource.protocol === "https:" ||
    (resource.protocol === "http:" && request.protocol === "https:");

  if (
    !sameHost ||
    !knownProxyProtocol ||
    !pathMatches ||
    resource.username ||
    resource.password ||
    resource.search ||
    resource.hash
  ) {
    throw new TelegraphPolicyError(
      "UNTRUSTED_ORIGIN",
      "The payment challenge resource does not match the Telegraph request.",
    );
  }
}

function assertAddress(value: string, code: "UNSUPPORTED_ASSET"): string {
  try {
    return getAddress(value);
  } catch {
    throw new TelegraphPolicyError(code, "The challenge contains an invalid asset address.");
  }
}

export type ValidatedX402Challenge = {
  paymentRequired: X402PaymentRequired;
  requirement: X402PaymentRequirement;
  amountUnits: bigint;
};

export function validateX402Challenge(input: {
  challenge: unknown;
  requestUrl: string;
  allowedOrigin: string;
  maxAmountUnits: bigint;
}): ValidatedX402Challenge {
  const parsed = paymentRequiredSchema.safeParse(input.challenge);
  if (!parsed.success) {
    throw new TelegraphPolicyError(
      "INVALID_CHALLENGE",
      "Telegraph returned an invalid x402 challenge.",
    );
  }

  if (parsed.data.x402Version !== 2) {
    throw new TelegraphPolicyError(
      "UNSUPPORTED_X402_VERSION",
      "Only x402 version 2 is supported.",
    );
  }

  const allowedOrigin = requireHttpsOrigin(input.allowedOrigin);
  if (requireHttpsOrigin(input.requestUrl) !== allowedOrigin) {
    throw new TelegraphPolicyError(
      "UNTRUSTED_ORIGIN",
      "The payment challenge does not belong to the configured Telegraph origin.",
    );
  }
  assertResourceMatchesRequest(
    parsed.data.resource.url,
    input.requestUrl,
    allowedOrigin,
  );

  const exactRequirements = parsed.data.accepts.filter(
    (candidate) => candidate.scheme === "exact",
  );
  const networkRequirements = exactRequirements.filter(
    (candidate) => candidate.network === TELEGRAPH_X402_NETWORK,
  );
  if (networkRequirements.length === 0) {
    throw new TelegraphPolicyError(
      "UNSUPPORTED_NETWORK",
      "The challenge does not offer Base Sepolia.",
    );
  }

  const officialAsset = getAddress(BASE_SEPOLIA_USDC_ADDRESS);
  const assetRequirements = networkRequirements.filter(
    (candidate) => assertAddress(candidate.asset, "UNSUPPORTED_ASSET") === officialAsset,
  );
  if (assetRequirements.length === 0) {
    throw new TelegraphPolicyError(
      "UNSUPPORTED_ASSET",
      "The challenge does not request official Base Sepolia USDC.",
    );
  }

  const requirement = assetRequirements[0];
  try {
    getAddress(requirement.payTo);
  } catch {
    throw new TelegraphPolicyError(
      "INVALID_CHALLENGE",
      "The challenge contains an invalid payment recipient.",
    );
  }
  const amountUnits = BigInt(requirement.amount);
  if (amountUnits <= 0n) {
    throw new TelegraphPolicyError(
      "INVALID_AMOUNT",
      "The x402 amount must be a positive integer.",
    );
  }
  const effectiveCap =
    input.maxAmountUnits < HARD_X402_MAX_CALL_USDC_UNITS
      ? input.maxAmountUnits
      : HARD_X402_MAX_CALL_USDC_UNITS;
  if (amountUnits > effectiveCap) {
    throw new TelegraphPolicyError(
      "CALL_CAP_EXCEEDED",
      "The x402 amount exceeds PayProof's per-call limit.",
    );
  }

  const paymentRequired = {
    ...parsed.data,
    accepts: [requirement],
  } as X402PaymentRequired;

  return { paymentRequired, requirement, amountUnits };
}
