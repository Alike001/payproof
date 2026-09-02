import { afterEach, describe, expect, it, vi } from "vitest";
import { requestQuote } from "@/features/quotes/quote-client-boundary";

afterEach(() => vi.unstubAllGlobals());

describe("quote client boundary", () => {
  it("sends only an empty request to the selected public invoice", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        ok: true,
        reused: false,
        quote: {
          quoteId: "11111111-1111-4111-8111-111111111111",
          sourceCurrency: "USD",
          targetCurrency: "USD",
          localAmountFormatted: "$1.00",
          rateToUsd: "1",
          usdcAmountUnits: "1000000",
          usdcAmountFormatted: "1.000000",
          quotedAt: "2026-09-02T12:00:00.000Z",
          expiresAt: "2026-09-02T12:15:00.000Z",
          sourceObservedAt: null,
          source: {
            kind: "usd_parity",
            name: "Nominal 1 USD = 1 test USDC",
            minerId: null,
            minerName: null,
            attemptRole: null,
          },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const publicId = "11111111-1111-4111-8111-111111111111";
    expect(await requestQuote(publicId)).toMatchObject({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/invoices/${publicId}/quote`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      },
    );
  });

  it("fails closed on malformed server data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          ok: true,
          reused: false,
          quote: { usdcAmountUnits: "1000000" },
        }),
      }),
    );
    expect(await requestQuote("bad")).toMatchObject({
      ok: false,
      code: "QUOTE_UNAVAILABLE",
    });
  });
});
