"use client";

import { useEffect, useState } from "react";
import { loadPurgeImpact } from "@/app/admin/record-purge-actions";
import { purgeCopy as copy, type PurgeKind, type PurgeImpact } from "@/lib/admin-record-purge";

export function RecordPurgeImpact({ impact }: { impact: PurgeImpact | null }) {
  if (impact === null)
    return (
      <p role="status" className="text-sm text-text-secondary">
        {copy.loading}
      </p>
    );
  if (impact.status !== "eligible")
    return (
      <p role="alert" className="rounded-lg bg-surface-subtle p-3 text-sm text-text-primary">
        {copy[impact.status]}
      </p>
    );

  const items = [
    [copy.profile, impact.profile === "deleted" ? 1 : 0],
    [copy.applications, impact.applications],
    [copy.payments, impact.paymentRecords],
    [copy.emails, impact.emailRecords],
    [copy.courses, impact.courseRecords],
    [copy.contacts, impact.contactRecords],
  ] as const;

  return (
    <section
      aria-label={copy.removed}
      className="space-y-2 rounded-lg border border-border-subtle bg-surface-subtle p-3 text-sm"
    >
      <h3 className="font-semibold text-primary-900">{copy.removed}</h3>
      <dl className="space-y-1">
        {items
          .filter(([, count]) => count > 0)
          .map(([label, count]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt>{label}</dt>
              <dd className="font-semibold tabular-nums">{count}</dd>
            </div>
          ))}
      </dl>
      {impact.profile === "kept" && <p className="text-text-secondary">{copy.profileKept}</p>}
    </section>
  );
}

export function usePurgeImpact(kind: PurgeKind, id: string, open: boolean) {
  const [impact, setImpact] = useState<PurgeImpact | null>(null);
  useEffect(() => {
    if (!open) return;
    let current = true;
    void loadPurgeImpact(kind, id)
      .then((value) => {
        if (current) setImpact(value);
      })
      .catch(() => {
        if (current) setImpact({ status: "unavailable" });
      });
    return () => {
      current = false;
    };
  }, [kind, id, open]);
  return { impact, resetImpact: () => setImpact(null) };
}
