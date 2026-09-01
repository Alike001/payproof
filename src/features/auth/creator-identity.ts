import type { User } from "@supabase/supabase-js";
import { normalizeAddress } from "@/lib/address";

export class InvalidCreatorIdentityError extends Error {
  constructor(message = "The signed-in session has no verified Ethereum identity.") {
    super(message);
    this.name = "InvalidCreatorIdentityError";
  }
}

function identityAddress(identity: NonNullable<User["identities"]>[number]) {
  if (identity.provider !== "web3") return null;

  const claims = identity.identity_data?.custom_claims;
  if (
    !claims ||
    typeof claims !== "object" ||
    claims.chain !== "ethereum" ||
    String(claims.network) !== "84532"
  ) {
    return null;
  }

  const value = claims.address;
  if (typeof value !== "string") return null;

  try {
    return normalizeAddress(value);
  } catch {
    return null;
  }
}

export function getVerifiedCreatorAddress(user: User): `0x${string}` {
  for (const identity of user.identities ?? []) {
    const address = identityAddress(identity);
    if (address) return address;
  }

  throw new InvalidCreatorIdentityError();
}
