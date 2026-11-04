import { z } from "zod";

/**
 * Provenance schema per Rule R15 and Blueprint Part 5.
 * Enforces metadata tracking for verified vs demo placeholder records.
 */
export const ProvenanceSchema = z
  .object({
    class: z.enum(["A", "B"]),
    verified: z.boolean(),
    source: z.string().min(5),
    verifiedBy: z.string().nullable(),
    verifiedOn: z.string().nullable(),
  })
  .refine(
    (p) => p.class === "B" || (p.verified && p.verifiedBy !== null && p.verifiedOn !== null),
    {
      message: "Class A content must be verified with verifiedBy and verifiedOn populated.",
    }
  );

export type Provenance = z.infer<typeof ProvenanceSchema>;

