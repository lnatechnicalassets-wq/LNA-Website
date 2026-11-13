import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import {
  catalogCopy,
  catalogSection,
  catalogStatuses,
  catalogStatusLabels,
  parseCatalogFilters,
} from "@/lib/admin-catalog";
import { createCatalogCopy, editCatalogCopy } from "@/lib/admin-catalog-edit";
import { adminMessage, adminPaths } from "@/lib/admin-navigation";
import { AppError } from "@/lib/errors";
import { formatPoishaToBDT } from "@/lib/money";
import { listAdminCatalog } from "@/server/admin/catalog";
import { requireStaff } from "@/server/auth/require-staff";

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

  const staff = await requireStaff("enrollments:read").catch((error: unknown) => {
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
  const filters = parseCatalogFilters(section, queryParams);

  const result = await listAdminCatalog(section, filters).catch((error: unknown) => {
    if (error instanceof AppError && error.code === "ADMIN_CATALOG_UNAVAILABLE") return null;
    throw error;
  });

  function pageHref(page: number) {
    const query = new URLSearchParams();
    if (filters.q) query.set("q", filters.q);
    if (filters.status) query.set("status", filters.status);
    if (page > 1) query.set("page", String(page));
    const suffix = query.toString();
    return suffix ? `${path}?${suffix}` : path;
  }

  return (
    <AdminPortalShell staff={staff} currentPath={path}>
      <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-primary-900 sm:text-3xl">
              {adminMessage(section)}
            </h1>
            <p className="text-sm text-text-secondary">{copy.description}</p>
          </div>
          <Link href={`${path}/new`} className={linkClassName}>
            {createCatalogCopy[section].link}
          </Link>
        </header>
        {(queryParams.saved === "1" || queryParams.created === "1") && (
          <p
            role="status"
            className="rounded-xl border border-status-success-border bg-status-success-bg p-4 text-sm text-status-success-text"
          >
            {queryParams.created === "1" ? createCatalogCopy[section].saved : editCatalogCopy.saved}
          </p>
        )}

        <form
          key={JSON.stringify([filters.q, filters.status])}
          action={path}
          method="get"
          className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-card p-4 sm:flex-row sm:flex-wrap sm:items-end"
        >
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
              <Link href={path} className={linkClassName}>
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
                      <Card className="h-full">
                        <CardContent className="space-y-4 p-5">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <h2 className="wrap-break-word font-semibold text-primary-900">
                                {isCourse ? record.title : record.name}
                              </h2>
                              <p className="text-sm text-text-secondary">
                                {isCourse ? record.category : record.courses.title}
                              </p>
                            </div>
                            <Badge variant="outline">{catalogStatusLabels[record.status]}</Badge>
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
                                  <dd>{record.capacity}</dd>
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
                          {record.status !== "archived" && (
                            <Link href={`${path}/${record.id}/edit`} className={linkClassName}>
                              {editCatalogCopy[section].link}
                            </Link>
                          )}
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
