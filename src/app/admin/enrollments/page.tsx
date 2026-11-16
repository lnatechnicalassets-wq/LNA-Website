import React from "react";
import { notFound, redirect } from "next/navigation";
import { adminEnrollmentsHref } from "@/lib/admin-navigation";
import { admissionQuery } from "@/lib/admin-admissions";
import { AppError } from "@/lib/errors";
import {
  getAdminCatalogBatchContext,
  listAdmissionBatchOptions,
  listBatchCourseOptions,
} from "@/server/admin/catalog";
import { requireStaff, type VerifiedStaffContext } from "@/server/auth/require-staff";
import { listAdminEnrollments } from "@/server/enrollment/service";
import { AdminEnrollmentsView } from "./admin-enrollments-view";

export const dynamic = "force-dynamic";

export default async function AdminEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let staff: VerifiedStaffContext | null = null;
  let redirectTarget: string | null = null;

  try {
    staff = await requireStaff("enrollments:read");
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === "FORBIDDEN" || err.code === "ACCOUNT_INACTIVE") {
        redirectTarget = "/admin/login?error=forbidden";
      } else {
        redirectTarget = "/admin/login";
      }
    } else {
      throw err;
    }
  }

  if (redirectTarget || !staff) {
    redirect(redirectTarget ?? "/admin/login");
  }

  const parsed = admissionQuery.safeParse(await searchParams);
  if (!parsed.success) notFound();
  const { view, q, status, page, batchId, courseId: requestedCourseId } = parsed.data;

  const [batch, courses] = await Promise.all([
    batchId ? getAdminCatalogBatchContext(batchId) : null,
    listBatchCourseOptions({ includeArchived: true }),
  ]);
  if (batchId && !batch) notFound();
  if (requestedCourseId && batch && requestedCourseId !== batch.courseId) notFound();
  const courseId = requestedCourseId ?? batch?.courseId;
  if (courseId && !courses.some((course) => course.id === courseId)) notFound();

  const selectedStatus = view !== "students" ? status : "";
  const [list, batches] = await Promise.all([
    listAdminEnrollments(
      {
        search: q || undefined,
        status: view === "students" ? "confirmed" : selectedStatus || undefined,
        courseId,
        batchId,
        archived: view === "archived",
        currentOnly: view === "applications" && !selectedStatus && !q,
        page,
        pageSize: 20,
      },
      staff
    ),
    courseId ? listAdmissionBatchOptions(courseId) : [],
  ]);

  const lastPage = Math.max(1, Math.ceil(list.totalCount / list.pageSize));
  if (list.page > lastPage) {
    redirect(
      adminEnrollmentsHref({
        view,
        courseId,
        batchId,
        search: q,
        status: selectedStatus,
        page: lastPage,
      })
    );
  }

  return (
    <AdminEnrollmentsView
      staff={staff}
      list={list}
      view={view}
      currentSearch={q}
      currentStatus={selectedStatus}
      courseId={courseId}
      courses={courses}
      batch={batch ?? undefined}
      batches={batches}
    />
  );
}
