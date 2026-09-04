import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const config = readFileSync(resolve(process.cwd(), "supabase/config.toml"), "utf8");

describe("Supabase Web3 authentication configuration", () => {
  it("allows SIWE messages signed from every supported app path", () => {
    expect(config).toContain(
      'site_url = "https://payproof-two.vercel.app"',
    );

    const redirectLine = config
      .split("\n")
      .find((line) => line.startsWith("additional_redirect_urls = "));

    expect(redirectLine).toBeDefined();
    expect(redirectLine).toContain("http://localhost:3000/**");
    expect(redirectLine).toContain("https://payproof-two.vercel.app/**");
    expect(redirectLine).not.toMatch(
      /payproof-by-bravo|bravo-invoice|telegraph-track3-bravo-k7m4/,
    );
  });
});
