import { WorkspaceShell } from "@/components/workspace-shell";
import { PublicInvoiceCard } from "@/features/invoices/public-invoice-card";
import type { PublicInvoicePageState } from "@/features/invoices/types";

export const dynamic = "force-dynamic";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  // Presentation-only page state solver
  let state: PublicInvoicePageState;

  if (!publicId || publicId === "not-found" || publicId === "invalid") {
    state = {
      kind: "not_found",
      message: "This invoice link is invalid or no longer available.",
    };
  } else if (publicId === "unavailable") {
    state = {
      kind: "unavailable",
      message: "This invoice is temporarily unavailable. Please try again.",
      retryable: true,
    };
  } else {
    // Standard public invoice state
    state = {
      kind: "ready",
      invoice: {
        publicId,
        publicUrl: `https://payproof.example/i/${publicId}`,
        reference: `INV-${publicId.toUpperCase().slice(0, 8)}`,
        freelancerName: "PayProof Creator",
        clientReference: "Client Project",
        description: "Professional services and project deliverables",
        currency: "NGN",
        localAmountFormatted: "250,000.00 NGN",
        dueDate: "2026-09-15",
        recipientAddress: "0x1234567890abcdef1234567890abcdef12345678",
        recipientDisplay: "0x1234…5678",
        status: publicId.includes("cancelled")
          ? "cancelled"
          : publicId.includes("overdue")
            ? "overdue"
            : publicId.includes("verified")
              ? "verified"
              : "open",
        createdAt: new Date().toISOString(),
      },
    };
  }

  return (
    <WorkspaceShell
      eyebrow="Public Invoice"
      title="Verified invoice & payment portal"
      description="Pay in official Base Sepolia test USDC with live Telegraph currency intelligence and on-chain verification."
    >
      <PublicInvoiceCard state={state} />
    </WorkspaceShell>
  );
}
