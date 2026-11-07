"use client";

import React, { useState } from "react";
import { BarChart2, GraduationCap, Briefcase, Star, Info } from "lucide-react";
import type { IrgpOutcomes } from "@/lib/content";

export interface IrgpOutcomesStripProps {
  outcomes: IrgpOutcomes;
}

function getOutcomeIcon(iconName: string) {
  switch (iconName.toLowerCase()) {
    case "graduationcap":
      return <GraduationCap className="w-4 h-4 text-[#086477]" />;
    case "briefcase":
      return <Briefcase className="w-4 h-4 text-[#086477]" />;
    case "star":
      return <Star className="w-4 h-4 fill-[#086477] text-[#086477]" />;
    default:
      return <BarChart2 className="w-4 h-4 text-[#086477]" />;
  }
}

export function IrgpOutcomesStrip({ outcomes }: IrgpOutcomesStripProps) {
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const publishedMetrics = outcomes.metrics.filter((m) => m.published !== false);

  if (publishedMetrics.length === 0) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="IRGP Program Outcomes"
      className="relative rounded-2xl sm:rounded-3xl bg-white/90 backdrop-blur-md border border-teal-100/90 shadow-sm p-4 sm:p-5 lg:p-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-center">
        {/* Left Section: Section Title & Subheading */}
        <div className="lg:col-span-4 flex items-center gap-3 pr-0 lg:pr-4 lg:border-r border-teal-100/80">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#086477] shrink-0">
            <BarChart2 className="w-5 h-5 text-[#086477]" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider text-[#086477] uppercase block font-sans">
              {outcomes.heading}
            </span>
            <span className="text-xs text-text-secondary font-medium">{outcomes.subheading}</span>
          </div>
        </div>

        {/* Right Section: Configurable Published Metrics */}
        <div
          className={`lg:col-span-8 grid grid-cols-1 sm:grid-cols-${Math.min(
            publishedMetrics.length,
            3
          )} gap-3 sm:gap-4 sm:divide-x divide-teal-100/80`}
        >
          {publishedMetrics.map((metric) => (
            <div
              key={metric.id}
              className="relative flex items-center justify-between sm:justify-start gap-3 sm:px-4 first:sm:pl-0 last:sm:pr-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-teal-50/80 border border-teal-100/70 flex items-center justify-center shrink-0">
                  {getOutcomeIcon(metric.icon)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    {metric.isVerified && metric.metric ? (
                      <span className="text-xl sm:text-2xl font-bold font-serif text-[#172E35]">
                        {metric.metric}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-[#086477] border border-teal-200/80 shadow-2xs">
                        {metric.statusText || "Pending Audit"}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-text-secondary font-medium block mt-0.5">
                    {metric.label}
                  </span>
                </div>
              </div>

              {/* Info Tooltip Trigger */}
              {metric.tooltip && (
                <div className="relative">
                  <button
                    type="button"
                    aria-label={`About ${metric.label}: ${metric.tooltip}`}
                    aria-expanded={activeTooltipId === metric.id}
                    onClick={() =>
                      setActiveTooltipId(activeTooltipId === metric.id ? null : metric.id)
                    }
                    onMouseEnter={() => setActiveTooltipId(metric.id)}
                    onMouseLeave={() => setActiveTooltipId(null)}
                    className="p-1 rounded-full text-teal-400 hover:text-[#086477] hover:bg-teal-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#086477]"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>

                  {/* Tooltip Popover */}
                  {activeTooltipId === metric.id && (
                    <div
                      role="tooltip"
                      className="absolute bottom-full right-0 sm:left-1/2 sm:-translate-x-1/2 mb-2 w-56 sm:w-64 p-2.5 rounded-xl bg-[#172E35] text-white text-[11px] leading-relaxed shadow-xl z-30 pointer-events-none animate-in fade-in duration-150"
                    >
                      <p>{metric.tooltip}</p>
                      {!metric.isVerified && (
                        <p className="mt-1 text-teal-300 font-medium text-[10px]">
                          Official data audit in progress by Lead Nation Academy.
                        </p>
                      )}
                      <div className="absolute top-full right-3 sm:left-1/2 sm:-translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#172E35]" />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
