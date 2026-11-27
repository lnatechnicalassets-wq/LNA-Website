import React from "react";
import { AdminPageHeader, AdminStatusNotice } from "@/components/admin/admin-patterns";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { adminMessage as t, adminPaths } from "@/lib/admin-navigation";
import { requireAdminPage } from "@/server/admin/page-auth";

export const dynamic = "force-dynamic";

export default async function AdminAccountPage() {
  const staff = await requireAdminPage("account:manage-self");

  return (
    <AdminPortalShell staff={staff} currentPath={adminPaths.account}>
      <section className="mx-auto w-full max-w-4xl space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-6 lg:px-8">
        <AdminPageHeader
          breadcrumbs={[
            { label: t("overview"), href: adminPaths.overview },
            { label: t("accountTitle") },
          ]}
          title={t("accountTitle")}
          description={t("accountDescription")}
        />
        <Card>
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
            <CardTitle>{t("roleBoundaryTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
            <dl className="grid gap-3 rounded-xl bg-surface-subtle p-3.5 text-sm sm:grid-cols-2 sm:p-4">
              <div>
                <dt className="text-xs font-medium text-text-secondary">{t("fullNameLabel")}</dt>
                <dd className="mt-0.5 font-semibold text-primary-900">{staff.fullName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-text-secondary">{t("emailLabel")}</dt>
                <dd className="mt-0.5 break-all font-medium text-primary-900">{staff.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-text-secondary">{t("staffRoleLabel")}</dt>
                <dd className="mt-1">
                  <Badge variant="primary" size="sm">
                    {t(staff.role === "super_admin" ? "superAdmin" : "admin")}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-text-secondary">
                  {t("accountStateLabel")}
                </dt>
                <dd className="mt-1">
                  <Badge variant="success" size="sm">
                    {t("activeStateLabel")}
                  </Badge>
                </dd>
              </div>
            </dl>
            <AdminStatusNotice tone="info" message={t("accountScheduledNotice")} />
          </CardContent>
        </Card>
      </section>
    </AdminPortalShell>
  );
}
