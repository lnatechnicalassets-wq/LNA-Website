import React from "react";
import { AdminModuleBoundaryCard, AdminPageHeader } from "@/components/admin/admin-patterns";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { adminMessage as t, adminPaths } from "@/lib/admin-navigation";
import { requireAdminPage } from "@/server/admin/page-auth";

export const dynamic = "force-dynamic";

export default async function AdminWebsitePage() {
  const staff = await requireAdminPage("cms:read");

  return (
    <AdminPortalShell staff={staff} currentPath={adminPaths.website}>
      <section className="mx-auto w-full max-w-7xl space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-6 lg:px-8">
        <AdminPageHeader
          breadcrumbs={[
            { label: t("overview"), href: adminPaths.overview },
            { label: t("websiteTitle") },
          ]}
          title={t("websiteTitle")}
          description={t("websiteDescription")}
        />
        <AdminModuleBoundaryCard
          title={t("mentors")}
          statusLabel={t("websiteTitle")}
          description={t("websiteWorkspaceDescription")}
          notice="Manage mentors and partner organizations. Other website sections remain unchanged."
          actionHref={adminPaths.mentors}
          actionLabel={t("manageMentors")}
          secondaryActionHref="/admin/website/partners"
          secondaryActionLabel="Manage partners"
        />
      </section>
    </AdminPortalShell>
  );
}
