# LNA Rev3.0 | Master decision register

**Status:** Owner-approved UX and business decisions, planning baseline prepared 26 November 2026. No implementation, production changes, purchases, deployment or destructive work authorized. Test criteria are targets, not results.

## Approved authority

Original OD decisions and TR-01–10 remain governing where not superseded; C-01–16 are preserved in the implementation plan section 3. All 78 following decisions were explicitly approved in the five owner discussion parts. D69 approves proposed values subject to verification, not fixed deployment values. All decisions are planning-only.

## Courses and batches

| Decision | Approved rule | Requirement(s) | Owning task(s) |
| --- | --- | --- | --- |
| D01 | Course-specific questions in Courses; both forms share them. | CAT-01 ADM-01 CMS-09 | W1-T04 W4-T01 W7-T04 |
| D02 | Create from scratch, course defaults or copy; no dates, deadlines, students or payments copied; all previous exclusions remain. | CAT-07 | W1-T03 |
| D03 | Explicit Free/Paid selection on creation; no accidental Free default. | CAT-08 | W1-T03 |
| D04 | New applicants updated fee; existing agreed fee retained. | CAT-08 PAY-06 | W1-T01 W4-T02 |
| D05 | Show exact computed application availability reasons. | CAT-02 CAT-05 | W1-T02 W1-T04 |
| D06 | Warn before republish, restore or reversal that reopens intake. | CAT-02 CAT-03 | W1-T03 |
| D07 | Staff admissions public Off allowed; ordinary draft/completed/archived blocked. | ADM-04 CAT-02 | W1-T02 W4-T05 |
| D08 | Permanently delete only genuinely unused drafts; archive operational history. | CAT-09 | W1-T03 |
| D09 | Optional informational deadline; warn staff if passed while intake open. | CAT-04 | W1-T03 W1-T04 |
| D10 | Preserve historical question/answer versions; existing application retains original version. | ADM-01 CMS-09 | W4-T01 W7-T04 |
| D11 | Archive a batch that will not run; never automatically cancel students or alter payments. | CAT-03 CAT-09 | W1-T03 |
| D12 | Authorized checkout finishes after intake closes; ineligible receipt preserved and flagged. | CAT-02 PAY-02 | W1-T02 W4-T03 W4-T04 |

## Admissions, students and payments

| Decision | Approved rule | Requirement(s) | Owning task(s) |
| --- | --- | --- | --- |
| D13 | One student profile with separate admissions per enrollment. | ADM-07 | W4-T01 W4-T09 |
| D14 | One contextual Add Student form from Overview, Admissions, batch Students and profile. | ADM-04 SEC-07 | W4-T05 W4-T09 W8-T01 |
| D15 | Prefill existing details and relevant previous answers; audited contact edit. | ADM-07 ADM-12 | W4-T01 W4-T09 |
| D16 | Staff continues unfinished online application only with no unresolved online payment. | ADM-06 PAY-07 | W4-T03 W4-T05 |
| D17 | Admissions search name/phone/email/application/payment reference/TrxID/receipt; include expired. | ADM-11 | W4-T09 |
| D18 | One Admissions Needs Attention queue for admission/payment/email/receipt exceptions. | ADM-10 REP-05 | W4-T07 W4-T09 W5-T04 |
| D19 | Eligible same-student verified collection reuse; no new money or sixth payment option. | PAY-11 ADM-09 | W4-T06 W4-T07 |
| D20 | Block duplicate known bKash TrxID; warn and require acknowledgement for repeated cash/bank ref. | PAY-05 PAY-11 | W4-T05 W4-T07 |
| D21 | Positive paid amount; zero paid-batch collection full waiver; partial waiver smaller than applicable fee. | PAY-03 PAY-04 PAY-06 | W4-T05 |
| D22 | Persistent success admission/payment/receipt/email with Add Another and View Admission. | ADM-04 PAY-13 EML-01 | W4-T09 W5-T04 |
| D23 | Eligible same-course moves including move-back preserve money/receipt; optional notice default On. | ADM-09 EML-06 | W4-T06 W6-T02 |
| D24 | Super Admin only correction, mandatory reason, historical receipt versions. | PAY-08 PAY-13 | W4-T08 W5-T04 |
| D25 | Reviewed retains evidence; material new payment evidence reopens case. | PAY-11 ADM-10 | W4-T07 |
| D26 | Prevent double submissions and stale updates; explain changes. | SEC-07 PAY-01 | W2A-T03 W4-T05 W4-T06 W4-T07 W7-T03 |
| D27 | Receipt failure keeps confirmation, queues attachment email retry and surfaces prolonged issue. | PAY-13 EML-01 | W3-T02 W5-T04 |
| D28 | Revoke old recovery links, replace wrongly addressed unsent mail; preserve sent and issued records. | ADM-12 EML-06 | W4-T09 W3-T04 |

## Public website and students

| Decision | Approved rule | Requirement(s) | Owning task(s) |
| --- | --- | --- | --- |
| D29 | Seven-section order, hide empty optional sections, no fake reviews/stats/placeholders. | CMS-01 CMS-04 | W7-T03 W7-T05 |
| D30 | Published course accessible without accepting batch; details/contact CTA. | CAT-01 CMS-03 | W1-T04 W7-T05 |
| D31 | One eligible batch auto-selected; multiple explicit choice and comparison. | CAT-08 | W1-T04 W4-T04 W7-T05 |
| D32 | One contextual application page, inline validation, mobile fields. | ADM-01 | W4-T04 |
| D33 | Email typo suggestions and visible email before submit; no double entry. | ADM-02 | W4-T04 |
| D34 | Original fee/discount/payable; reconfirm changed fee before creation. | PAY-06 CAT-08 | W4-T02 W4-T04 |
| D35 | Show owner-approved payment/cancellation policy with explicit acceptance before checkout; no assumed nonrefundability. | CMS-08 PAY-01 | W4-T04 W7-T04 W9-T01 |
| D36 | Immediate free seat-confirmed wording; email independent. | ADM-03 | W4-T04 W3-T04 |
| D37 | Distinct confirmed/failed/cancelled/verifying/under-review states; no unverified no-deduction claim. | ADM-13 PAY-02 | W4-T03 W4-T04 |
| D38 | One Find My Application page, secure emailed links, generic response and abuse protection. | ADM-06 ADM-13 | W2A-T05 W4-T04 W3-T04 |
| D39 | Retry only definitive eligible outcome, never unresolved. | PAY-01 ADM-06 | W4-T03 W4-T04 |
| D40 | Refresh-safe confirmation with ref/batch/payment/truthful email status. | ADM-03 ADM-13 | W4-T04 W5-T04 |
| D41 | PDF attached to confirmation; staff resend/download; no public PDF access initially. | PAY-13 EML-01 | W5-T04 |
| D42 | Contact route for people unable to use bKash; existing manual staff process. | ADM-04 | W4-T04 |
| D43 | Hide passed display deadlines from public promotions; switch unchanged. | CAT-04 CMS-02 | W1-T04 W7-T05 |
| D44 | Responsive layouts, optimized media, accessible forms/keyboard/status, reduced motion. | SEC-07 CMS-06 | W4-T04 W7-T01 W8-T02 |

## CMS, reports and communications

| Decision | Approved rule | Requirement(s) | Owning task(s) |
| --- | --- | --- | --- |
| D45 | Website seven sections/fixed pages/SEO; Courses sole course editor. | CMS-01 CMS-03 CMS-08 | W7-T03 W7-T04 |
| D46 | Explicit Save content; instant visibility/order; Save and Show/Hidden. | CMS-07 | W7-T03 |
| D47 | Course/announcement slides, live facts, suppress unpublished/archived linked courses. | CMS-02 | W7-T03 W7-T05 |
| D48 | Date-derived upcoming/past events; genuine authorized reviews; no registration. | CMS-04 | W7-T03 |
| D49 | Reusable mentors, usage info, course/batch assignments; no assigned deletion. | CMS-05 CAT-07 | W1-T03 W7-T03 |
| D50 | Shared upload/optimize/preview/replace; protect references; existing images replaceable without code. | CMS-06 CMS-10 | W7-T01 W7-T02 |
| D51 | Central contact/social, structured existing pages and policies, essential links protected, optional SEO. | CMS-08 | W7-T04 |
| D52 | Unsaved guard, concurrency, hide-before-removal, audit, preserve prior policy wording; no general versioning. | CMS-07 SEC-05 | W7-T03 W7-T04 |
| D53 | Both roles CMS and website-scoped activity; global/staff SA only. | SEC-02 SEC-05 CMS-01 | W2B-T04 W7-T03 |
| D54 | Actionable Overview counts/quick actions/basic gross totals, no finance dashboard. | REP-03 REP-05 SEC-07 | W5-T01 W8-T01 |
| D55 | Read-only Transactions actual collections default, search/filter/view/link/export shortcut. | REP-01 REP-02 REP-04 | W5-T02 W5-T03 |
| D56 | Shared definitions, count each collection once incl cancelled admissions; waivers/free/test separate. | REP-01 REP-03 | W5-T01 |
| D57 | Shared configurable CSV/XLSX, filters/counts/safe handling/audit, no permanent file storage. | REP-04 | W5-T03 |
| D58 | Email queue in Admissions, exceptions Needs Attention, history/dispatch/retry/resend. | EML-03 EML-04 | W3-T04 W4-T09 |
| D59 | Confirmation priority over public recovery/bulk; quota/rate limits verified, safe deferral. | EML-02 | W3-T01 W3-T02 W2A-T05 |
| D60 | Subject/message, confirmed-recipient preview/quota/confirm/individual outcomes; cancel only unsent notices. | EML-05 | W6-T01 W6-T02 |
| D61 | Existing news archive static; no news CMS/page builder/complex approvals/marketing/media module. | CMS-01 CMS-10 REP-05 | W7-T05 W8-T01 |

## Staff, security and navigation

| Decision | Approved rule | Requirement(s) | Owning task(s) |
| --- | --- | --- | --- |
| D62 | Eight-module order; Settings hidden Admin; My Account both. | SEC-07 | W2A-T03 W8-T01 |
| D63 | Shared admin shell/forms/tables/dialogs/status/errors before individual modules. | SEC-07 | W2A-T03 W8-T01 |
| D64 | Exactly two roles, approved matrix, server/DB permissions. | SEC-01 SEC-02 | W2A-T01 W2A-T02 W2A-T03 |
| D65 | Invite-only staff, password and verified MFA before access. | SEC-01 | W2B-T01 |
| D66 | SA staff invite/role/deactivate/reactivate; attribution and last-SA guard. | SEC-03 | W2B-T01 W2B-T02 |
| D67 | Both roles My Account password/profile/authenticator replacement/logout. | SEC-01 SEC-04 | W2B-T03 |
| D68 | Secure password/MFA recovery identity proof, revoke sessions, audit, sole-SA emergency runbook. | SEC-04 | W2A-T04 W2B-T03 |
| D69 | Server idle/max limits and warning; 30m/12h proposed subject verification. | SEC-04 | W2A-T04 |
| D70 | Unsaved input temporary memory during reauth; revalidate, explicit resubmit, no automatic payment replay. | SEC-04 SEC-07 | W2A-T04 W4-T05 |
| D71 | Canonical pages/context links/breadcrumbs/validated return paths; preserve list state. | SEC-07 ADM-11 | W2A-T03 W4-T09 W8-T01 |
| D72 | Effective module search first; defer global search. | ADM-11 REP-02 SEC-07 | W4-T09 W5-T02 W8-T01 |
| D73 | One audit system scoped batch/website/global; global SA only. | SEC-05 SEC-02 | W2A-T02 W2B-T04 W7-T03 |
| D74 | Shared loading/empty/validation/success/concurrency/error states; avoid excessive confirms. | SEC-07 | W2A-T03 W8-T02 |
| D75 | Explain consequential actions; duplicate/stale/authorization protections. | SEC-06 SEC-07 PAY-01 | W2A-T03 W4-T05 W4-T06 W4-T08 |
| D76 | Desktop-first admin with essential mobile/keyboard access. | SEC-07 | W2A-T03 W8-T02 |
| D77 | Minimal authorized health email/scheduler/backup where available; no complex monitoring. | SEC-08 SEC-09 EML-04 | W3-T03 W3-T05 W8-T01 |
| D78 | Scenario-based UX acceptance before launch. | SEC-07 SEC-10 | W8-T02 W8-T03 W9-T07 |

## Supersession and unresolved boundaries

- D36 supersedes OD-009 old pending free-admission copy; D38 unifies status/resume entry, not payment authorization. D53/D73 expand Admin scoped audit beyond batch to Website; global remains SA-only. D46 clarifies immediate save as explicit Save for text; D63 moves shell earlier. D55 adds export shortcut without allowing mutations; D23 adds optional default-on move notice; D10 confirms question snapshot. D61 resolves static news; D29/D30/D43 resolve presentation. D56/D57 clarify report/export semantics. D69 remains conditional. Earlier PDF exclusion superseded by C-16, not refund exclusion.
- Do not adopt review-only proposals as approved: global search, waitlist, accounts, invoice/refund system, full CMS versions, media library, automated hero scheduling, report templates, case assignment, new role editor, installment/balance tracking, email-less walk-ins, public receipt download, automatic confirmation-without-PDF fallback.
- Same-student receipt reuse requires explicit eligibility, no unresolved prior attempt, no double allocation, correct amount and preserved original evidence. Corrections for wrongly attributed/never-received money and free/paid moves remain narrowly gated in plan §8. No new destructive capability.
- No fresh production verification; all provider assumptions, retention/policy wording, live test and cleanup require separate decisions/evidence in §8.

The original source register below is retained for historical traceability, including its original labels. It is not a second governing specification. TR-01–10 were subsequently approved; C-01–16 and D01–78 override conflicts. Use plan §2/§3 and the current decisions above, not older wording, for implementation. In particular, sponsor/optional references, prior free thank-you wording, PDF exclusion, batch-only Admin activity, and previously open CMS/UX choices are superseded.

## Appendix A. Historical OD and TR source register (verbatim, not controlling where superseded)

### 1.1 Course and batch management

| ID | Decision |
|---|---|
| OD-001 | The **Accept Applications** switch is manual only. Dates, deadlines and academic status never change it. Draft, completed and archived batches cannot accept applications whatever the switch says. Published upcoming and running batches accept applications whenever the switch is On. Public applications additionally require **both** the parent course and the batch to be published and non-archived. Switching Off never interrupts an existing eligible checkout (TR-01). |
| OD-002 | Courses stay publicly visible even when no batch accepts applications. Saved changes to published courses and batches appear immediately. Homepage, course pages and enrollment pages use the same published data. All supported course and batch content is editable in admin, with no JSON or code edits. Completed-batch public visibility is configurable per batch (mechanism: OD-108). |
| OD-003 | Course and batch are separate entities. Course info: name, description, curriculum, outcomes, audience, FAQs, thumbnail, default mentors. Batch info: batch number, dates, schedule, venue, mentors, fee, discount, capacity, enrollment settings. Course default mentors are a prefill only and never silently change existing batch mentors. Copying a batch carries no dates, deadlines, application switch, publication status, students, payments or history. Existing learners' agreed fees are protected from later edits. (The scarcity rule originally in OD-003 is superseded by OD-025.) |
| OD-004 | Batch status is fully manual: **Start Batch** (Running) and **Complete Batch** (Completed). Any status can be reversed or corrected (for example Running or Completed back to Upcoming) without changing academic dates and without affecting students, payments or history. Starting or completing one batch never affects another batch. |
| OD-005 | **Notify Students** button in each batch workspace: compose subject and message, preview recipient count, confirm. Optional notice when starting or completing a batch. Everything is manual, with no date-based scheduling. History and sending results are kept. Reversing or correcting a status must not cause duplicate notifications. |
| OD-006 | Free and paid batches are both supported, with pricing set per batch. Free batches need no payment information, payment attempts or verification. Applicants are enrolled directly after eligibility checks, and the confirmation email is sent. Capacity applies only where a limit is set. Existing free-enrollment functionality is reused where possible. |
| OD-007 | The course is a permanent offering. Enrollment controls, academic status, notifications, pricing, capacity and student records are independent per batch. |
| OD-022 | **Unlimited capacity is the default.** A fixed capacity is optional. |
| OD-023 | When a fixed capacity is reached, new applications are blocked. Raising capacity reopens enrollment. (Implementation detail in OD-028.) |
| OD-024 | No seat reserve. For fixed-capacity batches, the existing time-limited checkout hold protects a seat during payment. (Replaces the earlier 10-seat reserve.) |
| OD-025 | Fixed-capacity batches show the actual remaining seats. Unlimited batches may show an optional promotional label. It is a per-batch checkbox inside the existing batch configuration, default Off, with no separate table. |
| OD-026 | Normally one batch accepts applications at a time. This is not enforced technically. |
| OD-027 | The promotional label is presentational only and never affects eligibility, capacity or payment. It is hidden for closed, completed and archived batches. |
| OD-028 | A full fixed batch blocks new applications while the stored switch stays as the owner set it. The "closed" state is derived, never written to the switch. |

### 1.2 Admissions and student management

| ID | Decision |
|---|---|
| OD-008 | Paid batches: bKash automatic checkout. Once bKash confirms payment, the admission is confirmed automatically with no staff approval. |
| OD-009 | Free batches: no bKash or payment step. The student sees "We received your application, we will confirm your seat by email". |
| OD-010 | The confirmation email is sent automatically, subject to the Resend free-plan daily limit. |
| OD-011 | Free batches confirm automatically after the application passes eligibility checks. No staff review. |
| OD-012 | Staff can add a student to a batch manually (walk-ins, cash, bank transfer, sponsored). The student is confirmed directly, with no online application or bKash step. |
| OD-013 | Manual admissions record payment method (cash, bank, bKash personal), amount and optional reference. These appear in reports as manual collections. |
| OD-014 | The admin who made a manual admission, and when, is recorded automatically and shown on the enrollment. |
| OD-015 | Manual admissions accept any amount, with an optional note. |
| OD-016 | The amount field has a **Suggested amount** button showing the batch fee. One click fills it. Staff can type any amount. |
| OD-017 | Regular (paying) and waived students must both work correctly across admission, rosters, seat counts and reports. |
| OD-018 | Marking a student **Waived** requires a reason. Admin and date are recorded automatically. |
| OD-019 | A refund option exists in beta/testing only. (Refined by OD-088.) |
| OD-020 | **Cancel application** is the cancellation action. A note is required. Admin and date are recorded automatically. The seat is released and the record stays visible as Cancelled. |
| OD-021 | The portal never handles or tracks refunds in live. Money for cancelled students is settled manually, outside the system. |
| OD-029 | Duplicate protection applies within the same batch only. The same contact details can be used across batches and courses. |
| OD-030 | Phone numbers and emails are normalized before comparison. |
| OD-031 | A student with an incomplete application or pending payment can securely resume the existing application instead of creating another. |
| OD-032 | A confirmed student cannot enroll again in the same batch. |
| OD-033 | A cancelled applicant can apply again. History is preserved. |
| OD-034 | Manual admission lets staff search existing students by phone or email and prefills their details. |
| OD-035 | Authorized staff can resolve genuine shared-contact cases (for example family members) with a required reason. Admin and date are recorded automatically. |
| OD-036 | Public duplicate messages never expose another person's details. |
| OD-037 | Duplicate protection behaves the same for free, paid, waived and manual admissions. No mandatory student accounts, NID checks or other identity verification. |
| OD-038 | A duplicate is flagged when **either** phone **or** email matches within the same batch, with the staff exception from OD-035. |
| OD-039 | Existing application form fields are kept initially. Required versus optional is decided after the current fields are verified. |
| OD-040 | No extra academic eligibility rules. Publication, capacity and duplicate safeguards remain. |
| OD-041 | **Move to Another Batch** works within the same course. It checks destination capacity and duplicates, requires a reason, and records admin and date. It moves no money and creates no duplicate payment record. Original enrollment and payment history are preserved, with no double counting (TR-05). |
| OD-042 | A **Needs Attention** indicator marks exceptional admissions that need staff action. |
| OD-043 | Manual admission remains available when public applications are Off. |
| OD-044 | Expired applications are hidden by default, with an option to show them. |
| OD-045 | Search, filters and pagination are preserved when returning from an enrollment or student record. |
| OD-046 | Confirmation email status is shown on the enrollment, and staff can resend manually. |
| OD-047 | Incomplete, expired and cancelled applications stay out of the active roster. Their history and any received payments remain available in reports. |
| OD-095 | Accepted admissions defaults: an admissions list per batch (also reachable globally) with name, phone, status, payment type and date, filterable by status and payment type and searchable by name, phone and email. A student profile shows details, enrollment history across batches and an **Add to a batch** action that reuses the manual admission form. Students with any enrollment or payment cannot be deleted. There are no student accounts or logins. |

### 1.3 Payments and transactions

| ID | Decision |
|---|---|
| OD-048 | The Transactions page is strictly read-only. **View** is the only record action. No refund, edit, retry, delete or payout. |
| OD-049 | **Re-check with bKash** lives inside the affected application under Needs Attention, not on the Transactions page. It is a read-only status query that never starts a payment or refund. Pending payments are not assumed to be lost callbacks or successes. |
| OD-050 | A verified payment automatically confirms eligible admissions. Cancelled applications and other exceptions require staff attention. Verified payment evidence is preserved even when admission cannot be confirmed (TR-02). |
| OD-051 | Authorized, audited correction of incorrectly recorded **manual** payment details is available through the enrollment record. Original values are preserved in history. No cancel-and-re-add is needed. |
| OD-052 | Financial reports distinguish bKash collections, manual collections, total collections, waived fees, waived students and free enrollments. Cancellation never removes received payments from reports. |
| OD-053 | No separate finance dashboard, PDF receipts, coupons, installments or live refund functionality. |
| OD-054 | The launch starts with clean operational data. No test-data migration features. |
| OD-096 | Accepted Transactions defaults: default list shows verified bKash and manual payments. Failed, cancelled, pending and test records appear only through filters and never count in totals. Columns: date, student, batch, amount, method, bKash transaction ID, status, and "recorded by" for manual entries. Filters: date range, course or batch, method, status. Search: name, phone, transaction ID. The confirmation email carries amount, transaction ID and batch. |
| OD-097 | Test and sandbox records are labelled **Test**, hidden by default and excluded from every total and report. |

### 1.4 Staff, permissions and security

| ID | Decision |
|---|---|
| OD-055 | Two roles at launch. **Admin**: courses, batches, admissions, students, manual admissions, waivers, cancellations, batch moves, bKash re-checks, transaction viewing, CMS, reports, exports, student notifications, and operational email retry. **Super Admin**: everything Admin can do, plus staff management, role assignment, manual payment corrections, the **global** activity log and system settings. Admin can view batch-specific activity (OD-111). |
| OD-056 | Every staff member has an individual account. No second Super Admin is required at launch. |
| OD-057 | The last active Super Admin cannot be deactivated or demoted. |
| OD-058 | Deactivating a staff account revokes access immediately, even for an existing session. |
| OD-059 | MFA is mandatory for all staff, with a secure recovery procedure. Public staff registration is disabled. |
| OD-060 | The activity log is read-only and records actor, timestamp, action, reason and previous/new values where relevant. Passwords, API secrets, tokens and gateway credentials never appear in the portal or the log. |
| OD-061 | The permission design stays extensible. No custom roles, permission editor or security dashboards. |
| OD-098 | Accepted staff defaults: the Super Admin invites staff by email, assigns a role and deactivates (never deletes) accounts. Sessions time out after inactivity. Every action is authorized on the server, not only hidden in the UI. Exports are logged. |

### 1.5 Website and CMS

| ID | Decision |
|---|---|
| OD-062 | Homepage structure is retained: Hero slider, Partners, Courses, Events, Mentors, Reviews, Footer. All seven are admin-managed. Events and reviews are required at launch. |
| OD-063 | The hero supports multiple slides with add, edit, visibility, ordering and removal. A slide can promote a course or show a general announcement. Linked course and batch details come from authoritative published data. |
| OD-064 | Published courses appear automatically, with no recreating them in the CMS. |
| OD-065 | Events cover upcoming and past, with configurable public visibility. |
| OD-066 | Mentors, partners and reviews are reusable records. Images can be replaced directly. |
| OD-067 | Uploaded images are optimized automatically (WebP where appropriate). Alt text is suggested automatically and remains editable. |
| OD-068 | Content ordering uses simple controls. Preview is optional, with no draft or approval workflow. |
| OD-069 | English only. Contact information and social links are centralized. Existing branding and public design are preserved. |
| OD-070 | Routine content updates need no source-code, JSON or redeploy. No page builder, custom layouts, bilingual management or advanced marketing tools. |
| OD-071 | Existing CMS functionality is verified before replacement. Working components are reused. |
| OD-077 | A replaced image is deleted only when no other website content references it. |
| OD-099 | Accepted CMS defaults: each item has a Visible on/off toggle. Static pages (About, Privacy, Terms, Contact) use structured text with no raw HTML. SEO titles and descriptions are generated automatically, with an optional override for the homepage and courses. Uploads are limited to JPG, PNG or WebP with a size cap of about 2 MB. A mentor in use by a batch cannot be deleted, only hidden. |

### 1.6 Reports and email

| ID | Decision |
|---|---|
| OD-072 | Reports export as **CSV and Excel (.xlsx)**. Admins choose which available student fields to include. Filters: course, batch, status, payment type, date range. Roster export is available in the batch workspace. Financial exports follow OD-052. Every export is logged. |
| OD-073 | Needs Attention remains an operational list, not a separate report. |
| OD-074 | System emails use fixed branded templates. Enrollment confirmations and application resume links take priority over bulk announcements. Quotas and queued messages are managed automatically where possible. |
| OD-075 | Staff have a manual **Send Pending / Retry Failed** action as a fallback. Processing does not rely only on someone opening the portal. A reliable free scheduling option is evaluated in technical planning. |
| OD-076 | Provider acceptance is distinguished from actual delivery. Emails with an unknown outcome are never resent automatically. Sender address and Resend plan limits are confirmed before implementation. |
| OD-101 | Accepted email defaults: automatic emails are enrollment confirmation (paid, free, manual with a default-on checkbox) and resume link. Notify Students is manual. Cancellation and waiver emails are off unless ticked. Each enrollment shows email status and time. Notify Students keeps its own history of sent and failed counts. Emails are sent only after the database change is saved. |

### 1.7 Admin UX, launch and production

| ID | Decision |
|---|---|
| OD-078 | Eight sidebar items: Overview, Courses, Admissions, Students, Transactions, Website, Reports, Settings. Settings (Staff, Activity Log, System) is Super Admin only. Mentors, Partners, Events and Reviews live under Website. |
| OD-079 | The batch workspace has **Details, Students, Notifications, Activity** (the Activity tab shows that batch's activity only, OD-111). Academic status and application availability are shown as separate, visually distinct indicators and are never merged into one misleading status. |
| OD-080 | Quick actions reuse existing forms instead of creating duplicate workflows. |
| OD-081 | The entire admin portal is responsive and functional on mobile. Desktop remains the primary design target. |
| OD-082 | Operational email management and retry actions are accessible to Admin. |
| OD-083 | Existing branding is preserved, with consistent navigation, forms, tables, confirmations and status indicators. |
| OD-084 | The launch is a clean operational start. Existing operational records are test data, subject to verification against actual bKash transactions. Preserve MTO and IRGP course content, relevant batches, mentors, website content, images, database structure and authorized staff accounts. |
| OD-085 | Unverified historical student counts are removed. Genuine IRGP historical records can be added manually later. Removal is a pre-launch requirement (TR-09). |
| OD-086 | No destructive reset without a verified backup and the owner's explicit approval of the exact deletion scope. |
| OD-087 | Prefer free or low-cost infrastructure. Verify commercial-use restrictions, service limits and production suitability before recommending paid upgrades. No paid subscription is approved. |
| OD-088 | Beta and production payment environments are isolated. **Production has no executable refund capability.** (Refines OD-019.) |
| OD-089 | Before launch, verify: migration consistency, runtime compatibility, MFA recovery, staff permissions, email configuration, bKash live readiness. |
| OD-090 | Rollback planning accounts for database compatibility, not only reverting the Vercel deployment. |
| OD-091 | Privacy, Terms and payment/cancellation policy pages are manageable through the CMS. |
| OD-092 | A suitable personal-data retention policy is established. Records are not automatically kept indefinitely. (Periods are [OPEN].) |
| OD-093 | The official email sender address and hosting configuration remain pending verification. |

### 1.8 Restored and added in v1.1

| ID | Decision |
|---|---|
| OD-102 | **Venue and class schedule are free-text fields** at batch level. |
| OD-103 | Batch numbers are generated **automatically in sequence per course**, with duplicate protection. An optional, manually entered **batch label** (for example "Evening") is available. |
| OD-104 | An optional **enrollment deadline** may be entered. It is display-only. It never gates applications and never changes the Accept Applications switch (consistent with OD-001). |
| OD-105 | When more than one batch of a course is open for applications, **the student chooses their preferred batch**. |
| OD-106 | A draft batch with no protected dependencies (no enrollments, payments, attempts or notification history) can be deleted. Anything else can only be archived. |
| OD-107 | A fixed capacity cannot be reduced below the seats currently occupied **and reserved** (confirmed, in-progress holds and any other seat-consuming records). |
| OD-108 | The existing **publication control** is reused for completed-batch public visibility. Changing visibility never changes academic status. |
| OD-109 | The Course and Batch workflow is otherwise unchanged from v1.0. Existing OD identifiers are retained. |
| OD-110 | **MTO capacity is unlimited.** (Replaces the current fixed capacity of 50 for the live start. The change itself is a task for the reset and launch preparation, not an action taken by this document.) |
| OD-111 | **Admin can view batch-specific activity** in the batch Activity tab. **Super Admin controls the global activity log.** |

### 1.9 Technical invariants [REC pending owner approval]

These are integrity rules, not owner preferences. They keep the agreed simplifications safe.

| ID | Rule |
|---|---|
| TR-01 | **Switching Off does not interrupt an existing eligible checkout.** Off blocks *new* applications only. A checkout is eligible if the application was validly started, its hold or application window has not expired, and the parent course and batch are still published, non-archived and not Draft or Completed. Otherwise the payment is recorded and the case goes to Needs Attention (TR-02). New application and existing payment continuation remain distinct paths. |
| TR-02 | **Verified payment evidence is never lost.** If admission cannot be confirmed (batch full, expired hold, batch archived, unpublished or completed), the verified payment is still recorded and flagged for staff. |
| TR-03 | **Idempotency.** Repeated bKash callbacks and repeated Re-check calls never create a second payment record or a second admission. Payment references are unique, and confirmation is safe to run more than once. |
| TR-04 | **Keep four money concepts distinct** in data and reports: *agreed fee* (the snapshot at enrollment), *discount*, *actual collection* (verified bKash plus manual payments) and *waiver*. A partial or different manual amount never rewrites the agreed fee. |
| TR-05 | **Batch moves preserve history without double counting.** The original enrollment and its payment stay on record. The new enrollment links to the original. Reports count the student and the payment once. |
| TR-06 | **Removing refund complexity keeps payment integrity safeguards:** server-only payment verification, never trusting browser input, unique references, integer poisha, fee snapshots, audit records, atomic operations and no replay of uncertain money-moving operations. |
| TR-07 | **Email wording is precise.** Provider acceptance is shown as "Accepted by provider". "Delivered" appears only when a delivery event confirms it. If delivery events are unavailable, the UI never claims delivery. |
| TR-08 | **Production has no executable refund capability** (OD-088). Beta payment tests stay isolated from production. |
| TR-09 | **Historical student counts are removed before launch** (OD-085), after confirming that nothing depends on them. |
| TR-10 | **Extensions are verified against the approved SRS and addendum** before their wave starts. Unapproved extensions are escalated, not built silently (section 6.1). |


---


## Appendix B. Controlling corrections C-01–C-16

| ID | Controlling decision |
|---|---|
| C-01 | Manual and online application fields identical, including all configured course questions. One shared validation/configuration. |
| C-02 | Exactly five manual payment options listed in PAY-03. Full and partial waiver; remove Sponsor Payment. |
| C-03 | Default fee from batch; individual fee editable; full waiver zero; partial auto-deduction and remaining channel. Original batch pricing untouched. |
| C-04 | Mandatory trimmed reference minimum one character for every manual option; waiver reason still required; no installment handling. |
| C-05 | Record authenticated staff identity and server-generated timestamp automatically. Preserve money concepts separately. |
| C-06 | Preserve original Moved admission with linked destination, no duplicate payment; no in-place batch rewrite that loses history. |
| C-07 | No refund processing, ledger or tracking; no routine purge. Read-only Transactions; CSV and XLSX. |
| C-08 | Fixed seven-section homepage, one course editor, verified database cutover, no production JSON fallback thereafter. |
| C-09 | Retain Supabase Free and verified Node26.13/pnpm12.16.1 subject to host compatibility. Commercial hosting mandatory, evaluate ExonHost first. R2 and Sentry optional. |
| C-10 | Preserve W2A-before-W1 ordering, W2B/W3 may proceed independently, Wave9 required. No implementation, destructive action, paid plan or production changes by approval of this draft alone. |
| C-11 | APPROVED: authorized staff can associate an existing verified receipt with an eligible admission, without a new collection. |
| C-12 | APPROVED: staff can mark payment exceptions reviewed with mandatory note and audit history. |
| C-13 | APPROVED: controlled temporarily restricted live checkout test before general enrollment. Exact method and amount need separate approval; no test charge authorized here. |
| C-14 | APPROVED: genuine free-batch manual admissions need no payment reference; five paid-batch options still require reference. |
| C-15 | APPROVED: automatically audit individual fee adjustments without an additional mandatory reason. Waiver and correction reasons remain required. |
| C-16 | APPROVED: add branded PDF payment receipts for actual positive paid-admission collections, attach to the existing confirmation email, provide download in admission details, unique receipt number and preserved correction history. Free and fully waived admissions receive confirmation only. No new receipt-management module; no refund tracking or additional email. |

OD-094 and OD-100 are numbering gaps in the original v1.1 register, not missing requirements to invent. TR-10 is a scope-verification gate for every affected task/wave: stop and escalate unapproved extensions.
