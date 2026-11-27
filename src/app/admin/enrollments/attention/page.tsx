import React from "react";
import Link from "next/link";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { adminPaths } from "@/lib/admin-navigation";
import { formatPoishaToBDT } from "@/lib/money";
import {
  attentionLabels,
  attentionListSchema,
  attentionQuerySchema,
  paymentAttentionPageSize,
  paymentAttentionPath,
} from "@/lib/payment-attention";
import { requireAdminPage } from "@/server/admin/page-auth";
import { createSupabaseAdminClient } from "@/server/supabase/clients";
import { PaymentAttentionForm } from "./payment-attention-form";

export const dynamic = "force-dynamic";

export default async function PaymentAttentionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requireAdminPage("enrollments:read");
  const query = attentionQuerySchema.parse(await searchParams);
  const reviewed = query.reviewed === "1";
  const { data, error } = await createSupabaseAdminClient().rpc("list_staff_payment_attention", {
    p_actor_id: staff.userId,
    p_reviewed: reviewed,
    p_page: query.page,
  });
  const list = attentionListSchema.safeParse(data);
  const href = (page: number) =>
    `${paymentAttentionPath}?${new URLSearchParams({ page: String(page), ...(reviewed ? { reviewed: "1" } : {}) })}`;
  return (
    <AdminPortalShell staff={staff} currentPath={adminPaths.admissions}>
      <section className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 sm:px-6">
        <Link
          href={adminPaths.admissions}
          className="text-sm font-semibold text-primary-900 underline"
        >
          Back to Admissions
        </Link>
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-primary-900">Needs Attention</h1>
          <p className="text-sm text-text-secondary">
            Review uncertain payments, late receipts and manual verification. Do not request another
            payment until the previous one is resolved.
          </p>
        </header>
        <nav
          aria-label="Payment exception views"
          className="flex gap-4 border-b border-border-subtle pb-3 text-sm font-semibold"
        >
          <Link
            href={paymentAttentionPath}
            aria-current={!reviewed ? "page" : undefined}
            className="text-primary-900 underline"
          >
            Needs attention
          </Link>
          <Link
            href={`${paymentAttentionPath}?reviewed=1`}
            aria-current={reviewed ? "page" : undefined}
            className="text-primary-900 underline"
          >
            Reviewed with note
          </Link>
        </nav>
        {error || !list.success ? (
          <p role="alert" className="text-sm text-status-danger-text">
            Payment exceptions could not be loaded. Verify database setup and try again.
          </p>
        ) : (
          <>
            <p className="text-sm text-text-secondary">{list.data.total} payment exceptions</p>
            {list.data.items.length === 0 && (
              <p className="rounded-lg border border-border-subtle p-4 text-sm">
                No records on this page.
              </p>
            )}
            {list.data.items.map((item) => (
              <article
                key={item.attempt_id ?? item.enrollment_id}
                className="space-y-3 rounded-xl border border-border-subtle bg-surface-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-primary-900">
                      {attentionLabels[item.kind]}
                      {item.test_record ? " (Test record)" : ""}
                    </h2>
                    <p className="text-sm">
                      {item.full_name} · {item.public_ref}
                    </p>
                  </div>
                  <Link
                    href={`${adminPaths.admissions}/${item.enrollment_id}`}
                    className="text-sm font-semibold text-primary-900 underline"
                  >
                    View admission
                  </Link>
                </div>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-text-secondary">Admission status</dt>
                    <dd>{item.enrollment_status.replaceAll("_", " ")}</dd>
                  </div>
                  <div>
                    <dt className="text-text-secondary">Expected amount</dt>
                    <dd>{formatPoishaToBDT(item.amount_poisha)}</dd>
                  </div>
                  {item.attempt_status && (
                    <div>
                      <dt className="text-text-secondary">Payment attempt</dt>
                      <dd>{item.attempt_status.replaceAll("_", " ")}</dd>
                    </div>
                  )}
                  {item.reference && (
                    <div className="break-all">
                      <dt className="text-text-secondary">Reference</dt>
                      <dd>{item.reference}</dd>
                    </div>
                  )}
                  {item.reason && (
                    <div>
                      <dt className="text-text-secondary">Reason</dt>
                      <dd className="break-words">{item.reason.replaceAll("_", " ")}</dd>
                    </div>
                  )}
                </dl>
                {item.last_check && (
                  <div className="space-y-1 rounded-lg bg-surface-muted p-3 text-sm">
                    <h3 className="font-semibold">Latest staff gateway query</h3>
                    <p>
                      {item.last_check.transaction_status} ·{" "}
                      {item.last_check.identity_matches
                        ? "Payment and invoice match"
                        : "Payment or invoice mismatch"}
                    </p>
                    <p>
                      Reported amount:{" "}
                      {item.last_check.amount_poisha === null
                        ? "Unavailable"
                        : item.last_check.currency === "BDT"
                          ? formatPoishaToBDT(item.last_check.amount_poisha)
                          : `${item.last_check.amount_poisha} minor units (${item.last_check.currency})`}
                    </p>
                    {item.last_check.trx_id && (
                      <p className="break-all">Reported transaction: {item.last_check.trx_id}</p>
                    )}
                    {item.checked_at && (
                      <time dateTime={item.checked_at} className="text-xs text-text-secondary">
                        {new Intl.DateTimeFormat("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Asia/Dhaka",
                        }).format(new Date(item.checked_at))}{" "}
                        (Dhaka)
                      </time>
                    )}
                  </div>
                )}
                {item.review_note && (
                  <p className="break-words text-sm">
                    <strong>
                      {item.reviewed ? "Review note" : "Previous review (evidence changed)"}:
                    </strong>{" "}
                    {item.review_note}
                  </p>
                )}
                <PaymentAttentionForm item={item} />
              </article>
            ))}
            <nav aria-label="Payment exception pages" className="flex gap-4 text-sm font-semibold">
              {query.page > 1 && (
                <Link href={href(query.page - 1)} className="underline">
                  Previous
                </Link>
              )}
              {query.page * paymentAttentionPageSize < list.data.total && (
                <Link href={href(query.page + 1)} className="underline">
                  Next
                </Link>
              )}
            </nav>
          </>
        )}
      </section>
    </AdminPortalShell>
  );
}
