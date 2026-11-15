import { z } from "zod";
import { bdtStringToPoisha } from "@/lib/money";

export const editCatalogCopy = {
  courses: { title: "Edit course", link: "Edit course" },
  batches: { title: "Edit batch", link: "Edit batch" },
  back: "Back to catalog",
  save: "Save changes",
  saving: "Saving…",
  saved: "Changes saved.",
  readFailed: "This record could not be loaded. Try again shortly.",
  invalid: "Check the highlighted fields and try again.",
  changed: "Someone saved a newer version. Reload this page before editing again.",
  archived: "Archived records cannot be edited.",
  unavailable: "The changes could not be saved. Try again shortly.",
  capacity: "Capacity cannot be lower than the seats already held or taken.",
} as const;

const field = (min: number, max: number) => z.string().trim().min(min).max(max);
const money = z
  .string()
  .trim()
  .regex(/^\d{1,14}(?:\.\d{1,2})?$/, "Enter an amount in BDT with up to two decimal places.")
  .transform(bdtStringToPoisha)
  .refine((value) => value <= BigInt(Number.MAX_SAFE_INTEGER), "Enter a smaller amount.")
  .transform(String);

const positiveInteger = z
  .string()
  .regex(/^[1-9]\d{0,9}$/, "Enter a positive whole number.")
  .transform((value) => Number.parseInt(value, 10))
  .pipe(z.number().int().max(2147483647));

export const courseEditSchema = z.object({
  title: field(3, 160),
  subtitle: field(5, 240),
  category: field(3, 120),
  summary: field(10, 1200),
  description: field(20, 12000),
  venue: field(3, 240),
});

const batchDates = z
  .object({
    start_date: z.string().date("Enter a valid start date."),
    end_date: z.string().date("Enter a valid end date."),
  })
  .transform((values, context) => {
    if (values.end_date < values.start_date) {
      context.addIssue({
        code: "custom",
        path: ["end_date"],
        message: "Choose a date on or after the start date.",
      });
    }
    return values;
  });

const batchFees = z
  .object({
    fee_poisha: money,
    discount_fee_poisha: z
      .literal("")
      .transform(() => null)
      .or(money),
  })
  .transform((values, context) => {
    if (
      values.discount_fee_poisha !== null &&
      BigInt(values.discount_fee_poisha) > BigInt(values.fee_poisha)
    ) {
      context.addIssue({
        code: "custom",
        path: ["discount_fee_poisha"],
        message: "The discounted fee cannot exceed the list fee.",
      });
    }
    return values;
  });

export const batchEditSchema = z
  .object({
    name: field(3, 160),
    schedule_description: field(5, 2000),
    venue: field(3, 240),
    capacity: positiveInteger,
  })
  .and(batchDates)
  .and(batchFees);

export const editFields = {
  courses: [
    { name: "title", label: "Title", type: "text" },
    { name: "subtitle", label: "Subtitle", type: "text" },
    { name: "category", label: "Category", type: "text" },
    { name: "venue", label: "Venue", type: "text" },
    { name: "summary", label: "Summary", type: "textarea" },
    { name: "description", label: "Description", type: "textarea" },
  ],
  batches: [
    { name: "name", label: "Batch name", type: "text" },
    { name: "venue", label: "Venue", type: "text" },
    { name: "start_date", label: "Start date", type: "date" },
    { name: "end_date", label: "End date", type: "date" },
    { name: "schedule_description", label: "Schedule", type: "textarea" },
    { name: "capacity", label: "Capacity", type: "integer" },
    { name: "fee_poisha", label: "List fee (BDT)", type: "money" },
    { name: "discount_fee_poisha", label: "Discounted fee (BDT, optional)", type: "money" },
  ],
} as const;

export const createCatalogCopy = {
  courses: { title: "New course", link: "New course", saved: "Course draft created." },
  batches: { title: "New batch", link: "New batch", saved: "Batch draft created." },
  save: "Create draft",
  saving: "Creating…",
  draft: "New records are saved as drafts and stay hidden from the public catalog.",
  chooseCourse: "Choose a course",
  noCourses: "Create a course before adding a batch.",
  duplicateSlug: "This course slug is already in use.",
  duplicateBatch: "This batch number is already in use for the selected course.",
  unavailableCourse: "This course is no longer available. Choose another course.",
  slugHint: "Use lowercase letters, numbers and hyphens. This becomes part of the course URL.",
} as const;

export const courseCreateSchema = courseEditSchema.extend({
  slug: z
    .string()
    .trim()
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, createCatalogCopy.slugHint),
});

export const batchCreateSchema = batchEditSchema.and(
  z.object({
    course_id: z.string().uuid(createCatalogCopy.chooseCourse),
    batch_number: positiveInteger,
  })
);

export const createFields = {
  courses: [
    ...editFields.courses.slice(0, 1),
    { name: "slug", label: "Course slug", type: "text", hint: createCatalogCopy.slugHint },
    ...editFields.courses.slice(1),
  ],
  batches: [
    { name: "course_id", label: "Course", type: "select" },
    { name: "batch_number", label: "Batch number", type: "integer" },
    ...editFields.batches,
  ],
} as const;

export type CatalogEditState = {
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  reloadRequired?: boolean;
};
