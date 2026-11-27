import { describe, expect, it } from "vitest";
import {
  attentionQuerySchema,
  matchesPaymentEnvironment,
  reviewPaymentSchema,
} from "./payment-attention";

const attemptId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("Payment attention safeguards", () => {
  it("rejects mock, sandbox and closed-mode cross-environment checks", () => {
    expect(matchesPaymentEnvironment("MOCKPAY-123", false, "live", false)).toBe(false);
    expect(matchesPaymentEnvironment("PAY-123", false, "mock", false)).toBe(false);
    expect(matchesPaymentEnvironment("PAY-123", true, "live", false)).toBe(false);
    expect(matchesPaymentEnvironment("PAY-123", false, "closed", false)).toBe(false);
    expect(matchesPaymentEnvironment("PAY-123", true, "live", true)).toBe(true);
    expect(matchesPaymentEnvironment("MOCKPAY-123", false, "mock", false)).toBe(true);
  });
  it("requires a nonblank note and a valid evidence key", () => {
    const input = { attemptId, evidenceKey: "a".repeat(32), note: "  checked merchant record  " };
    expect(reviewPaymentSchema.parse(input).note).toBe("checked merchant record");
    expect(reviewPaymentSchema.safeParse({ ...input, note: " " }).success).toBe(false);
    expect(reviewPaymentSchema.safeParse({ ...input, evidenceKey: "bad" }).success).toBe(false);
  });
  it("bounds page input and does not allow arbitrary filters", () => {
    expect(attentionQuerySchema.parse({ page: "-1", reviewed: "true" })).toEqual({
      page: 1,
      reviewed: undefined,
    });
    expect(attentionQuerySchema.parse({ page: "2", reviewed: "1" })).toEqual({
      page: 2,
      reviewed: "1",
    });
  });
});
