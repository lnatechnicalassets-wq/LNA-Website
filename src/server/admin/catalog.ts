import "server-only";
import { z } from "zod";
import {
  catalogRecordId,
  catalogStatuses,
  type CatalogFilters,
  type CatalogSection,
} from "@/lib/admin-catalog";
import { AppError } from "@/lib/errors";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

const pageSize = 20;
export const catalogPoisha = z
  .union([z.number().int().nonnegative().safe(), z.string().regex(/^\d+$/)])
  .transform((value) => BigInt(value));

const courseRecord = z.object({
  updated_at: z.string().optional(),
  archived_at: z.string().nullable().optional(),
  id: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  summary: z.string().optional(),
  category: z.string(),
  venue: z.string(),
  status: catalogStatuses.courses,
});

const batchRecord = z.object({
  updated_at: z.string().optional(),
  archived_at: z.string().nullable().optional(),
  id: z.string(),
  name: z.string(),
  schedule_description: z.string().optional(),
  start_date: z.string().date(),
  end_date: z.string().date(),
  venue: z.string(),
  capacity: z.number().int().positive().nullable(),
  fee_poisha: catalogPoisha,
  discount_fee_poisha: catalogPoisha.nullable(),
  status: catalogStatuses.batches,
  courses: z.object({ id: catalogRecordId.optional(), title: z.string() }),
});

const columns = {
  courses: "id,title,subtitle,category,summary,description,venue,status,updated_at,archived_at",
  batches:
    "id,name,start_date,end_date,schedule_description,venue,capacity,fee_poisha,discount_fee_poisha,status,updated_at,archived_at,courses(id,title)",
};

export async function listAdminCatalog(
  section: CatalogSection,
  filters: CatalogFilters,
  courseId?: string
) {
  const admin = createSupabaseAdminClient();
  const offset = (filters.page - 1) * pageSize;

  let query = admin
    .from(section)
    .select(columns[section])
    .order(section === "courses" ? "title" : "start_date", { ascending: section === "courses" })
    .order("id")
    .range(offset, offset + pageSize);

  if (section === "batches" && courseId) {
    query = query.eq("course_id", courseId);
  }

  if (filters.status === "archived") {
    query = query.or("status.eq.archived,archived_at.not.is.null");
  } else {
    query = query.is("archived_at", null);
    query = filters.status ? query.eq("status", filters.status) : query.neq("status", "archived");
  }

  // PostgREST also accepts "*" as an alias for the wildcard "%".
  const search = filters.q.replace(/\*/g, "").trim();
  if (search) {
    const literal = search.replace(/[\\%_]/g, "\\$&");
    query = query.ilike(section === "courses" ? "title" : "name", `%${literal}%`);
  }

  const { data, error } = await query;
  if (error) {
    throw new AppError("Unable to read the staff catalog.", "ADMIN_CATALOG_UNAVAILABLE", 503);
  }

  const parsed = z.array(section === "courses" ? courseRecord : batchRecord).safeParse(data);
  if (!parsed.success) {
    throw new AppError("Unable to read the staff catalog.", "ADMIN_CATALOG_UNAVAILABLE", 503);
  }

  return { records: parsed.data.slice(0, pageSize), hasNext: parsed.data.length > pageSize };
}

const courseContext = z.object({ title: z.string() });
const batchContext = z.object({
  course_id: catalogRecordId,
  name: z.string(),
  courses: courseContext,
});

const catalogCourse = courseContext.extend({
  status: catalogStatuses.courses,
  archived_at: z.string().nullable(),
});

export async function getAdminCatalogCourseContext(courseId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("courses")
    .select("title,status,archived_at")
    .eq("id", courseId)
    .maybeSingle();
  if (!error && data === null) return null;
  const parsed = catalogCourse.safeParse(data);
  if (error || !parsed.success) {
    throw new AppError("Unable to load the course.", "ADMIN_CATALOG_UNAVAILABLE", 503);
  }
  return {
    title: parsed.data.title,
    archived: parsed.data.status === "archived" || parsed.data.archived_at !== null,
  };
}

export async function getAdminCatalogBatchContext(batchId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("batches")
    .select("course_id,name,courses(title)")
    .eq("id", batchId)
    .maybeSingle();
  if (!error && data === null) return null;
  const parsed = batchContext.safeParse(data);
  if (error || !parsed.success) {
    throw new AppError("Unable to load the batch.", "ADMIN_CATALOG_UNAVAILABLE", 503);
  }
  return {
    id: batchId,
    name: parsed.data.name,
    courseId: parsed.data.course_id,
    courseTitle: parsed.data.courses.title,
  };
}

export async function listBatchCourseOptions({ includeArchived = false } = {}) {
  const admin = createSupabaseAdminClient();
  const option = z.object({ id: z.string().uuid(), title: z.string(), slug: z.string() });
  const options: z.infer<typeof option>[] = [];
  const limit = 500;
  for (let offset = 0; ; offset += limit) {
    let query = admin.from("courses").select("id,title,slug");
    if (!includeArchived) {
      query = query.in("status", ["draft", "published"]).is("archived_at", null);
    }
    const { data, error } = await query
      .order("title")
      .order("id")
      .range(offset, offset + limit - 1);
    const parsed = z.array(option).safeParse(data);
    if (error || !parsed.success) {
      throw new AppError("Unable to load course choices.", "ADMIN_CATALOG_UNAVAILABLE", 503);
    }
    options.push(...parsed.data);
    if (parsed.data.length < limit) return options;
  }
}

export async function listAdmissionBatchOptions(courseId: string) {
  const admin = createSupabaseAdminClient();
  const option = z.object({
    id: catalogRecordId,
    name: z.string(),
    status: catalogStatuses.batches,
  });
  const options: z.infer<typeof option>[] = [];
  const limit = 500;
  for (let offset = 0; ; offset += limit) {
    const { data, error } = await admin
      .from("batches")
      .select("id,name,status")
      .eq("course_id", courseId)
      .order("start_date", { ascending: false })
      .order("id")
      .range(offset, offset + limit - 1);
    const parsed = z.array(option).safeParse(data);
    if (error || !parsed.success) {
      throw new AppError("Unable to load batch choices.", "ADMIN_CATALOG_UNAVAILABLE", 503);
    }
    options.push(...parsed.data);
    if (parsed.data.length < limit) return options;
  }
}
