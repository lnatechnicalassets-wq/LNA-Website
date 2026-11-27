import React from "react";
import { AdminModuleBoundaryCard, AdminPageHeader } from "@/components/admin/admin-patterns";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { Badge } from "@/components/ui";
import { adminMessage as t, adminPaths } from "@/lib/admin-navigation";
import { requireAdminPage } from "@/server/admin/page-auth";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const staff = await requireAdminPage("settings:manage", { superAdminOnly: true });

  return (
    <AdminPortalShell staff={staff} currentPath={adminPaths.settings}>
      <section className="mx-auto w-full max-w-7xl space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-6 lg:px-8">
        <AdminPageHeader
          breadcrumbs={[
            { label: t("overview"), href: adminPaths.overview },
            { label: t("settingsTitle") },
          ]}
          title={t("settingsTitle")}
          description={t("settingsDescription")}
          badges={<Badge variant="primary">{t("superAdminOnlyBadge")}</Badge>}
        />
        <AdminModuleBoundaryCard
          title={t("settingsTitle")}
          statusLabel={t("scheduledModuleBadge")}
          description={t("settingsDescription")}
          notice={t("settingsScheduledNotice")}
          actionHref={adminPaths.account}
          actionLabel={t("myAccount")}
        />
      </section>
    </AdminPortalShell>
  );
}
