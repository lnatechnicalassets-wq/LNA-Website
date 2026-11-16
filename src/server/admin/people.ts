import "server-only";

import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { redirect } from "next/navigation";
import { z } from "zod";
import { CareerHistoryItemSchema } from "@/lib/content/home";
import type { PeopleQuery, StudentCourseRow } from "@/lib/admin-people";
import { adminPaths } from "@/lib/admin-navigation";
import { AppError } from "@/lib/errors";
import { requireStaff } from "@/server/auth/require-staff";
import { createSupabaseAdminClient } from "@/server/supabase/clients";

export async function requireDirectoryStaff(permission: "catalog:edit" | "enrollments:manage") {
  return requireStaff(permission).catch((error: unknown) => {
    if (!(error instanceof AppError)) throw error;
    redirect(
      error.code === "FORBIDDEN" || error.code === "ACCOUNT_INACTIVE"
        ? `${adminPaths.login}?error=forbidden`
        : adminPaths.login
    );
  });
}

const meta = z.object({
  id: z.string().uuid(),
  updated_at: z.string(),
  archived_at: z.string().nullable(),
});
export const staffMentorCardShape = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  role: z.string(),
  organization: z.string(),
  portrait_src: z.string().nullable(),
  company_logo_src: z.string().nullable(),
});
export const mentorCardColumns = "id,slug,name,role,organization,portrait_src,company_logo_src";
const mentorRow = staffMentorCardShape.merge(meta).extend({
  bio: z.string(),
  linkedin_url: z.string().nullable(),
  expertise: z.array(z.string()),
  career_history: z.array(CareerHistoryItemSchema),
  published: z.boolean(),
});
const course = z.object({ title: z.string() });
const batch = z.object({
  name: z.string(),
  status: z.string().optional(),
  end_date: z.string().nullable().optional(),
});
const history = z.object({
  course_id: z.string().uuid(),
  batch_id: z.string().uuid().nullable(),
  courses: course,
  batches: batch.nullable(),
});
const studentRow = meta.extend({
  full_name: z.string(),
  email: z.string(),
  phone: z.string(),
  university: z.string().nullable(),
  student_enrollment_links: z.array(
    z.object({
      enrollments: history.extend({
        public_ref: z.string(),
        status: z.string(),
        id: z.string().uuid(),
      }),
    })
  ),
  student_completions: z.array(
    history.extend({ id: z.string().uuid(), completed_on: z.string().nullable() })
  ),
});

function safeSearch(search: string) {
  return search
    .replace(/[^\p{L}\p{N}@. +_-]/gu, "")
    .replace(/_/g, "\\_")
    .trim();
}

export async function listStaffMentors(filters: PeopleQuery) {
  const start = (filters.page - 1) * 18;
  const search = safeSearch(filters.q);
  let query = createSupabaseAdminClient()
    .from("mentors")
    .select(
      `${mentorCardColumns},bio,linkedin_url,expertise,career_history,published,updated_at,archived_at`
    )
    .order("name")
    .order("id")
    .range(start, start + 18);
  query = filters.archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  if (search) query = query.or(`name.ilike.%${search}%,organization.ilike.%${search}%`);
  const { data, error } = await query;
  const parsed = z.array(mentorRow).safeParse(data);
  if (error || !parsed.success)
    throw new AppError("Unable to load mentors.", "ADMIN_CATALOG_UNAVAILABLE", 503);
  return { items: parsed.data.slice(0, 18), hasNext: parsed.data.length > 18 };
}

export async function listStaffStudents(filters: PeopleQuery) {
  const start = (filters.page - 1) * 18;
  const search = safeSearch(filters.q);
  let query = createSupabaseAdminClient()
    .from("students")
    .select(
      "id,full_name,email,phone,university,archived_at,updated_at,student_enrollment_links(enrollments(id,public_ref,status,course_id,batch_id,courses(title),batches!enrollments_batch_id_fkey(name,status,end_date))),student_completions(id,course_id,batch_id,completed_on,courses(title),batches(name))",
      { count: "exact" }
    )
    .order("full_name")
    .order("id")
    .range(start, start + 18);
  query = filters.archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  if (search) {
    const digits = search.replace(/\D/g, "");
    const phone = /^\+?8801\d{9}$/.test(search) ? digits.slice(2) : search;
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${phone}%,university.ilike.%${search}%`
    );
  }
  const { data, error, count } = await query;
  const parsed = z.array(studentRow).safeParse(data);
  if (error || !parsed.success)
    throw new AppError("Unable to load students.", "ADMIN_STUDENTS_UNAVAILABLE", 503);
  const today = new Date().toISOString().slice(0, 10);
  return {
    items: parsed.data.slice(0, 18).map((item) => {
      const courses = new Map<string, StudentCourseRow>();
      for (const { enrollments: row } of item.student_enrollment_links) {
        const key = `${row.course_id}:${row.batch_id ?? ""}`;
        courses.set(key, {
          key,
          title: row.courses.title,
          batch: row.batches?.name ?? null,
          completionDate: null,
          enrollmentId: row.id,
          enrollmentStatus: row.status,
          previous:
            row.batches?.status === "completed" ||
            Boolean(row.batches?.end_date && row.batches.end_date <= today),
        });
      }
      for (const row of item.student_completions) {
        const key = `${row.course_id}:${row.batch_id ?? ""}`;
        const enrollment = courses.get(key);
        courses.set(key, {
          key,
          title: row.courses.title,
          batch: row.batches?.name ?? null,
          completionDate: row.completed_on,
          completionId: row.id,
          enrollmentId: enrollment?.enrollmentId,
          enrollmentStatus: enrollment?.enrollmentStatus,
          previous: true,
        });
      }
      const {
        student_enrollment_links: _enrollments,
        student_completions: _completions,
        ...profile
      } = item;
      return {
        ...profile,
        courses: [...courses.values()].sort(
          (a, b) => a.title.localeCompare(b.title) || (a.batch ?? "").localeCompare(b.batch ?? "")
        ),
      };
    }),
    totalCount: count ?? parsed.data.length,
    hasNext: parsed.data.length > 18,
  };
}

export async function listPastBatchOptions(courseId: string) {
  const admin = createSupabaseAdminClient();
  const rows: { id: string; course_id: string; name: string }[] = [];
  const shape = z.array(
    z.object({ id: z.string().uuid(), course_id: z.string().uuid(), name: z.string() })
  );
  const today = new Date().toISOString().slice(0, 10);
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await admin
      .from("batches")
      .select("id,course_id,name")
      .eq("course_id", courseId)
      .not("status", "in", "(draft,cancelled)")
      .or(`status.eq.completed,end_date.lte.${today}`)
      .order("end_date", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    const parsed = shape.safeParse(data);
    if (error || !parsed.success)
      throw new AppError("Unable to load past cohorts.", "ADMIN_CATALOG_UNAVAILABLE", 503);
    rows.push(...parsed.data);
    if (parsed.data.length < 500) return rows;
  }
}

export async function listMentorAssets() {
  async function paths(directory: string) {
    try {
      return (await readdir(join(process.cwd(), "public", "images", directory)))
        .map((file) => `/images/${directory}/${file}`)
        .filter((path) => /\.(png|jpe?g|webp|avif|svg)$/.test(path))
        .sort();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }
  const [portraits, logos] = await Promise.all([paths("mentors"), paths("partners")]);
  return { portraits, logos };
}
