"use client";

import React, { useState, useEffect, useRef } from "react";
import { Users } from "lucide-react";
import type { Review, IrgpData } from "@/lib/content";
import { IrgpOverviewCard } from "./irgp-overview-card";
import { IrgpGallery } from "./irgp-gallery";
import { IrgpGalleryLightbox } from "./irgp-gallery-lightbox";
import { ReviewsCarousel } from "./reviews-carousel";
import { IrgpOutcomesStrip } from "./irgp-outcomes-strip";
import { CommunityBanner } from "./community-banner";
import { IrgpStoryModal } from "./irgp-story-modal";

export interface ReviewsSectionProps {
  reviews: Review[];
  irgpData: IrgpData;
}

export function ReviewsSection({ reviews, irgpData }: ReviewsSectionProps) {
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [hasEntered, setHasEntered] = useState(true);
  const [isInView, setIsInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const data = irgpData;

  // Global listener to open IRGP Story Modal from Hero or external CTAs
  useEffect(() => {
    const handleOpen = () => setIsStoryModalOpen(true);
    window.addEventListener("lna:open-irgp-story", handleOpen);
    return () => window.removeEventListener("lna:open-irgp-story", handleOpen);
  }, []);

  const handleStoryModalChange = (open: boolean) => {
    setIsStoryModalOpen(open);
    if (!open && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("lna:close-irgp-story"));
    }
  };

  // One-time entrance animation trigger via IntersectionObserver
  useEffect(() => {
    if (typeof window === "undefined") return;

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
      { threshold: 0.12 }
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

  const handleOpenPhoto = (index: number) => {
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      id="reviews"
      aria-labelledby="reviews-heading"
      className="relative py-14 sm:py-16 lg:py-20 bg-[#F6FAFA] overflow-hidden scroll-mt-20 sm:scroll-mt-24"
    >
      {/* Background Ambience: Subtle Soft Teal Gradients matching approved design */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-teal-100/35 via-teal-50/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-40 -mt-40"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-teal-100/25 via-teal-50/15 to-transparent rounded-full blur-3xl pointer-events-none -ml-40 -mb-40"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header: Eyebrow + Serif Heading with Curved Underline + Description */}
        <div
          className={`mb-8 sm:mb-10 transition-all duration-700 ease-out ${
            hasEntered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-100 text-[#086477] text-xs font-bold tracking-wider uppercase font-sans mb-3.5 shadow-2xs">
            <Users className="w-3.5 h-3.5 text-[#086477]" />
            <span>Our Impact</span>
          </div>

          {/* Main Heading with Aqua Curved Underline */}
          <h2
            id="reviews-heading"
            className="text-3xl sm:text-4xl lg:text-[42px] font-bold font-serif text-[#172E35] leading-[1.15] tracking-tight mb-3"
          >
            Real Learning.{" "}
            <span className="relative inline-block text-[#086477]">
              Real Impact.
              <svg
                className="absolute -bottom-2 left-0 w-full h-3 text-teal-400"
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
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-2xl font-sans">
            Explore the Industry Readiness Graduate Program (IRGP) and hear directly from the
            learners who experienced it.
          </p>
        </div>

        {/* Rebalanced 2-Column Feature Composition: IRGP Story Overview + Learner Testimonials */}
        <div
          className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mb-6 sm:mb-8 transition-all duration-700 ease-out ${
            hasEntered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          {/* Zone 1: IRGP Overview Card (5 cols on lg/xl) */}
          <div className="w-full lg:col-span-5 flex flex-col min-h-[380px] sm:min-h-[420px]">
            <IrgpOverviewCard story={data.story} onExploreClick={() => setIsStoryModalOpen(true)} />
          </div>

          {/* Zone 2: Learner Testimonial Carousel Card (7 cols on lg/xl) */}
          <div className="w-full lg:col-span-7 flex flex-col min-h-[380px] sm:min-h-[420px]">
            <ReviewsCarousel
              reviews={reviews}
              isModalOpen={isStoryModalOpen}
              isLightboxOpen={isLightboxOpen}
              isInView={hasEntered && isInView}
            />
          </div>
        </div>

        {/* IRGP Program Outcomes Strip */}
        <div
          className={`mb-6 sm:mb-8 transition-all duration-700 delay-300 ease-out ${
            hasEntered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <IrgpOutcomesStrip outcomes={data.outcomes} />
        </div>

        {/* Bottom Community Banner */}
        <div
          className={`transition-all duration-700 delay-450 ease-out ${
            hasEntered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <CommunityBanner memberCount="5,000+" onJoinClick={() => setIsStoryModalOpen(true)} />
        </div>
      </div>

      {/* Gallery Lightbox Dialog */}
      <IrgpGalleryLightbox
        isOpen={isLightboxOpen}
        currentIndex={lightboxIndex}
        items={data.gallery}
        onClose={() => setIsLightboxOpen(false)}
        onNavigate={setLightboxIndex}
      />

      {/* IRGP Success Story Modal */}
      <IrgpStoryModal
        isOpen={isStoryModalOpen}
        onOpenChange={handleStoryModalChange}
        story={data.story}
        gallery={data.gallery}
        reviews={reviews}
        outcomes={data.outcomes}
      />
    </section>
  );
}
