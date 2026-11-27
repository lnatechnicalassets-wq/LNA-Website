# Project State: Lead Nation Academy (lnabd.org) Rebuild

**Last Updated:** 27 November 2026  
**Governing Baseline:** [`docs/LNA_Rev3.0/`](LNA_Rev3.0/README.md) (`LNA v1.1 Planning Revision 3.0`) & [`docs/SCOPE-REVISION-V1.1.md`](SCOPE-REVISION-V1.1.md)

**Session Context (`W2A-T02-F02` Review Corrections Applied — Awaiting Isolated CI Verification):** Applied targeted SQL and pgTAP review corrections in [`supabase/migrations/20261127100000_w2a_t02_db_auth_and_audit.sql`](supabase/migrations/20261127100000_w2a_t02_db_auth_and_audit.sql), expanded [`supabase/tests/0019_w2a_t02_db_auth_and_audit.sql`](supabase/tests/0019_w2a_t02_db_auth_and_audit.sql) to `54` assertions (plus updated pre-Rev3.0 actor-denial fixtures in `0006`, `0007`, `0009`), and retained [`.github/workflows/database-tests.yml`](.github/workflows/database-tests.yml) (`19` migrations replay, `19` pgTAP suites, `17 -> 18` & `18 -> 19` incremental upgrades, token-cache `grant`/`wait` concurrency, and parallel-session deactivation/write race). Next.js server actions/route handlers continue establishing trusted caller identity (`requireStaff`), while SQL RPCs verify that trusted server-supplied `p_actor_id` against `public.profiles` (`account_state` and authoritative DB `role` under `FOR SHARE`). Application-layer Admin activation remains **disabled** until `W2A-T03`; legacy purge RPCs remain **Super Admin-only** until `W2A-T06`. **`W2A-T02` remains `in_progress` awaiting owner execution of the isolated GitHub Actions database workflow.** Prior `W0-E03` verified for isolated dev (`b961ea3` / run `45899254045` + 9 SQL Editor preflight groups); **`W0-E00` remains deferred, not passed**.

---

## 0. Rev3.0 Implementation Boundary (`W0`–`W9`)

- **Current Observed Code Baseline (Pre-Rev3.0 Partial Build):**
  - Public routes (`/`, `/about`, `/courses/[slug]`, `/enroll`, `/status`, `/news`, `/mentors/[slug]`, `/privacy`, `/terms`, `/refund-policy`) + dev previews (`/mtotest`, `/testrunmto` guarded `notFound()` in prod).
  - Admin routes (`/admin`, `/admin/login`, `/admin/catalog/[section]`, `/admin/enrollments`, `/admin/students`, `/admin/mentors`) with `AAL2` TOTP enforcement for `super_admin` (`W2A-T01` typed role contract & route/action/RPC inventory implemented in `src/server/auth/permissions.ts` and `src/server/auth/require-staff.ts`; active `admin` runtime grants remain `[]` pending `W2A-T02`/`W2A-T03`).
  - Direct bKash client (`src/server/payments/bkash.ts`), fail-closed `SupabaseBkashTokenCache` (`bkash_private.gateway_tokens`, returning `503` if RPC missing — superseding older in-memory fallback notes below), `/api/cron/reconcile-payments`, and `email_outbox` (`EMAIL_DISPATCH_MODE` defaults `"disabled"`).
  - **18 migrations recorded in production** (`W0-G01`/`W0-G02`: `20261110161500`–`20261123110000`, last two reconciled history-only).
  - **Conflicting legacy features currently in codebase (to retire in `W2A-T06`):** routine student/admission permanent purge RPCs/actions (`20261116160000`–`180000`, `src/app/admin/record-purge-actions.ts`) and `/api/payments/bkash/sandbox-refund` + `SandboxRefundAction`.
- **Approved Future Rev3.0 Functionality (`NOT STARTED` / `AC-D01`–`D78` `NOT RUN`):**
  - `W2A`: Two-role matrix (`Admin` vs `Super Admin`), audit scoping, early shared admin shell (`W2A-T03`), app-enforced `30m/12h` sessions (`W2A-T04`), Turnstile server `siteverify` & Upstash contact rate limit (`W2A-T05`), retirement of production refund & routine purge paths (`W2A-T06`).
  - `W1`: Decoupled course/batch publication, manual academic lifecycle, `Accept Applications`, unlimited capacity default (MTO unlimited at launch), optional display deadlines, copy/prefill.
  - `W2B`: Staff directory/invites, last-SA lock, sole-SA recovery runbook, scoped batch/Website/global activity viewers.
  - `W3`: Email outbox worker (`/api/cron/email-outbox`), persistent DB job leases, Resend `accepted` vs `delivered` webhook, recurring encrypted DB/Auth/Storage backups (`W3-T05`).
  - `W4`: Unified shared online/manual application fields & question snapshots, 5 paid-batch manual payment options, `Needs Attention`, receipt association/review (`PAY-11`), same-course transfers, SA payment corrections, restricted live checkout (`W4-T10`).
  - `W5`: Canonical totals, read-only `Transactions`, configurable CSV + true `.xlsx` exports, **`W5-T04` / `PAY-13` / `C-16` branded PDF payment receipts** + confirmation attachment.
  - `W6`: Manual `Batch Notify Students` & optional start/complete notices.
  - `W7`: Full 7-section Website CMS, shared media library & reference-safe deletion, structured pages/SEO, central question config, verified DB cutover removing production JSON fallback.
  - `W8`–`W9`: Admin UX/a11y polish, staged full regression (`UX-E2E-01`–`10`), rehearsed allowlisted cleanup, controlled live test, and owner launch sign-off.
- **Technical Verification & Environment Gaps Remaining (`W0-E00`, `W0-E02`–`W0-E05`):**
  - **`W0-E00` (Deferred by Owner — Outstanding Mandatory Checks):** Vercel `Production` vs `Preview` isolation, actual Production `BKASH_CHECKOUT_MODE` / `BKASH_MANUAL_PAYMENT_ENABLED` / `BKASH_SANDBOX_REFUNDS_ENABLED` (note local `.env.local` has `live` and `true` for sandbox UAT), Production Supabase Auth `disable_signup` & verified TOTP factors, Production `payment_attempts`/`batches` read-only SQL inspection, and Vercel auto-deploy/branch settings.
  - **`W0-E02` / `INF-04` (`PASS` via `W0-E02-F01` — Verified 27 Nov 2026):** Git tree clean prior to doc/ignore updates (`task/w0-gap-closing` @ `97ee97a`); `.prettierignore` updated with `supabase/.temp/`. Under verification session `$env:Path = "C:\Program Files\nodejs;" + $env:Path` (`Node v26.13.0`, `pnpm 12.16.1`, `RUN_BKASH_LIVE_UAT=''`), `pnpm verify` exited **`0`** (`tokens:check`, `content:validate`, `typecheck`, `lint`, `format:check`, `vitest run` `73/74` files / `382/383` tests with `bkash-live-uat.test.ts` skipped, and `next build` `36/36` static pages). Note: machine/user Windows `PATH` still lists `C:\nvm4w\nodejs` (`v24.15.0`) before `C:\Program Files\nodejs` (`v26.13.0`), so non-interactive agent commands must prepend `C:\Program Files\nodejs;` per verification session until owner adjusts host `PATH`.
  - **`W0-E03` / `INF-01`–`03` (`VERIFIED FOR ISOLATED DEV WITH RECORDED EXCEPTIONS` — 27 Nov 2026):**
    - **Isolated CI DB Harness (GitHub Actions run `45899254045`, commit `118020a`):** PostgreSQL `17.11` replayed `18/18` migrations, passed `18/18` pgTAP suites (`395` assertions), passed `17 -> 18` incremental upgrade (`16` assertions), and verified bounded `grant`/`wait` concurrency in `.github/workflows/database-tests.yml` / `supabase/config.toml` (PG17 / `[local_smtp]`).
    - **Owner Read-Only SQL Editor Preflight (all `9` check groups executed 27 Nov 2026):**
      - *Schema, Functions, ACLs & RLS:* PostgreSQL `17.11`; all `18` migration IDs match (`20261110161500`–`20261123110000`); all `16` expected tables exist with RLS enabled; expected batch constraints (`batches_capacity_positive`, `batches_historical_count_bounds`, `batches_status_valid`) and enrollment indexes match; `34` application functions including `14` `SECURITY DEFINER` functions, plus additional `rls_auto_enable()` (`ensure_rls` event-trigger helper); protected application RPC privileges, owners, signatures, and `search_path` settings match the reviewed baseline; table ACLs (`authenticated` `SELECT` on `profiles` under own-active-profile policy, `batch_mentors` `service_role`-only), private schema isolation (`bkash_private`), and all `11` RLS policies match.
      - *Aggregate Data Preflight (zero PII):* `4` batches with `0` `NULL` capacities and `0` over-capacity batches; `7` active students with `0` duplicate contact groups; `24` enrollment phone numbers valid with `0` non-legacy contact duplicate groups and `1` legacy normalized phone collision (`legacy_duplicate_phone`); `24` enrollments (`8` `confirmed`, `4` `application_in_process`, `12` `expired`) and `20` payment attempts (`4` `validated`, `11` `failed`, `3` `pending`, `2` `cancelled`) with `0` `EXECUTE_NO_RESPONSE` errors.
      - *Recorded Exceptions & Scope Limits (Carry-Forwards):* Does **not** claim complete production readiness or exhaustive schema equivalence (`W0-E00` production gate remains `deferred_by_owner`, not passed). Recorded operational data/feature findings carried forward: (1) `1` legacy normalized phone collision -> **`W4-T01`**; (2) legacy sandbox refund/purge retirement -> **`W2A-T06`**; (3) `3` stale manual applications, `1` unfinished fixture application, `3` `pending` sandbox attempts on `expired` enrollments, `3` `unconfirmed` + `1` `completed` sandbox refunds, and `1` `failed` sandbox attempt retaining `bkash_execute_claimed` -> relevant payment reconciliation & approved cleanup gates (**`W4-T03` / `W4-T07` / `W4-T09`**, **`W8-T04` / `W9-T05`–`T06`**, **`R-05` / `R-14`**).
  - **`W0-E04` / `INF-05`–`08`:** Evaluate ExonHost compatibility before any paid hosting approval; verify live bKash merchant credentials/API version/IP rules (`statusCode: "9999"` previously reported); verify `mail.lnabd.org` Resend DNS/quotas.
  - **`W0-E05` / `INF-10`:** Establish off-site encrypted DB/Auth/Storage backup target + tested restore drill.
  - **`W2A-T02` / `SEC-01`, `SEC-02`, `SEC-05`, `D64`, `D73` (`IN PROGRESS` — `W2A-T02-F02` Review Corrections Applied, Awaiting Isolated CI Verification 27 Nov 2026):** Implemented forward migration `20261127100000_w2a_t02_db_auth_and_audit.sql` (additive `audit_events` `reason`, `audit_scope` [`batch`/`website`/`global`], `batch_id`, `secondary_batch_id` validated against `public.batches` on insert without `ON DELETE RESTRICT` blocking future `D08`/`W1-T03` unused-draft deletion or wiping historical audit identifiers; `REVOKE UPDATE, DELETE, TRUNCATE` immutability across all roles including `service_role`; recursive `redact_audit_jsonb` stripping snake_case, camelCase, and separator secret/credential/token/OTP/key variants such as `accessToken`/`refreshToken`/`appKey`/`appSecret`/`recoveryCode` while preserving legitimate operational fields and making no arbitrary free-text secret detection claim; fail-closed `require_staff_actor` `FOR SHARE` & `is_staff_actor_authorized` using `IS NOT TRUE` / `IS TRUE` and rejecting `NULL`-containing role arrays to independently verify trusted server-supplied `p_actor_id` against DB `account_state` and `role`; atomic `record_staff_audit_event`; derived-scope `manage_staff_student` ignoring unused batch/course args on `archive`/`restore`; operational staff RPC refactor for `admin`/`super_admin` while keeping legacy purge RPCs `super_admin`-only until `W2A-T06`; zero signature changes and zero browser/PUBLIC privilege leaks), expanded `supabase/tests/0019_w2a_t02_db_auth_and_audit.sql` (`54` assertions including `service_role` `UPDATE`/`DELETE`/`TRUNCATE` rejection, `NULL`-only & `NULL`-containing role arrays, Admin `create_staff_enrollment`, derived student-archive `global` scope, camelCase/separator key redaction, unused-draft deletion preserving audit rows, and genuine post-mutation audit-failure rollback atomicity) + updated `0006`/`0007`/`0009` negative-actor checks, and extended `.github/workflows/database-tests.yml` with `19`-migration replay/suites, `17 -> 18` & `18 -> 19` incremental upgrades, and bounded parallel-session deactivation/write race verification (`W2A-T02-F01` explicit transaction `SET LOCAL ROLE service_role`, `current_user` assertion, schema-valid race fixture pre-check, `pg_blocking_pids` + `public.profiles` `RowExclusiveLock` contention proof, SQLSTATE `42501` + `STAFF_ENROLLMENT_FORBIDDEN` check). Application-layer Admin activation remains disabled (`ACTIVE_ROLE_PERMISSIONS.admin = []`, `COORDINATED_ADMIN_ACTIVATION_READY = false`) until `W2A-T03`. Earlier `W2A-T02` application `pnpm verify` passed (`Node v26.13.0`, `pnpm 12.16.1`, `RUN_BKASH_LIVE_UAT=''`); database execution awaits owner CI workflow run.
- **Next Tasks (`W2A-T02` Awaiting Owner CI Run Before `W2A-T03`):**
  1. Complete `W2A-T02`: after independent review and owner-controlled commit/push, run `.github/workflows/database-tests.yml` cleanly on GitHub Actions to verify `19/19` migrations, `19/19` pgTAP suites, `17 -> 18` & `18 -> 19` upgrades, and both concurrency races (`grant`/`wait` and deactivation/write); record CI evidence before starting `W2A-T03`.
  2. Complete/confirm `W0-E00` owner production safety checks before any deployment or production-touching work (`W0-E01`, `W0-E02`, `W0-E03` [isolated dev @ `b961ea3`], and `W2A-T01` complete).
  3. Continue keeping `C:\Program Files\nodejs;` prepended in non-interactive verification shells until host Windows `PATH` order is updated.

---

## Homepage MTO hero (Historical Phase 10 Note)

- The homepage features MTO Readiness with a two-line heavy, forward-slanted live text title treatment (`MTO` in deep ink-teal `#03242a`, `READINESS` in darker-to-brighter teal gradient).
- The central diagonal strip displays the transparent building PNG (`mto-hero-glass-building.png`) with feathered alpha transition and CSS mask gradient (`mask-image: linear-gradient(to right, transparent 24%, black 35%)`) eliminating the abrupt vertical hard cut so the sloping roofline meets the pearl background (`#f6fafa`) seamlessly.
- Section height reduced to a compact, responsive `560px` min-height on desktop (`520px` on tablet), ensuring "OUR PARTNERS" marquee remains visible without excessive vertical scrolling.
- Program subtitle ("Mentor-led preparation for future MTOs") refined to a calm, proportional 16px font (`font-size: clamp(0.92rem, 1.02vw, 1.04rem)`, normal style, `#2b555e`), removing overpowering visual competition with the main "MTO READINESS" headline.
- Program key insights designed as an aesthetic, clean, uncluttered architectural spec cluster (3 lines: `16 sessions · 1.5 hours each`, `2 industry visits`, `BDT 7,500`) anchored by slanted geometric prisms with continuous ambient gleam (`@keyframes statGleam`), zero bulky card boxes.
- Secondary CTA ("View Program") scaled to a compact, refined 36px pill button (`padding: 0.46rem 1.15rem`, `font-size: 0.84rem`) positioned cleanly below the spec cluster with generous breathing room (`margin-top: 1.85rem`).
- Urgency Countdown Clock placed directly above "Industry Mentor" inside the right dark teal stage: an aesthetic luxury capsule with ambient live pulse, Framer-Motion-style spring physics digit roll animations (`@keyframes digitSlideDown`), and clean tabular digits.
- Mentor portraits calibrated with natural visual headroom and spacing across all faculty members (Md. Manik Hossain: `scale(1.06) translateX(-2%)`, Mohammad Salekeen Ibrahim: `scale(0.95) translateX(-5%)` providing ample headroom and generous gap to the text column, Syed Himyanuddin Ahmed: `scale(1.14) translateX(-3%)`, Anubhab: `scale(1.18) translateX(-3%)`, Mir Hasib: `scale(1.02) translateX(-2%)`), all grounded at the bottom edge.
- Primary Enrollment action restored with active "Enroll Now" pill button and glowing gold "Limited Seats" badge positioned below the mentor profile.
- Auto-rotation runs uninterrupted every 3s without pausing on mouse hover, respecting `prefers-reduced-motion` and `document.hidden`.
- Unit tests (`mto-hero.test.tsx` 8/8), homepage integration tests (`page.test.tsx` 4/4), TypeScript typecheck (`0` errors) pass. All changes ready for human git review per Rule R14.

## 1. Historical Pre-Rev3.0 Phase and Task Record (Superseded by Section 0 / Rev3.0)
> *(Historical snapshot from 23 Nov 2026 preserved below; do not treat stale notes on token-cache fallback or legacy phases as current Rev3.0 requirements.)*
- **Current Phase:** Phase 10 / Payments & Enrollment Integration
- **Current Task:** Fix bKash authentication failure and resilient token caching (`task/p8-admissions-quick-add`)
- **Task Status:** Fixed bKash v2 token cache fallback (preventing 503 outage on unmigrated Supabase RPC), corrected v2 query endpoint to `/tokenized-checkout/query/payment`, added safe server-side diagnostic logging (zero secrets/PII), unmasked underlying gateway errors, normalized sandbox checkout mode in Zod schema, and verified complete flow with live sandbox integration tests (16/16 payments tests pass, 29/29 enrollment tests pass, 0 typecheck errors, next build clean).
- **Current Git Branch:** `task/p8-admissions-quick-add`
- **Base Commit:** `2d31d95` (merged PR #25)
- **Open Issues:**
  - **Supabase Token Cache Migration (Historical — Reconciled in `W0-G02`; runtime code is fail-closed `503`):** Migration `20261123110000_bkash_supabase_token_cache.sql` provides distributed token caching with `bkash_acquire_gateway_token` and `bkash_finish_gateway_token`. Production migration history was reconciled in `W0-G02`, and `createLiveBkashClientFromEnv()` strictly requires `SupabaseBkashTokenCache` (`BKASH_AUTH_CACHE_MISSING` `503` if absent).
  - **pgTAP Verification for Migration `20261110235500` on `lna-website-dev`:** Live REST/admin probes on `lna-website-dev` confirmed tables from both [`20261110161500_initial_catalog_and_enrollments.sql`](file:///d:/.internship/LNA/Website%20Development/supabase/migrations/20261110161500_initial_catalog_and_enrollments.sql) and [`20261110235500_enrollment_bkash_outbox_and_staff_profiles.sql`](file:///d:/.internship/LNA/Website%20Development/supabase/migrations/20261110235500_enrollment_bkash_outbox_and_staff_profiles.sql) (`courses`, `batches`, `mentors`, `course_mentors`, `enrollments`, `profiles`, `payment_attempts`, `payment_events`, `email_outbox`, `audit_events`) exist, while `supabase` CLI / `psql` are not installed locally so owner must confirm dev seed [`supabase/seed.sql`](file:///d:/.internship/LNA/Website%20Development/supabase/seed.sql) and run pgTAP suite [`supabase/tests/0002_enrollment_bkash_and_profiles_rls.sql`](file:///d:/.internship/LNA/Website%20Development/supabase/tests/0002_enrollment_bkash_and_profiles_rls.sql) (`58` assertions) against `lna-website-dev` only (never production).
  - **Public Signups & Live `AAL2` Superadmin Login Verification (`FR-AUT-001`..`004`):** Owner confirmed admin login works; verify `"Allow new users to sign up"` is disabled in Supabase Auth Dashboard (`GET /auth/v1/settings` previously reported `"disable_signup": false`).
  - **External Library Warning (`@supabase/auth-js@2.68.0` `_getAuthenticatorAssuranceLevel`):** Static SDK inspection (`node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1953-1981`) confirms `getAuthenticatorAssuranceLevel()` internally calls `this._useSession()` (`session.user.factors` at line 1973), emitting Supabase's server `getSession()` warning even though `src/` has zero `getSession()` calls and [`src/server/auth/require-staff.ts`](file:///d:/.internship/LNA/Website%20Development/src/server/auth/require-staff.ts) authenticates exclusively via `auth.getUser()`, authoritative `public.profiles`, `mfa.listFactors()` (`getUser()`), and `currentLevel === "aal2"` claim. Keep current SSR packages pinned per `Rule R3`.
  - **Live bKash PGW Grant Token Rejected & Infrastructure Blockers (`BKASH_CHECKOUT_MODE="closed"`):** `.env.local` now includes `PGW_Production_API_Context_Root`, `PGW_App_Key`, `PGW_App_Secret`, `BKASH_USERNAME`, `BKASH_PASSWORD`, and `BKASH_CHECKOUT_MODE=closed`. Parser parity check confirmed zero quoting/whitespace/`#` truncation in all 5 variables, yet `POST https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/token/grant` returned `HTTP 200`, `statusCode: "9999"`, `"Invalid app key and secret combination"`. Before live testing, owner must verify with bKash merchant onboarding that the production `PGW_App_Key` / `PGW_App_Secret` pair matches the production Tokenized Checkout merchant account (`BKASH_USERNAME` / `BKASH_PASSWORD`) rather than sandbox or another API product, set a public HTTPS non-localhost `APP_URL` (`https://lnabd.org` or Vercel staging domain) + `CRON_SECRET`, and confirm bKash callback URL / egress IP whitelisting. Keep `BKASH_CHECKOUT_MODE="closed"` until Token Grant and one controlled live payment pass.
  - **Postponed (Non-Blocker): Resend Transactional Email (`EMAIL_DISPATCH_MODE="disabled"`):** Intentionally disabled for v1 launch; `src/server/email/resend.ts` and `public.email_outbox` (`'pending'` queue records) stay intact for future activation without blocking enrollment, bKash verification, retries, `/status`, or Superadmin pages.
  - **Live Browser Verification Paused (`chrome_devtools` `DevToolsActivePort` ENOENT) & Playwright Not Installed (`Rule R13`):** `@axe-core/playwright` and `playwright` are not installed in `package.json`, and live Chrome DevTools inspection failed to connect because Chrome remote debugging (`chrome://inspect/#remote-debugging`) is not enabled on the host (`DevToolsActivePort` missing). Live mobile/desktop browser execution of `/courses/[slug]`, `/enroll`, `/status`, and `/admin/enrollments` (and authenticated `/admin/enrollments` session) has not been completed in Chrome yet; UI, keyboard tab/accordion navigation, URL preselection, closed-checkout gate, and form error focus were verified via DOM Vitest suites and clean production `pnpm build`.
  - **Root Causes of Remaining Pre-Existing Failing Tests (Untouched Phase 3/4 Suites):**
    1. `src/lib/content/repository.test.ts` (`4` failures): expects legacy `>= 3` demo courses/batches and removed `"executive-leadership"` course after `content/catalog/courses.json` & `batches.json` were narrowed to `mto-readiness` and `irgp`.
    2. `src/components/home/hero-slider.test.tsx` (`2` failures): omits `courses` prop when rendering `HeroSlide`, causing `getCourseMentorRoster` to fall back to canonical MTO mentor IDs instead of legacy hero test names (`Nadia Islam`, `Marcus Reed`, `Ethan Park`, etc.).
    3. `src/app/page.test.tsx` (`2` failures): asserts old `"Explore Our Courses"` heading and deleted demo courses (`"Executive Leadership & Strategic Governance"`, `"Corporate Finance & Capital Structuring"`).
    *(Note: `src/components/home/courses-section.test.tsx` (`8/8`) and `src/app/courses/[slug]/page.test.tsx` (`6/6`) are now resolved and passing.)*
  - **Other Unrelated Pre-Existing Items Outside Task Scope:** Prettier formatting warnings on untouched Phase 4 files (`content/home/mentors.json`, etc.) and `pnpm build` updating `next-env.d.ts`.
- **Next Task:** Once Chrome remote debugging is enabled (`chrome://inspect/#remote-debugging`), run live Chrome desktop/mobile verification across `/` (Mentors section), `/courses/[slug]`, `/enroll`, `/status`, and `/admin/enrollments`; owner verifies/corrects the production Tokenized Checkout `PGW_App_Key` / `PGW_App_Secret` and merchant `BKASH_USERNAME` / `BKASH_PASSWORD` combination with bKash, re-runs Grant Token verification (`BKASH_CHECKOUT_MODE="closed"`), sets public HTTPS `APP_URL` + bKash IP/callback whitelisting, runs `0002` pgTAP (`58/58`) on `lna-website-dev`, and runs one controlled live bKash payment test before opening enrollment.

---

## 2. Completed Tasks

### Public enrollment view bKash payment QR scanner

- Redesigned the desktop companion visual panel on `/enroll` to display a dedicated, large high-clarity bKash payment QR scanner card during the payment and review step (`isBkashScanStep`).
- Replaces the 4 mentor posters slider on the payment step so learners can effortlessly scan the QR code with their mobile device camera/bKash app without squinting at a small inline thumbnail.
- Displays merchant name, official bKash branding, clear merchant number (`0158 1799 666`), and exact amount due, while maintaining the fallback 4-poster slideshow on earlier steps and the confirmation photo upon completion.
- Positioned the companion panel on the left on desktop viewports (`md:order-1`, form on `md:order-2`), matching the site-wide design language across the Hero, Contact, and FAQ sections.
- Verified with targeted Vitest unit test suite (10/10 tests pass) and TypeScript check (`tsc --noEmit`, 0 errors).

### Admissions actions and student course history

- Active Admissions rows show View, Edit, Confirm when relevant, and Archive. Active Students rows show View, Edit, Courses and Archive. Archived rows offer Restore.
- Student Edit saves contact fields. Courses shows current enrollments and previous courses. Expanding a course loads its past batches. Adding a batch or choosing Batch unknown creates the record immediately. Existing history stays visible, and recording a completion date is a separate action.
- The details dialog previews the records affected by permanent deletion. A single eligible application can also remove its sole linked profile when it has no independent history, manual creation record or other admissions. Verified and unresolved real payments remain protected. The migration does not delete existing data.
- Migration `20261116180000_staff_record_workflows.sql` installs the course-history and purge-preview operations. Protected writes verify the operator and compare the confirmed preview with the current scope.
- The production build, 62 focused tests, and 352 local pgTAP assertions passed. Browser checks verified both pages and both deletion flows with fixture data at 390, 1100 and 1440 pixels. The full verify command stops at existing formatting warnings in 10 unrelated files.

### Students and Admissions workspaces

- The redesigned Students directory uses compact rows with responsive contact and course columns. Profile opens the full contact and course history. Edit, Archive, Restore, and permanent student deletion are grouped under the individual student’s actions.
- Admissions uses a matching layout and keeps search, status, and course/batch filtering. Eligible rows can be deleted on the list or detail view by typing the application ID. Protected payments offer Archive on active records. Successful deletion from the detail view returns to Admissions.
- Migration `20261116170000_staff_admission_delete.sql` adds the eligibility check and Super Admin deletion RPC. Unpaid and identifiable test applications can be deleted atomically without removing the student or related enrollments. Verified and unresolved real payments are protected. Applying the migration does not delete any records, and Admissions remains available while the migration is pending.
- The production build, lint, 62 targeted app tests, and 329 local pgTAP assertions passed. Browser checks with fixture data verified both pages at 390, 1100, and 1440 pixels, including payment review and permanent deletion. The repository-wide verify command stops at pre-existing formatting warnings in 10 unrelated files.

### Permanent student deletion

- The Students directory gives Super Admins a permanent Delete action on active and archived profiles. The dialog requires the student's current email address and the database checks the profile revision.
- Migration `20261116160000_staff_student_purge.sql` removes the profile, contact history, completions, and eligible enrollments and outbox records in one transaction. Identified mock payment attempts, related events and test amounts are removed from operational data. Deleting an occupied enrollment automatically releases its place. The schema has no independent student balance.
- Real or potentially real payment records are protected. The operation keeps an audit entry with the staff actor and time without student identifiers. Applying the migration does not delete existing data.
- The Next.js configuration uses the default Turbopack runtime, and the root layout declares the existing smooth scrolling behavior for route transitions.
- The production build, typecheck, lint, 41 focused Vitest tests, and 311 local pgTAP assertions passed. Browser checks at 390 and 1440 pixels covered cancellation, email confirmation, and preservation of protected payment records. The aggregate check still stops at existing formatting issues in unrelated files.

### Admissions list redesign (`task/p8-admissions-redesign`)

- Admissions uses one responsive list. Applicant names open record details, payment confirmation remains visible when required, and each row has a More actions menu.
- The archived list offers permanent deletion for unused development fixtures. The database checks the active Super Admin, current record revision, application reference and deletion eligibility before writing an audit event. Live applications, confirmed enrollments, payment links, seat holds, student links and outbox records stay protected.
- Apply `20261116153000_admissions_fixture_cleanup.sql` to enable permanent fixture deletion. The migration installs the checks and does not delete any records when applied.
- The rollout fix loads the Admissions list independently of fixture eligibility. Archived fixtures can be restored while the migration is pending. Fixture deletion appears after Supabase exposes a positive eligibility result.
- The production build, 56 focused Admissions and service tests, typecheck and 291 local pgTAP assertions passed. A browser fixture verified the list at 390 and 1440 pixels, payment review, protected archive actions and typed confirmation for eligible fixture deletion. Smoke-test the archived view on the linked development project after applying the migration.

### Mentor editor cleanup (`task/p8-mentor-editor-cleanup`)

- The mentor editor groups profile details and images separately, shows current thumbnails, and keeps Save and Cancel visible as the form scrolls.
- Migration `20261116150000_remove_goyara_from_mir_hasib.sql` removes Goyara from the career history and clears any matching selected logo for the `mentor-mir-hasib` record. The local mentor data carries the same correction.
- Mentor saves now distinguish missing database setup, rejected fields, and missing records. Server logs record the operation and database error code.
- The targeted mentor tests and 276 pgTAP assertions pass locally. Apply the migration on the linked development database and confirm Mir Hasib’s public profile and save flow there.

### Live mentor editing (`task/p8-live-mentor-preview`)

- The mentor editor uses the public carousel card and the details shown by its Info button. Expertise is prefilled and entered as separate lines or comma-separated tags. LinkedIn, biographical text and selected images update the local preview before saving.
- The homepage and course details read published mentor records from Supabase when configured. Save updates the public record for an already published mentor. New profiles start as drafts and can be made visible using Show on the website.
- Portraits and company logos can use existing assets or uploads. Uploads are resized in the browser and validated again by the server. The private Storage bucket serves files only when the mentor is published or the request has verified staff access.
- The production build, targeted lint, mentor and course tests, and 273 local pgTAP assertions passed. Storage behavior was tested with local fixtures and awaits a smoke test on the linked Supabase project.
- Apply `20261116140000_staff_live_mentor_profiles.sql` after the people directories migration. The migration adds the private bucket and a backward-compatible service-only save RPC. Run an authenticated upload check on the linked development project before production rollout.

### Staff people directories and catalog cards (`task/p8-people-directories`)

- Added dedicated Mentors and Students pages with search, profile dialogs, edit, archive and restore. Mentor editors preview the card while typing and can select images from existing website assets.
- Batch mentor cards show portraits and company marks. Confirming an assignment shows the exact course and cohort and keeps the current roster. The course and batch lists now open read-only cards for draft and published records.
- Admissions uses a compact desktop header and filter toolbar. Staff portal surfaces and status accents use the existing design tokens.
- Migration `20261116050000_staff_people_directories.sql` backfills confirmed non-fixture enrollments. Future confirmations link to the directory, and prior course completions can be recorded independently of payment and capacity. See ADR 0015.
- Local verification passed for the production build, 105 focused app tests, 263 pgTAP assertions, the existing-enrollment backfill and mobile and desktop browser checks. Repository-wide checks still report the eight pre-existing unit-test failures and twelve existing formatting warnings.
- Next step is to apply this migration on `lna-website-dev` and verify staff access with a real Super Admin session there. Mentor media currently uses existing site assets. These assignment and preview controls are in the staff portal.

### Admissions and catalog workspace (`task/p8-admissions-workspace`)

- Admissions now offers a payment confirmation dialog, contact editing, and reversible Archive and Restore. The default Applications list shows current records. Status filters and searches still expose expired or cancelled history.
- The database enforces one active record per batch for each email or phone number. Legacy shared phones are flagged for staff correction without changing enrollment or payment state.
- Batches can be filtered by course and link back to their course. The editor supports an ordered batch mentor roster with course roster inheritance. Course and batch archive actions preserve links and related records.
- Migration `20261116040000_admissions_workspace.sql` adds the staff RPCs and batch mentor records. See ADR 0014 and pgTAP suite `0008_admissions_workspace.sql`.
- The production build, lint, typecheck, 102 focused tests, 244 pgTAP assertions, and a legacy shared-phone migration check passed. The local browser fixture passed Confirm and Cancel on desktop and mobile, approval, editing, archive and restore. Axe found no violations in the confirmation dialog. Eight existing tests still fail and repo-wide formatting flags twelve unrelated files.

### Staff review of manual admission payments (`task/p8-manual-payment-review`)

- Paid Add student submissions record a bKash transaction ID or a bank reference. An active Super Admin with TOTP reviews the transfer using the receiving account and the saved fee.
- Pending reviews reserve no seats. Approval checks capacity and reference reuse, records the reviewer, and queues confirmation in one database transaction. Rejection cancels the application and retains its audit record.
- The staff flow uses `20261116030000_staff_manual_payment_review.sql`. Run a fresh save and review against the linked development project after applying it. The local suite uses fixture payments.
- Local verification passed for the production build, 104 focused application tests, and all 209 pgTAP assertions. The browser fixture passed bank submission, amount mismatch and retry, approval, and Axe checks at 390 and 1440 pixels. The full test suite still reports the eight baseline failures. Repository-wide formatting flags twelve files outside this patch.
- Public bKash checkout uses the gateway validation path. Older checkout reservations use their existing lifecycle.

### Add student from Overview (`task/p8-admissions-quick-add`)

- **Scope:** Overview and Admissions share an Add student shortcut. The protected form lists published courses with batches currently open for enrollment. A batch roster link prefills the course and batch. Changing courses preserves the student’s contact details and clears the previous course’s answers.
- **Save handling:** The server action distinguishes missing RPC deployment from database permission failures. Unexpected failures produce a server-side error code without logging the submitted student or database response. The form preserves text and required choices after a failed save so staff can retry. The owner's captured request reached the server, but lacked the database response needed to identify the live failure.
- **Deployment:** Uses the manual admissions migration `20261116020000_admin_manual_admissions.sql`. Verify that migration on the linked development project and retry there. No schema migration is part of this follow-up patch.
- **Verification:** Production build, TypeScript, targeted ESLint and formatting, 87 focused Vitest tests, and 176 local pgTAP checks passed. Chromium with a local Supabase fixture verified Overview entry, course switching, closed-batch filtering, fee display, retry without re-entry, duplicate handling, and roster preselection. Axe reported no violations at 390 and 1440 CSS pixels. The development database still needs a live save check.
- **Next task:** Add the mentor directory with a public card preview.

### Manual student entry (`task/p8-manual-admissions`)

- **Base:** Apply the CMS navigation and Admissions views patches first. The common GitHub base is `33ca267`.
- **Scope:** A verified Super Admin can add a student from a selected open batch. The form shows the saved fee and collects the same course-specific answers as public intake. Duplicate submissions link to the existing enrollment.
- **Persistence:** `20261116020000_admin_manual_admissions.sql` adds a service-role RPC. It checks the batch revision and availability under lock, counts historical enrollment and active holds, and records the staff action in the same transaction. Free registration uses the existing confirmation workflow. Paid entry remains pending with the normal temporary hold and no gateway attempt until checkout.
- **Verification:** TypeScript, ESLint, targeted Prettier, production build, content/token checks, 82 targeted Vitest tests, and 176 local pgTAP assertions passed. Chromium checks with a simulated Supabase connection verified guest redirection, the displayed fee, duplicate recovery, and no Axe violations at 390px and 1440px. The full Vitest run reproduces the eight existing failures on the previous Admissions baseline. Repo-wide Prettier reports 14 existing warnings.
- **Deployment:** Apply the migration to the linked development project before using Add student there. Live Supabase and payment verification were not run. Commit pending owner review.
- **Next task:** Build the mentor directory and course mentor assignment workflow.

### Read-only Admissions views (`task/p8-admissions-views`)

- **Base:** Apply the CMS navigation patch before this patch. Both use GitHub `main` at `33ca267` as their common base.
- **Scope:** Admissions now has Applications and Enrolled students views. Applications keeps the existing lifecycle status filter. Enrolled students reads confirmed enrollment records. Both views support course and batch filters, search, and pagination. Batch choices include past cohorts and show catalog status.
- **Implementation:** Reused the protected Admissions route and catalog links. Server-side query validation checks the course and batch IDs, rejects a mismatched pair, and applies the selected scope to the enrollment query. The existing View students link opens the confirmed roster.
- **Verification:** 76 targeted Vitest tests passed. TypeScript, targeted ESLint and Prettier, design-token, content, and traceability checks, and the production build passed. The live staff workflow still needs an environment check.
- **Commit:** Pending owner review. No database migration is required.
- **Next task:** Add manual enrollment using the same course and batch roster.


### Course workspace navigation and batch roster links (`task/p8-cms-navigation`)

- **Base:** GitHub `main` at `33ca267` (merged PR #26).
- **Scope:** Overview links to Admissions and Courses. The sidebar shows those three working destinations. Courses links to its filtered batch list, and a batch links to its confirmed student roster. The all-batches and all-enrollments routes remain directly accessible.
- **Implementation:** Updated the existing admin shell, Overview, catalog list and create page, and Admissions list. Course and batch context is resolved on the server with existing permissions and validated IDs. The course and batch filters survive search and pagination. A batch link works for previous cohorts and a new batch form preselects the course if it is available for creation.
- **Verification:** `vitest run --maxWorkers=4 --minWorkers=1 src/app/admin src/components/admin src/server/enrollment/service.test.ts src/server/auth/require-staff.test.ts` passed (73 tests), along with `tsc --noEmit`, targeted ESLint and Prettier, design-token, content, and traceability checks, and `next build`.
- **Commit:** Pending owner review. The patch fits the existing schema. Live staff/browser verification is pending.
- **Next task:** Add Admissions views for applications and enrolled students, with course and batch selectors. Manual enrollment follows the read-only workflow.


### Edit existing courses and batches (`task/p8-catalog-edit`)

- **Scope:** Super Admins can edit course title, subtitle, category, summary, description and venue, and batch name, dates, schedule, venue, capacity and BDT fees. Edits use the Supabase catalog. The public homepage still reads its JSON catalog.
- **Implementation:** Catalog edit forms and protected server action call `supabase/migrations/20261112100000_admin_catalog_edit.sql`. The RPC checks the actor and record revision, locks the record, enforces the batch seat floor and commits the update and audit entry together.
- **Verification:** Production build, lint, content validation, 34 focused tests, and 11 catalog pgTAP assertions passed. Database tests used a local PGlite Supabase fixture. Fixture Chromium saves passed on both forms and axe reported zero violations at 390 and 1440 CSS pixels. Full Vitest reproduced the same eight existing failures in the prior catalog baseline. Repository formatting flagged 14 files outside the patch.
- **Deployment:** Apply the catalog edit migration to the target Supabase project before trying a save. Record creation, publishing controls and the homepage catalog switch are pending.

### Staff course and batch inventory (`task/p8-catalog-inventory`)

- **Scope:** Staff can search and filter Supabase course and batch records, including draft and archived statuses. Batch cards show course, dates, venue, capacity, list fee, and discounted fee when present.
- **Files:** `src/app/admin/catalog/[section]/page.tsx`, `src/server/admin/catalog.ts`, `src/lib/admin-catalog.ts`, sidebar link configuration, and affected tests.
- **Access:** Both views use the existing Super Admin session and MFA guard. Catalog reads run on the server.
- **Verification:** TypeScript, targeted ESLint, and 22 admin tests passed. Local Chromium with fixture staff and catalog data verified guest redirect, filter submission, Reset, and both views at 390 and 1440 CSS pixels. Axe reported zero violations in those four views.
- **Next:** Implement the catalog authoring workflow with validated mutations, publishing, and audit events.

### Admin portal navigation (`task/p8-admin-sidebar`)

- **Scope:** Added a staff-only `/admin` Overview and a shared navigation shell for Overview, Admissions, and application details. The desktop sidebar and mobile drawer use the same menu. The active destination is marked, and the drawer supports keyboard dismissal and focus return.
- **Files:** `src/lib/admin-navigation.ts` holds the navigation structure and copy. `src/components/admin/admin-portal-shell.tsx` replaces the previous admin header. The Overview and two enrollment views use the shared shell.
- **Verification:** On base `2d31d95`, TypeScript, targeted ESLint, and all 18 admin tests passed, including the latest Admissions filter and Reset tests. The sidebar's earlier local Chromium audit used a staff fixture and found zero axe violations on desktop Overview and Admissions, mobile Overview, and the open drawer.
- **Next:** Add Website Builder, Finance, Emails, and Reports links when their protected pages are ready.

### Navbar & Favicon Complete Official Logo Lockup (`task/enrollment-bkash-superadmin`)
- **SRS IDs Covered:** FR-PUB-001, FR-PUB-002, NFR-A11Y-01, NFR-CMP-01, Rule R2, Rule R3, Rule R4, Rule R7, Rule R11, Rule R12, Rule R14, Rule R19
- **Deliverables:**
  - Verified [`public/images/brand/logo.png`](file:///d:/.internship/LNA/Website%20Development/public/images/brand/logo.png) (`406x425`, `0` ARGB pixel diffs) matches the owner-provided full official logo lockup (circular crest + `"LEAD NATION ACADEMY"` + bottom horizontal rules & briefcase `— • [bag] • —`).
  - Regenerated complete-logo favicons and square app icons directly from the full logo PNG without cropping text or the bottom briefcase emblem: multi-resolution [`public/favicon.ico`](file:///d:/.internship/LNA/Website%20Development/public/favicon.ico) (`16x16`, `32x32`, `48x48` PNG-in-ICO frames on `#FFFFFF` rounded-square badge), [`public/favicon.png`](file:///d:/.internship/LNA/Website%20Development/public/favicon.png) (`48x48`), [`src/app/icon.png`](file:///d:/.internship/LNA/Website%20Development/src/app/icon.png) (`96x96`), opaque [`src/app/apple-icon.png`](file:///d:/.internship/LNA/Website%20Development/src/app/apple-icon.png) (`180x180`), and [`public/images/brand/logo-square.png`](file:///d:/.internship/LNA/Website%20Development/public/images/brand/logo-square.png) (`512x512`).
  - Updated [`BrandLogo` (`DemoLogo`)](file:///d:/.internship/LNA/Website%20Development/src/components/ui/demo-logo.tsx) to default `variant = "full"` with proportioned dimensions (`sm: h-[52px]`, `md: h-[54px] sm:h-[68px]`, `lg: h-20 sm:h-24`), explicit `406x425` intrinsic size, and `shrink-0`.
  - Switched [`SiteHeader`](file:///d:/.internship/LNA/Website%20Development/src/components/public/site-header.tsx) and [`MobileNav`](file:///d:/.internship/LNA/Website%20Development/src/components/public/mobile-nav.tsx) to `variant="full"` with `organization.name` while preserving sticky header height (`h-16 sm:h-20`), anchor `scroll-mt` offsets, and `<Link aria-label>` semantics; updated [`src/app/layout.tsx`](file:///d:/.internship/LNA/Website%20Development/src/app/layout.tsx) `metadata.icons` (`?v=2` cache-busting).
  - Updated [`site-header.test.tsx`](file:///d:/.internship/LNA/Website%20Development/src/components/public/site-header.test.tsx) and [`mobile-nav.test.tsx`](file:///d:/.internship/LNA/Website%20Development/src/components/public/mobile-nav.test.tsx) to assert `/images/brand/logo.png` (and never cropped `/images/brand/logo-crest.png`).
- **Verification:**
  - Visually inspected all generated icon PNGs (`public/favicon.png`, `src/app/icon.png`, `src/app/apple-icon.png`, `public/images/brand/logo-square.png`) and verified `public/favicon.ico` parses cleanly.
  - `pnpm exec prettier --check`, `pnpm exec eslint --max-warnings=0`, `pnpm typecheck`, `node scripts/check-traceability.mjs`: PASS (`0` errors, `0` warnings).
  - Affected Vitest suites (`site-header`, `mobile-nav`, `public-shell`, `site-footer`, `mentors-section`): PASS (`5/5` files, `24/24` tests).

### News Catalog Cleanup: Remove Community Article & Empty `Community` / `Invitations` Filters (`task/enrollment-bkash-superadmin`)
- **SRS IDs Covered:** FR-PUB-001, NFR-A11Y-01, Rule R2, Rule R4, Rule R7, Rule R11, Rule R12, Rule R13, Rule R14, Rule R19
- **Deliverables:**
  - Removed `"news-connecting-learning-with-industry"` (`"Connecting learning with industry"`, `"Community"`) from [`content/news/articles.json`](file:///d:/.internship/LNA/Website%20Development/content/news/articles.json), leaving 3 active articles (`2` Partnerships, `1` Program updates).
  - Removed `"Invitations"` and `"Community"` from `NEWS_CATEGORIES` and `NewsArticleSchema.category` in [`src/lib/content/news.ts`](file:///d:/.internship/LNA/Website%20Development/src/lib/content/news.ts) and [`scripts/validate-content.mjs`](file:///d:/.internship/LNA/Website%20Development/scripts/validate-content.mjs).
  - Updated [`src/app/news/news-archive-view.tsx`](file:///d:/.internship/LNA/Website%20Development/src/app/news/news-archive-view.tsx), [`src/app/news/page.tsx`](file:///d:/.internship/LNA/Website%20Development/src/app/news/page.tsx), and [`content/site/navigation.json`](file:///d:/.internship/LNA/Website%20Development/content/site/navigation.json) copy (`"Partnerships, program updates, and moments..."`), added `aria-pressed` filter state, and added URL query fallback so removed `?category=Community`/`?category=Invitations` queries resolve to `All updates`.
  - Added [`src/app/news/news-archive-view.test.tsx`](file:///d:/.internship/LNA/Website%20Development/src/app/news/news-archive-view.test.tsx).
- **Verification:**
  - `pnpm content:validate`, `pnpm exec prettier --check`, `pnpm exec eslint --max-warnings=0`, `pnpm typecheck`, `node scripts/check-traceability.mjs`: PASS.
  - `pnpm exec vitest run src/app/news/news-archive-view.test.tsx src/lib/content/navigation.test.ts`: PASS (`2/2` files, `7/7` tests).
  - Live `http://localhost:3000/news` & `/news/connecting-learning-with-industry` probe: `/news` HTTP `200` (renders `All updates`, `Partnerships`, `Program updates` only; zero `Connecting learning with industry`/`Invitations`/`Community`); removed article slug returns HTTP `404`.

### Content Repository Dev Cache Fix (Stale `Tejgaon` on Long-Running `next dev`) (`task/enrollment-bkash-superadmin`)
- **SRS IDs Covered:** FR-PUB-007, FR-OTH-006, Rule R2, Rule R4, Rule R6, Rule R7, Rule R11, Rule R12, Rule R14, Rule R19
- **Root Cause & Deliverables:**
  - `getOrganizationConfig()` ([`src/lib/content/organization.ts`](file:///d:/.internship/LNA/Website%20Development/src/lib/content/organization.ts)), `getNavigationConfig()` ([`src/lib/content/navigation.ts`](file:///d:/.internship/LNA/Website%20Development/src/lib/content/navigation.ts)), `getBrandConfig()` ([`src/lib/content/brand.ts`](file:///d:/.internship/LNA/Website%20Development/src/lib/content/brand.ts)), and `JsonContentRepository` ([`src/lib/content/repository.ts`](file:///d:/.internship/LNA/Website%20Development/src/lib/content/repository.ts)) cached parsed `content/*.json` files in module-level memory without checking `NODE_ENV === "development"`, causing the running `next dev` process (started before the Banani update) to keep serving `Plot 06, Tejgaon Industrial Area` (`1208`) and `+880 1581-799666`.
  - Updated all four content loaders to bypass in-memory singleton caching when `process.env.NODE_ENV === "development"` (retaining caching in production/test) and added a regression test in [`src/lib/content/navigation.test.ts`](file:///d:/.internship/LNA/Website%20Development/src/lib/content/navigation.test.ts).
- **Verification (Run Locally Against Live Dev Server & Test Suite):**
  - `pnpm exec prettier --check`, `pnpm exec eslint --max-warnings=0`, and `pnpm typecheck`: PASS (`0` errors, `0` warnings).
  - Live `http://localhost:3000` HTTP probe across `/`, `/about`, `/courses/mto-readiness`, `/courses/irgp`, `/enroll`, `/status`, `/news`, `/privacy`, `/terms`, `/refund-policy`: PASS (`Banani` and `Level-5` rendered across pages; zero occurrences of `Tejga`/`Plot 06`/`1208`/`1581-799666`/`Dhanmondi`).
  - Affected Vitest suites (`navigation.test.ts`, `brand.test.ts`, `contact-section.test.tsx`, `site-footer.test.tsx`, `mobile-nav.test.tsx`, `public-shell.test.tsx`): PASS.

### Homepage Mentors Section Carousel 2-Second Cycle Update (`task/enrollment-bkash-superadmin`)
- **SRS IDs Covered:** FR-PUB-002, NFR-A11Y-01, Rule R2, Rule R7, Rule R11, Rule R12, Rule R14, Rule R19
- **Deliverables:**
  - Updated [`src/components/home/mentor-carousel.tsx`](file:///d:/.internship/LNA/Website%20Development/src/components/home/mentor-carousel.tsx) (`CARD_TRANSITION_MS = 750`, `DEFAULT_AUTOPLAY_INTERVAL_MS = 2000`, `autoplayIntervalMs = 2000`) so each carousel advance triggers on a **2-second** cycle (`750ms` transition + `1250ms` post-transition stationary hold), replacing the prior `750ms + 4000ms` (`4.75s`) schedule while leaving hover/focus/search/modal pause and approved UI styling untouched.
  - Updated fake-timer intervals and boundary assertions in [`src/components/home/mentors-section.test.tsx`](file:///d:/.internship/LNA/Website%20Development/src/components/home/mentors-section.test.tsx).
- **Verification (Level 1 per ADR 0010):**
  - `pnpm exec prettier --check src/components/home/mentor-carousel.tsx src/components/home/mentors-section.test.tsx`: PASS.
  - `pnpm exec eslint --max-warnings=0 src/components/home/mentor-carousel.tsx src/components/home/mentors-section.test.tsx`: PASS (`0` errors, `0` warnings).
  - `pnpm typecheck`: PASS (`0` errors).
  - `pnpm exec vitest run src/components/home/mentors-section.test.tsx`: PASS (`1/1` file, `14/14` tests).
  - Not run (per Level 1 scope & DevTools host block): full `pnpm build`, full Vitest suite, live Chrome visual check (`DevToolsActivePort` ENOENT).

### Official Address & Contact Number Update + Stale Campus Reference Cleanup (`task/enrollment-bkash-superadmin`)
- **SRS IDs Covered:** FR-PUB-007, FR-OTH-006, FR-CRS-004, FR-CRS-005, Rule R2, Rule R4, Rule R7, Rule R11, Rule R12, Rule R15, Rule R17, Rule R19
- **Deliverables:**
  1. *Official Banani Address & Visible Contact Phone ([`content/site/organization.json`](file:///d:/.internship/LNA/Website%20Development/content/site/organization.json), [`content/home/contact.json`](file:///d:/.internship/LNA/Website%20Development/content/home/contact.json), [`content/site/navigation.json`](file:///d:/.internship/LNA/Website%20Development/content/site/navigation.json)):*
     - Updated organization & Contact Us address to `Level-5, House-57, Road No. 11, Banani, Dhaka 1213, Bangladesh` and official single contact phone to `+880 1326-760702` (`tel:+8801326760702`), setting `visibility.showPhone: true` and recording Class A owner verification (`2026-11-11`). Left manual bKash `merchantNumber` untouched per owner direction (`Rule R17`).
  2. *Repository-Driven Footer, Mobile Nav & Legal Pages (`Rule R4`, [`src/components/public/site-footer.tsx`](file:///d:/.internship/LNA/Website%20Development/src/components/public/site-footer.tsx), [`src/components/public/mobile-nav.tsx`](file:///d:/.internship/LNA/Website%20Development/src/components/public/mobile-nav.tsx), [`src/app/privacy/page.tsx`](file:///d:/.internship/LNA/Website%20Development/src/app/privacy/page.tsx), [`src/app/terms/page.tsx`](file:///d:/.internship/LNA/Website%20Development/src/app/terms/page.tsx)):*
     - Replaced hardcoded `Plot 06, Tejgaon Industrial Area`, `Dhanmondi, Dhaka`, `+880 1581-799666`, and secondary `+880 1857-887968` with `getOrganizationConfig()` (`organization` prop in `SiteFooter`), rendering clickable `tel:` phone links and Banani address dynamically.
     - Adjusted [`src/components/home/contact-info.tsx`](file:///d:/.internship/LNA/Website%20Development/src/components/home/contact-info.tsx) responsive grid (`sm:grid-cols-2 xl:grid-cols-1`) to keep 4 visible channels (Email, Address, Hours, Phone) balanced without orphans.
  3. *Accurate Venue Copy & Dev Fixture Alignment (`Rule R15`, [`content/catalog/courses.json`](file:///d:/.internship/LNA/Website%20Development/content/catalog/courses.json), [`content/catalog/batches.json`](file:///d:/.internship/LNA/Website%20Development/content/catalog/batches.json), [`content/home/events.json`](file:///d:/.internship/LNA/Website%20Development/content/home/events.json), [`content/home/impact-figures.json`](file:///d:/.internship/LNA/Website%20Development/content/home/impact-figures.json), [`src/app/page.tsx`](file:///d:/.internship/LNA/Website%20Development/src/app/page.tsx), [`src/app/refund-policy/page.tsx`](file:///d:/.internship/LNA/Website%20Development/src/app/refund-policy/page.tsx), [`src/components/home/course-details-modal.tsx`](file:///d:/.internship/LNA/Website%20Development/src/components/home/course-details-modal.tsx), [`src/components/home/events-section.tsx`](file:///d:/.internship/LNA/Website%20Development/src/components/home/events-section.tsx), [`supabase/seed.sql`](file:///d:/.internship/LNA/Website%20Development/supabase/seed.sql)):*
     - Removed invented/stale `LNA Executive Campus, Dhanmondi` venue claims (no current fixed campus venue per owner), using `Designated Executive Venue, Dhaka` for active MTO/demo events, restoring historical `AIUB – Institute of Continuing Education (ICE), Banani, Dhaka` for `batch-irgp-cohort-1`, syncing `lna-website-dev` `is_dev_fixture` catalog rows to match, and binding modal/events components to `course.venue`/`batch.venue`/`event.venue`.
  4. *Test Coverage:* Updated [`src/lib/content/navigation.test.ts`](file:///d:/.internship/LNA/Website%20Development/src/lib/content/navigation.test.ts), [`src/components/home/contact-section.test.tsx`](file:///d:/.internship/LNA/Website%20Development/src/components/home/contact-section.test.tsx), [`src/components/public/site-footer.test.tsx`](file:///d:/.internship/LNA/Website%20Development/src/components/public/site-footer.test.tsx) (incl. Privacy, Terms, and Refund Policy renders), [`src/components/public/mobile-nav.test.tsx`](file:///d:/.internship/LNA/Website%20Development/src/components/public/mobile-nav.test.tsx), [`src/components/home/courses-section.test.tsx`](file:///d:/.internship/LNA/Website%20Development/src/components/home/courses-section.test.tsx), and [`src/app/courses/[slug]/page.test.tsx`](file:///d:/.internship/LNA/Website%20Development/src/app/courses/[slug]/page.test.tsx).
- **Verification (Run Locally After Final Edits):**
  - `pnpm content:validate`, `pnpm tokens:check`, `node scripts/check-traceability.mjs`: PASS.
  - `pnpm exec prettier --check` & `pnpm exec eslint --max-warnings=0` on all edited source/content/test files: PASS (`0` errors, `0` warnings).
  - `pnpm typecheck`: PASS (`0` errors).
  - Affected Vitest suites (`9` files: `navigation`, `site-footer` + Privacy/Terms/Refund, `courses-section`, `site-header`, `contact-section`, `mobile-nav`, `public-shell`, `courses/[slug]/page`, `enrollment-view`): PASS (`9/9` files, `40/40` tests).
  - `pnpm build`: clean Turbopack production build.
  - Repo-wide scan across `content/`, `src/`, `supabase/`: zero remaining production occurrences of `Plot 06`, `Tejgaon`, `1208`, `1581-799666`, `1857-887968`, `Dhanmondi`, or `LNA Executive Campus`.

### Homepage Mentors Section Sorting, Dynamic Categories & Card `Info` Button Fix (Preserving Approved Custom Design) (`task/enrollment-bkash-superadmin`)
- **SRS IDs Covered:** FR-PUB-002, NFR-A11Y-01, Rule R1–R8, Rule R11–R16, Rule R19
- **Deliverables:**
  1. *Dynamic Category Derivation & Multi-Mode Sorting ([`src/lib/mentors.ts`](file:///d:/.internship/LNA/Website%20Development/src/lib/mentors.ts)):*
     - Kept dynamic `getMentorCategoriesWithCounts(mentors)` so zero-count placeholder tabs (`0`) never appear, plus `normalizeOrganizationGroupKey()`, `sortMentors()` (`featured` org-diverse round-robin interleaving, `order` Program Order, `name-asc`, `org-asc`), and `filterMentors()`.
  2. *Restored Approved Custom 5-Card 3D Carousel + `Info` Button ([`src/components/home/mentor-carousel.tsx`](file:///d:/.internship/LNA/Website%20Development/src/components/home/mentor-carousel.tsx)):*
     - Restored the approved 5-card layered 3D carousel deck, typography, `#FAF9F6` card base, official company logos, 2s autoplay cycle (`4s` previously), and Prev/dots/Next/`03 / 15 Mentors` bottom controls, replacing only the top-right ambiguous `+` icon button with an explicit frosted **`Info`** button (`View mentor info for ...`).
  3. *Restored Approved Two-Tone Pearl/Teal Section Layout + Dynamic Categories & Sort Pill ([`src/components/home/mentors-section.tsx`](file:///d:/.internship/LNA/Website%20Development/src/components/home/mentors-section.tsx)):*
     - Restored the approved two-tone SVG sweeping curve background, editorial left column (`Our Mentors` / `Meet Our Mentors` / 3 highlights / `Find a Mentor →`), and pill bar UI, swapping the broken hardcoded 0-count list for dynamic non-zero category tabs + a matching pill Sort selector (`Featured`, `Program Order`, `Name (A-Z)`, `Company (A-Z)`).
  4. *Restored Approved Quick-View Modal ([`src/components/home/mentor-quick-view-modal.tsx`](file:///d:/.internship/LNA/Website%20Development/src/components/home/mentor-quick-view-modal.tsx)):*
     - Restored the approved `#FAF9F6` cream modal design while keeping `isConnected` focus restoration and omitting invented fallback expertise tags (`Rule R15`).
  5. *Updated Test Suite ([`src/components/home/mentors-section.test.tsx`](file:///d:/.internship/LNA/Website%20Development/src/components/home/mentors-section.test.tsx)):*
     - All `14` tests covering dynamic non-zero categories, `Featured` / `Program Order` / `Name (A-Z)` / `Company (A-Z)` sorting, explicit `Info` buttons, 5-card 3D carousel controls/autoplay/keyboard/pause-on-modal, centered modal across `390–2560px`, and official LNA company marks.
- **Verification (Run Locally After Final Edits):**
  - `pnpm exec prettier --write` / `--check` & `pnpm exec eslint --max-warnings=0` on all 5 mentor files: PASS (`0` errors, `0` warnings).
  - `pnpm typecheck`: PASS (`0` errors).
  - `pnpm content:validate` & `pnpm tokens:check`: PASS.
  - `pnpm exec vitest run src/components/home/mentors-section.test.tsx src/components/home/courses-section.test.tsx src/app/mentors/[slug]/page.test.tsx`: PASS (`3/3` files, `24/24` tests; `mentors-section.test.tsx` `14/14`, `courses-section.test.tsx` `8/8`, `mentors/[slug]/page.test.tsx` `2/2`).
  - `pnpm build`: clean Turbopack production build.
  - **Not Run (Blocked):** Live Chrome desktop/mobile visual & axe verification (`DevToolsActivePort` ENOENT — Chrome remote debugging not enabled).

### Launch-Critical UI & Availability Fixes (`/courses/[slug]`, `/enroll`, `/status`, `/admin/enrollments`) & Cohort Seat Pill Fix (`task/enrollment-bkash-superadmin`)
- **SRS IDs Covered:** FR-CRS-005, FR-PAY-002, FR-ENR-001, FR-ENR-004, FR-ADM-001, NFR-A11Y-01, Rule R1–R8, Rule R11–R16, Rule R19
- **Deliverables:**
  1. *Shared Integer-Poisha Fee & Availability Helpers ([`src/lib/content/batches.ts`](file:///d:/.internship/LNA/Website%20Development/src/lib/content/batches.ts)):*
     - Exported `getBatchPayablePoisha()`, `hasBatchDiscount()`, `getBatchRemainingSeats()`, and `canBatchAcceptApplications()` in a client-safe module (no `node:fs` import) reused by [`CourseDetailPage`](file:///d:/.internship/LNA/Website%20Development/src/app/courses/[slug]/page.tsx), [`CourseDetailView`](file:///d:/.internship/LNA/Website%20Development/src/app/courses/[slug]/course-detail-view.tsx), and [`EnrollmentView`](file:///d:/.internship/LNA/Website%20Development/src/app/enroll/enrollment-view.tsx).
  2. *Course Details Availability & Discount Parity ([`src/app/courses/[slug]/page.tsx`](file:///d:/.internship/LNA/Website%20Development/src/app/courses/[slug]/page.tsx), [`src/app/courses/[slug]/course-detail-view.tsx`](file:///d:/.internship/LNA/Website%20Development/src/app/courses/[slug]/course-detail-view.tsx)):*
     - Enabled `force-dynamic`, reused `getPublicCatalogFromSupabase()` + `getEnrollmentRuntimeConfig()`, aligned fee display to integer poisha discounts (`discountFeePoisha ?? feePoisha`), removed hardcoded `750000` fallback, rendered active `Enroll` links only when `submissionEnabled && canBatchAcceptApplications(batch)`, removed nested `<Link><Button>` markup and unreachable static dialog, fixed unused `orgDisplay` lint warning, and added roving `tabIndex` + arrow/Home/End keyboard nav and unclipped accordion focus styles.
  3. *Public Seat-Count Removal Across Cohort UI ([`src/components/home/course-card.tsx`](file:///d:/.internship/LNA/Website%20Development/src/components/home/course-card.tsx), [`src/app/courses/[slug]/course-detail-view.tsx`](file:///d:/.internship/LNA/Website%20Development/src/app/courses/[slug]/course-detail-view.tsx), [`src/app/enroll/enrollment-view.tsx`](file:///d:/.internship/LNA/Website%20Development/src/app/enroll/enrollment-view.tsx)):*
     - Replaced `Open · {N} seats left` on `CourseCard` with `Open · Cohort {N}` (e.g., `Open · Cohort 1`), replaced `{remainingSeats} seats left` on `CourseDetailView` with `Cohort {N}`, and replaced `{N} seats left` on `EnrollmentView` with `Open for enrollment` (or `Batch full` when full), eliminating unverified seat-count numbers from public UI while preserving internal capacity gating (`Rule R15`).
  4. *Closed-Enrollment Gate, URL Single-Apply & Form Error Focus ([`src/app/enroll/enrollment-view.tsx`](file:///d:/.internship/LNA/Website%20Development/src/app/enroll/enrollment-view.tsx), [`src/app/status/status-lookup-view.tsx`](file:///d:/.internship/LNA/Website%20Development/src/app/status/status-lookup-view.tsx)):*
     - Shown `Online enrollment is coming soon` notice and `/status` link before asking for any personal details (`Full name`, `Email`, `WhatsApp`) when closed, applied `?course=`/`?batch=` at most once without overwriting subsequent learner changes, cleared stale contact input on radio switch in `/status`, and added accessible error summaries + focus movement to the first invalid control.
  5. *Controlled Search & Working `Reset` ([`src/app/admin/enrollments/admin-enrollments-view.tsx`](file:///d:/.internship/LNA/Website%20Development/src/app/admin/enrollments/admin-enrollments-view.tsx)):*
     - Replaced uncontrolled `defaultValue` inputs + passive `<Link>` Reset with controlled React state synchronized with URL props and `useRouter().push("/admin/enrollments")` so `Reset` clears visible controls immediately and restores unfiltered results; updated table/card breakpoints to `lg:` and fixed contrast/`aria-disabled`/link accessibility.
- **Verification (Run Locally After Final Edits):**
  - `pnpm exec eslint --max-warnings=0` on all 12 edited source/test files: PASS (`0` errors, `0` warnings).
  - `pnpm typecheck`: PASS (`0` errors).
  - `pnpm exec prettier --check` on edited files: PASS.
  - `pnpm content:validate` & `pnpm tokens:check`: PASS.
  - `pnpm exec vitest run` (`11` affected suites: `courses-section`, `courses/[slug]/page`, `enrollment-view`, `status-lookup-view`, `admin-enrollments-view`, `admin-login-view`, `money`, `status`, `service`, `api/enrollments`, `api/status`): PASS (`11/11` files, `79/79` tests).
  - `pnpm build`: PASS (clean Turbopack build, `37/37` workers/routes).
  - **Not Run (Blocked):** Live Chrome desktop (`1440×900`) & mobile (`390×844`) verification via `browser` subagent (`DevToolsActivePort` ENOENT — Chrome remote debugging not enabled by user yet).

### Homepage Courses & Programs UI Modernization (Editorial 2-Column Split) (`task/enrollment-bkash-superadmin`)
- **SRS IDs Covered:** FR-PUB-002, FR-CRS-004, NFR-A11Y-01, Rule R1–R8, Rule R11–R16, Rule R19
- **Deliverables:**
  1. *Header-Aligned Responsive Grid ([`src/components/home/courses-section.tsx`](file:///d:/.internship/LNA/Website%20Development/src/components/home/courses-section.tsx)):*
     - Replaced floating centered `320px` cards + unused scroll pagination with a responsive CSS grid (`grid-cols-1 md:grid-cols-2`, scaling to `lg:grid-cols-3` when 3+ courses render) aligned cleanly with the `max-w-7xl` section header.
     - Added dynamic open-cohort status pill (`{openCohortCount} Open Cohort · Offline`) and migrated all surface/text/border classes to semantic `tokens.css` variables.
  2. *Modern Editorial Course Card ([`src/components/home/course-card.tsx`](file:///d:/.internship/LNA/Website%20Development/src/components/home/course-card.tsx)):*
     - Eliminated the hover-swap overlay that hid course subtitles/metadata and eliminated hardcoded hex colors, schedule strings, and the fallback `3000000` poisha fee.
     - Added top editorial accent bar, `Badge` status pill showing dynamic remaining seats (`Open · {N} seats left`) or completed cohort milestone (`Completed · Cohort {N}`), schedule/start-date/compact-venue chips, top 3 `learningOutcomes`, labeled mentor strip with `44×44px` (`w-11 h-11`) mobile touch targets + `+N` overflow summary, and high-contrast `text-text-secondary` (`#3d5a62`) small labels.
     - Preserved integer-poisha formatting via `formatPoishaToBDT` (including discount strikethrough and `Free` batch rendering).
  3. *Updated Component Test Suite ([`src/components/home/courses-section.test.tsx`](file:///d:/.internship/LNA/Website%20Development/src/components/home/courses-section.test.tsx)):*
     - Rewrote tests for the modernized component covering open seats, discount/free poisha rendering, completed milestones, `44×44px` mentor avatar targets, `+4` overflow badge at 8 mentors, quick-view dialog interaction, accessible card link, and empty state.
- **Verification (Level 1 per ADR 0010):**
  - `pnpm exec eslint --max-warnings=0 src/components/home/courses-section.tsx src/components/home/course-card.tsx src/components/home/courses-section.test.tsx`: PASS (`0` errors, `0` warnings).
  - `pnpm typecheck` (`tsc --noEmit`): PASS (`0` errors).
  - `pnpm exec vitest run src/components/home/courses-section.test.tsx`: PASS (`1/1` file, `8/8` tests).
  - `pnpm exec prettier --check src/components/home/courses-section.tsx src/components/home/course-card.tsx src/components/home/courses-section.test.tsx`: PASS.
  - Not run (per Level 1 scope): `next build`, full Vitest suite, live browser visual / `@axe-core/playwright` scan.

### Direct Live bKash PGW Integration & Reconciliation Hardening (`task/enrollment-bkash-superadmin`)
- **SRS IDs Covered:** FR-PAY-004, FR-PAY-005, FR-PAY-006, FR-PAY-007, FR-PAY-008, FR-ENR-006, NFR-SEC-01, NFR-SEC-02, NFR-OBS-01, UC-01, AT-01, AT-02, AT-03, ADR 0009, Rule R1–R19
- **Architecture & Deliverables:**
  1. *Non-Duplicated `PGW_* -> BKASH_*` Alias Mapping & Live Readiness Diagnostics ([`src/server/env.ts`](file:///d:/.internship/LNA/Website%20Development/src/server/env.ts), [`.env.example`](file:///d:/.internship/LNA/Website%20Development/.env.example)):*
     - Added `resolveBkashEnvAliases()` preprocessor mapping `.env.local`'s existing `PGW_Production_API_Context_Root` (`https://tokenized.pay.bka.sh/v1.2.0-beta`), `PGW_App_Key`, and `PGW_App_Secret` (plus optional `PGW_Username`/`PGW_Password`) onto canonical `BKASH_BASE_URL`, `BKASH_API_VERSION`, `BKASH_APP_KEY`, and `BKASH_APP_SECRET` without duplicating secrets in `.env.local` (explicit `BKASH_*` takes precedence).
     - Enforced non-localhost `https://` `APP_URL` when `NODE_ENV=production` and `BKASH_CHECKOUT_MODE=live`, added optional `CRON_SECRET` (`min 32` chars; blank strings ignored), added non-secret `getBkashLiveReadiness()`, and updated `.env.example` defaults (`BKASH_BASE_URL=https://tokenized.pay.bka.sh`, `BKASH_CHECKOUT_MODE=closed`).
  2. *Production Proxy Origin Preservation ([`src/server/security/origin.ts`](file:///d:/.internship/LNA/Website%20Development/src/server/security/origin.ts)):*
     - Updated `resolveSafeAppOrigin(request)` so requests matching configured `APP_URL` host retain `configured.origin` (`https://...`), preventing internal reverse-proxy HTTP requests from downgrading live bKash `callbackURL`.
  3. *Hardened `BkashTokenizedClient` (`v1.2.0-beta`, `mode: "0011"`) ([`src/server/payments/bkash.ts`](file:///d:/.internship/LNA/Website%20Development/src/server/payments/bkash.ts)):*
     - Added `tokenInFlight` promise deduplication, `/token/grant` `statusCode === "0000"` enforcement, conservative dynamic `expires_in` cache TTL, and public `verifyAuthentication()`.
     - Enforced public `https://` (non-localhost) `callbackUrl` inside `initiateCheckout()` whenever targeting `tokenized.pay.bka.sh` or `NODE_ENV=production` (`BKASH_INVALID_CALLBACK_URL`).
     - Distinguished gateway declines (e.g. `2023` Insufficient Balance -> `outcome: "failed"`) from recoverable timeouts / `2062` already-completed / `429` / `5xx` (`outcome: "pending"`) in `executePayment()`, and exported fail-closed `createLiveBkashClientFromEnv()` (`BKASH_CREDENTIALS_MISSING`).
  4. *Callback Recovery, Session Persistence Guard & Payment Reconciliation ([`src/server/enrollment/service.ts`](file:///d:/.internship/LNA/Website%20Development/src/server/enrollment/service.ts), [`src/app/api/cron/reconcile-payments/route.ts`](file:///d:/.internship/LNA/Website%20Development/src/app/api/cron/reconcile-payments/route.ts)):*
     - Added `PAYMENT_SESSION_SAVE_FAILED` DB error checking after `initiateCheckout` (passing `createdPaymentId` into error rollback telemetry), cleanly classified declined/unsettled `execute+query` results into `"failed"` retaining active 30-min seat holds for retry, and recovered `2062`/timeout execute calls when `queryPaymentStatus` verifies `Completed` + `0000` + `trxID` + invoice + integer poisha + `BDT`.
     - Implemented `reconcilePendingBkashPayments()` (logging append-only `payment_events` with `source = 'query_status'`) and `GET`/`POST /api/cron/reconcile-payments` secured by constant-time `Authorization: Bearer CRON_SECRET` SHA-256 verification or `requireStaff("enrollments:read")` (`super_admin` AAL2 session).
  5. *Expanded Unit & Route Test Coverage:*
     - Added tests across [`src/env.test.ts`](file:///d:/.internship/LNA/Website%20Development/src/env.test.ts) (`19/19`), [`src/server/payments/bkash.test.ts`](file:///d:/.internship/LNA/Website%20Development/src/server/payments/bkash.test.ts) (`9/9`), [`src/server/enrollment/service.test.ts`](file:///d:/.internship/LNA/Website%20Development/src/server/enrollment/service.test.ts) (`18/18`), and [`src/app/api/cron/reconcile-payments/route.test.ts`](file:///d:/.internship/LNA/Website%20Development/src/app/api/cron/reconcile-payments/route.test.ts) (`3/3`).
- **Verification (Latest Run Against Built App & `.env.local`):**
  - `node scripts/check-traceability.mjs`, `pnpm tokens:check`, `pnpm content:validate`: PASS (`129/129` IDs, `18` content schemas).
  - `pnpm exec prettier --check` (touched TS/TSX files) & targeted `eslint --max-warnings=0`: PASS (`0` errors, `0` warnings; full `pnpm lint` reports only untouched pre-existing `course-detail-view.tsx:615` warning).
  - `pnpm typecheck`: PASS (`0` errors).
  - Focused Vitest (`22` files across payments, enrollment, cron, env, origin, money, email, auth, Supabase, API, and `/enroll`/`/status`/`/admin` UI): PASS (`22/22` files, `122/122` tests). Full `pnpm test`: `42/47` files passed (`221/237` tests; same `16` pre-existing Phase 3/4 test failures documented in Open Issues).
  - Clean `pnpm build` + static chunk secret scan (`25` chunks): PASS (`0` leaked server secrets).
  - `.env.local` live non-secret readiness check + production PGW probe (`tokenized.pay.bka.sh/v1.2.0-beta`): TLSv1.3 verified (`authorized: true`, CN `checkout.pay.bka.sh`), `OPTIONS /tokenized/checkout/token/grant` -> HTTP `403` JSON (`volt-adc`), `validateServerEnvironment` fail-closed test with `BKASH_CHECKOUT_MODE=live` explicitly flags missing `BKASH_USERNAME` & `BKASH_PASSWORD`.
  - Built server runtime check: `GET /enroll` (`200`), `POST /api/enrollments` (`503 CHECKOUT_CLOSED`), `GET /api/cron/reconcile-payments` (`401 UNAUTHENTICATED`), `GET /api/payments/bkash/mock-checkout` (`404`).
  - **Not Run / Externally Blocked:** Live `/token/grant` authentication and controlled live payment test (blocked on missing `BKASH_USERNAME` & `BKASH_PASSWORD`, public HTTPS `APP_URL`, bKash whitelisting), `0002` pgTAP execution (`58` assertions).

### Superadmin Enrollment Dashboard `PGRST201` Fix, RLS & `getSession()` Audit (`task/enrollment-bkash-superadmin`)
- **SRS IDs Covered:** FR-ADM-001, FR-ADM-002, FR-ENR-004, FR-ENR-006, NFR-SEC-01, NFR-OBS-01, Rule R1–R19
- **Root Cause & Deliverables:**
  1. *Ambiguous PostgREST Foreign-Key Embed (`PGRST201`) in [`src/server/enrollment/service.ts`](file:///d:/.internship/LNA/Website%20Development/src/server/enrollment/service.ts):*
     - `public.enrollments` defines both `enrollments_batch_id_fkey` (`batch_id -> batches(id)`) and composite `enrollments_batch_course_match` (`(batch_id, course_id) -> batches(id, course_id)`), causing PostgREST to reject `.select("..., batches(...)")` with `PGRST201` (`Could not embed because more than one relationship was found for 'enrollments' and 'batches'`).
     - Disambiguated all four `enrollments` queries to `batches!enrollments_batch_id_fkey(...)`: `listAdminEnrollments()`, `getAdminEnrollmentDetail()`, `getEnrollmentOutcomeSummaryByToken()`, and `lookupEnrollmentStatus()`.
     - Added defense-in-depth `assertVerifiedSuperAdmin(staff)` (`role === "super_admin" && accountState === "active" && aal === "aal2"`) inside `listAdminEnrollments()` and `getAdminEnrollmentDetail()`.
     - Added sanitized server-only `console.error(..., { code: error.code ?? null })` and `AppError(..., { pgCode })` reporting on `ADMIN_LIST_FAILED` (503) and `ADMIN_DETAIL_FAILED` (503) so DB failures never silently masquerade as `404` and never expose PII/secrets.
  2. *RLS / Server Client Review & `getSession()` Audit in [`src/server/auth/require-staff.ts`](file:///d:/.internship/LNA/Website%20Development/src/server/auth/require-staff.ts):*
     - Confirmed `public.enrollments`, `payment_attempts`, `payment_events`, `email_outbox`, and `audit_events` intentionally revoke all browser-role privileges and enforce deny-all RLS policies (`TO anon, authenticated USING (false)`), making `requireStaff("enrollments:read")` -> verified `super_admin` `AAL2` -> server-only `createSupabaseAdminClient()` the intended security boundary (`Rule R8`/`R9`).
     - Audited all `getSession()` references: zero `getSession()` calls exist anywhere in `src/`. Updated `getStaffSessionContext()` to run `mfa.listFactors()` -> `mfa.getAuthenticatorAssuranceLevel()` strictly sequentially after `auth.getUser()` and documented that `@supabase/auth-js@2.68.0` emits its server `getSession()` warning internally inside `GoTrueClient._getAuthenticatorAssuranceLevel()`.
  3. *Regression Tests in [`src/server/enrollment/service.test.ts`](file:///d:/.internship/LNA/Website%20Development/src/server/enrollment/service.test.ts) & [`src/app/admin/enrollments/admin-enrollments-view.test.tsx`](file:///d:/.internship/LNA/Website%20Development/src/app/admin/enrollments/admin-enrollments-view.test.tsx):*
     - Updated `createServiceAdminMock` to emit real `PGRST201` on any un-disambiguated `batches(` embed on `enrollments`, plus tests for empty enrollment tables (`{ totalCount: 0, items: [] }`), unauthorized non-`super_admin`/non-`aal2` `FORBIDDEN` (`403`), sanitized `ADMIN_LIST_FAILED` (`503`, `{ pgCode }`), and empty unfiltered `"No enrollment records yet"` dashboard UI state.
- **Verification:** *(Results verified on `lna-website-dev` & local workspace in Section 2 & final gate after doc update.)*

### First Complete Enrollment Flow: Direct bKash Tokenized Checkout, `/status`, Email Outbox & Read-Only `AAL2` Superadmin (`task/enrollment-bkash-superadmin`)
- **SRS IDs Covered:** FR-ENR-001..006, FR-PAY-002..009, FR-AUT-001..004, FR-ADM-001..002, FR-CRS-006, FR-CMS-003..004, NFR-SEC-01..04, NFR-AVL-01, NFR-OBS-01, BR-01..08, UC-01, ADR 0009, Rule R1–R19
- **Architecture & Deliverables:**
  1. *Approved Direct bKash Gateway Architecture & Environment Validation:*
     - `docs/decisions/0009-direct-bkash-payment-gateway.md`: Marked `Accepted`; standardized on `BKASH_CHECKOUT_MODE` (`closed | mock | live`), `BKASH_BASE_URL`, `BKASH_API_VERSION` (`v1.2.0-beta`), `BKASH_MODE` (`0011`), `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD`.
     - `package.json`, `pnpm-lock.yaml`: Installed repo-approved `@supabase/supabase-js@2.49.1`, `@supabase/ssr@0.5.2`, `resend@4.1.2`, `@upstash/redis@1.34.4`, `@upstash/ratelimit@2.0.5`.
     - `.env.example`, `src/env.client.ts`, `src/server/env.ts`, `src/env.test.ts`: Added Zod schemas blocking `BKASH_CHECKOUT_MODE=mock` and `EMAIL_DISPATCH_MODE=mock` in `NODE_ENV=production` and requiring non-placeholder secrets in `live` mode. Fixed browser bundle env loading in `src/env.client.ts` by replacing bare `safeParse(process.env)` with explicit static `process.env.NEXT_PUBLIC_*` reads, removing `.default("https://dummy.supabase.co")` and dummy key fallbacks, adding `getRequiredBrowserSupabaseConfig()` (`SUPABASE_NOT_CONFIGURED`), and covering missing/placeholder/configured initialization in `src/lib/supabase/browser.test.ts`.
     - `src/lib/money.ts`, `src/lib/money.test.ts`: Added integer poisha (`bigint`) helpers `bdtStringToPoisha` and `poishaToBdtString` with zero floating-point arithmetic (`Rule R5`).
  2. *Forward SQL Migration & pgTAP Access/Idempotency Suite (Authored, Pending Execution on `lna-website-dev`):*
     - `supabase/migrations/20261110235500_enrollment_bkash_outbox_and_staff_profiles.sql`: Added `public.profiles`, `public.payment_attempts`, append-only `public.payment_events`, `public.email_outbox` (`UNIQUE (idempotency_key)`), append-only `public.audit_events`, explicit least-privilege grants (no `DELETE`/`TRUNCATE` even for `service_role`), RLS policies blocking all browser access to payment/outbox/audit tables, and `SECURITY DEFINER` RPCs (`count_batch_active_seats`, `start_enrollment`, `retry_enrollment_payment`, `confirm_payment`, `record_payment_outcome`). Left `20261110161500_initial_catalog_and_enrollments.sql` untouched (`Rule R9`).
     - `supabase/tests/0002_enrollment_bkash_and_profiles_rls.sql`: Authored 58 pgTAP assertions covering role grants, RLS isolation (`anon` vs `authenticated` vs `service_role`), row-locked capacity/seat holds, cancel/fail hold retention, `confirm_payment` idempotency, mismatch `review_hold` quarantine, and `email_outbox` deduplication.
  3. *Server Gateway, Email Outbox, Security, Rate Limiting & Staff Auth Modules (`import "server-only"`):*
     - `src/lib/supabase/browser.ts`, `src/lib/supabase/browser.test.ts`, `src/server/supabase/clients.ts`, `src/proxy.ts`: Browser/SSR/admin Supabase clients enforcing explicit `SUPABASE_NOT_CONFIGURED` errors in `createSupabaseBrowserClient()`, Next 16 `/admin/:path*` SSR cookie session refresh proxy, and preserved placeholder-detection guards (`proxy.ts`, `clients.ts`, `connection.ts`) and test fixtures (`connection.test.ts`).
     - `src/server/security/hmac.ts`, `src/server/security/origin.ts`, `src/server/ratelimit/limiter.ts`: HMAC-SHA256 outcome token sign/verify, same-origin check, and Upstash Redis + dev fallback rate limiters (`enroll`, `retry`, `status_ip`, `status_ref`).
     - `src/server/payments/bkash.ts`, `src/server/payments/bkash.test.ts`: Tokenized Checkout `v1.2.0-beta` HTTP adapter with cached grant token + 401 refresh retry, `MockBkashClient` (blocked in prod), and `redactBkashPayload`.
     - `src/server/email/resend.ts`, `src/server/email/resend.test.ts`: Decoupled `email_outbox` + Resend dispatch (`disabled | mock | live`) skipping already `sent` rows, preserving `pending` outbox rows without Resend calls in `disabled` mode (`EMAIL_DISPATCH_MODE="disabled"`), and recording `retry_count`/`last_error` without aborting payment/free enrollment confirmation (`NFR-AVL-01`).
     - `src/server/auth/require-staff.ts`, `src/server/auth/require-staff.test.ts`: Server guard verifying Supabase SSR user + `aal2` + verified `totp` factor + `public.profiles` (`role = 'super_admin'`, `account_state = 'active'`), never reading `user_metadata`.
     - `src/server/enrollment/config.ts`, `src/server/enrollment/service.ts`, `src/server/enrollment/service.test.ts`: Supabase catalog/active-seat reader, `startEnrollmentCheckout`, `retryEnrollmentCheckout`, `processBkashCallback` (calling both `executePayment` and `queryPaymentStatus`), `getEnrollmentOutcomeSummaryByToken`, `lookupEnrollmentStatus`, `listAdminEnrollments`, and `getAdminEnrollmentDetail`.
  4. *API Routes, Public `/enroll` & `/status`, and Read-Only Superadmin UI (`/admin/**`):*
     - API routes: `src/app/api/enrollments/route.ts`, `src/app/api/enrollments/retry/route.ts`, `src/app/api/payments/bkash/callback/route.ts`, `src/app/api/payments/bkash/mock-checkout/route.ts`, `src/app/api/status/route.ts`, `src/app/api/admin/logout/route.ts` (+ route test suites).
     - Public flows: Updated `content/enrollment/config.json`, `src/lib/enrollment/types.ts`, `src/lib/enrollment/status.ts`, `src/app/enroll/page.tsx`, `src/app/enroll/enrollment-view.tsx`, `src/app/status/page.tsx`, `src/app/status/status-lookup-view.tsx` for server-backed batch selection, hosted bKash Checkout redirect, bank transfer removal, retry within hold, student-facing confirmation messaging pointing strictly to the LNA Application ID and `/status` (no false email promises while Resend is disabled), and non-PII `/status` lookup (`LNA-XXXX-XXXX` + email or phone).
     - Admin shell & pages: Added `src/components/public/public-chrome-gate.tsx` + updated `src/components/public/public-shell.tsx` to hide public site header/footer on `/admin/**`; implemented `src/app/admin/layout.tsx`, `/admin/login` (email/password + mandatory TOTP QR setup / verification), `/admin/enrollments` (search, status/method filter, pagination), and `/admin/enrollments/[id]` (application, payment attempts timeline, redacted events, email outbox status, audit trail) with `src/components/admin/*`.
- **Verification (Run Locally After Latest Edits):**
  - `node scripts/check-traceability.mjs`: PASS (`129/129` SRS IDs matched).
  - `pnpm exec prettier --check` (modified/new auth & env files + `docs/STATE.md`): PASS.
  - `pnpm typecheck` (`tsc --noEmit`): PASS (`0` errors).
  - `pnpm exec eslint --max-warnings=0` (modified/new auth & env files): PASS (`0` errors, `0` warnings).
  - Focused Vitest (`src/env.test.ts`, `src/lib/supabase/browser.test.ts`, `src/server/supabase/connection.test.ts`, `src/server/auth/require-staff.test.ts`, `src/app/admin/login/admin-login-view.test.tsx`, `src/app/api/health/route.test.ts`): PASS (`6/6` files, `39/39` tests passed).
  - Clean `pnpm build` (after `Remove-Item -Recurse -Force .next`) + `.next/static/chunks/*.js` bundle audit: PASS (`0` `https://dummy.supabase.co` URLs or `dummy_supabase_publishable_key` literals in client chunks; only the intentional placeholder-detection check remains while the `.env.local` project URL is inlined; `0` `sb_secret_` literals).
  - Prior branch checks (unchanged enrollment/bKash/Resend modules on `task/enrollment-bkash-superadmin`): `pnpm tokens:check` PASS, `pnpm content:validate` PASS (`18` schemas), `20` task Vitest suites PASS (`103/103` tests before the `browser.test.ts` + `env.test.ts` + `admin-login-view.test.tsx` additions), and full `pnpm test` previously hit `16` pre-existing Phase 3/4 failures noted in Open Issues.
  - **Not Yet Executed:** Browser runtime login test against `lna-website-dev` (requires restarting `pnpm dev` / clearing `.next`), apply `20261110235500` + `supabase/seed.sql` + `0002` pgTAP (`58` assertions) on `lna-website-dev`, manual Superadmin TOTP provisioning, Playwright/live-browser axe audit, and controlled live bKash merchant payment test.

### Supabase Env Schema Migration, Initial Catalog/Enrollment Migration Applied & Verified (`lna-website-dev`)
- **SRS IDs Covered:** FR-CMS-003, FR-PAY-003, NFR-SEC-02, NFR-OBS-01, NFR-MNT-01, BR-18, ADR 0002, ADR 0012, Rule R1–R19
- **Architecture & Deliverables:**
  1. *Supabase Env Schema & Server-Only Secret Boundary:*
     - `.env.example`, `src/env.client.ts`, `src/server/env.ts`: Migrated to `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and strictly server-only `SUPABASE_SECRET_KEY` (`import "server-only"`, production dummy/placeholder rejection).
     - `src/server/supabase/connection.ts` & `src/server/supabase/connection.test.ts`: Added dependency-free (`package.json`/`pnpm-lock.yaml` untouched) `verifySupabaseConnection()` probe validating Auth health, PostgREST publishable-key probe, and PostgREST OpenAPI spec using `apikey` headers only with zero credential exposure (`AppError` codes `SUPABASE_NOT_CONFIGURED`, `SUPABASE_INVALID_URL`, `SUPABASE_CONNECTION_FAILED`).
     - `src/env.test.ts` & `src/app/api/health/route.test.ts`: Verified client secret-stripping and health telemetry scrubbing.
  2. *First Forward-Only Migration Applied on `lna-website-dev` (`supabase/migrations/20261110161500_initial_catalog_and_enrollments.sql`):*
     - Schema & triggers: `courses`, `batches` (`UNIQUE (id, course_id)`, `bigint` poisha fees), `mentors`, `course_mentors` (ADR 0012 ordered join), and `enrollments` (`FOREIGN KEY (batch_id, course_id)`, Crockford Base32 `public_ref`, `extensions.citext` email, BD phone regex, `answers` & `program_questions_snapshot`, integer poisha CHECKs, and partial unique indexes `idx_enrollments_active_batch_email` & `idx_enrollments_verified_payment_ref`).
     - Fixed catalog provenance constraints (`courses_provenance_valid`, `batches_provenance_valid`, `mentors_provenance_valid`): uses `coalesce(jsonb_typeof(...), '')` and `coalesce(... ->> ..., '')` so missing `class`, `verified`, or `source` keys evaluate strictly `FALSE`.
     - Hardened grants & RLS: `REVOKE ALL ... FROM PUBLIC, anon, authenticated, service_role;` on all 5 tables; `GRANT ALL` to `service_role` on catalog tables only; **explicit `GRANT SELECT, INSERT, UPDATE ON TABLE public.enrollments TO service_role;`** (denying `DELETE` and `TRUNCATE` per Rule R10); `GRANT SELECT` strictly on published catalog tables (`courses`, `batches`, `mentors`, `course_mentors`) to `anon, authenticated`; zero grants + `Deny direct browser access to enrollments` RLS policy for browser roles.
     - Verified Class A baseline data only (`irgp`, 15 Class A mentors, `irgp` `course_mentors`) with deterministic timestamps and zero `is_dev_fixture = true` rows.
  3. *Separate Development Seed (`supabase/seed.sql`):*
     - Holds all development-only (`is_dev_fixture = true`) fixtures (`mto-readiness`, MTO `course_mentors`, `batch-mto-2026-01`, `batch-irgp-cohort-1`, `LNA-DEVF-0001`, `LNA-DEVF-0002`) separately from migrations (not applied in this migration check).
  4. *Reproducible pgTAP RLS, Grant & Constraint Test Suite (`supabase/tests/0001_catalog_and_enrollments_rls.sql`):*
     - `62/62` self-contained assertions executed and passed on `lna-website-dev` inside `BEGIN; ... ROLLBACK;`.
- **Verification:**
  - Owner-verified apply of `supabase/migrations/20261110161500_initial_catalog_and_enrollments.sql` (without `supabase/seed.sql`) and `62/62` pgTAP pass on `lna-website-dev`.
  - Post-migration live REST checks on `lna-website-dev` using `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (no user session):
    - `GET /rest/v1/courses`: HTTP `200` (`1` row: `irgp`)
    - `GET /rest/v1/batches`: HTTP `200` (`0` rows — expected without dev seed)
    - `GET /rest/v1/mentors`: HTTP `200` (`15` rows)
    - `GET /rest/v1/course_mentors`: HTTP `200` (`8` rows)
    - `GET /rest/v1/enrollments`: HTTP `401` (`42501`, `"permission denied for table enrollments"`)
    - `verifySupabaseConnection()`: `{ ok: true, authHealthy: true, authVersion: "v2.197.0", publishableKeyAccepted: true, secretKeyAccepted: true, exposedPublicTables: ["batches", "course_mentors", "courses", "enrollments", "mentors"] }`
    - `GET /auth/v1/settings`: HTTP `200` (`disable_signup: false`).
  - Local checks (`tokens:check`, `content:validate`, `check-traceability.mjs`, `typecheck`, targeted `eslint` + `prettier --check`, targeted Vitest `36/36`): PASS.


### Public Demo Content Removal, Official Payment Details & Scannable bKash QR Sizing (`/enroll`, `/status`)
- **SRS IDs Covered:** FR-ENR-001, FR-ENR-002, FR-ENR-004, FR-ENR-005, FR-PAY-001 (fee display), FR-PAY-002 (batch discount UI), Rule R2, Rule R3, Rule R4, Rule R5, Rule R6, Rule R7, Rule R8, Rule R11, Rule R12, Rule R13, Rule R14, Rule R15, Rule R16, Rule R19
- **Architecture & Deliverables:**
  1. *Official LNA Assets, Payment Config & Schema Validation:*
     - `public/images/payments/lna-bkash-merchant-qr.png`: Installed verbatim official LNA bKash Merchant QR PNG (`612x780`, `113,161` bytes, SHA-256 `063773A514EBD6EA8157CFFFC2C6581E1D2D0EA333ACF2C272490E5D8C058A33`, merchant number `0158 1799 666`) and deleted `public/images/payments/demo-bkash-qr.svg`.
     - `content/enrollment/config.json`: Removed demo flags/notices and unverified placeholder bank data; configured official bKash (`Lead Nation Academy`, `0158 1799 666`, `/images/payments/lna-bkash-merchant-qr.png`) and approved receiving bank details (`Mutual Trust Bank PLC`, `Lead Nation Academy - LNA`, `130100052843`) with `"submissionEnabled": false` while preserving `programQuestions["mto-readiness"]`.
     - `src/lib/enrollment/types.ts`, `src/lib/enrollment/config.ts`, `scripts/validate-content.mjs`: Removed demo schema fields (`isDemo`, `demoNotice`), added `submissionEnabled: boolean`, made optional `branch`/`routingNumber` nullable/optional, and updated `pnpm content:validate` QR asset verification.
  2. *Clean Status Projection & Normalization Helpers (`src/lib/enrollment/status.ts`, `src/lib/enrollment/status.test.ts`):*
     - Deleted `src/lib/enrollment/demo-status.ts` and `src/lib/enrollment/demo-status.test.ts`, removing all public sample application records and browser `sessionStorage` simulation from runtime code.
     - Exported pure helpers (`normalizeApplicationRef`, `normalizeEmail`, `normalizeBdPhone`, `isValidBdPhone`, `formatPaymentMethodLabel`, `projectSafeStatusResult`) with all sample test fixtures isolated inside `src/lib/enrollment/status.test.ts`.
  3. *Enrollment Flow Public Gating & Scannable QR Layout (`/enroll` — `src/app/enroll/enrollment-view.tsx`, `src/app/enroll/enrollment-view.test.tsx`):*
     - Replaced the tiny `w-36 sm:w-40` inline QR thumbnail with: (a) a dedicated sticky right-panel official bKash QR showcase on `lg:` desktop (`w-[300px] xl:w-[350px]`, rendered at `350x446` px on `1440px` desktop) when `bKash` is active on the payment step, (b) a wider centered clickable QR card (`w-full max-w-[270px] sm:max-w-[300px]`, rendered at `252x321` px on `390px` mobile) on mobile/tablet, and (c) an accessible `Dialog` popup (`src/components/ui/dialog.tsx`, rendered up to `364x464` px desktop / `298x380` px mobile) triggered from `"Enlarge QR"`, inline tap, or right-panel click.
     - Kept official Mutual Trust Bank PLC details (`130100052843`, omitting unapproved branch/routing), integer poisha Amount due breakdown, `bKash Transaction ID` / `Bank Transaction Reference` inputs, `"Online enrollment is coming soon"` gating (`submissionEnabled: false`), and zero demo strings/simulations.
  4. *Application Status Page Public Gating (`/status` — `src/app/status/status-lookup-view.tsx`, `src/app/status/status-lookup-view.test.tsx`):*
     - Removed `"Frontend demo lookup"` badge, `"Demo sample applications"` sidebar, demo placeholders, and simulated lookups.
     - Default public state displays `"Online enrollment is coming soon"` and disables lookup submission while keeping `?ref=` prefill, clean form structure, and `enabled` + `onLookup` testability against fixtures inside `status-lookup-view.test.tsx`.
- **Verification:**
  - `pnpm tokens:check`: PASS.
  - `pnpm content:validate`: PASS (18 JSON/config checks including `content/enrollment/config.json` and `public/images/payments/lna-bkash-merchant-qr.png`).
  - `pnpm typecheck`: PASS (`tsc --noEmit`, 0 errors).
  - `pnpm exec eslint --max-warnings=0 src/lib/enrollment/ src/app/enroll/ src/app/status/`: PASS (0 errors, 0 warnings).
  - `pnpm exec prettier --check` (touched enrollment/status/validation files formatted cleanly).
  - `pnpm exec vitest run src/lib/enrollment/ src/app/enroll/ src/app/status/`: PASS (4 test files, 17/17 tests passed).
  - Headless Chrome (`1440x900` desktop & `390x844` mobile) rendered QR size check & modal visual inspection: PASS (`350px` desktop panel, `364px` desktop popup, `252px` mobile inline, `298px` mobile popup, `overflowX: false`).
  - `pnpm build`: PASS (`next build`, static routes including `/enroll` and `/status` built cleanly).

### Company Logo Enlargement & Mentors Section Rework (Hero + Mentors Showcase + Course Details)
- **SRS IDs Covered:** FR-PUB-002, FR-PUB-004, FR-CRS-005, Rule R2, Rule R4, Rule R6, Rule R7, Rule R11, Rule R12, Rule R13, Rule R14, Rule R19
- **Files Changed:**
  - `src/lib/mentors.ts`: Exported `MentorCompanyLogo`, `formatMentorRoleWithCompany`, and `getMentorCompanyLogos` (preserving `getMentorCompanyLogo` compatibility for `HeroSlide` and `CourseDetailView`).
  - `src/components/home/company-logo.tsx`: Added `role="img"` / `aria-label` accessibility when `CompanyLogo` renders `iconOnly`, and upgraded `OfficialCompanyLogo` to support `size?: "hero" | "card" | "modal"` with scaled-up, per-asset calibrated dimensions (`brandgear.png`, `nagad.png`, `eastern-bank.png`, `ecourier.png`, `chaldal.png`, `goyara.png`, `brand/logo.png`, `igloo.png`, `modhumoti-bank.png`, `sheba.png`, `axentec.png`, `ucb.svg`, `shohoz.svg`).
  - `src/components/home/hero/hero-slide.tsx`: Switched `renderMentorCompanyLogo` from raw `h-3.5 sm:h-4` `<img>` tags to `<OfficialCompanyLogo size="hero" />` inside `h-8 sm:h-9` containers across MTO and IRGP Hero mentor cards so padded/dense marks (`Nagad`, `BrandGear`, `IGLOO`, `Lead Nation Academy`, `Modhumoti`, `Sheba`, `Axentec`, `e-Courier`, `Chaldal`, `Eastern Bank`) render cleanly and recognizably.
  - `src/components/home/mentor-carousel.tsx`: Refined card split/typography (`h3` scaled down to `text-[13px] sm:text-sm xl:text-[15px] leading-snug line-clamp-2`, role line scaled to `text-[10.5px] sm:text-[11px] leading-[1.35] line-clamp-3` displaying `formatMentorRoleWithCompany(mentor)`), and updated bottom logo strip (`min-h-[42px] sm:min-h-[46px]`) to render enlarged `OfficialCompanyLogo` marks only (falling back to `iconOnly` `CompanyLogo` marks for test fixtures without image assets).
  - `src/components/home/mentor-quick-view-modal.tsx`, `src/components/home/mentor-quick-view-panel.tsx`, & `src/app/courses/[slug]/course-detail-view.tsx`: Updated heading sizing, role-at-company subtitle (modals/panels), and calibrated `OfficialCompanyLogo` `size="modal"` rendering.
  - `src/components/home/mentors-section.test.tsx`: Updated carousel logo assertions for accessible `role="img"` logo-only rendering and added unit tests for LNA mentor `role at organization` formatting, official logo images, and calibrated `OfficialCompanyLogo` `hero`/`card`/`modal` sizing classes.
  - `docs/STATE.md`, `docs/traceability.csv`: Updated state and verification evidence.
- **Verification:**
  - `pnpm content:validate`: PASS.
  - `pnpm exec eslint src/lib/mentors.ts src/components/home/company-logo.tsx src/components/home/hero/hero-slide.tsx src/components/home/mentor-carousel.tsx src/components/home/mentor-quick-view-modal.tsx src/components/home/mentor-quick-view-panel.tsx src/components/home/mentors-section.test.tsx src/app/courses/[slug]/course-detail-view.tsx`: PASS (0 errors; 1 pre-existing warning on untouched line `course-detail-view.tsx:615` for `orgDisplay`).
  - `pnpm typecheck`: PASS (`tsc --noEmit`, 0 errors).
  - `pnpm exec vitest run src/components/home/mentors-section.test.tsx src/app/mentors/[slug]/page.test.tsx`: PASS (2 test files, 14/14 tests passed: 12 in `mentors-section.test.tsx`, 2 in `mentors/[slug]/page.test.tsx`).
  - `pnpm exec vitest run src/components/home/hero-slider.test.tsx`: 8/10 passed, same 2 pre-existing MTO mock fixture failures documented in Open Issues (IRGP slide passed).
  - Note: Level 1 check per ADR 0010 (`next build` and full test suite intentionally not run). Pre-existing Prettier warnings exist in touched files (no sweeping formatting applied per Rule R7).

### Fix / Replace `mir-hasib-v3.png` Portrait Reference with `mir-hasib.png`
- **SRS IDs Covered:** FR-PUB-002, Rule R2, Rule R7, Rule R11, Rule R12, Rule R14, Rule R19
- **Files Changed:**
  - `content/home/mentors.json`: Updated `mentor-mir-hasib` `portraitSrc` from `/images/mentors/mir-hasib-v3.png` to `/images/mentors/mir-hasib.png`.
  - `src/lib/mentors.ts`: Already updated in working tree to map `mentor-mir-hasib` to `/images/mentors/mir-hasib.png`.
  - `docs/STATE.md`, `docs/traceability.csv`: Updated state and evidence.
- **Verification:**
  - `pnpm content:validate`: PASS.
  - `pnpm exec eslint src/lib/mentors.ts`: PASS.
  - `pnpm typecheck`: PASS (0 errors).
  - `pnpm exec vitest run src/components/home/mentors-section.test.tsx` (10/10) & `src/app/mentors/[slug]/page.test.tsx` (2/2): PASS.
  - Note: Pre-existing failures reported in `prettier --check` (`content/home/mentors.json`, `src/lib/mentors.ts`) and unrelated/pre-existing assertions in `repository.test.ts`, `courses/[slug]/page.test.tsx`, `hero-slider.test.tsx`, `page.test.tsx`.

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
