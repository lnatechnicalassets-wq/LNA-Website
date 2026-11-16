import "server-only";

import { z } from "zod";
import { AppError } from "@/lib/errors";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

import { mentorCardColumns, staffMentorCardShape } from "./people";
const assigned = z.array(z.object({ mentor_id: z.string().uuid() }));

export async function getBatchMentorRoster(batchId: string, courseId: string) {
  const admin = createSupabaseAdminClient();
  const [batch, course, mentors] = await Promise.all([
    admin.from("batch_mentors").select("mentor_id").eq("batch_id", batchId).order("display_order"),
    admin
      .from("course_mentors")
      .select("mentor_id")
      .eq("course_id", courseId)
      .order("display_order"),
    admin
      .from("mentors")
      .select(mentorCardColumns)
      .is("archived_at", null)
      .order("name")
      .order("id"),
  ]);

  const batchRoster = assigned.safeParse(batch.data);
  const courseRoster = assigned.safeParse(course.data);
  const mentorOptions = z.array(staffMentorCardShape).safeParse(mentors.data);
  if (
    batch.error ||
    course.error ||
    mentors.error ||
    !batchRoster.success ||
    !courseRoster.success ||
    !mentorOptions.success
  ) {
    throw new AppError("Unable to load the mentor roster.", "ADMIN_CATALOG_UNAVAILABLE", 503);
  }
  const byId = new Map(mentorOptions.data.map((value) => [value.id, value.name]));
  return {
    options: mentorOptions.data,
    selectedIds: batchRoster.data.map((value) => value.mentor_id).filter((id) => byId.has(id)),
    inheritedIds: courseRoster.data.map(({ mentor_id }) => mentor_id).filter((id) => byId.has(id)),
  };
}
