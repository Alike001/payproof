import { getAddress, isAddress, type Address } from "viem";

export class AddressInputError extends Error {
  constructor() {
    super("Enter a valid Ethereum wallet address.");
    this.name = "AddressInputError";
  }
}

export function normalizeAddress(value: string): Address {
  const candidate = value.trim();
  if (!isAddress(candidate, { strict: false })) {
    throw new AddressInputError();
  }

  try {
    return getAddress(candidate);
  } catch {
    throw new AddressInputError();
  }
}
