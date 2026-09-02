import { spawnSync } from "node:child_process";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd(), true);

const result = spawnSync(
  process.execPath,
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "tests/live/quote-flow.live.test.ts",
  ],
  {
    env: { ...process.env, RUN_LIVE_QUOTE_FLOW_TESTS: "1" },
    stdio: "inherit",
  },
);

if (result.error) {
  console.error("Unable to start the live quote test.");
  process.exit(1);
}

process.exit(result.status ?? 1);
