"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, LogOut, Menu } from "lucide-react";
import { SkipLink } from "@/components/public/skip-link";
import { Badge, Button } from "@/components/ui";
import { BrandLogo } from "@/components/ui/demo-logo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  adminAccountNavItem,
  adminMessage as t,
  adminPaths,
  getAdminNavigation,
} from "@/lib/admin-navigation";
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
      (currentPath === adminPaths.batches || currentPath.startsWith(adminPaths.batches + "/"))) ||
    (href === adminPaths.website &&
      (currentPath === adminPaths.mentors || currentPath.startsWith(adminPaths.mentors + "/")))
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
  const modules = getAdminNavigation(staff.role);
  const AccountIcon = adminAccountNavItem.icon;

  return (
    <>
      <nav aria-label={t("navigation")} className="min-h-0 flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {modules.map(({ id, label, href, icon: Icon, children }) => (
            <li key={id}>
              <AdminNavLink href={href} currentPath={currentPath} onNavigate={onNavigate}>
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {t(label)}
              </AdminNavLink>
              {children && children.length > 0 && (
                <ul className="ml-4 mt-1 space-y-1 border-l border-border-subtle pl-2">
                  {children.map((child) => (
                    <li key={child.href}>
                      <AdminNavLink
                        href={child.href}
                        currentPath={currentPath}
                        onNavigate={onNavigate}
                      >
                        {t(child.label)}
                      </AdminNavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="shrink-0 space-y-2 border-t border-border-subtle p-3">
        <AdminNavLink
          href={adminAccountNavItem.href}
          currentPath={currentPath}
          onNavigate={onNavigate}
        >
          <AccountIcon className="size-4 shrink-0" aria-hidden="true" />
          {t(adminAccountNavItem.label)}
        </AdminNavLink>
        <Link
          href={adminPaths.publicSite}
          className={cn(rowClassName, idleRowClassName)}
          onClick={onNavigate}
        >
          <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
          {t("viewWebsite")}
        </Link>
        <div className="space-y-1 rounded-lg bg-surface-subtle px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <p className="min-w-0 break-words text-sm font-semibold text-primary-900">
              {staff.fullName}
            </p>
            <Badge variant="primary" size="sm" className="shrink-0">
              {t(staff.role === "super_admin" ? "superAdmin" : "admin")}
            </Badge>
          </div>
          <p className="truncate text-xs text-text-secondary" title={staff.email}>
            {staff.email}
          </p>
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
      <BrandLogo
        variant="crest"
        size="sm"
        inverted={inverse}
        showText={false}
        className="shrink-0"
      />
      <span
        className={cn(
          "truncate text-sm font-bold tracking-tight",
          inverse ? "text-text-inverse" : "text-primary-900"
        )}
      >
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
        <div className="bg-primary-900 px-4 py-3.5">
          <PortalBrand inverse />
        </div>
        <AdminSidebar {...sidebarProps} />
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-40 flex min-h-14 items-center justify-between gap-3 border-b border-border-subtle bg-surface-card px-4 lg:hidden">
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
            <DialogContent className="inset-y-0 left-0 top-0 flex h-dvh max-h-none w-[min(20rem,90vw)] max-w-none translate-none flex-col gap-0 overflow-y-auto rounded-none border-0 border-r p-0 duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none [&>button]:right-2 [&>button]:top-1.5 [&>button]:grid [&>button]:size-11 [&>button]:place-items-center [&>button]:text-text-inverse [&>button:hover]:bg-primary-800">
              <div className="border-b border-border-subtle bg-primary-900 py-3 pr-14 pl-4">
                <PortalBrand inverse />
                <DialogTitle className="sr-only">{t("navigation")}</DialogTitle>
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
