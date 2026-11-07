"use client";

import React, { useState, useEffect, useRef } from "react";
import { GraduationCap, Briefcase, Star, ArrowRight } from "lucide-react";
import type { Review } from "@/lib/content";
import { ReviewsCarousel } from "./reviews-carousel";
import { CommunityBanner } from "./community-banner";
import { ReviewsModal } from "./reviews-modal";

export interface ReviewsSectionProps {
  reviews: Review[];
  metrics?: {
    learnersTrained?: string;
    careerProgress?: string;
    learnerRating?: string;
    communityCount?: string;
  };
}

export function ReviewsSection({
  reviews,
  metrics = {
    learnersTrained: "5,000+",
    careerProgress: "84%",
    learnerRating: "4.8/5",
    communityCount: "5,000+",
  },
}: ReviewsSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // One-time entrance animation trigger via IntersectionObserver
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check prefers-reduced-motion
    if (typeof window.matchMedia === "function") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mq.matches) {
        setHasEntered(true);
        setIsInView(true);
        return;
      }
    }

    if (typeof IntersectionObserver === "undefined") {
      setHasEntered(true);
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsInView(entry.isIntersecting);
        if (entry.isIntersecting && !hasEntered) {
          setHasEntered(true);
        }
      },
      { threshold: 0.15 }
    );

    const currentEl = sectionRef.current;
    if (currentEl) {
      observer.observe(currentEl);
    }

    return () => {
      if (currentEl) {
        observer.unobserve(currentEl);
      }
    };
  }, [hasEntered]);

  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      id="reviews"
      aria-labelledby="reviews-heading"
      className="relative py-20 sm:py-28 lg:py-32 bg-[#F6FAFA] overflow-hidden"
    >
      {/* Background Ambience: Subtle Soft Teal Gradients matching reference */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-teal-100/40 via-teal-50/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-40 -mt-40"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-teal-100/30 via-teal-50/10 to-transparent rounded-full blur-3xl pointer-events-none -ml-40 -mb-40"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl xl:max-w-[1360px] 2xl:max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-10">
        {/* Main Composition: Stacked on mobile & tablet (< 1280px), Two Columns on Desktop (>= 1280px) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 xl:gap-14 items-center">
          {/* Left Zone: Editorial Introduction */}
          <div
            className={`xl:col-span-5 flex flex-col justify-center max-w-2xl xl:max-w-[480px] transition-all duration-700 ease-out ${
              hasEntered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            {/* Eyebrow with horizontal accent line */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold tracking-widest text-[#086477] uppercase font-sans">
                Words from Our Learners
              </span>
              <span className="h-[1.5px] w-8 bg-[#086477]/40 rounded-full" aria-hidden="true" />
            </div>

            {/* Main Heading with Teal Treatment & Curved Underline Swoop */}
            <h2
              id="reviews-heading"
              className="text-4xl sm:text-5xl lg:text-[54px] font-bold font-serif text-[#172E35] leading-[1.12] tracking-tight mb-5"
            >
              Real Learning
              <br />
              <span className="relative inline-block text-[#086477] mt-1">
                Real Impact
                {/* Curved underline SVG swoosh */}
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3.5 text-[#086477]"
                  viewBox="0 0 240 18"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 14C65 4 175 4 237 14"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h2>

            {/* Supporting Copy */}
            <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-xl mb-8">
              Hear from our learners how our programs helped them build skills, gain confidence, and
              move closer to their career goals.
            </p>

            {/* Metric Items: Responsive 3-column grid allowing natural wrapping without clipping */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 py-4 sm:py-5 border-y border-teal-100/70 mb-8 max-w-lg">
              {/* Metric 1: Learners Trained */}
              <div className="flex flex-col min-w-0 pr-1 sm:pr-2">
                <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-1.5">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-[#086477] shrink-0">
                    <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className="text-sm sm:text-xl lg:text-2xl font-bold font-serif text-[#172E35] whitespace-nowrap">
                    {metrics.learnersTrained}
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs text-text-secondary font-medium leading-tight">
                  Learners Trained
                </span>
              </div>

              {/* Metric 2: Career Progress */}
              <div className="flex flex-col min-w-0 px-1 sm:px-2 border-l border-teal-200/50">
                <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-1.5">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-[#086477] shrink-0">
                    <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <span className="text-sm sm:text-xl lg:text-2xl font-bold font-serif text-[#172E35] whitespace-nowrap">
                    {metrics.careerProgress}
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs text-text-secondary font-medium leading-tight">
                  Career Progress
                </span>
              </div>

              {/* Metric 3: Learner Rating */}
              <div className="flex flex-col min-w-0 pl-1 sm:pl-2 border-l border-teal-200/50">
                <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-1.5">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-[#086477] shrink-0">
                    <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-[#086477]" />
                  </div>
                  <span className="text-sm sm:text-xl lg:text-2xl font-bold font-serif text-[#172E35] whitespace-nowrap">
                    {metrics.learnerRating}
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs text-text-secondary font-medium leading-tight">
                  Learner Rating
                </span>
              </div>
            </div>

            {/* Primary Action Button */}
            <div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                aria-label="See more learner success stories"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#086477] hover:bg-[#075565] text-white font-medium text-sm sm:text-base shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#086477] focus-visible:ring-offset-2"
              >
                <span>See More Success Stories</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Zone: Testimonial Carousel */}
          <div
            className={`xl:col-span-7 w-full flex justify-center xl:justify-end transition-all duration-900 delay-200 ease-out ${
              hasEntered ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          >
            <ReviewsCarousel
              reviews={reviews}
              isModalOpen={isModalOpen}
              isInView={hasEntered && isInView}
            />
          </div>
        </div>

        {/* Bottom Community Banner */}
        <div
          className={`transition-all duration-700 delay-400 ease-out ${
            hasEntered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <CommunityBanner
            memberCount={metrics.communityCount}
            onJoinClick={() => setIsModalOpen(true)}
          />
        </div>
      </div>

      {/* Accessible Success Stories Modal */}
      <ReviewsModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} reviews={reviews} />
    </section>
  );
}
