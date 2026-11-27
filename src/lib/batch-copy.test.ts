import { describe, expect, it } from "vitest";
import { batchCopyValues } from "./batch-copy";

describe("batch copy", () => {
  it("copies only approved configuration fields", () => {
    expect(
      batchCopyValues("course-1", {
        id: "old",
        course_id: "wrong",
        name: "Old batch",
        batch_number: "8",
        start_date: "2026-01-01",
        end_date: "2026-01-02",
        status: "open_for_enrollment",
        accept_applications: "true",
        enrollment_closes_at: "old",
        display_deadline: "old",
        historical_enrolled_count: "50",
        venue: "Dhaka",
        schedule_description: "Weekend classes",
        capacity: "40",
        fee_poisha: "5000",
        discount_fee_poisha: "4000",
        students: "old",
        payments: "old",
      })
    ).toEqual({
      course_id: "course-1",
      venue: "Dhaka",
      schedule_description: "Weekend classes",
      capacity: "40",
      fee_poisha: "5000",
      discount_fee_poisha: "4000",
    });
  });
  it("does not invent missing configuration", () => {
    expect(batchCopyValues("course-1", {}).capacity).toBe("");
  });
});
