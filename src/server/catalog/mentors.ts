import "server-only";

import { cache } from "react";
import { getHomeRepository } from "@/lib/content";
import { MentorSchema, type Mentor } from "@/lib/content/home";
import { publicMentorSource } from "@/lib/mentor-profile";
import {
  createSupabaseAdminClient,
  hasConfiguredSupabaseServerEnv,
} from "@/server/supabase/clients";

export const publicMentorColumns =
  "slug,name,role,organization,bio,portrait_src,company_logo_src,linkedin_url,expertise,categories,career_history,display_order,featured,is_placeholder,provenance";

export const getPublicMentors = cache(async (): Promise<Mentor[]> => {
  if (!hasConfiguredSupabaseServerEnv()) return getHomeRepository().getMentors();

  const admin = createSupabaseAdminClient();
  const mentors: Mentor[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin
      .from("mentors")
      .select(publicMentorColumns)
      .eq("published", true)
      .eq("is_dev_fixture", false)
      .is("archived_at", null)
      .order("display_order")
      .order("slug")
      .range(offset, offset + pageSize - 1);
    if (error || !data) {
      // Fail closed on an outage so archived or unpublished profiles cannot reappear from JSON.
      console.error("[catalog:mentors] public read failed", { code: error?.code });
      return [];
    }
    for (const row of data) {
      const fields = publicMentorSource(row);
      const mentor = MentorSchema.safeParse({
        ...fields,
        categories: row.categories,
        order: row.display_order,
        featured: row.featured,
        isPlaceholder: row.is_placeholder,
        provenance: { verifiedBy: null, verifiedOn: null, ...row.provenance },
      });
      if (mentor.success) mentors.push(mentor.data);
    }
    if (data.length < pageSize) return mentors;
  }
});
