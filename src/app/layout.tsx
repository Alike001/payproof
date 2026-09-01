import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PayProof — Local-currency invoices, verified on Base",
    template: "%s · PayProof",
  },
  description:
    "Create an invoice in a familiar currency, accept test USDC on Base Sepolia, and turn the payment into a Telegraph-verified receipt.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
