import { expect, test, type Page } from "@playwright/test";
import { withExternalChrome } from "./external-chrome";

const viewports = [
  { name: "small mobile", width: 320, height: 640 },
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
] as const;

async function expectResponsiveAtEveryWidth(page: Page) {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await expect(page.locator("body"), viewport.name).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(
      dimensions.scrollWidth,
      `${viewport.name} horizontal overflow`,
    ).toBeLessThanOrEqual(dimensions.clientWidth);
  }
}

function initialViewport(projectName: string) {
  return projectName === "mobile-chrome"
    ? { width: 390, height: 844 }
    : { width: 1280, height: 900 };
}

test.describe("real application shell, accessibility, and failure-state QA", () => {
  test("landing page explains the product and supports keyboard entry", async (
    { baseURL },
    testInfo,
  ) => {
    await withExternalChrome(
      initialViewport(testInfo.project.name),
      async (page) => {
        const response = await page.goto(`${baseURL}/`);
        expect(response?.status()).toBe(200);
        await expect(
          page.getByRole("heading", {
            name: "Invoice locally. Get paid in USDC. Prove it happened.",
          }),
        ).toBeVisible();
        await expect(
          page.getByText("Base Sepolia testnet", { exact: false }),
        ).toBeVisible();
        await expect(
          page.getByRole("link", { name: "Create an invoice" }).first(),
        ).toBeVisible();
        await expect(
          page.getByRole("link", { name: "View my invoices" }).first(),
        ).toBeVisible();

        await page.keyboard.press("Tab");
        await expect(
          page.getByRole("link", { name: "Skip to content" }),
        ).toBeFocused();
        await expectResponsiveAtEveryWidth(page);
      },
    );
  });

  test("creator routes remain understandable without opening a wallet automatically", async (
    { baseURL },
    testInfo,
  ) => {
    await withExternalChrome(initialViewport(testInfo.project.name), async (page) => {
      const creatorResponse = await page.goto(`${baseURL}/invoices/new`);
      expect(creatorResponse?.status()).toBe(200);
      await expect(
        page.getByRole("heading", { name: "First, prove where you want to be paid." }),
      ).toBeVisible();
      await expect(page.getByText("Not connected", { exact: true })).toBeVisible();
      await expect(page.getByText("Not signed in", { exact: true })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Connect browser wallet" }).first(),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "WalletConnect" })).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expectResponsiveAtEveryWidth(page);

      const dashboardResponse = await page.goto(`${baseURL}/dashboard`);
      expect(dashboardResponse?.status()).toBe(200);
      await expect(
        page.getByRole("heading", { name: "Your invoices stay tied to your wallet." }),
      ).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expectResponsiveAtEveryWidth(page);
    });
  });

  test("an invalid public link fails closed with a keyboard-accessible recovery", async (
    { baseURL },
    testInfo,
  ) => {
    await withExternalChrome(initialViewport(testInfo.project.name), async (page) => {
      const response = await page.goto(`${baseURL}/i/not-a-valid-public-id`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { name: "Invoice Not Found" })).toBeVisible();
      await expect(
        page.getByText("This invoice link is invalid or no longer available."),
      ).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);

      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(
        page.getByRole("link", { name: "PayProof home", exact: true }),
      ).toBeFocused();
      await expectResponsiveAtEveryWidth(page);
    });
  });
});
