import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { peopleCopy as copy, type PeopleQuery } from "@/lib/admin-people";

export function PeopleDirectoryShell({
  title,
  description,
  searchLabel,
  path,
  filters,
  next,
  add,
  children,
}: {
  title: string;
  description: string;
  searchLabel: string;
  path: string;
  filters: PeopleQuery;
  next: boolean;
  add: React.ReactNode;
  children: React.ReactNode;
}) {
  const href = (archived: boolean, page = 1) => {
    const params = new URLSearchParams();
    if (archived) params.set("archived", "1");
    if (filters.q) params.set("q", filters.q);
    if (page > 1) params.set("page", String(page));
    return params.size ? `${path}?${params}` : path;
  };
  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-200 bg-primary-50 p-4 sm:p-5">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">{title}</h1>
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        </div>
        {add}
      </header>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border-subtle bg-surface-card p-3">
        <nav aria-label={title} className="flex gap-1 rounded-lg bg-surface-muted p-1">
          {[false, true].map((archived) => (
            <Link
              key={String(archived)}
              href={href(archived)}
              aria-current={Boolean(filters.archived) === archived ? "page" : undefined}
              className="inline-flex min-h-10 items-center rounded-md px-3 text-sm font-semibold text-primary-900 aria-[current=page]:bg-primary-800 aria-[current=page]:text-text-inverse focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            >
              {archived ? copy.archived : copy.active}
            </Link>
          ))}
        </nav>
        <form
          key={`${filters.q}:${filters.archived ?? ""}`}
          action={path}
          className="flex min-w-0 flex-1 items-center gap-2"
        >
          {filters.archived && <input type="hidden" name="archived" value={filters.archived} />}
          <label className="sr-only" htmlFor="directory-search">
            {searchLabel}
          </label>
          <input
            type="search"
            id="directory-search"
            name="q"
            defaultValue={filters.q}
            placeholder={searchLabel}
            maxLength={80}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-border-default bg-surface-base px-3 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          />
          <Button type="submit" className="min-h-11">
            {copy.search}
          </Button>
        </form>
      </div>
      {children}
      {(next || filters.page > 1) && (
        <nav aria-label={copy.page} className="flex items-center gap-3 text-sm">
          {filters.page > 1 && (
            <Link
              className="inline-flex min-h-11 items-center underline"
              href={href(Boolean(filters.archived), filters.page - 1)}
            >
              {copy.previous}
            </Link>
          )}
          <span>
            {copy.page} {filters.page}
          </span>
          {next && (
            <Link
              className="inline-flex min-h-11 items-center underline"
              href={href(Boolean(filters.archived), filters.page + 1)}
            >
              {copy.next}
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
