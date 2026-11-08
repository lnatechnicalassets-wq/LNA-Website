"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ArrowUp, Mail, Phone, MapPin } from "lucide-react";
import type { NavigationConfig, Organization } from "@/lib/content";

export interface SiteFooterProps {
  navigation?: NavigationConfig;
  organization?: Organization;
  className?: string;
}

/**
 * Redesigned Pearl-and-Teal SiteFooter.
 * Matches approved editorial design with top CTA strip, 4-column link layout,
 * verified contact destinations, and deep teal legal bar.
 */
export function SiteFooter({ organization, className = "" }: SiteFooterProps) {
  const currentYear = new Date().getFullYear();
  const orgEmail = organization?.email || "info@lnabd.org";
  const orgPhone = organization?.phone || "+880 1700-000000";

  const handleScrollTo = (id: string) => (e: React.MouseEvent) => {
    if (typeof window !== "undefined") {
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleBackToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer
      className={`bg-[#F6FAFA] text-[#172E35] border-t-2 border-[#086477] ${className}`}
      role="contentinfo"
    >
      {/* 1. Top Strip: CTA + Anchor */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-2xl sm:text-3xl font-serif font-normal text-[#172E35] tracking-tight">
          Your next step starts here.
        </h3>
        <Link
          href="/#courses"
          onClick={handleScrollTo("courses")}
          className="inline-flex items-center gap-1.5 text-base font-semibold text-[#086477] underline hover:text-[#06505F] transition-colors self-start sm:self-auto cursor-pointer"
        >
          <span>Explore our programs</span>
          <ArrowRight className="w-4 h-4" strokeWidth={2} />
        </Link>
      </div>

      {/* Fine Horizontal Rule */}
      <div className="w-full h-px bg-[#E5ECEE]" />

      {/* 2. Main 4-Column Footer Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Column 1: Brand & Domain */}
          <div className="space-y-3">
            <h4 className="text-2xl font-serif font-bold text-[#172E35] tracking-tight">
              Lead Nation Academy
            </h4>
            <p className="text-sm text-[#526E77] leading-relaxed max-w-xs">
              Practical learning, industry guidance, and career preparation.
            </p>

            <div className="pt-2">
              <Link
                href="/"
                className="text-sm font-semibold text-[#086477] underline hover:text-[#06505F] transition-colors"
              >
                lnabd.org
              </Link>
            </div>
          </div>

          {/* Column 2: Programs */}
          <div>
            <h4 className="text-lg font-serif font-bold text-[#172E35] mb-3.5">Programs</h4>
            <ul className="space-y-2.5 text-sm text-[#526E77]">
              <li>
                <Link
                  href="/#courses"
                  onClick={handleScrollTo("courses")}
                  className="hover:text-[#086477] transition-colors cursor-pointer"
                >
                  Courses &amp; Programs
                </Link>
              </li>
              <li>
                <Link
                  href="/courses/mto-readiness"
                  className="hover:text-[#086477] transition-colors"
                >
                  MTO Readiness Program
                </Link>
              </li>
              <li>
                <Link
                  href="/courses/irgp"
                  className="hover:text-[#086477] transition-colors"
                >
                  IRGP Program Story
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Explore */}
          <div>
            <h4 className="text-lg font-serif font-bold text-[#172E35] mb-3.5">Explore</h4>
            <ul className="space-y-2.5 text-sm text-[#526E77]">
              <li>
                <Link
                  href="/#internships"
                  onClick={handleScrollTo("internships")}
                  className="hover:text-[#086477] transition-colors cursor-pointer"
                >
                  Internship Opportunities
                </Link>
              </li>
              <li>
                <Link
                  href="/#mentors"
                  onClick={handleScrollTo("mentors")}
                  className="hover:text-[#086477] transition-colors cursor-pointer"
                >
                  Our Mentors
                </Link>
              </li>
              <li>
                <Link
                  href="/#reviews"
                  onClick={handleScrollTo("reviews")}
                  className="hover:text-[#086477] transition-colors cursor-pointer"
                >
                  Learner Experiences
                </Link>
              </li>
              <li>
                <Link
                  href="/news"
                  className="hover:text-[#086477] transition-colors"
                >
                  News &amp; Updates
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Campus */}
          <div>
            <h4 className="text-lg font-serif font-bold text-[#172E35] mb-3.5">Contact</h4>
            <p className="text-sm text-[#526E77] leading-snug mb-3">
              Have a question about a program or enrollment?
            </p>
            <ul className="space-y-2 text-sm text-[#526E77]">
              <li>
                <a
                  href={`mailto:${orgEmail}`}
                  className="inline-flex items-center gap-2 hover:text-[#086477] transition-colors font-medium text-[#172E35]"
                >
                  <Mail className="w-3.5 h-3.5 text-[#086477] shrink-0" />
                  <span>{orgEmail}</span>
                </a>
              </li>
              <li>
                <a
                  href={`tel:${orgPhone.replace(/\s+/g, "")}`}
                  className="inline-flex items-center gap-2 hover:text-[#086477] transition-colors font-medium text-[#172E35]"
                >
                  <Phone className="w-3.5 h-3.5 text-[#086477] shrink-0" />
                  <span>{orgPhone}</span>
                </a>
              </li>
              <li className="flex items-start gap-2 pt-1 text-xs text-[#526E77]">
                <MapPin className="w-3.5 h-3.5 text-[#086477] shrink-0 mt-0.5" />
                <span>Dhanmondi, Dhaka, Bangladesh</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3. Deep Teal Bottom Bar */}
      <div className="bg-[#086477] text-[#E2ECEE] py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
          <p>© {currentYear} Lead Nation Academy. All rights reserved.</p>
          <button
            type="button"
            onClick={handleBackToTop}
            className="inline-flex items-center gap-1 text-white hover:text-[#C5E2E5] transition-colors font-medium cursor-pointer"
          >
            <span>Back to top</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
