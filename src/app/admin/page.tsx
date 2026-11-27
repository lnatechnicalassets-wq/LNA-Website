import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AddStudentLink } from "@/components/admin/add-student-link";
import { AdminPageHeader } from "@/components/admin/admin-patterns";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { adminMessage as t, adminPaths } from "@/lib/admin-navigation";
import { AppError } from "@/lib/errors";
import { requireStaff } from "@/server/auth/require-staff";

export default async function AdminOverviewPage() {
  const staff = await requireStaff("overview:read").catch((error: unknown) => {
    if (!(error instanceof AppError)) throw error;
    if (error.code === "FORBIDDEN" || error.code === "ACCOUNT_INACTIVE") {
      redirect(`${adminPaths.login}?error=forbidden`);
    }
    redirect(adminPaths.login);
  });

  return (
    <AdminPortalShell staff={staff} currentPath={adminPaths.overview}>
      <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-6 lg:px-8">
        <AdminPageHeader
          title={t("overview")}
          description={t("overviewDescription")}
          actions={<AddStudentLink />}
        />
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {[
            {
              title: t("admissions"),
              description: t("admissionsWorkspaceDescription"),
              href: adminPaths.admissions,
              action: t("reviewApplications"),
            },
            {
              title: t("courses"),
              description: t("courseWorkspaceDescription"),
              href: adminPaths.courses,
              action: t("manageCourses"),
            },
            {
              title: t("studentDirectory"),
              description: t("studentWorkspaceDescription"),
              href: adminPaths.studentDirectory,
              action: t("manageStudents"),
            },
            {
              title: t("website"),
              description: t("websiteWorkspaceDescription"),
              href: adminPaths.mentors,
              action: t("manageMentors"),
            },
          ].map(({ title, description, href, action }) => (
            <section
              key={href}
              className="space-y-3 rounded-xl border border-border-subtle bg-surface-card p-4 sm:p-5"
            >
              <h2 className="text-lg font-semibold text-primary-900">{title}</h2>
              <p className="text-sm text-text-secondary">{description}</p>
              <Link
                href={href}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border-default px-4 text-sm font-semibold text-primary-900 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                {action}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </section>
          ))}
        </div>
      </div>
    </AdminPortalShell>
  );
}
