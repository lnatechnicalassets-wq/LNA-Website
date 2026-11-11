"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ArrowUp, Mail, MapPin, Phone } from "lucide-react";
import type { NavigationConfig, Organization } from "@/lib/content";

export interface SiteFooterProps {
  navigation?: NavigationConfig;
  organization?: Organization;
  className?: string;
}

/**
 * Deep Teal Editorial SiteFooter.
 * Matches approved visual reference with left-hand headline, soft-teal Enroll Now CTA,
 * Explore, Policies, & Get in touch columns, thin vertical column dividers, topographical contour lines,
 * and bottom utility row with smooth Back to top scrolling.
 */
export function SiteFooter({ organization, className = "" }: SiteFooterProps) {
  const currentYear = new Date().getFullYear();
  const orgEmail = organization?.email || "info@lnabd.org";
  const orgPhone = organization?.phone;
  const orgPhoneHref = orgPhone ? `tel:${orgPhone.replace(/[^\d+]/g, "")}` : null;
  const orgAddress = organization?.address
    ? `${organization.address.street}, ${organization.address.city}${
        organization.address.postalCode ? ` ${organization.address.postalCode}` : ""
      }`
    : null;

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

  const handleBackToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer
      className={`relative w-full bg-[#063A46] text-[#E0ECEE] border-t border-[#8ABBC2]/40 overflow-hidden ${className}`}
      role="contentinfo"
    >
      {/* Subtle Topographical Contour Lines along Far-Right Edge */}
      <div
        className="absolute right-0 top-0 bottom-0 w-80 sm:w-96 lg:w-[480px] pointer-events-none overflow-hidden select-none opacity-20"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 500 600"
          fill="none"
          className="w-full h-full object-cover object-right"
          preserveAspectRatio="none"
        >
          <path
            d="M120 0 C180 120, 160 220, 240 320 C320 420, 280 500, 360 600"
            stroke="#C5E2E5"
            strokeWidth="1.2"
          />
          <path
            d="M180 0 C240 140, 210 240, 300 350 C380 440, 340 520, 420 600"
            stroke="#C5E2E5"
            strokeWidth="1.2"
          />
          <path
            d="M240 0 C300 150, 270 260, 360 380 C430 460, 400 530, 470 600"
            stroke="#C5E2E5"
            strokeWidth="1.2"
          />
          <path
            d="M300 0 C360 160, 330 280, 410 400 C470 480, 450 540, 500 600"
            stroke="#C5E2E5"
            strokeWidth="1.2"
          />
          <path
            d="M360 0 C410 170, 390 290, 460 420 C500 490, 480 550, 520 600"
            stroke="#C5E2E5"
            strokeWidth="1.2"
          />
          <path
            d="M60 0 C120 100, 100 200, 180 300 C250 390, 220 480, 300 600"
            stroke="#C5E2E5"
            strokeWidth="1"
            opacity="0.6"
          />
          <path
            d="M0 0 C60 90, 50 180, 120 280 C190 370, 170 460, 240 600"
            stroke="#C5E2E5"
            strokeWidth="1"
            opacity="0.4"
          />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 lg:pt-24 pb-8 sm:pb-12">
        {/* Main Content Layout: Headline & CTA on Left, Navigation Columns on Right */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-12 lg:gap-14 xl:gap-16">
          {/* Left Column: Brand Lockup, Serif Headline, Soft-Teal Enroll Now Button */}
          <div className="max-w-md xl:max-w-lg shrink-0">
            <Link
              href="/"
              className="inline-flex items-center gap-3 sm:gap-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5E2E5] rounded-lg group"
              aria-label={`${organization?.name || "Lead Nation Academy"} Home`}
            >
              <img
                src="/images/brand/logo-crest-white.png"
                alt="Lead Nation Academy Emblem"
                className="h-10 sm:h-12 w-auto object-contain select-none transition-transform duration-200 group-hover:scale-105"
              />
              <span className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Lead Nation Academy
              </span>
            </Link>

            <h2 className="font-serif text-4xl sm:text-5xl lg:text-[54px] font-bold text-white tracking-tight leading-[1.08] mt-6 sm:mt-8 mb-8 sm:mb-10">
              Ready for your
              <br />
              next step?
            </h2>

            <div>
              <Link
                href="/enroll"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-[#C5E2E5] text-[#073A44] hover:bg-[#B5DDE2] transition-colors font-semibold text-sm sm:text-base shadow-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5E2E5]"
              >
                <span>Enroll Now</span>
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </Link>
            </div>
          </div>

          {/* Right Columns: Explore + Divider + Policies + Divider + Get in touch */}
          <div className="flex flex-col sm:flex-row items-start gap-8 sm:gap-6 md:gap-8 lg:gap-8 xl:gap-12 flex-1 justify-end">
            {/* Explore Column */}
            <div className="min-w-[130px] sm:min-w-[135px]">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-white mb-5 sm:mb-6 tracking-tight">
                Explore
              </h3>
              <ul className="space-y-3 sm:space-y-3.5 text-sm sm:text-base text-[#D4E8EB]">
                <li>
                  <Link
                    href="/about"
                    className="hover:text-white transition-colors cursor-pointer block"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#courses"
                    onClick={handleNavClick("/#courses")}
                    className="hover:text-white transition-colors cursor-pointer block"
                  >
                    Courses
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#mentors"
                    onClick={handleNavClick("/#mentors")}
                    className="hover:text-white transition-colors cursor-pointer block"
                  >
                    Mentors
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#internships"
                    onClick={handleNavClick("/#internships")}
                    className="hover:text-white transition-colors cursor-pointer block"
                  >
                    Internship
                  </Link>
                </li>
                <li>
                  <Link
                    href="/news"
                    className="hover:text-white transition-colors cursor-pointer block"
                  >
                    News
                  </Link>
                </li>
              </ul>
            </div>

            {/* Divider */}
            <div
              className="hidden sm:block w-px bg-white/20 self-stretch my-1"
              aria-hidden="true"
            />

            {/* Policies Column */}
            <div className="min-w-[150px] sm:min-w-[160px]">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-white mb-5 sm:mb-6 tracking-tight">
                Policies
              </h3>
              <ul className="space-y-3 sm:space-y-3.5 text-sm sm:text-base text-[#D4E8EB]">
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-white transition-colors cursor-pointer block"
                  >
                    Terms &amp; Conditions
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-white transition-colors cursor-pointer block"
                  >
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>

            {/* Divider */}
            <div
              className="hidden sm:block w-px bg-white/20 self-stretch my-1"
              aria-hidden="true"
            />

            {/* Get in touch Column */}
            <div className="min-w-[190px] sm:min-w-[210px] max-w-[260px]">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-white mb-5 sm:mb-6 tracking-tight">
                Get in touch
              </h3>
              <ul className="space-y-3.5 sm:space-y-4 text-sm sm:text-base text-[#D4E8EB]">
                <li>
                  <Link
                    href="/#contact"
                    onClick={handleNavClick("/#contact")}
                    className="inline-flex items-center gap-3 hover:text-white transition-colors cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-[#C5E2E5] shrink-0" strokeWidth={1.8} />
                    <span>Contact Us</span>
                  </Link>
                </li>
                <li>
                  <a
                    href={`mailto:${orgEmail}`}
                    className="inline-flex items-center gap-3 hover:text-white transition-colors cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-[#C5E2E5] shrink-0" strokeWidth={1.8} />
                    <span>{orgEmail}</span>
                  </a>
                </li>
                {orgPhone && orgPhoneHref && (
                  <li>
                    <a
                      href={orgPhoneHref}
                      className="inline-flex items-center gap-3 hover:text-white transition-colors cursor-pointer"
                    >
                      <Phone className="w-4 h-4 text-[#C5E2E5] shrink-0" strokeWidth={1.8} />
                      <span>{orgPhone}</span>
                    </a>
                  </li>
                )}
                {orgAddress && (
                  <li className="inline-flex items-start gap-3 text-[#D4E8EB]">
                    <MapPin className="w-4 h-4 text-[#C5E2E5] shrink-0 mt-1" strokeWidth={1.8} />
                    <span>{orgAddress}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Horizontal Divider Line */}
        <div className="w-full h-px bg-white/15 mt-14 sm:mt-18 lg:mt-20 mb-6 sm:mb-8" />

        {/* Bottom Utility Row: Copyright on Left, Back to Top on Right */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs sm:text-sm text-[#A9C7CB]">
          <p>© {currentYear} Lead Nation Academy. All rights reserved.</p>

          <button
            type="button"
            onClick={handleBackToTop}
            className="inline-flex items-center gap-1.5 text-[#E0ECEE] hover:text-white transition-colors font-medium cursor-pointer focus-visible:outline-hidden"
          >
            <span>Back to top</span>
            <ArrowUp className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </footer>
  );
}
