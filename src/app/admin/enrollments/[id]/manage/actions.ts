"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  lifecycleInputSchema,
  lifecycleMessages,
  type LifecycleState,
} from "@/lib/admission-lifecycle";
import { adminPaths } from "@/lib/admin-navigation";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

export async function manageAdmissionLifecycle(
  _previous: LifecycleState,
  form: FormData
): Promise<LifecycleState> {
  const staff = await requireStaff("enrollments:manage");
  const input = lifecycleInputSchema.safeParse({
    id: form.get("id"),
    revision: form.get("revision"),
    operation: form.get("operation"),
    reason: form.get("reason"),
    attested: form.get("attested"),
    destination: form.get("destination") ?? "",
  });
  if (!input.success) return { message: lifecycleMessages.INVALID };
  const value = input.data;
  const destination = value.operation === "transfer" ? value.destination : null;
  const { data, error } = await createSupabaseAdminClient().rpc(
    "manage_staff_admission_lifecycle",
    {
      p_actor_id: staff.userId,
      p_enrollment_id: value.id,
      p_revision: value.revision,
      p_operation: value.operation,
      p_reason: value.reason,
      p_attested: true,
      p_destination_id: destination?.id ?? null,
      p_destination_revision: destination?.revision ?? null,
    }
  );
  if (error || data !== "OK") {
    return {
      message:
        !error && typeof data === "string" && Object.hasOwn(lifecycleMessages, data)
          ? lifecycleMessages[data]
          : "The admission could not be updated safely. Reload and try again.",
    };
  }
  revalidatePath(adminPaths.admissions);
  revalidatePath(`${adminPaths.admissions}/${value.id}`);
  revalidatePath(`${adminPaths.admissions}/attention`);
  revalidatePath(adminPaths.studentDirectory);
  revalidatePath(adminPaths.batches);
  revalidatePath("/courses", "layout");
  revalidatePath("/enroll");
  revalidatePath("/");
  redirect(`${adminPaths.admissions}/${value.id}/manage?changed=1`);
}
