import "server-only";
import type { Json } from "@/lib/database/types";
import { getAdminDatabaseClient } from "@/lib/database/admin.server";
import { getServerEnv } from "@/lib/env.server";
import { operationalLog } from "@/lib/observability/logger.server";
import {
  privacyHash,
  trafficSourceForWallet,
  usageDedupeKey,
  type TrafficSource,
  type UsageEventName,
} from "./model";

const safeMetadataKeys = new Set(["channel", "outcome", "intent"]);

function safeMetadata(metadata: Record<string, string> = {}): Json {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key, value]) => safeMetadataKeys.has(key) && value.length <= 80)
      .map(([key, value]) => [key, value]),
  );
}

export async function recordUsageEvent(input: {
  event: UsageEventName;
  invoiceId?: string | null;
  creatorUserId?: string | null;
  actorWallet?: string | null;
  anonymousSession?: string | null;
  networkHash?: string | null;
  source?: Exclude<TrafficSource, "internal">;
  metadata?: Record<string, string>;
  dedupeBucket: string;
}): Promise<"recorded" | "duplicate" | "unavailable"> {
  try {
    const environment = getServerEnv();
    const walletHash = input.actorWallet
      ? privacyHash(environment.ANALYTICS_HASH_SECRET, "wallet", input.actorWallet.toLowerCase())
      : null;
    const sessionHash = input.anonymousSession
      ? privacyHash(environment.ANALYTICS_HASH_SECRET, "session", input.anonymousSession)
      : null;
    const identityHash = walletHash ?? sessionHash ?? input.networkHash;
    if (!identityHash) return "unavailable";
    const dedupeKey = usageDedupeKey({
      secret: environment.ANALYTICS_HASH_SECRET,
      event: input.event,
      identityHash,
      invoiceId: input.invoiceId,
      bucket: input.dedupeBucket,
    });
    const { error } = await getAdminDatabaseClient().from("usage_events").upsert(
      {
        event_name: input.event,
        invoice_id: input.invoiceId ?? null,
        creator_user_id: input.creatorUserId ?? null,
        actor_wallet_hash: walletHash,
        anonymous_session_hash: sessionHash,
        network_hash: input.networkHash ?? null,
        traffic_source: trafficSourceForWallet(
          input.actorWallet ?? null,
          environment.INTERNAL_TEST_WALLETS,
          input.source ?? "unknown",
        ),
        metadata: safeMetadata(input.metadata),
        dedupe_key: dedupeKey,
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    );
    if (!error) return "recorded";
    operationalLog("warn", "usage_event_write", {
      outcome: "unavailable",
      eventName: input.event,
      code: error.code,
    });
    return "unavailable";
  } catch {
    operationalLog("warn", "usage_event_write", {
      outcome: "unavailable",
      eventName: input.event,
      code: "UNEXPECTED_FAILURE",
    });
    return "unavailable";
  }
}
