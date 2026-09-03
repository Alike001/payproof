// @vitest-environment node

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { privacyHash } from "@/features/analytics/model";
import { recordUsageEvent } from "@/features/analytics/record-event.server";
import type { Database } from "@/lib/database/types";

const enabled = process.env.PAYPROOF_LOCAL_ANALYTICS_TEST === "1";
const rawSession = "analytics-local-session-that-must-not-be-stored";

describe.skipIf(!enabled)("local privacy-safe analytics integration", () => {
  let admin: SupabaseClient<Database>;
  let sessionHash = "";

  beforeAll(() => {
    admin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    sessionHash = privacyHash(
      process.env.ANALYTICS_HASH_SECRET!,
      "session",
      rawSession,
    );
  });

  afterAll(async () => {
    await admin.from("usage_events").delete().eq("anonymous_session_hash", sessionHash);
  });

  it("stores one row for repeated refreshes and never stores raw identity", async () => {
    const input = {
      event: "landing_view" as const,
      anonymousSession: rawSession,
      networkHash: "c".repeat(64),
      dedupeBucket: "2026-09-03",
    };
    await recordUsageEvent(input);
    await recordUsageEvent(input);
    const { data, error } = await admin
      .from("usage_events")
      .select("anonymous_session_hash,network_hash,dedupe_key")
      .eq("anonymous_session_hash", sessionHash);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.anonymous_session_hash).toBe(sessionHash);
    expect(JSON.stringify(data)).not.toContain(rawSession);
    expect(data?.[0]?.dedupe_key).toMatch(/^[0-9a-f]{64}$/);
  });
});
