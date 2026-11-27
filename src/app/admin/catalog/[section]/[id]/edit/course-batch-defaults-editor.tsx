import "server-only";
import React from "react";
import Link from "next/link";
import { adminPaths } from "@/lib/admin-navigation";
import { batchDefaultsValues } from "@/lib/course-batch-defaults";
import { getCourseBatchDefaults } from "@/server/admin/course-batch-defaults";
import { CourseBatchDefaultsForm } from "@/components/admin/course-batch-defaults-form";
import { saveCourseBatchDefaults } from "./course-batch-defaults-actions";

export async function CourseBatchDefaultsEditor({
  id,
  actorId,
  saved,
}: {
  id: string;
  actorId: string;
  saved?: boolean;
}) {
  const record = await getCourseBatchDefaults(actorId, id);
  if (!record) return null;
  const values = record.defaults ? batchDefaultsValues(record.defaults) : { capacity: "unlimited" };
  const query = new URLSearchParams({ courseId: id });
  return (
    <section
      id="batch-defaults"
      className="space-y-4 rounded-xl border border-border-subtle bg-surface-card p-4 sm:p-6"
    >
      <h2 className="text-lg font-semibold text-primary-900">Batch defaults</h2>
      <p className="text-sm text-text-secondary">
        Use these editable starting values when creating a batch. Existing batches, dates,
        enrollment settings and payments are not changed.
      </p>
      {saved && (
        <p role="status" className="text-sm text-status-success-text">
          Batch defaults saved.
        </p>
      )}
      <CourseBatchDefaultsForm
        key={record.revision}
        values={values}
        save={saveCourseBatchDefaults.bind(null, { id, revision: record.revision })}
      />
      <div className="flex flex-wrap gap-4 text-sm font-semibold text-primary-900 underline">
        <Link href={`${adminPaths.batches}/new?${query}`}>Create batch from scratch</Link>
        {record.defaults && (
          <Link href={`${adminPaths.batches}/new?${query}&defaults=1`}>
            Create batch using defaults
          </Link>
        )}
      </div>
    </section>
  );
}
