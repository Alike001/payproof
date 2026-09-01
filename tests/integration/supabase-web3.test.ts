import { createClient, type EthereumWallet } from "@supabase/supabase-js";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";
import { getVerifiedCreatorAddress } from "@/features/auth/creator-identity";
import type { Database } from "@/lib/database/types";

const runLive = process.env.PAYPROOF_LIVE_AUTH_TEST === "1";
const liveDescribe = runLive ? describe : describe.skip;

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for the live Web3 auth test.`);
  return value;
}

function localClient() {
  return createClient<Database>(
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function signInFreshWallet() {
  const account = privateKeyToAccount(generatePrivateKey());
  const client = localClient();
  const wallet: EthereumWallet = {
    address: account.address,
    on: () => undefined,
    removeListener: () => undefined,
    async request({ method, params }) {
      if (method === "eth_requestAccounts") return [account.address];
      if (method === "eth_chainId") return "0x14a34";
      if (method === "personal_sign") {
        const [message] = params as [`0x${string}`, string];
        return account.signMessage({ message: { raw: message } });
      }
      throw new Error(`Unexpected test wallet method: ${method}`);
    },
  };

  const { data, error } = await client.auth.signInWithWeb3({
    chain: "ethereum",
    wallet,
    statement: "Sign in to PayProof live authentication test.",
    options: {
      url: "http://localhost:3000/dashboard",
      signInWithEthereum: { chainId: 84_532 },
    },
  });

  if (error) throw error;
  return { account, client, user: data.user };
}

liveDescribe("Supabase Ethereum authentication", () => {
  it("creates verified wallet identities and enforces creator RLS", async () => {
    const creatorA = await signInFreshWallet();
    const creatorB = await signInFreshWallet();

    expect(getVerifiedCreatorAddress(creatorA.user)).toBe(creatorA.account.address);
    expect(getVerifiedCreatorAddress(creatorB.user)).toBe(creatorB.account.address);

    const invoice = {
      creator_user_id: creatorA.user.id,
      creator_wallet: creatorA.account.address,
      recipient_wallet: creatorA.account.address,
      freelancer_name: "Live auth tester",
      client_reference: null,
      description: "RLS isolation check",
      currency: "NGN" as const,
      amount_minor: 100_00,
      due_date: "2026-09-07",
    };
    const { data: created, error: insertError } = await creatorA.client
      .from("invoices")
      .insert(invoice)
      .select("id")
      .single();

    expect(insertError).toBeNull();
    expect(created?.id).toBeTruthy();

    const { data: ownerRows, error: ownerError } = await creatorA.client
      .from("invoices")
      .select("id")
      .eq("id", created!.id);
    const { data: otherRows, error: otherError } = await creatorB.client
      .from("invoices")
      .select("id")
      .eq("id", created!.id);

    expect(ownerError).toBeNull();
    expect(ownerRows).toHaveLength(1);
    expect(otherError).toBeNull();
    expect(otherRows).toHaveLength(0);

    const { error: forgedInsertError } = await creatorB.client
      .from("invoices")
      .insert({ ...invoice, creator_user_id: creatorA.user.id });
    expect(forgedInsertError?.code).toBe("42501");

    await creatorA.client.auth.signOut();
    await creatorB.client.auth.signOut();
  });
});
