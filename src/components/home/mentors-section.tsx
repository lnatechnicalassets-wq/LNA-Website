import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { Mentor } from "@/lib/content";
import { Badge } from "@/components/ui";

export interface MentorsSectionProps {
  mentors: Mentor[];
}

const mentorImages: Record<string, string> = {
  "mentor-leadership-lead": "/images/mentor-tariq.jpg",
  "mentor-finance-lead": "/images/mentor-kamrul.jpg",
  "mentor-digital-lead": "/images/mentor-anisur.jpg",
};

export function MentorsSection({ mentors }: MentorsSectionProps) {
  if (!mentors || mentors.length === 0) {
    return null;
  }

  return (
    <section
      id="mentors"
      aria-labelledby="mentors-heading"
      className="py-20 sm:py-28 bg-surface-base border-b border-border-subtle"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="primary" size="sm" className="mb-3 font-semibold uppercase">
            Executive Faculty
          </Badge>
          <h2
            id="mentors-heading"
            className="text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl lg:text-5xl"
          >
            Led by Industry Veterans &amp; Practitioners
          </h2>
          <p className="mt-4 text-base sm:text-lg text-text-secondary">
            Learn directly from managing directors, financial controllers, and regulatory
            specialists with decades of proven corporate leadership in Bangladesh.
          </p>
        </div>

        {/* Portrait-Led Faculty Grid - Inspired by Modern Mentor Reference */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
          {mentors.map((mentor) => {
            const imagePath = mentorImages[mentor.id] || "/images/mentor-tariq.jpg";

            return (
              <div
                key={mentor.id}
                className="group flex flex-col justify-between rounded-3xl bg-white border border-border-subtle p-5 shadow-xs hover:shadow-xl transition-all duration-300"
              >
                <div>
                  {/* Portrait Photography Container (aspect-ratio preserved) */}
                  <div className="relative h-72 sm:h-80 w-full rounded-2xl overflow-hidden bg-surface-muted shadow-inner">
                    <Image
                      src={imagePath}
                      alt={mentor.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {mentor.isPlaceholder && (
                      <span className="absolute top-3 right-3 text-[9px] uppercase tracking-wider text-primary-900 bg-white/95 backdrop-blur-xs border border-accent/60 px-2 py-0.5 rounded-full font-mono shadow-xs">
                        Illustrative Demo
                      </span>
                    )}
                  </div>

                  {/* Mentor Details */}
                  <div className="pt-5 space-y-1.5">
                    <h3 className="text-xl font-bold text-text-primary tracking-tight">
                      {mentor.name}
                    </h3>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                      {mentor.role}
                    </p>
                    <p className="text-xs font-medium text-text-muted">{mentor.organization}</p>
                    <p className="text-xs text-text-secondary leading-relaxed pt-2 line-clamp-3">
                      {mentor.bio}
                    </p>
                  </div>
                </div>

                {/* Footer Action */}
                {mentor.courseId && (
                  <div className="mt-6 pt-4 border-t border-border-subtle flex items-center justify-between">
                    <Link
                      href={`/courses/${mentor.courseId}`}
                      className="inline-flex items-center text-xs font-semibold text-primary hover:text-primary-700 transition-colors group-hover:underline"
                    >
                      <span>View Directed Program</span>
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
