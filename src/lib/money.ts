import Decimal from "decimal.js";

export const SUPPORTED_CURRENCIES = ["NGN", "USD", "EUR", "GBP"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const LOCAL_MINOR_UNIT_DECIMALS = 2;
export const USDC_DECIMALS = 6;
export const MAX_SAFE_DATABASE_UNITS = 9_007_199_254_740_991n;

const LOCAL_AMOUNT_PATTERN = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;
const FX_RATE_PATTERN = /^(?:0|[1-9]\d{0,19})(?:\.\d{1,18})?$/;

const FinancialDecimal = Decimal.clone({
  precision: 50,
  rounding: Decimal.ROUND_HALF_UP,
  minE: -100,
  maxE: 100,
});

export class MoneyInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyInputError";
  }
}

function assertPositiveDatabaseBigint(value: bigint, field: string): bigint {
  if (value <= 0n) {
    throw new MoneyInputError(`${field} must be greater than zero.`);
  }

  if (value > MAX_SAFE_DATABASE_UNITS) {
    throw new MoneyInputError(`${field} is too large.`);
  }

  return value;
}

export function parseLocalAmount(value: string): bigint {
  if (!LOCAL_AMOUNT_PATTERN.test(value)) {
    throw new MoneyInputError(
      "Enter a positive amount with at most two decimal places and no commas or symbols.",
    );
  }

  const [major, fraction = ""] = value.split(".");
  const paddedFraction = fraction.padEnd(LOCAL_MINOR_UNIT_DECIMALS, "0");
  const minorUnits = BigInt(major) * 100n + BigInt(paddedFraction || "0");

  return assertPositiveDatabaseBigint(minorUnits, "Local amount");
}

export function parseFxRate(value: string): Decimal {
  if (!FX_RATE_PATTERN.test(value)) {
    throw new MoneyInputError("FX rate must be a positive plain decimal string.");
  }

  const rate = new FinancialDecimal(value);
  if (!rate.isFinite() || !rate.isPositive()) {
    throw new MoneyInputError("FX rate must be greater than zero.");
  }

  return rate;
}

export function calculateFxUsdcUnits(
  amountMinor: bigint,
  rateToUsd: string,
): bigint {
  assertPositiveDatabaseBigint(amountMinor, "Local amount");
  const rate = parseFxRate(rateToUsd);

  const units = new FinancialDecimal(amountMinor.toString())
    .div(100)
    .times(rate)
    .times(1_000_000)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

  return assertPositiveDatabaseBigint(BigInt(units.toFixed(0)), "USDC amount");
}

export function calculateUsdParityUnits(amountMinor: bigint): bigint {
  assertPositiveDatabaseBigint(amountMinor, "Local amount");
  return assertPositiveDatabaseBigint(amountMinor * 10_000n, "USDC amount");
}

function groupDigits(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatLocalAmount(
  amountMinor: bigint,
  currency: SupportedCurrency,
): string {
  if (amountMinor < 0n) {
    throw new MoneyInputError("Local amount cannot be negative.");
  }

  const major = amountMinor / 100n;
  const fraction = (amountMinor % 100n).toString().padStart(2, "0");
  const symbols: Record<SupportedCurrency, string> = {
    NGN: "₦",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  return `${symbols[currency]}${groupDigits(major.toString())}.${fraction}`;
}

export function formatUsdcUnits(amountUnits: bigint): string {
  if (amountUnits < 0n) {
    throw new MoneyInputError("USDC amount cannot be negative.");
  }

  const scale = 1_000_000n;
  const major = amountUnits / scale;
  const fraction = (amountUnits % scale).toString().padStart(USDC_DECIMALS, "0");
  return `${groupDigits(major.toString())}.${fraction}`;
}
