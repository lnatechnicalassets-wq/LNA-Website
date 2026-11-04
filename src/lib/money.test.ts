// @vitest-environment node
import { describe, it, expect } from "vitest";
import { formatPoishaToBDT, poishaToTakaString, takaStringToPoisha } from "./money";

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
});

