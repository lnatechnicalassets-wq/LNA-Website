import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { admissionManagementSchema } from "@/lib/admission-lifecycle";
import { adminPaths } from "@/lib/admin-navigation";
import { requireAdminPage } from "@/server/admin/page-auth";
import { createSupabaseAdminClient } from "@/server/supabase/clients";
import { LifecycleForm } from "./lifecycle-form";

export const dynamic = "force-dynamic";
export default async function AdmissionManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requireAdminPage("enrollments:manage");
  const id = z
    .string()
    .uuid()
    .safeParse((await params).id);
  if (!id.success) notFound();
  const { data, error } = await createSupabaseAdminClient().rpc("get_staff_admission_management", {
    p_actor_id: staff.userId,
    p_enrollment_id: id.data,
  });
  if (!error && data === null) notFound();
  const record = admissionManagementSchema.safeParse(data);
  const changed = (await searchParams).changed === "1";
  return (
    <AdminPortalShell staff={staff} currentPath={adminPaths.admissions}>
      <section className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 sm:px-6">
        <Link
          href={`${adminPaths.admissions}/${id.data}`}
          className="text-sm font-semibold text-primary-900 underline"
        >
          Back to admission
        </Link>
        <h1 className="text-2xl font-bold text-primary-900">Manage admission</h1>
        {error || !record.success ? (
          <p role="alert" className="text-sm text-status-danger-text">
            Admission management could not be loaded. Verify database setup and try again.
          </p>
        ) : (
          <>
            {changed && (
              <p role="status" className="text-sm text-status-success-text">
                Admission updated. Payment history preserved.
              </p>
            )}
            <div className="space-y-1 rounded-lg border border-border-subtle bg-surface-card p-4 text-sm">
              <h2 className="font-semibold text-primary-900">
                {record.data.full_name} · {record.data.public_ref}
              </h2>
              <p>
                {record.data.course_title} · {record.data.batch_name}
              </p>
              <p>
                Admission: {record.data.status.replaceAll("_", " ")} · Payment:{" "}
                {record.data.payment_status.replaceAll("_", " ")}
              </p>
            </div>
            {!record.data.archived && record.data.status !== "cancelled" && (
              <LifecycleForm key={record.data.revision} admission={record.data} />
            )}
            <section className="space-y-3 rounded-lg border border-border-subtle bg-surface-card p-4">
              <h2 className="font-semibold text-primary-900">Cancellation and transfer history</h2>
              {record.data.history.length === 0 ? (
                <p className="text-sm text-text-secondary">No changes recorded.</p>
              ) : (
                record.data.history.map((item) => (
                  <article
                    key={item.id}
                    className="space-y-1 border-t border-border-subtle pt-3 text-sm"
                  >
                    <h3 className="font-medium">
                      {item.action === "staff_cancelled_admission"
                        ? "Cancelled"
                        : `Transferred from ${item.before_state.batch_name} to ${item.after_state.batch_name}`}
                    </h3>
                    <p className="break-words">{item.reason}</p>
                    <time dateTime={item.created_at} className="text-xs text-text-secondary">
                      {new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Asia/Dhaka",
                      }).format(new Date(item.created_at))}{" "}
                      (Dhaka)
                    </time>
                  </article>
                ))
              )}
            </section>
          </>
        )}
      </section>
    </AdminPortalShell>
  );
}
