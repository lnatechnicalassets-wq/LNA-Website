import { describe, expect, it } from "vitest";
import { batchEditSchema } from "@/lib/admin-catalog-edit";
import { canBatchAcceptApplications, getBatchRemainingSeats } from "@/lib/content/batches";

const input = {
  name: "Test batch",
  venue: "Dhaka",
  schedule_description: "Weekend sessions",
  start_date: "2027-01-01",
  end_date: "2027-02-01",
  fee_poisha: "1000",
  discount_fee_poisha: "",
};

describe("batch capacity", () => {
  it("persists explicitly unlimited capacity as null", () => {
    expect(batchEditSchema.parse({ ...input, capacity: "unlimited" }).capacity).toBeNull();
  });
  it("retains fixed limits and rejects invalid or missing limits", () => {
    expect(batchEditSchema.parse({ ...input, capacity: "30" }).capacity).toBe(30);
    for (const capacity of ["", "0", "-1", "3.5", "2147483648"]) {
      expect(batchEditSchema.safeParse({ ...input, capacity }).success).toBe(false);
    }
  });
  it("does not close an unlimited batch due to its enrolled count", () => {
    const batch = { status: "open_for_enrollment" as const, capacity: null, enrolledCount: 100000 };
    expect(getBatchRemainingSeats(batch)).toBe(Number.POSITIVE_INFINITY);
    expect(canBatchAcceptApplications(batch)).toBe(true);
    expect(canBatchAcceptApplications({ ...batch, status: "completed" })).toBe(false);
  });
  it("still blocks a full fixed batch", () => {
    expect(
      canBatchAcceptApplications({ status: "open_for_enrollment", capacity: 10, enrolledCount: 10 })
    ).toBe(false);
  });
});
