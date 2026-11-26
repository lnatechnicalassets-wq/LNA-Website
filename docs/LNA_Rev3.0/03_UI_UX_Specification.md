# LNA Rev3.0 | UI/UX specification

**Status:** Planning specification, 26 November 2026. D01–D78 approved; detailed component choices below are proposed design contracts unless explicitly required by those decisions. No implementation or production changes authorized. This is a textual specification, not a visual prototype or tested interface.

## 1. Shared design foundations (W2A-T03, W8-T02)

Preserve official branding and Deep Teal & Pearl: background #F6FAFA, text #172E35, primary #086477, soft accent #C5E2E5. Use existing Next.js/TypeScript/Tailwind 4/Radix primitives; no new dependency or palette without review. Use restrained semantic warning/error/success colors with text; do not encode state by color alone. English interface, Bangladesh time (Asia/Dhaka), BDT consistently; money stored as integer poisha. Use actual source content, not placeholder people, counts or dates.

- Admin: desktop-first left sidebar, compact top bar, breadcrumbs, page header with one main action, contextual secondary actions; mobile drawer and stacked cards for essential flows. Sidebar order Overview, Courses, Admissions, Students, Transactions, Website, Reports, Settings (Super Admin only). My Account and logout accessible to both. No global search until justified.
- Forms: one canonical component per workflow, visible labels, required/optional indicators, inline errors plus focused summary, pending submit guard, safe idempotent result lookup, unsaved guard, no sensitive persistent browser drafts. Context prefill does not bypass server validation. Use accessible native controls/Radix patterns; keyboard focus visible, accessible dialogs, reduced motion, live status announcements and sensible target sizes. WCAG 2.2 AA target, verify manually and automatically.
- Lists: shared table/card, search and filter controls, stable server pagination, explicit hidden defaults, loading/error/empty distinctions. URLs preserve validated list state and return route; avoid sensitive data in logs/analytics/third-party referrers. Link canonical records, not duplicate editors. Restore list position on back. Admin-only scope enforced server/DB, never merely hidden UI.
- Action feedback: routine reversible edits save directly with truthful feedback; consequential changes show impact and confirmation; required reasons for waiver/cancel/move/exception/payment correction and relevant recovery actions. Conflicts show current state and what changed without exposing unauthorized data. Never promise Undo of a financial mutation; an authorized reversal is a new audited action with guards. Error messages provide next step/reference, not raw provider/database errors.
- Every screen distinguishes loading, empty dataset, no filter results, failure, forbidden and success. Failed queries never display fabricated zeros. Session warning before expiry, reauthenticate as same authorized user, explicit resubmit using original key after checking outcome. Clear sensitive memory if role/account changes, signout or deactivation.

## 2. Public site (W1-T04, W4-T04, W7, W8)

| Screen | Content hierarchy | Actions and conditional behavior |
|---|---|---|
| Header/footer | Official logo; courses, mentors, events, contact; Find My Application; essential policy links and central contact/social | Valid existing routes/anchors; compact mobile navigation. No new page builder or student login. Preserve static news archive; no new course index unless separately justified. |
| Homepage | Hero Slider → Partners → Courses → Events → Mentors → Reviews → Footer | Keep order. Hide optional sections with no visible genuine content. Essential navigation/footer usable; if no hero slides use neutral approved brand presentation, not fake content. Course slides derive fee/start/availability from source, suppress unpublished/archived. Pause carousel/reduced motion. First hero image prioritized; other media lazy where appropriate. |
| Course details | Name, outcome, batch panel, fee/date/schedule/venue, audience, curriculum, mentors, FAQs, relevant genuine reviews, policy/contact | Published nonarchived course remains visible with no open batch. One eligible batch auto-selected; multiple explicitly select; accepting first, other published batches clearly distinguished, historical batches collapsed where appropriate. No apply CTA for ineligible batch; contact alternative. Running batch labelled as already started. |
| Batch card | Number/label, stage, dates, schedule, venue, mentors, actual fee/discount/payable, eligible state | Fixed capacity actual availability; unlimited no fictitious numeric count, optional truthful promo label. Future display deadline informational; passed deadline hidden from promotion. Selection revalidated on server. |
| Enrollment | Contextual course/batch summary, full name/email/phone, shared configured course questions, fee, policy acceptance | No account/password or repeated email/course inputs. Current MTO required university/department/professional phase, optional goals; real select options. Phone +880/local normalization; email typo hint and visible address. Fee change before creation forces reconfirmation. Paid Continue to bKash; free Submit Application; contact for alternative payment. If eligibility lost preserve valid input in memory and show alternatives. |
| Handoff | Application reference, expected amount, session expiry if known | Server-created attempt only, one authorized redirect; fallback link to same valid attempt. No browser-trusted money evidence. |
| Return/confirmation | State-specific heading, reference, course/batch/date/venue, verified payment summary where applicable, actual email state | Refresh-safe scoped access; no side effects on reload. Confirmed/free confirmed view, verifying with no pay retry, definitive failed/cancelled retry only if eligible, received-under-review contact; expired/invalid access link directs to Find My Application. No public PDF download. |
| Find My Application (/status) | Email input, secure access link request, generic response, help/contact | Email on file only, rate-limited, no contact-only proof or PII disclosure. Valid scoped token opens application status and eligible continuation; status alone never charges. Multiple matching applications shown only after scoped proof. Revoke old tokens on contact correction; expiry/replay rules verified. |
| Policies/contact | Approved text, effective/updated date, accessible structured content; real contact methods | Show approved terms/payment-cancellation policy before paid checkout and capture consent version. No assumption of no refunds from tooling exclusion. |

### Public state and copy contract

| Verified domain state | Student-facing heading / next step |
|---|---|
| Eligible confirmed paid | Your seat is confirmed. Payment received [amount]. Confirmation and receipt email is being prepared (or actual evidenced status). |
| Eligible free | Your seat is confirmed. We are preparing your confirmation email. No payment block or receipt. |
| Initiated/pending/unknown | We are checking your payment. Please do not pay again until your payment status is confirmed. Reference and support; rate-limited query-only check if supported. |
| Definitive failed/cancelled | bKash reported that the payment did not complete / was cancelled. If you see a deduction, contact us before paying again. Retry only after trusted definitive safe outcome and valid eligibility. |
| Verified money, seat unavailable | Payment received, admission under review. Contact admissions with reference. No seat promise or pay button. |
| Expired without unresolved attempt | Application expired; restart only if eligible. Unresolved money always remains in verifying/under-review branch. |
| Duplicate/contact collision | Generic unable-to-submit message; secure recovery/contact; no other record disclosed. |
| Cancelled/moved admission | Current truthful seat state; show authorized linked destination where applicable; no internal reasons or raw financial evidence publicly. |
| Email queued/failed/unknown | Confirmed seat unaffected; email being prepared, delayed or needs review as applicable. Accepted by provider is not delivered. |

Do not show a countdown invented from browser time; use trusted expiry. No unsolicited claims about deduction/refund. Do not promise an email delivery time before provider/scheduler verification. Display only safe references and masked contact in protected views. Confirmation email includes official contact, batch, payment summary and eligible PDF; no invented tax/legal certification. Free and full waiver have no receipt. Receipt failure remains queued and visible to staff.

## 3. Courses (W1, W7-T04)

| Screen | Layout and actions |
|---|---|
| Courses list | Search name, publication/archive filter, thumbnail/name, active batch counts, computed accepting count; New Course and New Batch contextual link. |
| Course workspace | Header publication action, Batches / Course Details / Application Form tabs. Details: name, descriptions, thumbnail/alt, audience, outcomes, curriculum, FAQs, default mentor roster. Separate save from publication. Application Form: locked core fields and editable configured questions, type/required/options/order/visibility; preview shared form; preserve versions. Reserve tab early, only enable when working. |
| New batch / Details | Same form: start from blank/default mentors/copy; number assigned server-side; optional label; start/end/deadline; free-text schedule/venue; mentor picker; explicit Free/Paid, fee and discount, computed payable; unlimited/fixed capacity and promo toggle. No default Free; copy excludes dates/deadlines/publication/switch/operational history. Show copy review and fee impact. |
| Batch header | Academic stage, publication, archive, Accept Applications switch, derived effective availability with reasons, capacity (confirmed/held/remaining for fixed; unlimited otherwise). Header actions publish/unpublish/start/complete/reverse/archive; explicit target state, preview any resulting reopen. Dates do not mutate lifecycle/switch. |
| Batch Students | Confirmed roster by default, all applications and Needs Attention filters; same admission component scoped to batch. Add Student batch prefilled, export roster, links to canonical admission/student pages. Full blocks staff; link to capacity edit. Public Off is not staff gate. |
| Batch Notifications | Compose, preview confirmed recipients, quota, confirm; per-recipient and aggregate history. Optional start/complete notice default Off; move notice default On in move flow. |
| Batch Activity | Actor/time/action/reason, scoped before/after, linked moves in both batches. No edit/purge. |

Show eligibility reasons from one server-authoritative service. Publish/restore/reverse may change effective intake while switch stays On; show consequences and obtain explicit action, never silently toggle. Full blocks new intake, existing held seat honored when otherwise eligible. Archive retains records, no automatic cancellation. Delete only genuinely unused dependency-free draft; proposed predicate never published/never accepting, no protected admission/attempt/receipt/email or other dependencies; confirm exact predicate W1-T01. No ordinary completed/draft/archived staff admission.

## 4. Admissions and Students (W4/W5)

| Screen | Layout and actions |
|---|---|
| Admissions list | All applications (expired hidden by default, search includes them), batch filter, Needs Attention and Email activity views. Search name/normalized phone/email/application/payment ref/TrxID/receipt number; date/status/method/course/batch/source filters. Row name, batch, admission/payment/email states, flags, next action. Receipt and financial mutations on admission detail, not Transactions. |
| Student directory | Person identity, contact, enrollment count/history, recent batch and open cases. Default seat history, applicants searchable; proposed default to confirm in task. Search/prepopulate existing student. No duplicate person creation for returning student; ambiguous matches require resolution, no automatic merge. |
| Student profile | Contact details, audited Edit Details, enrollment history with lineage, previous course answers, Add to Batch. No editable money; preserve issued documents. |
| Add Student | Same contextual form from Overview/Admissions/batch/profile; select eligible course/batch; find existing or create, fill missing shared fields; contact corrections explicit; previous same-course answers editable with source hint; payment block; confirmation checkbox default On; read-back amount/reference; one commit. Desktop wide form or sheet, mobile full-screen; exact component choice task-level. |
| Success | Persistent admission confirmed, batch, payment and receipt number if issued/ready, truthful PDF pending/failed and email queued/not requested; Download Receipt when authorized/ready, Add Another (retain batch, clear student), View Admission. Refresh no resubmit. |
| Admission details | Summary, seat status and source, student/answers, payment fee/waiver/collection snapshot, attempts, receipt versions, email history, record activity. Next action derived; contextual Cancel/Move/Apply receipt/Mark reviewed/Resend/Re-check. SA-only Correct Payment. |
| Needs Attention | Single Admissions queue with category, severity, age, student/batch if known, verified amount/evidence reference, state, next action; attempt-only cases supported. Reviewed cases filterable with outstanding financial evidence preserved. Email and receipt categories separate from money. No case assignment engine. |
| Email activity | Filter type/state/batch; last verified job status, counts/quota if known; Send Pending (existing intents), Retry Failed, explicit review of Unknown; per-admission history, contact correction and resend. No ninth module. |

### Manual payment fields

| Option | Fee and collection | Required information |
|---|---|---|
| Cash | Applicable fee prefilled from batch payable, editable; amount received = fee | Cash payment reference |
| Bank Transfer | Same | Bank reference |
| bKash Transfer | Same | bKash TrxID; block existing actual receipt collisions |
| Full Fee Waiver | Final payable/received zero, waiver equals applicable fee | Waiver reference and reason |
| Partial Fee Waiver | Editable applicable fee, 0 < waiver < fee; remaining auto-calculated and paid via Cash/Bank/bKash Transfer | Remaining channel reference and waiver reason |
| Genuine free batch | No payment controls or reference | Shared application fields only |

Paid-batch options require trimmed reference >=1 character, actual received amount positive except full waiver. Individual adjustment audit old/new fee without separate required reason. Repeated cash/bank reference warning plus acknowledgement; never a blanket uniqueness assumption. Canonical bKash duplicate blocked. Existing eligible collection reuse is a locked linked-payment context, not sixth option; explicit selection and ownership/amount/allocation checks. Server records actor/time. Display original fee, discount, individual adjustment, applicable fee, waiver and amount received; never confuse waiver with adjustment. Example BDT 3,500 less 500 discount, adjusted to 2,800 less 500 waiver = 2,300 received. No installments or outstanding balance workflow.

### Status model

Separate admission (Incomplete/Pending/Confirmed/Expired/Cancelled/Moved), payment (not required, awaiting, checking/unknown, definitive failed/cancelled, gateway verified, staff recorded, full/partial waived), receipt (not applicable/pending/issued/current corrected/superseded/failed), email (not requested/queued/sending/accepted/delivered/definitive failure/bounced/unknown), and attention flag. Exact persistence enums mapped in state contract; UI labels not automatic schema changes. Review acknowledgement does not remove financial evidence or imply resolution. Reopen on material new evidence. Status action mapping uses server permission/eligibility. Never automatically resend Unknown.

### Payment and receipt interactions

Re-check reads existing attempt status (Query only), may settle trusted eligible payment, never Create/Execute/Refund. Cancel explains seat release and preservation of collection, no refund processed by system. Move shows eligible same-course destination, before/after seat, price difference informational and existing receipt, mandatory reason, notify student default On. Free/paid move edge case remains gated; no automatic charge/waiver/refund. SA correction shows old/new amount/method/ref, reason and receipt version impact; unsupported erroneous/wrong-student correction blocked pending explicit narrow policy. Receipt: branded A4 proposed, selectable text and Bengali-name rendering verified, unique stable number, issue/payment date, name, original course/batch, fee/discount/adjustment/waiver/received, channel/ref, official contact and acknowledgement. No raw secrets, internal notes, tax claim or fabricated signature. Historical documents immutable, corrected linked version; no PDF on free/full waiver; private admission-detail download only. Pending PDF queues same confirmation, no automatic separate email.

## 5. Website CMS (W7)

| Section/editor | Fields and behavior |
|---|---|
| Website landing | Seven sections in order with visible/hidden counts and actionable warnings, pages, SEO, Website Activity. |
| Hero Slider | Course-linked or announcement; title/supporting text/image/alt/visibility/order, link where applicable. Live course facts not editable duplicate fee/date. Suppress unpublished/archived linked course, no ineligible apply. |
| Partners | Name/logo/alt/optional validated link/visibility/order. Preserve logo ratio. |
| Courses | Presentation/order and visibility explanation, link to Courses; no second editor. |
| Events | Title, start/end, venue, description, optional image/link, visibility; date categorization upcoming/past; no registration. |
| Mentors | Name/designation/bio/photo/alt/visibility and usage links; assignment via Courses/batch. Hide rather than delete assigned records. |
| Reviews | Genuine authorized quote, name/descriptor, optional course/photo, visibility/order; no fake count/rating. |
| Footer/contact | Central official contact, brand text/social, generated essential links; no repeated inputs across Contact/footer. |
| Pages | Existing About, Contact, Privacy, Terms, Payment & Cancellation; structured sections/safe text/links, fixed slugs, policy wording history/effective date; protected essential links. No page builder/raw HTML. |
| SEO | Automatic title/description and optional overrides, share image; course override in canonical editor, link from Website. |
| Website Activity | Both roles scoped read-only history; global/staff events not accessible to Admin. |

Editors use explicit Save, instant visibility/order, Save and Show/Hidden, accessible reorder controls, inline image preview and suggested editable alt, unsaved warning and conflict guard. Hide before eligible removal, protect referenced files. Shared image upload JPG/PNG/WebP, server content validation, responsive optimization, preview, reference-safe replace (one use only), existing assets replaceable without code. No separate media library or automatic deletion of referenced objects; cache bounds and withdrawal verified, not invented. No general CMS version system; prior policy text retained. Truthful save/cache status; public cutover after parity, no stale JSON fallback. Static news remains separate, no new CMS.

## 6. Overview, Transactions, Reports, communications (W3/W5/W6/W8)

| Screen | Requirements |
|---|---|
| Overview | Admissions, accepting/active batches, open exceptions, email queue; basic gross recorded operating collections with online/manual split; counts link to equivalent filters; quick actions Add Student, New Batch, Needs Attention, Export Roster; actual health warnings only. No separate finance dashboard. |
| Transactions | Read-only collections by default; date/student/course/batch/amount/source/method/ref/status/actor and receipt state. Search/filter incl test and attempts opt-in, link to admission/case, export shortcut using shared dialog. Distinguish gateway verified and staff recorded. No edit/recheck/refund/delete; free/full waived in other reports. |
| Reports | Roster, course/batch summary, collections, waiver/adjustment reports. Shared filters, row count, selected fields, CSV or true XLSX; safe defaults, preview, audit metadata, no permanent generated file. Collection source date/batch retained, roster destination; live test separate; not revenue/net. |
| Notify Students | Subject/message, active confirmed roster count and snapshot, preview, quota impact, explicit confirm, individual email dispatch, history and per-recipient outcomes. Cancel only unsent notices; no recall of accepted/sending/unknown. |

Canonical server query definitions shared across counts, lists and exports. Totals cover filtered dataset, not current page; unknown query shows error. Dates use Asia/Dhaka; provider quota reset separately verified. UTF-8 CSV and true XLSX; preserve phone text and neutralize formula injection. No extra file store, report template engine or marketing automation. Confirmation priority over recovery and bulk; durable queue and actual quota evidence; accepted not delivered; explicit manual review unknown; no public recovery abuse exhausting quota.

## 7. Staff, My Account and Settings (W2A/W2B)

| Screen | Requirements |
|---|---|
| Sign in / invitation | Invite only; generic failures, rate-limit, password setup and mandatory verified MFA; AAL1 cannot access protected routes. Safe validated redirect. |
| My Account (both roles) | Name/profile, password management, authenticator replacement with verified identity, logout. Email/role changes not self-service unless separately approved. |
| Settings → Staff (SA) | List name/email/role/invited-active-deactivated/MFA status as available; invite default Admin proposed; role changes, deactivate/reactivate, secure recovery, no deletion. Last active SA guarded server/DB. |
| Settings → Global Activity (SA) | Filter actor/action/entity/date; redacted before/after, reason, links; no edit/delete. |
| System status | Minimal authorized actual email/job/backup status, unknown when not verified. No sensitive secrets or complex dashboard. |
| Session dialogs | Proposed 30m idle/12h max subject to verification; advance warning, explicit extension where allowed; reauth same authorized staff, temporary in-memory input only, no automatic payment replay. |
| Recovery | Verified identity and proof-bound recovery, invalidate sessions and enforce MFA before access. Secure replacement when old authenticator works; audited recovery when lost. Sole-SA emergency runbook outside normal portal, isolated drill. |

Admin sees operational modules and authorized batch/Website/record activity, SA sees global plus staff/system and manual corrections. No self-escalation or public signup; direct API/DB/Storage protections tested. No developer-dependent routine operational workflow.

## 8. Definition of design completion

Before each task: review its screen behavior, state/copy, permission, happy and recovery paths against decisions and acceptance register. Before launch, W8 verifies scenario walkthroughs (representative staff and students), keyboard/mobile, actual performance and no inaccessible dead tabs. All data and interface examples here are illustrative; final exact spacing, wording beyond approved contracts, route names, provider limits and technical thresholds resolved in task briefs, not claimed tested.
