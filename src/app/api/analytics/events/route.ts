import { z } from "zod";
import { recordUsageEvent } from "@/features/analytics/record-event.server";
import { getAdminDatabaseClient } from "@/lib/database/admin.server";
import { dailyNetworkHash } from "@/lib/request-identity.server";

export const runtime = "nodejs";

const inputSchema = z.strictObject({
  event: z.enum(["landing_view", "invoice_viewed", "invoice_shared", "receipt_viewed"]),
  publicId: z.uuid().optional(),
  channel: z.enum(["native_share", "clipboard"]).optional(),
});
const SESSION_COOKIE = "pp_analytics_session";
const USAGE_RATE_LIMIT = 30;

export function isUsageRateLimited(count: number | null, limit = USAGE_RATE_LIMIT) {
  return (count ?? 0) >= limit;
}

function cookieValue(request: Request): string | null {
  const item = request.headers
    .get("cookie")
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${SESSION_COOKIE}=`));
  return item ? decodeURIComponent(item.slice(SESSION_COOKIE.length + 1)) : null;
}

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, code: "INVALID_USAGE_EVENT" }, { status: 400 });
  }
  if (parsed.data.event !== "landing_view" && !parsed.data.publicId) {
    return Response.json({ ok: false, code: "INVOICE_REQUIRED" }, { status: 400 });
  }
  let invoiceId: string | null = null;
  const now = new Date();
  const networkHash = dailyNetworkHash(request.headers, now);
  const database = getAdminDatabaseClient();
  const oneMinuteAgo = new Date(now.getTime() - 60_000).toISOString();
  const recent = await database
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("network_hash", networkHash)
    .gte("occurred_at", oneMinuteAgo);
  if (isUsageRateLimited(recent.count)) {
    return Response.json(
      { ok: false, code: "USAGE_RATE_LIMITED" },
      { status: 429, headers: { "retry-after": "60" } },
    );
  }
  if (parsed.data.publicId) {
    const { data } = await database
      .from("invoices")
      .select("id")
      .eq("public_id", parsed.data.publicId)
      .maybeSingle();
    if (!data) return Response.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });
    invoiceId = data.id;
  }
  const session = cookieValue(request) ?? crypto.randomUUID();
  await recordUsageEvent({
    event: parsed.data.event,
    invoiceId,
    anonymousSession: session,
    networkHash,
    metadata: parsed.data.channel ? { channel: parsed.data.channel } : undefined,
    dedupeBucket: now.toISOString().slice(0, 10),
  });
  const headers = new Headers({ "cache-control": "no-store" });
  if (!cookieValue(request)) {
    headers.append(
      "set-cookie",
      `${SESSION_COOKIE}=${encodeURIComponent(session)}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
  }
  return Response.json({ ok: true }, { status: 202, headers });
}
