"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, List } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeadingItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface TableOfContentsProps {
  headings: HeadingItem[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>(headings[0]?.id || "");
  const [mobileExpanded, setMobileExpanded] = useState(false);

  useEffect(() => {
    if (headings.length === 0) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 160;

      for (let i = headings.length - 1; i >= 0; i--) {
        const el = document.getElementById(headings[i].id);
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY;
          if (scrollPosition >= top) {
            setActiveId(headings[i].id);
            return;
          }
        }
      }

      if (headings[0]) {
        setActiveId(headings[0].id);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [headings]);

  if (headings.length < 2) {
    return null;
  }

  const handleLinkClick = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const headerOffset = 100;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      window.history.pushState(null, "", `#${id}`);
      setActiveId(id);
      setMobileExpanded(false);
    }
  };

  return (
    <>
      {/* Mobile Collapsible Header */}
      <div className="lg:hidden mb-6 p-4 rounded-xl bg-white border border-[#E5ECEE] shadow-2xs">
        <button
          type="button"
          onClick={() => setMobileExpanded(!mobileExpanded)}
          aria-expanded={mobileExpanded}
          className="w-full flex items-center justify-between text-left font-serif font-bold text-base text-[#172E35] cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <List className="w-4 h-4 text-[#086477]" aria-hidden="true" />
            <span>In this article</span>
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-[#526E77] transition-transform duration-200",
              mobileExpanded ? "rotate-180" : ""
            )}
            aria-hidden="true"
          />
        </button>

        {mobileExpanded && (
          <nav aria-label="Table of contents" className="mt-3 pt-3 border-t border-[#E5ECEE]">
            <ul className="space-y-2">
              {headings.map((h) => {
                const isActive = activeId === h.id;
                return (
                  <li key={h.id}>
                    <a
                      href={`#${h.id}`}
                      onClick={handleLinkClick(h.id)}
                      className={cn(
                        "block text-sm py-1 transition-colors",
                        isActive
                          ? "text-[#086477] font-bold"
                          : "text-[#526E77] hover:text-[#086477]"
                      )}
                    >
                      {h.text}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>

      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block sticky top-28 self-start w-full">
        <div className="pr-4">
          <h4 className="font-serif font-bold text-lg text-[#172E35] mb-4 tracking-tight">
            In this article
          </h4>

          <nav aria-label="Table of contents">
            <ul className="space-y-2.5 text-sm border-l border-[#D5E2E5]">
              {headings.map((h) => {
                const isActive = activeId === h.id;
                return (
                  <li key={h.id}>
                    <a
                      href={`#${h.id}`}
                      onClick={handleLinkClick(h.id)}
                      className={cn(
                        "block -ml-px pl-3.5 py-0.5 text-sm transition-all",
                        isActive
                          ? "border-l-2 border-[#086477] text-[#086477] font-semibold"
                          : "border-l-2 border-transparent text-[#526E77] hover:text-[#086477] hover:border-[#086477]/40"
                      )}
                    >
                      {h.text}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
}
