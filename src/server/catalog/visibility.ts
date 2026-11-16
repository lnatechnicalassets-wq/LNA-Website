import "server-only";

import { cache } from "react";
import {
  createSupabaseAdminClient,
  hasConfiguredSupabaseServerEnv,
} from "@/server/supabase/clients";

export const getArchivedCatalogSlugs = cache(async () => {
  const empty = { courses: new Set<string>(), batches: new Set<string>() };
  if (!hasConfiguredSupabaseServerEnv()) return empty;

  const client = createSupabaseAdminClient();
  const archived = async (table: "courses" | "batches") => {
    const slugs = new Set<string>();
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await client
        .from(table)
        .select("slug")
        .or("status.eq.archived,archived_at.not.is.null")
        .order("slug")
        .range(offset, offset + pageSize - 1);
      if (error || !data) return new Set<string>();
      data.forEach(({ slug }) => slugs.add(slug));
      if (data.length < pageSize) return slugs;
    }
  };
  const [courses, batches] = await Promise.all([archived("courses"), archived("batches")]);
  return { courses, batches };
});
