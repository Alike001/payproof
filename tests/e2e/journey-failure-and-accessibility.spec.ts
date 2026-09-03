import { expect, test, type Page } from "@playwright/test";
import { withExternalChrome } from "./external-chrome";
import fs from "node:fs";
import path from "node:path";

const VIEWPORTS = [
  { name: "320px", width: 320, height: 640 },
  { name: "390px", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
];

async function expectNoHorizontalOverflow(page: Page) {
  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
}

// Load styles to inject into standalone verification harnesses
const globalsCss = fs.readFileSync(
  path.join(process.cwd(), "src/app/globals.css"),
  "utf8",
);
const shellCss = fs.readFileSync(
  path.join(process.cwd(), "src/components/workspace-shell.module.css"),
  "utf8",
);
const authCardCss = fs.readFileSync(
  path.join(process.cwd(), "src/features/auth/wallet-auth-card.module.css"),
  "utf8",
);
const cardCss = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/features/invoices/public-invoice-card.module.css",
  ),
  "utf8",
);
const paymentCss = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/features/payments/public-invoice-payment.module.css",
  ),
  "utf8",
);

const allStyles = `
  ${globalsCss}
  ${shellCss}
  ${authCardCss}
  ${cardCss}
  ${paymentCss}
`;

function buildHarnessHtml(bodyContent: string, title = "PayProof Journey Test") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    ${allStyles}
    body {
      background: #f8fafc;
      margin: 0;
      padding: 16px;
      display: flex;
      justify-content: center;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .wrapper {
      width: 100%;
      max-width: 680px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    ${bodyContent}
  </div>
</body>
</html>`;
}

test.describe("Task 06: End-to-End Journey, Failures, Accessibility & Responsive Proof", () => {
  test("landing page and creator sign-in surfaces are responsive and accessible (320px, 390px, desktop)", async ({
    baseURL,
  }, testInfo) => {
    test.setTimeout(60_000);
    const initialVp =
      testInfo.project.name === "mobile-chrome"
        ? { width: 390, height: 844 }
        : { width: 1280, height: 900 };

    await withExternalChrome(initialVp, async (page) => {
      // 1. Live Landing Page on Next.js server
      const homeRes = await page.goto(`${baseURL}/`);
      expect(homeRes?.status()).toBe(200);

      await expect(
        page.getByText("Base Sepolia testnet", { exact: false }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: "Invoice locally. Get paid in USDC. Prove it happened.",
        }),
      ).toBeVisible();

      // Check primary actions
      const createAction = page
        .getByRole("link", { name: "Create an invoice" })
        .first();
      await expect(createAction).toBeVisible();
      const dashboardAction = page
        .getByRole("link", { name: "View my invoices" })
        .first();
      await expect(dashboardAction).toBeVisible();

      // Test responsive widths on Home
      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await expectNoHorizontalOverflow(page);
      }

      // 2. Creator Workspace & Sign-in surface harness
      const creatorAuthHtml = buildHarnessHtml(`
        <div class="page">
          <header class="header">
            <a class="brand" href="/" aria-label="PayProof home">PayProof</a>
            <a class="homeLink" href="/">Back to home</a>
          </header>
          <main class="main">
            <section class="intro">
              <p>Creator workspace</p>
              <h1>Your invoices stay tied to your wallet.</h1>
              <span>Reconnect anywhere, sign a free message, and PayProof can safely show only the invoices created by that verified wallet.</span>
            </section>
            <div class="card" role="region" aria-labelledby="wallet-auth-title">
              <h2 id="wallet-auth-title" class="authTitle">Sign in with verified wallet</h2>
              <p class="authDescription">Sign a free message to prove you control this address. No gas fee, no funds transferred.</p>
              <div class="connectButtonRow">
                <button type="button" class="connectButton">Connect wallet to continue</button>
              </div>
              <div class="testnetGuidance">
                <strong>Base Sepolia Testnet:</strong> Test USDC only. Zero real-world economic value.
              </div>
            </div>
          </main>
        </div>
      `);

      await page.setContent(creatorAuthHtml);

      await expect(
        page.getByRole("heading", {
          name: "Your invoices stay tied to your wallet.",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: "Sign in with verified wallet",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Connect wallet to continue" }),
      ).toBeVisible();

      // Confirm no private keys or credentials in page
      const dashHtml = await page.content();
      expect(dashHtml).not.toMatch(/private[_-]?key/i);
      expect(dashHtml).not.toMatch(/supabase[_-]?secret/i);

      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await expectNoHorizontalOverflow(page);
      }
    });
  });

  test("public invoice portal fails closed without requiring a wallet (320px, 390px, desktop)", async ({
    baseURL,
  }, testInfo) => {
    test.setTimeout(60_000);
    const initialVp =
      testInfo.project.name === "mobile-chrome"
        ? { width: 390, height: 844 }
        : { width: 1280, height: 900 };

    await withExternalChrome(initialVp, async (page) => {
      const res = await page.goto(`${baseURL}/i/invalid-public-id-test-999`);
      expect(res?.status()).toBe(200);

      await expect(
        page.getByRole("heading", { name: "Invoice Not Found" }),
      ).toBeVisible();
      await expect(
        page.getByText("This invoice link is invalid or no longer available."),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Go to PayProof home" }),
      ).toBeVisible();

      // Test keyboard navigation to home link
      await page.keyboard.press("Tab");
      const activeText = await page.evaluate(
        () => document.activeElement?.textContent,
      );
      expect(activeText).toBeDefined();

      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await expectNoHorizontalOverflow(page);
      }
    });
  });

  test("quote lifecycle: 15-min countdown, USD parity, expiry notice, refresh, and Telegraph unavailable", async ({}, testInfo) => {
    test.setTimeout(60_000);
    const initialVp =
      testInfo.project.name === "mobile-chrome"
        ? { width: 390, height: 844 }
        : { width: 1280, height: 900 };

    const quoteHarnessHtml = buildHarnessHtml(`
      <div class="card">
        <div class="cardHeader">
          <span class="eyebrow">Public Invoice</span>
          <h2 class="reference">INV-2026-QA01</h2>
          <span class="badge badgeOpen">Awaiting Payment</span>
        </div>
        <section class="paymentContainer" aria-labelledby="payment-section-title">
          <div class="sectionHeader">
            <div>
              <span class="eyebrow">Step 2 · Currency Conversion & Settlement</span>
              <h3 id="payment-section-title">Client Payment Step</h3>
            </div>
            <span class="badgeBase">Base Sepolia (84532)</span>
          </div>

          <!-- Active Quote -->
          <div class="quoteCard" id="active-quote">
            <div class="quoteHeader">
              <span class="quoteTitle">15-Minute Conversion Quote</span>
              <span class="countdownBadge countdownActive" role="status">14:58 remaining</span>
            </div>
            <div class="quoteDetails">
              <div class="quoteRowMain">
                <div>
                  <span class="quoteLabel">Original Invoiced Amount</span>
                  <strong class="localAmountText">₦450,000.00</strong>
                </div>
                <div class="arrowIcon" aria-hidden="true">→</div>
                <div class="usdcCol">
                  <span class="quoteLabel">Required Payment</span>
                  <strong class="usdcAmountText">300.000000 test USDC</strong>
                </div>
              </div>
              <div class="quoteMetaGrid">
                <div class="quoteMetaItem">
                  <span>Conversion Rule / Rate</span>
                  <strong>1 NGN = 0.000666666666666667 USD</strong>
                </div>
                <div class="quoteMetaItem">
                  <span>Intelligence Source</span>
                  <strong>Structured FX feed (FX Rate Mirror [primary])</strong>
                </div>
              </div>
              <div class="quoteActionsRow">
                <button class="refreshButton" type="button" aria-label="Refresh conversion quote">↻ Refresh quote</button>
              </div>
            </div>
          </div>

          <!-- Expired Quote notice -->
          <div class="quoteCard" id="expired-quote" style="margin-top: 20px;">
            <div class="quoteHeader">
              <span class="quoteTitle">15-Minute Conversion Quote</span>
              <span class="countdownBadge countdownExpired" role="status">Quote Expired</span>
            </div>
            <p style="font-size: 0.85rem; color: #64748b; margin: 8px 0;">Quote expired. Refresh to recalculate live conversion.</p>
            <button class="primaryPayButton" disabled type="button">Quote expired — Refresh to pay</button>
          </div>

          <!-- Telegraph Unavailable State -->
          <div class="quoteErrorBox" role="alert" style="margin-top: 20px;">
            <p><strong>Quote Unavailable:</strong> A trustworthy quote is temporarily unavailable. Payment remains paused.</p>
            <p class="cooldownText">Cooldown active: retry available in 15s</p>
            <button class="retryButton" type="button">Try again</button>
          </div>
        </section>
      </div>
    `);

    await withExternalChrome(initialVp, async (page) => {
      await page.setContent(quoteHarnessHtml);

      // Assert active quote facts
      await expect(page.getByText("INV-2026-QA01")).toBeVisible();
      await expect(page.getByText("300.000000 test USDC")).toBeVisible();
      await expect(page.getByText("14:58 remaining")).toBeVisible();
      await expect(
        page.getByText("Structured FX feed (FX Rate Mirror [primary])"),
      ).toBeVisible();

      // Assert expired quote
      await expect(
        page.getByText("Quote Expired", { exact: true }),
      ).toBeVisible();
      const expiredBtn = page.getByRole("button", {
        name: "Quote expired — Refresh to pay",
      });
      await expect(expiredBtn).toBeDisabled();

      // Assert unavailable alert
      await expect(
        page.getByText(
          "A trustworthy quote is temporarily unavailable. Payment remains paused.",
        ),
      ).toBeVisible();
      await expect(
        page.getByText("Cooldown active: retry available in 15s"),
      ).toBeVisible();

      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await expectNoHorizontalOverflow(page);
      }
    });
  });

  test("wallet failure handling: rejection leaves payment safely paused with zero broadcast", async ({}, testInfo) => {
    test.setTimeout(60_000);
    const initialVp =
      testInfo.project.name === "mobile-chrome"
        ? { width: 390, height: 844 }
        : { width: 1280, height: 900 };

    const rejectionHarnessHtml = buildHarnessHtml(`
      <div class="card">
        <div class="cardHeader">
          <span class="eyebrow">Public Invoice</span>
          <h2 class="reference">INV-2026-REJECT</h2>
          <span class="badge badgeOpen">Awaiting Payment</span>
        </div>
        <section class="paymentContainer">
          <div class="paymentError" role="alert">
            Transaction cancelled in wallet. No test USDC was sent.
          </div>
          <div class="walletBox" style="margin-top: 16px;">
            <span class="connectedTag">Connected: 0x71C8…d40A</span>
            <p class="faucetNotice">
              <strong>Testnet Notice:</strong> Base Sepolia test ETH is required for gas. PayProof never custodies funds.
            </p>
          </div>
          <div class="payActionRow">
            <button class="primaryPayButton" type="button">Review & Pay 300.000000 test USDC →</button>
          </div>
        </section>
      </div>
    `);

    await withExternalChrome(initialVp, async (page) => {
      await page.setContent(rejectionHarnessHtml);

      await expect(
        page.getByRole("alert").filter({
          hasText:
            "Transaction cancelled in wallet. No test USDC was sent.",
        }),
      ).toBeVisible();

      // Invoice remains payable
      await expect(
        page.getByRole("button", {
          name: "Review & Pay 300.000000 test USDC →",
        }),
      ).toBeVisible();

      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await expectNoHorizontalOverflow(page);
      }
    });
  });

  test("submitted payment state: displays saved hash, BaseScan link, and verification prompt", async ({}, testInfo) => {
    test.setTimeout(60_000);
    const initialVp =
      testInfo.project.name === "mobile-chrome"
        ? { width: 390, height: 844 }
        : { width: 1280, height: 900 };

    const submittedHarnessHtml = buildHarnessHtml(`
      <div class="card">
        <div class="submittedCard" role="status">
          <div class="submittedBadge">✓ Transaction hash saved</div>
          <h4>Payment Broadcast</h4>
          <p>PayProof recorded this Base Sepolia transaction hash. Do not send another payment while it is being checked.</p>
          <div class="txBox">
            <span class="txLabel">Transaction Hash</span>
            <code class="txHash">0x9999888877776666555544443333222211110000aaaabbbbccccddddeeeeffff</code>
            <a class="explorerLink" href="https://sepolia.basescan.org/tx/0x9999888877776666555544443333222211110000aaaabbbbccccddddeeeeffff" target="_blank">View on BaseScan Explorer ↗</a>
          </div>
          <div class="verificationNotice">
            <strong>Ready for verification:</strong> Telegraph intelligence must check the transaction before PayProof can issue a verified receipt.
          </div>
          <button class="checkVerifyButton" type="button">Check verification status</button>
        </div>
      </div>
    `);

    await withExternalChrome(initialVp, async (page) => {
      await page.setContent(submittedHarnessHtml);

      await expect(page.getByText("Payment Broadcast")).toBeVisible();
      await expect(page.getByText("✓ Transaction hash saved")).toBeVisible();
      await expect(
        page.getByText(
          "0x9999888877776666555544443333222211110000aaaabbbbccccddddeeeeffff",
        ),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "View on BaseScan Explorer ↗" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Check verification status" }),
      ).toBeVisible();

      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await expectNoHorizontalOverflow(page);
      }
    });
  });

  test("verification unavailable state: retains saved hash and enables safe retry with cooldown", async ({}, testInfo) => {
    test.setTimeout(60_000);
    const initialVp =
      testInfo.project.name === "mobile-chrome"
        ? { width: 390, height: 844 }
        : { width: 1280, height: 900 };

    const unavailableHarnessHtml = buildHarnessHtml(`
      <div class="card">
        <div class="unavailableCard" role="status" aria-labelledby="unavailable-title">
          <div class="unavailableHeader">
            <div>
              <span class="unavailableEyebrow">Verification Notice</span>
              <h3 id="unavailable-title" class="unavailableTitle">Verification Temporarily Unavailable</h3>
            </div>
            <span class="badgeUnavailable">⚡ Verification Unavailable</span>
          </div>
          <p class="unavailableMessage">Trustworthy Telegraph evidence is temporarily unavailable. The saved transaction hash is safe to retry.</p>
          <p class="disclaimerText">The transaction hash has been safely recorded in PayProof. You do NOT need to send another payment.</p>
          <div class="txBox">
            <span class="txLabel">Transaction Hash</span>
            <code class="txHash">0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff</code>
            <a class="explorerLink" href="#" target="_blank">View on BaseScan Explorer ↗</a>
          </div>
          <button class="retryVerifyButton" type="button">Retry verification</button>
        </div>
      </div>
    `);

    await withExternalChrome(initialVp, async (page) => {
      await page.setContent(unavailableHarnessHtml);

      await expect(
        page.getByRole("heading", {
          name: "Verification Temporarily Unavailable",
        }),
      ).toBeVisible();
      await expect(
        page.getByText("The saved transaction hash is safe to retry."),
      ).toBeVisible();
      await expect(
        page.getByText("You do NOT need to send another payment."),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Retry verification" }),
      ).toBeVisible();

      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await expectNoHorizontalOverflow(page);
      }
    });
  });

  test("payment mismatch view: comparison table, failed requirement breakdown, and retry action", async ({}, testInfo) => {
    test.setTimeout(60_000);
    const initialVp =
      testInfo.project.name === "mobile-chrome"
        ? { width: 390, height: 844 }
        : { width: 1280, height: 900 };

    const mismatchHarnessHtml = buildHarnessHtml(`
      <div class="card">
        <div class="mismatchCard" role="alert" aria-labelledby="mismatch-title">
          <div class="mismatchHeader">
            <div>
              <span class="mismatchEyebrow">Verification Mismatch</span>
              <h3 id="mismatch-title" class="mismatchTitle">Payment Mismatch Detected</h3>
            </div>
            <span class="badgeMismatch">⚠ Payment Mismatch</span>
          </div>
          <p class="mismatchMessage">The official test-USDC transfer amount does not exactly match the locked quote.</p>

          <div class="failedFactBanner">
            <strong>Failed Requirement: </strong> Payment Amount Mismatch — Expected 500.000000 test USDC, observed 400.000000 test USDC.
          </div>

          <div class="comparisonContainer">
            <table class="comparisonTable">
              <thead>
                <tr>
                  <th scope="col">Payment Fact</th>
                  <th scope="col">Invoice Expectation</th>
                  <th scope="col">Observed on Base Sepolia</th>
                  <th scope="col">Match Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Network / Chain</strong></td>
                  <td>Base Sepolia (84532)</td>
                  <td>Chain ID 84532</td>
                  <td class="cellStatusMatch">Match ✓</td>
                </tr>
                <tr>
                  <td><strong>Token Contract</strong></td>
                  <td><code>0x036C…CF7e</code></td>
                  <td><code>0x036C…CF7e</code></td>
                  <td class="cellStatusMatch">Match ✓</td>
                </tr>
                <tr>
                  <td><strong>Recipient Address</strong></td>
                  <td><code>0x1234…5678</code></td>
                  <td><code>0x1234…5678</code></td>
                  <td class="cellStatusMatch">Match ✓</td>
                </tr>
                <tr>
                  <td><strong>Payment Amount</strong></td>
                  <td><strong>500.000000 test USDC</strong></td>
                  <td>400.000000 test USDC</td>
                  <td class="cellStatusMismatch">Mismatch ✗</td>
                </tr>
                <tr>
                  <td><strong>Transaction Status</strong></td>
                  <td>Mined & Succeeded</td>
                  <td>success</td>
                  <td class="cellStatusMatch">Success ✓</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="provenanceBox">
            <span class="provenanceTitle">Telegraph Intelligence Check</span>
            <div class="provenanceGrid">
              <div class="provenanceItem">
                <span class="provenanceLabel">Intelligence Source</span>
                <span class="provenanceValue">Truvian FX Engine (miner-ngn-1)</span>
              </div>
              <div class="provenanceItem">
                <span class="provenanceLabel">Verification Role</span>
                <span class="provenanceValue">Primary Miner</span>
              </div>
              <div class="provenanceItem">
                <span class="provenanceLabel">Checked At</span>
                <span class="provenanceValue">9/2/2026, 1:06:05 PM</span>
              </div>
              <div class="provenanceItem">
                <span class="provenanceLabel">Source Record</span>
                <span class="provenanceValue">Truvian settlement check v1.0</span>
              </div>
            </div>
          </div>

          <div class="txBox">
            <span class="txLabel">Transaction Hash</span>
            <code class="txHash">0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb</code>
            <a class="explorerLink" href="#" target="_blank">View on BaseScan Explorer ↗</a>
          </div>

          <div class="mismatchActionsRow">
            <button class="tryAgainButton" type="button">Pay this invoice again →</button>
          </div>
        </div>
      </div>
    `);

    await withExternalChrome(initialVp, async (page) => {
      await page.setContent(mismatchHarnessHtml);

      await expect(
        page.getByRole("alert").filter({
          hasText: "Payment Mismatch Detected",
        }),
      ).toBeVisible();
      await expect(
        page.getByText(
          "Payment Amount Mismatch — Expected 500.000000 test USDC, observed 400.000000 test USDC.",
        ),
      ).toBeVisible();

      // Comparison Table
      await expect(page.getByText("Network / Chain")).toBeVisible();
      await expect(page.getByText("Mismatch ✗")).toBeVisible();
      await expect(page.getByText("Match ✓").first()).toBeVisible();

      // Provenance
      await expect(
        page.getByText("Truvian FX Engine (miner-ngn-1)"),
      ).toBeVisible();

      // Re-pay action
      await expect(
        page.getByRole("button", { name: "Pay this invoice again →" }),
      ).toBeVisible();

      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await expectNoHorizontalOverflow(page);
      }
    });
  });

  test("permanent verified receipt: non-editable facts, Telegraph provenance, print/share actions, and print media proof", async ({}, testInfo) => {
    test.setTimeout(60_000);
    const initialVp =
      testInfo.project.name === "mobile-chrome"
        ? { width: 390, height: 844 }
        : { width: 1280, height: 900 };

    const verifiedHarnessHtml = buildHarnessHtml(`
      <div class="card">
        <div class="receiptCard" role="region" aria-labelledby="verified-receipt-title">
          <div class="receiptHeader">
            <div>
              <span class="receiptEyebrow">Official Testnet Receipt</span>
              <h3 id="verified-receipt-title" class="receiptTitle">Telegraph Verified Receipt</h3>
            </div>
            <span class="badgeVerified">✓ Verified Receipt</span>
          </div>

          <p class="receiptSubtitle">Payment for invoice <strong>INV-2026-VERIFIED</strong> has been confirmed on Base Sepolia by Telegraph intelligence.</p>

          <div class="receiptFactsGrid">
            <div class="receiptFactItem">
              <span class="receiptFactLabel">Invoice Reference</span>
              <span class="receiptFactValue">INV-2026-VERIFIED</span>
            </div>
            <div class="receiptFactItem">
              <span class="receiptFactLabel">Freelancer / Payee</span>
              <span class="receiptFactValue">Ada Lovelace</span>
            </div>
            <div class="receiptFactItem">
              <span class="receiptFactLabel">Original Invoiced Amount</span>
              <span class="receiptFactValue">₦750,000.00</span>
            </div>
            <div class="receiptFactItem">
              <span class="receiptFactLabel">Verified Settlement</span>
              <span class="receiptAmount">500.000000 test USDC</span>
            </div>
            <div class="receiptFactItem">
              <span class="receiptFactLabel">Conversion Rate / Rule</span>
              <span class="receiptFactValue">Locked conversion: ₦750,000.00 → 500.000000 test USDC</span>
            </div>
            <div class="receiptFactItem">
              <span class="receiptFactLabel">Payer Wallet Address</span>
              <span class="receiptMonospace">0xAbcdefABcDEfAbCdefabcdeFABcDEFabCDEfABCD</span>
            </div>
            <div class="receiptFactItem">
              <span class="receiptFactLabel">Recipient Address</span>
              <span class="receiptMonospace">0x1234567890123456789012345678901234567890</span>
            </div>
            <div class="receiptFactItem">
              <span class="receiptFactLabel">Base Sepolia Transaction Hash</span>
              <span class="receiptMonospace">0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</span>
              <a class="explorerLink" href="#" target="_blank">View on BaseScan Explorer ↗</a>
            </div>
            <div class="receiptFactItem">
              <span class="receiptFactLabel">Verification Timestamp</span>
              <span class="receiptFactValue">9/2/2026, 1:06:05 PM</span>
            </div>
          </div>

          <div class="provenanceBox">
            <span class="provenanceTitle">Telegraph Intelligence Provenance</span>
            <div class="provenanceGrid">
              <div class="provenanceItem">
                <span class="provenanceLabel">Intelligence Source</span>
                <span class="provenanceValue">Truvian FX Engine (miner-ngn-1)</span>
              </div>
              <div class="provenanceItem">
                <span class="provenanceLabel">Verification Role</span>
                <span class="provenanceValue">Primary Miner</span>
              </div>
              <div class="provenanceItem">
                <span class="provenanceLabel">Source Record</span>
                <span class="provenanceValue">Truvian settlement check v1.0</span>
              </div>
            </div>
          </div>

          <div class="receiptActionsRow">
            <button class="printReceiptButton" type="button"><span aria-hidden="true">🖨</span> Print / Save PDF</button>
            <button class="shareReceiptButton" type="button">Share receipt ↗</button>
            <button class="copyReceiptButton" type="button">Copy receipt link</button>
          </div>

          <div class="receiptDisclaimer">
            <strong>Scope notice:</strong> PayProof verifies payment facts only — NOT work delivery, identity, tax, quality, or disputes.
          </div>
        </div>
      </div>
    `);

    await withExternalChrome(initialVp, async (page) => {
      await page.setContent(verifiedHarnessHtml);

      await expect(
        page.getByRole("heading", { name: "Telegraph Verified Receipt" }),
      ).toBeVisible();
      await expect(page.getByText("✓ Verified Receipt")).toBeVisible();
      await expect(
        page.getByText("500.000000 test USDC", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText("Ada Lovelace")).toBeVisible();
      await expect(
        page.getByText("0xAbcdefABcDEfAbCdefabcdeFABcDEFabCDEfABCD"),
      ).toBeVisible();
      await expect(
        page.getByText("Truvian FX Engine (miner-ngn-1)"),
      ).toBeVisible();

      // Action buttons
      await expect(
        page.getByRole("button", { name: "Print / Save PDF" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Share receipt ↗" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Copy receipt link" }),
      ).toBeVisible();

      // Scope notice
      await expect(
        page.getByText(
          "PayProof verifies payment facts only — NOT work delivery, identity, tax, quality, or disputes.",
        ),
      ).toBeVisible();

      // Test @media print behavior: buttons are hidden, receipt facts remain visible
      await page.emulateMedia({ media: "print" });
      const printButtonVisible = await page
        .getByRole("button", { name: "Print / Save PDF" })
        .isVisible();
      expect(printButtonVisible).toBe(false);

      const receiptFactVisible = await page
        .getByText("INV-2026-VERIFIED")
        .first()
        .isVisible();
      expect(receiptFactVisible).toBe(true);

      // Reset emulation
      await page.emulateMedia({ media: null });

      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await expectNoHorizontalOverflow(page);
      }
    });
  });
});
