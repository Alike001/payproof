import type { NextConfig } from "next";

const canonicalProductionOrigin = "https://payproof-two.vercel.app";
const legacyProductionHosts = [
  "payproof-by-bravo.vercel.app",
  "bravo-invoice.vercel.app",
  "telegraph-track3-bravo-k7m4.vercel.app",
] as const;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactCompiler: true,
  reactStrictMode: true,
  async redirects() {
    return legacyProductionHosts.map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: `${canonicalProductionOrigin}/:path*`,
      permanent: true,
    }));
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
