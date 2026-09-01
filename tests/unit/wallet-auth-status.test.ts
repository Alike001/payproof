import { describe, expect, it } from "vitest";
import { walletAuthStatusAnnouncement } from "@/features/auth/wallet-auth-status";

const connectedAddress = "0x8ba1f109551bD432803012645Ac136ddd64DBA72";
const creatorAddress = "0xde709f2102306220921060314715629080e2fb77";

function status(
  overrides: Partial<Parameters<typeof walletAuthStatusAnnouncement>[0]> = {},
) {
  return walletAuthStatusAnnouncement({
    connectedAddress,
    creatorAddress: null,
    error: null,
    isConnected: true,
    isConnecting: false,
    isWrongNetwork: false,
    phase: "idle",
    sessionMismatch: false,
    ...overrides,
  });
}

describe("walletAuthStatusAnnouncement", () => {
  it.each([
    ["switching", "Switching network to Base Sepolia in your wallet…"],
    ["signing", "Waiting for message signature in your wallet…"],
    ["signing-out", "Signing out of creator session…"],
  ] as const)("announces the %s phase", (phase, expected) => {
    expect(status({ phase })).toBe(expected);
  });

  it("announces a successful creator sign-in", () => {
    expect(status({ creatorAddress })).toBe(
      "Signed in as creator 0xde70…fb77.",
    );
  });

  it("never announces a mismatched session as a successful sign-in", () => {
    expect(status({ creatorAddress, sessionMismatch: true })).toBe("");
  });

  it("leaves errors and wrong-network warnings to their visible live regions", () => {
    expect(status({ error: "Signature cancelled." })).toBe("");
    expect(status({ isWrongNetwork: true })).toBe("");
  });
});
