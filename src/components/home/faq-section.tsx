import React from "react";
import Image from "next/image";
import { HelpCircle, ArrowRight } from "lucide-react";
import { FaqItem } from "@/lib/content";
import { FaqAccordion } from "./faq-accordion";

interface FaqSectionProps {
  faqs: FaqItem[];
}

export function FaqSection({ faqs }: FaqSectionProps) {
  return (
    <section
      id="faq"
      aria-label="Frequently Asked Questions Section"
      className="relative w-full py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-[#F6FAFA] via-white/80 to-[#F0F7F7] overflow-hidden"
    >
      {/* Decorative ambient background waves */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-teal-100/30 via-teal-50/10 to-transparent rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-gradient-to-tr from-accent-200/20 via-teal-100/10 to-transparent rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-start">
          {/* Left Column: Editorial Information, Academic Illustration & Single Contact CTA */}
          <div className="lg:col-span-5 flex flex-col items-start lg:sticky lg:top-24">
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50/90 border border-teal-200/80 shadow-xs mb-4">
              <HelpCircle className="w-3.5 h-3.5 text-primary-700" aria-hidden="true" />
              <span className="text-xs font-bold text-primary-800 tracking-wider uppercase">
                FAQ
              </span>
            </div>

            {/* Editorial Heading with Curved Teal Wave */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-text-primary tracking-tight leading-[1.15]">
              Frequently Asked <br />
              <span className="relative inline-block text-primary-800">
                Questions
                {/* Refined curved aqua SVG flourish */}
                <svg
                  className="absolute -bottom-2.5 left-0 w-full h-3 text-accent-500/90 overflow-visible"
                  viewBox="0 0 160 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8.5C40 2.5 110 2 157 9"
                    stroke="currentColor"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h2>

            {/* Supporting Description */}
            <p className="mt-5 text-sm sm:text-base text-text-secondary leading-relaxed max-w-md">
              Find answers to common questions about our programs, including curriculum details,
              class schedules, registration, campus location, payment, and certification.
            </p>

            {/* Academic Illustration Visual (Books + Graduation Cap + Plant) */}
            <div className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-[4/3] my-6 sm:my-8 rounded-2xl overflow-hidden bg-white/60 p-2 border border-teal-100/60 shadow-sm">
              <div className="relative w-full h-full rounded-xl overflow-hidden">
                <Image
                  src="/images/faq-academic.jpg"
                  alt="Lead Nation Academy academic resources and graduation cap"
                  fill
                  sizes="(max-width: 640px) 280px, 320px"
                  className="object-cover"
                />
              </div>
            </div>

            {/* Single Prominent Deep Teal Contact Us Button */}
            <a
              href="#contact"
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-primary-800 hover:bg-primary-700 active:bg-primary-900 text-white font-medium text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2 min-h-[48px]"
            >
              <span>Contact Us</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>

          {/* Right Column: Premium Accordion Cards */}
          <div className="lg:col-span-7 w-full pt-2 lg:pt-0">
            <FaqAccordion items={faqs} />
          </div>
        </div>
      </div>
    </section>
  );
}
