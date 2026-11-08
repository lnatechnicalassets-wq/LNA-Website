"use client";

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { DemoLogo } from "@/components/ui/demo-logo";
import { Button } from "@/components/ui/button";
import { MobileNav } from "./mobile-nav";
import type { NavigationConfig, Organization } from "@/lib/content";

export interface SiteHeaderProps {
  navigation: NavigationConfig;
  organization: Organization;
  className?: string;
}

/**
 * Accessible SiteHeader component (WCAG 2.2 AA).
 * Sticky top navigation shell with responsive drawer and demo banner.
 */
export function SiteHeader({ navigation, organization, className = "" }: SiteHeaderProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { header } = navigation;

  const handleNavClick = (href: string) => (e: React.MouseEvent) => {
    if (href.startsWith("/#") && typeof window !== "undefined" && window.location.pathname === "/") {
      const id = href.replace("/#", "");
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth" });
        window.history.pushState(null, "", href);
      }
    }
  };

  return (
    <header className={`w-full ${className}`} role="banner">
      {/* Top Demo Branding Bar */}
      <div className="bg-primary-950 text-text-inverse px-4 sm:px-6 py-1.5 text-xs border-b border-primary-900">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 min-w-0">
          <div className="flex items-center gap-2 min-w-0 truncate">
            <span
              className="inline-block w-2 h-2 rounded-full bg-accent-400 shrink-0"
              aria-hidden="true"
            />
            <span className="font-medium truncate">
              {organization.name} · Development Preview (Gate B0 Demo Branding)
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-text-inverse-muted shrink-0 text-[11px]">
            <span>{organization.phone}</span>
            <span aria-hidden="true">·</span>
            <span>{organization.email}</span>
          </div>
        </div>
      </div>

      {/* Main Sticky Navigation Bar */}
      <div className="sticky top-0 z-40 w-full bg-surface-base/95 backdrop-blur-md border-b border-border-subtle shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Logo Brand Lockup */}
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            aria-label={`${organization.name} Home`}
          >
            <DemoLogo size="md" showTagline={false} showDemoBadge={true} />
          </Link>

          {/* Desktop Navigation Links */}
          <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-1 lg:gap-2">
            {header.navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick(item.href)}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-text-secondary hover:text-primary-900 hover:bg-surface-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 cursor-pointer"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Right CTA Actions */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href={header.cta.href} onClick={handleNavClick(header.cta.href)}>
              <Button variant="primary" size="md" className="cursor-pointer">
                {header.cta.label}
              </Button>
            </Link>
          </div>

          {/* Mobile Hamburger Trigger */}
          <div className="flex lg:hidden items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              aria-label="Open Navigation Menu"
              aria-expanded={mobileOpen}
              className="text-primary-900 hover:bg-surface-muted min-h-[44px] min-w-[44px]"
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <MobileNav
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        navItems={header.navItems}
        cta={header.cta}
        organization={organization}
      />
    </header>
  );
}
