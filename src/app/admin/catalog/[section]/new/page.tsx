import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { catalogSection } from "@/lib/admin-catalog";
import { createCatalogCopy, editCatalogCopy } from "@/lib/admin-catalog-edit";
import { adminPaths } from "@/lib/admin-navigation";
import { AppError } from "@/lib/errors";
import { listBatchCourseOptions } from "@/server/admin/catalog";
import { requireStaff } from "@/server/auth/require-staff";
import { EditForm } from "../[id]/edit/edit-form";
import { createCatalogDraft } from "./actions";

export default async function NewCatalogPage({ params }: { params: Promise<{ section: string }> }) {
  const target = catalogSection.safeParse((await params).section);
  if (!target.success) notFound();

  const staff = await requireStaff("catalog:edit").catch((error: unknown) => {
    if (!(error instanceof AppError)) throw error;
    if (error.code === "FORBIDDEN" || error.code === "ACCOUNT_INACTIVE") {
      redirect(`${adminPaths.login}?error=forbidden`);
    }
    redirect(adminPaths.login);
  });
  const section = target.data;
  const path = adminPaths[section];
  const courses =
    section === "batches"
      ? await listBatchCourseOptions().catch((error: unknown) => {
          if (error instanceof AppError && error.code === "ADMIN_CATALOG_UNAVAILABLE") return null;
          throw error;
        })
      : [];
  const needsCourse = section === "batches" && courses?.length === 0;

  return (
    <AdminPortalShell staff={staff} currentPath={path}>
      <section className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href={path}
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary-900 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          {editCatalogCopy.back}
        </Link>
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-primary-900 sm:text-3xl">
            {createCatalogCopy[section].title}
          </h1>
          <p className="text-sm text-text-secondary">{createCatalogCopy.draft}</p>
        </header>
        {courses === null ? (
          <p role="alert" className="text-sm text-status-danger-text">
            {editCatalogCopy.readFailed}
          </p>
        ) : needsCourse ? (
          <div className="space-y-2">
            <p>{createCatalogCopy.noCourses}</p>
            <Link
              href={`${adminPaths.courses}/new`}
              className="inline-flex min-h-11 items-center text-primary-900 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            >
              {createCatalogCopy.courses.link}
            </Link>
          </div>
        ) : (
          <EditForm
            section={section}
            mode="create"
            courseOptions={courses}
            initialValues={{}}
            save={createCatalogDraft.bind(null, section)}
          />
        )}
      </section>
    </AdminPortalShell>
  );
}
