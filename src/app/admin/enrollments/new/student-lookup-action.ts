"use server";
import { z } from "zod";
import { isValidBdPhone, normalizeBdPhone, normalizeEmail } from "@/lib/enrollment/status";
import type { ExistingStudentLookup } from "@/lib/admin-manual-admission";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

const querySchema = z.object({
  email: z.string().trim().email().max(160).transform(normalizeEmail),
  phone: z.string().trim().max(24).refine(isValidBdPhone).transform(normalizeBdPhone),
  courseId: z.string().uuid(),
});
const studentSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  email: z.string(),
  phone: z.string(),
  university: z.string().nullable(),
});
export async function lookupExistingStudent(input: {
  email: string;
  phone: string;
  courseId: string;
}): Promise<ExistingStudentLookup> {
  await requireStaff("enrollments:create");
  const parsed = querySchema.safeParse(input);
  if (!parsed.success) return { message: "Enter the student’s email and mobile number first." };
  const { email, phone, courseId } = parsed.data;
  const admin = createSupabaseAdminClient();
  const { data: contact, error } = await admin
    .from("student_contacts")
    .select("student_id")
    .eq("email", email)
    .eq("phone", phone)
    .maybeSingle();
  if (error) return { message: "Student lookup is unavailable. Try again." };
  if (!contact)
    return {
      message:
        "No student with this exact contact pair was found. Check the contacts before creating a new student.",
    };
  const { data: row, error: studentError } = await admin
    .from("students")
    .select("id,full_name,email,phone,university")
    .eq("id", contact.student_id)
    .is("archived_at", null)
    .maybeSingle();
  const student = studentSchema.safeParse(row);
  if (studentError || !student.success)
    return { message: "Student record unavailable or archived. Review it in Students." };
  const { data: prior, error: priorError } = await admin
    .from("enrollments")
    .select("answers")
    .eq("course_id", courseId)
    .eq("email", email)
    .eq("phone", phone)
    .eq("status", "confirmed")
    .is("archived_at", null)
    .order("confirmed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const parsedAnswers = z.record(z.string().max(2000)).safeParse(prior?.answers ?? {});
  const answers = !priorError && parsedAnswers.success ? parsedAnswers.data : {};
  return {
    student: {
      fullName: student.data.full_name,
      email: student.data.email,
      phone: student.data.phone,
      university: student.data.university,
      answers,
    },
  };
}
