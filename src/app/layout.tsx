import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { cookieToInitialState } from "wagmi";
import "@rainbow-me/rainbowkit/styles.css";
import { AppProviders } from "@/components/app-providers";
import { getWalletConfig } from "@/lib/wallet/config";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PayProof — Local-currency invoices, verified on Base",
    template: "%s · PayProof",
  },
  description:
    "Create an invoice in a familiar currency, accept test USDC on Base Sepolia, and turn the payment into a Telegraph-verified receipt.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const initialState = cookieToInitialState(
    getWalletConfig(),
    (await headers()).get("cookie"),
  );

  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <AppProviders initialState={initialState}>{children}</AppProviders>
      </body>
    </html>
  );
}
