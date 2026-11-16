import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { catalogRecordId } from "@/lib/admin-catalog";
import {
  manualAdmissionCopy as copy,
  type ManualAdmissionBatchOption,
} from "@/lib/admin-manual-admission";
import { adminPaths } from "@/lib/admin-navigation";
import { getEnrollmentConfig } from "@/lib/enrollment/config";
import { AppError } from "@/lib/errors";
import { formatPoishaToBDT } from "@/lib/money";
import { listOpenManualAdmissionBatches } from "@/server/admin/manual-admission";
import { requireStaff } from "@/server/auth/require-staff";
import { createManualAdmission } from "./actions";
import { ManualAdmissionForm } from "./manual-admission-form";

export const dynamic = "force-dynamic";

const linkClass =
  "inline-flex min-h-11 items-center text-sm font-medium text-primary-900 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600";

export default async function ManualAdmissionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requireStaff("enrollments:create").catch((error: unknown) => {
    if (!(error instanceof AppError)) throw error;
    if (error.code === "FORBIDDEN" || error.code === "ACCOUNT_INACTIVE") {
      redirect(`${adminPaths.login}?error=forbidden`);
    }
    redirect(adminPaths.login);
  });

  const { batchId } = await searchParams;
  const requestedBatchId = catalogRecordId.safeParse(batchId).data;
  const batches = await listOpenManualAdmissionBatches().catch((error: unknown) => {
    if (error instanceof AppError && error.code === "ADMIN_CATALOG_UNAVAILABLE") return null;
    throw error;
  });
  const questions = getEnrollmentConfig().programQuestions;
  const options: ManualAdmissionBatchOption[] =
    batches?.map((batch) => ({
      id: batch.id,
      courseId: batch.course_id,
      courseTitle: batch.courses.title,
      name: batch.name,
      startDate: batch.start_date,
      revision: batch.updated_at,
      fee: batch.feePoisha === 0n ? copy.free : formatPoishaToBDT(batch.feePoisha),
      isFree: batch.feePoisha === 0n,
      questions: questions[batch.courses.slug] ?? [],
    })) ?? [];
  const retryHref = requestedBatchId
    ? `${adminPaths.addStudent}?${new URLSearchParams({ batchId: requestedBatchId })}`
    : adminPaths.addStudent;

  return (
    <AdminPortalShell staff={staff} currentPath={adminPaths.addStudent}>
      <section className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <Link href={adminPaths.admissions} className={linkClass}>
          {copy.back}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-primary-900 sm:text-3xl">
          {copy.title}
        </h1>
        {options.length > 0 ? (
          <>
            {batchId !== undefined && !options.some((batch) => batch.id === requestedBatchId) && (
              <p className="rounded-lg border border-border-subtle bg-surface-card p-3 text-sm text-text-secondary">
                {copy.previouslySelectedUnavailable}
              </p>
            )}
            <ManualAdmissionForm
              batches={options}
              initialBatchId={requestedBatchId}
              save={createManualAdmission}
            />
          </>
        ) : (
          <div className="rounded-xl border border-border-subtle bg-surface-card p-4 text-sm text-text-secondary">
            <p>{batches ? copy.noOpenBatches : copy.choicesUnavailable}</p>
            <Link href={batches ? adminPaths.batches : retryHref} className={linkClass}>
              {batches ? copy.browseBatches : copy.retry}
            </Link>
          </div>
        )}
      </section>
    </AdminPortalShell>
  );
}
