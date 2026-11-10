// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  formatPoishaToBDT,
  poishaToTakaString,
  poishaToBdtString,
  bdtStringToPoisha,
  takaStringToPoisha,
  percentToBasisPoints,
  calculateDiscountAmountPoisha,
  calculateDiscountedPoisha,
} from "./money";

describe("Rule R5: Integer Poisha Money Calculations", () => {
  it("formats integer poisha into standard BDT currency string", () => {
    expect(formatPoishaToBDT(2500000n)).toBe("৳25,000");
    expect(formatPoishaToBDT(2500050n)).toBe("৳25,000.50");
    expect(formatPoishaToBDT(100n)).toBe("৳1");
    expect(formatPoishaToBDT(0n)).toBe("৳0");
    expect(formatPoishaToBDT(-150000n)).toBe("-৳1,500");
  });

  it("converts integer poisha to pure decimal taka string", () => {
    expect(poishaToTakaString(2500000n)).toBe("25000.00");
    expect(poishaToTakaString(2500050n)).toBe("25000.50");
    expect(poishaToTakaString(99n)).toBe("0.99");
    expect(poishaToTakaString(5n)).toBe("0.05");
    expect(poishaToTakaString(-500n)).toBe("-5.00");
  });

  it("parses taka string to integer poisha without floating point math", () => {
    expect(takaStringToPoisha("25000")).toBe(2500000n);
    expect(takaStringToPoisha("25,000")).toBe(2500000n);
    expect(takaStringToPoisha("25000.50")).toBe(2500050n);
    expect(takaStringToPoisha("৳25,000.50")).toBe(2500050n);
    expect(takaStringToPoisha("0.05")).toBe(5n);
    expect(takaStringToPoisha("-50.25")).toBe(-5025n);
  });

  it("throws on invalid taka strings", () => {
    expect(() => takaStringToPoisha("")).toThrow();
    expect(() => takaStringToPoisha("12.34.56")).toThrow();
    expect(() => takaStringToPoisha("12.345")).toThrow(); // sub-poisha
  });

  it("enforces strict ADR 0009 poishaToBdtString and bdtStringToPoisha gateway boundaries", () => {
    expect(poishaToBdtString(750000n)).toBe("7500.00");
    expect(poishaToBdtString(0n)).toBe("0.00");
    expect(() => poishaToBdtString(-1n)).toThrow(RangeError);

    expect(bdtStringToPoisha("7500")).toBe(750000n);
    expect(bdtStringToPoisha("7500.5")).toBe(750050n);
    expect(bdtStringToPoisha("7500.00")).toBe(750000n);
    expect(() => bdtStringToPoisha("-7500")).toThrow();
    expect(() => bdtStringToPoisha("7500.123")).toThrow();
    expect(() => bdtStringToPoisha("7500.00abc")).toThrow();
  });
});

describe("Monetary Discount Calculations (Integer Poisha & Round Half Up)", () => {
  it("converts valid percentage numbers and strings to basis points", () => {
    expect(percentToBasisPoints(0)).toBe(0n);
    expect(percentToBasisPoints(10)).toBe(1000n);
    expect(percentToBasisPoints(12.5)).toBe(1250n);
    expect(percentToBasisPoints("12.5")).toBe(1250n);
    expect(percentToBasisPoints("12.50")).toBe(1250n);
    expect(percentToBasisPoints("33.33")).toBe(3333n);
    expect(percentToBasisPoints(100)).toBe(10000n);
    expect(percentToBasisPoints("100")).toBe(10000n);
  });

  it("enforces strict boundaries on percentage conversion", () => {
    expect(() => percentToBasisPoints(-1)).toThrow(RangeError);
    expect(() => percentToBasisPoints("-0.01")).toThrow(RangeError);
    expect(() => percentToBasisPoints(100.01)).toThrow(RangeError);
    expect(() => percentToBasisPoints("101")).toThrow(RangeError);
    expect(() => percentToBasisPoints(Number.NaN)).toThrow(TypeError);
    expect(() => percentToBasisPoints(Number.POSITIVE_INFINITY)).toThrow(TypeError);
    expect(() => percentToBasisPoints("abc")).toThrow(TypeError);
    expect(() => percentToBasisPoints("")).toThrow(TypeError);
  });

  it("calculates exact discounts without fractional poisha", () => {
    // 10% of 35,000 BDT (3,500,000 poisha) = 3,500 BDT (350,000 poisha)
    const baseFee = 3500000n;
    expect(calculateDiscountAmountPoisha(baseFee, 10)).toBe(350000n);
    expect(calculateDiscountedPoisha(baseFee, 10)).toBe(3150000n);

    // 25% of 2,800,000 poisha = 700,000 poisha
    expect(calculateDiscountAmountPoisha(2800000n, 25)).toBe(700000n);
    expect(calculateDiscountedPoisha(2800000n, 25)).toBe(2100000n);
  });

  it("applies Round Half Up on fractional poisha boundaries", () => {
    // Base: 100 poisha (1.00 BDT)
    // 15.50% -> (100 * 1550 + 5000) / 10000 = 160000 / 10000 = 16 poisha (0.50 rounds up)
    expect(calculateDiscountAmountPoisha(100n, "15.50")).toBe(16n);
    expect(calculateDiscountedPoisha(100n, "15.50")).toBe(84n);

    // 15.49% -> (100 * 1549 + 5000) / 10000 = 159900 / 10000 = 15 poisha (0.49 rounds down)
    expect(calculateDiscountAmountPoisha(100n, "15.49")).toBe(15n);
    expect(calculateDiscountedPoisha(100n, "15.49")).toBe(85n);

    // 15.51% -> (100 * 1551 + 5000) / 10000 = 160100 / 10000 = 16 poisha
    expect(calculateDiscountAmountPoisha(100n, "15.51")).toBe(16n);
    expect(calculateDiscountedPoisha(100n, "15.51")).toBe(84n);
  });

  it("handles boundary edge cases: 0% and 100% discount, zero fee", () => {
    const fee = 2500000n;

    // 0% discount
    expect(calculateDiscountAmountPoisha(fee, 0)).toBe(0n);
    expect(calculateDiscountedPoisha(fee, 0)).toBe(fee);

    // 100% discount
    expect(calculateDiscountAmountPoisha(fee, 100)).toBe(fee);
    expect(calculateDiscountedPoisha(fee, 100)).toBe(0n);

    // Zero base fee
    expect(calculateDiscountAmountPoisha(0n, 20)).toBe(0n);
    expect(calculateDiscountedPoisha(0n, 20)).toBe(0n);
  });

  it("rejects negative base fee and invalid percentage inputs", () => {
    expect(() => calculateDiscountAmountPoisha(-500n, 10)).toThrow(RangeError);
    expect(() => calculateDiscountedPoisha(-500n, 10)).toThrow(RangeError);
    expect(() => calculateDiscountAmountPoisha(1000n, -5)).toThrow(RangeError);
    expect(() => calculateDiscountAmountPoisha(1000n, 105)).toThrow(RangeError);
  });
});
