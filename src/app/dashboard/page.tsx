import { WorkspaceShell } from "@/components/workspace-shell";
import { WalletAuthCard } from "@/features/auth/wallet-auth-card";
import { getCreatorSession } from "@/features/auth/creator-session.server";
import { ConnectedCreatorDashboard } from "@/features/invoices/invoice-client-boundaries";
import { listCreatorInvoices } from "@/features/invoices/invoice-service.server";
import type { DashboardPageModel } from "@/features/invoices/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const creator = await getCreatorSession();
  let history: DashboardPageModel = { items: [], nextCursor: null };
  let historyError: string | null = null;
  if (creator) {
    try {
      history = await listCreatorInvoices({ creator });
    } catch {
      historyError = "Your invoice history is temporarily unavailable. Please try again.";
    }
  }

  return (
    <WorkspaceShell
      eyebrow="Creator workspace"
      title="Your invoices stay tied to your wallet."
      description="Reconnect anywhere, sign a free message, and PayProof can safely show only the invoices created by that verified wallet."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <WalletAuthCard initialCreatorAddress={creator?.address} />
        {creator ? (
          <ConnectedCreatorDashboard
            items={history.items}
            recipientAddress={creator.address}
            error={historyError}
          />
        ) : null}
      </div>
    </WorkspaceShell>
  );
}
