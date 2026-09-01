import { describe, expect, it } from "vitest";
import {
  calculateFxUsdcUnits,
  calculateUsdParityUnits,
  formatLocalAmount,
  formatUsdcUnits,
  MoneyInputError,
  parseLocalAmount,
} from "@/lib/money";

describe("parseLocalAmount", () => {
  it.each([
    ["250000", 25_000_000n],
    ["125.50", 12_550n],
    ["80.0", 8_000n],
    ["40.25", 4_025n],
    ["0.01", 1n],
  ])("converts %s to exact minor units", (input, expected) => {
    expect(parseLocalAmount(input)).toBe(expected);
  });

  it.each([
    "",
    "0",
    "0.00",
    "-1",
    "+1",
    "1,000",
    "₦100",
    "1.001",
    "01.00",
    ".50",
    "1.",
    "1e3",
    "Infinity",
    " 1.00",
  ])("rejects unsafe input %s", (input) => {
    expect(() => parseLocalAmount(input)).toThrow(MoneyInputError);
  });
});

describe("USDC conversion", () => {
  it("uses exact USD parity", () => {
    expect(calculateUsdParityUnits(12_550n)).toBe(125_500_000n);
  });

  it("uses decimal strings and half-up rounding", () => {
    expect(calculateFxUsdcUnits(10_001n, "1.23456789")).toBe(123_469_135n);
    expect(calculateFxUsdcUnits(1n, "1.23455")).toBe(12_346n);
  });

  it.each(["0", "-1", "1e3", "NaN", "1,000", ".5"])(
    "rejects unsafe rate %s",
    (rate) => {
      expect(() => calculateFxUsdcUnits(100n, rate)).toThrow(MoneyInputError);
    },
  );
});

describe("exact formatting", () => {
  it("formats local currencies without converting through Number", () => {
    expect(formatLocalAmount(25_000_000n, "NGN")).toBe("₦250,000.00");
    expect(formatLocalAmount(8_000n, "EUR")).toBe("€80.00");
  });

  it("formats all six USDC decimals", () => {
    expect(formatUsdcUnits(167_420_001n)).toBe("167.420001");
  });
});
