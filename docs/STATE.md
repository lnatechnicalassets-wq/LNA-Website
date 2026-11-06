# Project State: Lead Nation Academy (lnabd.org) Rebuild

**Last Updated:** 6 November 2026  
**Session Context:** Phase 4 Task P4-T1 (Pre-Merge Verification, Vercel Integration & Course Navigation Readiness)  

---

## 1. Current Phase and Task
- **Current Phase:** Phase 4 (Public Website Core)
- **Current Task:** P4-T1 (Pre-Merge Verification, Vercel Analytics/Speed Insights Integration & Course Route Scope)
- **Task Status:** Completed & Verified via Automated Tests, Lint, Typecheck, and Production Build; Awaiting Owner Review & Merge Approval
- **Current Git Branch:** `task/p4-t1-homepage`
- **Base Commit:** `b306a77` (`main`, containing merged `task/p3-t1-content-schemas` via PR #9)
- **Remote Head:** `abae925` (Contains owner's uploaded temporary test image on GitHub; preserved without overwriting per Rule R14)

---

## 2. Completed Tasks

### Task P4-T1: Pre-Merge Verification & Vercel Integration
- **SRS IDs Covered:** FR-PUB-002, FR-PUB-004, FR-CRS-004, FR-CRS-005, Rule R1, Rule R3, Rule R4, Rule R5, Rule R8, Rule R14, Rule R15, WCAG 2.2 AA (2.1 Keyboard, 2.5.8 Target Size)
- **Target Branch:** `task/p4-t1-homepage`
- **Implemented Architecture:**
  1. *Vercel Monitoring Integration:*
     - Installed `@vercel/analytics` (`2.0.1`) and `@vercel/speed-insights` (`2.0.0`) pinned to exact versions.
     - Added `<Analytics />` and `<SpeedInsights />` to `src/app/layout.tsx` within the App Router root layout, preserving SSR boundaries and PublicShell providers.
     - Updated Content Security Policy (CSP) in `next.config.mjs` to authorize `https://va.vercel-scripts.com` in `script-src` and `https://*.vercel-insights.com https://va.vercel-scripts.com` in `connect-src`.
  2. *Read-Only Course Details Page (`/courses/[slug]`):*
     - Created `src/app/courses/[slug]/page.tsx` within approved course-management scope (FR-CRS-005).
     - Full static pre-rendering via `generateStaticParams()` across all 6 published catalog courses.
     - Dynamic metadata (`generateMetadata()`) and 404 handling via `notFound()`.
     - Displays duration, Dhanmondi campus location, poisha-formatted fees with discount strike-through (Rule R5), full curriculum structure with modules, key learning outcomes, audience, prerequisites, and assigned mentors linking directly to `/mentors/[slug]`.
     - Comprehensive unit tests in `src/app/courses/[slug]/page.test.tsx` (all passing).
  3. *Navigation & Faculty Spotlight Verification:*
     - Every course card links cleanly to `/courses/[slug]`.
     - Every mentor portrait links independently to `/mentors/[slug]` via sibling `<Link>` at `z-30`.
     - Full keyboard accessibility with `focus-visible:ring-4 focus-visible:ring-white`.
     - Adaptive grid layout strictly capped at max 3 portraits per row:
       - 2 mentors: 1 centered row of 2 (72px).
       - 3 mentors: 1 centered row of 3 (66px).
       - 4 mentors: 2 centered rows of 2 + 2 (66px).
       - 5 mentors: 2 centered rows of 3 + 2 (62px).
       - 6 mentors: 2 centered rows of 3 + 3 (62px).
  4. *Quality Gates Evidence:*
     - `pnpm content:validate`: PASSED (0 errors).
     - `pnpm typecheck`: PASSED (`tsc --noEmit` exit code 0).
     - `pnpm lint`: PASSED (`eslint .` exit code 0).
     - `pnpm prettier --check .`: PASSED (all files formatted).
     - `pnpm test`: 23/23 tests passing across 5 suites (`courses-section.test.tsx`, `page.test.tsx`, `courses/[slug]/page.test.tsx`, `mentors/[slug]/page.test.tsx`, `health/route.test.ts`).
     - `pnpm build`: Next.js Turbopack build succeeded with exit code 0; all 32 static paths generated (including 6 `/courses/[slug]` and 23 `/mentors/[slug]` routes).
     - Viewport overflow checks (320px, 390px, 768px, 1024px, 1440px): 100% `hasOverflow=false`.

---

## 3. Git Checkpoint (Rule R14)

Per human-controlled Git protocol, no staging, commits, pushes, merges, or resets were performed.

- **Current Branch:** `task/p4-t1-homepage`
- **Recommended Conventional Commit:**
  ```bash
  feat(deploy): integrate vercel monitoring, add read-only course details page, and verify production gates [FR-PUB-002, FR-CRS-005]
  ```

Per human-controlled Git protocol, no staging, commits, pushes, merges, or resets were performed.

- **Current Branch:** `task/p4-t1-homepage`
- **Recommended Conventional Commit:**
  ```bash
  feat(courses): adapt faculty spotlight to max 3 portraits per row [FR-PUB-002, FR-CRS-004]
  ```
