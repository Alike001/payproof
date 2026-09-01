import { describe, expect, it } from "vitest";
import { AddressInputError, normalizeAddress } from "@/lib/address";

describe("normalizeAddress", () => {
  it("returns EIP-55 checksum form", () => {
    expect(normalizeAddress("0x8ba1f109551bd432803012645ac136ddd64dba72")).toBe(
      "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    );
  });

  it.each(["", "0x123", "not-a-wallet", "0xZZa1f109551bd432803012645ac136ddd64dba72"])(
    "rejects %s",
    (value) => {
      expect(() => normalizeAddress(value)).toThrow(AddressInputError);
    },
  );
});
