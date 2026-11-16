"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, LogOut, Menu, ShieldCheck } from "lucide-react";
import { SkipLink } from "@/components/public/skip-link";
import { Badge, Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { adminMessage as t, adminNavigation, adminPaths } from "@/lib/admin-navigation";
import { cn } from "@/lib/utils";
import type { VerifiedStaffContext } from "@/server/auth/require-staff";

const rowClassName =
  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600";

const idleRowClassName = "text-text-secondary hover:bg-surface-muted hover:text-primary-900";
const activeRowClassName =
  "bg-primary-100 font-semibold text-primary-900 ring-1 ring-inset ring-primary-200";

function linkIsActive(currentPath: string, href: string) {
  return (
    currentPath === href ||
    (href !== adminPaths.overview && currentPath.startsWith(href + "/")) ||
    (href === adminPaths.courses &&
      (currentPath === adminPaths.batches || currentPath.startsWith(adminPaths.batches + "/")))
  );
}

function AdminNavLink({
  href,
  currentPath,
  onNavigate,
  children,
}: {
  href: string;
  currentPath: string;
  onNavigate?: () => void;
  children: React.ReactNode;
}) {
  const active = linkIsActive(currentPath, href);
  const current = currentPath === href ? "page" : "location";

  return (
    <Link
      href={href}
      aria-current={active ? current : undefined}
      className={cn(rowClassName, active ? activeRowClassName : idleRowClassName)}
      onClick={onNavigate}
    >
      {children}
    </Link>
  );
}

interface AdminSidebarProps {
  staff: VerifiedStaffContext;
  currentPath: string;
  signingOut: boolean;
  onSignOut: () => Promise<void>;
  onNavigate?: () => void;
}

function AdminSidebar({
  staff,
  currentPath,
  signingOut,
  onSignOut,
  onNavigate,
}: AdminSidebarProps) {
  return (
    <>
      <nav aria-label={t("navigation")} className="min-h-0 flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {adminNavigation.map(({ label, href, icon: Icon }) => (
            <li key={label}>
              <AdminNavLink href={href} currentPath={currentPath} onNavigate={onNavigate}>
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {t(label)}
              </AdminNavLink>
              {label === "courses" && (
                <ul className="ml-4 mt-1 border-l border-border-subtle pl-2">
                  <li>
                    <AdminNavLink
                      href={adminPaths.batches}
                      currentPath={currentPath}
                      onNavigate={onNavigate}
                    >
                      {t("batches")}
                    </AdminNavLink>
                  </li>
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="shrink-0 space-y-3 border-t border-border-subtle p-4">
        <Link
          href={adminPaths.website}
          className={cn(rowClassName, idleRowClassName)}
          onClick={onNavigate}
        >
          <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
          {t("viewWebsite")}
        </Link>
        <div className="space-y-2 rounded-lg bg-primary-50 px-3 py-3">
          <p className="break-words text-sm font-semibold">{staff.fullName}</p>
          <p className="break-all text-xs text-text-secondary">{staff.email}</p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="primary" size="sm">
              {t(staff.role === "super_admin" ? "superAdmin" : "admin")}
            </Badge>
            <Badge variant="success" size="sm">
              {t("assuranceLevel")}
            </Badge>
          </div>
        </div>
        <Button
          variant="outline"
          className="min-h-11 w-full justify-start px-3 motion-reduce:transition-none"
          isLoading={signingOut}
          onClick={onSignOut}
        >
          <LogOut className="size-4" aria-hidden="true" />
          {t("signOut")}
        </Button>
      </div>
    </>
  );
}

function PortalBrand({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-800 text-text-inverse">
        <ShieldCheck className="size-5" aria-hidden="true" />
      </span>
      <span className={cn("text-sm font-bold", inverse ? "text-text-inverse" : "text-primary-900")}>
        {t("portalTitle")}
      </span>
    </div>
  );
}

export function AdminPortalShell({
  staff,
  currentPath,
  children,
}: {
  staff: VerifiedStaffContext;
  currentPath: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;

    const desktopViewport = window.matchMedia("(min-width: 64rem)");
    const closeOnDesktop = () => {
      if (desktopViewport.matches) setDrawerOpen(false);
    };

    desktopViewport.addEventListener("change", closeOnDesktop);
    return () => desktopViewport.removeEventListener("change", closeOnDesktop);
  }, [drawerOpen]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch(adminPaths.logout, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      router.push(adminPaths.login);
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const sidebarProps = { staff, currentPath, signingOut, onSignOut: handleSignOut };

  return (
    <div className="min-h-dvh bg-linear-to-br from-primary-50 via-surface-base to-accent-100 lg:flex">
      <SkipLink targetId="admin-page-content" label={t("skipNavigation")} />

      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border-subtle bg-surface-card lg:flex">
        <div className="space-y-3 bg-primary-900 px-4 py-4">
          <PortalBrand inverse />
        </div>
        <AdminSidebar {...sidebarProps} />
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-3 border-b border-border-subtle bg-surface-card px-4 lg:hidden">
          <PortalBrand />
          <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label={t("openMenu")}
                className="min-h-11 min-w-11 motion-reduce:transition-none"
              >
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </DialogTrigger>
            <DialogContent className="inset-y-0 left-0 top-0 flex h-dvh max-h-none w-[min(20rem,90vw)] max-w-none translate-none flex-col gap-0 overflow-y-auto rounded-none border-0 border-r p-0 duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none [&>button]:right-2 [&>button]:top-2 [&>button]:grid [&>button]:size-11 [&>button]:place-items-center">
              <div className="space-y-2 border-b border-border-subtle py-4 pr-16 pl-4">
                <DialogTitle>{t("navigation")}</DialogTitle>
                <DialogDescription className="sr-only">{t("menuDescription")}</DialogDescription>
              </div>
              <AdminSidebar {...sidebarProps} onNavigate={() => setDrawerOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
        <div id="admin-page-content" tabIndex={-1} className="scroll-mt-20 lg:scroll-mt-0">
          {children}
        </div>
      </div>
    </div>
  );
}
