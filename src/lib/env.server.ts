import "server-only";
import { serverEnvSchema, type ServerEnv } from "@/lib/env-schema";

let cachedEnvironment: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cachedEnvironment) {
    return cachedEnvironment;
  }

  const parsed = serverEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    TELEGRAPH_NODE_URL: process.env.TELEGRAPH_NODE_URL,
    TELEGRAPH_EVM_PRIVATE_KEY: process.env.TELEGRAPH_EVM_PRIVATE_KEY,
    TELEGRAPH_FX_PRIMARY_MINER_ID: process.env.TELEGRAPH_FX_PRIMARY_MINER_ID,
    TELEGRAPH_FX_BACKUP_MINER_ID: process.env.TELEGRAPH_FX_BACKUP_MINER_ID,
    TELEGRAPH_TX_PRIMARY_MINER_ID: process.env.TELEGRAPH_TX_PRIMARY_MINER_ID,
    TELEGRAPH_TX_BACKUP_MINER_ID: process.env.TELEGRAPH_TX_BACKUP_MINER_ID,
    X402_MAX_CALL_USDC_UNITS: process.env.X402_MAX_CALL_USDC_UNITS,
    X402_DAILY_BUDGET_USDC_UNITS:
      process.env.X402_DAILY_BUDGET_USDC_UNITS,
    FX_MAX_SOURCE_AGE_MINUTES: process.env.FX_MAX_SOURCE_AGE_MINUTES,
    ANALYTICS_HASH_SECRET: process.env.ANALYTICS_HASH_SECRET,
    INTERNAL_TEST_WALLETS: process.env.INTERNAL_TEST_WALLETS,
  });
  if (!parsed.success) {
    const fields = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .filter(Boolean)
      .join(", ");
    throw new Error(`Invalid server environment configuration: ${fields}`);
  }

  cachedEnvironment = parsed.data;
  return cachedEnvironment;
}
