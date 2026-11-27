import React from "react";
import Link from "next/link";
import { AdminPortalShell } from "@/components/admin/admin-portal-shell";
import { listMentorAssets } from "@/server/admin/people";
import { listStaffPartners, type PartnerRecord } from "@/server/catalog/partners";
import { requireAdminPage } from "@/server/admin/page-auth";
import { adminPaths } from "@/lib/admin-navigation";
import { savePartner } from "./actions";

export const dynamic = "force-dynamic";
const field =
  "min-h-10 w-full rounded-lg border border-border-default bg-surface-base px-3 py-2 text-sm";
function PartnerForm({ record, logos }: { record?: PartnerRecord; logos: string[] }) {
  return (
    <form
      action={savePartner}
      className="space-y-3 rounded-xl border border-border-subtle bg-surface-card p-4"
    >
      <h2 className="font-semibold text-primary-900">{record?.name ?? "Add partner"}</h2>
      <input type="hidden" name="id" value={record?.id ?? ""} />
      <input type="hidden" name="revision" value={record?.updated_at ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          Name
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            defaultValue={record?.name}
            className={field}
          />
        </label>
        <label className="space-y-1 text-sm">
          Sector
          <input
            name="sector"
            required
            minLength={2}
            maxLength={160}
            defaultValue={record?.sector}
            className={field}
          />
        </label>
        <label className="space-y-1 text-sm">
          Logo
          <select name="logo" defaultValue={record?.logo_src ?? ""} className={field}>
            <option value="">Text wordmark</option>
            {[...new Set([...logos, ...(record?.logo_src ? [record.logo_src] : [])])].map(
              (path) => (
                <option key={path} value={path}>
                  {path.split("/").at(-1)}
                </option>
              )
            )}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          Display order
          <input
            name="order"
            type="number"
            required
            min={0}
            max={9999}
            defaultValue={record?.display_order ?? 10}
            className={field}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked={record?.published ?? false} /> Show
        on website
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="attested" required /> I confirm this is an authorized partner
        and the displayed information is accurate.
      </label>
      <button
        type="submit"
        className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
      >
        Save partner
      </button>
    </form>
  );
}
export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, unknown>>;
}) {
  const staff = await requireAdminPage("cms:edit");
  const [records, assets, params] = await Promise.all([
    listStaffPartners().catch(() => null),
    listMentorAssets().catch(() => ({ logos: [] })),
    searchParams,
  ]);
  const result = typeof params.result === "string" ? params.result : "";
  const message = (
    {
      saved: "Partner saved.",
      invalid: "Check the fields and authorized logo.",
      stale: "This partner changed. Reload and review before saving.",
      failed: "Unable to save partner.",
    } as Record<string, string>
  )[result];
  return (
    <AdminPortalShell staff={staff} currentPath={adminPaths.website}>
      <section className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <Link
          href={adminPaths.website}
          className="text-sm font-semibold text-primary-900 underline"
        >
          Back to Website
        </Link>
        <h1 className="text-2xl font-bold text-primary-900">Partners</h1>
        <p className="text-sm text-text-secondary">
          Add, edit, reorder or hide partner organizations. Choose an existing image or use a text
          wordmark.
        </p>
        {message && (
          <p role="status" className="rounded-lg bg-surface-subtle p-3 text-sm">
            {message}
          </p>
        )}
        {records === null ? (
          <p role="alert" className="text-sm text-status-danger-text">
            Partner management is unavailable. Check that the core release migration is applied.
          </p>
        ) : (
          <>
            <PartnerForm logos={assets.logos} />
            {records.map((record) => (
              <PartnerForm
                key={`${record.id}:${record.updated_at}`}
                record={record}
                logos={assets.logos}
              />
            ))}
          </>
        )}
      </section>
    </AdminPortalShell>
  );
}
