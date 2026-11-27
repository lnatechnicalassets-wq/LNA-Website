import { z } from "zod";

const textItem = z.string().trim().min(3).max(500);
const topics = z.array(z.string().trim().min(1).max(500)).max(30);

export const courseModuleContentSchema = z.object({
  id: z.string().min(1).max(128),
  title: z.string().trim().min(3).max(160),
  duration: z.string().trim().min(1).max(100),
  topics,
});

export const courseContentSchema = z.object({
  learning_outcomes: z.array(textItem).max(30),
  target_audience: z.array(textItem).max(30),
  prerequisites: z.array(z.string().trim().min(1).max(500)).max(30),
  modules: z
    .array(courseModuleContentSchema)
    .max(30)
    .refine(
      (items) => new Set(items.map((item) => item.id)).size === items.length,
      "Module IDs must be unique."
    ),
  featured: z.boolean(),
});

export type CourseContent = z.infer<typeof courseContentSchema>;

export const courseContentRecordSchema = courseContentSchema.extend({
  revision: z.string().datetime({ offset: true }),
  slug: z.string().regex(/^[a-z0-9-]+$/),
});

export type CourseContentRecord = z.infer<typeof courseContentRecordSchema>;
export type CourseContentState = { message?: string; stale?: boolean };

export function splitContentLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseCourseContentForm(form: FormData) {
  const raw = form.get("content");
  if (typeof raw !== "string" || raw.length > 300_000) return null;
  try {
    const parsed = courseContentSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
