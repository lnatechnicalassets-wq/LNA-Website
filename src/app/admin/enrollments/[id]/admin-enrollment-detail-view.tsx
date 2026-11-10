"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Mail, CreditCard, Activity, FileText } from "lucide-react";
import { AdminPortalHeader } from "@/components/admin/admin-portal-header";
import {
  EnrollmentStatusBadge,
  PaymentStatusBadge,
} from "@/components/admin/enrollment-status-badge";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatPaymentMethodLabel } from "@/lib/enrollment/status";
import { formatPoishaToBDT } from "@/lib/money";
import type { VerifiedStaffContext } from "@/server/auth/require-staff";
import type { AdminEnrollmentDetailResult } from "@/server/enrollment/service";

export interface AdminEnrollmentDetailViewProps {
  staff: VerifiedStaffContext;
  detail: AdminEnrollmentDetailResult;
}

function formatDhakaTimestamp(iso: string | null): string {
  if (!iso) return "—";
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
      second: "2-digit",
    }).format(dt);
  } catch {
    return iso;
  }
}

function formatMoneyBdt(poisha: number): string {
  return formatPoishaToBDT(poisha).replace("৳", "BDT ");
}

export function AdminEnrollmentDetailView({ staff, detail }: AdminEnrollmentDetailViewProps) {
  const questionLabelById = new Map<string, string>();
  for (const q of detail.programQuestionsSnapshot) {
    questionLabelById.set(q.id, q.label);
  }
  const answerEntries = Object.entries(detail.answers);

  return (
    <div className="min-h-screen bg-surface-base text-text-primary flex flex-col">
      <AdminPortalHeader staff={staff} />

      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 flex-1">
        <div>
          <Link
            href="/admin/enrollments"
            className="inline-flex items-center gap-1.5 min-h-[44px] text-xs sm:text-sm font-semibold text-primary-800 hover:underline focus-visible:outline-2 focus-visible:outline-primary-600 rounded"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to enrollments</span>
          </Link>
        </div>

        {/* Summary Header Card */}
        <Card>
          <CardContent className="p-5 sm:p-6 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-mono text-2xl sm:text-3xl font-bold text-primary-900 tracking-tight">
                  {detail.publicRef}
                </h1>
                <EnrollmentStatusBadge status={detail.status} />
                <PaymentStatusBadge status={detail.paymentStatus} />
                {detail.isDevFixture && (
                  <Badge variant="outline" size="sm">
                    {detail.fixtureLabel ? `Dev fixture (${detail.fixtureLabel})` : "Dev fixture"}
                  </Badge>
                )}
              </div>
              <p className="text-sm font-semibold text-text-primary">
                {detail.courseTitle} — {detail.batchName}
              </p>
              <p className="text-xs text-text-secondary">
                {detail.batchStartDate ? `Starts ${detail.batchStartDate}` : "Schedule TBD"}
                {detail.batchVenue ? ` | Venue: ${detail.batchVenue}` : ""}
              </p>
            </div>

            <div className="text-xs text-text-secondary space-y-1 sm:text-right">
              <div>
                Created:{" "}
                <span className="font-medium text-text-primary">
                  {formatDhakaTimestamp(detail.createdAt)}
                </span>
              </div>
              <div>
                Hold expires:{" "}
                <span className="font-medium text-text-primary">
                  {formatDhakaTimestamp(detail.holdExpiresAt)}
                </span>
              </div>
              <div>
                Confirmed:{" "}
                <span className="font-medium text-text-primary">
                  {formatDhakaTimestamp(detail.confirmedAt)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Identity + Money Snapshot */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FileText className="w-4 h-4 text-primary-800" aria-hidden="true" />
                <span>Applicant & Program Responses</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="divide-y divide-border-subtle text-xs sm:text-sm">
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-text-secondary">Full name</dt>
                  <dd className="font-semibold text-primary-900 text-right">{detail.fullName}</dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-text-secondary">Email</dt>
                  <dd className="font-semibold text-primary-900 text-right break-all">
                    {detail.email}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-text-secondary">Phone / WhatsApp</dt>
                  <dd className="font-semibold text-primary-900 text-right">{detail.phone}</dd>
                </div>
                {answerEntries.map(([key, val]) => (
                  <div key={key} className="py-2.5 flex justify-between gap-4">
                    <dt className="text-text-secondary">{questionLabelById.get(key) ?? key}</dt>
                    <dd className="font-medium text-text-primary text-right break-words max-w-xs">
                      {val || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
              {detail.verificationNotes && (
                <div className="p-3 rounded-lg bg-surface-subtle border border-border-subtle text-xs text-text-secondary">
                  <span className="font-semibold text-primary-900">Notes: </span>
                  {detail.verificationNotes}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CreditCard className="w-4 h-4 text-primary-800" aria-hidden="true" />
                <span>Server Pricing Snapshot</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border-subtle text-xs sm:text-sm">
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-text-secondary">Payment method</dt>
                  <dd className="font-semibold text-primary-900 text-right">
                    {formatPaymentMethodLabel(detail.paymentMethod)}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-text-secondary">Currency</dt>
                  <dd className="font-semibold text-primary-900 text-right">{detail.currency}</dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-text-secondary">Base fee</dt>
                  <dd className="font-semibold text-text-primary text-right">
                    {formatMoneyBdt(detail.baseFeePoisha)}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-text-secondary">Discount applied</dt>
                  <dd className="font-semibold text-text-primary text-right">
                    {formatMoneyBdt(detail.discountAmountPoisha)}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="font-semibold text-primary-900">Final payable amount</dt>
                  <dd className="font-bold text-primary-800 text-base text-right">
                    {detail.payablePoisha === 0 ? "Free" : formatMoneyBdt(detail.payablePoisha)}
                  </dd>
                </div>
                {detail.submittedPaymentRef && (
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-text-secondary">Submitted reference</dt>
                    <dd className="font-mono text-text-primary text-right">
                      {detail.submittedPaymentRef}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* bKash Payment Attempts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CreditCard className="w-4 h-4 text-primary-800" aria-hidden="true" />
              <span>Payment Attempts ({detail.paymentAttempts.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {detail.paymentAttempts.length === 0 ? (
              <p className="text-xs sm:text-sm text-text-secondary">
                No bKash gateway attempts recorded (free enrollment or initiated prior to payment).
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      <th scope="col" className="py-2.5 pr-4">
                        Invoice (tran_id)
                      </th>
                      <th scope="col" className="py-2.5 pr-4">
                        bKash Payment ID
                      </th>
                      <th scope="col" className="py-2.5 pr-4">
                        bKash trxID
                      </th>
                      <th scope="col" className="py-2.5 pr-4">
                        Status
                      </th>
                      <th scope="col" className="py-2.5 pr-4">
                        Expected / Validated
                      </th>
                      <th scope="col" className="py-2.5 pr-4">
                        Gateway Code
                      </th>
                      <th scope="col" className="py-2.5">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {detail.paymentAttempts.map((a) => (
                      <tr key={a.id} className="align-top">
                        <td className="py-3 pr-4 font-mono text-xs text-primary-900">{a.tranId}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-text-secondary">
                          {a.paymentId ?? "—"}
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs font-semibold text-primary-800">
                          {a.trxId ?? "—"}
                        </td>
                        <td className="py-3 pr-4">
                          <PaymentStatusBadge status={a.status} />
                          {a.failureReason && (
                            <div className="text-[11px] text-status-danger-text mt-1">
                              {a.failureReason}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap text-xs">
                          <div>{formatMoneyBdt(a.amountPoisha)}</div>
                          {a.validatedAmountPoisha !== null && (
                            <div className="text-text-secondary">
                              Verified: {formatMoneyBdt(a.validatedAmountPoisha)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-xs text-text-secondary">
                          {a.gatewayStatusCode ?? "—"}
                          {a.gatewayStatusMessage ? ` (${a.gatewayStatusMessage})` : ""}
                        </td>
                        <td className="py-3 whitespace-nowrap text-xs text-text-secondary">
                          {formatDhakaTimestamp(a.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Redacted Payment Events Timeline + Email Outbox */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Activity className="w-4 h-4 text-primary-800" aria-hidden="true" />
                <span>Redacted Gateway Events ({detail.paymentEvents.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {detail.paymentEvents.length === 0 ? (
                <p className="text-xs sm:text-sm text-text-secondary">
                  No gateway callback or verification events recorded yet.
                </p>
              ) : (
                detail.paymentEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-xl bg-surface-subtle border border-border-subtle space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="primary" size="sm">
                          {ev.source}
                        </Badge>
                        {ev.eventStatus && (
                          <span className="font-semibold text-primary-900">{ev.eventStatus}</span>
                        )}
                      </div>
                      <span className="text-text-muted">{formatDhakaTimestamp(ev.receivedAt)}</span>
                    </div>
                    <pre className="text-[11px] font-mono text-text-secondary bg-surface-card border border-border-subtle rounded-lg p-2.5 overflow-x-auto">
                      {JSON.stringify(ev.redactedPayload, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Mail className="w-4 h-4 text-primary-800" aria-hidden="true" />
                <span>Confirmation Email Outbox ({detail.emailOutbox.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {detail.emailOutbox.length === 0 ? (
                <p className="text-xs sm:text-sm text-text-secondary">
                  No confirmation email queued yet. Emails queue automatically upon confirmed
                  enrollment.
                </p>
              ) : (
                detail.emailOutbox.map((em) => (
                  <div
                    key={em.id}
                    className="p-3.5 rounded-xl bg-surface-subtle border border-border-subtle space-y-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-primary-900">{em.template}</span>
                      <Badge
                        variant={
                          em.status === "sent"
                            ? "success"
                            : em.status === "failed"
                              ? "danger"
                              : "warning"
                        }
                        size="sm"
                      >
                        {em.status}
                      </Badge>
                    </div>
                    <div className="text-text-secondary break-all">
                      Recipient: <span className="text-text-primary">{em.recipientEmail}</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 text-text-muted">
                      <span>Retries: {em.retryCount}</span>
                      <span>
                        {em.sentAt
                          ? `Sent ${formatDhakaTimestamp(em.sentAt)}`
                          : `Queued ${formatDhakaTimestamp(em.createdAt)}`}
                      </span>
                    </div>
                    {em.providerMessageId && (
                      <div className="font-mono text-[11px] text-text-secondary break-all">
                        Provider ID: {em.providerMessageId}
                      </div>
                    )}
                    {em.lastError && (
                      <div className="text-status-danger-text font-medium">{em.lastError}</div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
