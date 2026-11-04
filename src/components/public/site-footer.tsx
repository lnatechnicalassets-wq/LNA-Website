import * as React from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { DemoLogo } from "@/components/ui/demo-logo";
import type { NavigationConfig, Organization } from "@/lib/content";

export interface SiteFooterProps {
  navigation: NavigationConfig;
  organization: Organization;
  className?: string;
}

/**
 * Accessible SiteFooter component (WCAG 2.2 AA).
 * Semantic corporate footer with multi-column links, contact info, and demo notice.
 */
export function SiteFooter({ navigation, organization, className = "" }: SiteFooterProps) {
  const { footer } = navigation;

  return (
    <footer
      className={`bg-surface-card border-t border-border-subtle text-text-primary ${className}`}
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-12">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand & Organization Column */}
          <div className="lg:col-span-2 space-y-4">
            <DemoLogo size="md" showTagline={true} showDemoBadge={true} />
            <p className="text-sm text-text-secondary max-w-sm leading-relaxed">
              Executive leadership, corporate governance, and professional development programs
              designed for Bangladesh&apos;s future leaders.
            </p>

            <div className="pt-2 space-y-2.5 text-xs text-text-secondary">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent-600 shrink-0" aria-hidden="true" />
                <span>
                  {organization.address.street}, {organization.address.city} -{" "}
                  {organization.address.postalCode}, {organization.address.country}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-accent-600 shrink-0" aria-hidden="true" />
                <span>{organization.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent-600 shrink-0" aria-hidden="true" />
                <span>{organization.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent-600 shrink-0" aria-hidden="true" />
                <span>{organization.businessHours}</span>
              </div>
            </div>
          </div>

          {/* Dynamic Navigation Columns */}
          {footer.columns.map((col) => (
            <div key={col.title} className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary-900">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-text-secondary hover:text-primary-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 rounded"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Divider & Legal Notes */}
        <div className="pt-8 border-t border-border-subtle flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <p>{footer.bottomNote}</p>
          <p className="text-[11px] text-center md:text-right max-w-md">{footer.demoNotice}</p>
        </div>
      </div>
    </footer>
  );
}
