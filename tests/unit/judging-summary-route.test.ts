// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ getCreatorSession: vi.fn() }));
const summary = vi.hoisted(() => ({ getJudgingSummary: vi.fn() }));
const environment = vi.hoisted(() => ({
  getServerEnv: vi.fn(() => ({
    INTERNAL_TEST_WALLETS: "0x1111111111111111111111111111111111111111",
  })),
}));
vi.mock("@/features/auth/creator-session.server", () => auth);
vi.mock("@/features/analytics/judging-summary.server", () => summary);
vi.mock("@/lib/env.server", () => environment);

import { GET } from "@/app/api/analytics/judging-summary/route";

describe("private judging summary route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects anonymous and non-internal wallets", async () => {
    auth.getCreatorSession.mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(401);
    auth.getCreatorSession.mockResolvedValueOnce({
      address: "0x2222222222222222222222222222222222222222",
    });
    expect((await GET()).status).toBe(403);
    expect(summary.getJudgingSummary).not.toHaveBeenCalled();
  });

  it("returns only aggregate evidence to an internal project wallet", async () => {
    auth.getCreatorSession.mockResolvedValue({
      address: "0x1111111111111111111111111111111111111111",
    });
    summary.getJudgingSummary.mockResolvedValue({ creators: 2 });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true, summary: { creators: 2 } });
  });
});
