import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PublicInvoicePayment } from "@/features/payments/public-invoice-payment";
import type { PublicInvoiceDto } from "@/features/invoices/types";
import type {
  PublicQuoteDto,
  QuoteRequestResult,
} from "@/features/quotes/types";
import type {
  PaymentSubmissionResult,
  PublicPaymentResultDto,
} from "@/features/payments/types";
import {
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_USDC_ADDRESS,
} from "@/lib/telegraph/constants";

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
  rateToUsd: "0.000666666666666667",
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

const recoveredSubmittedPayment: PublicPaymentResultDto = {
  paymentId: "66666666-6666-4666-8666-666666666666",
  quoteId: sampleQuoteNgn.quoteId,
  state: "submitted",
  code: "TRANSACTION_PENDING",
  message: "The transaction is still pending on Base Sepolia.",
  retryable: true,
  transaction: {
    hash: `0x${"c".repeat(64)}`,
    explorerUrl: `https://sepolia.basescan.org/tx/0x${"c".repeat(64)}`,
    submittedByWallet: "0xAbcdefABcDEfAbCdefabcdeFABcDEFabCDEfABCD",
    submittedAt: "2026-09-02T12:05:00.000Z",
  },
  expected: {
    chainId: BASE_SEPOLIA_CHAIN_ID,
    network: "Base Sepolia",
    token: "USDC",
    tokenAddress: BASE_SEPOLIA_USDC_ADDRESS,
    recipientAddress: "0x1234567890AbcdEF1234567890aBcdef12345678",
    usdcAmountUnits: "500000000",
    usdcAmountFormatted: "500.000000",
  },
  observed: {
    chainId: null,
    tokenAddress: null,
    recipientAddress: null,
    amountUnits: null,
    amountFormatted: null,
    transactionStatus: null,
  },
  evidence: null,
  receipt: null,
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
    expect(container?.textContent).toContain(
      "1 NGN = 0.000666666666666667 USD",
    );
    expect(container?.textContent).toContain(
      "Review & Pay 500.000000 test USDC",
    );
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

    expect(container?.textContent).toContain(
      "1 USD = 1 test USDC (Nominal testnet parity)",
    );
    expect(container?.textContent).toContain("Nominal 1:1 USD test parity");
  });

  it("handles unavailable quote safely and pauses payment", async () => {
    const fetchQuoteMock = vi.fn().mockResolvedValue({
      ok: false,
      code: "QUOTE_UNAVAILABLE",
      message:
        "A trustworthy quote is temporarily unavailable. Payment remains paused.",
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
    expect(container?.textContent).toContain(
      "Cooldown active: retry available in 10s",
    );

    const payBtn = container?.querySelector(
      "button[class*='primaryPayButton']",
    ) as HTMLButtonElement;
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
    const payBtn = container?.querySelector(
      "button[class*='primaryPayButton']",
    ) as HTMLButtonElement;
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

    expect(container?.textContent).toContain(
      "unsupported network. Switch to Base Sepolia",
    );
    const switchBtn = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Switch to Base Sepolia"));
    expect(switchBtn).toBeDefined();

    await act(async () => {
      switchBtn?.click();
    });

    expect(switchChainMock).toHaveBeenCalledWith({
      chainId: BASE_SEPOLIA_CHAIN_ID,
    });
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
        paymentId: "55555555-5555-4555-8555-555555555555",
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
    const reviewBtn = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Review & Pay"));
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
    const confirmBtn = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Confirm & Pay"));
    expect(confirmBtn).toBeDefined();

    await act(async () => {
      confirmBtn?.click();
    });

    // 4. Verify transaction execution and IMMEDIATE save
    expect(writeContractMock).toHaveBeenCalled();
    expect(writeContractMock).toHaveBeenCalledWith(
      expect.objectContaining({
        chainId: BASE_SEPOLIA_CHAIN_ID,
        address: BASE_SEPOLIA_USDC_ADDRESS,
        functionName: "transfer",
        args: ["0x1234567890AbcdEF1234567890aBcdef12345678", 500000000n],
      }),
    );
    expect(savePaymentMock).toHaveBeenCalledWith(sampleInvoiceNgn.publicId, {
      quoteId: sampleQuoteNgn.quoteId,
      txHash,
      submittedByWallet: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    });

    // 5. Verify submitted state (NOT labeled as "Verified")
    expect(container?.textContent).toContain("Payment Broadcast");
    expect(container?.textContent).toContain("Transaction hash saved");
    expect(container?.textContent).toContain("Payment Broadcast");
    expect(container?.textContent).toContain(txHash);
    expect(container?.textContent).toContain("Ready for verification");
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

    const reviewBtn = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Review & Pay"));
    await act(async () => {
      reviewBtn?.click();
    });

    const confirmBtn = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Confirm & Pay"));
    await act(async () => {
      confirmBtn?.click();
    });

    expect(savePaymentMock).not.toHaveBeenCalled();
    expect(container?.textContent).toContain(
      "Transaction cancelled in wallet. No test USDC was sent.",
    );
    expect(container?.textContent).not.toContain("Payment Broadcast");
  });

  it("keeps a broadcast hash visible and retries only persistence when saving fails", async () => {
    const txHash = `0x${"d".repeat(64)}` as `0x${string}`;
    const fetchQuoteMock = vi.fn().mockResolvedValue({
      ok: true,
      quote: sampleQuoteNgn,
      reused: false,
    } as QuoteRequestResult);
    const savePaymentMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        code: "PAYMENT_UNAVAILABLE",
        message:
          "The transaction hash could not be saved safely. Do not send another payment yet.",
        retryable: true,
      } as PaymentSubmissionResult)
      .mockResolvedValueOnce({
        ok: true,
        payment: {
          paymentId: "77777777-7777-4777-8777-777777777777",
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

    const reviewButton = Array.from(
      container?.querySelectorAll("button") ?? [],
    ).find((button) => button.textContent?.includes("Review & Pay"));
    await act(async () => reviewButton?.click());
    const confirmButton = Array.from(
      container?.querySelectorAll("button") ?? [],
    ).find((button) => button.textContent?.includes("Confirm & Pay"));
    await act(async () => confirmButton?.click());

    expect(container?.textContent).toContain(
      "Payment broadcast — hash not saved yet",
    );
    expect(container?.textContent).toContain(txHash);
    expect(container?.textContent).toContain("Do not pay again");
    expect(writeContractMock).toHaveBeenCalledTimes(1);
    expect(savePaymentMock).toHaveBeenCalledTimes(1);

    const retryButton = Array.from(
      container?.querySelectorAll("button") ?? [],
    ).find((button) => button.textContent?.includes("Retry saving this hash"));
    await act(async () => retryButton?.click());

    expect(writeContractMock).toHaveBeenCalledTimes(1);
    expect(savePaymentMock).toHaveBeenCalledTimes(2);
    expect(container?.textContent).toContain("Transaction hash saved");
  });

  it("recovers a saved submitted payment without requesting a new quote or enabling Pay", async () => {
    const fetchQuoteMock = vi.fn();

    await act(async () => {
      root?.render(
        <PublicInvoicePayment
          invoice={sampleInvoiceNgn}
          initialPayment={recoveredSubmittedPayment}
          onFetchQuote={fetchQuoteMock}
        />,
      );
    });

    expect(fetchQuoteMock).not.toHaveBeenCalled();
    expect(container?.textContent).toContain("Transaction hash saved");
    expect(container?.textContent).toContain(
      recoveredSubmittedPayment.transaction.hash,
    );
    expect(container?.textContent).toContain("Do not send another payment");
    expect(container?.textContent).not.toContain("Review & Pay");
  });

  it("enforces quote re-review if quote changes upon refresh", async () => {
    let callCount = 0;
    const secondQuote: PublicQuoteDto = {
      ...sampleQuoteNgn,
      quoteId: "44444444-4444-4444-4444-444444444444",
      rateToUsd: "0.000645161289333333",
      usdcAmountUnits: "483870967",
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
    const reviewBtn = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Review & Pay"));
    await act(async () => {
      reviewBtn?.click();
    });

    expect(container?.textContent).toContain("Confirm Payment Transaction");

    // Refresh directly while the old amount is still in the review state.
    const refreshButton = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((button) => button.textContent?.includes("Refresh quote"));
    await act(async () => {
      refreshButton?.click();
    });

    // State returns to quote ready with updated quote for re-review
    expect(container?.textContent).toContain("483.870967 test USDC");
    expect(container?.textContent).toContain(
      "Review & Pay 483.870967 test USDC",
    );
    expect(container?.textContent).not.toContain("Confirm Payment Transaction");
  });

  it("renders complete permanent verified receipt with non-editable facts and Telegraph provenance", async () => {
    const verifiedPayment: PublicPaymentResultDto = {
      paymentId: "77777777-7777-4777-8777-777777777777",
      quoteId: sampleQuoteNgn.quoteId,
      state: "verified",
      code: null,
      message:
        "Telegraph evidence matches the exact Base Sepolia test-USDC payment.",
      retryable: false,
      transaction: {
        hash: `0x${"a".repeat(64)}`,
        explorerUrl: `https://sepolia.basescan.org/tx/0x${"a".repeat(64)}`,
        submittedByWallet: "0xAbcdefABcDEfAbCdefabcdeFABcDEFabCDEfABCD",
        submittedAt: "2026-09-02T12:05:00.000Z",
      },
      expected: {
        chainId: BASE_SEPOLIA_CHAIN_ID,
        network: "Base Sepolia",
        token: "USDC",
        tokenAddress: BASE_SEPOLIA_USDC_ADDRESS,
        recipientAddress: sampleInvoiceNgn.recipientAddress,
        usdcAmountUnits: "500000000",
        usdcAmountFormatted: "500.000000",
      },
      observed: {
        chainId: "84532",
        tokenAddress: BASE_SEPOLIA_USDC_ADDRESS,
        recipientAddress: sampleInvoiceNgn.recipientAddress,
        amountUnits: "500000000",
        amountFormatted: "500.000000",
        transactionStatus: "success",
      },
      evidence: {
        minerId: "miner-ngn-1",
        minerName: "Truvian FX Engine",
        attemptRole: "primary",
        observedAt: "2026-09-02T12:06:00.000Z",
        checkedAt: "2026-09-02T12:06:05.000Z",
        source: "Truvian settlement check v1.0",
      },
      receipt: {
        payerAddress: "0xAbcdefABcDEfAbCdefabcdeFABcDEFabCDEfABCD",
        verifiedAt: "2026-09-02T12:06:05.000Z",
      },
    };

    const fetchQuoteMock = vi.fn();

    await act(async () => {
      root?.render(
        <PublicInvoicePayment
          invoice={sampleInvoiceNgn}
          initialPayment={verifiedPayment}
          onFetchQuote={fetchQuoteMock}
        />,
      );
    });

    // Does not fetch a quote
    expect(fetchQuoteMock).not.toHaveBeenCalled();

    // Contains Verified language and styling
    expect(container?.textContent).toContain("Telegraph Verified Receipt");
    expect(container?.textContent).toContain("Verified Receipt");

    // Contains invoice facts
    expect(container?.textContent).toContain(sampleInvoiceNgn.reference);
    expect(container?.textContent).toContain(sampleInvoiceNgn.freelancerName);
    expect(container?.textContent).toContain(sampleInvoiceNgn.clientReference!);
    expect(container?.textContent).toContain(sampleInvoiceNgn.description);
    expect(container?.textContent).toContain(
      sampleInvoiceNgn.localAmountFormatted,
    );
    expect(container?.textContent).toContain(sampleInvoiceNgn.dueDate);

    // Contains settlement facts
    expect(container?.textContent).toContain("500.000000 test USDC");
    expect(container?.textContent).toContain(
      verifiedPayment.receipt!.payerAddress,
    );
    expect(container?.textContent).toContain(sampleInvoiceNgn.recipientAddress);
    expect(container?.textContent).toContain(verifiedPayment.transaction.hash);
    expect(container?.textContent).toContain("View on BaseScan Explorer ↗");

    // Contains Telegraph intelligence provenance
    expect(container?.textContent).toContain("Truvian FX Engine");
    expect(container?.textContent).toContain("miner-ngn-1");
    expect(container?.textContent).toContain("Primary Miner");
    expect(container?.textContent).toContain("Truvian settlement check v1.0");

    // Contains legal / scope notice
    expect(container?.textContent).toContain(
      "PayProof verifies payment facts only — NOT work delivery, identity, tax, quality, or disputes.",
    );

    // Action buttons
    expect(container?.textContent).toContain("Print / Save PDF");
    expect(container?.textContent).toContain("Share receipt");
    expect(container?.textContent).toContain("Copy receipt link");
  });

  it("handles receipt print, share, and copy interactions safely", async () => {
    const verifiedPayment: PublicPaymentResultDto = {
      paymentId: "77777777-7777-4777-8777-777777777777",
      quoteId: sampleQuoteNgn.quoteId,
      state: "verified",
      code: null,
      message:
        "Telegraph evidence matches the exact Base Sepolia test-USDC payment.",
      retryable: false,
      transaction: {
        hash: `0x${"a".repeat(64)}`,
        explorerUrl: `https://sepolia.basescan.org/tx/0x${"a".repeat(64)}`,
        submittedByWallet: "0xAbcdefABcDEfAbCdefabcdeFABcDEFabCDEfABCD",
        submittedAt: "2026-09-02T12:05:00.000Z",
      },
      expected: {
        chainId: BASE_SEPOLIA_CHAIN_ID,
        network: "Base Sepolia",
        token: "USDC",
        tokenAddress: BASE_SEPOLIA_USDC_ADDRESS,
        recipientAddress: sampleInvoiceNgn.recipientAddress,
        usdcAmountUnits: "500000000",
        usdcAmountFormatted: "500.000000",
      },
      observed: {
        chainId: "84532",
        tokenAddress: BASE_SEPOLIA_USDC_ADDRESS,
        recipientAddress: sampleInvoiceNgn.recipientAddress,
        amountUnits: "500000000",
        amountFormatted: "500.000000",
        transactionStatus: "success",
      },
      evidence: {
        minerId: "miner-ngn-1",
        minerName: "Truvian FX Engine",
        attemptRole: "primary",
        observedAt: "2026-09-02T12:06:00.000Z",
        checkedAt: "2026-09-02T12:06:05.000Z",
        source: "Truvian settlement check v1.0",
      },
      receipt: {
        payerAddress: "0xAbcdefABcDEfAbCdefabcdeFABcDEFabCDEfABCD",
        verifiedAt: "2026-09-02T12:06:05.000Z",
      },
    };

    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    await act(async () => {
      root?.render(
        <PublicInvoicePayment
          invoice={sampleInvoiceNgn}
          initialPayment={verifiedPayment}
        />,
      );
    });

    // Test Print
    const printBtn = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Print / Save PDF"));
    await act(async () => {
      printBtn?.click();
    });
    expect(printSpy).toHaveBeenCalledTimes(1);

    // Test Copy link
    const copyBtn = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Copy receipt link"));
    await act(async () => {
      copyBtn?.click();
    });
    expect(writeTextMock).toHaveBeenCalledWith(sampleInvoiceNgn.publicUrl);
    expect(container?.textContent).toContain("Receipt link copied to clipboard!");

    printSpy.mockRestore();
  });

  it("renders payment mismatch with failed requirement and comparison table", async () => {
    const mismatchPayment: PublicPaymentResultDto = {
      paymentId: "88888888-8888-4888-8888-888888888888",
      quoteId: sampleQuoteNgn.quoteId,
      state: "mismatch",
      code: "WRONG_AMOUNT",
      message:
        "The official test-USDC transfer amount does not exactly match the locked quote.",
      retryable: false,
      transaction: {
        hash: `0x${"b".repeat(64)}`,
        explorerUrl: `https://sepolia.basescan.org/tx/0x${"b".repeat(64)}`,
        submittedByWallet: "0xAbcdefABcDEfAbCdefabcdeFABcDEFabCDEfABCD",
        submittedAt: "2026-09-02T12:05:00.000Z",
      },
      expected: {
        chainId: BASE_SEPOLIA_CHAIN_ID,
        network: "Base Sepolia",
        token: "USDC",
        tokenAddress: BASE_SEPOLIA_USDC_ADDRESS,
        recipientAddress: sampleInvoiceNgn.recipientAddress,
        usdcAmountUnits: "500000000",
        usdcAmountFormatted: "500.000000",
      },
      observed: {
        chainId: "84532",
        tokenAddress: BASE_SEPOLIA_USDC_ADDRESS,
        recipientAddress: sampleInvoiceNgn.recipientAddress,
        amountUnits: "400000000",
        amountFormatted: "400.000000",
        transactionStatus: "success",
      },
      evidence: {
        minerId: "miner-ngn-1",
        minerName: "Truvian FX Engine",
        attemptRole: "primary",
        observedAt: "2026-09-02T12:06:00.000Z",
        checkedAt: "2026-09-02T12:06:05.000Z",
        source: "Truvian settlement check v1.0",
      },
      receipt: null,
    };

    const fetchQuoteMock = vi.fn().mockResolvedValue({
      ok: true,
      quote: sampleQuoteNgn,
      reused: false,
    });

    await act(async () => {
      root?.render(
        <PublicInvoicePayment
          invoice={sampleInvoiceNgn}
          initialPayment={mismatchPayment}
          onFetchQuote={fetchQuoteMock}
        />,
      );
    });

    // Does NOT say Verified
    expect(container?.textContent).not.toContain("Telegraph Verified Receipt");
    expect(container?.textContent).toContain("Payment Mismatch Detected");
    expect(container?.textContent).toContain("Payment Mismatch");

    // Identifies the failed requirement clearly
    expect(container?.textContent).toContain(
      "Payment Amount Mismatch — Expected 500.000000 test USDC, observed 400.000000 test USDC.",
    );

    // Displays comparison table
    expect(container?.textContent).toContain("Payment Fact");
    expect(container?.textContent).toContain("Invoice Expectation");
    expect(container?.textContent).toContain("Observed on Base Sepolia");
    expect(container?.textContent).toContain("Mismatch ✗");

    // Provides action to pay again
    const tryAgainBtn = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Pay this invoice again"));
    expect(tryAgainBtn).toBeDefined();

    await act(async () => {
      tryAgainBtn?.click();
    });

    // Returns to quote flow
    expect(fetchQuoteMock).toHaveBeenCalled();
  });

  it("renders verification unavailable state and allows retrying verification", async () => {
    const unavailablePayment: PublicPaymentResultDto = {
      paymentId: "99999999-9999-4999-8999-999999999999",
      quoteId: sampleQuoteNgn.quoteId,
      state: "unavailable",
      code: "VERIFICATION_UNAVAILABLE",
      message:
        "Trustworthy Telegraph evidence is temporarily unavailable. The saved hash can be retried.",
      retryable: true,
      retryAfterSeconds: 0,
      transaction: {
        hash: `0x${"d".repeat(64)}`,
        explorerUrl: `https://sepolia.basescan.org/tx/0x${"d".repeat(64)}`,
        submittedByWallet: "0xAbcdefABcDEfAbCdefabcdeFABcDEFabCDEfABCD",
        submittedAt: "2026-09-02T12:05:00.000Z",
      },
      expected: {
        chainId: BASE_SEPOLIA_CHAIN_ID,
        network: "Base Sepolia",
        token: "USDC",
        tokenAddress: BASE_SEPOLIA_USDC_ADDRESS,
        recipientAddress: sampleInvoiceNgn.recipientAddress,
        usdcAmountUnits: "500000000",
        usdcAmountFormatted: "500.000000",
      },
      observed: {
        chainId: null,
        tokenAddress: null,
        recipientAddress: null,
        amountUnits: null,
        amountFormatted: null,
        transactionStatus: null,
      },
      evidence: null,
      receipt: null,
    };

    const verifyMock = vi.fn().mockResolvedValue({
      ok: true,
      saved: true,
      result: {
        ...unavailablePayment,
        state: "verified",
        code: null,
        receipt: {
          payerAddress: "0xAbcdefABcDEfAbCdefabcdeFABcDEFabCDEfABCD",
          verifiedAt: "2026-09-02T12:10:00.000Z",
        },
        evidence: {
          minerId: "miner-ngn-1",
          minerName: "Truvian FX Engine",
          attemptRole: "primary",
          observedAt: "2026-09-02T12:09:00.000Z",
          checkedAt: "2026-09-02T12:10:00.000Z",
          source: "Truvian settlement check v1.0",
        },
      },
    });

    await act(async () => {
      root?.render(
        <PublicInvoicePayment
          invoice={sampleInvoiceNgn}
          initialPayment={unavailablePayment}
          onVerifyPayment={verifyMock}
        />,
      );
    });

    expect(container?.textContent).toContain(
      "Verification Temporarily Unavailable",
    );
    expect(container?.textContent).toContain(
      "The transaction hash has been safely recorded",
    );
    expect(container?.textContent).toContain(
      unavailablePayment.transaction.hash,
    );

    const retryBtn = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Retry verification"));
    expect(retryBtn).toBeDefined();

    await act(async () => {
      retryBtn?.click();
    });

    expect(verifyMock).toHaveBeenCalledWith(
      sampleInvoiceNgn.publicId,
      unavailablePayment.paymentId,
    );

    // Transitions to verified
    expect(container?.textContent).toContain("Telegraph Verified Receipt");
  });

  it("allows checking verification from submitted state and transitions to verified receipt", async () => {
    const verifyMock = vi.fn().mockResolvedValue({
      ok: true,
      saved: true,
      result: {
        paymentId: recoveredSubmittedPayment.paymentId,
        quoteId: recoveredSubmittedPayment.quoteId,
        state: "verified",
        code: null,
        message:
          "Telegraph evidence matches the exact Base Sepolia test-USDC payment.",
        retryable: false,
        transaction: recoveredSubmittedPayment.transaction,
        expected: recoveredSubmittedPayment.expected,
        observed: {
          chainId: "84532",
          tokenAddress: BASE_SEPOLIA_USDC_ADDRESS,
          recipientAddress: sampleInvoiceNgn.recipientAddress,
          amountUnits: "500000000",
          amountFormatted: "500.000000",
          transactionStatus: "success",
        },
        evidence: {
          minerId: "miner-ngn-1",
          minerName: "Truvian FX Engine",
          attemptRole: "primary",
          observedAt: "2026-09-02T12:06:00.000Z",
          checkedAt: "2026-09-02T12:06:05.000Z",
          source: "Truvian settlement check v1.0",
        },
        receipt: {
          payerAddress: "0xAbcdefABcDEfAbCdefabcdeFABcDEFabCDEfABCD",
          verifiedAt: "2026-09-02T12:06:05.000Z",
        },
      },
    });

    await act(async () => {
      root?.render(
        <PublicInvoicePayment
          invoice={sampleInvoiceNgn}
          initialPayment={recoveredSubmittedPayment}
          onVerifyPayment={verifyMock}
        />,
      );
    });

    expect(container?.textContent).toContain("Payment Broadcast");
    expect(container?.textContent).toContain("Transaction hash saved");

    const checkBtn = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Check verification status"));
    expect(checkBtn).toBeDefined();

    await act(async () => {
      checkBtn?.click();
    });

    expect(verifyMock).toHaveBeenCalledWith(
      sampleInvoiceNgn.publicId,
      recoveredSubmittedPayment.paymentId,
    );

    // Transitions to Verified Receipt
    expect(container?.textContent).toContain("Telegraph Verified Receipt");
    expect(container?.textContent).toContain("✓ Verified Receipt");
  });
});
