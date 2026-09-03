import "server-only";
import { checkBaseSepoliaConnection } from "@/lib/base/public-client.server";
import { getAdminDatabaseClient } from "@/lib/database/admin.server";
import { getServerEnv } from "@/lib/env.server";

export type HealthDependencyState = "ready" | "unavailable";
export type HealthReport = {
  status: "ready" | "degraded";
  database: HealthDependencyState;
  telegraphConfig: HealthDependencyState;
  baseSepolia: HealthDependencyState;
  timestamp: string;
};

export type HealthChecks = {
  database: () => Promise<boolean>;
  telegraphConfig: () => boolean;
  baseSepolia: () => Promise<boolean>;
};

const defaultChecks: HealthChecks = {
  database: async () => {
    try {
      const { error } = await getAdminDatabaseClient()
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .limit(1);
      return !error;
    } catch {
      return false;
    }
  },
  telegraphConfig: () => {
    try {
      getServerEnv();
      return true;
    } catch {
      return false;
    }
  },
  baseSepolia: checkBaseSepoliaConnection,
};

export async function getHealthReport(
  checks: HealthChecks = defaultChecks,
  now = new Date(),
): Promise<HealthReport> {
  const [databaseReady, telegraphConfigReady, baseSepoliaReady] =
    await Promise.all([
      checks.database(),
      Promise.resolve(checks.telegraphConfig()),
      checks.baseSepolia(),
    ]);
  const database = databaseReady ? "ready" : "unavailable";
  const telegraphConfig = telegraphConfigReady ? "ready" : "unavailable";
  const baseSepolia = baseSepoliaReady ? "ready" : "unavailable";
  return {
    status:
      database === "ready" &&
      telegraphConfig === "ready" &&
      baseSepolia === "ready"
        ? "ready"
        : "degraded",
    database,
    telegraphConfig,
    baseSepolia,
    timestamp: now.toISOString(),
  };
}
