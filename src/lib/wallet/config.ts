import {
  cookieStorage,
  createConfig,
  createStorage,
  http,
  type CreateConnectorFn,
} from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const BUILD_SAFE_PROJECT_ID = "payproof-walletconnect-not-configured";

export const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? BUILD_SAFE_PROJECT_ID;

export const isWalletConnectConfigured =
  walletConnectProjectId !== BUILD_SAFE_PROJECT_ID;

let walletConfig: ReturnType<typeof createConfig> | undefined;

export function getWalletConfig() {
  const connectors: CreateConnectorFn[] = [injected({ shimDisconnect: true })];
  if (isWalletConnectConfigured) {
    connectors.push(
      walletConnect({
        projectId: walletConnectProjectId,
        showQrModal: true,
        metadata: {
          name: "PayProof",
          description: "Local-currency invoices with Telegraph-verified USDC receipts.",
          url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          icons: [],
        },
      }),
    );
  }

  walletConfig ??= createConfig({
    chains: [baseSepolia],
    connectors,
    // We deliberately expose one generic browser-wallet choice above. Without
    // this, Wagmi also adds every EIP-6963 wallet it discovers as another
    // connector, which renders duplicate-looking connect buttons.
    multiInjectedProviderDiscovery: false,
    transports: {
      [baseSepolia.id]: http(),
    },
    ssr: true,
    storage: createStorage({ storage: cookieStorage }),
  });

  return walletConfig;
}
