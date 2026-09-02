"use client";

import { RainbowKitProvider } from "@rainbow-me/rainbowkit/components";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider, type State } from "wagmi";
import { getWalletConfig } from "@/lib/wallet/config";

export function AppProviders({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: State;
}) {
  const [queryClient] = useState(() => new QueryClient());
  const [config] = useState(getWalletConfig);

  return (
    <WagmiProvider
      config={config}
      initialState={initialState}
      reconnectOnMount={false}
    >
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider coolMode modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
