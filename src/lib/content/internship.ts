import { z } from "zod";
import { ProvenanceSchema } from "./provenance";

export const InternshipAllowanceSchema = z.object({
  minPoisha: z.number().int().nonnegative().optional(),
  maxPoisha: z.number().int().nonnegative().optional(),
  period: z.enum(["month", "session", "fixed"]).default("month"),
  displayText: z.string().min(1),
});

export const InternshipSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "Internship ID must be a lowercase URL-friendly slug"),
  roleTitle: z.string().min(2),
  companyName: z.string().min(2),
  companyLogo: z.string().optional(),
  workplace: z.string().min(2),
  schedule: z.string().min(2),
  duration: z.string().min(2),
  shortDescription: z.string().min(5),
  fullDescription: z.string().min(10),
  allowance: InternshipAllowanceSchema.optional(),
  applicationUrl: z.string().url().optional(),
  published: z.boolean().default(true),
  order: z.number().int().nonnegative().default(1),
  provenance: ProvenanceSchema,
});

export type InternshipAllowance = z.infer<typeof InternshipAllowanceSchema>;
export type Internship = z.infer<typeof InternshipSchema>;

