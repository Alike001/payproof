import { getHealthReport } from "@/features/operations/health.server";
import { operationalLog } from "@/lib/observability/logger.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const report = await getHealthReport();
  operationalLog(report.status === "ready" ? "info" : "warn", "health_check", {
    outcome: report.status,
    database: report.database,
    telegraphConfig: report.telegraphConfig,
    baseSepolia: report.baseSepolia,
  });
  return Response.json(report, {
    status: report.status === "ready" ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}
