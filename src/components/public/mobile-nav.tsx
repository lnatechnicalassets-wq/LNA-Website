"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Phone, Mail, MapPin } from "lucide-react";
import { DemoLogo } from "@/components/ui/demo-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NavItem, Organization } from "@/lib/content";

export interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navItems: NavItem[];
  cta: NavItem;
  organization?: Organization;
}

/**
 * Accessible responsive mobile navigation drawer (WCAG 2.2 AA).
 * Features focus trapping, Escape key dismissal, and generous touch targets.
 */
export function MobileNav({ open, onOpenChange, navItems, cta, organization }: MobileNavProps) {
  const pathname = usePathname();
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Backdrop Overlay */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Slide-out Drawer */}
        <DialogPrimitive.Content
          aria-label="Mobile Navigation Menu"
          className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-xs sm:max-w-sm flex-col justify-between bg-surface-card p-6 shadow-2xl border-l border-border-subtle data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-200"
        >
          {/* Accessible Title & Description for Screen Readers (Radix WCAG 2.2 AA) */}
          <DialogPrimitive.Title className="sr-only">Mobile Navigation Menu</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Navigation links, quick courses CTA, and academy contact information
          </DialogPrimitive.Description>

          {/* Top Lockup & Close Button */}
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
              <DemoLogo size="sm" showTagline={false} showDemoBadge={false} />
              <DialogPrimitive.Close
                className="rounded-lg p-2 text-text-muted hover:text-primary-900 hover:bg-surface-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </DialogPrimitive.Close>
            </div>

            {/* Navigation Links List */}
            <nav aria-label="Mobile Navigation Links">
              <ul className="space-y-1">
                {navItems.map((item) => {
                  const isNews = item.href === "/news";
                  const isActive = isNews && (pathname === "/news" || pathname.startsWith("/news/"));

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => onOpenChange(false)}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex items-center min-h-[44px] px-3 py-2.5 rounded-lg text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
                          isActive
                            ? "text-[#086477] bg-[#E0F3F5] font-bold border-l-4 border-[#086477]"
                            : "text-primary-900 hover:bg-surface-muted hover:text-primary-700"
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Mobile CTA */}
            <div className="pt-2">
              <Link href={cta.href} onClick={() => onOpenChange(false)} className="w-full block">
                <Button variant="primary" size="lg" className="w-full justify-center">
                  {cta.label}
                </Button>
              </Link>
            </div>
          </div>

          {/* Bottom Organization Details */}
          {organization && (
            <div className="pt-6 border-t border-border-subtle space-y-3 text-xs text-text-secondary">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-accent-600 shrink-0" aria-hidden="true" />
                <span>{organization.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent-600 shrink-0" aria-hidden="true" />
                <span>{organization.email}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-accent-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  {organization.address.street}, {organization.address.city}
                </span>
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
