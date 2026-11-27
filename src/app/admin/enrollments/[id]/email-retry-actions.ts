"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/server/auth/require-staff";
import { dispatchEmailOutboxById } from "@/server/email/resend";

export async function retryConfirmationEmail(
  _previous: { message?: string },
  form: FormData
): Promise<{ message?: string }> {
  await requireStaff("email:retry");
  const input = z
    .object({ id: z.string().uuid(), enrollmentId: z.string().uuid() })
    .safeParse({ id: form.get("id"), enrollmentId: form.get("enrollmentId") });
  if (!input.success) return { message: "Invalid email record." };
  const result = await dispatchEmailOutboxById(input.data.id).catch(() => null);
  revalidatePath(`/admin/enrollments/${input.data.enrollmentId}`);
  if (result?.sent)
    return { message: "Email accepted by the provider. Delivery to the inbox is not guaranteed." };
  return {
    message:
      "Email not sent. It may be queued, rate limited, awaiting a receipt, or beyond the safe retry window.",
  };
}
