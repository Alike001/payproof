// @vitest-environment node

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("production hardening", () => {
  it("does not contain a production success bypass or mock verification flag", () => {
    const sourceFiles = (directory: string): string[] =>
      readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) return sourceFiles(path);
        return /\.tsx?$/.test(entry.name) ? [path] : [];
      });
    const source = sourceFiles("src")
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    expect(source).not.toMatch(/NEXT_PUBLIC_.*(?:MOCK|BYPASS)|MOCK_VERIFICATION|DEMO_BYPASS/);
  });

  it("sets the application security-header baseline", async () => {
    const groups = await nextConfig.headers?.();
    const headers = new Map(groups?.[0]?.headers.map((item) => [item.key, item.value]));
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin-allow-popups");
  });

  it("redirects every legacy production host to the canonical origin", async () => {
    const redirects = await nextConfig.redirects?.();

    expect(redirects).toEqual(
      [
        "payproof-by-bravo.vercel.app",
        "bravo-invoice.vercel.app",
        "telegraph-track3-bravo-k7m4.vercel.app",
      ].map((host) => ({
        source: "/:path*",
        has: [{ type: "host", value: host }],
        destination: "https://payproof-two.vercel.app/:path*",
        permanent: true,
      })),
    );
  });
});
