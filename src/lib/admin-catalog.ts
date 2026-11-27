import { z } from "zod";

export const catalogRecordId = z.string().uuid();
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
  courseBatches: (title: string) => `Batches for ${title}`,
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

export const batchMentorCopy = {
  title: "Batch mentors",
  inherit: "Select mentors for this batch. With no selection, the batch uses the course roster.",
  courseRoster: "Course roster",
  field: "Assigned mentors",
  empty: "No mentors are available to assign.",
  save: "Save mentors",
  saved: "Batch mentors saved.",
  stale: "The batch changed. Refresh the page before saving the roster.",
  failed: "The batch mentors could not be saved.",
} as const;

export const catalogArchiveCopy = {
  archive: "Archive",
  restore: "Restore",
  cancel: "Cancel",
  hidden:
    "This item will be hidden from the public catalog. Existing enrollment records and history are retained.",
  restored:
    "This item will return to its previous catalog status. Check whether public applications may reopen.",
  saved: "Catalog updated.",
  stale: "This item changed. Refresh the catalog before trying again.",
  failed: "The catalog item could not be updated.",
} as const;

export const catalogPreviewCopy = {
  course: "View course card",
  batch: "View batch card",
  close: "Close",
  category: "Category",
  courseType: "Course preview",
  batchType: "Batch preview",
  schedule: "Schedule",
} as const;

export function catalogStatusVariant(status: keyof typeof catalogStatusLabels) {
  if (status === "published" || status === "open_for_enrollment" || status === "completed")
    return "success";
  if (status === "draft") return "warning";
  if (status === "upcoming" || status === "in_progress") return "info";
  return "outline";
}

export type CatalogPreview = {
  kind: "course" | "batch";
  title: string;
  subtitle: string;
  summary?: string;
  details?: string;
  status: string;
  statusVariant: ReturnType<typeof catalogStatusVariant>;
  fields: { label: string; value: string }[];
};
