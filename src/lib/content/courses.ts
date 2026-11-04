import { z } from "zod";
import { ProvenanceSchema } from "./provenance";

export const CourseModuleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3),
  duration: z.string().min(1),
  topics: z.array(z.string().min(1)),
});

export const CourseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "Course ID must be a lowercase URL-friendly slug"),
  title: z.string().min(3),
  subtitle: z.string().min(5),
  category: z.string().min(3),
  summary: z.string().min(10),
  description: z.string().min(20),
  learningOutcomes: z.array(z.string().min(3)).min(1),
  targetAudience: z.array(z.string().min(3)).min(1),
  prerequisites: z.array(z.string()).default([]),
  modules: z.array(CourseModuleSchema).min(1),
  deliveryMode: z.literal("offline"), // Strict: offline only
  venue: z.string().min(3),
  status: z.enum(["draft", "published", "archived"]).default("published"),
  featured: z.boolean().default(false),
  provenance: ProvenanceSchema,
});

export type CourseModule = z.infer<typeof CourseModuleSchema>;
export type Course = z.infer<typeof CourseSchema>;
