import { z } from "zod";
import type { DirectAskEnvelope } from "@/lib/telegraph/types";

const minerIdSchema = z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
const endpointSchema = z.string().startsWith("/").max(300);

export function buildDirectAskUrl(nodeUrl: string, minerId: string): URL {
  const baseUrl = new URL(nodeUrl);
  const parsedMinerId = minerIdSchema.parse(minerId);
  baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, "")}/engine/v1/ask/${encodeURIComponent(parsedMinerId)}`;
  baseUrl.search = "";
  baseUrl.hash = "";
  return baseUrl;
}
export function createDirectAskEnvelope(
  input: DirectAskEnvelope,
): DirectAskEnvelope {
  return {
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).parse(input.method),
    endpoint: endpointSchema.parse(input.endpoint) as `/${string}`,
    payload: z.record(z.string(), z.unknown()).parse(input.payload),
  };
}
