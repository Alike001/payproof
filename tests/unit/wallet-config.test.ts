import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "test-project-id");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://bravo-invoice.vercel.app");
    walletMocks.createConfig.mockClear();
    walletMocks.walletConnect.mockClear();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("registers one browser connector and one WalletConnect connector without discovery", async () => {
    const { getWalletConfig } = await import("@/lib/wallet/config");

    getWalletConfig();

    expect(walletMocks.createConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        connectors: [{ id: "injected" }, { id: "walletConnect" }],
        multiInjectedProviderDiscovery: false,
      }),
    );
    expect(walletMocks.walletConnect).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "test-project-id",
        metadata: {
          name: "PayProof by Bravo",
          description:
            "Base Sepolia invoices with Telegraph-verified test-USDC receipts.",
          url: "https://bravo-invoice.vercel.app",
          icons: [],
        },
      }),
    );
  });
});
