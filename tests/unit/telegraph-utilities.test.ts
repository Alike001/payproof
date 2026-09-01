import { describe, expect, it } from "vitest";
import {
  buildDirectAskUrl,
  createDirectAskEnvelope,
} from "@/lib/telegraph/direct-ask";
import { redactForPersistence, safeErrorMessage } from "@/lib/telegraph/redaction";
import { fetchWithTimeout, isCooldownElapsed } from "@/lib/telegraph/request";

describe("Telegraph transport utilities", () => {
  it("builds the fixed Engine direct-ask route without accepting path injection", () => {
    expect(
      buildDirectAskUrl("https://devnode.telegraphprotocol.com", "8453").toString(),
    ).toBe("https://devnode.telegraphprotocol.com/engine/v1/ask/8453");
    expect(() =>
      buildDirectAskUrl("https://devnode.telegraphprotocol.com", "../evil"),
    ).toThrow();
  });

  it("validates the direct ask envelope", () => {
    expect(
      createDirectAskEnvelope({ method: "POST", endpoint: "/lookup", payload: {} }),
    ).toEqual({ method: "POST", endpoint: "/lookup", payload: {} });
    expect(() =>
      createDirectAskEnvelope({
        method: "POST",
        endpoint: "lookup" as `/${string}`,
        payload: {},
      }),
    ).toThrow();
  });

  it("redacts signing material, authorizations, and contact details", () => {
    const redacted = redactForPersistence({
      paymentSignature: "secret-signature",
      authorization: { nonce: "private" },
      email: "person@example.com",
      result: { rate: "1500" },
    });
    expect(redacted).toEqual({
      paymentSignature: "[REDACTED]",
      authorization: "[REDACTED]",
      email: "[REDACTED]",
      result: { rate: "1500" },
    });
    expect(safeErrorMessage(new Error(`failed 0x${"12".repeat(64)}`))).not.toContain(
      "12121212",
    );
  });

  it("enforces retry cooldowns from exact timestamps", () => {
    const now = Date.parse("2026-09-01T12:00:15.000Z");
    expect(isCooldownElapsed("2026-09-01T12:00:00.000Z", 15_000, now)).toBe(true);
    expect(isCooldownElapsed("2026-09-01T12:00:01.000Z", 15_000, now)).toBe(false);
    expect(isCooldownElapsed(null, 15_000, now)).toBe(true);
  });

  it("aborts a Telegraph request at its timeout", async () => {
    const waitingFetch = ((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(init.signal?.reason),
          { once: true },
        );
      })) as typeof fetch;
    await expect(
      fetchWithTimeout(waitingFetch, "https://example.com", {}, 1),
    ).rejects.toThrow("Telegraph request timed out.");
  });
});
