# LNA Website Architecture Specification

**Document Version:** 1.2 (LNA Rev3.0 Reconciliation — `W0-E01`)  
**Date:** 26 November 2026  
**Primary Authorities:** [`docs/LNA_Rev3.0/`](LNA_Rev3.0/README.md) (`01_Implementation_Plan_Rev3.0.md`, `02_Master_Decision_Register.md` D01–D78 & C-01–C-16), [`docs/SCOPE-REVISION-V1.1.md`](SCOPE-REVISION-V1.1.md), [`docs/SCOPE-REVISION-V1.md`](SCOPE-REVISION-V1.md) (v1.0 historical), [`docs/SRS.md`](SRS.md) (`LNA-SRS-001` historical baseline)

> **Implementation vs. Target Boundary:** Sections below mark **Current Baseline** (observed code in repo) vs. **Target Rev3.0 Architecture** (approved planning specification, **not yet implemented**). No production claims are implied without task verification.

---

## 1. Introduction and Architectural Principles

This document establishes the system architecture for the rebuild of `lnabd.org` (Lead Nation Academy). The architecture is designed to support offline course enrollment, BDT fee collection via direct bKash Payment Gateway API, public application status tracking, operational administration, transactional email notifications, and data integrity under strict security and compliance constraints.

### Core Principles
1. **Separation of Concerns:** Public presentation is isolated from transactional workflows. Public pages are statically rendered and cached; transactional and administrative portals are rendered dynamically on the server.
2. **Server-Side Authority:** The browser is an untrusted client. Pricing, capacity, payment verification, authorization, and role management are strictly enforced on the server and database levels.
3. **Immutability and Auditability:** Applied database migrations are forward-only. Financial, enrollment, refund, and audit records are never deleted through application interfaces; mutations produce auditable event records.
4. **Resilience and Decoupling:** Transaction execution never blocks on third-party side effects (e.g., email delivery). Asynchronous jobs handle retries, notifications, and reconciliation.
5. **Integer Currency:** All financial math uses integer poisha (`bigint`). JavaScript floating-point numbers (`Number`, `parseFloat`, `.toFixed()`) are strictly banned from financial calculations and pricing logic.

---

## 2. Technology Stack and Decision Matrix

*Citations: Blueprint Part 3; docs/SCOPE-REVISION-V1.md; SRS Section 9*

The core stack is fixed as specified in the Blueprint and approved scope addendum:

| Layer | Choice | Rationale & Architectural Constraints | Citing Authority |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js `26.13.0` + `pnpm 12.16.1` | Pinned in `.nvmrc` and `package.json` `engines` (supersedes historical Node 24 LTS, subject to host compatibility in `W0-E04`). | ADR 0001 (Rev3.0 Note); `.nvmrc` |
| **Framework** | Next.js `16.4.6` App Router | Unified codebase for public pages, admin portal, and server route handlers. | Blueprint 3.1 |
| **Language** | TypeScript (Strict) | End-to-end schema-to-type safety. `any` and `@ts-ignore` are prohibited by linting. | Blueprint 3.1 |
| **Styling** | Tailwind CSS 4.x | Token-driven via CSS variables (`@theme` syntax). No `tailwind.config.js`. WCAG 2.2 AA target. | Blueprint 3.1, 4.2 |
| **Accessible Primitives** | Radix UI | Unstyled headless accessible primitives ensuring keyboard and screen reader compliance. | Blueprint 3.1, 4.8 |
| **Database & Auth** | Supabase Free (`PostgreSQL 17.11`, Auth, Storage) | PostgreSQL with RLS, mandatory staff TOTP (`AAL2`), Storage (`mentor-media` -> generalized `cms-media` target in `W7`). Free plan lacks native session inactivity timeouts (`W2A-T04` app-layer enforcement) and automated backups (`W0-E05`/`W3-T05`). | ADR 0002; `INF-01`–`INF-06` |
| **Data Access** | Typed Supabase Clients + PostgreSQL RPC | Direct reads via `supabase-js` under RLS; critical mutations via `SECURITY DEFINER`/`INVOKER` RPCs with row locks. | Blueprint 3.1, 6.4 |
| **Validation** | Zod | Shared field/schema validation across public `/enroll` and staff `Add Student` (`ADM-01`, `C-01`), CMS schemas, and API routes. | Blueprint 3.1, 5.4 |
| **Payment Gateway** | Direct bKash PGW API | Typed in-house client (`src/server/payments/bkash.ts`), `SupabaseBkashTokenCache` (`bkash_private.gateway_tokens`), server-to-server execution/query; **zero live refund capability** (`PAY-09`). | ADR 0009; `PAY-01`–`PAY-13` |
| **Rate Limiting & Abuse** | Upstash Redis + Cloudflare Turnstile | Upstash client present (`src/server/ratelimit/limiter.ts`); runtime Turnstile verification and durable contact rate limit **pending (`W2A-T05`)**. | `NFR-SEC-03`; `W2A-T05` |
| **Transactional Email** | Resend (`mail.lnabd.org` target) | `email_outbox` present; **`/api/cron/email-outbox`, quota priority, delivery webhook (`accepted` ≠ `delivered`), and batch notices pending (`W3`/`W6`)**. Employee mailboxes out of scope. | `EML-01`–`EML-06`; `W3` |
| **Hosting & CDN** | Commercial Hosting (`W0-E04` Pending) | Vercel Hobby (`noncommercial`) confirmed non-compliant for live paid courses; evaluate existing ExonHost compatibility before any paid hosting upgrade (`C-09`, `INF-05`). | `INF-05`; `C-09` |
| **Scheduled Jobs** | Persistent DB Leases + Approved Scheduler (**Pending `W3`**) | `/api/cron/reconcile-payments` exists; **no scheduler active yet (`W3-T03`)**. Transaction/DB-lease claims required across serverless/pooled runs. | `W3-T02`, `W3-T03`, `INF-09` |
| **PDF Payment Receipts** | Server-side PDF (`W5-T04`, `PAY-13` / `C-16`) | **Target (`NOT IMPLEMENTED`):** Branded PDF receipts for actual positive paid-admission collections attached to confirmation email and downloadable by staff from admission details only (package/template pending `W5-T04`). | `C-16`, `PAY-13`, `EML-01` |
| **Monitoring & Media Alt** | Sentry & Cloudflare R2 (**Optional**) | Not required in Rev3.0 baseline (`INF-11`, `INF-12`); R2 evaluated only if measured media egress justifies it. | `C-09`, `INF-11`, `INF-12` |
| **Testing Suite** | Vitest, Testing Library, Playwright + `@axe-core/playwright`, pgTAP | 4-Tier Risk-Based Testing (Levels 0–3). Playwright/axe & Docker/CLI pgTAP harness setup pending (`W0-E02`, `W0-E03`). | ADR 0006, ADR 0010 |

---

## 3. Content Management System (CMS) & Dual-Layer Architecture

*Citations: Blueprint Part 5; docs/SCOPE-REVISION-V1.md Module 4; SRS Section 4.1, 5.2, 8.4*

### 3.1 Purpose and Workflow (Target `W7`)
The target system provides administrative management across all public surfaces without production JSON fallback after database cutover (`CMS-01`–`CMS-10`, `W7`):
1. **Course & Batch Catalog (`W1` / `W7-T04`):** Single canonical Courses editor for details, outcomes, audience, curriculum, FAQs, thumbnails, default mentors, and shared course application-question config (`D01`, `D10`).
2. **All 7 Homepage Sections (`W7-T03`):** Fixed order (`Hero Slider`, `Partners`, `Courses`, `Events`, `Mentors`, `Reviews`, `Footer`), course-linked and general announcement hero slides, date-derived upcoming/past Events, reusable Mentors/Partners/Reviews, and centralized Contact/Footer settings.
3. **Structured Pages & SEO (`W7-T04`):** Editable About, Contact, Privacy, Terms, and Payment/Cancellation policies (no raw HTML/page builder; static `/news` preserved without news CMS).
4. **Shared Image Pipeline (`W7-T01`):** Generalized from `mentor-media` with JPG/PNG/WebP upload, WebP optimization, editable alt text, bounded caching/withdrawal (`INF-11`), and reference-safe asset cleanup (`D50`).
5. **DB Cutover (`W7-T05`–`W7-T06`):** Currently only `mentors`, `courses`, and `batches` partially read Supabase while Homepage sections still read `JsonContentRepository`. Post-`W7` cutover reads live DB exclusively with no silent production JSON fallback (`CMS-10`).

### 3.2 Content Classification and Provenance
Every content record contains an immutable `provenance` block enforcing academic and corporate credibility (SRS FR-PUB-005):
* **Class A (Verified):** `verified: true`, with documented `source`, `verifiedBy` (staff email), and `verifiedOn` (ISO date).
* **Class B (Demo / Unconfirmed):** `verified: false`. Rendered in development with a visual corner ribbon.
* **Class C (Operational):** Live applicant data, payments, enrollments, and audit logs. **Never stored in JSON.**

---

## 4. Full System Architecture & Application Surfaces

*Citations: Blueprint Part 6; docs/SCOPE-REVISION-V1.md*

### 4.1 Frontend Surface & Route Groups
A single Next.js application serves two active production surfaces with isolated security boundaries:

```
src/
├── app/
│   ├── (public)/              # Public website (Home, About, Courses, Contact, Policies, Status Lookup)
│   ├── (auth)/                # Staff Login, password reset, staff 2FA verification
│   └── (admin)/admin/         # Staff operations (Courses, Batches, Enrollments, Payments, Reports, Audit)
├── api/
│   ├── payments/bkash/callback/route.ts
│   ├── receipts/[id]/route.ts
│   ├── cron/{reconcile-payments,email-outbox}/route.ts
│   └── health/route.ts
├── components/{ui,public,forms,admin}/
├── lib/{content,format,validation,cache}/
└── server/{auth,enrollment,payments,email,audit,ratelimit}/
```

| Surface | Rendering Strategy | Caching Strategy | Authentication Check |
| :--- | :--- | :--- | :--- |
| **Public Site** | Static / Dynamic Server Components | Bounded CDN caching; invalidated on publish/withdraw (`W7-T06`) | None (Public) |
| **Enrollment & Find My Application (`/status`)** | Dynamic / Client Forms | `Cache-Control: no-store` | Scoped expiring emailed links + Turnstile + Rate limit (`W4-T04`) |
| **Payment Callbacks** | Dynamic Route Handler | `Cache-Control: no-store` | Gateway parameters + Server Execute & Query (`ADM-03`/`PAY-01`) |
| **PDF Payment Receipts (`W5-T04`)** | Server Route Handler *(Target)* | `Cache-Control: private, no-store` | **Staff session only** via Admission details (`D41`; no public PDF access initially) |
| **Admin Portal (8 Modules)** | Dynamic Server Components | `Cache-Control: no-store` | Verified Staff (`Admin` / `Super Admin`) + `AAL2` TOTP + `30m/12h` app session (`W2A`) |
| *Learner Portal / Refunds* | *Deferred / Excluded* | *N/A* | *Excluded from LNA v1.1 (`PAY-09`)* |

### 4.2 Database Schema & Key Tables (Current Baseline vs. Target Additions)
PostgreSQL (`17.11` hosted) via Supabase with `18` reconciled forward SQL migrations (`20261110161500`–`20261123110000`) plus planned Rev3.0 forward additions (`W2A`, `W1`, `W3`, `W4`, `W5`, `W7`):
1. **`profiles`:** Extends `auth.users` for staff (`role` `'admin' | 'super_admin'`, `account_state` `'active' | 'disabled' | ...`). Currently `admin` holds empty app permissions (`W2A` implements the two-role matrix).
2. **`courses` & `batches`:** `courses` (permanent catalog) and `batches` (dated instances). Target `W1` decouples `accept_applications`, manual academic stage, optional display deadlines, and `unlimited` (`NULL`) capacity default.
3. **`students`, `enrollments`, `student_completions`:** Separated student directory (`20261116050000`) and per-batch enrollments with Crockford `public_ref`. Target `W4` decouples admission/payment states, adds shared question-version snapshots (`D10`), transfer lineage (`Moved`), and five-option fee/waiver/collection columns (`PAY-03`–`06`).
4. **`payment_attempts`, `payment_events`, `bkash_private.gateway_tokens`:** Gateway attempts, redacted append-only webhook/API events, and fail-closed shared bKash grant token cache (`20261123110000`). Target `W4` preserves mismatched/late receipts and adds `PAY-11` verified receipt allocation + `PAY-13` canonical receipt snapshots/versions (`W5-T04`).
5. **`email_outbox`:** Queued notifications (`status`, `provider_message_id`, `retry_count`, `last_error`). Target `W3`/`W5` adds persistent DB leases, delivery-event tracking (`accepted` ≠ `delivered`), and eligible `PAY-13` PDF attachment support.
6. **`audit_events`:** Append-only action ledger (`actor_id`, `actor_role`, `action`, `target_entity`, `target_id`, `before_state`, `after_state`). Target `W2A`/`W2B` adds scoped batch/Website/global filtering and immutable session tracking (`W2A-T04`).
7. **Target New Tables (Not Yet Built):** Persistent scheduler leases (`W3-T03`), app-layer staff sessions (`W2A-T04`), receipt issuance snapshots/versions (`W5-T04`), batch notifications (`W6`), and CMS tables (`hero_slides`, `partners`, `events`, `reviews`, `site_settings`/`pages`, `cms-media` references — `W7`).
8. **Conflicting Legacy Migrations to Retire (`W2A-T06`):** `20261116160000`–`180000` routine student/admission purge RPCs and `20261123100000` `sandbox-refund` production reachability must be locked down/retired (`PAY-09`, `ADM-12`).

### 4.3 Authentication & Authorization Design
1. **Zero Public Signup (`INF-06`):** Public registration must be disabled in Supabase Auth; staff accounts are invite-only (`W2B-T01`).
2. **Mandatory Staff MFA (`AAL2`) & Roles (`SEC-01`–`03`):** `Admin` and `Super Admin` enforced server-side (`requireStaff()`) and in DB RPCs, with last-active-Super-Admin guard and app-layer `30m/12h` session expiration (`W2A-T04`, `D69`).
3. **Data Access Guards:** Zero reliance on middleware alone; browser clients denied direct writes to operational tables.

---

## 5. Security Architecture & Payment Protection (bKash API)

*Citations: ADR 0009; Blueprint Part 7; SRS Section 9.1*

### 5.1 Payment Invariants (Non-Negotiable)
1. **Server-Only Gateway Communication:** Only server-side code in `src/server/payments/bkash.ts` may invoke bKash endpoints. No credentials (`BKASH_*`) exist in client code.
2. **Server-Side Verification Mandatory:** A payment is confirmed **only** inside `confirm_payment()`, and **only** after direct server-to-server execution and secondary status query (`queryPaymentStatus`) confirm `transactionStatus === "Completed"`, exact poisha amount, and currency is BDT.
3. **Untrusted Redirects & Safe Seat Holds:** Browser return redirects with `status=cancel` or `status=failure` are completely untrusted. **The server NEVER releases a seat hold based on browser redirect parameters.** The 30-minute hold remains intact for applicant retry until passive read-time SQL expiration (`hold_expires_at > now()`).
4. **Delayed Verification Handling:** Network drops or gateway timeouts leave the attempt in `pending` status. An authenticated background reconciliation cron queries bKash (`searchTransaction` / `queryPaymentStatus`) to finalize state.
5. **Prevention of Overselling:** Batch capacity is enforced atomically in PostgreSQL RPC `start_enrollment()` under exclusive row lock (`SELECT ... FOR UPDATE`).
6. **Pure Integer Poisha Math:** All financial calculations use integer poisha (`bigint`). Float division and `.toFixed()` are banned.

### 5.2 Receipt Security & Access (`PAY-13` / `D41` Target)
* Branded PDF payment receipts are generated server-side strictly for actual positive paid-admission collections (verified bKash or positive Cash/Bank/bKash Transfer/partial waiver) in **Wave 5 (`W5-T04`)**.
* **Access Boundary (`D41`):** Public PDF download is excluded initially; PDF receipts are attached to the student's confirmation email and downloadable exclusively by authenticated `Admin`/`Super Admin` staff inside **Admission details** (with immutable historical snapshots and versioned corrections).
* Any temporary `/status` recovery or confirmation links use short-lived, single/scoped opaque verified tokens (`ADM-06`, `ADM-13`, `D38`).

---

## 6. Transactional Email System Architecture (Resend — Target `W3` / `W6`)

*Citations: `docs/LNA_Rev3.0/01_Implementation_Plan_Rev3.0.md` Module 6; `EML-01`–`EML-06`*

1. **Provider & Subdomain:** Resend API (`src/server/email/resend.ts`) targeting dedicated subdomain `mail.lnabd.org` (preserving root `lnabd.org` MX/email hosting; currently `EMAIL_DISPATCH_MODE` defaults `"disabled"`).
2. **Asynchronous Outbox & Leases (`W3-T02`, `W3-T03`):**
   * Committed database mutations insert idempotent `email_outbox` rows post-commit; email failure never rolls back seats or payments.
   * Target `W3` adds persistent database leases (`retry_count`, exponential backoff), priority tiers (confirmations > `/status` recovery > `W6` batch notices), attachment transport for `PAY-13` PDFs (`W5-T04`), and webhook tracking distinguishing `accepted` from `delivered`/`bounced` (`EML-03`, `TR-07`), with zero auto-retry of `Unknown`.
3. **Boundary:** Outbound transactional website notifications and manual batch announcements only. Employee mailboxes out of scope.

---

## 7. Authoritative Rev3.0 Wave Sequence vs. Historical Phases (P0–P14)

All active planning and execution follow the **Rev3.0 58-task roadmap** in [`docs/LNA_Rev3.0/01_Implementation_Plan_Rev3.0.md`](LNA_Rev3.0/01_Implementation_Plan_Rev3.0.md) §4:

* **Approved Execution Order:** `W0` (Exit verification, doc reconciliation `W0-E01`, isolated DB/pgTAP `W0-E03`, host/merchant/backup checks `W0-E04`/`E05`) -> **`W2A`** (RBAC, audit, early shared shell `W2A-T03`, `30m/12h` sessions, Turnstile/Upstash, retire refunds & routine purges `W2A-T06`) -> **`W1`** (Course/batch decoupled lifecycle, unlimited MTO default, capacity/copy) -> **`W2B`** (Staff invite/recovery/activity) & **`W3`** (Email outbox worker, persistent DB cron leases, delivery tracking, scheduled encrypted backups — parallel after prerequisites) -> **`W4`** (Unified shared admissions, 5 manual payment options, late/mismatched bKash preservation, moves, `Needs Attention`, Super Admin corrections, restricted live checkout `W4-T10`) -> **`W5`** (Canonical reports, read-only `Transactions`, CSV/XLSX exports, `W5-T04` PDF receipts) -> **`W6`** (Batch notifications) -> **`W7`** (7-section CMS, shared media, static pages/SEO, central question config, DB cutover removing JSON fallback) -> **`W8`** (Admin UX/a11y polish, staged E2E regression, cleanup rehearsal) -> **`W9`** (Provider/backup checks, controlled test-data cleanup, restricted live test, launch).

*(Historical note: Early pre-Rev3.0 Phase labels `P0`–`P14` remain visible only in historical git commit history and archived sections of `docs/STATE.md` / `docs/traceability.csv`.)*
