import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import {
  catalogCopy,
  catalogRecordId,
  catalogPreviewCopy,
  catalogStatusVariant,
  catalogSection,
  catalogStatuses,
  catalogStatusLabels,
  parseCatalogFilters,
} from "@/lib/admin-catalog";
import { createCatalogCopy, editCatalogCopy } from "@/lib/admin-catalog-edit";
import { catalogPublishCopy } from "@/lib/admin-catalog-publish";
import {
  adminCourseBatchesHref,
  adminEnrollmentsHref,
  adminMessage,
  adminPaths,
} from "@/lib/admin-navigation";
import { AppError } from "@/lib/errors";
import { formatPoishaToBDT } from "@/lib/money";
import {
  getAdminCatalogCourseContext,
  listAdminCatalog,
  listBatchCourseOptions,
} from "@/server/admin/catalog";
import { requireStaff } from "@/server/auth/require-staff";
import { CatalogCardPreview } from "./catalog-card-preview";
import { CatalogArchiveControl } from "./catalog-archive-control";

const inputClassName =
  "min-h-11 w-full rounded-lg border border-border-default bg-surface-card px-3 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600";
const linkClassName =
  "inline-flex min-h-11 items-center rounded-lg border border-border-default px-4 text-sm font-medium text-primary-900 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export default async function AdminCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sectionResult = catalogSection.safeParse((await params).section);
  if (!sectionResult.success) notFound();

  const staff = await requireStaff("catalog:read").catch((error: unknown) => {
    if (!(error instanceof AppError)) throw error;
    if (error.code === "FORBIDDEN" || error.code === "ACCOUNT_INACTIVE") {
      redirect(`${adminPaths.login}?error=forbidden`);
    }
    redirect(adminPaths.login);
  });

  const section = sectionResult.data;
  const path = adminPaths[section];
  const copy = catalogCopy[section];
  const queryParams = await searchParams;
  const successMessage =
    queryParams.deleted === "1"
      ? `Unused ${section === "courses" ? "course" : "batch"} deleted.`
      : queryParams.draftDeleted === "1" && section === "batches"
        ? "Unused batch draft deleted."
        : queryParams.published === "1"
          ? catalogPublishCopy[section].success
          : queryParams.created === "1"
            ? createCatalogCopy[section].saved
            : queryParams.saved === "1"
              ? editCatalogCopy.saved
              : undefined;
  const filters = parseCatalogFilters(section, queryParams);

  const courseScope = catalogRecordId
    .or(z.literal("").transform(() => undefined))
    .optional()
    .safeParse(section === "batches" ? queryParams.courseId : undefined);
  if (!courseScope.success) notFound();
  const courseId = courseScope.data;
  const scopeHref = courseId ? adminCourseBatchesHref(courseId) : path;
  const result = await (async () => {
    const course = courseId ? await getAdminCatalogCourseContext(courseId) : undefined;
    if (course === null) notFound();
    const [catalog, courseOptions] = await Promise.all([
      listAdminCatalog(section, filters, courseId),
      section === "batches" ? listBatchCourseOptions({ includeArchived: true }) : [],
    ]);
    return { ...catalog, course, courseOptions };
  })().catch((error: unknown) => {
    if (error instanceof AppError && error.code === "ADMIN_CATALOG_UNAVAILABLE") return null;
    throw error;
  });

  function pageHref(page: number) {
    const query = new URLSearchParams();
    if (courseId) query.set("courseId", courseId);
    if (filters.q) query.set("q", filters.q);
    if (filters.status) query.set("status", filters.status);
    if (page > 1) query.set("page", String(page));
    const suffix = query.toString();
    return suffix ? `${path}?${suffix}` : path;
  }

  return (
    <AdminPortalShell staff={staff} currentPath={path}>
      <section className="mx-auto w-full max-w-7xl space-y-4 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            {section === "batches" && (
              <div className="flex flex-wrap gap-2">
                <Link href={adminPaths.courses} className={linkClassName}>
                  {adminMessage("allCourses")}
                </Link>
                {courseId && (
                  <Link href={adminPaths.batches} className={linkClassName}>
                    {adminMessage("allBatches")}
                  </Link>
                )}
              </div>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-primary-900 sm:text-3xl">
              {result?.course
                ? catalogCopy.courseBatches(result.course.title)
                : adminMessage(section)}
            </h1>
            <p className="text-sm text-text-secondary">{copy.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {section === "courses" && (
              <Link href={adminPaths.batches} className={linkClassName}>
                {adminMessage("allBatches")}
              </Link>
            )}
            {(!courseId || (result?.course && !result.course.archived)) && (
              <Link
                href={`${path}/new${courseId ? `?${new URLSearchParams({ courseId })}` : ""}`}
                className={linkClassName}
              >
                {createCatalogCopy[section].link}
              </Link>
            )}
          </div>
        </header>
        {successMessage && (
          <p
            role="status"
            className="rounded-xl border border-status-success-border bg-status-success-bg p-4 text-sm text-status-success-text"
          >
            {successMessage}
          </p>
        )}

        <form
          key={JSON.stringify([courseId, filters.q, filters.status])}
          action={path}
          method="get"
          className="flex flex-col gap-4 rounded-xl border border-primary-200 bg-primary-50 p-3 sm:flex-row sm:flex-wrap sm:items-end"
        >
          {section === "batches" && result && (
            <label className="space-y-1 text-sm font-medium sm:min-w-48">
              <span className="block">{adminMessage("filterCourse")}</span>
              <select name="courseId" defaultValue={courseId ?? ""} className={inputClassName}>
                <option value="">{adminMessage("allCourses")}</option>
                {result.courseOptions.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="min-w-0 flex-1 space-y-1 text-sm font-medium sm:min-w-48">
            <span className="block">{copy.search}</span>
            <input
              name="q"
              type="search"
              maxLength={80}
              defaultValue={filters.q}
              className={inputClassName}
            />
          </label>
          <label className="space-y-1 text-sm font-medium sm:min-w-48">
            <span className="block">{catalogCopy.status}</span>
            <select name="status" defaultValue={filters.status} className={inputClassName}>
              <option value="">{catalogCopy.allStatuses}</option>
              {catalogStatuses[section].options.map((status) => (
                <option key={status} value={status}>
                  {catalogStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="min-h-11">
              {catalogCopy.filter}
            </Button>
            {(filters.q || filters.status) && (
              <Link href={scopeHref} className={linkClassName}>
                {catalogCopy.reset}
              </Link>
            )}
          </div>
        </form>

        {result === null ? (
          <p
            role="alert"
            className="rounded-xl border border-status-danger-border bg-status-danger-bg p-4 text-sm text-status-danger-text"
          >
            {catalogCopy.unavailable}
          </p>
        ) : (
          <>
            {result.records.length ? (
              <ul className="grid gap-4 xl:grid-cols-2">
                {result.records.map((record) => {
                  const isCourse = "title" in record;
                  return (
                    <li key={record.id}>
                      <Card className="h-full border-t-2 border-t-primary-400">
                        <CardContent className="space-y-4 p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <h2 className="wrap-break-word font-semibold text-primary-900">
                                {isCourse ? record.title : record.name}
                              </h2>
                              <p className="text-sm text-text-secondary">
                                {isCourse ? (
                                  record.category
                                ) : record.courses.id ? (
                                  <Link
                                    href={`${adminPaths.courses}/${record.courses.id}/edit`}
                                    className="underline"
                                  >
                                    {record.courses.title}
                                  </Link>
                                ) : (
                                  record.courses.title
                                )}
                              </p>
                            </div>
                            <Badge variant={catalogStatusVariant(record.status)}>
                              {catalogStatusLabels[record.status]}
                            </Badge>
                          </div>
                          <dl className="grid gap-3 text-sm sm:grid-cols-2">
                            <div>
                              <dt className="text-text-secondary">{catalogCopy.venue}</dt>
                              <dd>{record.venue}</dd>
                            </div>
                            {!isCourse && (
                              <>
                                <div>
                                  <dt className="text-text-secondary">{catalogCopy.dates}</dt>
                                  <dd>
                                    {dateFormatter.formatRange(
                                      new Date(record.start_date),
                                      new Date(record.end_date)
                                    )}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-text-secondary">{catalogCopy.capacity}</dt>
                                  <dd>{record.capacity ?? "Unlimited"}</dd>
                                </div>
                                <div>
                                  <dt className="text-text-secondary">{catalogCopy.listFee}</dt>
                                  <dd>{formatPoishaToBDT(record.fee_poisha)}</dd>
                                </div>
                                {record.discount_fee_poisha !== null && (
                                  <div>
                                    <dt className="text-text-secondary">
                                      {catalogCopy.discountedFee}
                                    </dt>
                                    <dd>{formatPoishaToBDT(record.discount_fee_poisha)}</dd>
                                  </div>
                                )}
                              </>
                            )}
                          </dl>
                          <div className="flex flex-wrap gap-2">
                            <CatalogCardPreview
                              preview={{
                                kind: isCourse ? "course" : "batch",
                                title: isCourse ? record.title : record.name,
                                subtitle: isCourse
                                  ? record.subtitle || catalogPreviewCopy.courseType
                                  : record.courses.title,
                                summary: isCourse ? record.summary : undefined,
                                details: isCourse
                                  ? record.description
                                  : record.schedule_description,
                                status: catalogStatusLabels[record.status],
                                statusVariant: catalogStatusVariant(record.status),
                                fields: [
                                  { label: catalogCopy.venue, value: record.venue },
                                  ...(isCourse
                                    ? [
                                        {
                                          label: catalogPreviewCopy.category,
                                          value: record.category,
                                        },
                                      ]
                                    : [
                                        {
                                          label: catalogCopy.dates,
                                          value: dateFormatter.formatRange(
                                            new Date(record.start_date),
                                            new Date(record.end_date)
                                          ),
                                        },
                                        {
                                          label: catalogCopy.capacity,
                                          value:
                                            record.capacity === null
                                              ? "Unlimited"
                                              : String(record.capacity),
                                        },
                                        {
                                          label: catalogCopy.listFee,
                                          value: formatPoishaToBDT(record.fee_poisha),
                                        },
                                        ...(record.discount_fee_poisha !== null
                                          ? [
                                              {
                                                label: catalogCopy.discountedFee,
                                                value: formatPoishaToBDT(
                                                  record.discount_fee_poisha
                                                ),
                                              },
                                            ]
                                          : []),
                                      ]),
                                ],
                              }}
                            />
                            {record.status !== "archived" && !record.archived_at && (
                              <Link href={`${path}/${record.id}/edit`} className={linkClassName}>
                                {editCatalogCopy[section].link}
                              </Link>
                            )}
                            {record.updated_at && (
                              <CatalogArchiveControl
                                key={record.updated_at}
                                id={record.id}
                                section={section}
                                title={isCourse ? record.title : record.name}
                                revision={record.updated_at}
                                archived={
                                  record.status === "archived" || Boolean(record.archived_at)
                                }
                              />
                            )}
                            {!isCourse && record.status !== "archived" && !record.archived_at && (
                              <Link
                                href={`${path}/${record.id}/edit#batch-mentors`}
                                className={linkClassName}
                              >
                                {adminMessage("mentors")}
                              </Link>
                            )}
                            <Link
                              className={linkClassName}
                              href={
                                isCourse
                                  ? adminCourseBatchesHref(record.id)
                                  : adminEnrollmentsHref({
                                      batchId: record.id,
                                      view: "students",
                                    })
                              }
                            >
                              {adminMessage(isCourse ? "viewBatches" : "viewStudents")}
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-xl border border-border-subtle bg-surface-card p-4 text-sm text-text-secondary">
                {copy.empty}
              </p>
            )}
            {(filters.page > 1 || result.hasNext) && (
              <nav
                aria-label={catalogCopy.pagination}
                className="flex flex-wrap items-center gap-3"
              >
                {filters.page > 1 && (
                  <Link href={pageHref(filters.page - 1)} className={linkClassName}>
                    {catalogCopy.previous}
                  </Link>
                )}
                <span className="text-sm text-text-secondary">
                  {catalogCopy.page} {filters.page}
                </span>
                {result.hasNext && (
                  <Link href={pageHref(filters.page + 1)} className={linkClassName}>
                    {catalogCopy.next}
                  </Link>
                )}
              </nav>
            )}
          </>
        )}
      </section>
    </AdminPortalShell>
  );
}
