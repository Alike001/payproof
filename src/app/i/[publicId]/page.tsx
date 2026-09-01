import { WorkspaceShell } from "@/components/workspace-shell";
import { PublicInvoiceCard } from "@/features/invoices/public-invoice-card";
import { readPublicInvoicePageState } from "@/lib/invoices/read-public-invoice.server";

export const dynamic = "force-dynamic";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const state = await readPublicInvoicePageState(publicId);

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
