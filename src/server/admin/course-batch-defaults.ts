import "server-only";
import { z } from "zod";
import { courseBatchDefaultsSchema } from "@/lib/course-batch-defaults";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

const record = z.object({
  revision: z.string().datetime({ offset: true }),
  defaults: courseBatchDefaultsSchema.nullable(),
});

export async function getCourseBatchDefaults(actorId: string, courseId: string) {
  const { data, error } = await createSupabaseAdminClient().rpc("get_staff_course_batch_defaults", {
    p_actor_id: actorId,
    p_course_id: courseId,
  });
  if (error?.code === "PGRST202" || error?.code === "42883") return null;
  const parsed = record.safeParse(data);
  if (error || !parsed.success) return null;
  return parsed.data;
}
