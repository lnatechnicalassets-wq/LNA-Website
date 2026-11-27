# 0011. Homepage Editorial Presentation Sections & Scope Clarification

**Status:** Partially Superseded / Amended by LNA Rev3.0 (`CMS-01`–`CMS-10`, `D29`, `D45`–`D53`, `D61`)  
**Date:** 5 November 2026 (Amended 26 November 2026)  
**Deciders:** Refat (Owner), Engineering Agent  
**Citations:** Supervisor Scope Addendum (Release v1.0); SRS Section 4.1, FR-PUB-002, FR-PUB-006; ADR 0004  

---

## Context

The rebuild of `lnabd.org` operates under a supervisor-approved seven-module scope addendum (Release v1.0). That addendum deferred complex interactive features including event attendee ticketing/registration (D5), mentor self-service portals and mentor administration directories (D7), and public review-submission engines (D7).

However, an effective, corporate-grade educational academy homepage requires establishing institutional credibility, showcasing faculty authority, announcing executive masterclasses, demonstrating corporate industry alignments, and highlighting learner testimonials.

A clear architectural distinction is necessary between:
1. **Public Read-Only Editorial Presentation:** Curated showcase content rendered on the public homepage to establish trust and inform executive applicants.
2. **Interactive Functional Backends:** Complex administrative CRUD interfaces, public form submission pipelines, and ticketing workflows that remain deferred to post-v1 releases.

---

## Decision

1. **Approved Homepage Section Architecture & Order:**
   The public homepage (`/`) shall display exactly seven sections in this strict sequence:
   1. **Hero Slider:** Exactly three managed editorial slides (Featured Course 1, Featured Course 2, and Explore All Programs) referencing valid course IDs/slugs.
   2. **Partners Strip:** Clean, balanced horizontal trust strip of corporate industry alignments.
   3. **Courses Section:** Curated editorial grid of offline executive courses and open batches with transparent fees and dates.
   4. **Events Showcase:** Read-only presentation of executive masterclasses and upcoming offline learning dates.
   5. **Mentors Showcase:** Curated portrait cards of industry veteran faculty, designations, and associated courses.
   6. **Learner Reviews:** Typography-led testimonial quotes with **strictly manual navigation and NO autoplay** (complying with FR-PUB-006).
   7. **Footer:** The corporate layout footer (`SiteFooter`).

2. **Scope Boundary Enforcement for Editorial Sections:**
   - **Partners:** Presentation only; loaded centrally via `@/lib/content`. No partner administration module.
   - **Events:** Read-only homepage cards; no public ticket registration, no QR code generation, and no event management module.
   - **Mentors:** Curated profile cards; no mentor login, no mentor directory pages, and no mentor administration module.
   - **Learner Reviews:** Curated verified testimonials; no public review submission form and no review-management interface.

3. **Content Invariants & Provenance (Rule R15 & ADR 0004):**
   - In development, unverified demo data carries Provenance Class B (`verified: false`, `isPlaceholder: true`).
   - Placeholder indicators are explicit to avoid fabricating partnerships or accreditation.
   - All presentation models are loaded via the swappable `@/lib/content` repository abstraction, remaining compatible with future CMS management.

---

## Consequences

- Resolves ambiguity between public design requirements and deferred backend modules.
- Enables a rich, polished editorial homepage experience while strictly honoring the approved seven-module v1 scope.
- Enforces strict compliance with SRS FR-PUB-006 (manual-only review navigation without autoplay).
- Preserves zero-dependency motion and WCAG 2.2 AA accessibility requirements.

---

## Rev3.0 Amendment Note (`W0-E01`)
- **Retained:** Fixed 7-section homepage structure in strict order (`Hero Slider`, `Partners`, `Courses`, `Events`, `Mentors`, `Reviews`, `Footer`), zero-autoplay manual controls where applicable, Class A factual verification (`D29` — excluding unverified claims/placeholders), and no event registration/ticketing or review submission forms (`CMS-04`, `D48`).
- **Superseded:** Section 2 (`Scope Boundary Enforcement`) prohibitions on admin management of Hero Slides, Partners, Events, Mentors, Reviews, and Footer are superseded by **Rev3.0 Module 4 (`CMS-01`–`CMS-10`, Wave 7)**: all seven sections are admin-managed without duplicating the main Courses editor (`D45`), and empty optional sections hide cleanly (`D29`).

