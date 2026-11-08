# Project State: Lead Nation Academy (lnabd.org) Rebuild

**Last Updated:** 8 November 2026  
**Session Context:** Phase 4 Homepage Courses & Programs Redesign — Redesigned the homepage Courses & Programs section to match the approved vertical card design with pearl `#F6FAFA` section background, white cards, deep teal `#086477` hover state with "MEET YOUR MENTORS" showcase, circular arrow buttons, and accessible `CourseDetailsModal`.

---

## 1. Current Phase and Task
- **Current Phase:** Phase 4 (Public Website Core)
- **Current Task:** Homepage Courses & Programs Section Visual Redesign
- **Task Status:** Fully Completed & Verified via Production Build (`next build` 104/104 static routes generated), TypeScript (`tsc --noEmit` 0 errors), Content Validation (`validate-content.mjs` passed), and Visual Inspections at 1650px desktop (`courses-desktop-1650.png`, `courses-card-hover-1650.png`, `courses-modal-open-1650.png`) and 390px mobile (`courses-mobile-390.png`). Automated tests were skipped per explicit user request.
- **Current Git Branch:** `task/p4-t5-hero-slides`
- **Base Commit:** `b306a77` (`main`, containing merged `task/p3-t1-content-schemas` via PR #9)

---

## 2. Completed Tasks

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
