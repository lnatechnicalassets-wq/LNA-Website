import React from "react";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { requireStaff, type VerifiedStaffContext } from "@/server/auth/require-staff";
import { listAdminEnrollments } from "@/server/enrollment/service";
import { AdminEnrollmentsView } from "./admin-enrollments-view";

export const dynamic = "force-dynamic";

function singleParam(val: string | string[] | undefined): string {
  if (typeof val === "string") return val;
  if (Array.isArray(val) && val.length > 0) return val[0];
  return "";
}

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

  const resolvedParams = await searchParams;
  const search = singleParam(resolvedParams.q).trim();
  const status = singleParam(resolvedParams.status).trim();
  const rawPage = Number.parseInt(singleParam(resolvedParams.page) || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const list = await listAdminEnrollments(
    {
      search: search || undefined,
      status: status || undefined,
      page,
      pageSize: 20,
    },
    staff
  );

  return (
    <AdminEnrollmentsView staff={staff} list={list} currentSearch={search} currentStatus={status} />
  );
}
