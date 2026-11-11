"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Filter, Inbox, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { AdminPortalHeader } from "@/components/admin/admin-portal-header";
import {
  EnrollmentStatusBadge,
  PaymentStatusBadge,
} from "@/components/admin/enrollment-status-badge";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import { formatPaymentMethodLabel } from "@/lib/enrollment/status";
import { formatPoishaToBDT } from "@/lib/money";
import type { VerifiedStaffContext } from "@/server/auth/require-staff";
import type { AdminEnrollmentListResult } from "@/server/enrollment/service";

export interface AdminEnrollmentsViewProps {
  staff: VerifiedStaffContext;
  list: AdminEnrollmentListResult;
  currentSearch: string;
  currentStatus: string;
}

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

function buildFilterHref(search: string, status: string, page: number): string {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/admin/enrollments?${qs}` : "/admin/enrollments";
}

export function AdminEnrollmentsView({
  staff,
  list,
  currentSearch,
  currentStatus,
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

  const totalPages = Math.max(1, Math.ceil(list.totalCount / list.pageSize));
  const hasFilters = Boolean(currentSearch || currentStatus);
  const showResetControl = hasFilters || searchQuery !== "" || statusFilter !== "";
  const startIndex = list.totalCount === 0 ? 0 : (list.page - 1) * list.pageSize + 1;
  const endIndex = Math.min(list.totalCount, list.page * list.pageSize);

  const handleFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(buildFilterHref(searchQuery.trim(), statusFilter, 1));
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    router.push("/admin/enrollments");
  };

  return (
    <div className="min-h-screen bg-surface-base text-text-primary flex flex-col">
      <AdminPortalHeader staff={staff} />

      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 flex-1">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary-900 tracking-tight">
              Enrollments
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary">
              Read-only view of course applications, seat reservations, bKash payment states, and
              confirmation email status.
            </p>
          </div>
          <div className="text-xs sm:text-sm font-medium text-text-secondary">
            Total matching records:{" "}
            <span className="font-bold text-primary-900">{list.totalCount}</span>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <form
              method="GET"
              action="/admin/enrollments"
              onSubmit={handleFilterSubmit}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
            >
              <div className="sm:col-span-12 lg:col-span-5 space-y-1.5">
                <label
                  htmlFor="admin-enrollment-search"
                  className="block text-xs sm:text-sm font-semibold text-primary-900"
                >
                  Search applications
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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="LNA ID, name, email, or phone..."
                    className="flex h-11 w-full rounded-lg border border-[#73939C] bg-surface-base pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 focus-visible:border-primary-600"
                  />
                </div>
              </div>

              <div className="sm:col-span-6 lg:col-span-3 space-y-1.5">
                <label
                  htmlFor="admin-enrollment-status"
                  className="block text-xs sm:text-sm font-semibold text-primary-900"
                >
                  Status filter
                </label>
                <select
                  id="admin-enrollment-status"
                  name="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-[#73939C] bg-surface-base px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 focus-visible:border-primary-600"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value || "all"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-6 lg:col-span-4 flex flex-wrap items-center gap-2">
                <Button type="submit" variant="primary" size="md" className="min-h-[44px] flex-1">
                  <Filter className="w-4 h-4" aria-hidden="true" />
                  <span>Filter</span>
                </Button>
                {showResetControl && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border border-[#73939C] text-xs sm:text-sm font-semibold text-primary-900 hover:bg-surface-muted transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                  >
                    Reset
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
                {hasFilters ? "No matching enrollment records" : "No enrollment records yet"}
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto">
                {hasFilters
                  ? "No applications match your current search or status filter. Clear the filters to inspect all saved enrollments."
                  : "Submitted applications and bKash checkout holds will appear here once enrollment is active."}
              </p>
              {hasFilters && (
                <div className="pt-2">
                  <Link
                    href="/admin/enrollments"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("");
                    }}
                    className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-lg bg-primary-800 text-text-inverse text-xs sm:text-sm font-semibold hover:bg-primary-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                  >
                    Clear search & filters
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop Table */}
            <Card className="hidden lg:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <caption className="sr-only">
                    Lead Nation Academy enrollment applications list
                  </caption>
                  <thead>
                    <tr className="border-b border-border-subtle bg-surface-subtle text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      <th scope="col" className="py-3.5 px-4">
                        Application ID
                      </th>
                      <th scope="col" className="py-3.5 px-4">
                        Applicant
                      </th>
                      <th scope="col" className="py-3.5 px-4">
                        Program & Batch
                      </th>
                      <th scope="col" className="py-3.5 px-4">
                        Status
                      </th>
                      <th scope="col" className="py-3.5 px-4">
                        Payment
                      </th>
                      <th scope="col" className="py-3.5 px-4">
                        Submitted
                      </th>
                      <th scope="col" className="py-3.5 px-4 text-right">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle text-sm">
                    {list.items.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-surface-subtle/60 transition-colors align-top"
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col items-start gap-1">
                            <Link
                              href={`/admin/enrollments/${encodeURIComponent(item.id)}`}
                              className="font-mono font-bold text-xs sm:text-sm text-primary-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 rounded"
                            >
                              {item.publicRef}
                            </Link>
                            {item.isDevFixture && (
                              <Badge variant="outline" size="sm">
                                Dev fixture
                              </Badge>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 min-w-[200px]">
                          <div className="font-semibold text-primary-900">{item.fullName}</div>
                          <div className="text-xs text-text-secondary break-all">{item.email}</div>
                          <div className="text-xs text-text-secondary">{item.phone}</div>
                        </td>

                        <td className="py-3.5 px-4 min-w-[200px]">
                          <div className="font-semibold text-text-primary">{item.courseTitle}</div>
                          <div className="text-xs text-text-secondary">{item.batchName}</div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <EnrollmentStatusBadge status={item.status} />
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-semibold text-primary-900">
                              {formatMoneyBdt(item.payablePoisha)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-text-secondary">
                                {formatPaymentMethodLabel(item.paymentMethod)}
                              </span>
                              <PaymentStatusBadge status={item.paymentStatus} />
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-text-secondary">
                          {formatDhakaTimestamp(item.createdAt)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <Link
                            href={`/admin/enrollments/${encodeURIComponent(item.id)}`}
                            aria-label={`View details for ${item.publicRef} (${item.fullName})`}
                            className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-lg border border-[#73939C] text-xs font-semibold text-primary-900 hover:bg-surface-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                          >
                            <Eye className="w-3.5 h-3.5 text-primary-800" aria-hidden="true" />
                            <span>View</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile & Tablet Stacked Cards */}
            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3">
              {list.items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono font-bold text-sm text-primary-800">
                        {item.publicRef}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {item.isDevFixture && (
                          <Badge variant="outline" size="sm">
                            Dev fixture
                          </Badge>
                        )}
                        <EnrollmentStatusBadge status={item.status} />
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold text-sm text-primary-900">{item.fullName}</div>
                      <div className="text-xs text-text-secondary break-all">{item.email}</div>
                      <div className="text-xs text-text-secondary">{item.phone}</div>
                    </div>

                    <div className="text-xs text-text-secondary border-t border-border-subtle pt-2.5 space-y-1">
                      <div className="font-semibold text-text-primary">{item.courseTitle}</div>
                      <div>{item.batchName}</div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span className="font-semibold text-primary-900">
                          {formatMoneyBdt(item.payablePoisha)} (
                          {formatPaymentMethodLabel(item.paymentMethod)})
                        </span>
                        <PaymentStatusBadge status={item.paymentStatus} />
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-text-secondary">
                        {formatDhakaTimestamp(item.createdAt)}
                      </span>
                      <Link
                        href={`/admin/enrollments/${encodeURIComponent(item.id)}`}
                        aria-label={`View details for ${item.publicRef} (${item.fullName})`}
                        className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-lg bg-primary-800 text-text-inverse text-xs font-semibold hover:bg-primary-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>View details</span>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs sm:text-sm text-text-secondary">
              <div>
                Showing <span className="font-semibold text-primary-900">{startIndex}</span> to{" "}
                <span className="font-semibold text-primary-900">{endIndex}</span> of{" "}
                <span className="font-semibold text-primary-900">{list.totalCount}</span> records
              </div>

              {totalPages > 1 && (
                <nav aria-label="Enrollments pagination" className="flex items-center gap-2">
                  {list.page > 1 ? (
                    <Link
                      href={buildFilterHref(currentSearch, currentStatus, list.page - 1)}
                      className="inline-flex items-center gap-1 min-h-[44px] px-3.5 rounded-lg border border-[#73939C] bg-surface-card text-primary-900 font-semibold hover:bg-surface-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                    >
                      <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                      <span>Previous</span>
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="inline-flex items-center gap-1 min-h-[44px] px-3.5 rounded-lg border border-[#94B0B8] bg-[#E2ECEF] text-[#3B555E] font-medium cursor-not-allowed"
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
                      href={buildFilterHref(currentSearch, currentStatus, list.page + 1)}
                      className="inline-flex items-center gap-1 min-h-[44px] px-3.5 rounded-lg border border-[#73939C] bg-surface-card text-primary-900 font-semibold hover:bg-surface-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="inline-flex items-center gap-1 min-h-[44px] px-3.5 rounded-lg border border-[#94B0B8] bg-[#E2ECEF] text-[#3B555E] font-medium cursor-not-allowed"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </span>
                  )}
                </nav>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
