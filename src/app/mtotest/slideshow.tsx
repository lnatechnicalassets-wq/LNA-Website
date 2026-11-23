"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./preview.module.css";
import "./glass-sweep.css";

type Slide = {
  id: string;
  name: string;
  role: string;
  portraitSrc: string;
  companyLogoSrc?: string;
  organization: string;
};
type Admissions = {
  deadline: string | null;
  batchId?: string;
  fee?: string;
  seatsLeft?: number;
  limited?: boolean;
};

function AdmissionsCountdown({ remaining, label }: { remaining: number | null; label: string }) {
  const units = [
    ["Days", remaining === null ? null : Math.floor(remaining / 86400)],
    ["Hours", remaining === null ? null : Math.floor(remaining / 3600) % 24],
    ["Minutes", remaining === null ? null : Math.floor(remaining / 60) % 60],
    ["Seconds", remaining === null ? null : remaining % 60],
  ] as const;

  return (
    <div className={styles.countdown}>
      <p>{label}</p>
      {remaining !== null && remaining > 0 && (
        <dl aria-label="Time until admissions close" aria-live="off">
          {units.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value === null ? "··" : String(value).padStart(2, "0")}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function MentorSlideshow({
  title,
  slides,
  admissions,
  initialNow,
}: {
  title: string;
  slides: Slide[];
  admissions: Admissions;
  initialNow: number;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const slide = slides[index];

  const [now, setNow] = useState(initialNow);
  const end = Date.parse(admissions.deadline ?? "");
  const remaining = Number.isFinite(end) ? Math.max(0, Math.ceil((end - now) / 1000)) : null;
  const isOpen = Boolean(admissions.batchId) && remaining !== 0 && admissions.seatsLeft !== 0;
  let admissionsLabel = "Admissions closed";
  if (admissions.seatsLeft === 0) admissionsLabel = "Batch full";
  else if (isOpen) admissionsLabel = remaining === null ? "Admissions open" : "Admissions close in";

  useEffect(() => {
    if (!Number.isFinite(end)) return;
    if (end <= Date.now()) {
      setNow(Date.now());
      return;
    }
    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= end) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [end]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPlaying(!preference.matches);
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!playing || hovering || focused || slides.length < 2) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((current) => (current + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [focused, hovering, playing, slides.length]);

  function move(offset: number) {
    setPlaying(false);
    setIndex((current) => (current + offset + slides.length) % slides.length);
  }

  return (
    <section className={styles.hero} aria-labelledby="mtotest-glass-title">
      <div className={styles.layout}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>
            Management Trainee
            <br />
            Officer Program
          </p>
          <h1 id="mtotest-glass-title" className={styles.wordmark} aria-label={title}>
            <span className={styles.wordMask} aria-hidden="true">
              <span>MTO</span>
            </span>
            <span className={styles.wordMask} aria-hidden="true">
              <span className={styles.readiness}>READINESS</span>
            </span>
          </h1>
          <p>
            Mentor-led preparation
            <br />
            for future MTOs
          </p>
          <ul className={styles.highlights} data-stats>
            <li>
              <strong>16 sessions</strong> · 1.5 hours each
            </li>
            <li>
              <strong>2 industry visits</strong>
            </li>
            {admissions.fee && (
              <li>
                <strong>{admissions.fee}</strong>
              </li>
            )}
          </ul>
          <Link className={styles.viewProgram} href="/courses/mto-readiness">
            View Program <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div
          className={styles.showcase}
          role="region"
          aria-roledescription="carousel"
          aria-label="MTO mentor slideshow"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onFocus={() => setFocused(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
          }}
        >
          {slide ? (
            <>
              <div className={styles.frame}>
                {slides.map((mentor, position) => (
                  <div
                    key={mentor.id}
                    className={styles.portrait}
                    data-mentor={mentor.id}
                    hidden={mentor.id !== slide.id}
                  >
                    <Image
                      src={mentor.portraitSrc}
                      alt=""
                      fill
                      unoptimized
                      loading="eager"
                      fetchPriority={position === 0 ? "high" : "low"}
                      sizes="(max-width: 760px) 85vw, 520px"
                    />
                  </div>
                ))}
              </div>
              <div className={styles.caption}>
                <div className={styles.goldDetail} aria-hidden="true" />
                <AdmissionsCountdown
                  remaining={isOpen ? remaining : null}
                  label={admissionsLabel}
                />
                <div aria-live={playing && !focused ? "off" : "polite"}>
                  <div key={slide.id} className={styles.details}>
                    <p className={styles.eyebrow}>Industry mentor</p>
                    <strong>{slide.name}</strong>
                    <span>{slide.role}</span>
                    {slide.companyLogoSrc && (
                      <div className={styles.logo}>
                        <Image
                          src={slide.companyLogoSrc}
                          alt={slide.organization}
                          fill
                          unoptimized
                          sizes="(max-width: 540px) 56vw, 256px"
                        />
                      </div>
                    )}
                    {!slide.companyLogoSrc && (
                      <p className={styles.organization}>{slide.organization}</p>
                    )}
                  </div>
                </div>
                {isOpen && (
                  <div className={styles.admissionsAction}>
                    {admissions.limited && <p className={styles.limitedSeats}>Limited seats</p>}
                    <Link
                      className={styles.join}
                      href={{
                        pathname: "/enroll",
                        query: { course: "mto-readiness", batch: admissions.batchId },
                      }}
                    >
                      <span>Enroll now</span>
                      <span className={styles.joinArrow} aria-hidden="true">
                        →
                      </span>
                    </Link>
                  </div>
                )}
              </div>
              {slides.length > 1 && (
                <div className={styles.controls}>
                  <button type="button" onClick={() => setPlaying((current) => !current)}>
                    {playing ? "Pause" : "Play"}
                  </button>
                  <button type="button" aria-label="Previous mentor" onClick={() => move(-1)}>
                    ←
                  </button>
                  <button type="button" aria-label="Next mentor" onClick={() => move(1)}>
                    →
                  </button>
                </div>
              )}
            </>
          ) : (
            <p>Mentor portraits are currently unavailable.</p>
          )}
        </div>
      </div>
    </section>
  );
}
