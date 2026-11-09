"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Internship } from "@/lib/content";
import { InternshipCard } from "./internship-card";
import { InternshipDetailsModal } from "./internship-details-modal";

export interface InternshipsSectionProps {
  internships: Internship[];
}

export function InternshipsSection({ internships }: InternshipsSectionProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const isProgrammatic = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalItems = internships.length;
  const totalSteps = Math.max(1, totalItems);

  const scrollToIndex = useCallback((index: number) => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const cards = container.children;
    const maxScroll = container.scrollWidth - container.clientWidth;

    // Only scroll the container if there is meaningful horizontal overflow (mobile / tablet)
    if (maxScroll > 30 && cards[index]) {
      const cardEl = cards[index] as HTMLElement;
      isProgrammatic.current = true;
      const cardLeft = cardEl.offsetLeft;
      container.scrollTo({ left: Math.max(0, cardLeft - 16), behavior: "smooth" });
      setTimeout(() => {
        isProgrammatic.current = false;
      }, 650);
    }
  }, []);

  const goToIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(totalSteps - 1, index));
    setActiveIndex(clamped);
    scrollToIndex(clamped);
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      goToIndex(activeIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeIndex < totalSteps - 1) {
      goToIndex(activeIndex + 1);
    }
  };

  const handleScroll = useCallback(() => {
    if (isProgrammatic.current) return;
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const maxScroll = container.scrollWidth - container.clientWidth;
    // Only infer index from scroll if there is meaningful scroll overflow (mobile / tablet)
    if (maxScroll <= 30) return;

    const scrollLeft = container.scrollLeft;
    const cards = Array.from(container.children) as HTMLElement[];
    if (cards.length === 0) return;

    let closestIndex = 0;
    let minDistance = Infinity;

    cards.forEach((card, idx) => {
      const cardLeft = card.offsetLeft;
      const distance = Math.abs(scrollLeft - cardLeft);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = idx;
      }
    });

    setActiveIndex(closestIndex);
  }, []);

  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return;

    const onScroll = () => {
      requestAnimationFrame(handleScroll);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
    };
  }, [handleScroll]);

  const handleSelectInternship = (item: Internship, index: number) => {
    setActiveIndex(index);
    setSelectedInternship(item);
    setIsModalOpen(true);
  };

  const handleModalNavigate = (index: number) => {
    if (index >= 0 && index < totalItems) {
      goToIndex(index);
      setSelectedInternship(internships[index]);
    }
  };

  if (!internships || internships.length === 0) {
    return null;
  }

  return (
    <section
      id="internships"
      aria-labelledby="internships-heading"
      className="py-14 sm:py-16 lg:py-20 bg-[#F6FAFA] border-b border-[#E5ECEE] overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10 sm:mb-12">
          {/* Left: Eyebrow + Serif Heading + Subtitle */}
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-0.5 bg-[#086477]" aria-hidden="true" />
              <span className="text-[12px] font-bold uppercase tracking-widest text-[#086477]">
                OPPORTUNITIES THROUGH OUR PARTNERS
              </span>
            </div>
            <h2
              id="internships-heading"
              className="mt-2 text-3xl sm:text-4xl lg:text-[42px] font-serif font-normal tracking-tight text-[#172E35]"
            >
              Internship Opportunities
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#526E77] max-w-xl">
              Explore opportunities shared by our partner organizations.
            </p>
          </div>

          {/* Right Controls: Previous / Dynamic Indicator / Next */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handlePrev}
              disabled={activeIndex === 0}
              aria-label="Previous opportunities"
              className={`w-10 h-10 rounded-full border border-[#D5E2E5] bg-white text-[#172E35] flex items-center justify-center shadow-2xs transition-all ${
                activeIndex === 0
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:border-[#086477] hover:text-[#086477] hover:shadow-xs cursor-pointer"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <span
              className="text-sm sm:text-base font-medium text-[#172E35] min-w-[38px] text-center select-none"
              aria-live="polite"
              aria-atomic="true"
            >
              {activeIndex + 1} / {totalSteps}
            </span>

            <button
              type="button"
              onClick={handleNext}
              disabled={activeIndex === totalSteps - 1}
              aria-label="Next opportunities"
              className={`w-10 h-10 rounded-full border border-[#D5E2E5] bg-white text-[#172E35] flex items-center justify-center shadow-2xs transition-all ${
                activeIndex === totalSteps - 1
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:border-[#086477] hover:text-[#086477] hover:shadow-xs cursor-pointer"
              }`}
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Carousel Track: 3 cards wide desktop, 2 on tablet, 1 with preview peek on mobile */}
        <div
          ref={carouselRef}
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {internships.map((internship, index) => (
            <div
              key={internship.id}
              className="w-[84%] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] shrink-0 snap-start"
            >
              <InternshipCard
                internship={internship}
                isActive={activeIndex === index}
                onSelect={(item) => handleSelectInternship(item, index)}
              />
            </div>
          ))}
        </div>

        {/* Centered Pagination Dots (● ○ ○) */}
        <div className="flex items-center justify-center gap-2 mt-8 sm:mt-10">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => goToIndex(idx)}
              className={`transition-all duration-200 rounded-full cursor-pointer ${
                activeIndex === idx
                  ? "w-2.5 h-2.5 bg-[#086477]"
                  : "w-2 h-2 bg-[#D5E2E5] hover:bg-[#086477]/40"
              }`}
              aria-label={`Go to opportunity ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Accessible Internship Details Modal */}
      <InternshipDetailsModal
        internship={selectedInternship}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        internships={internships}
        currentIndex={activeIndex}
        onNavigate={handleModalNavigate}
      />
    </section>
  );
}
