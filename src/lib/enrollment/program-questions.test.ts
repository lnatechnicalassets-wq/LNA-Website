import { describe, expect, it } from "vitest";
import {
  matchesQuestionVersion,
  parseQuestionVersionField,
  programQuestionSetSchema,
} from "./program-questions";

const university = { id: "university", label: "University", type: "text", required: true };
describe("shared application questions", () => {
  it("accepts an explicit empty set and preserves stable IDs", () => {
    expect(programQuestionSetSchema.parse([])).toEqual([]);
    expect(programQuestionSetSchema.parse([university])).toEqual([university]);
  });
  it("rejects duplicate, reserved and unsafe IDs", () => {
    expect(
      programQuestionSetSchema.safeParse([university, { ...university, id: "University" }]).success
    ).toBe(false);
    for (const id of ["fullName", "constructor", "__proto__"]) {
      expect(programQuestionSetSchema.safeParse([{ ...university, id }]).success).toBe(false);
    }
  });
  it("rejects invalid dropdown options", () => {
    expect(
      programQuestionSetSchema.safeParse([
        { ...university, type: "select", options: ["One", "One"] },
      ]).success
    ).toBe(false);
    expect(
      programQuestionSetSchema.safeParse([
        { ...university, type: "select", options: ["One", "Two"] },
      ]).success
    ).toBe(true);
  });
  it("requires the current configured version and permits only legacy omission", () => {
    expect(matchesQuestionVersion(0, undefined)).toBe(true);
    expect(matchesQuestionVersion(1, undefined)).toBe(false);
    expect(matchesQuestionVersion(2, 1)).toBe(false);
    expect(matchesQuestionVersion(2, 2)).toBe(true);
    expect(matchesQuestionVersion(0, parseQuestionVersionField("invalid"))).toBe(false);
    expect(matchesQuestionVersion(3, parseQuestionVersionField("3"))).toBe(true);
  });
});
