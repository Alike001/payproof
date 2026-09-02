import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicInvoicePayment } from "@/features/payments/public-invoice-payment";
import type { PublicInvoiceDto } from "@/features/invoices/types";
import type { PublicQuoteDto, QuoteRequestResult } from "@/features/quotes/types";
import type { PaymentSubmissionResult } from "@/features/payments/types";
import { BASE_SEPOLIA_CHAIN_ID, BASE_SEPOLIA_USDC_ADDRESS } from "@/lib/telegraph/constants";

// Mock wagmi hooks with importOriginal
const mockUseAccount = vi.fn();
const mockUseConnect = vi.fn();
const mockUseSwitchChain = vi.fn();
const mockUseWriteContract = vi.fn();

vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useAccount: () => mockUseAccount(),
    useConnect: () => mockUseConnect(),
    useSwitchChain: () => mockUseSwitchChain(),
    useWriteContract: () => mockUseWriteContract(),
  };
});

vi.mock("@rainbow-me/rainbowkit/components", () => ({
  ConnectButton: () => <button type="button">Connect Wallet</button>,
}));

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const sampleInvoiceNgn: PublicInvoiceDto = {
  publicId: "11111111-1111-4111-8111-111111111111",
  publicUrl: "https://payproof.example/i/11111111-1111-4111-8111-111111111111",
  reference: "INV-2026-001",
  freelancerName: "Ada Lovelace Engineering",
  clientReference: "Project #101",
  description: "Distributed systems architecture",
  currency: "NGN",
  localAmountFormatted: "₦750,000.00",
  dueDate: "2026-10-15",
  recipientAddress: "0x1234567890abcdef1234567890abcdef12345678",
  recipientDisplay: "0x1234…5678",
  status: "open",
  createdAt: "2026-09-02T12:00:00Z",
};

const sampleInvoiceUsd: PublicInvoiceDto = {
  ...sampleInvoiceNgn,
  currency: "USD",
  localAmountFormatted: "$500.00",
};

const sampleQuoteNgn: PublicQuoteDto = {
  quoteId: "22222222-2222-4222-8222-222222222222",
  sourceCurrency: "NGN",
  targetCurrency: "USD",
  localAmountFormatted: "₦750,000.00",
  rateToUsd: "1500.00",
  usdcAmountUnits: "500000000",
  usdcAmountFormatted: "500.000000",
  quotedAt: "2026-09-02T12:00:00.000Z",
  expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  sourceObservedAt: "2026-09-02T11:58:00.000Z",
  source: {
    kind: "telegraph_fx",
    name: "Telegraph Miner FX",
    minerId: "miner-ngn-1",
    minerName: "Truvian FX Engine",
    attemptRole: "primary",
  },
};

const sampleQuoteUsd: PublicQuoteDto = {
  quoteId: "33333333-3333-4333-8333-333333333333",
  sourceCurrency: "USD",
  targetCurrency: "USD",
  localAmountFormatted: "$500.00",
  rateToUsd: "1",
  usdcAmountUnits: "500000000",
  usdcAmountFormatted: "500.000000",
  quotedAt: "2026-09-02T12:00:00.000Z",
  expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  sourceObservedAt: null,
  source: {
    kind: "usd_parity",
    name: "Nominal 1 USD = 1 test USDC",
    minerId: null,
    minerName: null,
    attemptRole: null,
  },
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  mockUseAccount.mockReturnValue({
    address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    chainId: BASE_SEPOLIA_CHAIN_ID,
    isConnected: true,
  });
  mockUseConnect.mockReturnValue({
    connectAsync: vi.fn(),
    connectors: [],
    isPending: false,
  });
  mockUseSwitchChain.mockReturnValue({
    switchChainAsync: vi.fn(),
  });
  mockUseWriteContract.mockReturnValue({
    writeContractAsync: vi.fn().mockResolvedValue(`0x${"a".repeat(64)}`),
  });
});

afterEach(() => {
  if (root) {
    act(() => {
      root?.unmount();
    });
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("PublicInvoicePayment Component", () => {
  it("renders quote ready state with complete intelligence details and countdown", async () => {
    const fetchQuoteMock = vi.fn().mockResolvedValue({
      ok: true,
      quote: sampleQuoteNgn,
      reused: false,
    } as QuoteRequestResult);

    await act(async () => {
      root?.render(
        <PublicInvoicePayment
          invoice={sampleInvoiceNgn}
          onFetchQuote={fetchQuoteMock}
        />,
      );
    });

    expect(fetchQuoteMock).toHaveBeenCalledWith(sampleInvoiceNgn.publicId);
    expect(container?.textContent).toContain("500.000000 test USDC");
    expect(container?.textContent).toContain("Truvian FX Engine");
    expect(container?.textContent).toContain("1 USD = 1500.00 NGN");
    expect(container?.textContent).toContain("Review & Pay 500.000000 test USDC");
  });

  it("displays honest USD parity semantics for USD invoices", async () => {
    const fetchQuoteMock = vi.fn().mockResolvedValue({
      ok: true,
      quote: sampleQuoteUsd,
      reused: false,
    } as QuoteRequestResult);

    await act(async () => {
      root?.render(
        <PublicInvoicePayment
          invoice={sampleInvoiceUsd}
          onFetchQuote={fetchQuoteMock}
        />,
      );
    });

    expect(container?.textContent).toContain("1 USD = 1 test USDC (Nominal testnet parity)");
    expect(container?.textContent).toContain("Nominal 1:1 USD test parity");
  });

  it("handles unavailable quote safely and pauses payment", async () => {
    const fetchQuoteMock = vi.fn().mockResolvedValue({
      ok: false,
      code: "QUOTE_UNAVAILABLE",
      message: "A trustworthy quote is temporarily unavailable. Payment remains paused.",
      retryable: true,
      retryAfterSeconds: 10,
    } as QuoteRequestResult);

    await act(async () => {
      root?.render(
        <PublicInvoicePayment
          invoice={sampleInvoiceNgn}
          onFetchQuote={fetchQuoteMock}
        />,
      );
    });

    expect(container?.textContent).toContain("Quote Unavailable");
    expect(container?.textContent).toContain("Payment remains paused");
    expect(container?.textContent).toContain("Cooldown active: retry available in 10s");

    const payBtn = container?.querySelector("button[class*='primaryPayButton']") as HTMLButtonElement;
    expect(payBtn?.disabled).toBe(true);
  });

  it("disables payment and displays notice when quote is expired", async () => {
    const expiredQuote: PublicQuoteDto = {
      ...sampleQuoteNgn,
      expiresAt: new Date(Date.now() - 5000).toISOString(),
    };
    const fetchQuoteMock = vi.fn().mockResolvedValue({
      ok: true,
      quote: expiredQuote,
      reused: false,
    } as QuoteRequestResult);

    await act(async () => {
      root?.render(
        <PublicInvoicePayment
          invoice={sampleInvoiceNgn}
          onFetchQuote={fetchQuoteMock}
        />,
      );
    });

    expect(container?.textContent).toContain("Quote Expired");
    const payBtn = container?.querySelector("button[class*='primaryPayButton']") as HTMLButtonElement;
    expect(payBtn?.disabled).toBe(true);
  });

  it("prompts to switch chain when wallet is connected to wrong network", async () => {
    mockUseAccount.mockReturnValue({
      address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      chainId: 1, // Ethereum mainnet, not Base Sepolia
      isConnected: true,
    });
    const switchChainMock = vi.fn();
    mockUseSwitchChain.mockReturnValue({ switchChainAsync: switchChainMock });

    const fetchQuoteMock = vi.fn().mockResolvedValue({
      ok: true,
      quote: sampleQuoteNgn,
      reused: false,
    } as QuoteRequestResult);

    await act(async () => {
      root?.render(
        <PublicInvoicePayment
          invoice={sampleInvoiceNgn}
          onFetchQuote={fetchQuoteMock}
        />,
      );
    });

    expect(container?.textContent).toContain("unsupported network. Switch to Base Sepolia");
    const switchBtn = Array.from(container?.querySelectorAll("button") || []).find(
      (b) => b.textContent?.includes("Switch to Base Sepolia"),
    );
    expect(switchBtn).toBeDefined();

    await act(async () => {
      switchBtn?.click();
    });

    expect(switchChainMock).toHaveBeenCalledWith({ chainId: BASE_SEPOLIA_CHAIN_ID });
  });

  it("opens review dialog showing exact parameters and executes payment with immediate save", async () => {
    const txHash = `0x${"b".repeat(64)}` as `0x${string}`;
    const fetchQuoteMock = vi.fn().mockResolvedValue({
      ok: true,
      quote: sampleQuoteNgn,
      reused: false,
    } as QuoteRequestResult);
    const savePaymentMock = vi.fn().mockResolvedValue({
      ok: true,
      payment: {
        paymentId: "pay_123",
        quoteId: sampleQuoteNgn.quoteId,
        txHash,
        submittedByWallet: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        state: "submitted",
        submittedAt: "2026-09-02T12:05:00.000Z",
      },
      reused: false,
    } as PaymentSubmissionResult);
    const writeContractMock = vi.fn().mockResolvedValue(txHash);

    await act(async () => {
      root?.render(
        <PublicInvoicePayment
          invoice={sampleInvoiceNgn}
          onFetchQuote={fetchQuoteMock}
          onSavePayment={savePaymentMock}
          onWriteContract={writeContractMock}
        />,
      );
    });

    // 1. Click Review & Pay
    const reviewBtn = Array.from(container?.querySelectorAll("button") || []).find(
      (b) => b.textContent?.includes("Review & Pay"),
    );
    expect(reviewBtn).toBeDefined();

    await act(async () => {
      reviewBtn?.click();
    });

    // 2. Verify review dialog parameters
    expect(container?.textContent).toContain("Confirm Payment Transaction");
    expect(container?.textContent).toContain("500.000000 test USDC");
    expect(container?.textContent).toContain(BASE_SEPOLIA_USDC_ADDRESS);
    expect(container?.textContent).toContain(sampleInvoiceNgn.recipientAddress);

    // 3. Confirm & Pay
    const confirmBtn = Array.from(container?.querySelectorAll("button") || []).find(
      (b) => b.textContent?.includes("Confirm & Pay"),
    );
    expect(confirmBtn).toBeDefined();

    await act(async () => {
      confirmBtn?.click();
    });

    // 4. Verify transaction execution and IMMEDIATE save
    expect(writeContractMock).toHaveBeenCalled();
    expect(savePaymentMock).toHaveBeenCalledWith(
      sampleInvoiceNgn.publicId,
      {
        quoteId: sampleQuoteNgn.quoteId,
        txHash,
        submittedByWallet: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      },
    );

    // 5. Verify submitted state (NOT labeled as "Verified")
    expect(container?.textContent).toContain("Payment Broadcast");
    expect(container?.textContent).toContain("Payment Successfully Broadcast");
    expect(container?.textContent).toContain(txHash);
    expect(container?.textContent).toContain("Verification in progress");
    expect(container?.textContent).not.toContain("Verified Receipt");
  });

  it("handles wallet rejection safely without false broadcast or saving", async () => {
    const fetchQuoteMock = vi.fn().mockResolvedValue({
      ok: true,
      quote: sampleQuoteNgn,
      reused: false,
    } as QuoteRequestResult);
    const savePaymentMock = vi.fn();
    const rejectionError = new Error("User rejected the request");
    (rejectionError as unknown as { code: number }).code = 4001;
    const writeContractMock = vi.fn().mockRejectedValue(rejectionError);

    await act(async () => {
      root?.render(
        <PublicInvoicePayment
          invoice={sampleInvoiceNgn}
          onFetchQuote={fetchQuoteMock}
          onSavePayment={savePaymentMock}
          onWriteContract={writeContractMock}
        />,
      );
    });

    const reviewBtn = Array.from(container?.querySelectorAll("button") || []).find(
      (b) => b.textContent?.includes("Review & Pay"),
    );
    await act(async () => {
      reviewBtn?.click();
    });

    const confirmBtn = Array.from(container?.querySelectorAll("button") || []).find(
      (b) => b.textContent?.includes("Confirm & Pay"),
    );
    await act(async () => {
      confirmBtn?.click();
    });

    expect(savePaymentMock).not.toHaveBeenCalled();
    expect(container?.textContent).toContain("Transaction cancelled in wallet. No test USDC was sent.");
    expect(container?.textContent).not.toContain("Payment Broadcast");
  });

  it("enforces quote re-review if quote changes upon refresh", async () => {
    let callCount = 0;
    const secondQuote: PublicQuoteDto = {
      ...sampleQuoteNgn,
      quoteId: "44444444-4444-4444-4444-444444444444",
      rateToUsd: "1550.00",
      usdcAmountFormatted: "483.870967",
    };

    const fetchQuoteMock = vi.fn().mockImplementation(async () => {
      callCount += 1;
      return {
        ok: true,
        quote: callCount === 1 ? sampleQuoteNgn : secondQuote,
        reused: false,
      } as QuoteRequestResult;
    });

    await act(async () => {
      root?.render(
        <PublicInvoicePayment
          invoice={sampleInvoiceNgn}
          onFetchQuote={fetchQuoteMock}
        />,
      );
    });

    // Go to review step
    const reviewBtn = Array.from(container?.querySelectorAll("button") || []).find(
      (b) => b.textContent?.includes("Review & Pay"),
    );
    await act(async () => {
      reviewBtn?.click();
    });

    expect(container?.textContent).toContain("Confirm Payment Transaction");

    // Click refresh quote while in review step
    const refreshBtn = Array.from(container?.querySelectorAll("button") || []).find(
      (b) => b.textContent?.includes("Refresh quote") || b.textContent?.includes("Back to quote"),
    );
    await act(async () => {
      refreshBtn?.click();
    });

    // Refresh quote explicitly
    const actualRefreshBtn = Array.from(container?.querySelectorAll("button") || []).find(
      (b) => b.textContent?.includes("Refresh quote"),
    );
    await act(async () => {
      actualRefreshBtn?.click();
    });

    // State returns to quote ready with updated quote for re-review
    expect(container?.textContent).toContain("483.870967 test USDC");
    expect(container?.textContent).toContain("Review & Pay 483.870967 test USDC");
  });
});
