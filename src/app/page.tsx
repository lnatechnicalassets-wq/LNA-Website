import React from "react";
import { getBrandConfig } from "@/lib/content";
import { DemoLogo } from "@/components/ui/demo-logo";

export default function HomePage() {
  const brand = getBrandConfig();

  return (
    <main className="min-h-screen bg-surface-subtle text-text-primary selection:bg-primary-100 selection:text-primary-900">
      {/* Top Demo Banner */}
      <div className="bg-primary-900 text-text-inverse px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-primary-800">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-accent-400" aria-hidden="true" />
          <span className="font-medium tracking-wide">
            {brand.shortName} Development Preview — Phase 2 Design System & Tailwind CSS 4 Theme
          </span>
        </div>
        <div className="flex items-center gap-2 text-text-inverse-muted">
          <span className="uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-primary-800 border border-primary-700">
            {brand.provenance.source}
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        {/* Header / Brand Identity Section */}
        <header className="bg-surface-card rounded-2xl p-6 sm:p-8 border border-border-subtle shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <DemoLogo size="lg" showTagline={true} />
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-primary-900 mt-2">
              {brand.name}
            </h1>
            <p className="text-base sm:text-lg text-text-secondary max-w-2xl">
              {brand.tagline}. Centralized design tokens and theme configuration (Tasks P2-T0 &
              P2-T1).
            </p>
          </div>
          <div className="shrink-0 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              type="button"
              className="px-5 py-2.5 rounded-lg bg-primary-800 text-text-inverse font-medium text-sm hover:bg-primary-700 active:bg-primary-900 transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            >
              Primary Action
            </button>
            <button
              type="button"
              className="px-5 py-2.5 rounded-lg bg-accent-600 text-text-inverse font-medium text-sm hover:bg-accent-700 active:bg-accent-800 transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
            >
              Accent Action
            </button>
          </div>
        </header>

        {/* Section 1: Color Tokens */}
        <section className="space-y-6">
          <div className="border-b border-border-subtle pb-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-primary-900">
              1. Brand Palette & Color Tokens
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Calm, executive academic palette configured via Tailwind CSS 4 theme variables.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Navy Scale */}
            <div className="bg-surface-card p-6 rounded-xl border border-border-subtle shadow-xs space-y-4">
              <h3 className="text-base font-semibold text-primary-900 flex items-center justify-between">
                <span>Primary Academic Navy</span>
                <span className="text-xs font-normal text-text-muted">--primary-50 to 950</span>
              </h3>
              <div className="grid grid-cols-6 gap-2">
                <div className="space-y-1 text-center">
                  <div className="h-10 rounded bg-primary-50 border border-border-subtle" />
                  <span className="text-[10px] text-text-muted font-mono">50</span>
                </div>
                <div className="space-y-1 text-center">
                  <div className="h-10 rounded bg-primary-200" />
                  <span className="text-[10px] text-text-muted font-mono">200</span>
                </div>
                <div className="space-y-1 text-center">
                  <div className="h-10 rounded bg-primary-400" />
                  <span className="text-[10px] text-text-muted font-mono">400</span>
                </div>
                <div className="space-y-1 text-center">
                  <div className="h-10 rounded bg-primary-600" />
                  <span className="text-[10px] text-text-muted font-mono">600</span>
                </div>
                <div className="space-y-1 text-center">
                  <div className="h-10 rounded bg-primary-800" />
                  <span className="text-[10px] text-text-muted font-mono">800</span>
                </div>
                <div className="space-y-1 text-center">
                  <div className="h-10 rounded bg-primary-950" />
                  <span className="text-[10px] text-text-muted font-mono">950</span>
                </div>
              </div>
              <p className="text-xs text-text-secondary">
                Used for primary brand identity, navigation backdrops, key headers, and core
                buttons.
              </p>
            </div>

            {/* Accent Bronze Scale */}
            <div className="bg-surface-card p-6 rounded-xl border border-border-subtle shadow-xs space-y-4">
              <h3 className="text-base font-semibold text-primary-900 flex items-center justify-between">
                <span>Accent Bronze & Gold</span>
                <span className="text-xs font-normal text-text-muted">--accent-50 to 900</span>
              </h3>
              <div className="grid grid-cols-6 gap-2">
                <div className="space-y-1 text-center">
                  <div className="h-10 rounded bg-accent-50 border border-border-subtle" />
                  <span className="text-[10px] text-text-muted font-mono">50</span>
                </div>
                <div className="space-y-1 text-center">
                  <div className="h-10 rounded bg-accent-200" />
                  <span className="text-[10px] text-text-muted font-mono">200</span>
                </div>
                <div className="space-y-1 text-center">
                  <div className="h-10 rounded bg-accent-400" />
                  <span className="text-[10px] text-text-muted font-mono">400</span>
                </div>
                <div className="space-y-1 text-center">
                  <div className="h-10 rounded bg-accent-500" />
                  <span className="text-[10px] text-text-muted font-mono">500</span>
                </div>
                <div className="space-y-1 text-center">
                  <div className="h-10 rounded bg-accent-600" />
                  <span className="text-[10px] text-text-muted font-mono">600</span>
                </div>
                <div className="space-y-1 text-center">
                  <div className="h-10 rounded bg-accent-800" />
                  <span className="text-[10px] text-text-muted font-mono">800</span>
                </div>
              </div>
              <p className="text-xs text-text-secondary">
                Used for badge highlights, distinction crests, secondary CTAs, and featured
                callouts.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Semantic Status Badges (SRS 11.1 - Color + Explicit Text) */}
        <section className="space-y-6">
          <div className="border-b border-border-subtle pb-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-primary-900">
              2. Semantic Status Indicators
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Per SRS Section 11.1, status indicators must always pair color with explicit text
              labels.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Success */}
            <div className="bg-surface-card p-4 rounded-xl border border-border-subtle flex flex-col items-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-status-success-bg text-status-success-text border border-status-success-border">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-status-success-solid"
                  aria-hidden="true"
                />
                Active / Confirmed
              </span>
              <span className="text-xs text-text-muted">Enrollment confirmed</span>
            </div>

            {/* Warning */}
            <div className="bg-surface-card p-4 rounded-xl border border-border-subtle flex flex-col items-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-status-warning-bg text-status-warning-text border border-status-warning-border">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-status-warning-solid"
                  aria-hidden="true"
                />
                Seat Hold (30 min)
              </span>
              <span className="text-xs text-text-muted">Awaiting checkout</span>
            </div>

            {/* Danger */}
            <div className="bg-surface-card p-4 rounded-xl border border-border-subtle flex flex-col items-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-status-danger-bg text-status-danger-text border border-status-danger-border">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-status-danger-solid"
                  aria-hidden="true"
                />
                Expired / Failed
              </span>
              <span className="text-xs text-text-muted">Reservation expired</span>
            </div>

            {/* Info */}
            <div className="bg-surface-card p-4 rounded-xl border border-border-subtle flex flex-col items-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-status-info-bg text-status-info-text border border-status-info-border">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-status-info-solid"
                  aria-hidden="true"
                />
                Offline Batch
              </span>
              <span className="text-xs text-text-muted">Venue schedule</span>
            </div>
          </div>
        </section>

        {/* Section 3: Typography & Surfaces Showcase */}
        <section className="space-y-6">
          <div className="border-b border-border-subtle pb-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-primary-900">
              3. Typography Scale & Surface Elevation
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Hierarchical typography using Inter with high contrast (WCAG 2.2 AA compliant).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-card p-6 rounded-xl border border-border-subtle shadow-xs space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent-700">
                Display & Headings
              </span>
              <div className="space-y-2">
                <p className="text-2xl font-extrabold text-primary-900">Heading 2xl</p>
                <p className="text-xl font-bold text-primary-900">Heading xl</p>
                <p className="text-lg font-semibold text-primary-900">Heading lg</p>
              </div>
            </div>

            <div className="bg-surface-card p-6 rounded-xl border border-border-subtle shadow-xs space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent-700">
                Body & Copy
              </span>
              <div className="space-y-2">
                <p className="text-base text-text-primary">
                  Base paragraph text for course descriptions, batch schedules, and announcements.
                </p>
                <p className="text-sm text-text-secondary">
                  Secondary caption text with 4.5:1+ contrast against light surfaces.
                </p>
              </div>
            </div>

            <div className="bg-surface-card p-6 rounded-xl border border-border-subtle shadow-xs space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-accent-700">
                Code & Monospace
              </span>
              <div className="space-y-2">
                <p className="text-xs font-mono bg-surface-muted p-2 rounded border border-border-subtle text-primary-900">
                  REF: LNA-7K3M-9XQ2
                </p>
                <p className="text-xs text-text-muted">
                  Crockford Base32 application reference format (SRS FR-ENR-004).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Responsive Breakpoint Verification */}
        <section className="bg-surface-card rounded-2xl p-6 sm:p-8 border border-border-subtle shadow-sm space-y-4">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-primary-900">
            4. Responsive Breakpoint Adaptation
          </h2>
          <p className="text-sm text-text-secondary">
            Per SRS Section 11.2, responsive behaviors adapt smoothly across breakpoints:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium text-text-secondary">
            <div className="p-3 rounded-lg bg-surface-muted border border-border-subtle">
              <span className="block font-bold text-primary-900 mb-1">Mobile (320px–599px)</span>
              Single-column, full-width touch targets (min 44px), zero horizontal overflow.
            </div>
            <div className="p-3 rounded-lg bg-surface-muted border border-border-subtle">
              <span className="block font-bold text-primary-900 mb-1">Tablet (600px–1023px)</span>
              Two-column card grid, prioritized table columns, collapsible menus.
            </div>
            <div className="p-3 rounded-lg bg-surface-muted border border-border-subtle">
              <span className="block font-bold text-primary-900 mb-1">Desktop (1024px+)</span>
              Multi-column layouts, expanded data tables, persistent navigation.
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-text-muted pt-6 border-t border-border-subtle space-y-1">
          <p>
            {brand.name} ({brand.shortName}) · Built with Next.js 16, Tailwind CSS 4, and
            TypeScript.
          </p>
          <p>
            Demo branding configuration · Official brand assets to be applied prior to production
            release.
          </p>
        </footer>
      </div>
    </main>
  );
}
