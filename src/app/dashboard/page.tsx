import { WorkspaceShell } from "@/components/workspace-shell";
import { WalletAuthCard } from "@/features/auth/wallet-auth-card";
import { getCreatorSession } from "@/features/auth/creator-session.server";
import { CreatorDashboard } from "@/features/invoices/creator-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const creator = await getCreatorSession();

  return (
    <WorkspaceShell
      eyebrow="Creator workspace"
      title="Your invoices stay tied to your wallet."
      description="Reconnect anywhere, sign a free message, and PayProof can safely show only the invoices created by that verified wallet."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <WalletAuthCard initialCreatorAddress={creator?.address} />
        {creator ? (
          <CreatorDashboard items={[]} recipientAddress={creator.address} />
        ) : null}
      </div>
    </WorkspaceShell>
  );
}

