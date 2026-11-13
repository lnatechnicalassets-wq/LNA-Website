import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { catalogSection } from "@/lib/admin-catalog";
import { editCatalogCopy } from "@/lib/admin-catalog-edit";
import { adminPaths } from "@/lib/admin-navigation";
import { AppError } from "@/lib/errors";
import { getCatalogEditRecord } from "@/server/admin/catalog-edit";
import { requireStaff } from "@/server/auth/require-staff";
import { saveCatalogEdit } from "./actions";
import { EditForm } from "./edit-form";

const route = z.object({ section: catalogSection, id: z.string().uuid() });

export default async function CatalogEditPage({
  params,
}: {
  params: Promise<{ section: string; id: string }>;
}) {
  const target = route.safeParse(await params);
  if (!target.success) notFound();

  const staff = await requireStaff("catalog:edit").catch((error: unknown) => {
    if (!(error instanceof AppError)) throw error;
    if (error.code === "FORBIDDEN" || error.code === "ACCOUNT_INACTIVE") {
      redirect(`${adminPaths.login}?error=forbidden`);
    }
    redirect(adminPaths.login);
  });
  const { section, id } = target.data;
  const path = adminPaths[section];
  const record = await getCatalogEditRecord(section, id).catch((error: unknown) => {
    if (error instanceof AppError && error.code === "ADMIN_CATALOG_UNAVAILABLE")
      return "unavailable" as const;
    throw error;
  });
  if (!record) notFound();

  return (
    <AdminPortalShell staff={staff} currentPath={path}>
      <section className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href={path}
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary-900 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          {editCatalogCopy.back}
        </Link>
        <h1 className="text-2xl font-bold text-primary-900 sm:text-3xl">
          {editCatalogCopy[section].title}
        </h1>
        {record === "unavailable" || record.archived ? (
          <p role="alert" className="text-sm text-status-danger-text">
            {record === "unavailable" ? editCatalogCopy.readFailed : editCatalogCopy.archived}
          </p>
        ) : (
          <EditForm
            section={section}
            initialValues={record.values}
            save={saveCatalogEdit.bind(null, { section, id, revision: record.revision })}
          />
        )}
      </section>
    </AdminPortalShell>
  );
}
