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
function AdmissionsCountdown({ remaining }: { remaining: number | null }) {
  const units = [
    ["Days", remaining === null ? null : Math.floor(remaining / 86400)],
    ["Hours", remaining === null ? null : Math.floor(remaining / 3600) % 24],
    ["Minutes", remaining === null ? null : Math.floor(remaining / 60) % 60],
    ["Seconds", remaining === null ? null : remaining % 60],
  ] as const;

  return (
    <div className={styles.countdown}>
      <p>{remaining === 0 ? "Admissions closed" : "Admissions close in"}</p>
      {remaining !== 0 && (
        <dl>
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
  deadline,
}: {
  title: string;
  slides: Slide[];
  deadline: string;
}) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];

  const [now, setNow] = useState<number | null>(null);
  const end = Date.parse(deadline);
  const remaining = now === null ? null : Math.max(0, Math.ceil((end - now) / 1000));

  useEffect(() => {
    const update = () => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= end) window.clearInterval(timer);
    };
    const timer = window.setInterval(update, 1000);
    update();
    return () => window.clearInterval(timer);
  }, [end]);

  function move(offset: number) {
    setIndex((current) => (current + offset + slides.length) % slides.length);
  }

  return (
    <section className={styles.hero} aria-labelledby="mto-test-title" data-mto-reflective>
      <div className={styles.layout}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>
            Management Trainee
            <br />
            Officer Program
          </p>
          <h1 id="mto-test-title" className={styles.wordmark} aria-label={title}>
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
            <li>
              <strong>BDT 7,500</strong>
            </li>
          </ul>
          <Link className={styles.viewProgram} href="/courses/mto-readiness">
            View Program <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className={styles.showcase} aria-label="MTO mentor slideshow">
          {slide ? (
            <>
              <div className={styles.frame}>
                <div className={styles.glass} aria-hidden="true" />
                <div
                  className={styles.mentorAccent}
                  key={`${slide.id}-accent`}
                  aria-hidden="true"
                />
                <div className={styles.lightSweep} key={`${slide.id}-light`} aria-hidden="true" />
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
                <AdmissionsCountdown remaining={remaining} />
                <div aria-live="polite">
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
                {remaining !== 0 && (
                  <div className={styles.admissionsAction}>
                    <p className={styles.limitedSeats}>Limited seats</p>
                    <Link className={styles.join} href="/enroll?course=mto-readiness">
                      Enroll now <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                )}
              </div>
              {slides.length > 1 && (
                <div className={styles.controls}>
                  <button type="button" aria-label="Previous mentor" onClick={() => move(-1)}>
                    ←
                  </button>
                  <span>
                    {index + 1} / {slides.length}
                  </span>
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
