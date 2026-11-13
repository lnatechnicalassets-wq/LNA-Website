import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { adminMessage as t, adminPaths } from "@/lib/admin-navigation";
import { AppError } from "@/lib/errors";
import { requireStaff } from "@/server/auth/require-staff";

export default async function AdminOverviewPage() {
  const staff = await requireStaff("enrollments:read").catch((error: unknown) => {
    if (!(error instanceof AppError)) throw error;
    if (error.code === "FORBIDDEN" || error.code === "ACCOUNT_INACTIVE") {
      redirect(`${adminPaths.login}?error=forbidden`);
    }
    redirect(adminPaths.login);
  });

  return (
    <AdminPortalShell staff={staff} currentPath={adminPaths.overview}>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-primary-900 sm:text-3xl">
          {t("overview")}
        </h1>
        <section className="max-w-xl space-y-4 rounded-xl border border-border-subtle bg-surface-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-primary-900">{t("admissions")}</h2>
          <p className="text-sm text-text-secondary">{t("overviewDescription")}</p>
          <Link
            href={adminPaths.admissions}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border-default px-4 text-sm font-semibold text-primary-900 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            {t("reviewApplications")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      </div>
    </AdminPortalShell>
  );
}
