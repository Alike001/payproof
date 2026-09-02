import { WorkspaceShell } from "@/components/workspace-shell";
import { WalletAuthCard } from "@/features/auth/wallet-auth-card";
import { getCreatorSession } from "@/features/auth/creator-session.server";
import { ConnectedInvoiceForm } from "@/features/invoices/invoice-client-boundaries";
import { getDuplicatePrefill } from "@/features/invoices/invoice-service.server";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ duplicate_ref?: string | string[] }>;
}) {
  const creator = await getCreatorSession();
  const requestedDuplicate = (await searchParams).duplicate_ref;
  const duplicateId =
    typeof requestedDuplicate === "string" ? requestedDuplicate : null;
  const duplicatePrefill =
    creator && duplicateId
      ? await getDuplicatePrefill(duplicateId, creator)
      : null;

  return (
    <WorkspaceShell
      eyebrow="Create an invoice"
      title="First, prove where you want to be paid."
      description="Your signed-in wallet becomes the invoice recipient. That removes a dangerous copy-and-paste field and stops another person from changing the payment address."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <WalletAuthCard initialCreatorAddress={creator?.address} />
        {creator ? (
          <ConnectedInvoiceForm
            recipientAddress={creator.address}
            initialPrefill={duplicatePrefill}
          />
        ) : null}
      </div>
    </WorkspaceShell>
  );
}
