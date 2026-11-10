import * as React from "react";
import { getNavigationConfig, getOrganizationConfig } from "@/lib/content";
import { SkipLink } from "./skip-link";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { PublicChromeGate } from "./public-chrome-gate";

export interface PublicShellProps {
  children: React.ReactNode;
  navigationOverride?: ReturnType<typeof getNavigationConfig>;
  organizationOverride?: ReturnType<typeof getOrganizationConfig>;
}

/**
 * Shared Public Layout Shell (Phase 2 Task P2-T3).
 * Provides the top-level landmark structure, skip link, sticky header, main content wrapper, and corporate footer.
 */
export function PublicShell({
  children,
  navigationOverride,
  organizationOverride,
}: PublicShellProps) {
  const navigation = navigationOverride || getNavigationConfig();
  const organization = organizationOverride || getOrganizationConfig();

  return (
    <div className="min-h-screen flex flex-col bg-surface-subtle text-text-primary antialiased selection:bg-primary-100 selection:text-primary-900">
      {/* WCAG 2.2 AA Skip Link */}
      <SkipLink targetId="main-content" />

      <PublicChromeGate
        header={<SiteHeader navigation={navigation} organization={organization} />}
        footer={<SiteFooter navigation={navigation} organization={organization} />}
      >
        {/* Main Content Landmark */}
        <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
      </PublicChromeGate>
    </div>
  );
}
