import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const providerMocks = vi.hoisted(() => ({
  wagmiProvider: vi.fn(),
  config: { id: "payproof-wallet-config" },
}));

vi.mock("wagmi", () => ({
  WagmiProvider: ({
    children,
    ...props
  }: {
    children: ReactNode;
    reconnectOnMount?: boolean;
  }) => {
    providerMocks.wagmiProvider(props);
    return children;
  },
}));

vi.mock("@tanstack/react-query", () => ({
  QueryClient: class QueryClient {},
  QueryClientProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@rainbow-me/rainbowkit/components", () => ({
  RainbowKitProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/lib/wallet/config", () => ({
  getWalletConfig: () => providerMocks.config,
}));

import { AppProviders } from "@/components/app-providers";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  container?.remove();
  container = null;
  root = null;
  providerMocks.wagmiProvider.mockClear();
});

describe("AppProviders", () => {
  it("requires an explicit click instead of reconnecting a wallet on page load", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        <AppProviders>
          <div>PayProof</div>
        </AppProviders>,
      );
    });

    expect(providerMocks.wagmiProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        config: providerMocks.config,
        reconnectOnMount: false,
      }),
    );
  });
});
