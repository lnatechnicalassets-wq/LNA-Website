"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { DemoLogo } from "@/components/ui/demo-logo";
import { Button } from "@/components/ui/button";
import { MobileNav } from "./mobile-nav";
import { cn } from "@/lib/utils";
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
  const pathname = usePathname();
  const { header } = navigation;

  const handleNavClick = (href: string) => (e: React.MouseEvent) => {
    if (
      href.startsWith("/#") &&
      typeof window !== "undefined" &&
      window.location.pathname === "/"
    ) {
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
    <header
      className={cn(
        "sticky top-0 z-50 w-full bg-surface-base/95 backdrop-blur-md border-b border-border-subtle shadow-xs transition-shadow duration-200",
        className
      )}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Logo Brand Lockup */}
        <Link
          href="/"
          className="flex items-center shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          aria-label={`${organization.name} Home`}
        >
          <DemoLogo
            variant="full"
            size="md"
            name={organization.name}
            showTagline={false}
            showDemoBadge={false}
          />
        </Link>

        {/* Desktop Navigation Links */}
        <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-1 lg:gap-2">
          {header.navItems.map((item) => {
            const isNews =
              item.href === "/news" &&
              (pathname === "/news" || Boolean(pathname?.startsWith("/news/")));
            const isAbout =
              item.href === "/about" &&
              (pathname === "/about" || Boolean(pathname?.startsWith("/about/")));
            const isActive = isNews || isAbout;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick(item.href)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 cursor-pointer",
                  isActive
                    ? "text-[#086477] font-bold"
                    : "text-text-secondary hover:text-primary-900 hover:bg-surface-muted rounded-lg"
                )}
              >
                {item.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#086477] rounded-full"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
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
