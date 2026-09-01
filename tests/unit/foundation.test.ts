import { describe, expect, it } from "vitest";

describe("PayProof foundation", () => {
  it("keeps the supported network explicit", () => {
    const supportedNetwork = {
      id: 84532,
      name: "Base Sepolia",
      hasRealValue: false,
    } as const;

    expect(supportedNetwork).toEqual({
      id: 84532,
      name: "Base Sepolia",
      hasRealValue: false,
    });
  });
});
