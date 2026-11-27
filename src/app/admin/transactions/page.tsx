import React from "react";
import { AdminModuleBoundaryCard, AdminPageHeader } from "@/components/admin/admin-patterns";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { adminMessage as t, adminPaths } from "@/lib/admin-navigation";
import { requireAdminPage } from "@/server/admin/page-auth";

export const dynamic = "force-dynamic";

export default async function AdminTransactionsPage() {
  const staff = await requireAdminPage("transactions:read");

  return (
    <AdminPortalShell staff={staff} currentPath={adminPaths.transactions}>
      <section className="mx-auto w-full max-w-7xl space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-6 lg:px-8">
        <AdminPageHeader
          breadcrumbs={[
            { label: t("overview"), href: adminPaths.overview },
            { label: t("transactionsTitle") },
          ]}
          title={t("transactionsTitle")}
          description={t("transactionsDescription")}
        />
        <AdminModuleBoundaryCard
          title={t("transactionsTitle")}
          statusLabel={t("scheduledModuleBadge")}
          description={t("transactionsDescription")}
          notice={t("transactionsScheduledNotice")}
          actionHref={adminPaths.admissions}
          actionLabel={t("transactionsScheduledAction")}
        />
      </section>
    </AdminPortalShell>
  );
}
