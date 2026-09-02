import { afterEach, describe, expect, it, vi } from "vitest";
import { dailyNetworkHash } from "@/lib/request-identity.server";

afterEach(() => vi.unstubAllEnvs());

describe("privacy-safe request identity", () => {
  it("hashes the first forwarded address with a rotating date salt", () => {
    vi.stubEnv("ANALYTICS_HASH_SECRET", "test-only-secret");
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
    });
    const first = dailyNetworkHash(headers, new Date("2026-09-02T12:00:00Z"));
    const repeated = dailyNetworkHash(
      headers,
      new Date("2026-09-02T23:59:00Z"),
    );
    const nextDay = dailyNetworkHash(
      headers,
      new Date("2026-09-03T00:00:00Z"),
    );
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(repeated).toBe(first);
    expect(nextDay).not.toBe(first);
    expect(first).not.toContain("203.0.113.7");
  });
});
