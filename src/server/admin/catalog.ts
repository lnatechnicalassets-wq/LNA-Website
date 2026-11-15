import "server-only";
import { z } from "zod";
import { catalogStatuses, type CatalogFilters, type CatalogSection } from "@/lib/admin-catalog";
import { AppError } from "@/lib/errors";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

const pageSize = 20;
export const catalogPoisha = z
  .union([z.number().int().nonnegative().safe(), z.string().regex(/^\d+$/)])
  .transform((value) => BigInt(value));

const courseRecord = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  venue: z.string(),
  status: catalogStatuses.courses,
});

const batchRecord = z.object({
  id: z.string(),
  name: z.string(),
  start_date: z.string().date(),
  end_date: z.string().date(),
  venue: z.string(),
  capacity: z.number().int().positive(),
  fee_poisha: catalogPoisha,
  discount_fee_poisha: catalogPoisha.nullable(),
  status: catalogStatuses.batches,
  courses: z.object({ title: z.string() }),
});

const columns = {
  courses: "id,title,category,venue,status",
  batches:
    "id,name,start_date,end_date,venue,capacity,fee_poisha,discount_fee_poisha,status,courses(title)",
};

export async function listAdminCatalog(section: CatalogSection, filters: CatalogFilters) {
  const admin = createSupabaseAdminClient();
  const offset = (filters.page - 1) * pageSize;

  let query = admin
    .from(section)
    .select(columns[section])
    .order(section === "courses" ? "title" : "start_date", { ascending: section === "courses" })
    .order("id")
    .range(offset, offset + pageSize);

  if (filters.status) {
    query = query.eq("status", filters.status);
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

export async function listBatchCourseOptions() {
  const admin = createSupabaseAdminClient();
  const option = z.object({ id: z.string().uuid(), title: z.string(), slug: z.string() });
  const options: z.infer<typeof option>[] = [];
  const limit = 500;
  for (let offset = 0; ; offset += limit) {
    const { data, error } = await admin
      .from("courses")
      .select("id,title,slug")
      .in("status", ["draft", "published"])
      .is("archived_at", null)
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
