# Project State: Lead Nation Academy (lnabd.org) Rebuild

**Last Updated:** 8 November 2026  
**Session Context:** Phase 4 Homepage Hero Redesign — MTO Readiness Hero Slide Rebuild using "Pearl-to-teal leadership academy interior.png" as the full background. Program content (~40% left) and mentor presentation (~60% right). 5 upright mentor cards with pearl caption areas, dark readable text, and real HTML typography. Substantial CTA, compact "Classes begin December 1" date detail, un-truncated statistics, and responsive grid reflow.

---

## 1. Current Phase and Task
- **Current Phase:** Phase 4 (Public Website Core)
- **Current Task:** Homepage Hero MTO Readiness Slide Architectural Rebuild
- **Task Status:** Fully Completed & Verified via Production Build (`next build` 102/102 static routes generated), TypeScript (`tsc --noEmit` 0 errors), and Visual Inspections at 1650px desktop (`hero-redesign-mto-1650.png`) and 390px mobile (`hero-redesign-mto-390.png`).
- **Current Git Branch:** `task/p4-t4-irgp-showcase`
- **Base Commit:** `b306a77` (`main`, containing merged `task/p3-t1-content-schemas` via PR #9)

---

## 2. Completed Tasks

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
