# Project State: Lead Nation Academy (lnabd.org) Rebuild

**Last Updated:** 9 November 2026  
**Session Context:** Phase 4 Course-Owned Faculty Roster Architecture (ADR 0012) — Marked ADR 0012 as Accepted. Migrated mentor assignments from mentors.json/hero-slides.json into ordered `mentorIds` arrays directly on each Course in `courses.json`. Upgraded `CourseSchema` and `scripts/validate-content.mjs` to strictly enforce uniqueness and referential integrity against non-existent mentor IDs. Unified `getCourseMentorRoster` across Hero slides, Course cards, and Course details pages.

---

## 1. Current Phase and Task
- **Current Phase:** Phase 4 (Public Website Core)
- **Current Task:** Task P4-T27 / Course Mentor Roster JSON Migration (ADR 0012)
- **Task Status:** Fully Completed.
- **Current Git Branch:** `task/p4-t24-about-page`
- **Base Commit:** `fc605ae`

---

## 2. Completed Tasks

### Task P4-T27 / Course Mentor Roster JSON Migration (ADR 0012)
- **SRS IDs Covered:** FR-CRS-004, FR-PUB-002, Rule R1, Rule R2, Rule R4, Rule R6, Rule R7, Rule R8, Rule R11, Rule R12, Rule R13, Rule R14, Rule R15, Rule R19
- **Architecture & Deliverables:**
  1. *ADR 0012 Acceptance (`docs/decisions/0012-course-mentor-roster-relationship.md`):*
     - Marked ADR 0012 Accepted per repo conventions. Established `Course` as aggregate root holding canonical ordered `mentorIds`.
  2. *Catalog Data Migration (`content/catalog/courses.json`):*
     - Added ordered `mentorIds` to `mto-readiness` (5 mentors) and `irgp` (8 mentors).
  3. *Schema & Content Validation (`src/lib/content/courses.ts`, `scripts/validate-content.mjs`):*
     - Added `mentorIds` to `CourseSchema` with `.refine()` rule rejecting duplicate IDs.
     - Added referential integrity check verifying all course mentor IDs exist in `mentors.json`.
  4. *Redundant Field Removal:*
     - Removed `mentorIds` from `content/home/hero-slides.json`.
     - Removed `courseId` and `courseIds` from all 15 mentor records in `content/home/mentors.json`.
  5. *Shared Resolver & Consumers (`src/lib/mentors.ts`):*
     - Upgraded `getCourseMentorRoster` to resolve from `course.mentorIds`.
     - Threaded `courses` through `HomePage` -> `HeroSection` -> `HeroSlider` -> `HeroSlide`.
     - Preserved hero slice limits (5 for MTO, 8 for IRGP) and full roster display on course details pages.


### Task P4-T26 / Official Brand Logo & Navigation Shell Integration
- **SRS IDs Covered:** FR-PUB-001, FR-PUB-002, Rule R1, Rule R2, Rule R4, Rule R6, Rule R7, Rule R8, Rule R11, Rule R12, Rule R13, Rule R14, Rule R15, Rule R19
- **Architecture & Deliverables:**
  1. *Brand Media Assets Generated (`public/images/brand/` & Tab Icons):*
     - `public/images/brand/logo.png`: Full authentic brand lockup (406x425, RGBA).
     - `public/images/brand/logo-crest.png`: Circular crest emblem (406x277, RGBA) for light backgrounds.
     - `public/images/brand/logo-white.png`: Full inverted white/soft-teal lockup (406x425, RGBA) for dark backgrounds.
     - `public/images/brand/logo-crest-white.png`: Inverted white/soft-teal circular crest emblem (406x277, RGBA) for footer.
     - `src/app/icon.png`: 48x48 RGBA square tab icon.
     - `src/app/apple-icon.png`: 180x180 RGBA Apple touch icon.
     - `public/favicon.ico`: 32x32 multi-platform favicon.
     - `public/favicon.png`: 48x48 PNG tab favicon.
  2. *Top Demo Bar Removal & Fixed Navigation (`src/components/public/site-header.tsx`):*
     - Completely eliminated the top dark development preview banner (`Development Preview (Gate B0 Demo Branding)`).
     - Upgraded `<header>` to `sticky top-0 z-50 w-full bg-surface-base/95 backdrop-blur-md border-b border-border-subtle shadow-xs`, locking the navigation bar permanently to the top of the viewport across all scroll states without overlapping page content.
  3. *Brand Logo Component Upgrade (`src/components/ui/demo-logo.tsx`):*
     - Replaced SVG placeholder monogram shield with authentic circular crest emblem and official brand typography.
     - Added support for `variant="crest"` (default), `variant="full"`, and `inverted` mode for dark surfaces.
  4. *Footer Lockup (`src/components/public/site-footer.tsx`):*
     - Integrated `logo-crest-white.png` alongside serif `Lead Nation Academy` brand heading.
  5. *Quality & Verification:*
     - All 5 public component test suites passing (11/11 tests).
     - `pnpm typecheck`: 0 errors.
     - `pnpm lint`: 0 errors.
     - `pnpm format:check`: 100% formatted.
     - `pnpm build`: 0 errors, 39 static routes generated.

### Task P4-T25 / Public Content & Asset Migration from WordPress Source
- **SRS IDs Covered:** FR-PUB-001, FR-PUB-002, FR-PUB-003, FR-PUB-004, FR-PUB-005, FR-PUB-006, FR-PUB-007, FR-PUB-008, Rule R1, Rule R2, Rule R4, Rule R5, Rule R6, Rule R7, Rule R8, Rule R11, Rule R12, Rule R13, Rule R14, Rule R15, Rule R19
- **Architecture & Deliverables:**
  1. *Source Extraction & Parsing:*
     - Parsed 141 MB WordPress backup (`lnabdorg_wp955.sql`) using custom Node streaming SQL parser to extract published posts and `_elementor_data` structures.
     - Extracted authentic public copy for organization profile, 7 partners, 5 internships, 11 corporate mentors, 10 IRGP FAQs, 4 news articles, 16-module IRGP curriculum, and policy documents (14 Terms clauses, 12 Privacy clauses).
  2. *Asset Migration (44 images copied to public/images/):*
     - Partners (7): `btrc.png`, `sheba.png`, `ictd.png`, `ecourier.png`, `goyara.png`, `unicert.png`, `triptakerz.png`.
     - Internships (5): `chaldal.png`, `fylo.png`, `dotlines.png`, `ghari.png`, `triptakerz.png`.
     - Mentors (11): `ilmul-sajib.png`, `gm-kamrul.png`, `biplob-rahul.png`, `mir-hasib.png`, `sayeda-salma.png`, `zia-ashraf.png`, `zeeshan-huq.png`, `istiaque-bhuiyan.png`, `shahnawaj-chowdhury.png`, `munaf-chowdhury.png`, `talat-rahim.png`.
     - News (17): High-resolution photos covering BTRC Fair (2), CUB Partnership (5), and AIUB IRGP Launch (10).
     - IRGP Gallery (4): Real classroom and workshop photos (`aiub-classroom-1.jpeg`, `aiub-booth-2.jpeg`, `aiub-interview-3.jpeg`, `aiub-discussion-4.jpeg`).
     - 23 unassigned source images cataloged and excluded from repository.
  3. *Content Model Updates (content/):*
     - `content/site/organization.json`: Official registered office (`Plot 06, Tejgaon Industrial Area, Dhaka - 1208`), phone (`+880 1581-799666`), email (`info@lnabd.org`), Class A provenance.
     - `content/home/contact.json`: Aligned phone, address, and hours with Class A source.
     - `content/home/partners.json`: Replaced mock partners with 7 real corporate/government partners.
     - `content/home/internships.json`: 5 real internships with integer poisha stipends (600,000 to 1,200,000 poisha).
     - `content/home/faqs.json`: 10 published IRGP questions and answers.
     - `content/home/mentors.json`: 11 real corporate mentors added with authentic designations and transparent portraits.
     - `content/news/articles.json`: 3 published WordPress news stories with structured blocks and gallery images.
     - `content/catalog/courses.json`: Updated IRGP with authentic 16-module curriculum structure, AIUB venue, and real outcomes.
     - `src/app/terms/page.tsx` & `src/app/privacy/page.tsx`: Updated with verbatim published legal clauses.
  4. *Automated Quality & Risk-Based Testing (ADR 0010):*
     - Content Validation (`scripts/validate-content.mjs`): PASS (exit code 0).
     - TypeScript Check (`tsc --noEmit`): PASS (exit code 0).
     - ESLint (`eslint .`): PASS (exit code 0, 0 errors, 0 warnings).
     - Prettier Formatter (`prettier --check .`): PASS (exit code 0).
     - Brand Token Sync (`scripts/generate-tokens.mjs --check`): PASS (exit code 0).
     - Next.js Production Build (`next build --experimental-build-mode compile && generate`): PASS (exit code 0, 37 static routes generated).
     - Unit & Integration Tests (`vitest run`): 21 test files passed, 7 failed due to pre-existing UI divergences from previous tasks where tests were explicitly skipped.


### Task P4-T24 / About Lead Nation Academy Page (/about)
- **SRS IDs Covered:** FR-PUB-001, Rule R1, Rule R2, Rule R4, Rule R6, Rule R7, Rule R8, Rule R13, Rule R14, Rule R15, Rule R19
- **Architecture & Deliverables:**
  1. *About Page Implementation (`src/app/about/page.tsx`):*
     - Replaced placeholder with full editorial layout matching approved mockup.
     - **Hero Section**: Full-width wide collaborative learning photograph (`/images/about-hero.jpg`), uppercase eyebrow ("ABOUT LEAD NATION ACADEMY"), dual-line serif headline ("A seat at" / italic "the table."), subtitle, soft-teal "Get to know LNA →" CTA button scrolling to `#who-we-are`, and brand motto ("Learn. Lead. Succeed.").
     - **Who We Are Section**: 2-column layout with authentic sketching photo (`/images/about-sketching.jpg`) on the left, and editorial text, headline ("Learning with a purpose."), and two-column Mission ("01 Our mission") & Vision ("02 Our vision") cards on the right.
     - **CTA Banner**: Soft-teal card ("Take the next step with LNA.") with deep teal "Explore courses →" button linking to `/#courses`.
  2. *Navigation & Shared Shell Integration:*
     - Header active indicator cleanly displays on `/about` with bottom underline.
     - Deep Teal editorial footer integrates seamlessly via `PublicShell`.
  3. *Quality & Verification:*
     - Content validation (`node scripts/validate-content.mjs`): Passed cleanly.
     - TypeScript compilation (`npx tsc --noEmit`): Passed with 0 errors.

### Task P4-T23 / Footer Policies Column & Legal Pages
- **SRS IDs Covered:** FR-PUB-001, Rule R1, Rule R2, Rule R4, Rule R7, Rule R8, Rule R13, Rule R14, Rule R19
- **Architecture & Deliverables:**
  1. *Footer Policies Column (src/components/public/site-footer.tsx):*
     - Added dedicated "Policies" column with thin vertical divider lines between Explore and Get in touch.
     - Displaying "Terms & Conditions" (/terms) and "Privacy Policy" (/privacy).
     - Refund policy link removed per user request.
  2. *Legal Documentation Pages (src/app/):*
     - Created accessible /terms and /privacy pages matching Deep Teal & Pearl brand tokens.
  3. *Navigation Configuration (content/site/navigation.json):*
     - Aligned footer.columns schema to include Explore, Policies (Terms & Conditions, Privacy Policy), and Get in touch.

### Task P4-T22 / Deep Teal Editorial Site Footer
- **SRS IDs Covered:** FR-PUB-001, Rule R1, Rule R2, Rule R4, Rule R6, Rule R7, Rule R8, Rule R13, Rule R14, Rule R19
- **Architecture & Deliverables:**
  1. *Visual & Layout Implementation (`src/components/public/site-footer.tsx`):*
     - Replaced light pearl footer with full-width deep teal (`#063A46`) surface with pearl typography.
     - Thin soft-teal top divider line (`border-t border-[#8ABBC2]/40`) separating footer from restored homepage Contact section.
     - Left-hand block: Serif brand label "Lead Nation Academy", large editorial serif headline "Ready for your next step?", and soft-teal button ("Enroll Now →") linking to `/enroll`.
     - Explore column: Nav links in exact order (`About Us`, `Courses`, `Mentors`, `Internship`, `News`) reusing active navbar destinations with smooth-scrolling for homepage anchors.
     - Thin vertical divider line (`w-px bg-white/20`) between Explore and Get in touch columns on desktop.
     - Get in touch column: Contact Us linking to `/#contact`, mailto link for `info@lnabd.org`, and Dhanmondi, Dhaka location with official Lucide icons (`Mail`, `MapPin`).
     - Subtle topographical contour lines along far-right edge rendered via responsive SVG paths.
     - Bottom utility row: Thin horizontal divider (`bg-white/15`), copyright notice on left, and working smooth Back to top control on right.
     - Mobile layout: Stacks headline & CTA button first, followed by Explore, Get in touch, and utility row with full-width accessible touch targets.
  2. *Navigation Configuration (`content/site/navigation.json`):*
     - Aligned `footer.columns` to match the two-column editorial structure (Explore and Get in touch).

### Task P4-T21 / Homepage Section 4 & 5 Design Restoration
- **SRS IDs Covered:** FR-PUB-002, FR-PUB-006, Rule R1, Rule R2, Rule R4, Rule R6, Rule R7, Rule R8, Rule R13, Rule R14, Rule R19
- **Architecture & Deliverables:**
  1. *Section 5: Real Learning. Real Impact. (`src/components/home/reviews-section.tsx`):*
     - Reverted from 2-column compromise back to approved 3-column composition:
       - Zone 1: `IrgpOverviewCard` (approx 29% width / `xl:col-span-4`) with deep teal rounded rectangle card.
       - Zone 2: `IrgpGallery` (approx 36% width / `xl:col-span-4`) with 2x2 photo mosaic and interactive lightbox.
       - Zone 3: `ReviewsCarousel` (approx 35% width / `xl:col-span-4`) with authentic learner voices across cohorts.
     - Restored container max-widths (`max-w-7xl xl:max-w-[1360px] 2xl:max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-10`).
     - Restored section vertical padding (`py-16 sm:py-24 lg:py-28`) and heading typography (`lg:text-5xl`).
     - Preserved `IrgpOutcomesStrip` spacing, `CommunityBanner`, and external `lna:open-irgp-story` event listeners.
  2. *Section 4: Meet Our Mentors (`src/components/home/`):*
     - Reverted `mentor-carousel.tsx` from flat horizontal overflow scroll back to accepted 5-card symmetrical layered 3D carousel deck (`perspective: 1400`, `slots: -2, -1, 0, 1, 2`).
     - Restored exact card dimensions (`w-[280px] sm:w-[300px] xl:w-[315px] h-[380px] sm:h-[400px] xl:h-[420px]`), specular glass sheen, opaque card foundation, and quick-view trigger.
     - Restored carousel placement inside the diagonal deep teal gradient sweep background.
     - Restored category pills & search field alignment in `mentors-section.tsx`.
     - Restored approved eyebrow (`Our Mentors` with `#172E35` styling) and serif heading typography (`lg:text-[46px] font-extrabold`).

### Task P4-T20 / Header Navigation (Official Logo & 6-Link Structure + /about Destination)
- **SRS IDs Covered:** FR-PUB-001, Rule R1, Rule R2, Rule R4, Rule R6, Rule R7, Rule R8, Rule R13, Rule R14, Rule R19
- **Architecture & Deliverables:**
  1. *Navigation Architecture (`content/site/navigation.json`):*
     - Header navigation items set to exact sequence:
       - `About Us` → `/about`
       - `Courses` → `/#courses`
       - `Mentors` → `/#mentors`
       - `Internship` → `/#internships`
       - `News` → `/news`
       - `Contact Us` → `/#contact`
     - Header CTA set to `Enroll Now` → `/enroll`.
     - Footer navigation data left untouched.
  2. *Working About Destination (`src/app/about/page.tsx`):*
     - Created accessible `/about` placeholder page with executive overview copy, WCAG AA compliance, and home/courses action buttons so the `/about` navbar link is functional.
  3. *Header & Mobile Nav Components (`src/components/public/`):*
     - Desktop (`site-header.tsx`): Displays only the official LNA logo monogram and brand name (demo badge removed), active state support for `/news` and `/about`, and primary teal "Enroll Now" CTA button on the far right.
     - Mobile (`mobile-nav.tsx`): Displays official LNA logo, links in matching order, prominent full-width teal "Enroll Now" CTA directly after the links, and automatic drawer dismissal upon click.
  3. *Homepage Contact Section Restoration (`src/app/page.tsx`):*
     - Diagnosed git history: Identified that `ContactSection` was inadvertently dropped in commit `0ab9f0a` during the course detail pages update.
     - Restored `<ContactSection config={contactConfig} />` in its original location on the homepage (Section 7, right above the footer).
     - Component retains native `id="contact"` and `scroll-mt-20`.
     - Removed the duplicate `id="contact"` from `src/components/public/site-footer.tsx`.
  4. *Flagged Missing Destinations:*
     - Currently, no dedicated `/internships` route exists in `src/app/`. The navbar links to the working homepage section anchor `/#internships`. When a dedicated `/internships` page is created, the configuration can seamlessly switch to `/internships`.
  5. *Quality & Verification:*
     - Content validation (`node scripts/validate-content.mjs`): Clean pass.
     - TypeScript compilation (`pnpm typecheck`): Clean pass with zero errors.
     - Contact section unit tests (`pnpm test src/components/home/contact-section.test.tsx`): 3/3 passed.
     - Mobile navigation tests (`pnpm test src/components/public/mobile-nav.test.tsx`): 3/3 passed.
     - Header tests (`pnpm test src/components/public/site-header.test.tsx`): 3/3 passed.
     - Next.js production build (`pnpm build`): 114/114 static routes generated with 0 errors.

### Task P4-T18 / Shared Public Enrollment Flow
- **SRS IDs Covered:** FR-ENR-001, FR-ENR-002, FR-ENR-005, FR-CRS-004, FR-CRS-005, Rule R1, Rule R2, Rule R3, Rule R4, Rule R5, Rule R6, Rule R7, Rule R8, Rule R11, Rule R12, Rule R13, Rule R14, Rule R15, Rule R16, Rule R19
- **Architecture & Deliverables:**
  1. *Universal Enrollment Flow (`/enroll`):*
     - Created `src/app/enroll/page.tsx` with `<Suspense>` boundary and metadata, loading catalog courses, batches, and enrollment configuration.
     - Created `src/app/enroll/enrollment-view.tsx` implementing all 7 state transitions matching the 13 desktop and 10 mobile approved mockups:
       - **Stage 1 (Program Selection):** General entry with empty picker (`Choose what comes next.`). Loads only available batches for chosen program. Handles "No open batches" state with info alert box and "Explore programs" link. Supports preselection via query params (`?course=...&batch=...`). Changing program clears batch selection.
       - **Stage 2 (Applicant Details):** Collects Full Name, Email, and WhatsApp number with input validation. Selected program summary card with "Change" link.
       - **Stage 2b (Program Questions):** Renders program-specific questions (e.g. University, Department, Professional phase, Goals) configured in `content/enrollment/config.json`. Automatically bypassed if program has no questions.
       - **Stage 3 (Review):** Comprehensive summary with "Edit" link back to details, program summary, answers view/collapse, and payable fee (BDT integer poisha via Rule R5 or "Free").
       - **Stage 4 (Payment Methods - Paid):** Configured options for bKash (simulated checkout modal with verification/failure test handlers) and Bank transfer (configured bank, account, and reference entry).
       - **Stage 5 (Outcomes):**
         - Verified Paid Enrollment: `11-enrollment-confirmed.png` with green `Confirmed` badge, `LNA-XXXX-XXXX` reference, and confirmation photo.
         - Free Workshop Registration: `13-free-registration-confirmed.png` bypassing payment directly after review.
         - Bank Transfer Review: `09-payment-pending.png` with amber `Pending verification` badge.
         - Payment Failure: `10-payment-failed.png` with rose error alert and retry/change-method actions.
  2. *Visual & Asset Integration:*
     - Copied approved WebP assets to `public/images/enrollment/`: `lna-enrollment-workshop-1120.webp`, `640.webp`, `lna-enrollment-confirmation-1120.webp`, `640.webp`.
     - Desktop: Editorial two-column layout with fixed-position photo panel, dark gradient overlay, and live white caption typography.
     - Mobile: Single-column layout showing shallow workshop crop on entry screen, form-prioritized intermediate steps (photo hidden), and confirmation crop on confirmation.
  3. *Entry Point Wiring:*
     - Updated course detail view `src/app/courses/[slug]/course-detail-view.tsx` "Enroll in {course.title}" buttons to route directly to `/enroll?course=${course.id}&batch=${batch.id}`.
     - Added `career-planning-workshop` to `content/catalog/courses.json` and `batches.json` to enable testing of the free registration path.
  4. *Quality & Verification:*
     - Tokens check (`pnpm tokens:check`): Clean pass.
     - Content validation (`pnpm content:validate`): Clean pass.
     - TypeScript compilation (`pnpm typecheck`): Clean pass with zero errors.
     - Reference generator unit test (`src/lib/enrollment/reference.test.ts`): Passed.
     - Next.js production build (`pnpm build`): 114/114 static routes generated with 0 errors.

### Task P4-T17 / Dedicated News & Updates Archive & Article Pages
- **SRS IDs Covered:** FR-PUB-001, FR-PUB-002, Rule R1, Rule R2, Rule R3, Rule R4, Rule R6, Rule R7, Rule R8, Rule R11, Rule R12, Rule R13, Rule R14, Rule R15, Rule R16, Rule R19
- **Architecture & Deliverables:**
  1. *News Content Architecture & Schema:*
     - Created `src/lib/content/news.ts` defining `NewsArticleSchema` (id, slug, title, excerpt, category, publishedAt, updatedAt, author, readTime, coverImage, coverImageAlt, featured, status, blocks, seo, provenance).
     - Defined `ArticleBlockSchema` supporting structured types: paragraphs, headings (levels 2/3 with stable IDs), lists (ordered/unordered), images (with optional captions), and quotes.
     - Implemented `INewsRepository` and extended `JsonContentRepository` in `src/lib/content/repository.ts` with methods: `getAllArticles()`, `getPublishedArticles()`, `getArticleBySlug()`, `getFeaturedArticles()`, and `getRelatedArticles()`.
     - Seeded 7 high-fidelity development demo articles (`content/news/articles.json`) with Class B provenance matching the approved reference layouts and real project photography.
     - Updated `scripts/validate-content.mjs` to validate news schema and scan for secrets.
  2. *News Archive (`/news`):*
     - Server Component `src/app/news/page.tsx` pre-rendering published articles wrapped in `<Suspense>`.
     - Client Component `src/app/news/news-archive-view.tsx` with:
       - Header: Exact page title "News & Updates", supporting copy "Invitations, partnerships, and moments from LNA." (no mastheads or invented branding).
       - Category Filters: All updates, Partnerships, Invitations, Program updates, Community.
       - Labeled Search: Live text search matching title, excerpt, and body content with clear button.
       - URL synchronization: search, category, and page state synced to query parameters (`?category=...&search=...&page=...`).
       - Featured Composition: Asymmetric layout on unfiltered view with large lead story on left (`NewsLeadCard`) and two stacked side stories on right (`NewsCard` compact).
       - Latest Updates: 3-column story grid beneath centered accent heading "LATEST UPDATES".
       - Filtered/Searched View: Automatically switches to clean results grid with result count and clear filters action.
       - Pagination: Derived from actual filtered count with numeric buttons and Prev/Next controls (hidden when total pages <= 1).
  3. *Dynamic Article Details (`/news/[slug]`):*
     - Server Component `src/app/news/[slug]/page.tsx` with `generateStaticParams()` pre-rendering all 7 articles, static metadata generation, and 404 handling.
     - Client Component `src/app/news/[slug]/news-article-view.tsx`:
       - Breadcrumbs (`News & Updates / [Category]`) and `← Back to news` navigation.
       - Split introduction: Category, Demo article badge, large serif headline, excerpt, metadata row (`Date · Author · Reading time`), and `ArticleShare` on the left; cover image on the right.
       - Social Sharing (`ArticleShare`): Copy link (with accessible "Copied!" feedback), LinkedIn, WhatsApp, and Email sharing with proper URL encoding.
       - Table of Contents (`TableOfContents`): Auto-generated from actual article headings with stable IDs, smooth scroll with sticky header offset (`scroll-mt-28`), active heading highlighting via scroll observer, and mobile collapsible accordion.
       - Safe Content Rendering: Formatted paragraphs, serif section headings, lists, captioned figures, and blockquotes without unsanitized HTML.
       - Related Updates: 3-column grid featuring up to 3 published articles (preferring same category, excluding current).
  4. *Global Navigation & Footer Integration:*
     - Added "News & Updates" (`/news`) to `content/site/navigation.json`.
     - Updated `SiteHeader` and `MobileNav` to display active state (deep teal `#086477` and underline indicator) on both `/news` and `/news/[slug]`.
     - Added "News & Updates" under the Explore column in `SiteFooter`.
  5. *Quality & Verification:*
     - Next.js production build (`pnpm build`): 112/112 static routes generated cleanly with zero errors.
     - Content validation script (`node scripts/validate-content.mjs`): All content schemas and referential integrity passed.

### Task P4-T16 / Dedicated Course Details Pages (MTO Readiness & IRGP)
- **SRS IDs Covered:** FR-PUB-001, FR-PUB-002, FR-PUB-003, Rule R1, Rule R2, Rule R3, Rule R4, Rule R5, Rule R6, Rule R7, Rule R8, Rule R11, Rule R12, Rule R13, Rule R14, Rule R15, Rule R16, Rule R19
- **Architecture & Deliverables:**
  1. *Dedicated Course Details Route (`/courses/[slug]`):*
     - Reused existing dynamic route `src/app/courses/[slug]/page.tsx` with static parameter pre-rendering (`generateStaticParams`) and static metadata generation.
     - Created `src/app/courses/[slug]/course-detail-view.tsx` matching the approved classroom-led visual design:
       - Palette: Pearl background (`#F6FAFA`), deep text ink (`#172E35`), deep teal branding (`#086477`), soft teal accents (`#C5E2E5`), crisp white cards with fine borders (`#D5E2E5` / `#E5ECEE`).
       - Header/Banner: Wide classroom learning environment photo (`/images/course-classroom-banner.jpg` for MTO, cohort session photo for IRGP) with subtle caption.
       - Compact Stats Divider Row: 16 sessions (1.5h each), 8 essential skills, 5 industry mentors (MTO) / 10 focus areas, 8 industry mentors, 100% completed (IRGP).
       - Responsive Layout: Desktop 70/30 split with sticky sidebar summary card; mobile single-column reflow placing a compact summary card above the tab navigation for immediate accessibility.
       - Accessible Tabs (`role="tablist"`, `aria-selected`, `aria-controls`): Overview (default), Curriculum (interactive accordions with concept/practice/discussion breakdown), and Mentors (faculty list with initials avatar fallbacks and prominent company names).
       - Pre-footer Call to Action: "Your next step starts here." banner directing back to `/#courses`.
       - MTO Enrollment Dialog: Accessible modal with course & batch data (`batch-mto-2026-01`), enrollment checklist, and bKash payment gateway initiation entry point.
       - IRGP Program Completion: Program story state with links to authentic learner reviews (`/#reviews`).
  2. *Navigation & Link Refactor:*
     - Homepage course cards (`src/components/home/course-card.tsx`) now wrap into standard semantic `<Link>` elements pointing directly to `/courses/mto-readiness` and `/courses/irgp`, supporting browser back navigation and open-in-new-tab.
     - Hero slider CTAs (`content/home/hero-slides.json` and `src/components/home/hero/hero-slide.tsx`) now directly link to `/courses/mto-readiness` and `/courses/irgp` without modal interception.
     - Cleaned up obsolete modal state from `src/components/home/courses-section.tsx`.
  3. *Quality & Verification:*
     - Production build verified: 104/104 static routes generated with zero errors. Visual screenshots and test suites skipped per explicit instruction.

### Task P4-T15 / Hero Slider Mentor Name + Company Logo Nameplates
- **SRS IDs Covered:** FR-PUB-001, FR-PUB-002, Rule R1, Rule R2, Rule R3, Rule R4, Rule R6, Rule R7, Rule R8, Rule R11, Rule R12, Rule R13, Rule R14, Rule R15, Rule R16, Rule R19
- **Architecture & Deliverables:**
  1. *Hero Nameplate Simplification:*
     - Replaced 3-line text stack (Name, Designation, Company) with a clean 2-element layout: Mentor Name + Company Logo.
     - Enhanced `CompanyLogo` with corporate brand marks for BRAC Bank, City Bank, Lead Nation Academy, Pathao, BAT, Modhumoti Bank, Akij Group, Aventec PLC, Sheba Platform, e-Courier, Chaldal, and BrandGear.
     - Compacted nameplate height (`~46px`), providing more headroom and neck visibility for mentor portraits above.
  2. *Quality & Verification:*
     - Production build verified: 104/104 static routes generated with zero errors.

### Task P4-T14 / Responsive Mentors Carousel Layout
- **SRS IDs Covered:** FR-PUB-001, FR-PUB-002, Rule R1, Rule R2, Rule R3, Rule R4, Rule R6, Rule R7, Rule R8, Rule R11, Rule R12, Rule R13, Rule R14, Rule R15, Rule R16, Rule R19
- **Architecture & Deliverables:**
  1. *Responsive Card Viewport Configuration:*
     - Desktop (`lg:` / `xl:`): Displays 3 equal-sized cards side by side with consistent 20px spacing (`gap-5`).
     - Tablet (`sm:` / `md:`): Displays 2 equal-sized cards side by side with consistent 20px spacing (`gap-5`).
     - Mobile (`< sm:`): Displays 1 complete, centered card (`w-[85vw] max-w-[310px] snap-center`) with padded centering.
  2. *Elimination of 3D Skew & Distortion:*
     - Removed 3D perspective deck, `rotateY`, `translateZ`, and compressed card overlaps on mobile.
     - Preserved clean, upright, flat card aesthetic with solid cream-white foundation (`#FAF9F6`), subtle border, and soft shadows.
  3. *Unclipped Text & Full Readability:*
     - Removed truncation on mentor names, allowing clean natural wrapping.
     - Fully readable designations (`#526E77`) and prominent company affiliations (`#086477`).
     - Preserved company logos (`CompanyLogo`) and quick-view modal triggers.
  4. *Smooth Mobile Swipe & Hidden Scrollbars:*
     - Native momentum scrolling and swipe gestures on mobile via `overflow-x-auto snap-x snap-mandatory touch-pan-x`.
     - Completely hidden horizontal scrollbars across all browsers (`[&::-webkit-scrollbar]:hidden`, `scrollbarWidth: none`, `-ms-overflow-style: none`).
     - Swipe-vs-tap detection prevents accidental quick-view modal popups during horizontal swipes.
  5. *Controls & Autoplay Synchronization:*
     - Previous / Next buttons, 5 indicator dots, and position counter (`01 / 80 Mentors`) stay perfectly synchronized with manual swipes and programmatic navigation.
     - 4-second autoplay with automatic pausing on hover, focus, touch, and modal open.
  6. *Quality & Verification:*
     - Production build verified: 104/104 static routes generated with zero errors. Automated tests and screenshot scripts skipped per user instruction.

### Task P4-T12 / MTO Folded Pearl Layers Hero Slide Implementation
- **SRS IDs Covered:** FR-PUB-001, FR-PUB-002, FR-PUB-004, Rule R1, Rule R2, Rule R3, Rule R4, Rule R6, Rule R7, Rule R8, Rule R11, Rule R12, Rule R13, Rule R14, Rule R15, Rule R16, Rule R19
- **Architecture & Deliverables:**
  1. *MTO Desktop Layout (Left ~35% & Right ~65%):*
     - Recreated the folded pearl, soft-teal (`#C5E2E5`), and deep-teal (`#043B47` to `#0B6B7E`) sweeping background planes behind the portraits with drop shadows.
     - Left column includes faint oversized "MTO" watermark in the upper left, "FEATURED PROGRAM" badge, 3-line serif title (*MTO / Readiness / Program*) with italic deep-teal *Program*, deep teal accent bar, subtitle (*Graduate Career & Leadership Accelerator*), description (*Practical preparation for Management Trainee Officer opportunities.*), three statistics (*16 sessions / 1.5h each*, *8 essential skills*, *5 industry mentors*), primary CTA button (*Explore the Program →*), and compact calendar badge (*Classes begin December 1*).
  2. *Right Mentor Showcase (TWO–ONE–TWO Composition):*
     - Arranged five mentors in a 4-column CSS grid on desktop:
       - Top row: Arif Rahman (`col-span-2 col-start-1`), Tanvir Hossain (`col-span-2 col-start-3`).
       - Middle row: Mir Hasib Mahmud, centered (`col-span-2 col-start-2`, `isFeatured={true}`).
       - Bottom row: Fahim Ahmed (`col-span-2 col-start-1`), Sayem Chowdhury (`col-span-2 col-start-3`).
  3. *Folded Card Construction & Nameplate Hierarchy:*
     - Angled portrait panel (`clipPath: polygon(14% 0%, 100% 0%, 86% 100%, 0% 100%)`) with offset deep-teal backing layer.
     - Calibrated headroom and object positioning (`center 2%` to `center 4%`) preserving complete faces, foreheads, and chins.
     - Horizontal pearl nameplates (`bg-white/98`, `border-[#D5E5E8]`, `shadow-md`) overlapping the lower card edge.
     - Hierarchy: Name in bold dark ink (`#172E35`), designation in readable neutral (`#526E77`), company affiliations in prominent bold deep-teal (`#086477`): *BRAC Bank*, *City Bank*, *Lead Nation Academy*, *Pathao*, *BAT*.
  4. *Responsive Mobile Reflow (390 × 844):*
     - Editorial column on clean pearl background for high contrast.
     - Mentors reflow into compact 4-column grid preserving the TWO–ONE–TWO structure (middle mentor centered) framed inside a folded deep-teal container.
  5. *Quality & Verification:*
     - Production build verified: 104/104 static routes generated with zero errors.
     - Visual inspection artifacts: `mto-folded-desktop-1440.png`, `mto-folded-nameplates-closeup.png`, `mto-folded-mobile-390.png`, and `irgp-slide-confirmed-unchanged.png`. Automated tests skipped per user request.

### Task P4-T11 / IRGP Folded Pearl Layers Hero Slide & Internship Carousel Fix
- **SRS IDs Covered:** FR-PUB-001, FR-PUB-002, FR-PUB-004, Rule R1, Rule R2, Rule R3, Rule R4, Rule R6, Rule R7, Rule R8, Rule R11, Rule R12, Rule R13, Rule R14, Rule R15, Rule R16, Rule R19
- **Architecture & Deliverables:**
  1. *IRGP Desktop Layout (Left ~34% & Right ~66%):*
     - Built folded background layers using angled SVG planes with deep-teal (`#043B47` to `#0B6B7E`), mid-teal, and soft-mint wave gradients with drop shadows.
     - Left column includes faint oversized "IRGP" watermark, "COMPLETED PROGRAM · IRGP" pill badge, 4-line serif heading with italic deep-teal "Program", horizontal teal accent bar, supporting copy, two key statistics ("10 focus areas", "8 industry mentors") with icons, primary CTA button ("Explore the IRGP Story"), and secondary underlined text link ("View Learner Experiences").
  2. *Right Mentor Showcase (3–2–3 Composition):*
     - Arranged eight mentors in a 6-column CSS grid on desktop:
       - Row 1: Shahnawaj Chowdhury, G M Kamrul Hassan, Istiaque Ahmed Bhuiyan (cols 1-2, 3-4, 5-6)
       - Row 2: Munaf Mojib Chowdhury, Ilmul Haque Sajib (centered in cols 2-3, 4-5)
       - Row 3: Biplob G Rahul, Zia Ashraf, Sayeda Umme Salma (cols 1-2, 3-4, 5-6)
  3. *Folded Card Construction & Nameplate Hierarchy:*
     - Coded angled photo backing panel (`polygon(14% 0%, 100% 0%, 86% 100%, 0% 100%)`) with offset deep-teal layer.
     - Upright photograph with calibrated headroom per portrait.
     - Separate pearl nameplate overlapping lower card edge (`-mt-5`, `bg-white/98`, `rounded-xl`, `border-[#D5E5E8]`).
     - Hierarchy: mentor name in bold dark ink (`#172E35`), designation in readable neutral (`#526E77`), company in prominent bold deep-teal (`#086477`) with natural line wrapping.
  4. *Responsive Mobile Reflow:*
     - Mobile stacks editorial column cleanly on pearl gradient for 100% text contrast and readability.
     - Mentors reflow into a compact 2-column grid framed within a folded deep-teal backdrop.
  5. *Internship Section Carousel Interaction Fix:*
     - Fixed `src/components/home/internships-section.tsx` carousel index switching when no scroll overflow is present on desktop.
     - Added active card indicator in `src/components/home/internship-card.tsx` and modal next/prev navigation in `src/components/home/internship-details-modal.tsx`.
  6. *Quality & Verification:*
     - Next.js production build (`pnpm build`): 104/104 static routes generated with 0 errors.
     - Visual inspection artifacts: `irgp-folded-desktop-1440.png`, `irgp-folded-nameplates-closeup.png`, `irgp-folded-mobile-hero-390.png`, `irgp-folded-mobile-mentors-grid-390.png`, `mto-slide-confirmed-unchanged.png`. Automated tests skipped per user request.

### Task P4-T10 / IRGP Hero Slide Refinement
- **SRS IDs Covered:** FR-PUB-001, FR-PUB-002, FR-PUB-004, Rule R1, Rule R2, Rule R3, Rule R4, Rule R6, Rule R7, Rule R8, Rule R11, Rule R12, Rule R13, Rule R14, Rule R15, Rule R16, Rule R19
- **Architecture & Deliverables:**
  1. *Mentor Portraits Framing & Calibrated Headroom:*
     - Added `IRGP_PORTRAIT_POSITIONS` dictionary in `src/components/home/hero/hero-mentor-card.tsx` mapping each mentor to fine-tuned `object-position` coordinates (e.g. `center 22%`, `center 15%`, `center 18%`).
     - Preserved complete faces, foreheads, and chins with comfortable headroom without stretching or disproportionate zoom.
     - Transparently documented source asset limitations: underlying files in `public/images/mentor-*.jpg` (245×240px) have embedded diagonal crop lines from original marketing banners.
  2. *Mentor Card Text & Typography:*
     - All eight mentors maintain full fidelity to content records (`mentor.name`, `mentor.role`, `mentor.organization`).
     - Ellipsis truncation (`truncate`, `line-clamp-1`) removed to allow natural, clean wrapping for multi-line designations and corporate affiliations.
     - Reserved consistent 52% caption space ensuring cards in the 4×2 grid remain horizontally and vertically aligned.
     - Contrast verified: 100% white names (`text-[13px] sm:text-[14px] lg:text-[14.5px] xl:text-[15.5px]`), soft mint-teal roles (`text-[#8EE0EB]`), and pearl-teal organizations (`text-[#C5E8ED]`) against deep teal card background (`#03242A`).
  3. *Faculty Heading Restyling:*
     - Replaced small italic title and users icon with a strong, restrained serif heading: *"Meet Our IRGP Mentors"* (`text-2xl sm:text-3xl lg:text-[30px] xl:text-[34px] font-serif font-medium text-white`).
     - Added uppercase eyebrow (`IRGP PROGRAM FACULTY`) flanked by subtle horizontal hairline accents.
  4. *Interaction & Navigation Offset:*
     - Connected "View Learner Experiences" secondary button with `handleSecondaryCtaClick` calculating a ~84px offset for the sticky header, scrolling cleanly above the `#reviews` section.
     - Added `scroll-mt-20 sm:scroll-mt-24` to `src/components/home/reviews-section.tsx`.
     - Preserved "Explore the IRGP Story" modal trigger and event dispatch.
  5. *Quality & Verification:*
     - Next.js production build compiled 104/104 static routes cleanly with zero errors.
     - Visual captures verified on desktop (1440×900) and mobile (390×844): `irgp-refinement-desktop-1440.png`, `irgp-scrolled-to-reviews.png`, `irgp-refinement-mobile-390.png`, `irgp-refinement-mobile-grid-closeup.png`. Automated tests skipped per user request.

### Task P4-T9 / Homepage Targeted Corrections Pass
- **SRS IDs Covered:** FR-PUB-001, FR-PUB-002, FR-PUB-004, FR-CRS-004, FR-CRS-005, Rule R1, Rule R3, Rule R4, Rule R5, Rule R6, Rule R7, Rule R8, Rule R11, Rule R12, Rule R13, Rule R14, Rule R15, Rule R16, Rule R19
- **Architecture & Deliverables:**
  1. *Course Card Proportions Fixed:*
     - Restored vertical card dimensions: 320px width × 465px height in `src/components/home/course-card.tsx`.
     - Group is horizontally centered on desktop (`sm:justify-center gap-6`) without stretching to fill the container.
     - Reduced internal empty space, kept titles readable (`text-[21px] sm:text-[22px]`), and kept bottom actions and fees/story aligned.
     - Preserved hover/focus mentor reveal without altering card dimensions.
     - Carousel controls and pagination dots automatically hidden on desktop where cards fit without overflow.
  2. *Hero Spacing Contained:*
     - Desktop: Added comfortable left/right gutters (`px-5 sm:px-8 lg:px-10 xl:px-12`, `max-w-7xl xl:max-w-[1360px] 2xl:max-w-[1480px]`) containing the MTO mentor cards without crowding right edge.
     - Mobile: Scaled card heights (`h-[195px]` for MTO, `h-[155px]` for IRGP) with tighter internal padding and smaller portrait ratios (`h-[60%]`), dramatically reducing vertical height while keeping all 5 MTO mentors and 8 IRGP mentors accessible with complete faces.
  3. *Learner Reviews Gallery Rebalanced:*
     - Omitted the empty/gray placeholder gallery tiles per instructions.
     - Rebalanced the layout into a 2-column composition: IRGP Story Overview Card (5 cols) + Learner Voices Testimonial Carousel Card (7 cols).
     - Preserved all testimonials, controls, outcomes strip, and community banner.
  4. *Visual Spacing Standardized:*
     - Shared desktop content container (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`) and section padding (`py-14 sm:py-16 lg:py-20`).
     - Standardized section header typography and eyebrow color/styling.
  5. *Navigation & Footer Destinations Fixed:*
     - All visible header and footer links now point exclusively to active, working production routes and anchors:
       - Header: Courses (`/#courses`), Mentors (`/#mentors`), Learner Stories (`/#reviews`), Internships (`/#internships`), Explore Programs (`/#courses`).
       - Footer: Programs (`/#courses`, `/courses/mto-readiness`, `/courses/irgp`), Explore (`/#internships`, `/#mentors`, `/#reviews`), Contact (`mailto:info@lnabd.org`, `tel:+8801700-000000`, Dhanmondi, Dhaka).
       - Removed unbacked routes (About, Contact page, Application Status, Privacy, Terms, Events) and unconfigured social icons.
  6. *Section Order Maintained:*
     - Hero → Partners → Courses & Programs → Mentors → Learner Reviews → Internship Opportunities → Footer.
  7. *Quality & Verification:*
     - Production build compiled 104/104 static routes cleanly with zero errors.
     - Captures generated: `homepage-desktop-full.png`, `homepage-mobile-full.png`, `courses-desktop-cards.png`, and `hero-mobile-closeup.png`. Automated tests skipped per user request.

### Task P4-T8 / Homepage Final Visual & Interaction Review
- **SRS IDs Covered:** FR-PUB-001, FR-PUB-002, FR-PUB-004, FR-CRS-004, FR-CRS-005, Rule R1, Rule R3, Rule R4, Rule R5, Rule R6, Rule R7, Rule R8, Rule R11, Rule R12, Rule R13, Rule R14, Rule R15, Rule R16, Rule R19
- **Architecture & Deliverables:**
  1. *Section Sequence Verification:*
     - 1. HeroSection (HeroSlider with MTO 5-mentor slide + IRGP 8-mentor slide)
     - 2. PartnersSection (Corporate Sector Alignments)
     - 3. CoursesSection (Strictly 2 vertical cards: MTO Readiness and IRGP)
     - 4. MentorsSection (3D interactive layered carousel with category filters and search)
     - 5. ReviewsSection (Learner Reviews, IRGP showcase, gallery, and community banner)
     - 6. InternshipsSection (Internship Opportunities, positioned as the LAST content section immediately before the footer)
     - 7. SiteFooter (Pearl-and-teal editorial footer with CTA top strip, 4-column directory, and deep teal legal bar)
  2. *Issues Fixed:*
     - Fixed `ReviewsSection` entrance animation initial state from `hasEntered = false` to `hasEntered = true` to prevent content visibility gating/delays in SSR, print, headless capture, and fast-scroll scenarios.
     - Confirmed exact two-card layout in Courses & Programs with overflow-based carousel controls and pagination dots.
     - Confirmed Internship Opportunities is positioned as the final content section directly preceding the footer.
     - Verified `#internships` anchor in footer scrolls smoothly to the relocated section.
  3. *Interaction Audit:*
     - Course Details Modal: Radix Dialog opens on card/button click, traps focus, displays batch and mentor metadata, closes on Escape/button, restores scroll.
     - Internship Details Modal: Radix Dialog opens on card click, displays 4 summary fields, "About the opportunity", external application link, closes cleanly.
     - Hero carousel dots & transitions between MTO and IRGP slides fully functional.
  4. *Quality & Verification:*
     - Production build compiled 104/104 static routes cleanly with zero errors.
     - Visual inspection captured: `homepage-desktop-full.png` (1440px full height) and `homepage-mobile-full.png` (390px full height). Automated tests skipped per user request.

### Task P4-T7 / Homepage Section Order & Internship Placement
- **SRS IDs Covered:** FR-PUB-002, Rule R1, Rule R3, Rule R4, Rule R6, Rule R7, Rule R8, Rule R11, Rule R13, Rule R14, Rule R15, Rule R16, Rule R19
- **Architecture & Deliverables:**
  1. *Section Sequence on Homepage:*
     - 1. HeroSection (`<HeroSection slides={heroSlides} mentors={mentors} />`)
     - 2. PartnersSection (`<PartnersSection partners={partners} />`)
     - 3. CoursesSection (`<CoursesSection courses={courses} batches={batches} mentors={mentors} />`)
     - 4. MentorsSection (`<MentorsSection mentors={mentors} />`)
     - 5. ReviewsSection (`<ReviewsSection reviews={reviews} irgpData={irgpData} />` - Learner Reviews)
     - 6. InternshipsSection (`<InternshipsSection internships={internships} />` - Internship Opportunities)
     - 7. SiteFooter (rendered via PublicShell wrapper)
  2. *Removed from Homepage:*
     - Removed "Executive Masterclasses & Roundtables" (`EventsSection`) from `src/app/page.tsx`.
     - Preserved `EventsSection` component, assets, and `events.json` data intact for other routes and future CMS workflows.
     - Cleaned up unused imports in `src/app/page.tsx`.
  3. *Footer Link Smooth Scroll:*
     - Verified `SiteFooter` "Internship Opportunities" link scrolls cleanly to `#internships`.
  4. *Quality & Verification:*
     - Production build compiled 104/104 static routes cleanly with zero errors.
     - Visual inspection captured: `internships-directly-above-footer-1650.png`. Automated tests skipped per user request.

### Task P4-T6 / Homepage Courses & Programs Redesign (MTO & IRGP)
- **SRS IDs Covered:** FR-PUB-002, FR-CRS-004, FR-CRS-005, Rule R1, Rule R3, Rule R4, Rule R5, Rule R6, Rule R7, Rule R8, Rule R11, Rule R13, Rule R14, Rule R15, Rule R16, Rule R19
- **Architecture & Deliverables:**
  1. *Curated Catalog Seeding & Order:*
     - Added `mto-readiness` and `irgp` courses to `content/catalog/courses.json`.
     - Seeded `batch-mto-2026-01` (`feePoisha: 750000`, status: `open_for_enrollment`) and `batch-irgp-cohort-1` (`feePoisha: 0`, status: `completed`) in `content/catalog/batches.json`.
     - Ordered initial courses to match reference image: `data-analytics`, `executive-leadership`, `mto-readiness`, and `irgp`.
     - Mapped 5 MTO mentors to `mto-readiness` and 8 IRGP mentors to `irgp`.
     - Passed `validate-content.mjs` with 100% schema and referential integrity compliance.
  2. *Header & Carousel Controls:*
     - Eyebrow: `LEARN WITH LNA` in bold teal `text-[12px] font-bold uppercase tracking-widest text-[#086477]`.
     - Heading: `Courses & Programs` in serif font `text-3xl sm:text-4xl lg:text-[44px] font-serif text-[#172E35]`.
     - Subtitle: `Practical learning guided by industry professionals.`
     - Header right controls: Circular prev button, position indicator `1 / 4`, and circular next button.
     - Centered pagination dots: `● ○ ○ ○` below cards.
  3. *Card Component (`CourseCard`):*
     - Dimensions: ~300px × 475px vertical cards, `rounded-2xl`, thin border `border border-[#E2ECEE]`.
     - Normal State: Category, status badge (`Upcoming` / `Completed`), 24px bold title, summary, outline metadata icons (`Calendar`, `MapPin`, `Clock`, `Layers`, `Users`), circular mentor portraits, divider, fee in BDT (`BDT 6,500`, `BDT 7,500`, or `BDT 30,000` with crossed-out `BDT 35,000`, or `Program Story` for IRGP), and circular arrow button.
     - Hover State: Deep teal `#086477` background, white text/icons, soft aqua `#C5E2E5` category, white outline status badge, "MEET YOUR MENTORS" header with expanded circular mentor portraits, white circular button with teal arrow. Fast 180-220ms transition.
  4. *Course Details Modal (`CourseDetailsModal`):*
     - Accessible Dialog modal with Radix primitives, Escape key listener, backdrop dismissal, and focus trapping.
     - Deep teal header, schedule chips, overview, learning outcome checkmarks, faculty profile buttons with quick-view modal triggers, and "Enroll Now" CTA.
     - Dispatches `lna:open-irgp-story` for IRGP card to trigger the existing IRGP Success Story modal.
  5. *Quality & Verification:*
     - Production build generated 104/104 static routes cleanly.
     - Visual inspections captured: `courses-desktop-1650.png`, `courses-card-hover-1650.png`, `courses-modal-open-1650.png`, and `courses-mobile-390.png`. Automated tests skipped per user request.

### Task P4-T4 / MTO Hero Slide Architectural Rebuild
- **SRS IDs Covered:** FR-PUB-002, FR-PUB-004, Rule R1, Rule R3, Rule R4, Rule R6, Rule R7, Rule R8, Rule R11, Rule R13, Rule R14, Rule R15, Rule R16, Rule R19
- **Architecture & Deliverables:**
  1. *Full Leadership Academy Interior Background:*
     - Full background image across entire MTO slide: `/images/hero-mto-interior-bg.jpg` (`object-cover object-center`).
     - Natural spatial layout: pearl interior wall behind ~40% left program content; teal architectural glass behind ~60% right mentors.
     - Subtle CSS overlay on left (`from-[#F6FAFA]/75 via-[#F6FAFA]/35 to-transparent`) for high text contrast.
     - Scoped strictly to MTO: zero waves, zero extra office overlays, zero circular bands, zero neon glow.
     - Preserved IRGP slide background and layout completely intact.
  2. *Left Editorial Column (~40% desktop width):*
     - Eyebrow: `FEATURED PROGRAM` badge in `#DDF1F3` pill.
     - Heading: `MTO Readiness` (editorial serif 60–72px) + italic deep teal `Program`.
     - Subtitle: `Graduate Career & Leadership Accelerator` (20–22px).
     - Description: `A practical, industry-focused program to prepare recent graduates for Management Trainee Officer (MTO) opportunities in leading organizations.` (17–18px, 1.6 line height).
     - Statistics row: 16 Sessions (1.5h each) | 8 Essential Skills | 5 Industry Mentors with outline icons.
     - Primary button: `Explore the Program →` (substantial rounded pill, deep teal `#086477`, 16px font).
     - Date detail: compact pill beneath button reading `Classes begin December 1`.
  3. *Right Mentor Presentation (~60% desktop width):*
     - Header: small `MTO PROGRAM FACULTY` uppercase tracking label and `Learn From Industry Leaders` serif heading in white with subtle shadow against teal glass.
     - 5 individual upright mentor cards:
       - Upright portrait area (top ~64%) with full faces and comfortable headroom.
       - Clean pearl caption area (bottom ~36%) with dark readable text (`#172E35` bold name, `#086477` role, `#5B7E87` organization).
       - Modest rounded corners (`rounded-2xl`), subtle shadow (`shadow-md shadow-[#086477]/10`), and crisp white/pearl borders.
       - Zero slanted outlines, zero overlapping cards, zero dark gradients over faces.
       - Responsive grid: 5 columns on wide desktop (`xl:grid-cols-5`), wrapping into 3 columns on tablet and 2 columns on mobile.
  4. *Quality & Verification:*
     - Production build generated 102/102 static routes cleanly.
     - Visual inspection verified on 1650px desktop (`hero-redesign-mto-1650.png`) and 390px mobile (`hero-redesign-mto-390.png`).
