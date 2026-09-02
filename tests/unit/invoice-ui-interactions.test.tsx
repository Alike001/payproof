import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreatorDashboard } from "@/features/invoices/creator-dashboard";
import { InvoiceForm } from "@/features/invoices/invoice-form";
import { PublicInvoiceCard } from "@/features/invoices/public-invoice-card";
import type {
  CreatorInvoiceItem,
  PublicInvoicePageState,
} from "@/features/invoices/types";

let container: HTMLDivElement | null = null;
let root: Root | null = null;
let originalClipboardDescriptor: PropertyDescriptor | undefined;
let originalShareDescriptor: PropertyDescriptor | undefined;

const sampleReadyState: PublicInvoicePageState = {
  kind: "ready",
  payment: null,
  invoice: {
    publicId: "pub_123",
    publicUrl: "https://payproof.example/i/pub_123",
    reference: "INV-2026-001",
    freelancerName: "Ada Studio",
    clientReference: "Acme Corp",
    description: "Brand identity design sprint",
    currency: "USD",
    localAmountFormatted: "500.00 USD",
    dueDate: "2026-10-01",
    recipientAddress: "0x1234567890abcdef1234567890abcdef12345678",
    recipientDisplay: "0x1234…5678",
    status: "open",
    createdAt: "2026-09-01T12:00:00Z",
  },
};

beforeEach(() => {
  originalClipboardDescriptor = Object.getOwnPropertyDescriptor(
    navigator,
    "clipboard",
  );
  originalShareDescriptor = Object.getOwnPropertyDescriptor(navigator, "share");
  vi.useFakeTimers();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

function restoreNavigatorProperty(
  property: "clipboard" | "share",
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor) {
    Object.defineProperty(navigator, property, descriptor);
    return;
  }
  Reflect.deleteProperty(navigator, property);
}

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
  restoreNavigatorProperty("clipboard", originalClipboardDescriptor);
  restoreNavigatorProperty("share", originalShareDescriptor);
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function setInputValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(element),
    "value",
  )?.set;
  if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("Invoice UI Interaction Regression Coverage", () => {
  it("1. falls back from unavailable/failed native Share API to clipboard copy", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, "share", {
      value: vi.fn().mockRejectedValue(new Error("Native share failed")),
      writable: true,
      configurable: true,
    });

    await act(async () => {
      root?.render(<PublicInvoiceCard state={sampleReadyState} />);
    });

    const shareBtn = container?.querySelector("button") as HTMLButtonElement;
    expect(shareBtn).not.toBeNull();

    await act(async () => {
      shareBtn.click();
    });

    expect(writeTextMock).toHaveBeenCalledWith(
      "https://payproof.example/i/pub_123",
    );
    expect(container?.textContent).toContain("Link copied to clipboard!");
  });

  it("2. displays honest visible success feedback when clipboard copy succeeds", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, "share", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    await act(async () => {
      root?.render(<PublicInvoiceCard state={sampleReadyState} />);
    });

    const shareBtn = container?.querySelector("button") as HTMLButtonElement;
    await act(async () => {
      shareBtn.click();
    });

    expect(shareBtn.textContent).toContain("Link Copied! ✓");
    expect(container?.textContent).toContain("Link copied to clipboard!");
  });

  it("3. shows safe manual-copy message and never claims success when clipboard access is rejected or missing", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("Permission denied")),
      },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(navigator, "share", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    await act(async () => {
      root?.render(<PublicInvoiceCard state={sampleReadyState} />);
    });

    const shareBtn = container?.querySelector("button") as HTMLButtonElement;
    await act(async () => {
      shareBtn.click();
    });

    expect(shareBtn.textContent).not.toContain("Link Copied!");
    expect(container?.textContent).toContain("Could not copy link automatically");

    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    await act(async () => {
      shareBtn.click();
    });

    expect(shareBtn.textContent).not.toContain("Link Copied!");
    expect(container?.textContent).toContain("Could not copy link automatically");
  });

  it("4. does not fall back to clipboard or claim success when native Share throws AbortError", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    const abortError = new Error("User cancelled share dialog");
    abortError.name = "AbortError";
    Object.defineProperty(navigator, "share", {
      value: vi.fn().mockRejectedValue(abortError),
      writable: true,
      configurable: true,
    });

    await act(async () => {
      root?.render(<PublicInvoiceCard state={sampleReadyState} />);
    });

    const shareBtn = container?.querySelector("button") as HTMLButtonElement;
    await act(async () => {
      shareBtn.click();
    });

    expect(writeTextMock).not.toHaveBeenCalled();
    expect(shareBtn.textContent).not.toContain("Link Copied!");
    expect(container?.textContent).not.toContain("Shared successfully!");
    expect(container?.textContent).not.toContain("Link copied to clipboard!");
  });

  it("5. keeps invoice Open and displays safe error when cancellation has no action, a rejected result, or throws", async () => {
    const item: CreatorInvoiceItem = {
      invoiceId: "inv_1",
      publicId: "pub_1",
      publicUrl: "https://payproof.example/i/pub_1",
      reference: "INV-001",
      clientReference: null,
      description: "Web development",
      localAmountFormatted: "100.00 USD",
      currency: "USD",
      dueDate: "2026-10-01",
      status: "open",
      canCancel: true,
      createdAt: "2026-09-01T12:00:00Z",
    };

    // Sub-case A: No cancellation action supplied
    await act(async () => {
      root?.render(
        <CreatorDashboard items={[item]} recipientAddress="0x1234567890abcdef" />,
      );
    });

    const cancelBtn = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Cancel"));
    await act(async () => {
      cancelBtn?.click();
    });

    const confirmBtn = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Yes, cancel invoice"));
    await act(async () => {
      confirmBtn?.click();
    });

    expect(container?.textContent).toContain(
      "Invoice cancellation is temporarily unavailable",
    );
    expect(container?.textContent).toContain("Open");
    expect(container?.textContent).not.toContain("Cancelled");

    // Sub-case B: Cancellation action returns an explicit failure
    const rejectedCancel = vi.fn().mockResolvedValue({
      ok: false,
      message: "This invoice could not be cancelled and remains open.",
    });
    await act(async () => {
      root?.render(
        <CreatorDashboard
          items={[item]}
          recipientAddress="0x1234567890abcdef"
          onCancelInvoice={rejectedCancel}
        />,
      );
    });

    const cancelBtn2 = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Cancel"));
    await act(async () => {
      cancelBtn2?.click();
    });

    const confirmBtn2 = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Yes, cancel invoice"));
    await act(async () => {
      confirmBtn2?.click();
    });

    expect(rejectedCancel).toHaveBeenCalledWith("inv_1");
    expect(container?.textContent).toContain(
      "This invoice could not be cancelled and remains open.",
    );
    expect(container?.textContent).toContain("Open");

    // Sub-case C: Cancellation action throws an error
    const throwingCancel = vi
      .fn()
      .mockRejectedValue(new Error("Server error"));
    await act(async () => {
      root?.render(
        <CreatorDashboard
          items={[item]}
          recipientAddress="0x1234567890abcdef"
          onCancelInvoice={throwingCancel}
        />,
      );
    });

    const cancelBtn3 = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Cancel"));
    await act(async () => {
      cancelBtn3?.click();
    });

    const confirmBtn3 = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Yes, cancel invoice"));
    await act(async () => {
      confirmBtn3?.click();
    });

    expect(container?.textContent).toContain(
      "Invoice cancellation failed safely",
    );
    expect(container?.textContent).toContain("Open");
  });

  it("6. updates only the target invoice to Cancelled upon successful cancellation", async () => {
    const item1: CreatorInvoiceItem = {
      invoiceId: "inv_1",
      publicId: "pub_1",
      publicUrl: "https://payproof.example/i/pub_1",
      reference: "INV-001",
      clientReference: null,
      description: "Project 1",
      localAmountFormatted: "100.00 USD",
      currency: "USD",
      dueDate: "2026-10-01",
      status: "open",
      canCancel: true,
      createdAt: "2026-09-01T12:00:00Z",
    };
    const item2: CreatorInvoiceItem = {
      ...item1,
      invoiceId: "inv_2",
      publicId: "pub_2",
      reference: "INV-002",
      description: "Project 2",
    };

    const cancelAction = vi.fn().mockImplementation(async () => ({
      ok: true,
      invoice: { ...item1, status: "cancelled" as const, canCancel: false },
    }));

    await act(async () => {
      root?.render(
        <CreatorDashboard
          items={[item1, item2]}
          recipientAddress="0x1234567890abcdef"
          onCancelInvoice={cancelAction}
        />,
      );
    });

    const articles = container?.querySelectorAll("article");
    expect(articles?.length).toBe(2);

    const card1Cancel = Array.from(articles![0].querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Cancel"),
    );
    await act(async () => {
      card1Cancel?.click();
    });

    const confirmBtn = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Yes, cancel invoice"));
    await act(async () => {
      confirmBtn?.click();
    });

    expect(cancelAction).toHaveBeenCalledWith("inv_1");
    const updatedArticles = container?.querySelectorAll("article");
    expect(updatedArticles![0].textContent).toContain("Cancelled");
    expect(updatedArticles![1].textContent).toContain("Open");
  });

  it("7. never invents an invoice or claims success when publication action is omitted", async () => {
    await act(async () => {
      root?.render(
        <InvoiceForm recipientAddress="0x1234567890abcdef1234567890abcdef12345678" />,
      );
    });

    const nameInput = container?.querySelector(
      "input[id*='freelancerName']",
    ) as HTMLInputElement;
    const descInput = container?.querySelector("textarea") as HTMLTextAreaElement;
    const amountInput = container?.querySelector(
      "input[id*='amount']",
    ) as HTMLInputElement;

    await act(async () => {
      setInputValue(nameInput, "Ada Studio");
      setInputValue(descInput, "Design sprint");
      setInputValue(amountInput, "250.00");
    });

    const reviewSubmitBtn = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Review invoice"));
    await act(async () => {
      reviewSubmitBtn?.click();
    });

    expect(container?.textContent).toContain("Review Invoice Details");

    const publishBtn = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Confirm & publish"));
    await act(async () => {
      publishBtn?.click();
    });

    expect(container?.textContent).toContain(
      "Invoice publishing is temporarily unavailable",
    );
    expect(container?.textContent).not.toContain("Invoice Published");
  });

  it("8. passes exact validated decimal-string form values to supplied onPublish action", async () => {
    const onPublishMock = vi.fn().mockResolvedValue({
      ok: true,
      invoice: {
        invoiceId: "inv_new",
        publicId: "pub_new",
        publicUrl: "https://payproof.example/i/pub_new",
        reference: "INV-999",
        clientReference: "Client Acme",
        description: "Sprint deliverables",
        localAmountFormatted: "150.00 USD",
        currency: "USD",
        dueDate: "2026-10-15",
        status: "open",
        canCancel: true,
        createdAt: "2026-09-01T12:00:00Z",
      },
    });

    await act(async () => {
      root?.render(
        <InvoiceForm
          recipientAddress="0x1234567890abcdef1234567890abcdef12345678"
          onPublish={onPublishMock}
        />,
      );
    });

    const nameInput = container?.querySelector(
      "input[id*='freelancerName']",
    ) as HTMLInputElement;
    const clientInput = container?.querySelector(
      "input[id*='clientReference']",
    ) as HTMLInputElement;
    const descInput = container?.querySelector("textarea") as HTMLTextAreaElement;
    const currencySelect = container?.querySelector("select") as HTMLSelectElement;
    const amountInput = container?.querySelector(
      "input[id*='amount']",
    ) as HTMLInputElement;
    const dateInput = container?.querySelector(
      "input[type='date']",
    ) as HTMLInputElement;

    await act(async () => {
      setInputValue(nameInput, "Dev Team");
      setInputValue(clientInput, "Client Acme");
      setInputValue(descInput, "Sprint deliverables");
      setInputValue(currencySelect, "USD");
      setInputValue(amountInput, "150.00");
      setInputValue(dateInput, "2026-10-15");
    });

    const reviewSubmitBtn = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Review invoice"));
    await act(async () => {
      reviewSubmitBtn?.click();
    });

    const publishBtn = Array.from(
      container?.querySelectorAll("button") || [],
    ).find((b) => b.textContent?.includes("Confirm & publish"));
    await act(async () => {
      publishBtn?.click();
    });

    expect(onPublishMock).toHaveBeenCalledWith({
      freelancerName: "Dev Team",
      clientReference: "Client Acme",
      description: "Sprint deliverables",
      currency: "USD",
      amount: "150.00",
      dueDate: "2026-10-15",
    });
    expect(container?.textContent).toContain("Invoice Published");
  });
});
