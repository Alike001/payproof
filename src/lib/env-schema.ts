import { z } from "zod";

const optionalMinerId = z.string().trim().min(1).max(100).optional();

export const publicEnvSchema = z.strictObject({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().trim().min(1),
});

export const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SECRET_KEY: z.string().trim().min(1),
  TELEGRAPH_NODE_URL: z.url().refine((url) => url.startsWith("https://"), {
    message: "Telegraph node URL must use HTTPS.",
  }),
  TELEGRAPH_EVM_PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  TELEGRAPH_FX_PRIMARY_MINER_ID: optionalMinerId,
  TELEGRAPH_FX_BACKUP_MINER_ID: optionalMinerId,
  TELEGRAPH_TX_PRIMARY_MINER_ID: optionalMinerId,
  TELEGRAPH_TX_BACKUP_MINER_ID: optionalMinerId,
  X402_MAX_CALL_USDC_UNITS: z.coerce.bigint().positive(),
  X402_DAILY_BUDGET_USDC_UNITS: z.coerce.bigint().positive(),
  FX_MAX_SOURCE_AGE_MINUTES: z.coerce.number().int().positive().max(1_440),
  ANALYTICS_HASH_SECRET: z.string().min(32),
  INTERNAL_TEST_WALLETS: z.string(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
