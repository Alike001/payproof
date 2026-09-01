import { describe, expect, it } from "vitest";
import { serverEnvSchema } from "@/lib/env-schema";

const validEnvironment = {
  NEXT_PUBLIC_APP_URL: "https://payproof.example",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: "walletconnect-project",
  SUPABASE_SECRET_KEY: "server-secret-key",
  TELEGRAPH_NODE_URL: "https://node.telegraph.example",
  TELEGRAPH_EVM_PRIVATE_KEY: `0x${"ab".repeat(32)}`,
  X402_MAX_CALL_USDC_UNITS: "50000",
  X402_DAILY_BUDGET_USDC_UNITS: "5000000",
  FX_MAX_SOURCE_AGE_MINUTES: "15",
  ANALYTICS_HASH_SECRET: "a-private-hash-secret-with-32-characters",
  INTERNAL_TEST_WALLETS: "",
};

describe("serverEnvSchema", () => {
  it("parses typed limits without leaking secrets to public names", () => {
    const parsed = serverEnvSchema.parse(validEnvironment);
    expect(parsed.X402_MAX_CALL_USDC_UNITS).toBe(50_000n);
    expect(parsed.FX_MAX_SOURCE_AGE_MINUTES).toBe(15);
  });

  it("rejects mainnet-style or insecure Telegraph configuration", () => {
    expect(
      serverEnvSchema.safeParse({
        ...validEnvironment,
        TELEGRAPH_NODE_URL: "http://node.telegraph.example",
      }).success,
    ).toBe(false);
    expect(
      serverEnvSchema.safeParse({
        ...validEnvironment,
        TELEGRAPH_NODE_URL: "https://node.telegraph.example/untrusted-prefix",
      }).success,
    ).toBe(false);
    expect(
      serverEnvSchema.safeParse({
        ...validEnvironment,
        TELEGRAPH_EVM_PRIVATE_KEY: "not-a-private-key",
      }).success,
    ).toBe(false);
  });

  it("rejects a per-call x402 limit above the hard 0.05 test-USDC cap", () => {
    expect(
      serverEnvSchema.safeParse({
        ...validEnvironment,
        X402_MAX_CALL_USDC_UNITS: "50001",
      }).success,
    ).toBe(false);
  });
});
