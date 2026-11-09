# 0012. Course Mentor Roster Relationship Architecture

**Status:** Accepted  
**Date:** 9 November 2026  
**Deciders:** Refat (Owner), Engineering Agent  
**Citations:** docs/SCOPE-REVISION-V1.md; docs/SRS.md (FR-CRS-004, FR-PUB-002); ADR 0001, ADR 0002, ADR 0004  

---

## Context

In the current file-based content model, mentors maintain course linkages via `courseId: string` and `courseIds: string[]` fields inside `content/home/mentors.json`. Multiple presentation surfaces consume this faculty roster:
1. **Homepage Hero Slides** (`src/components/home/hero/hero-slide.tsx`)
2. **Homepage Course Cards** (`src/components/home/courses-section.tsx`, `course-card.tsx`)
3. **Course Details Pages** (`src/app/courses/[slug]/page.tsx`, `course-detail-view.tsx`)

While unifying these surfaces under a shared `getCourseMentorRoster()` resolver ensures consistent presentation in the interim, storing course associations on individual mentor records has architectural limitations:
- **Inverted Ownership:** In the domain model, a Course is the aggregate root that organizes modules, batches, and assigned faculty. Storing `courseIds` on Mentor records fragments course definition across multiple files.
- **Order Flexibility:** A mentor teaching in two different courses cannot currently define independent display ranks per course.
- **Relational Impedance:** A many-to-many relationship in Supabase/Postgres requires a normalized join table (`course_mentors`), not foreign keys or string arrays embedded in the mentor entity.

---

## Decision

1. **Step 1 (File-Based Model Evolution):**
   - Update `CourseSchema` (`src/lib/content/courses.ts` & `scripts/validate-content.mjs`) to include an optional, ordered array:
     ```typescript
     mentorIds: z.array(z.string()).default([]),
     ```
   - Move the ordered list of mentor IDs directly onto each course record in `content/catalog/courses.json`:
     - `mto-readiness`: 5 ordered mentor IDs
     - `irgp`: 8 ordered mentor IDs
   - Update `getCourseMentorRoster(mentors, courseId)` to read `course.mentorIds` first, falling back to legacy `mentor.courseIds` during the transition.
   - Deprecate `courseId` and `courseIds` on `MentorSchema`.

2. **Step 2 (Database Backend Migration):**
   - When the Supabase PostgreSQL backend schema is applied in Phase 2/3, implement the many-to-many relationship using a dedicated join table:
     ```sql
     create table public.course_mentors (
       course_id uuid not null references public.courses(id) on delete cascade,
       mentor_id uuid not null references public.mentors(id) on delete cascade,
       display_order int not null default 0,
       created_at timestamptz not null default now(),
       primary key (course_id, mentor_id)
     );
     create index idx_course_mentors_course on public.course_mentors(course_id, display_order);
     alter table public.course_mentors enable row level security;
     ```
   - Provide public read RLS policy (`for select using (true)` for published courses).

3. **Interim Non-Breaking Constraint:**
   - Until this ADR is formally approved and executed, runtime code shall maintain backward compatibility using the extracted `getCourseMentorRoster()` lookup based on existing JSON assignments.

---

## Consequences

- **Positive:**
  - Course faculty rosters become explicit, ordered, and contained within the course definition.
  - Zero duplication across hero slides, course cards, and detail pages.
  - Smooth 1:1 migration path to the PostgreSQL `course_mentors` relational schema.
- **Negative / Risks:**
  - Requires updating `CourseSchema` validation and migrating `content/catalog/courses.json` once approved.

