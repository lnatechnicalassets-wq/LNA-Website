import React from "react";
import { AdminModuleBoundaryCard, AdminPageHeader } from "@/components/admin/admin-patterns";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { adminMessage as t, adminPaths } from "@/lib/admin-navigation";
import { requireAdminPage } from "@/server/admin/page-auth";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const staff = await requireAdminPage("reports:read");

  return (
    <AdminPortalShell staff={staff} currentPath={adminPaths.reports}>
      <section className="mx-auto w-full max-w-7xl space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-6 lg:px-8">
        <AdminPageHeader
          breadcrumbs={[
            { label: t("overview"), href: adminPaths.overview },
            { label: t("reportsTitle") },
          ]}
          title={t("reportsTitle")}
          description={t("reportsDescription")}
        />
        <AdminModuleBoundaryCard
          title={t("reportsTitle")}
          statusLabel={t("scheduledModuleBadge")}
          description={t("reportsDescription")}
          notice={t("reportsScheduledNotice")}
          actionHref={adminPaths.courses}
          actionLabel={t("reportsScheduledAction")}
        />
      </section>
    </AdminPortalShell>
  );
}
