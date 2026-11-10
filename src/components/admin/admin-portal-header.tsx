"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogOut, ClipboardList } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import type { VerifiedStaffContext } from "@/server/auth/require-staff";

export interface AdminPortalHeaderProps {
  staff: VerifiedStaffContext;
  onSignOut?: () => void | Promise<void>;
}

export function AdminPortalHeader({ staff, onSignOut }: AdminPortalHeaderProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      if (onSignOut) {
        await onSignOut();
        return;
      }
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-surface-card border-b border-border-subtle shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <Link
            href="/admin/enrollments"
            className="inline-flex items-center gap-2.5 min-h-[44px] pr-2 text-primary-900 font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 rounded-lg"
          >
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary-800 text-text-inverse shrink-0">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm sm:text-base font-bold text-primary-900">
                Lead Nation Academy
              </span>
              <span className="text-[11px] font-medium text-text-secondary">
                Superadmin Enrollment Desk
              </span>
            </span>
          </Link>

          <nav aria-label="Admin navigation" className="hidden sm:flex items-center gap-2 ml-2">
            <Link
              href="/admin/enrollments"
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-primary-50 text-primary-900 border border-primary-200 hover:bg-primary-100 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            >
              <ClipboardList className="w-4 h-4 text-primary-800" aria-hidden="true" />
              <span>Enrollments</span>
            </Link>
          </nav>

          <Badge variant="info" size="sm">
            Read-Only Release
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden md:flex flex-col items-end text-right leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-text-primary">{staff.fullName}</span>
              <Badge variant="primary" size="sm">
                Super Admin
              </Badge>
              <Badge variant="success" size="sm">
                AAL2
              </Badge>
            </div>
            <span className="text-[11px] text-text-secondary">{staff.email}</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="md"
            isLoading={signingOut}
            onClick={handleSignOut}
            className="min-h-[44px] px-4"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

