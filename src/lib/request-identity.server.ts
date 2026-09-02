import "server-only";
import { createHash } from "node:crypto";

function sourceAddress(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

export function dailyNetworkHash(headers: Headers, now = new Date()): string {
  const secret = process.env.ANALYTICS_HASH_SECRET;
  if (!secret) throw new Error("Missing server analytics hash configuration.");
  const dateSalt = now.toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${secret}:${dateSalt}:${sourceAddress(headers)}`)
    .digest("hex");
}
