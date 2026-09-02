import { beforeEach, describe, expect, it, vi } from "vitest";

const walletMocks = vi.hoisted(() => ({
  createConfig: vi.fn((options: unknown) => options),
  createStorage: vi.fn(() => ({ type: "cookie-storage" })),
  http: vi.fn(() => ({ type: "http" })),
  injected: vi.fn(() => ({ id: "injected" })),
  walletConnect: vi.fn(() => ({ id: "walletConnect" })),
}));

vi.mock("wagmi", () => ({
  cookieStorage: { type: "cookie" },
  createConfig: walletMocks.createConfig,
  createStorage: walletMocks.createStorage,
  http: walletMocks.http,
}));

vi.mock("wagmi/chains", () => ({
  baseSepolia: { id: 84532 },
}));

vi.mock("wagmi/connectors", () => ({
  injected: walletMocks.injected,
  walletConnect: walletMocks.walletConnect,
}));

describe("wallet config", () => {
  beforeEach(() => {
    walletMocks.createConfig.mockClear();
  });

  it("disables automatic EIP-6963 connector discovery to prevent duplicate wallet buttons", async () => {
    const { getWalletConfig } = await import("@/lib/wallet/config");

    getWalletConfig();

    expect(walletMocks.createConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        multiInjectedProviderDiscovery: false,
      }),
    );
  });
});
