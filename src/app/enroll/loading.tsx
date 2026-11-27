import React from "react";

export default function Loading() {
  return (
    <section className="mx-auto w-full max-w-4xl space-y-5 px-4 py-10 sm:px-6" aria-busy="true">
      <p role="status" className="text-sm font-medium text-text-secondary">
        Loading enrollment…
      </p>
      <div
        aria-hidden="true"
        className="space-y-4 rounded-2xl border border-border-subtle bg-surface-card p-6"
      >
        <div className="h-7 w-2/3 rounded-md bg-surface-muted" />
        <div className="h-4 w-full rounded-md bg-surface-muted" />
        <div className="h-4 w-3/4 rounded-md bg-surface-muted" />
        <div className="h-24 rounded-xl bg-surface-muted" />
      </div>
    </section>
  );
}
