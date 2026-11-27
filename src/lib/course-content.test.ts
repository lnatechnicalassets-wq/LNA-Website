import { describe, expect, it } from "vitest";
import { courseContentSchema, parseCourseContentForm, splitContentLines } from "./course-content";

const valid = {
  learning_outcomes: ["Understand banking operations"],
  target_audience: ["Recent graduates"],
  prerequisites: [],
  modules: [{ id: "module-1", title: "Banking basics", duration: "2 hours", topics: ["Credit"] }],
  featured: false,
};

describe("course content", () => {
  it("normalizes multiline lists", () => {
    expect(splitContentLines(" First\r\n\n Second ")).toEqual(["First", "Second"]);
  });
  it("allows empty optional course sections for drafts", () => {
    expect(
      courseContentSchema.safeParse({ ...valid, modules: [], learning_outcomes: [] }).success
    ).toBe(true);
  });
  it("rejects duplicate module identifiers and invalid list items", () => {
    expect(
      courseContentSchema.safeParse({ ...valid, modules: [valid.modules[0], valid.modules[0]] })
        .success
    ).toBe(false);
    expect(courseContentSchema.safeParse({ ...valid, learning_outcomes: [42] }).success).toBe(
      false
    );
  });
  it("validates serialized form data", () => {
    const form = new FormData();
    form.set("content", JSON.stringify(valid));
    expect(parseCourseContentForm(form)).toEqual(valid);
    form.set("content", "invalid json");
    expect(parseCourseContentForm(form)).toBeNull();
  });
});
