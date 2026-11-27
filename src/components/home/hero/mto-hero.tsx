"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight, Clock3 } from "lucide-react";
import type { MtoHeroCourse } from "@/server/catalog/mto-hero";
import { OfficialCompanyLogo } from "../company-logo";
import styles from "./mto-hero.module.css";

function parseHeroFact(stat: string, index: number) {
  if (index === 0) {
    const match = stat.match(
      /^(\d+\s+sessions?)(?:\s*(?:\(([\d.]+)\s*h(?:ours?)?\s*each\)|[·•]\s*([\d.]+)\s*hours?\s*each))?/i
    );
    if (match) {
      const boldText = match[1].toLowerCase();
      const hours = match[2] || match[3];
      const regularText = hours ? `· ${hours} hours each` : undefined;
      return { bold: boldText, regular: regularText };
    }
  }
  return { bold: stat };
}

function AnimatedDigit({ value }: { value: string }) {
  return (
    <span className={styles.digitSlot}>
      <span key={value} className={styles.digitNumber}>
        {value}
      </span>
    </span>
  );
}

function HeroCountdown({
  deadline,
  label = "Admissions Close In",
}: {
  deadline: string;
  label?: string;
}) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    function calculateTime() {
      const targetTime = Date.parse(deadline);
      const now = Date.now();
      const diff = Math.max(0, targetTime - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      return { days, hours, minutes, seconds };
    }

    setTimeLeft(calculateTime());
    const interval = setInterval(() => {
      setTimeLeft(calculateTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  const pad = (n: number) => String(n).padStart(2, "0");
  const display = timeLeft ?? { days: 0, hours: 0, minutes: 0, seconds: 0 };

  return (
    <div className={styles.countdown} aria-label={`${label}: ${display.days} days remaining`}>
      <div className={styles.countdownHeader}>
        <span className={styles.countdownPulse} aria-hidden="true" />
        <span className={styles.countdownLabel}>{label}</span>
      </div>
      <div className={styles.countdownGrid} aria-hidden="true">
        <div className={styles.countdownCard}>
          <div className={styles.countdownCardInner}>
            <AnimatedDigit value={pad(display.days)} />
          </div>
          <span className={styles.countdownUnit}>Days</span>
        </div>

        <span className={styles.countdownColon}>:</span>

        <div className={styles.countdownCard}>
          <div className={styles.countdownCardInner}>
            <AnimatedDigit value={pad(display.hours)} />
          </div>
          <span className={styles.countdownUnit}>Hours</span>
        </div>

        <span className={styles.countdownColon}>:</span>

        <div className={styles.countdownCard}>
          <div className={styles.countdownCardInner}>
            <AnimatedDigit value={pad(display.minutes)} />
          </div>
          <span className={styles.countdownUnit}>Mins</span>
        </div>

        <span className={styles.countdownColon}>:</span>

        <div className={styles.countdownCard}>
          <div className={styles.countdownCardInner}>
            <AnimatedDigit value={pad(display.seconds)} />
          </div>
          <span className={styles.countdownUnit}>Secs</span>
        </div>
      </div>
    </div>
  );
}

export function MtoHero({ program }: { program: MtoHeroCourse }) {
  const { copy, roster } = program;
  const [activeIndex, setActiveIndex] = useState(0);
  const spotlight = useRef<HTMLDivElement>(null);
  const active = activeIndex % Math.max(1, roster.length);

  useEffect(() => {
    if (roster.length < 2) return;
    const timer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setActiveIndex((index) => (index + 1) % roster.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [roster.length]);

  return (
    <section className={styles.hero} aria-labelledby="mto-hero-title">
      <div className="lna-content">
        <div className={styles.stage}>
          {/* Static architectural backdrop for desktop */}
          <div className={styles.backdrop} aria-hidden="true">
            <div className={styles.backdropPearl} />
            <div className={styles.backdropGlass}>
              <div className={styles.backdropImageWrap}>
                <Image
                  src="/images/mto-hero-glass-building.png"
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 75rem) 45vw, (min-width: 48rem) 55vw, 100vw"
                  className={styles.buildingImage}
                />
              </div>
              <div className={styles.backdropAccentTriangle} />
            </div>
            <div className={styles.backdropDarkTeal} />
            <div className={styles.backdropGoldCorner} />
          </div>

          <div className={styles.layout}>
            {/* Step 1 Approved Left Program Copy Panel (Preserved exactly as approved) */}
            <div className={styles.intro}>
              <p className={styles.eyebrow}>
                <span className={styles.eyebrowPart}>
                  {"eyebrowParts" in copy && Array.isArray(copy.eyebrowParts)
                    ? copy.eyebrowParts[0]
                    : "MANAGEMENT TRAINEE"}
                </span>{" "}
                <span className={styles.eyebrowTrailing}>
                  {"eyebrowParts" in copy && Array.isArray(copy.eyebrowParts)
                    ? copy.eyebrowParts[1]
                    : "OFFICER PROGRAM"}
                  <span className={styles.eyebrowRule} aria-hidden="true" />
                </span>
              </p>
              <h1 id="mto-hero-title" className={styles.title}>
                <span className={styles.titleMto}>{copy.headline[0]}</span>{" "}
                <span className={styles.titleReadiness}>{copy.headline[1]}</span>
              </h1>
              <p className={styles.description}>
                <span className={styles.subtitlePart}>
                  {"subtitleParts" in copy && Array.isArray(copy.subtitleParts)
                    ? copy.subtitleParts[0]
                    : "Mentor-led preparation"}
                </span>{" "}
                <span className={styles.subtitlePart}>
                  {"subtitleParts" in copy && Array.isArray(copy.subtitleParts)
                    ? copy.subtitleParts[1]
                    : "for future MTOs"}
                </span>
              </p>
              <ul className={styles.stats}>
                {program.stats.map((stat, index) => {
                  const fact = parseHeroFact(stat, index);
                  const isFee = stat.includes("BDT");
                  const isVisits = stat.toLowerCase().includes("visit");
                  const statType = isFee ? "fee" : isVisits ? "visits" : "sessions";

                  return (
                    <li
                      key={stat}
                      className={styles.statItem}
                      data-stat-type={statType}
                      data-fee={isFee ? "true" : undefined}
                    >
                      <span className={styles.statDash} aria-hidden="true" />
                      <div className={styles.statContent}>
                        <strong className={styles.statBold}>{fact.bold}</strong>
                        {fact.regular && (
                          <span className={styles.statRegular}> {fact.regular}</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Link className={styles.secondary} href={program.programHref}>
                <span>{copy.program}</span>
                <ChevronRight
                  className={styles.chevron}
                  size={18}
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              </Link>
            </div>

            {/* Step 2 Mentor Spotlight: Static Glass + Portrait + Profile + Action */}
            <div className={styles.spotlight} ref={spotlight} data-has-mentor={roster.length > 0}>
              {/* Tablet/Mobile background with glass building strip on left & dark teal on right */}
              <div className={styles.spotlightBackdrop} aria-hidden="true">
                <div className={styles.spotlightGlass}>
                  <div className={styles.spotlightImageWrap}>
                    <Image
                      src="/images/mto-hero-glass-building.png"
                      alt=""
                      fill
                      priority
                      sizes="(min-width: 48rem) 50vw, 100vw"
                      className={styles.buildingImage}
                    />
                  </div>
                  <div className={styles.spotlightAccentTriangle} />
                </div>
                <div className={styles.spotlightDarkTeal} />
                <div className={styles.spotlightGoldCorner} />
              </div>

              {roster.length > 0 && (
                <>
                  {/* Central portrait layer anchored to the floor */}
                  <div className={styles.portraits} aria-hidden="true">
                    {roster.map((mentor, index) => (
                      <div
                        className={styles.portraitSlide}
                        key={mentor.id}
                        data-mentor={mentor.id}
                        data-active={active === index}
                      >
                        {mentor.portrait && (
                          <Image
                            src={
                              mentor.id.includes("anubhab")
                                ? "/images/mentors/anubhab-rahman-v2.png"
                                : mentor.portrait
                            }
                            alt=""
                            fill
                            sizes="(min-width: 75rem) 35vw, (min-width: 48rem) 50vw, 100vw"
                            loading={index < 2 ? "eager" : "lazy"}
                            fetchPriority={index === 0 ? "high" : "auto"}
                            unoptimized
                            className={styles.portraitImg}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Right column: Rotating mentor profile details & Enrollment action */}
                  <div className={styles.profileColumn}>
                    {program.deadline && (
                      <HeroCountdown
                        deadline={program.deadline}
                        label={
                          "countdownLabel" in copy && typeof copy.countdownLabel === "string"
                            ? copy.countdownLabel
                            : "Admissions Close In"
                        }
                      />
                    )}
                    <div className={styles.profiles} aria-live="off">
                      {roster.map((mentor, index) => {
                        const lastSpaceIndex = mentor.name.lastIndexOf(" ");
                        const nameFirst =
                          lastSpaceIndex > 0 ? mentor.name.slice(0, lastSpaceIndex) : mentor.name;
                        const nameLast =
                          lastSpaceIndex > 0 ? mentor.name.slice(lastSpaceIndex + 1) : null;

                        return (
                          <div
                            className={styles.slide}
                            key={mentor.id}
                            data-mentor={mentor.id}
                            data-active={active === index}
                            aria-hidden={active !== index}
                          >
                            <div className={styles.mentorEyebrowWrap}>
                              <p className={styles.mentorEyebrow}>{copy.mentor}</p>
                              <span className={styles.mentorEyebrowRule} aria-hidden="true" />
                            </div>
                            <h2 className={styles.mentorName}>
                              {nameLast ? (
                                <>
                                  <span className={styles.nameLine}>{nameFirst}</span>
                                  <span className={styles.nameLine}>{nameLast}</span>
                                </>
                              ) : (
                                mentor.name
                              )}
                            </h2>
                            <div className={styles.mentorRoleWrap}>
                              <span className={styles.mentorRoleRule} aria-hidden="true" />
                              <p className={styles.mentorRole}>{mentor.role}</p>
                            </div>
                            <div className={styles.company}>
                              {mentor.logo && (
                                <span
                                  className={
                                    mentor.logo.src.includes("brand/logo") ||
                                    mentor.id === "mentor-mir-hasib" ||
                                    Boolean(
                                      mentor.organization?.toLowerCase().includes("lead nation")
                                    )
                                      ? styles.logoPearlBacking
                                      : styles.logo
                                  }
                                  aria-hidden="true"
                                >
                                  <OfficialCompanyLogo
                                    src={mentor.logo.src}
                                    alt=""
                                    size="hero"
                                    compact
                                  />
                                </span>
                              )}
                              <span
                                className={
                                  mentor.logo ? styles.organizationHidden : styles.organization
                                }
                              >
                                {mentor.organization}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Enrollment Action in the same right-hand column */}
                    <div className={styles.action}>
                      {program.enrollHref ? (
                        <div className={styles.enrollWrap}>
                          <Link
                            className={styles.enroll}
                            href={program.enrollHref}
                            prefetch={false}
                          >
                            <span>{copy.enroll}</span>
                            <ArrowRight size={24} strokeWidth={2.5} aria-hidden="true" />
                          </Link>
                          {program.limited && (
                            <span className={styles.limited}>
                              <Clock3 size={16} strokeWidth={2.5} aria-hidden="true" />
                              <span>{copy.limited}</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className={styles.closedWrap}>
                          <p className={styles.closed}>{copy.closed}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
