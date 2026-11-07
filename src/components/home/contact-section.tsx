"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { UserCheck, Calendar, CreditCard, HelpCircle } from "lucide-react";
import { ContactConfig, ContactShortcut } from "@/lib/content";
import { ContactForm } from "./contact-form";
import { ContactInfo } from "./contact-info";
import { cn } from "@/lib/utils";

interface ContactSectionProps {
  config: ContactConfig;
}

function getShortcutIcon(icon: ContactShortcut["icon"]) {
  switch (icon) {
    case "register":
      return <UserCheck className="w-4 h-4 text-primary-700" aria-hidden="true" />;
    case "schedule":
      return <Calendar className="w-4 h-4 text-primary-700" aria-hidden="true" />;
    case "fee":
      return <CreditCard className="w-4 h-4 text-primary-700" aria-hidden="true" />;
    case "support":
    default:
      return <HelpCircle className="w-4 h-4 text-primary-700" aria-hidden="true" />;
  }
}

export function ContactSection({ config }: ContactSectionProps) {
  // Preselect the first category by default
  const [selectedCategory, setSelectedCategory] = useState<string>(
    config.categories[0]?.value || "registration"
  );

  const formRef = useRef<HTMLFormElement>(null);

  const handleShortcutClick = (categoryValue: string) => {
    setSelectedCategory(categoryValue);
    // Smoothly scroll or focus into form
    if (formRef.current) {
      const firstInput = formRef.current.querySelector<HTMLInputElement>("input[name='name']");
      if (firstInput) {
        firstInput.focus();
      }
    }
  };

  return (
    <section
      id="contact"
      aria-label="Contact Us"
      className="relative w-full py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-[#F0F7F7] via-[#F6FAFA] to-white overflow-hidden scroll-mt-20"
    >
      {/* Subtle ambient gradients */}
      <div
        className="absolute top-1/4 left-0 w-96 h-96 bg-teal-100/25 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-10 right-0 w-96 h-96 bg-accent-100/20 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 xl:gap-10 items-start">
          {/* Left Column (Zone 1): Introduction, 4 Enquiry Shortcuts & Desk Visual */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col items-start">
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-0.5 bg-primary-700" aria-hidden="true" />
              <span className="text-xs font-bold tracking-widest text-primary-800 uppercase">
                {config.eyebrow}
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-text-primary tracking-tight leading-[1.15]">
              Get in{" "}
              <span className="relative inline-block text-primary-800">
                Touch
                <svg
                  className="absolute -bottom-2.5 left-0 w-full h-3 text-accent-500/90 overflow-visible"
                  viewBox="0 0 100 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8.5C25 3 65 3 97 9"
                    stroke="currentColor"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h2>

            {/* Description */}
            <p className="mt-4 text-xs sm:text-sm text-text-secondary leading-relaxed max-w-sm">
              {config.description}
            </p>

            {/* 4 Interactive Enquiry Shortcut Cards in a 2x2 Grid */}
            <div className="w-full mt-6 grid grid-cols-2 gap-2.5 sm:gap-3 max-w-md">
              {config.shortcuts.map((shortcut) => {
                const isActive = selectedCategory === shortcut.categoryValue;

                return (
                  <button
                    key={shortcut.id}
                    type="button"
                    onClick={() => handleShortcutClick(shortcut.categoryValue)}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2 min-h-[52px]",
                      isActive
                        ? "bg-primary-900 border-primary-900 text-white shadow-sm ring-1 ring-primary-700"
                        : "bg-white/95 border-teal-100/90 text-text-primary hover:border-teal-300 hover:bg-teal-50/50 shadow-xs"
                    )}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                        isActive
                          ? "bg-white/15 border-white/20 text-white"
                          : "bg-teal-50 border-teal-100 text-primary-700"
                      )}
                    >
                      {getShortcutIcon(shortcut.icon)}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-semibold leading-tight",
                        isActive ? "text-white" : "text-text-primary"
                      )}
                    >
                      {shortcut.title}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Desk / Study Visual (Laptop + Plant + Notebook) */}
            <div className="hidden sm:block relative w-full max-w-[320px] aspect-[16/10] mt-6 sm:mt-8 rounded-2xl overflow-hidden bg-white/60 p-2 border border-teal-100/60 shadow-xs">
              <div className="relative w-full h-full rounded-xl overflow-hidden">
                <Image
                  src="/images/contact-desk.jpg"
                  alt="Lead Nation Academy executive advisory desk setup"
                  fill
                  sizes="320px"
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          {/* Center Column (Zone 2): Elevated Contact Form Card */}
          <div className="lg:col-span-7 xl:col-span-5 w-full">
            <ContactForm
              categories={config.categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              formRef={formRef}
            />
          </div>

          {/* Right Column (Zone 3): Contact Information Panel */}
          <div className="lg:col-span-12 xl:col-span-3 w-full">
            <ContactInfo config={config} />
          </div>
        </div>
      </div>
    </section>
  );
}
