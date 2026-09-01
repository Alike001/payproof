import { WorkspaceShell } from "@/components/workspace-shell";
import { WalletAuthCard } from "@/features/auth/wallet-auth-card";
import { getCreatorSession } from "@/features/auth/creator-session.server";
import { InvoiceForm } from "@/features/invoices/invoice-form";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const creator = await getCreatorSession();

  return (
    <WorkspaceShell
      eyebrow="Create an invoice"
      title="First, prove where you want to be paid."
      description="Your signed-in wallet becomes the invoice recipient. That removes a dangerous copy-and-paste field and stops another person from changing the payment address."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <WalletAuthCard initialCreatorAddress={creator?.address} />
        {creator ? (
          <InvoiceForm recipientAddress={creator.address} />
        ) : null}
      </div>
    </WorkspaceShell>
  );
}

