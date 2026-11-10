"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

export interface PublicChromeGateProps {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Suppresses the public marketing header and footer when rendering dedicated
 * internal staff portal routes (/admin/**) while preserving them across all
 * public routes and component unit tests where pathname is null.
 */
export function PublicChromeGate({ header, footer, children }: PublicChromeGateProps) {
  const pathname = usePathname();
  const isAdminRoute = Boolean(pathname?.startsWith("/admin"));

  return (
    <>
      {!isAdminRoute && header}
      {children}
      {!isAdminRoute && footer}
    </>
  );
}

