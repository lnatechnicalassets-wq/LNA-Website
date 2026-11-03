# LNA Website Architecture Specification

**Document Version:** 1.0  
**Date:** 3 November 2026  
**Primary Authorities:** LNA Website Development Blueprint (Parts 3, 5, 6, 7), LNA Website SRS (LNA-SRS-001)  

---

## 1. Introduction and Architectural Principles

This document establishes the system architecture for the rebuild of `lnabd.org` (Lead Nation Academy). The architecture is designed to support offline course enrollment, BDT fee collection via SSLCOMMERZ, learner record access, certificates, and operational administration under strict security, data integrity, and compliance constraints.

### Core Principles
1. **Separation of Concerns:** Public presentation is isolated from transactional workflows. Public pages are statically rendered and cached; transactional and administrative portals are rendered dynamically on the server.
2. **Server-Side Authority:** The browser is an untrusted client. Pricing, capacity, payment verification, authorization, and role management are strictly enforced on the server and database levels.
3. **Immutability and Auditability:** Applied database migrations are forward-only. Financial, enrollment, refund, and certificate records are never deleted through application interfaces; mutations produce auditable event records.
4. **Resilience and Decoupling:** Transaction execution never blocks on third-party side effects (e.g., email delivery). Asynchronous jobs handle retries, notifications, and reconciliation.

---

## 2. Technology Stack and Decision Matrix

*Citations: Blueprint Part 3; SRS Section 9, Figures 1, 4, 7*

The core stack is fixed as specified in the Blueprint:

| Layer | Choice | Rationale & Architectural Constraints | Citing Section |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js 24 LTS | Pinned in `.nvmrc` and `engines`. Active LTS; check `nodejs.org` for newer Active LTS supported by Next 16. | Blueprint 3.1 |
| **Framework** | Next.js 16.x App Router | Unified codebase for static public pages, dynamic protected portals, and webhook endpoints. Isolate revalidation; never rely solely on middleware for auth. | Blueprint 3.1; SRS Fig 4 |
| **Language** | TypeScript (Strict) | End-to-end schema-to-type safety. `any` and `@ts-ignore` are prohibited by linting. | Blueprint 3.1 |
| **Styling** | Tailwind CSS 4.x | Token-driven via CSS variables (`@theme` syntax). No `tailwind.config.js`. Contrast tests enforce WCAG 2.2 AA. | Blueprint 3.1, 4.2 |
| **Accessible Primitives** | Radix UI | Unstyled headless accessible primitives (dialogs, menus, tabs) ensuring keyboard and screen reader compliance. | Blueprint 3.1, 4.8; SRS 11 |
| **Database & Auth** | Supabase (Postgres, Auth, Storage) | Postgres with Row Level Security (RLS), TOTP MFA, secure S3-compatible storage. | Blueprint 3.1, 6.4, 6.5; SRS 9.2 |
| **Data Access** | Generated Supabase Types + RPC | Schema types generated via Supabase CLI. Direct reads via `supabase-js` under RLS; critical writes via Postgres RPC functions with row locks. | Blueprint 3.1, 6.4 |
| **Validation** | Zod | Single source of truth for schemas across JSON content files, client forms, and server API routes. | Blueprint 3.1, 5.4 |
| **Payment Gateway** | SSLCOMMERZ (Hosted Checkout) | In-house typed client using native `fetch`. Server-side Order Validation and IPN processing. No secondary direct gateways (e.g., direct bKash). | Blueprint 3.1, 3.2, 7.4; SRS 9.1 |
| **Rate Limiting & Abuse** | Upstash Redis + Cloudflare Turnstile | Serverless-friendly rate limits on sensitive endpoints; Turnstile challenge on all public form submissions. | Blueprint 3.1, 7.6; SRS NFR-SEC-03 |
| **Transactional Email** | Resend | Managed transactional delivery with SPF, DKIM, DMARC. Delivery state tracked in `email_outbox`. | Blueprint 3.1, 6.7; SRS 9.3 |
| **Hosting & CDN** | Vercel (Paid Commercial Tier) | Edge CDN caching for public assets and static pages; serverless functions co-located in the region nearest the database. | Blueprint 3.1, 6.10; SRS 9.5 |
| **Scheduled Jobs** | Postgres `pg_cron` + Vercel Cron | `pg_cron` for database cleanup (expired holds); authenticated Vercel Cron routes for payment reconciliation and email retries. | Blueprint 3.1, 6.6, 6.7 |
| **PDF Generation** | `pdf-lib` + `@pdf-lib/fontkit` | Server-side PDF generation overlaying text at fixed coordinates on A4 landscape templates for receipts and certificates. | Blueprint 3.1, 6.8; SRS 5.8 |
| **Internationalization** | `next-intl` (/bn prefix) | Statically cached English (canonical) and Bangla localized labels via URL path prefixing. | Blueprint 3.1, 6.2; SRS BR-17 |
| **Monitoring** | Sentry | Error and transaction monitoring with PII scrubbing in `beforeSend`. | Blueprint 3.1, 6.11; SRS NFR-OBS-01 |
| **Testing Suite** | Vitest, Testing Library, Playwright, pgTAP | Vitest for unit/integration; Playwright with `axe-core` for E2E and accessibility; pgTAP for database RLS and function testing. | Blueprint 3.1, Part 11; SRS 12 |

---

## 3. Dual-Layer Content Architecture (JSON & Database)

*Citations: Blueprint Part 5; SRS Section 4.1, 4.3, 5.2, 5.3, 5.9, 8.1, 8.4*

### 3.1 Purpose and Workflow
The system accommodates an operational paradox: public content must be fast, statically cached, and manageable in Git during early development, but administrators must eventually draft, preview, publish, and archive content via web forms without code deployments (SRS FR-CMS-001, FR-CMS-002).

Content lifecycle is divided into two layers:
1. **Development & Seed Phase (Phases 3–5):** Content lives in domain-organized JSON files in `content/`, validated by Zod at build time.
2. **Production Database Phase (Phases 6+):** Operational content transitions to Supabase PostgreSQL tables.
3. **Swappable Repository Abstraction:** Components never import `/content` directly. All frontend consumers query `@/lib/content`, which dynamically delegates to either `JsonContentRepository` or `SupabaseContentRepository` via the server-side environment flag `CONTENT_SOURCE_<DOMAIN>=json|supabase`.

### 3.2 Content Classification and Provenance
Every content record contains an immutable `provenance` block enforcing academic and corporate credibility (SRS FR-PUB-005):
- **Class A (Verified):** `verified: true`, with documented `source`, `verifiedBy` (staff email), and `verifiedOn` (ISO date).
- **Class B (Demo / Unconfirmed):** `verified: false`. Rendered in development with a visual corner ribbon.
- **Class C (Operational):** Live learner data, payments, enrollments, certificates. **Never stored in JSON.**

```typescript
export const Provenance = z.object({
  class: z.enum(["A", "B"]),
  verified: z.boolean(),
  source: z.string().min(5),
  verifiedBy: z.string().nullable(),
  verifiedOn: z.string().date().nullable(),
}).refine(p => p.class === "B" || (p.verified && p.verifiedBy && p.verifiedOn));
```

**Build Gate:** In production (`NODE_ENV=production` and `CONTENT_STRICT=true`), the loader throws if any rendered record has `class === "B"`. Unverified statistics, partner logos, or claims cannot be deployed to production.

### 3.3 Directory Structure
```
content/
├── site/
│   ├── organization.json      # Legal name, address, support contact
│   ├── brand.json             # Palette, fonts, favicon, logo paths
│   ├── navigation.json        # Header, footer, links
│   ├── social.json            # Official social media links
│   └── seo.json               # Default metadata and JSON-LD schemas
├── home/
│   ├── hero-slides.json       # 3 slides: course, assessment, event
│   ├── sections.json          # Section order and toggle states (SRS 4.1)
│   └── impact-figures.json    # Verified statistics (SRS FR-PUB-005)
├── catalog/
│   ├── courses/               # Reusable course records (e.g. irgp.json)
│   ├── batches/               # Dated course batches (e.g. irgp-batch-1.json)
│   └── discounts.json         # Demo discount structures
├── mentors/                   # Mentor profiles with consent records
├── events/                    # Event details and schedules
├── social-proof/
│   └── reviews.json           # Approved reviews with consent documentation
├── assessment/
│   └── questions.v1.json      # 15 questions with 0-4 scores (SRS 5.10)
├── messages/
│   ├── en.json                # English interface strings
│   └── bn.json                # Bangla interface strings (SRS BR-17)
├── policies/
│   ├── privacy.en.md          # Privacy policy markdown
│   ├── terms.en.md            # Terms and conditions markdown
│   └── refund.en.md           # Refund policy markdown
└── schema/                    # Zod validation schemas
```

---

## 4. Full System Architecture & Application Surfaces

*Citations: Blueprint Part 6; SRS Sections 2.1, 3.2, 4.2, 6.1*

### 4.1 Frontend Surface & Route Groups
A single Next.js application serves three primary surfaces with isolated security boundaries:

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (public)/          # Public website (Home, About, Courses, Events, Mentors, Contact)
│   │   ├── (auth)/            # Login, password setup, password reset, staff 2FA
│   │   ├── (learner)/portal/  # Learner portal (My Courses, Receipts, Refunds, Certificates)
│   │   └── (admin)/admin/     # Staff operations (Courses, Batches, Enrollments, Payments, Reports)
│   ├── api/
│   │   ├── payments/sslcommerz/{ipn,success,fail,cancel}/route.ts
│   │   ├── receipts/[id]/route.ts
│   │   ├── certificates/[id]/route.ts
│   │   ├── cron/{reconcile-payments,email-outbox,purge}/route.ts
│   │   └── health/route.ts
│   └── dev/                   # Isolated component gallery (development only)
├── components/{ui,public,forms,portal,admin}/
├── lib/{content,i18n,format,validation,cache}/
├── server/{auth,enrollment,payments,email,certificates,audit,ratelimit,settings}/
└── styles/tokens.css          # Generated by `pnpm tokens` from brand.json
```

| Surface | Rendering Strategy | Caching Strategy | Authentication Check |
| :--- | :--- | :--- | :--- |
| **Public Site** | Static Server Component | CDN Edge Cache with tag revalidation on publish (`revalidateTag`) | None (Public) |
| **Public Forms** | Static Shell + Client Form | No-store for form submissions; Turnstile + Rate limit | None (Turnstile protected) |
| **Payment Callbacks** | Dynamic Route Handler | `Cache-Control: no-store` | Gateway hash + Server Order Validation |
| **Learner Portal** | Dynamic Server Components | `Cache-Control: no-store` | Authenticated Learner Session (`requireLearner`) |
| **Admin Portal** | Dynamic Server Components | `Cache-Control: no-store` | Verified Staff Session + Second Factor (`requireStaff`) |

### 4.2 Database Schema & Key Tables
*Citations: Blueprint 6.4; SRS Section 8.1*

The database runs on PostgreSQL via Supabase with versioned SQL migrations. Money is stored as integer poisha (`bigint`, `1 BDT = 100 poisha`, non-negative constraint). Emails use `citext`. All public identifiers are unguessable Crockford Base32 strings (e.g. `LNA-7K3M-9XQ2`).

1. **`profiles`:** Extends `auth.users`. Contains `id` (UUID), `email` (`citext`, unique), `certificate_name` (text), `role` (`learner`, `admin`, `super_admin`), `account_state` (`active`, `disabled`, `archived`), contact metadata.
2. **`courses`:** Reusable course definitions. `slug` (unique), `title`, `summary`, `topics` (jsonb), `outcomes` (jsonb), `faq` (jsonb), `refund_policy_days_after_payment`, `refund_policy_days_before_start`, `refund_policy_text`, `status` (`draft`, `published`, `archived`).
3. **`batches`:** Dated instances of courses. `course_id`, `slug` (unique), `starts_on`, `schedule`, `venue`, `capacity` (`integer`, nullable for unlimited), `list_fee_minor` (`bigint`), `enrollment_opens_at`, `enrollment_closes_at`, `status`, `certificate_template_id`.
4. **`discounts`:** `scope` (`universal`, `batch`), `batch_id` (nullable), `type` (`percent`, `fixed`), `value_minor` (`bigint`), `starts_at`, `ends_at`, `status`, `created_by`. (Constraint: batch discount overrides universal; cannot reduce price below zero).
5. **`enrollments`:** Core relationship. `public_ref` (unique), `batch_id`, `email`, `full_name`, `phone`, `status` (`pending`, `review`, `confirmed`, `expired`, `cancelled`, `completed`), `hold_expires_at`, `original_fee_minor`, `discount_source`, `discount_amount_minor`, `final_fee_minor`, `profile_id` (nullable until activation). Partial unique index on `(batch_id, email)` for non-expired rows.
6. **`payment_attempts`:** Gateway interactions. `enrollment_id`, `tran_id` (unique, max 30 chars), `amount_minor`, `status` (`initiated`, `redirected`, `validated`, `failed`, `cancelled`, `expired`, `review_hold`), `val_id` (unique when set), `bank_tran_id`, `validated_amount_minor`, `risk_level`, `timestamps`.
7. **`payment_events`:** Append-only gateway notification log. `tran_id`, `source` (`ipn`, `success`, `fail`, `cancel`, `validation`, `reconcile`), `redacted_payload` (jsonb), `signature_valid` (boolean), `received_at`.
8. **`receipts`:** `receipt_no` (sequential internal serial), `payment_attempt_id` (unique), `enrollment_id`, `pdf_path`, `issued_at`.
9. **`refund_requests`:** `enrollment_id`, `reason`, `status` (`requested`, `under_review`, `approved`, `rejected`, `processed`), `decision_by`, `transfer_amount_minor`, `transfer_date`, `transfer_reference`. (Constraint: `processed` status strictly requires amount, date, and reference).
10. **`certificates`:** `enrollment_id`, `certificate_no` (unique), `name_snapshot`, `template_id`, `pdf_path`, `issued_at`, `reissued_at`, `revoked_at`, `issued_by`. One active certificate per enrollment.
11. **`certificate_templates`:** `course_id`, `background_path`, `field_positions` (jsonb).
12. **`email_outbox`:** Transactional email queue. `template`, `recipient_email`, `idempotency_key` (unique), `payload` (jsonb), `status` (`pending`, `sent`, `failed`), `provider_message_id`, `retry_count`, `last_error`.
13. **`audit_events`:** Append-only staff action ledger. `actor_id`, `role`, `action`, `target_entity`, `target_id`, `before_state` (jsonb), `after_state` (jsonb), `ip_hash`, `user_agent_hash`, `created_at`.
14. **`staff_sessions`:** Tracks verified 2FA sessions. `session_id` (bound to JWT), `user_id`, `method` (`totp`, `email_code`), `verified_at`, `expires_at`, `revoked_at`.
15. **`staff_email_codes`:** Short-lived hashed verification codes. `user_id`, `code_hash`, `salt`, `attempts`, `expires_at`, `used_at`.

### 4.3 Authentication & Authorization Design
*Citations: Blueprint 6.5; SRS Section 3, Section 5.6*

1. **Zero Public Signup:** Public registration and third-party social logins (e.g. Google OAuth) are disabled in Supabase Auth (SRS FR-AUT-001).
2. **Account Creation:**
   - Learners are created programmatically by the server only after payment validation (`confirm_payment()`) or confirmed free enrollment (`confirm_free_enrollment()`).
   - Staff accounts are provisioned exclusively by a Super Admin.
3. **Role Enforcement:**
   - Roles (`learner`, `admin`, `super_admin`) reside in `profiles.role` as the source of truth, mirrored to `app_metadata` by server-side admin API only.
   - `user_metadata` is completely untrusted and never read for authorization.
4. **Staff Two-Factor Authentication (2FA):**
   - Step 1: Email and password.
   - Step 2: Second factor challenge:
     - **Super Admin:** Mandatory TOTP Authenticator App (`aal2` in Supabase Auth). Emailed codes are forbidden for Super Admin (Blueprint G5).
     - **Admin:** TOTP Authenticator App or short-lived, single-use, rate-limited emailed verification code (hashed with per-code salt).
   - Successful 2FA verification creates a record in `staff_sessions` bound to the current session ID.
5. **Data Access Guards:**
   - Server functions and actions wrap all sensitive execution with:
     - `requireLearner()`
     - `requireStaff(permission)`
     - `requireOwnership(resource)`
   - Next.js middleware performs preliminary path routing and redirects for convenience only; **middleware is never the sole authorization boundary.**

### 4.4 Enrollment, Seat Holds, and Payment Lifecycle
*Citations: Blueprint 6.6; SRS Section 5.4, 5.5, 6.1, 7*

1. **Seat Hold Reservation:**
   - The applicant submits the universal form. Server validates input with Zod and verifies Cloudflare Turnstile token.
   - The server invokes the database RPC `start_enrollment(batch_id, applicant_data)`.
   - The function obtains an exclusive row lock (`SELECT ... FOR UPDATE`) on the batch record.
   - Available capacity is calculated atomically:  
     $$\text{Available Seats} = \text{Capacity} - \text{Confirmed Enrollments} - \text{Unexpired Holds}$$
   - If capacity is exhausted or batch is closed, execution aborts with `BATCH_FULL` or `BATCH_CLOSED`.
   - If space is available, an enrollment record is created (or existing pending record reused per G15), fee snapshots are recorded from the pricing function, and a 30-minute seat hold is created (`hold_expires_at = now() + interval '30 minutes'`).
2. **Hold Expiry Guarantee:**
   - Expired holds are evaluated at read time in SQL queries (`hold_expires_at > now()`). System correctness never depends on cron execution (SRS BR-05). `pg_cron` runs periodically to sweep expired holds for housekeeping.
3. **Free Batches:**
   - Skip payment gateway invocation entirely (SRS FR-ENR-005). Seat hold is held until email verification link is clicked (Blueprint G4), invoking `confirm_free_enrollment()`.

---

## 5. Security Architecture & Payment Protection

*Citations: Blueprint Part 7; SRS Section 9.1, 10.1, 10.2*

### 5.1 Payment Invariants (Non-Negotiable)
1. **Server-Only Gateway Communication:** Only server-side code in `src/server/payments` may invoke the SSLCOMMERZ gateway. No gateway credential or store password ever exists in client bundles or client requests.
2. **Order Validation Mandatory:** A payment is marked `paid` / `confirmed` **only** inside `confirm_payment()`, and **only** after direct server-to-server Order Validation succeeds with an exact match on `tran_id`, `amount_minor`, `currency` (BDT), and `store_id`.
3. **Untrusted Redirects:** Browser redirects to `success`, `fail`, or `cancel` URLs are completely untrusted. They never alter payment state directly; they display a pending state while polling the server verification outcome.
4. **Integer Currency:** All financial math uses integer poisha (`bigint`). JavaScript floating-point numbers (`Number`, `parseFloat`) are strictly banned from financial calculations and pricing logic.
5. **No Card Data Storage:** Card numbers, CVVs, PINs, and mobile banking OTPs never touch LNA servers (PCI DSS SAQ A compliant).

### 5.2 9-Step Gateway Notification Processing
When an IPN or browser return notification is received by the server, `processGatewayNotification(payload, source)` executes the following exact sequence:
1. **Log Raw Payload:** Store the raw payload, with credentials redacted, in append-only table `payment_events` with timestamp and source.
2. **Find Attempt:** Look up the `payment_attempts` record by `tran_id`. If `tran_id` is unknown, log the anomaly and terminate.
3. **Check Idempotency:** If the attempt is already in a terminal state (`validated`, `failed`, `cancelled`), return the existing result immediately without modifying state.
4. **Verify Signature:** Validate the incoming signature hash (`verify_sign`) against the gateway payload parameters using the stored store password. If invalid, log an alert and terminate.
5. **Server-to-Server Order Validation:** Call the SSLCOMMERZ Order Validation API directly with `val_id` and store credentials. If a network or gateway error occurs, leave the attempt as `pending` for reconciliation cron to resolve.
6. **Strict Field Comparison:** Verify that the Order Validation response status is `VALID` or `VALIDATED`. Compare:
   - `tran_id` matches stored attempt
   - `amount` matches stored `amount_minor` (parsed via integer decimal parser)
   - `currency` is `BDT`
   - `store_id` matches configured store identity  
   *Any mismatch immediately sets the attempt to `review_hold`, alerts staff, and halts automated processing.*
7. **Risk Assessment:** If the gateway flags the transaction as risky (`risk_level === 1`), mark status as `review_hold` and withhold automated account activation (SRS FR-PAY-008).
8. **Atomic Confirmation:** Invoke database RPC `confirm_payment(attempt_id, ...)` under a transaction. The function locks the attempt row, transitions enrollment to `confirmed`, creates the receipt row, and inserts the receipt and activation emails into `email_outbox`.
9. **Acknowledge Gateway:** Return a standard `200 OK` response to the payment gateway.

### 5.3 Threat Model Summary (T1 to T20)
*Citations: Blueprint 7.2*

| ID | Threat | Attack Vector | Mitigation Control |
| :--- | :--- | :--- | :--- |
| **T1** | Forged Payment Callback | Attacker posts forged HTTP POST to IPN/success endpoint | Hash verification + server-to-server Order Validation with SSLCOMMERZ; browser redirect never marks paid. |
| **T2** | Amount Manipulation | Client modifies price in browser request | Amount calculated exclusively on server/DB from batch and active discounts; client sends zero price fields. |
| **T3** | Callback Replay | Duplicate gateway notification or attacker replay | Unique constraint on `val_id` and `tran_id`; `confirm_payment` executed under row lock with idempotency check. |
| **T4** | Seat Oversell | Concurrent checkout submissions for final seat | Postgres row lock (`SELECT ... FOR UPDATE`) in `start_enrollment` and `confirm_payment`. |
| **T5** | IDOR | Attacker tampers with URL IDs to fetch receipts/certificates | Non-sequential Crockford Base32 public refs; strict RLS + server ownership validation (`requireOwnership`). |
| **T6** | Broken Admin Access | Admin attempts Super Admin actions | `withStaff(permission)` wrapper on all staff actions; database RLS policies matching SRS 3.2 permission matrix. |
| **T7** | Credential Stuffing | Automated brute force on login or status lookup | Upstash Redis rate limiting, generic authentication error messages, Cloudflare Turnstile enforcement. |
| **T8** | Staff Account Takeover | Compromised staff credentials | Mandatory 2FA, short session lifetimes, session revocation upon password reset, audit logging. |
| **T9** | 2FA Bypass via Email | Attacker compromises staff mailbox to bypass 2FA | Super Admin must use TOTP app only; password reset invalidates all active staff sessions and 2FA tokens. |
| **T10** | SQL Injection | Malicious input in form or search parameters | Supabase parameterization, strict Zod schema validation, no string-concatenated SQL queries. |
| **T11** | Stored XSS | Malicious script in mentor bio, review, or inquiry | React automatic escaping, strict sanitization of markdown with `sanitize-html`, restrictive CSP. |
| **T12** | CSRF | Cross-site forged requests to mutation endpoints | Next.js Server Actions with automatic CSRF tokens and Origin header validation. |
| **T13** | Malicious File Upload | Executable file uploaded as course cover or photo | Magic-byte file signature validation, image re-encoding, storage bucket served statically without script execution. |
| **T14** | Applicant Enumeration | Harvesting applicant data via status lookup | Lookup requires both `public_ref` AND `email`; uniform response timing; strict rate limits. |
| **T15** | Data Leak via Exports | Unauthorized staff dumps sensitive PII | Export actions logged in `export_log` (actor, time, filters); role permission checks; PII fields minimized. |
| **T16** | Secret Key Exposure | Supabase service key leaked in client bundle | Strict `src/env.ts` validation, `@/server` imports guarded by `server-only` package, CI secret scanning (`gitleaks`). |
| **T17** | Supply Chain Attack | Compromised npm dependency | Pinned dependency allowlist (`docs/DEPENDENCIES.md`), `pnpm audit`, OSV scanning, no postinstall scripts. |
| **T18** | AI Code Drift | Automated agent weakens security checks | Automated CI tests enforcing RLS and permissions, CODEOWNERS requiring human review on security files. |
| **T19** | Mass Email Spam | Public form used to flood third-party mailboxes | Turnstile protection, rate limiting by IP and email, confirmation emails restricted to submitted address. |
| **T20** | Gateway Outage | SSLCOMMERZ down during transaction confirmation | Transaction marked pending; background cron reconciliation re-queries Order API once connectivity is restored. |

### 5.4 Content Security Policy (Decision D-CSP)
*Citations: Blueprint 7.5*

To ensure compatibility with CDN caching for 100,000 monthly visitors while maintaining robust security against XSS:
1. **Dynamic Pages (Forms, Portals, Admin, Payments):** Server-rendered with a cryptographically secure, per-request nonce in `Content-Security-Policy`.
2. **Static Browsing Pages (Home, About, Course List, Events):** Statically generated and cached on Vercel Edge CDN using Next.js hash-based script verification (or strict domain allowlist).
3. **Core CSP Directives:**
```http
default-src 'self';
script-src 'self' 'nonce-{NONCE}';
style-src 'self' 'nonce-{NONCE}';
img-src 'self' data: https://*.supabase.co;
connect-src 'self' https://*.supabase.co https://*.upstash.io https://*.sentry.io https://challenges.cloudflare.com;
frame-ancestors 'none';
form-action 'self';
base-uri 'self';
object-src 'none';
```

---

## 6. Verification and Acceptance Strategy

*Citations: Blueprint Part 11; SRS Section 12*

Automated testing governs task completion. Work is not considered done until required tests pass without modification or skipping:
- **Unit & Logic Tests (Vitest):** Validate pricing calculation, discount resolution, currency conversion, reference generation, and Zod schemas.
- **Component Tests (Testing Library):** Validate accessible states, error messages, and keyboard navigation.
- **Database Tests (pgTAP):** Run against the local Supabase stack to verify RLS isolation across roles (`anon`, `learner`, `admin`, `super_admin`), RPC row-locking, and idempotency.
- **End-to-End Tests (Playwright):** Validate complete user journeys (AT-01 to AT-15) across mobile (320px), tablet (768px), and desktop (1280px) viewports with automated accessibility checks (`@axe-core/playwright`).

