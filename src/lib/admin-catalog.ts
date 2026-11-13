import { z } from "zod";

export const catalogSection = z.enum(["courses", "batches"]);
export type CatalogSection = z.infer<typeof catalogSection>;

const courseStatus = z.enum(["draft", "published", "archived"]);
const batchStatus = z.enum([
  "draft",
  "upcoming",
  "open_for_enrollment",
  "in_progress",
  "completed",
  "cancelled",
  "archived",
]);
export const catalogStatuses = { courses: courseStatus, batches: batchStatus };

export const catalogStatusLabels = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
  upcoming: "Upcoming",
  open_for_enrollment: "Open for enrollment",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const catalogCopy = {
  courses: {
    description: "Review courses and their publishing status.",
    search: "Search course titles",
    empty: "No courses match these filters.",
  },
  batches: {
    description: "Review batch dates, seating capacity, and fees.",
    search: "Search batch names",
    empty: "No batches match these filters.",
  },
  status: "Status",
  allStatuses: "All statuses",
  filter: "Apply filters",
  reset: "Reset",
  unavailable: "The catalog could not be loaded. Try again shortly.",
  venue: "Venue",
  dates: "Dates",
  capacity: "Capacity",
  listFee: "List fee",
  discountedFee: "Discounted fee",
  previous: "Previous",
  next: "Next",
  page: "Page",
  pagination: "Catalog pagination",
} as const;

const filterSchema = z.object({
  q: z.string().trim().max(80).catch(""),
  status: z.string().catch(""),
  page: z
    .string()
    .regex(/^[1-9][0-9]{0,3}$/)
    .transform((value) => Number.parseInt(value, 10))
    .catch(1),
});

export function parseCatalogFilters(
  section: CatalogSection,
  params: Record<string, string | string[] | undefined>
) {
  const { q, status, page } = filterSchema.parse(params);
  const validStatus = catalogStatuses[section].safeParse(status);
  return { q, status: validStatus.success ? validStatus.data : "", page };
}

export type CatalogFilters = ReturnType<typeof parseCatalogFilters>;
