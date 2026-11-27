"use client";

import React, { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Info,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminMessage as t, sanitizeAdminReturnPath } from "@/lib/admin-navigation";
import { cn } from "@/lib/utils";

export interface AdminBreadcrumbItem {
  readonly label: string;
  readonly href?: string;
}

export function AdminBreadcrumbs({
  items,
  className,
}: {
  items: ReadonlyArray<AdminBreadcrumbItem>;
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label={t("breadcrumbLabel")} className={cn("min-w-0", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-xs font-medium text-text-secondary sm:text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const safeHref = item.href ? sanitizeAdminReturnPath(item.href) : undefined;
          return (
            <li key={`${item.label}:${index}`} className="inline-flex min-w-0 items-center gap-1">
              {index > 0 && (
                <ChevronRight className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
              )}
              {isLast || !safeHref ? (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-8 items-center rounded px-1",
                    isLast ? "font-semibold text-primary-900" : "text-text-secondary"
                  )}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={safeHref}
                  className="inline-flex min-h-8 items-center rounded px-1 text-primary-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function AdminPageHeader({
  breadcrumbs,
  title,
  description,
  badges,
  actions,
}: {
  breadcrumbs?: ReadonlyArray<AdminBreadcrumbItem>;
  title: string;
  description?: string;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="space-y-1.5 border-b border-border-subtle pb-3 sm:space-y-2 sm:pb-4">
      {breadcrumbs && breadcrumbs.length > 0 && <AdminBreadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary-900 sm:text-3xl">
              {title}
            </h1>
            {badges}
          </div>
          {description && <p className="max-w-2xl text-sm text-text-secondary">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export type AdminNoticeTone = "info" | "success" | "warning" | "danger" | "loading";

const noticeStyles: Record<
  AdminNoticeTone,
  { container: string; title: string; role: "status" | "alert"; Icon: typeof Info }
> = {
  info: {
    container: "border-status-info-border bg-status-info-bg text-status-info-text",
    title: "text-status-info-text",
    role: "status",
    Icon: Info,
  },
  success: {
    container: "border-status-success-border bg-status-success-bg text-status-success-text",
    title: "text-status-success-text",
    role: "status",
    Icon: CheckCircle2,
  },
  warning: {
    container: "border-status-warning-border bg-status-warning-bg text-status-warning-text",
    title: "text-status-warning-text",
    role: "status",
    Icon: AlertTriangle,
  },
  danger: {
    container: "border-status-danger-border bg-status-danger-bg text-status-danger-text",
    title: "text-status-danger-text",
    role: "alert",
    Icon: AlertCircle,
  },
  loading: {
    container: "border-border-default bg-surface-subtle text-primary-900",
    title: "text-primary-900",
    role: "status",
    Icon: Loader2,
  },
};

export function AdminStatusNotice({
  tone,
  title,
  message,
  action,
  className,
}: {
  tone: AdminNoticeTone;
  title?: string;
  message: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const { container, title: titleClass, role, Icon } = noticeStyles[tone];

  return (
    <div
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
        container,
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <Icon
          aria-hidden="true"
          className={cn(
            "mt-0.5 size-4 shrink-0",
            tone === "loading" && "animate-spin motion-reduce:animate-none"
          )}
        />
        <div className="min-w-0 space-y-0.5">
          {title && <p className={cn("font-semibold", titleClass)}>{title}</p>}
          <p className="leading-relaxed">{message}</p>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function AdminStatePanel({
  variant,
  title,
  description,
  action,
  retryHref,
  retryLabel,
}: {
  variant: "loading" | "empty" | "filtered-empty" | "error" | "forbidden";
  title: string;
  description: string;
  action?: React.ReactNode;
  retryHref?: string;
  retryLabel?: string;
}) {
  const safeRetry = retryHref ? sanitizeAdminReturnPath(retryHref) : undefined;
  const Icon =
    variant === "loading"
      ? Loader2
      : variant === "error"
        ? AlertCircle
        : variant === "forbidden"
          ? ShieldAlert
          : Info;

  return (
    <Card
      role={variant === "error" || variant === "forbidden" ? "alert" : "status"}
      className={cn(
        "text-center",
        variant === "error" || variant === "forbidden"
          ? "border-status-danger-border bg-status-danger-bg/50"
          : "border-border-default bg-surface-card"
      )}
    >
      <CardContent className="grid justify-items-center gap-3 px-4 py-10">
        <span
          className={cn(
            "grid size-11 place-items-center rounded-xl",
            variant === "error" || variant === "forbidden"
              ? "bg-status-danger-bg text-status-danger-text"
              : "bg-primary-50 text-primary-800"
          )}
        >
          <Icon
            aria-hidden="true"
            className={cn(
              "size-5",
              variant === "loading" && "animate-spin motion-reduce:animate-none"
            )}
          />
        </span>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-primary-900">{title}</h2>
          <p className="max-w-md text-sm text-text-secondary">{description}</p>
        </div>
        {(action || (safeRetry && retryLabel)) && (
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {action}
            {safeRetry && retryLabel && (
              <Link
                href={safeRetry}
                className="inline-flex min-h-11 items-center rounded-lg border border-border-default bg-surface-card px-4 text-sm font-medium text-primary-900 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                {retryLabel}
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export interface AdminTableColumn<T> {
  readonly key: string;
  readonly header: string;
  readonly align?: "left" | "right";
  readonly cell: (row: T) => React.ReactNode;
}

export function AdminDataTable<T>({
  caption,
  rows,
  getRowKey,
  columns,
  mobileCard,
  emptyState,
}: {
  caption: string;
  rows: ReadonlyArray<T>;
  getRowKey: (row: T) => string;
  columns: ReadonlyArray<AdminTableColumn<T>>;
  mobileCard?: (row: T) => React.ReactNode;
  emptyState?: React.ReactNode;
}) {
  if (rows.length === 0) {
    return emptyState ?? null;
  }

  return (
    <div className="space-y-3">
      {mobileCard && (
        <ul aria-label={caption} className="space-y-3 md:hidden">
          {rows.map((row) => (
            <li
              key={getRowKey(row)}
              className="rounded-xl border border-border-default bg-surface-card p-4 shadow-xs"
            >
              {mobileCard(row)}
            </li>
          ))}
        </ul>
      )}
      <div
        className={cn(
          "overflow-x-auto rounded-2xl border border-border-default bg-surface-card shadow-xs",
          mobileCard && "hidden md:block"
        )}
      >
        <table className="min-w-full border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border-default bg-primary-50 text-xs font-semibold text-primary-800">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "px-4 py-3 whitespace-nowrap",
                    column.align === "right" && "text-right"
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {rows.map((row) => (
              <tr key={getRowKey(row)} className="hover:bg-surface-subtle/60">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-4 py-3.5 align-top text-text-primary",
                      column.align === "right" && "text-right"
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Consequential action confirmation dialog with duplicate-submit guard, clear impact wording,
 * optional mandatory reason entry, and focus management (D26, D74, D75).
 */
export function AdminConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  consequenceSummary,
  confirmLabel,
  confirmVariant = "primary",
  requireReason = false,
  reasonLabel = t("confirmActionReasonLabel"),
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  consequenceSummary?: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  requireReason?: boolean;
  reasonLabel?: string;
  onConfirm: (reason: string) => Promise<void> | void;
}) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inFlightRef = useRef(false);

  const handleConfirm = useCallback(async () => {
    if (inFlightRef.current) return;
    const trimmed = reason.trim();
    if (requireReason && trimmed.length === 0) {
      setError(`${reasonLabel}: ${t("confirmActionReasonRequired")}`);
      return;
    }

    inFlightRef.current = true;
    setPending(true);
    setError("");
    try {
      await onConfirm(trimmed);
      setReason("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("confirmActionFailed"));
    } finally {
      inFlightRef.current = false;
      setPending(false);
    }
  }, [onConfirm, onOpenChange, reason, reasonLabel, requireReason]);

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-md text-left">
        <DialogTitle className="pr-7">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        {consequenceSummary && <AdminStatusNotice tone="warning" message={consequenceSummary} />}
        {requireReason && (
          <Input
            label={reasonLabel}
            required
            maxLength={500}
            value={reason}
            disabled={pending}
            placeholder={t("confirmActionReasonPlaceholder")}
            error={error || undefined}
            onChange={(event) => {
              setReason(event.currentTarget.value);
              if (error) setError("");
            }}
          />
        )}
        {!requireReason && error && <AdminStatusNotice tone="danger" message={error} />}
        <DialogFooter className="pt-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending} className="min-h-11">
              {t("confirmActionCancel")}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={confirmVariant}
            isLoading={pending}
            onClick={handleConfirm}
            className="min-h-11"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Shared stale-conflict notice with explicit reload path (D26, D74).
 */
export function AdminStaleUpdateNotice({
  message,
  reloadHref,
}: {
  message: string;
  reloadHref?: string;
}) {
  const safeReload = reloadHref ? sanitizeAdminReturnPath(reloadHref) : undefined;
  return (
    <AdminStatusNotice
      tone="warning"
      message={message}
      action={
        safeReload ? (
          <Link
            href={safeReload}
            className="inline-flex min-h-10 items-center rounded-lg border border-status-warning-border bg-surface-card px-3 text-xs font-semibold text-primary-900 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            {t("reloadLatestRecord")}
          </Link>
        ) : undefined
      }
    />
  );
}

export function AdminModuleBoundaryCard({
  title,
  statusLabel,
  description,
  notice,
  actionHref,
  actionLabel,
  secondaryActionHref,
  secondaryActionLabel,
}: {
  title: string;
  statusLabel: string;
  description: string;
  notice: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryActionHref?: string;
  secondaryActionLabel?: string;
}) {
  const safePrimary = actionHref ? sanitizeAdminReturnPath(actionHref) : undefined;
  const safeSecondary = secondaryActionHref
    ? sanitizeAdminReturnPath(secondaryActionHref)
    : undefined;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 p-4 pb-2 sm:p-5 sm:pb-3">
        <CardTitle>{title}</CardTitle>
        <Badge variant="outline">{statusLabel}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
        <p className="text-sm text-text-secondary">{description}</p>
        <AdminStatusNotice tone="info" message={notice} />
        {(safePrimary || safeSecondary) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {safePrimary && actionLabel && (
              <Link
                href={safePrimary}
                className="inline-flex min-h-11 items-center rounded-lg bg-primary-800 px-4 text-sm font-semibold text-text-inverse hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                {actionLabel}
              </Link>
            )}
            {safeSecondary && secondaryActionLabel && (
              <Link
                href={safeSecondary}
                className="inline-flex min-h-11 items-center rounded-lg border border-border-default bg-surface-card px-4 text-sm font-semibold text-primary-900 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                {secondaryActionLabel}
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
