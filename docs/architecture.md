# LNA Website Architecture Specification

**Document Version:** 1.1 (Scope Revision Alignment)  
**Date:** 4 November 2026  
**Primary Authorities:** LNA Website Development Blueprint, docs/SCOPE-REVISION-V1.md (Approved Scope Addendum), LNA Website SRS (LNA-SRS-001)  

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
| **Runtime** | Node.js 24 LTS | Pinned in `.nvmrc` and `engines`. Active LTS supported by Next 16. | Blueprint 3.1 |
| **Framework** | Next.js 16.x App Router | Unified codebase for static public pages, dynamic protected admin portal, and webhook endpoints. | Blueprint 3.1 |
| **Language** | TypeScript (Strict) | End-to-end schema-to-type safety. `any` and `@ts-ignore` are prohibited by linting. | Blueprint 3.1 |
| **Styling** | Tailwind CSS 4.x | Token-driven via CSS variables (`@theme` syntax). No `tailwind.config.js`. WCAG 2.2 AA compliant. | Blueprint 3.1, 4.2 |
| **Accessible Primitives** | Radix UI | Unstyled headless accessible primitives (dialogs, menus, tabs) ensuring keyboard and screen reader compliance. | Blueprint 3.1, 4.8 |
| **Database & Auth** | Supabase (Postgres, Auth, Storage) | PostgreSQL with Row Level Security (RLS), TOTP MFA, secure S3-compatible storage. | Blueprint 3.1, 6.4, 6.5 |
| **Data Access** | Generated Supabase Types + RPC | Schema types generated via Supabase CLI. Direct reads via `supabase-js` under RLS; critical writes via PostgreSQL RPC with row locks. | Blueprint 3.1, 6.4 |
| **Validation** | Zod | Single source of truth for schemas across JSON content files, client forms, and server API routes. | Blueprint 3.1, 5.4 |
| **Payment Gateway** | bKash Payment Gateway API | Direct in-house typed client (`src/server/payments/bkash.ts`). Tokenized/PGW checkout, server-to-server validation, and reconciliation. | ADR 0009; Scope Addendum |
| **Rate Limiting & Abuse** | Upstash Redis + Cloudflare Turnstile | Serverless rate limits on sensitive endpoints; Turnstile challenge on all public form submissions. | Blueprint 3.1, 7.6; NFR-SEC-03 |
| **Transactional Email** | Resend | Managed transactional delivery with SPF, DKIM, DMARC. Async processing via `email_outbox`. Employee mailboxes out of scope. | Blueprint 3.1, 6.7; Scope Addendum |
| **Hosting & CDN** | Vercel (Commercial Tier) | Edge CDN caching for public assets and static pages; serverless functions co-located in region nearest database. | Blueprint 3.1, 6.10 |
| **Scheduled Jobs** | Postgres `pg_cron` + Vercel Cron | `pg_cron` for database cleanup; authenticated Vercel Cron routes for payment reconciliation and email outbox retries. | Blueprint 3.1, 6.6, 6.7 |
| **PDF Generation** | `pdf-lib` + `@pdf-lib/fontkit` | Server-side PDF generation for payment receipts with short-lived HMAC signature access. | Blueprint 3.1, 6.8 |
| **Monitoring** | Sentry | Error and transaction monitoring with PII scrubbing in `beforeSend`. | Blueprint 3.1, 6.11; NFR-OBS-01 |
| **Testing Suite** | Vitest, Testing Library, Playwright, pgTAP | 4-Tier Risk-Based Testing (Levels 0–3). Vitest for unit/integration; Playwright with `axe-core`; pgTAP for database RLS. | ADR 0006, ADR 0010 |

---

## 3. Content Management System (CMS) & Dual-Layer Architecture

*Citations: Blueprint Part 5; docs/SCOPE-REVISION-V1.md Module 4; SRS Section 4.1, 5.2, 8.4*

### 3.1 Purpose and Workflow
The system provides robust administrative content management across all public surfaces:
1. **Course & Batch Catalog:** Rich forms to manage course syllabi, outcomes, FAQs, refund terms, batch dates, capacity, fees, and publishing states.
2. **Homepage Banners & Hero Slides:** Staff configuration of hero banner slides, titles, subtitles, call-to-action buttons, scheduling, and active toggles.
3. **Public Informational Sections:** Section visibility ordering, announcements, and institutional details.
4. **Image Upload Pipeline:** Secure upload validating MIME magic bytes, dimensions, file size limits, and mandatory alternative text for accessibility.
5. **Dual-Layer Abstraction:** Components never import `/content` directly. Frontend consumers query `@/lib/content`, which dynamically delegates to either `JsonContentRepository` (early seed phase) or `SupabaseContentRepository` (production database phase) via `CONTENT_SOURCE_<DOMAIN>=json|supabase`.

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
| **Public Site** | Static Server Component | CDN Edge Cache with tag revalidation on publish (`revalidateTag`) | None (Public) |
| **Enrollment & Status** | Static Shell + Client Form | No-store for submissions; Turnstile + Rate limit | Public (`public_ref` + `email`) |
| **Payment Callbacks** | Dynamic Route Handler | `Cache-Control: no-store` | Gateway parameters + Server Execution & Query |
| **Receipt Downloads** | Dynamic Route Handler | `Cache-Control: private, no-store` | Short-lived HMAC-SHA256 signature / Staff session |
| **Admin Portal** | Dynamic Server Components | `Cache-Control: no-store` | Verified Staff Session + Second Factor (`requireStaff`) |
| *Learner Portal* | *Deferred (Post-v1)* | *N/A* | *Excluded from Release v1.0* |

### 4.2 Database Schema & Key Tables
The database runs on PostgreSQL via Supabase with versioned SQL migrations:
1. **`profiles`:** Extends `auth.users` for staff. Contains `id` (UUID), `email` (`citext`, unique), `role` (`admin`, `super_admin`), `account_state` (`active`, `disabled`, `archived`).
2. **`courses`:** Reusable course definitions. `slug` (unique), `title`, `summary`, `topics` (jsonb), `outcomes` (jsonb), `faq` (jsonb), `refund_policy_text`, `status` (`draft`, `published`, `archived`).
3. **`batches`:** Dated instances of courses. `course_id`, `slug` (unique), `starts_on`, `schedule`, `venue`, `capacity` (`integer`), `list_fee_minor` (`bigint`), `enrollment_opens_at`, `enrollment_closes_at`, `status`.
4. **`enrollments`:** Core relationship. `public_ref` (Crockford Base32), `batch_id`, `email`, `full_name`, `phone`, `status` (`pending`, `confirmed`, `expired`, `cancelled`), `hold_expires_at`, `original_fee_minor`, `discount_amount_minor`, `final_fee_minor`. Partial unique index on `(batch_id, email)` for active rows.
5. **`payment_attempts`:** Gateway interactions. `enrollment_id`, `tran_id` (unique), `payment_id`, `trx_id` (unique when validated), `amount_minor`, `status` (`initiated`, `pending`, `validated`, `failed`, `cancelled`, `review_hold`), `timestamps`.
6. **`payment_events`:** Append-only gateway notification log. `tran_id`, `source`, `redacted_payload` (jsonb), `received_at`.
7. **`receipts`:** `receipt_no` (sequential serial), `payment_attempt_id` (unique), `enrollment_id`, `pdf_path`, `issued_at`.
8. **`refund_records`:** Internal admin settlement ledger. `enrollment_id`, `amount_minor`, `transfer_date`, `transfer_reference`, `recorded_by`.
9. **`email_outbox`:** Transactional email queue. `template`, `recipient_email`, `idempotency_key` (unique), `payload` (jsonb), `status` (`pending`, `sent`, `failed`), `provider_message_id`, `retry_count`, `last_error`.
10. **`audit_events`:** Append-only staff action ledger. `actor_id`, `role`, `action`, `target_entity`, `target_id`, `before_state` (jsonb), `after_state` (jsonb), `created_at`.
11. **`staff_sessions`:** Tracks verified 2FA sessions. `session_id`, `user_id`, `method` (`totp`, `email_code`), `verified_at`, `expires_at`.

### 4.3 Authentication & Authorization Design
1. **Zero Public Signup:** Public registration is disabled in Supabase Auth (SRS FR-AUT-001). Staff accounts are provisioned exclusively by Super Admin.
2. **Staff Two-Factor Authentication (2FA):** Mandatory TOTP Authenticator App or short-lived, rate-limited email verification codes for staff login.
3. **Data Access Guards:** Server functions wrap all sensitive execution with `requireStaff(permission)` or `requireOwnership()`. Middleware is never the sole authorization boundary.

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

### 5.2 Receipt Security via HMAC Signatures
* Public receipt downloads require a short-lived cryptographic signature token:
  $$\text{Signature} = \text{HMAC\_SHA256}(\text{receipt\_no} + \text{public\_ref} + \text{expires\_timestamp}, \text{APP\_SECRET})$$
* Tokens expire after 30 minutes. Prevents IDOR and receipt scraping.

---

## 6. Transactional Email System Architecture (Resend)

*Citations: Blueprint 6.7; docs/SCOPE-REVISION-V1.md Module 6*

1. **Provider:** Resend API integrated in `src/server/email/resend.ts`.
2. **Asynchronous Outbox Pattern:**
   * Business transactions never block on email HTTP delivery.
   * Notifications are inserted into `email_outbox` inside the database transaction confirming the event.
   * Background runner picks up `pending` rows, invokes Resend, updates status to `sent` with `provider_message_id`, or increments `retry_count` with `last_error`.
3. **Branded Transactional Templates:**
   * Application Received & Status Instructions (`application-received.tsx`).
   * bKash Payment Receipt & Enrollment Confirmation (`payment-receipt.tsx`).
   * Staff Security & 2FA Verification Codes (`staff-2fa-code.tsx`).
4. **Boundary:** Resend is used strictly for outbound transactional website notifications. Employee mailbox hosting is outside project scope.

---

## 7. Preserved Phase Architecture (P0–P14)

Original task identifiers and historical phase structures are preserved. Tasks outside the approved Release v1.0 scope are marked as deferred:

| Phase | Title | Status for Release v1.0 |
| :--- | :--- | :--- |
| **P0** | Project Setup, Rules & Governance | **Completed:** Rules, repo, SRS baseline, scope addendum. |
| **P1** | Next.js 16 Scaffold & CI Tooling | **Active:** P1-T1 & P1-T2 completed; P1-T3 (`env.ts` & headers) next. |
| **P2** | Design Tokens & Accessible Atoms | **Retained:** Brand tokens, Radix UI atoms, navigation shell. |
| **P3** | Content Architecture & Seed | **Modified:** Canonical English CMS repositories. Bilingual copy deferred. |
| **P4** | Public Website Core | **Modified:** Home, About, Course catalog & details. Events/reviews deferred. |
| **P5** | Infrastructure Setup | **Retained:** Supabase project, Vercel, Upstash Redis, Sentry, health route. |
| **P6** | Database Migrations & RLS | **Retained:** PostgreSQL tables for courses, batches, enrollments, audit. |
| **P7** | Staff Authentication & RBAC | **Modified:** Staff login & mandatory 2FA. Student auth deferred. |
| **P8** | Course & Batch Management Portal | **Modified:** Admin course, batch, and homepage CMS. Mentors/reviews deferred. |
| **P9** | Online Enrollment Engine | **Modified:** Universal application form, Crockford refs, 30-min hold RPC. |
| **P10** | bKash Payment Integration | **Modified:** Direct bKash API client, server execution, receipts. |
| **P11** | Receipts & Administrative Refunds | **Realigned:** Admin offline refund ledger. Learner dashboard/certs deferred. |
| **P12** | Reports & CSV Exports | **Realigned:** Operational reports & CSV exports. Assessment/events deferred. |
| **P13** | Security Audit & Quality Gates | **Retained:** Security penetration audit, pgTAP RLS tests, WCAG 2.2 AA audit. |
| **P14** | WordPress Migration & Launch | **Retained:** Asset audit, 301 redirects, ExonHost DNS cutover. |
