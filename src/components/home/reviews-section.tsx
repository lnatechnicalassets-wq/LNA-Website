"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Quote, ShieldCheck } from "lucide-react";
import type { Review } from "@/lib/content";
import { Badge, Button } from "@/components/ui";

export interface ReviewsSectionProps {
  reviews: Review[];
}

export function ReviewsSection({ reviews }: ReviewsSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!reviews || reviews.length === 0) {
    return null;
  }

  const totalReviews = reviews.length;

  const nextReview = () => {
    setCurrentIndex((prev) => (prev + 1) % totalReviews);
  };

  const prevReview = () => {
    setCurrentIndex((prev) => (prev - 1 + totalReviews) % totalReviews);
  };

  const currentReview = reviews[currentIndex];

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="py-20 sm:py-28 bg-surface-subtle border-b border-border-subtle"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <div>
            <Badge variant="primary" size="sm" className="mb-3 font-semibold uppercase">
              Executive Testimonials
            </Badge>
            <h2
              id="reviews-heading"
              className="text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl lg:text-5xl"
            >
              Voices from the Cohort
            </h2>
            <p className="mt-4 max-w-2xl text-base sm:text-lg text-text-secondary">
              Perspectives from corporate directors and enterprise leaders who completed our offline
              executive programs.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-text-secondary bg-white border border-border-subtle px-3.5 py-2 rounded-full shrink-0 shadow-2xs">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="font-medium">Consented Corporate Feedback</span>
          </div>
        </div>

        {/* Editorial Testimonial Showcase Card - Pure White with Subtle Border */}
        <div className="relative rounded-3xl border border-border-subtle bg-white p-8 sm:p-14 shadow-md max-w-4xl mx-auto">
          <Quote className="h-12 w-12 text-primary/20 mb-6" aria-hidden="true" />

          <blockquote className="text-xl sm:text-2xl md:text-3xl font-serif italic text-text-primary leading-relaxed min-h-[90px] flex items-center">
            &ldquo;{currentReview.quote}&rdquo;
          </blockquote>

          <div className="mt-10 flex flex-col sm:flex-row sm:items-center justify-between border-t border-border-subtle pt-6 gap-6">
            <div>
              <span className="text-base font-bold text-text-primary block">
                {currentReview.author}
              </span>
              <span className="text-xs font-semibold text-primary block mt-0.5">
                {currentReview.designation}, {currentReview.company}
              </span>
              <span className="text-xs text-text-muted font-mono block mt-1">
                {currentReview.cohort}
              </span>
            </div>

            {/* Manual Navigation Controls (FR-PUB-006: strictly manual, no autoplay) */}
            <div className="flex items-center space-x-3 shrink-0">
              <span className="text-xs text-text-muted font-mono font-medium">
                {currentIndex + 1} of {totalReviews}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={prevReview}
                aria-label="Previous testimonial"
                className="h-9 w-9 p-0 rounded-full border-border-default text-text-primary hover:bg-surface-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={nextReview}
                aria-label="Next testimonial"
                className="h-9 w-9 p-0 rounded-full border-border-default text-text-primary hover:bg-surface-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
