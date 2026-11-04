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
