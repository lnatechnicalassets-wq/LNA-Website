import React from "react";
import { notFound, redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { requireStaff, type VerifiedStaffContext } from "@/server/auth/require-staff";
import { getAdminEnrollmentDetail } from "@/server/enrollment/service";
import { AdminEnrollmentDetailView } from "./admin-enrollment-detail-view";

export const dynamic = "force-dynamic";

export default async function AdminEnrollmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  const { id } = await params;
  const detail = await getAdminEnrollmentDetail(id, staff);

  if (!detail) {
    notFound();
  }

  return <AdminEnrollmentDetailView staff={staff} detail={detail} />;
}

