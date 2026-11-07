import { z } from "zod";
import { ProvenanceSchema } from "./provenance";

export const FaqItemSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(5),
  answer: z.string().min(10),
  category: z.string().min(2),
  icon: z
    .enum([
      "book",
      "users",
      "calendar",
      "map-pin",
      "pointer",
      "credit-card",
      "award",
      "layers",
      "help",
    ])
    .default("help"),
  order: z.number().int().nonnegative(),
  published: z.boolean().default(true),
  courseId: z.string().optional(),
  courseHref: z.string().optional(),
  provenance: ProvenanceSchema,
});

export type FaqItem = z.infer<typeof FaqItemSchema>;
