"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Users,
  Calendar,
  MapPin,
  MousePointerClick,
  CreditCard,
  Award,
  Layers,
  HelpCircle,
  Plus,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import { FaqItem } from "@/lib/content";
import { cn } from "@/lib/utils";

interface FaqAccordionProps {
  items: FaqItem[];
}

function getFaqIcon(iconName: FaqItem["icon"]) {
  switch (iconName) {
    case "book":
      return <BookOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-primary-700" aria-hidden="true" />;
    case "users":
      return <Users className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-primary-700" aria-hidden="true" />;
    case "calendar":
      return <Calendar className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-primary-700" aria-hidden="true" />;
    case "map-pin":
      return <MapPin className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-primary-700" aria-hidden="true" />;
    case "pointer":
      return (
        <MousePointerClick
          className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-primary-700"
          aria-hidden="true"
        />
      );
    case "credit-card":
      return (
        <CreditCard className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-primary-700" aria-hidden="true" />
      );
    case "award":
      return <Award className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-primary-700" aria-hidden="true" />;
    case "layers":
      return <Layers className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-primary-700" aria-hidden="true" />;
    case "help":
    default:
      return (
        <HelpCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-primary-700" aria-hidden="true" />
      );
  }
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  // First item open by default per approved specification
  const [openId, setOpenId] = useState<string | null>(items[0]?.id || null);

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div
      className="w-full flex flex-col space-y-3 sm:space-y-3.5"
      role="region"
      aria-label="Frequently Asked Questions Accordion"
    >
      {items.map((item) => {
        const isOpen = openId === item.id;
        const headerId = `faq-header-${item.id}`;
        const panelId = `faq-panel-${item.id}`;

        return (
          <div
            key={item.id}
            className={cn(
              "group rounded-2xl border transition-all duration-300",
              isOpen
                ? "bg-gradient-to-r from-teal-50/60 via-white to-teal-50/40 border-primary-400/80 shadow-[0_12px_30px_-10px_rgba(8,100,119,0.12)] ring-1 ring-primary-300/40"
                : "bg-white/95 border-teal-100/80 shadow-[0_4px_16px_-4px_rgba(8,100,119,0.04)] hover:border-teal-200 hover:shadow-[0_8px_24px_-6px_rgba(8,100,119,0.08)]"
            )}
          >
            <h3>
              <button
                type="button"
                id={headerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggleItem(item.id)}
                className="w-full flex items-center justify-between p-3.5 sm:p-4.5 text-left gap-3.5 focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2 rounded-2xl min-h-[52px]"
              >
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                  <div
                    className={cn(
                      "w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200 border",
                      isOpen
                        ? "bg-primary-100/80 border-primary-200 text-primary-800"
                        : "bg-teal-50/80 border-teal-100/70 text-primary-700 group-hover:bg-teal-100/60"
                    )}
                  >
                    {getFaqIcon(item.icon)}
                  </div>
                  <span
                    className={cn(
                      "text-xs sm:text-sm md:text-base font-semibold leading-snug transition-colors duration-200",
                      isOpen
                        ? "text-primary-950 font-bold"
                        : "text-text-primary group-hover:text-primary-800"
                    )}
                  >
                    {item.question}
                  </span>
                </div>

                <div
                  className={cn(
                    "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 border",
                    isOpen
                      ? "bg-primary-800 text-white border-primary-800 rotate-0"
                      : "bg-teal-50 text-primary-700 border-teal-100 group-hover:bg-primary-100/70"
                  )}
                  aria-hidden="true"
                >
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <Plus className="w-4 h-4 stroke-[2.5] transition-transform duration-300 group-hover:rotate-90" />
                  )}
                </div>
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out",
                isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
              )}
            >
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 text-xs sm:text-sm text-text-secondary leading-relaxed border-t border-teal-100/50 mt-1">
                <p className="font-normal text-text-primary/85">{item.answer}</p>
                {item.courseHref && (
                  <div className="mt-3 pt-2">
                    <Link
                      href={item.courseHref}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-900 focus-visible:outline-2 focus-visible:outline-primary-600 rounded underline-offset-4 hover:underline"
                    >
                      <span>Explore course syllabus and schedule</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
