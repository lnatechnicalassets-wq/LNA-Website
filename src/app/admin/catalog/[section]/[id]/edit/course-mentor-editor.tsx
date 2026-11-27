import "server-only";

import React from "react";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/server/supabase/clients";
import { CourseMentorForm } from "@/components/admin/course-mentor-form";
import { saveCourseMentors } from "./course-mentor-actions";

const roster = z.object({
  revision: z.string().datetime({ offset: true }),
  options: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      archived: z.boolean(),
      selected: z.boolean(),
    })
  ),
});

export async function CourseMentorEditor({
  id,
  actorId,
  saved,
}: {
  id: string;
  actorId: string;
  saved?: boolean;
}) {
  const { data, error } = await createSupabaseAdminClient().rpc("get_staff_course_mentors", {
    p_actor_id: actorId,
    p_course_id: id,
  });
  if (error?.code === "PGRST202" || error?.code === "42883") return null;
  const result = roster.safeParse(data);
  if (error || !result.success)
    return (
      <p role="alert" className="text-sm text-status-danger-text">
        Course mentors could not be loaded.
      </p>
    );
  return (
    <section
      id="course-mentors"
      className="space-y-4 rounded-xl border border-border-subtle bg-surface-card p-4 sm:p-6"
    >
      <h2 className="text-lg font-semibold text-primary-900">Course mentors</h2>
      <p className="text-sm text-text-secondary">
        Choose the course roster. Batches without their own mentor selection inherit this roster.
      </p>
      {saved && (
        <p role="status" className="text-sm text-status-success-text">
          Course mentors saved.
        </p>
      )}
      <CourseMentorForm
        key={result.data.revision}
        options={result.data.options}
        save={saveCourseMentors.bind(null, { id, revision: result.data.revision })}
      />
    </section>
  );
}
