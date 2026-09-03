// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { checkBaseSepoliaConnection } from "@/lib/base/public-client.server";
import { getHealthReport } from "@/features/operations/health.server";

describe("operational health", () => {
  it("reports ready only when every free dependency check is ready", async () => {
    const report = await getHealthReport(
      {
        database: vi.fn().mockResolvedValue(true),
        telegraphConfig: vi.fn().mockReturnValue(true),
        baseSepolia: vi.fn().mockResolvedValue(true),
      },
      new Date("2026-09-03T10:00:00.000Z"),
    );
    expect(report).toEqual({
      status: "ready",
      database: "ready",
      telegraphConfig: "ready",
      baseSepolia: "ready",
      timestamp: "2026-09-03T10:00:00.000Z",
    });
  });

  it("degrades without making a paid Telegraph call", async () => {
    const telegraphConfig = vi.fn().mockReturnValue(true);
    const report = await getHealthReport({
      database: vi.fn().mockResolvedValue(false),
      telegraphConfig,
      baseSepolia: vi.fn().mockResolvedValue(true),
    });
    expect(report.status).toBe("degraded");
    expect(report.database).toBe("unavailable");
    expect(telegraphConfig).toHaveBeenCalledOnce();
  });

  it("accepts only the Base Sepolia chain id", async () => {
    expect(await checkBaseSepoliaConnection(async () => 84532)).toBe(true);
    expect(await checkBaseSepoliaConnection(async () => 8453)).toBe(false);
    expect(
      await checkBaseSepoliaConnection(async () => {
        throw new Error("offline");
      }),
    ).toBe(false);
  });
});
