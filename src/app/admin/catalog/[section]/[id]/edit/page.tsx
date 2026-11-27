import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { CatalogPublishControl } from "@/components/admin/catalog-publish-control";
import { batchMentorCopy, catalogSection } from "@/lib/admin-catalog";
import { editCatalogCopy } from "@/lib/admin-catalog-edit";
import {
  adminCourseBatchesHref,
  adminEnrollmentsHref,
  adminMessage,
  adminPaths,
} from "@/lib/admin-navigation";
import { DeleteBatchDraftForm } from "@/components/admin/delete-batch-draft-form";
import { AppError } from "@/lib/errors";
import { getBatchMentorRoster } from "@/server/admin/batch-mentors";
import { getAdminCatalogBatchContext } from "@/server/admin/catalog";
import { getCatalogEditRecord } from "@/server/admin/catalog-edit";
import { requireStaff } from "@/server/auth/require-staff";
import { CatalogArchiveControl } from "../../catalog-archive-control";
import { saveBatchMentors } from "./batch-mentor-actions";
import { BatchMentorForm } from "./batch-mentor-form";
import { BatchIntakeEditor } from "./batch-intake-editor";
import { saveCatalogEdit } from "./actions";
import { CourseContentEditor } from "./course-content-editor";
import { CourseMentorEditor } from "./course-mentor-editor";
import { CourseQuestionsEditor } from "./course-questions-editor";
import { EditForm } from "./edit-form";
import { CourseBatchDefaultsEditor } from "./course-batch-defaults-editor";
import { deleteUnusedBatchDraft } from "./delete-draft-action";
import { publishCatalogDraft } from "./publish-action";

const route = z.object({ section: catalogSection, id: z.string().uuid() });

export default async function CatalogEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string; id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const target = route.safeParse(await params);
  if (!target.success) notFound();

  const staff = await requireStaff("catalog:edit").catch((error: unknown) => {
    if (!(error instanceof AppError)) throw error;
    if (error.code === "FORBIDDEN" || error.code === "ACCOUNT_INACTIVE") {
      redirect(`${adminPaths.login}?error=forbidden`);
    }
    redirect(adminPaths.login);
  });
  const { section, id } = target.data;
  const path = adminPaths[section];
  const record = await getCatalogEditRecord(section, id).catch((error: unknown) => {
    if (error instanceof AppError && error.code === "ADMIN_CATALOG_UNAVAILABLE")
      return "unavailable" as const;
    throw error;
  });
  if (!record) notFound();
  const batch = section === "batches" ? await getAdminCatalogBatchContext(id) : null;
  const roster =
    batch && record !== "unavailable" && !record.archived
      ? await getBatchMentorRoster(id, batch.courseId).catch((error: unknown) => {
          if (error instanceof AppError && error.code === "ADMIN_CATALOG_UNAVAILABLE") return null;
          throw error;
        })
      : null;

  return (
    <AdminPortalShell staff={staff} currentPath={path}>
      <section className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href={batch ? adminCourseBatchesHref(batch.courseId) : path}
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary-900 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          {editCatalogCopy.back}
        </Link>
        {batch && (
          <Link
            href={`${adminPaths.courses}/${batch.courseId}/edit`}
            className="block w-fit text-sm font-semibold text-primary-900 underline"
          >
            {adminMessage("filterCourse")} · {batch.courseTitle}
          </Link>
        )}
        {batch && (
          <nav
            aria-label="Batch workspace"
            className="flex flex-wrap gap-3 text-sm font-semibold text-primary-900"
          >
            <Link
              aria-current="page"
              href={`${adminPaths.batches}/${id}/edit`}
              className="rounded-lg border border-border-default bg-surface-muted px-4 py-3"
            >
              Details
            </Link>
            <Link
              href={adminEnrollmentsHref({ view: "students", batchId: id })}
              className="rounded-lg border border-border-default px-4 py-3"
            >
              Students
            </Link>
            <Link
              href={adminEnrollmentsHref({ batchId: id })}
              className="rounded-lg border border-border-default px-4 py-3"
            >
              Applications
            </Link>
          </nav>
        )}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-primary-900 sm:text-3xl">
            {editCatalogCopy[section].title}
          </h1>
          {batch && record !== "unavailable" && (
            <Link
              href={`${adminPaths.batches}/new?copyFrom=${encodeURIComponent(id)}`}
              className="inline-flex min-h-11 items-center rounded-lg border border-border-default px-4 text-sm font-medium text-primary-900 hover:bg-surface-muted"
            >
              Copy as new batch
            </Link>
          )}
          {record !== "unavailable" && (
            <CatalogArchiveControl
              key={record.revision}
              id={id}
              section={section}
              title={record.values[section === "courses" ? "title" : "name"]}
              revision={record.revision}
              archived={record.archived}
            />
          )}
        </header>
        {record === "unavailable" || record.archived ? (
          <p role="alert" className="text-sm text-status-danger-text">
            {record === "unavailable" ? editCatalogCopy.readFailed : editCatalogCopy.archived}
          </p>
        ) : (
          <>
            <EditForm
              section={section}
              initialValues={record.values}
              save={saveCatalogEdit.bind(null, { section, id, revision: record.revision })}
            />
            {section === "courses" && (
              <CourseContentEditor
                id={id}
                actorId={staff.userId}
                saved={(await searchParams)?.contentSaved === "1"}
              />
            )}
            {section === "courses" && (
              <CourseMentorEditor
                id={id}
                actorId={staff.userId}
                saved={(await searchParams)?.mentorsSaved === "1"}
              />
            )}
            {section === "courses" && (
              <CourseQuestionsEditor
                id={id}
                actorId={staff.userId}
                saved={(await searchParams)?.questionsSaved === "1"}
              />
            )}
            {section === "courses" && (
              <CourseBatchDefaultsEditor
                id={id}
                actorId={staff.userId}
                saved={(await searchParams)?.defaultsSaved === "1"}
              />
            )}
            {batch && (
              <BatchIntakeEditor
                id={id}
                actorId={staff.userId}
                saved={(await searchParams)?.intakeSaved === "1"}
              />
            )}
            {batch && (
              <section
                id="batch-mentors"
                className="space-y-3 rounded-xl border border-border-subtle bg-surface-card p-4 sm:p-6"
              >
                <h2 className="font-semibold text-primary-900">{batchMentorCopy.title}</h2>
                {roster ? (
                  <BatchMentorForm
                    key={record.revision}
                    roster={roster}
                    courseTitle={batch.courseTitle}
                    batchName={batch.name}
                    save={saveBatchMentors.bind(null, { id, revision: record.revision })}
                  />
                ) : (
                  <p role="alert" className="text-sm text-status-danger-text">
                    {batchMentorCopy.failed}
                  </p>
                )}
              </section>
            )}
            {batch && record.status === "draft" && (
              <DeleteBatchDraftForm
                save={deleteUnusedBatchDraft.bind(null, { id, revision: record.revision })}
              />
            )}
            {record.status === "draft" && (
              <CatalogPublishControl
                section={section}
                publish={publishCatalogDraft.bind(null, { section, id, revision: record.revision })}
              />
            )}
          </>
        )}
      </section>
    </AdminPortalShell>
  );
}
