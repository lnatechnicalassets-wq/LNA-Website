"use server";

import { revalidatePath } from "next/cache";
import {
  mentorInput,
  peopleCopy as copy,
  personTarget,
  type PeopleAction,
} from "@/lib/admin-people";
import { adminPaths } from "@/lib/admin-navigation";
import { mentorMediaBucket } from "@/lib/mentor-media";
import { readMentorUpload, uploadMentorImage } from "@/server/admin/mentor-media";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

export const saveMentor: PeopleAction = async (target, _previous, form) => {
  const staff = await requireStaff("cms:edit");
  const selected = personTarget.safeParse(target);
  if (!selected.success) return { message: copy.failed };

  const change = selected.data;
  const operation = change.operation;
  const editing = operation === "create" || operation === "edit";
  const parsed = mentorInput.safeParse(Object.fromEntries(form));
  if (editing && !parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path[0] === "expertise") return { message: copy.expertiseInvalid };
    if (issue?.path[0] === "linkedIn") return { message: copy.linkedInInvalid };
    return { message: copy.invalid };
  }

  const [portrait, logo] = editing
    ? await Promise.all([
        readMentorUpload(form.get("photoFile")),
        readMentorUpload(form.get("logoFile")),
      ])
    : [null, null];
  if (portrait === false || logo === false) return { message: copy.mediaInvalid };

  const admin = createSupabaseAdminClient();
  const uploadedPortrait = portrait ? await uploadMentorImage(admin, portrait) : null;
  if (portrait && !uploadedPortrait) return { message: copy.mediaUploadFailed };
  const uploadedLogo = logo ? await uploadMentorImage(admin, logo) : null;
  const uploadedKeys = [uploadedPortrait?.key, uploadedLogo?.key].filter(
    (key) => key !== undefined
  );
  async function discardUnreferencedUploads() {
    if (uploadedKeys.length) await admin.storage.from(mentorMediaBucket).remove(uploadedKeys);
  }
  if (logo && !uploadedLogo) {
    await discardUnreferencedUploads();
    return { message: copy.mediaUploadFailed };
  }

  const profile = parsed.data;
  const { data: result, error } = await admin.rpc("save_staff_mentor_profile", {
    p_actor: staff.userId,
    p_operation: operation,
    p_id: change.operation === "create" ? null : change.id,
    p_revision: change.operation === "create" ? null : change.revision,
    p_name: profile?.name ?? null,
    p_role: profile?.role ?? null,
    p_company: profile?.company ?? null,
    p_bio: profile?.bio ?? null,
    p_photo: uploadedPortrait?.source ?? profile?.photo ?? null,
    p_logo: uploadedLogo?.source ?? profile?.logo ?? null,
    p_linkedin: profile?.linkedIn ?? null,
    p_expertise: profile?.expertise ?? [],
    p_published: profile?.published ?? false,
  });
  // A transport error may hide a committed response. Keep such files private until referenced.
  if (!error && result !== "OK") await discardUnreferencedUploads();
  if (error) {
    console.error("Mentor save failed", { operation, code: error.code });
    const missingSetup = ["PGRST202", "42883", "42P01", "42703"].includes(error.code);
    return { message: missingSetup ? copy.mentorSaveNotReady : copy.mentorSaveFailed };
  }
  if (result === "STALE") return { message: copy.stale };
  if (result === "INVALID") return { message: copy.mentorSaveInvalid };
  if (result === "NOT_FOUND") return { message: copy.mentorSaveMissing };
  if (result !== "OK") return { message: copy.mentorSaveFailed };

  revalidatePath(adminPaths.mentors);
  revalidatePath("/admin/catalog/[section]/[id]/edit", "page");
  revalidatePath("/");
  revalidatePath("/courses/[slug]", "page");
  return { success: true };
};
