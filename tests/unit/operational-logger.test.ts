// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  operationalLog,
  redactOperationalText,
} from "@/lib/observability/logger.server";

describe("structured operational logging", () => {
  it("redacts contact, network, authorization, and private material", () => {
    const raw = "ali@example.com 192.168.1.8 Bearer abc123 0x" + "a".repeat(64);
    const safe = redactOperationalText(raw);
    expect(safe).not.toContain("ali@example.com");
    expect(safe).not.toContain("192.168.1.8");
    expect(safe).not.toContain("abc123");
    expect(safe).not.toContain("a".repeat(64));
  });

  it("writes one parseable JSON record", () => {
    const output = vi.spyOn(console, "info").mockImplementation(() => undefined);
    operationalLog("info", "quote_request", {
      outcome: "ready",
      detail: "from ali@example.com",
    });
    const record = JSON.parse(String(output.mock.calls[0]?.[0]));
    expect(record).toMatchObject({
      level: "info",
      event: "quote_request",
      outcome: "ready",
      detail: "from [REDACTED_EMAIL]",
    });
    output.mockRestore();
  });
});
