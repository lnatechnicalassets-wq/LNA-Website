import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export const recordTabClass =
  "inline-flex min-h-11 items-center gap-1.5 border-b-2 border-transparent px-1 text-sm font-medium text-text-secondary hover:text-primary-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 aria-[current=page]:border-primary-800 aria-[current=page]:font-semibold aria-[current=page]:text-primary-800";

export function RecordsHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="relative isolate overflow-hidden rounded-2xl bg-linear-to-r from-primary-950 via-primary-900 to-primary-700 px-4 py-5 text-text-inverse sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-24 -z-10 size-72 rounded-full border border-primary-300/25 outline-1 outline-offset-20 outline-primary-300/15"
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-300/20 text-primary-100 sm:size-12">
            <Icon aria-hidden="true" className="size-5 sm:size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-inverse sm:text-3xl">
              {title}
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-text-inverse-muted">{description}</p>
          </div>
        </div>
        {action}
      </div>
    </header>
  );
}

export function RecordAvatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? "")
    .join("");
  return (
    <span
      aria-hidden="true"
      className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-100 text-xs font-bold uppercase tracking-wide text-primary-700"
    >
      {initials}
    </span>
  );
}
