import { WorkspaceShell } from "@/components/workspace-shell";
import { AuthenticatedPreview } from "@/features/auth/authenticated-preview";
import { WalletAuthCard } from "@/features/auth/wallet-auth-card";
import { getCreatorSession } from "@/features/auth/creator-session.server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const creator = await getCreatorSession();

  return (
    <WorkspaceShell
      eyebrow="Creator workspace"
      title="Your invoices stay tied to your wallet."
      description="Reconnect anywhere, sign a free message, and PayProof can safely show only the invoices created by that verified wallet."
    >
      <div>
        <WalletAuthCard initialCreatorAddress={creator?.address} />
        {creator ? <AuthenticatedPreview address={creator.address} kind="dashboard" /> : null}
      </div>
    </WorkspaceShell>
  );
}
