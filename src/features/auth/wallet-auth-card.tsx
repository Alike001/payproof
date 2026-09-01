"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit/components";
import type { EthereumWallet } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useConnect, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { getVerifiedCreatorAddress } from "@/features/auth/creator-identity";
import { getBrowserDatabaseClient } from "@/lib/database/browser";
import { normalizeAddress } from "@/lib/address";
import styles from "./wallet-auth-card.module.css";

type AuthPhase = "idle" | "switching" | "signing" | "signing-out";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function errorMessage(error: unknown) {
  if (typeof error === "object" && error && "code" in error && error.code === 4001) {
    return "Signature cancelled. Nothing was sent and no fee was charged.";
  }
  if (error instanceof Error && /reject|denied|cancel/i.test(error.message)) {
    return "Signature cancelled. Nothing was sent and no fee was charged.";
  }
  return error instanceof Error
    ? error.message
    : "Wallet sign-in failed. Please try again.";
}

async function ethereumWallet(
  connector: NonNullable<ReturnType<typeof useAccount>["connector"]>,
  address: `0x${string}`,
): Promise<EthereumWallet> {
  const provider = await connector.getProvider();
  if (!provider || typeof provider !== "object" || !("request" in provider)) {
    throw new Error("This wallet did not provide a compatible Ethereum interface.");
  }

  const raw = provider as {
    request(args: { method: string; params?: unknown }): Promise<unknown>;
    on?(event: string, listener: (...args: never[]) => void): void;
    removeListener?(event: string, listener: (...args: never[]) => void): void;
  };

  return {
    address,
    request: (args) => raw.request(args),
    on: (event, listener) => raw.on?.(event, listener as (...args: never[]) => void),
    removeListener: (event, listener) =>
      raw.removeListener?.(event, listener as (...args: never[]) => void),
  };
}

export function WalletAuthCard({
  initialCreatorAddress = null,
}: {
  initialCreatorAddress?: string | null;
}) {
  const router = useRouter();
  const { address, chainId, connector, isConnected } = useAccount();
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const [creatorAddress, setCreatorAddress] = useState(initialCreatorAddress);
  const [phase, setPhase] = useState<AuthPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserDatabaseClient();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setCreatorAddress(null);
        return;
      }

      try {
        setCreatorAddress(getVerifiedCreatorAddress(session.user));
      } catch {
        setCreatorAddress(null);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const normalizedConnectedAddress = useMemo(() => {
    if (!address) return null;
    try {
      return normalizeAddress(address);
    } catch {
      return null;
    }
  }, [address]);

  const sessionMismatch = Boolean(
    creatorAddress &&
      normalizedConnectedAddress &&
      creatorAddress !== normalizedConnectedAddress,
  );
  const isWrongNetwork = isConnected && chainId !== baseSepolia.id;
  const busy = phase !== "idle";

  async function signIn() {
    setError(null);
    if (!address || !connector) {
      setError("Connect a wallet before signing in.");
      return;
    }

    try {
      if (chainId !== baseSepolia.id) {
        setPhase("switching");
        await switchChainAsync({ chainId: baseSepolia.id });
      }

      setPhase("signing");
      const supabase = getBrowserDatabaseClient();
      const wallet = await ethereumWallet(connector, address);
      const { data, error: authError } = await supabase.auth.signInWithWeb3({
        chain: "ethereum",
        wallet,
        statement:
          "Sign in to PayProof to create and manage invoices. This is free and does not send a transaction.",
        options: {
          url: window.location.href,
          signInWithEthereum: { chainId: baseSepolia.id },
        },
      });

      if (authError) throw authError;
      setCreatorAddress(getVerifiedCreatorAddress(data.user));
      router.refresh();
    } catch (signInError) {
      setError(errorMessage(signInError));
    } finally {
      setPhase("idle");
    }
  }

  async function signOut() {
    setError(null);
    setPhase("signing-out");
    const { error: signOutError } = await getBrowserDatabaseClient().auth.signOut();
    setPhase("idle");
    if (signOutError) {
      setError(signOutError.message);
      return;
    }
    setCreatorAddress(null);
    router.refresh();
  }

  return (
    <section className={styles.card} aria-labelledby="wallet-access-title">
      <div className={styles.header}>
        <span className={styles.step}>Wallet access</span>
        <span className={styles.network}>Base Sepolia</span>
      </div>
      <h2 id="wallet-access-title">
        {creatorAddress ? "You are signed in" : "Connect, then prove it is your wallet"}
      </h2>
      <p className={styles.description}>
        Connecting lets PayProof see your public address. The second step asks
        for a free message signature so nobody else can manage your invoices.
      </p>

      <div className={styles.statusGrid}>
        <div className={styles.statusItem}>
          <span>1 · Wallet</span>
          <strong>{isConnected && address ? shortAddress(address) : "Not connected"}</strong>
        </div>
        <div className={styles.statusItem}>
          <span>2 · PayProof account</span>
          <strong>{creatorAddress ? shortAddress(creatorAddress) : "Not signed in"}</strong>
        </div>
      </div>

      {sessionMismatch ? (
        <div className={styles.warning} role="alert">
          This browser is signed in as {shortAddress(creatorAddress!)} but the
          connected wallet is {shortAddress(address!)}. Sign out before using
          the other wallet.
        </div>
      ) : null}
      {isWrongNetwork ? (
        <div className={styles.warning} role="status">
          Switch to Base Sepolia before signing in. No real funds are needed.
        </div>
      ) : null}
      {error ? <div className={styles.error} role="alert">{error}</div> : null}

      <div className={styles.actions}>
        {isConnected ? (
          <ConnectButton
            accountStatus={{ smallScreen: "avatar", largeScreen: "address" }}
            chainStatus="icon"
            showBalance={false}
          />
        ) : (
          connectors.map((walletConnector) => (
            <button
              className={styles.secondaryButton}
              disabled={isConnecting}
              key={walletConnector.uid}
              onClick={async () => {
                setError(null);
                try {
                  await connectAsync({ connector: walletConnector });
                } catch (connectError) {
                  setError(errorMessage(connectError));
                }
              }}
              type="button"
            >
              {isConnecting
                ? "Opening wallet…"
                : walletConnector.id === "walletConnect"
                  ? "WalletConnect"
                  : "Connect browser wallet"}
            </button>
          ))
        )}
        {creatorAddress ? (
          <button className={styles.secondaryButton} disabled={busy} onClick={signOut} type="button">
            {phase === "signing-out" ? "Signing out…" : "Sign out"}
          </button>
        ) : isConnected ? (
          <button className={styles.primaryButton} disabled={busy} onClick={signIn} type="button">
            {phase === "switching"
              ? "Switching network…"
              : phase === "signing"
                ? "Check your wallet…"
                : "Sign in free"}
          </button>
        ) : null}
      </div>

      <p className={styles.finePrint}>
        A sign-in signature costs no gas, sends no token, and cannot move funds.
      </p>
    </section>
  );
}
