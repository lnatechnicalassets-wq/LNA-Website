# Project State: Lead Nation Academy (lnabd.org) Rebuild

**Last Updated:** 9 November 2026  
**Session Context:** Phase 4 Course Experience — Implemented dedicated, accessible course details pages for MTO Readiness Program (`/courses/mto-readiness`) and Industry Readiness Graduate Program (`/courses/irgp`), replacing the course-details popup flow. Converted homepage course cards and hero CTAs to direct accessible navigation links. Verified via Next.js production build (`next build` 104/104 static routes generated with 0 errors).

---

## 1. Current Phase and Task
- **Current Phase:** Phase 4 (Public Website Core)
- **Current Task:** Dedicated Course Details Pages for MTO & IRGP (`/courses/[slug]`)
- **Task Status:** Fully Completed & Verified via Production Build (`next build` 104/104 static routes generated with 0 errors).
- **Current Git Branch:** `task/p4-t5-hero-slides`
- **Base Commit:** `b306a77` (`main`, containing merged `task/p3-t1-content-schemas` via PR #9)

---

## 2. Completed Tasks

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
