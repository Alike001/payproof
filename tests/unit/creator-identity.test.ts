import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  getVerifiedCreatorAddress,
  InvalidCreatorIdentityError,
} from "@/features/auth/creator-identity";

function user(overrides: Partial<User> = {}): User {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("getVerifiedCreatorAddress", () => {
  it("uses the server-verified Ethereum identity and checksums it", () => {
    const creator = user({
      identities: [
        {
          id: "0x8ba1f109551bd432803012645ac136ddd64dba72",
          user_id: "10000000-0000-4000-8000-000000000001",
          identity_id: "20000000-0000-4000-8000-000000000001",
          provider: "web3",
          identity_data: {
            sub: "web3:ethereum:0x8ba1f109551bd432803012645ac136ddd64dba72",
            custom_claims: {
              chain: "ethereum",
              network: "84532",
              address: "0x8ba1f109551bd432803012645ac136ddd64dba72",
            },
          },
        },
      ],
    });

    expect(getVerifiedCreatorAddress(creator)).toBe(
      "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    );
  });

  it("rejects a Web3 identity signed on a different EVM network", () => {
    const creator = user({
      identities: [
        {
          id: "0xde709f2102306220921060314715629080e2fb77",
          user_id: "10000000-0000-4000-8000-000000000001",
          identity_id: "20000000-0000-4000-8000-000000000001",
          provider: "web3",
          identity_data: {
            sub: "web3:ethereum:0xde709f2102306220921060314715629080e2fb77",
            custom_claims: {
              chain: "ethereum",
              network: "1",
              address: "0xde709f2102306220921060314715629080e2fb77",
            },
          },
        },
      ],
    });

    expect(() => getVerifiedCreatorAddress(creator)).toThrow(
      InvalidCreatorIdentityError,
    );
  });

  it("never trusts a wallet address placed in user-editable metadata", () => {
    const forged = user({
      user_metadata: {
        address: "0x8ba1f109551bd432803012645ac136ddd64dba72",
      },
      identities: [],
    });

    expect(() => getVerifiedCreatorAddress(forged)).toThrow(
      InvalidCreatorIdentityError,
    );
  });

  it.each([
    undefined,
    [],
    [
      {
        id: "email-id",
        user_id: "10000000-0000-4000-8000-000000000001",
        identity_id: "20000000-0000-4000-8000-000000000001",
        provider: "email",
        identity_data: {
          address: "0x8ba1f109551bd432803012645ac136ddd64dba72",
        },
      },
    ],
  ])("rejects an unverified or missing Ethereum identity", (identities) => {
    expect(() => getVerifiedCreatorAddress(user({ identities }))).toThrow(
      InvalidCreatorIdentityError,
    );
  });
});
