import "server-only";
import React from "react";
import { CourseContentForm } from "@/components/admin/course-content-form";
import { courseContentRecordSchema } from "@/lib/course-content";
import { createSupabaseAdminClient } from "@/server/supabase/clients";
import { saveCourseContent } from "./course-content-actions";

export async function CourseContentEditor({
  id,
  actorId,
  saved,
}: {
  id: string;
  actorId: string;
  saved?: boolean;
}) {
  const { data, error } = await createSupabaseAdminClient().rpc("get_staff_course_content", {
    p_actor_id: actorId,
    p_course_id: id,
  });
  // The pre-W1 database has no content editor RPC. Do not expose an unusable editor.
  if (error?.code === "PGRST202" || error?.code === "42883") return null;
  const parsed = courseContentRecordSchema.safeParse(data);
  if (error || !parsed.success) {
    return (
      <p role="alert" className="text-sm text-status-danger-text">
        Course content could not be loaded. Refresh the page to try again.
      </p>
    );
  }
  const { revision, ...content } = parsed.data;
  return (
    <section
      id="course-content"
      className="space-y-4 rounded-xl border border-border-subtle bg-surface-card p-4 sm:p-6"
    >
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-primary-900">Course content</h2>
        <p className="text-sm text-text-secondary">
          Edit the details shown on the public course page. Save this section separately.
        </p>
      </header>
      {saved && (
        <p role="status" className="text-sm text-status-success-text">
          Course content saved.
        </p>
      )}
      <CourseContentForm
        key={revision}
        initial={content}
        save={saveCourseContent.bind(null, { id, revision })}
      />
    </section>
  );
}
