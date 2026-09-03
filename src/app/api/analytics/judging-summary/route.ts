import { getJudgingSummary } from "@/features/analytics/judging-summary.server";
import { internalWalletSet } from "@/features/analytics/model";
import { getCreatorSession } from "@/features/auth/creator-session.server";
import { getServerEnv } from "@/lib/env.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const creator = await getCreatorSession();
  if (!creator) {
    return Response.json({ ok: false, code: "AUTH_REQUIRED" }, { status: 401 });
  }
  if (!internalWalletSet(getServerEnv().INTERNAL_TEST_WALLETS).has(creator.address)) {
    return Response.json({ ok: false, code: "FORBIDDEN" }, { status: 403 });
  }
  const summary = await getJudgingSummary();
  return Response.json(
    { ok: true, summary },
    { headers: { "cache-control": "no-store" } },
  );
}
