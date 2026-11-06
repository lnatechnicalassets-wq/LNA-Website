import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, MapPin, ArrowRight, ShieldCheck } from "lucide-react";
import type { Event } from "@/lib/content";
import { Badge, Button } from "@/components/ui";

export interface EventsSectionProps {
  events: Event[];
}

export function EventsSection({ events }: EventsSectionProps) {
  if (!events || events.length === 0) {
    return null;
  }

  const featuredEvent = events.find((e) => e.featured) || events[0];
  const upcomingEvents = events.filter((e) => e.id !== featuredEvent.id);

  return (
    <section
      id="events"
      aria-labelledby="events-heading"
      className="py-20 sm:py-28 bg-surface-dark text-white relative overflow-hidden"
    >
      {/* Ambient background lighting with deep teal glow */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(8,100,119,0.35),rgba(23,46,53,1))] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <div>
            <Badge
              variant="outline"
              size="sm"
              className="mb-3 text-accent border-accent/40 bg-accent/10"
            >
              Academic Forums &amp; Dialogues
            </Badge>
            <h2
              id="events-heading"
              className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl"
            >
              Executive Masterclasses &amp; Roundtables
            </h2>
            <p className="mt-4 max-w-2xl text-base sm:text-lg text-accent-100">
              High-impact offline knowledge-sharing sessions with industry regulators, corporate
              directors, and economic strategists.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-accent-200 bg-surface-dark-muted border border-border-dark px-3.5 py-2 rounded-full shrink-0 shadow-xs">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <span className="font-medium">Read-Only Showcase</span>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Featured Event Card (7 cols) */}
          {featuredEvent && (
            <div className="lg:col-span-7 rounded-3xl bg-surface-dark-muted border border-border-dark shadow-xl overflow-hidden backdrop-blur-xs flex flex-col justify-between">
              {/* Event Image */}
              <div className="relative h-60 sm:h-72 w-full overflow-hidden bg-primary-950">
                <Image
                  src="/images/event-boardroom.jpg"
                  alt={featuredEvent.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover transition-transform duration-700 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary-950 via-primary-950/40 to-transparent" />
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <Badge
                    variant="primary"
                    size="sm"
                    className="font-semibold uppercase shadow-xs bg-primary text-white border-primary-600"
                  >
                    Featured Masterclass
                  </Badge>
                  <span className="text-xs font-mono font-medium text-accent-100 bg-primary-950/80 px-2.5 py-0.5 rounded-full border border-border-dark">
                    Offline Exclusive
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-2xl font-bold text-white tracking-tight leading-snug">
                    {featuredEvent.title}
                  </h3>
                  <p className="text-sm text-accent-100 mt-1 line-clamp-1">
                    {featuredEvent.subtitle}
                  </p>
                </div>
              </div>

              {/* Event Details */}
              <div className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-primary-950/70 border border-border-dark text-xs text-accent-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-accent shrink-0" />
                    <span>{featuredEvent.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-accent shrink-0" />
                    <span>{featuredEvent.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-accent shrink-0" />
                    <span className="truncate">Dhanmondi, Dhaka</span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-accent-100/80 leading-relaxed">
                  Participation in masterclasses is organized by corporate nomination and cohort
                  enrollment. To attend upcoming boardroom sessions, explore our executive course
                  cohorts.
                </p>

                <div className="pt-2">
                  <Link href="/courses">
                    <Button variant="primary" size="md" className="group shadow-xs">
                      <span>Explore Executive Cohorts</span>
                      <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Sessions List (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <h4 className="text-sm font-bold uppercase tracking-wider text-accent-200">
              Upcoming Executive Sessions
            </h4>

            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl bg-surface-dark-muted border border-border-dark p-5 hover:border-primary-400/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent-200 bg-primary-950 border border-primary-700/60 px-2 py-0.5 rounded">
                    <Calendar className="h-3 w-3" />
                    <span>{event.date}</span>
                  </div>
                  <span className="text-[11px] text-accent-300 font-medium">
                    {event.deliveryMode === "offline" ? "In-Person • Dhanmondi" : "Seminar"}
                  </span>
                </div>

                <h5 className="text-base font-bold text-white tracking-tight">{event.title}</h5>
                <p className="text-xs text-accent-100/80 mt-1 line-clamp-2">{event.subtitle}</p>

                <div className="mt-4 pt-3 border-t border-border-dark flex items-center justify-between text-xs text-accent-300">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-accent" />
                    <span>{event.time}</span>
                  </div>
                  <span className="text-accent-300">Venue: Dhanmondi Campus</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
