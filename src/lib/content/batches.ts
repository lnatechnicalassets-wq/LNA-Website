import { z } from "zod";
import { ProvenanceSchema } from "./provenance";

export const BatchSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, "Batch ID must be URL-friendly"),
    courseId: z.string().regex(/^[a-z0-9-]+$/, "courseId must match a valid Course slug"),
    batchNumber: z.number().int().positive(),
    name: z.string().min(3),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD"),
    scheduleDescription: z.string().min(5),
    capacity: z.number().int().positive(),
    enrolledCount: z.number().int().nonnegative().default(0),
    seatHoldDurationMinutes: z.literal(30), // Rule: 30-minute hold per Module 2 / BR-05
    feePoisha: z.number().int().nonnegative(), // Rule R5: integer poisha only
    discountFeePoisha: z.number().int().nonnegative().optional(),
    status: z
      .enum(["upcoming", "open_for_enrollment", "in_progress", "completed", "cancelled"])
      .default("open_for_enrollment"),
    venue: z.string().min(3),
    provenance: ProvenanceSchema,
  })
  .refine((b) => !b.discountFeePoisha || b.discountFeePoisha <= b.feePoisha, {
    message: "discountFeePoisha cannot exceed base feePoisha",
  })
  .refine((b) => b.enrolledCount <= b.capacity, {
    message: "enrolledCount cannot exceed batch capacity",
  });

export type Batch = z.infer<typeof BatchSchema>;

export type BatchPricingSummary = Pick<Batch, "feePoisha" | "discountFeePoisha">;
export type BatchAvailabilitySummary = Pick<Batch, "status" | "capacity" | "enrolledCount">;

/**
 * Computes payable fee in integer poisha matching Postgres start_enrollment()
 * (`coalesce(discount_fee_poisha, fee_poisha)`) without floating-point math (Rule R5).
 */
export function getBatchPayablePoisha(batch: BatchPricingSummary): number {
  return batch.discountFeePoisha ?? batch.feePoisha;
}

export function hasBatchDiscount(batch: BatchPricingSummary): boolean {
  return batch.discountFeePoisha !== undefined && batch.discountFeePoisha < batch.feePoisha;
}

export function getBatchRemainingSeats(batch: BatchAvailabilitySummary): number {
  return Math.max(0, batch.capacity - batch.enrolledCount);
}

/**
 * Shared cohort availability check aligned with server start_enrollment() gates:
 * only cohorts in `open_for_enrollment` status with at least one unreserved seat can accept applications.
 */
export function canBatchAcceptApplications(
  batch: BatchAvailabilitySummary | null | undefined
): boolean {
  if (!batch) return false;
  return batch.status === "open_for_enrollment" && getBatchRemainingSeats(batch) > 0;
}
