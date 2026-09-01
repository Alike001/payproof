export type WalletAuthPhase =
  | "idle"
  | "switching"
  | "signing"
  | "signing-out";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function walletAuthStatusAnnouncement({
  connectedAddress,
  creatorAddress,
  error,
  isConnected,
  isConnecting,
  isWrongNetwork,
  phase,
  sessionMismatch,
}: {
  connectedAddress: string | undefined;
  creatorAddress: string | null;
  error: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isWrongNetwork: boolean;
  phase: WalletAuthPhase;
  sessionMismatch: boolean;
}) {
  if (phase === "switching") {
    return "Switching network to Base Sepolia in your wallet…";
  }
  if (phase === "signing") {
    return "Waiting for message signature in your wallet…";
  }
  if (phase === "signing-out") {
    return "Signing out of creator session…";
  }
  if (isConnecting) return "Opening wallet connection prompt…";

  // The visible alert/status elements announce these states. Keeping this live
  // region empty avoids duplicate announcements and, critically, prevents a
  // mismatch from being announced as a successful sign-in.
  if (error || sessionMismatch || isWrongNetwork) return "";

  if (creatorAddress) {
    return `Signed in as creator ${shortAddress(creatorAddress)}.`;
  }
  if (isConnected && connectedAddress) {
    return `Wallet connected: ${shortAddress(connectedAddress)}. Click Sign in free to complete authentication.`;
  }
  return "Wallet not connected. Connect a wallet to begin.";
}
