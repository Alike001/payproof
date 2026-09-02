import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Page } from "@playwright/test";

type Viewport = { width: number; height: number };

async function devtoolsEndpoint(process: ChildProcess): Promise<string> {
  if (!process.stderr) throw new Error("Chrome stderr is unavailable.");
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => {
      reject(new Error("Chrome did not expose a DevTools endpoint in time."));
    }, 15_000);

    process.stderr!.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (!match) return;
      clearTimeout(timer);
      resolve(match[1]);
    });
    process.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    process.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited before startup with code ${code}.`));
    });
  });
}

function waitForExit(process: ChildProcess): Promise<void> {
  if (process.exitCode !== null || process.signalCode !== null) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, 2_000);
    process.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function removeProfile(profile: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      await rm(profile, { recursive: true, force: true });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 100));
    }
  }
  throw lastError;
}

export async function withExternalChrome(
  viewport: Viewport,
  run: (page: Page) => Promise<void>,
) {
  const profile = await mkdtemp(join(tmpdir(), "payproof-playwright-"));
  const chrome = spawn(
    process.env.PLAYWRIGHT_CHROME_PATH ?? "google-chrome",
    [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  try {
    const endpoint = await devtoolsEndpoint(chrome);
    const browser = await chromium.connectOverCDP(endpoint);
    try {
      const context = browser.contexts()[0];
      const page = context.pages()[0] ?? (await context.newPage());
      await page.setViewportSize(viewport);
      await run(page);
    } finally {
      await browser.close().catch(() => undefined);
    }
  } finally {
    if (chrome.exitCode === null && chrome.signalCode === null) {
      chrome.kill("SIGTERM");
    }
    await waitForExit(chrome);
    await removeProfile(profile);
  }
}
