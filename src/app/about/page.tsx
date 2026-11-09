import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "About Us | Lead Nation Academy",
  description:
    "Learn about Lead Nation Academy, our mission, vision, and how we help students and graduates prepare for work through practical training and industry mentorship.",
};

export default function AboutPage() {
  return (
    <div className="w-full bg-[#FFFFFF] text-[#172E35]">
      {/* 1. Hero Section */}
      <section
        className="relative w-full min-h-[460px] sm:min-h-[500px] lg:min-h-[540px] flex items-center overflow-hidden bg-[#063A46]"
        aria-label="About Lead Nation Academy Overview"
      >
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/about-hero.jpg"
            alt="Lead Nation Academy learners collaborating around a table guided by an industry mentor"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center sm:object-[center_30%]"
          />
          {/* Subtle Directional Overlay for pristine text contrast */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#063A46]/95 via-[#063A46]/80 to-[#063A46]/40 sm:to-transparent"
            aria-hidden="true"
          />
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 w-full">
          <div className="max-w-xl lg:max-w-2xl">
            {/* Eyebrow */}
            <p className="text-xs font-semibold tracking-[0.2em] text-[#C5E2E5] uppercase mb-4 sm:mb-5">
              ABOUT LEAD NATION ACADEMY
            </p>

            {/* Editorial Serif Headline */}
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-[64px] text-white font-normal tracking-tight leading-[1.08]">
              <span className="block">A seat at</span>
              <span className="italic block font-serif">the table.</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-[#E0ECEE] leading-relaxed max-w-lg font-normal">
              A place to learn with peers, ask questions, and prepare for your first role or your next one.
            </p>

            {/* CTA Button */}
            <div className="mt-6 sm:mt-8">
              <a
                href="#who-we-are"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-[#D4E8EB] hover:bg-[#C2DFE3] text-[#063A46] font-semibold text-sm sm:text-base transition-colors shadow-xs group"
              >
                <span>Get to know LNA</span>
                <ArrowRight
                  className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </a>
            </div>

            {/* Subtle Divider & Motto */}
            <div
              className="w-48 sm:w-60 h-px bg-white/20 mt-10 sm:mt-12 mb-3"
              aria-hidden="true"
            />
            <p className="text-xs sm:text-sm text-[#C5E2E5]/90 font-medium tracking-wide">
              Learn. Lead. Succeed.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Who We Are Section */}
      <section
        id="who-we-are"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 scroll-mt-16"
        aria-labelledby="who-we-are-heading"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-16 items-center">
          {/* Left Column: Sketching Photograph */}
          <div className="lg:col-span-5">
            <div className="relative rounded-lg sm:rounded-xl overflow-hidden shadow-xs border border-[#E2EBEF] aspect-[16/10] bg-[#EAF2F4]">
              <Image
                src="/images/about-sketching.jpg"
                alt="Learners sketching practical diagrams, business processes, and notes on paper with pencils"
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover"
              />
            </div>
          </div>

          {/* Right Column: Mission & Vision */}
          <div className="lg:col-span-7">
            {/* Eyebrow */}
            <p className="text-xs font-bold tracking-[0.2em] text-[#086477] uppercase mb-3">
              WHO WE ARE
            </p>

            {/* Heading */}
            <h2
              id="who-we-are-heading"
              className="text-3xl sm:text-4xl lg:text-[42px] font-serif font-bold text-[#172E35] tracking-tight leading-[1.15] mb-5 sm:mb-6"
            >
              Learning with a purpose.
            </h2>

            {/* Body */}
            <p className="text-base sm:text-[17px] text-[#526E77] leading-relaxed mb-8 sm:mb-10 max-w-2xl">
              Lead Nation Academy helps students, recent graduates, and young professionals prepare for work. Our training covers workplace communication, practical professional skills, and stock market fundamentals. We also offer career guidance and help learners who pass our screening process pursue job and internship opportunities.
            </p>

            {/* Divider Rule */}
            <div className="w-full h-px bg-[#E2EBEF] mb-8" aria-hidden="true" />

            {/* Mission & Vision Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-10">
              {/* 01 Our mission */}
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-xs font-mono font-semibold text-[#086477]/75 tracking-wider">
                    01
                  </span>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[#172E35]">
                    Our mission
                  </h3>
                </div>
                <p className="text-sm sm:text-base text-[#526E77] leading-relaxed">
                  To help learners make the move from education to employment through practical training, career guidance, and exposure to how people work in industry.
                </p>
              </div>

              {/* 02 Our vision */}
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-xs font-mono font-semibold text-[#086477]/75 tracking-wider">
                    02
                  </span>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[#172E35]">
                    Our vision
                  </h3>
                </div>
                <p className="text-sm sm:text-base text-[#526E77] leading-relaxed">
                  To see more students and recent graduates enter the workplace with the skills to contribute, the confidence to take responsibility, and the opportunity to grow into leadership roles.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CTA Section: Take the next step with LNA */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20 lg:pb-24"
        aria-label="Explore courses call to action"
      >
        <div className="bg-[#E8F3F5] rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border border-[#D5E7EA]">
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-serif font-bold text-[#172E35] tracking-tight">
              Take the next step with LNA.
            </h2>
            <p className="text-sm sm:text-base text-[#526E77]">
              Browse our courses and see what you’ll learn in each program.
            </p>
          </div>

          <Link
            href="/#courses"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#086477] hover:bg-[#06505F] text-white font-medium text-sm sm:text-base transition-colors shrink-0 shadow-xs cursor-pointer group"
          >
            <span>Explore courses</span>
            <ArrowRight
              className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2}
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>
    </div>
  );
}
