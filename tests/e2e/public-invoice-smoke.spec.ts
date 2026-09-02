import { expect, test } from "@playwright/test";
import { withExternalChrome } from "./external-chrome";

test("an invalid public invoice fails closed without requiring a wallet", async ({
  baseURL,
}, testInfo) => {
  const viewport = testInfo.project.name === "mobile-chrome"
    ? { width: 390, height: 844 }
    : { width: 1440, height: 1000 };

  await withExternalChrome(viewport, async (page) => {
    const response = await page.goto(`${baseURL}/i/not-a-valid-public-id`);

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "Invoice Not Found" }),
    ).toBeVisible();
    await expect(
      page.getByText("Base Sepolia testnet", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Go to PayProof home" }),
    ).toBeVisible();
  });
});
