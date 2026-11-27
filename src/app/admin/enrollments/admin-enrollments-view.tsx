"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Inbox,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  Archive,
} from "lucide-react";
import { AddStudentLink } from "@/components/admin/add-student-link";
import { RecordAvatar, RecordsHeader, recordTabClass } from "@/components/admin/records-header";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import {
  EnrollmentStatusBadge,
  PaymentStatusBadge,
} from "@/components/admin/enrollment-status-badge";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import { enrollmentActionCopy as copy, type AdmissionView } from "@/lib/admin-admissions";
import { catalogStatusLabels } from "@/lib/admin-catalog";
import {
  adminCourseBatchesHref,
  adminEnrollmentsHref,
  adminMessage as t,
  adminPaths,
} from "@/lib/admin-navigation";
import { formatPaymentMethodLabel } from "@/lib/enrollment/status";
import { formatPoishaToBDT } from "@/lib/money";
import type { VerifiedStaffContext } from "@/server/auth/require-staff";
import type { AdminEnrollmentListResult } from "@/server/enrollment/service";
import { EnrollmentRowActions } from "./enrollment-row-actions";

export interface AdminEnrollmentsViewProps {
  staff: VerifiedStaffContext;
  list: AdminEnrollmentListResult;
  currentSearch: string;
  currentStatus: string;
  view?: AdmissionView;
  courseId?: string;
  courses?: readonly { id: string; title: string }[];
  batches?: readonly { id: string; name: string; status: keyof typeof catalogStatusLabels }[];
  batch?: { id: string; name: string; courseId: string; courseTitle: string };
}

const enrollmentColumns =
  "@4xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1.12fr)_minmax(0,.85fr)_minmax(0,.95fr)_20rem]";
const views = [
  { key: "applications", icon: ClipboardList },
  { key: "students", icon: GraduationCap },
  { key: "archived", icon: Archive },
] as const;
const selectClassName =
  "min-h-11 w-full min-w-0 rounded-lg border border-border-default bg-surface-base px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-60";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "confirmed", label: "Confirmed" },
  { value: "pending", label: "Pending payment" },
  { value: "application_in_process", label: "In process" },
  { value: "review_hold", label: "Review hold" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

function formatDhakaTimestamp(iso: string): string {
  try {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(dt);
  } catch {
    return iso;
  }
}

function formatMoneyBdt(poisha: number): string {
  if (poisha === 0) return "Free";
  return formatPoishaToBDT(poisha).replace("৳", "BDT ");
}

export function AdminEnrollmentsView({
  staff,
  list,
  currentSearch,
  currentStatus,
  view = "applications",
  courseId,
  courses = [],
  batches = [],
  batch,
}: AdminEnrollmentsViewProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>(currentSearch);
  const [statusFilter, setStatusFilter] = useState<string>(currentStatus);

  useEffect(() => {
    setSearchQuery(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    setStatusFilter(currentStatus);
  }, [currentStatus]);

  const batchId = batch?.id;
  const isStudents = view === "students";
  const canAddStudent =
    batchId && batches.some((item) => item.id === batchId && item.status === "open_for_enrollment");
  const scope = { view, courseId, batchId };
  const resetHref = adminEnrollmentsHref(scope);
  const totalPages = Math.max(1, Math.ceil(list.totalCount / list.pageSize));
  const hasFilters = Boolean(currentSearch || currentStatus);
  let scopeDescription = hasFilters
    ? "No applications match your current search or status filter. Clear the filters to inspect all saved enrollments."
    : copy.noRecords;
  if (view === "archived") scopeDescription = copy.archivedViewDescription;
  else if (batchId)
    scopeDescription = t(hasFilters ? "noMatchingBatchEnrollments" : "noBatchEnrollments");
  else if (courseId)
    scopeDescription = t(hasFilters ? "noMatchingCourseEnrollments" : "noCourseEnrollments");
  const showResetControl = hasFilters || searchQuery !== "" || statusFilter !== "";
  const startIndex = list.totalCount === 0 ? 0 : (list.page - 1) * list.pageSize + 1;
  const endIndex = Math.min(list.totalCount, list.page * list.pageSize);

  const navigateWithFilters = (nextScope: typeof scope) => {
    router.push(
      adminEnrollmentsHref({ ...nextScope, search: searchQuery.trim(), status: statusFilter })
    );
  };

  const handleFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateWithFilters(scope);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    router.push(resetHref);
  };

  return (
    <AdminPortalShell staff={staff} currentPath={adminPaths.admissions}>
      <div className="@container mx-auto w-full max-w-7xl flex-1 space-y-4 px-4 py-5 sm:px-6 sm:py-6">
        <RecordsHeader
          icon={ClipboardList}
          title={t("admissions")}
          description={copy.description}
          action={
            view !== "archived" && (
              <AddStudentLink inverse batchId={canAddStudent ? batchId : undefined} />
            )
          }
        />
        <div className="flex flex-wrap items-center justify-between gap-x-6 border-b border-border-default px-0.5">
          <nav aria-label={t("admissionViews")} className="flex flex-wrap gap-x-3 sm:gap-x-6">
            {views.map(({ key, icon: Icon }) => (
              <Link
                key={key}
                aria-current={view === key ? "page" : undefined}
                href={adminEnrollmentsHref({ ...scope, view: key, search: currentSearch })}
                className={recordTabClass}
              >
                <Icon aria-hidden="true" className="hidden size-4 sm:block" />
                {t(key)}
              </Link>
            ))}
          </nav>
          <p
            className="py-2 text-xs font-medium tabular-nums text-text-secondary sm:text-sm"
            aria-live="polite"
          >
            {copy.recordCount(list.totalCount)}
          </p>
        </div>
        {batch && (
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-xl border border-border-subtle bg-surface-card px-4 py-3">
            <p className="font-semibold text-primary-900">
              {batch.courseTitle} / {batch.name}
            </p>
            <div className="flex flex-wrap gap-x-4 text-sm">
              <Link
                href={adminCourseBatchesHref(batch.courseId)}
                className="inline-flex min-h-11 items-center text-primary-900 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                {t("backToBatches")}
              </Link>
              <Link
                href={adminEnrollmentsHref({ view })}
                className="inline-flex min-h-11 items-center text-primary-900 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                {t(isStudents ? "allStudents" : "allEnrollments")}
              </Link>
            </div>
          </div>
        )}

        {/* Search and Filter Bar */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <form
              method="GET"
              action={adminPaths.admissions}
              onSubmit={handleFilterSubmit}
              className={`grid grid-cols-2 items-end gap-2.5 sm:grid-cols-12 ${
                isStudents
                  ? "@5xl:grid-cols-[minmax(11rem,1.45fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_auto]"
                  : "@5xl:grid-cols-[minmax(11rem,1.45fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_minmax(8rem,.8fr)_auto]"
              }`}
            >
              {view !== "applications" && <input type="hidden" name="view" value={view} />}
              <div
                className={
                  isStudents
                    ? "order-first col-span-2 space-y-1.5 sm:col-span-8 @5xl:col-span-1"
                    : "order-first col-span-2 space-y-1.5 sm:col-span-12 lg:col-span-5 @5xl:col-span-1"
                }
              >
                <label
                  htmlFor="admin-enrollment-search"
                  className="block text-xs sm:text-sm font-semibold text-primary-900"
                >
                  {isStudents ? t("searchStudents") : copy.searchApplications}
                </label>
                <div className="relative">
                  <Search
                    className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="admin-enrollment-search"
                    name="q"
                    type="search"
                    maxLength={80}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={copy.searchPlaceholder}
                    className="flex h-11 w-full rounded-lg border border-border-default bg-surface-base pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 focus-visible:border-primary-600"
                  />
                </div>
              </div>

              <div className="min-w-0 space-y-1.5 sm:col-span-6 @5xl:col-span-1">
                <label
                  htmlFor="admissions-course"
                  className="block text-sm font-semibold text-primary-900"
                >
                  {t("filterCourse")}
                </label>
                <select
                  id="admissions-course"
                  name="courseId"
                  className={selectClassName}
                  value={courseId ?? ""}
                  onChange={(event) =>
                    navigateWithFilters({
                      view,
                      courseId: event.target.value || undefined,
                      batchId: undefined,
                    })
                  }
                >
                  <option value="">{t("allCourses")}</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 space-y-1.5 sm:col-span-6 @5xl:col-span-1">
                <label
                  htmlFor="admissions-batch"
                  className="block text-sm font-semibold text-primary-900"
                >
                  {t("filterBatch")}
                </label>
                <select
                  id="admissions-batch"
                  name="batchId"
                  className={selectClassName}
                  disabled={!courseId}
                  value={batchId ?? ""}
                  onChange={(event) =>
                    navigateWithFilters({ ...scope, batchId: event.target.value || undefined })
                  }
                >
                  <option value="">{courseId ? t("allBatches") : copy.batchDisabled}</option>
                  {batches.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({catalogStatusLabels[item.status]})
                    </option>
                  ))}
                </select>
              </div>

              {!isStudents && (
                <div className="sm:col-span-6 lg:col-span-3 space-y-1.5 @5xl:col-span-1">
                  <label
                    htmlFor="admin-enrollment-status"
                    className="block text-xs sm:text-sm font-semibold text-primary-900"
                  >
                    {copy.statusFilter}
                  </label>
                  <select
                    id="admin-enrollment-status"
                    name="status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="flex h-11 w-full rounded-lg border border-border-default bg-surface-base px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 focus-visible:border-primary-600"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value || "all"} value={opt.value}>
                        {!opt.value && view === "applications" && !searchQuery.trim()
                          ? copy.currentRecords
                          : opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div
                className={
                  isStudents
                    ? "sm:col-span-4 flex flex-wrap items-center gap-2 @5xl:col-span-1"
                    : "sm:col-span-6 lg:col-span-4 flex flex-wrap items-center gap-2 @5xl:col-span-1"
                }
              >
                <Button type="submit" variant="primary" size="md" className="min-h-[44px] flex-1">
                  <Filter className="w-4 h-4" aria-hidden="true" />
                  <span>{copy.filter}</span>
                </Button>
                {showResetControl && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border border-border-default text-xs sm:text-sm font-semibold text-primary-900 hover:bg-primary-50 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                  >
                    {copy.reset}
                  </button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Empty State */}
        {list.items.length === 0 ? (
          <Card data-testid="admin-enrollments-empty">
            <CardContent className="py-12 px-6 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-subtle text-primary-800">
                <Inbox className="w-6 h-6" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-bold text-primary-900">
                {isStudents
                  ? t("noStudents")
                  : view === "archived"
                    ? hasFilters
                      ? copy.archivedFilteredEmpty
                      : copy.archivedEmpty
                    : hasFilters
                      ? "No matching enrollment records"
                      : "No enrollment records yet"}
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto">
                {isStudents
                  ? t(hasFilters ? "noStudentsMatch" : "noStudentsInScope")
                  : scopeDescription}
              </p>
              {hasFilters && (
                <div className="pt-2">
                  <Link
                    href={resetHref}
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("");
                    }}
                    className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-lg bg-primary-800 text-text-inverse text-xs sm:text-sm font-semibold hover:bg-primary-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                  >
                    {batchId || courseId ? t("clearBatchFilters") : "Clear search & filters"}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-border-default bg-surface-card shadow-xs">
              <div
                aria-hidden="true"
                className={`hidden gap-3 border-b border-border-default bg-primary-50 px-4 py-3 text-xs font-semibold text-primary-700 @4xl:grid ${enrollmentColumns}`}
              >
                <span>{isStudents ? t("student") : copy.applicant}</span>
                <span>{copy.program}</span>
                <span>{copy.statusLabel}</span>
                <span>{copy.payment}</span>
                <span className="text-right">{copy.actions}</span>
              </div>
              <ul aria-label={copy.listCaption} className="divide-y divide-border-subtle">
                {list.items.map((item) => (
                  <li
                    key={item.id}
                    className={`grid grid-cols-2 items-start gap-x-3 gap-y-3 px-4 py-4 text-sm hover:bg-surface-subtle/60 @4xl:items-center ${enrollmentColumns}`}
                  >
                    <div className="col-span-2 flex min-w-0 items-start gap-2.5 @4xl:col-span-1">
                      <RecordAvatar name={item.fullName} />
                      <div className="min-w-0 space-y-0.5">
                        <Link
                          href={`${adminPaths.admissions}/${encodeURIComponent(item.id)}`}
                          aria-label={copy.viewDetails(item.publicRef, item.fullName)}
                          className="block w-fit max-w-full break-words rounded font-semibold text-primary-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                        >
                          {item.fullName}
                        </Link>
                        <p className="break-words text-xs text-text-secondary">{item.email}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-text-secondary">
                          <span>{item.phone}</span>
                          <span className="font-mono font-semibold text-primary-800">
                            {item.publicRef}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 min-w-0 @4xl:col-span-1">
                      <p className="mb-1 text-xs font-semibold text-text-secondary @4xl:hidden">
                        {copy.program}
                      </p>
                      <p className="break-words font-medium leading-snug text-text-primary">
                        {item.courseTitle}
                      </p>
                      <p className="break-words text-xs text-text-secondary">{item.batchName}</p>
                      <time
                        dateTime={item.createdAt}
                        className="block pt-0.5 text-[11px] text-text-secondary"
                      >
                        {formatDhakaTimestamp(item.createdAt)}
                      </time>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center gap-1 self-start @4xl:self-center">
                      <p className="mb-0.5 w-full text-xs font-semibold text-text-secondary @4xl:hidden">
                        {copy.statusLabel}
                      </p>
                      <EnrollmentStatusBadge status={item.status} />
                      {item.legacyDuplicatePhone && (
                        <Badge variant="warning" size="sm">
                          {copy.legacyDuplicatePhone}
                        </Badge>
                      )}
                      {item.isDevFixture && (
                        <Badge variant="outline" size="sm">
                          {copy.devFixture}
                        </Badge>
                      )}
                    </div>
                    <div className="min-w-0 self-start @4xl:self-center">
                      <p className="mb-1 text-xs font-semibold text-text-secondary @4xl:hidden">
                        {copy.payment}
                      </p>
                      <p className="font-semibold tabular-nums text-primary-900">
                        {formatMoneyBdt(item.payablePoisha)}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 pt-0.5 text-xs text-text-secondary">
                        <span>{formatPaymentMethodLabel(item.paymentMethod)}</span>
                        <PaymentStatusBadge status={item.paymentStatus} />
                      </div>
                    </div>
                    <div className="col-span-2 flex justify-end border-t border-border-subtle pt-2 @4xl:col-span-1 @4xl:border-0 @4xl:pt-0">
                      <EnrollmentRowActions item={item} allowPurge={staff.role === "super_admin"} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs sm:text-sm text-text-secondary">
                <p>{copy.recordRange(startIndex, endIndex, list.totalCount)}</p>
                <nav aria-label="Enrollments pagination" className="flex items-center gap-2">
                  {list.page > 1 ? (
                    <Link
                      href={adminEnrollmentsHref({
                        ...scope,
                        search: currentSearch,
                        status: currentStatus,
                        page: list.page - 1,
                      })}
                      className="inline-flex items-center gap-1 min-h-[44px] px-3.5 rounded-lg border border-border-default bg-surface-card text-primary-900 font-semibold hover:bg-surface-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                    >
                      <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                      <span>Previous</span>
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="inline-flex items-center gap-1 min-h-[44px] px-3.5 rounded-lg border border-border-default bg-surface-subtle text-text-secondary font-medium cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                      <span>Previous</span>
                    </span>
                  )}

                  <span className="px-2 font-medium text-primary-900">
                    Page {list.page} of {totalPages}
                  </span>

                  {list.page < totalPages ? (
                    <Link
                      href={adminEnrollmentsHref({
                        ...scope,
                        search: currentSearch,
                        status: currentStatus,
                        page: list.page + 1,
                      })}
                      className="inline-flex items-center gap-1 min-h-[44px] px-3.5 rounded-lg border border-border-default bg-surface-card text-primary-900 font-semibold hover:bg-surface-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="inline-flex items-center gap-1 min-h-[44px] px-3.5 rounded-lg border border-border-default bg-surface-subtle text-text-secondary font-medium cursor-not-allowed"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </span>
                  )}
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </AdminPortalShell>
  );
}
