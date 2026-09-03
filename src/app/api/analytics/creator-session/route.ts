import { getCreatorSession } from "@/features/auth/creator-session.server";
import { recordUsageEvent } from "@/features/analytics/record-event.server";
import { dailyNetworkHash } from "@/lib/request-identity.server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const creator = await getCreatorSession();
  if (!creator) {
    return Response.json({ ok: false, code: "AUTH_REQUIRED" }, { status: 401 });
  }
  const now = new Date();
  await recordUsageEvent({
    event: "creator_signed_in",
    creatorUserId: creator.userId,
    actorWallet: creator.address,
    networkHash: dailyNetworkHash(request.headers, now),
    dedupeBucket: now.toISOString().slice(0, 10),
  });
  return Response.json({ ok: true }, { status: 202 });
}
