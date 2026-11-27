import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { catalogRecordId, catalogSection } from "@/lib/admin-catalog";
import { createCatalogCopy, editCatalogCopy } from "@/lib/admin-catalog-edit";
import { adminCourseBatchesHref, adminPaths } from "@/lib/admin-navigation";
import { batchCopyValues } from "@/lib/batch-copy";
import { batchDefaultsValues } from "@/lib/course-batch-defaults";
import { getCourseBatchDefaults } from "@/server/admin/course-batch-defaults";
import { AppError } from "@/lib/errors";
import { getAdminCatalogBatchContext, listBatchCourseOptions } from "@/server/admin/catalog";
import { getCatalogEditRecord } from "@/server/admin/catalog-edit";
import { requireStaff } from "@/server/auth/require-staff";
import { EditForm } from "../[id]/edit/edit-form";
import { createCatalogDraft } from "./actions";

export default async function NewCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const target = catalogSection.safeParse((await params).section);
  if (!target.success) notFound();

  const staff = await requireStaff("catalog:edit").catch((error: unknown) => {
    if (!(error instanceof AppError)) throw error;
    if (error.code === "FORBIDDEN" || error.code === "ACCOUNT_INACTIVE") {
      redirect(`${adminPaths.login}?error=forbidden`);
    }
    redirect(adminPaths.login);
  });
  const section = target.data;
  const path = adminPaths[section];
  const courses =
    section === "batches"
      ? await listBatchCourseOptions().catch((error: unknown) => {
          if (error instanceof AppError && error.code === "ADMIN_CATALOG_UNAVAILABLE") return null;
          throw error;
        })
      : [];
  const query = await searchParams;
  const requestedCourse = catalogRecordId.safeParse(query.courseId);
  const copyRequested = section === "batches" && query.copyFrom !== undefined;
  const sourceId = catalogRecordId.safeParse(query.copyFrom);
  const source =
    copyRequested && sourceId.success && courses
      ? await Promise.all([
          getAdminCatalogBatchContext(sourceId.data),
          getCatalogEditRecord("batches", sourceId.data),
        ]).catch((error: unknown) => {
          if (error instanceof AppError && error.code === "ADMIN_CATALOG_UNAVAILABLE") return null;
          throw error;
        })
      : null;
  const sourceBatch = source?.[0];
  const sourceRecord = source?.[1];
  const copyCourse = sourceBatch && courses?.find((course) => course.id === sourceBatch.courseId);
  const copiedValues =
    sourceRecord && copyCourse ? batchCopyValues(copyCourse.id, sourceRecord.values) : null;
  const selectedCourse = copyRequested
    ? copyCourse || undefined
    : requestedCourse.success
      ? courses?.find((course) => course.id === requestedCourse.data)
      : undefined;
  const needsCourse = section === "batches" && courses?.length === 0;
  const defaultsRequested = section === "batches" && !copyRequested && query.defaults === "1";
  const savedDefaults =
    defaultsRequested && selectedCourse
      ? await getCourseBatchDefaults(staff.userId, selectedCourse.id)
      : null;
  const prefilledDefaults = savedDefaults?.defaults
    ? batchDefaultsValues(savedDefaults.defaults)
    : null;

  return (
    <AdminPortalShell staff={staff} currentPath={path}>
      <section className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href={selectedCourse ? adminCourseBatchesHref(selectedCourse.id) : path}
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary-900 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          {editCatalogCopy.back}
        </Link>
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-primary-900 sm:text-3xl">
            {createCatalogCopy[section].title}
          </h1>
          <p className="text-sm text-text-secondary">{createCatalogCopy.draft}</p>
          {defaultsRequested && (
            <p role="status" className="text-sm text-text-secondary">
              {prefilledDefaults
                ? "Course defaults loaded. Review the settings and choose Free or Paid before creating the draft."
                : "No saved defaults are available. Enter the batch settings manually."}
            </p>
          )}
          {copiedValues && sourceBatch && (
            <p
              role="status"
              className="rounded-lg border border-border-subtle bg-surface-card p-3 text-sm"
            >
              Copying settings from {sourceBatch.name}. Enter a new name, batch number and dates.
              Student records, payment history and mentor assignments are not copied.
            </p>
          )}
        </header>
        {copyRequested && !copiedValues ? (
          <div role="alert" className="space-y-2 text-sm text-status-danger-text">
            <p>The source batch could not be copied. Its course may be archived or unavailable.</p>
            <Link href={`${adminPaths.batches}/new`} className="underline">
              Create a new batch instead
            </Link>
          </div>
        ) : courses === null ? (
          <p role="alert" className="text-sm text-status-danger-text">
            {editCatalogCopy.readFailed}
          </p>
        ) : needsCourse ? (
          <div className="space-y-2">
            <p>{createCatalogCopy.noCourses}</p>
            <Link
              href={`${adminPaths.courses}/new`}
              className="inline-flex min-h-11 items-center text-primary-900 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            >
              {createCatalogCopy.courses.link}
            </Link>
          </div>
        ) : (
          <EditForm
            section={section}
            mode="create"
            courseOptions={courses}
            initialValues={
              copiedValues ??
              (selectedCourse
                ? {
                    course_id: selectedCourse.id,
                    ...(prefilledDefaults ?? { capacity: "unlimited" }),
                  }
                : section === "batches"
                  ? { capacity: "unlimited" }
                  : {})
            }
            save={createCatalogDraft.bind(null, section)}
          />
        )}
      </section>
    </AdminPortalShell>
  );
}
