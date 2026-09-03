// @vitest-environment node

import { describe, expect, it } from "vitest";
import { isUsageRateLimited } from "@/app/api/analytics/events/route";

describe("usage-event abuse control", () => {
  it("allows the first thirty events and then rate limits the network hash", () => {
    expect(isUsageRateLimited(null)).toBe(false);
    expect(isUsageRateLimited(29)).toBe(false);
    expect(isUsageRateLimited(30)).toBe(true);
  });
});
