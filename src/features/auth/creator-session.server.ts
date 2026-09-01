import "server-only";
import type { User } from "@supabase/supabase-js";
import { createUserDatabaseClient } from "@/lib/database/server";
import {
  getVerifiedCreatorAddress,
  InvalidCreatorIdentityError,
} from "@/features/auth/creator-identity";

export type CreatorSession = {
  user: User;
  userId: string;
  address: `0x${string}`;
};

export class CreatorAuthenticationError extends Error {
  constructor(message = "A verified wallet sign-in is required.") {
    super(message);
    this.name = "CreatorAuthenticationError";
  }
}

export async function getCreatorSession(): Promise<CreatorSession | null> {
  const supabase = await createUserDatabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  try {
    return {
      user,
      userId: user.id,
      address: getVerifiedCreatorAddress(user),
    };
  } catch (identityError) {
    if (identityError instanceof InvalidCreatorIdentityError) return null;
    throw identityError;
  }
}

export async function requireCreatorSession(): Promise<CreatorSession> {
  const creator = await getCreatorSession();
  if (!creator) throw new CreatorAuthenticationError();
  return creator;
}
