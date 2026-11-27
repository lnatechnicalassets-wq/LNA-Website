# LNA Rev3.0 | User workflow specification

**Status:** Approved requirements translated into proposed implementation journeys, 26 November 2026. No implementation or production changes authorized. Exact routes/components are design choices, not observed current UI.

## A. Public student workflows

| ID | Entry and steps | Completion / recovery |
|---|---|---|
| WF-P01 | Homepage → course card/hero → course details → choose accepting batch (single auto-selected; multiple explicit) → application with prefill → shared required fields → fee and approved policy acceptance → Continue to bKash → hosted checkout → server return | Verified eligible: confirmation, reference, queued email with PDF. Stale fee requires reconfirm before application creation. Closed/full at submit retains valid input and offers alternatives. |
| WF-P02 | Published closed/batchless course → course details → contact | No false apply button, no inaccessible course. |
| WF-P03 | Free batch → same application fields → Submit Application | Eligible seat immediately confirmed even gateway unavailable. Confirmation email queued independently; no payment attempt or PDF. |
| WF-P04 | Return after definitive failed/cancelled payment → evidence-based message → eligible retry | Existing application/fee snapshot retained if authorized; new attempt only after safe definitive outcome. If deduction suspected contact support before retry. |
| WF-P05 | Network drop, timeout, closed browser or callback missing → return/status → verifying → query-only reconciliation | No second charge/Execute while unknown. If verified and eligible auto-confirm; if ineligible preserve money and flag Needs Attention. If no final status, show contact/reference, no promise of deduction status. |
| WF-P06 | Find My Application → registered email → generic acknowledgement → scoped expiring link → authorized application view | Check state or guarded eligible continuation. No account, no contact match disclosure. Expired/revoked link generic recovery. Abuse limits reserve confirmation quota. |
| WF-P07 | Confirmed student loses email/receipt → status or contact → staff verifies entitlement → resend from admission | Current eligible PDF attached to same confirmation template; audited explicit resend; no new collection or receipt number. |
| WF-P08 | Unable to pay through bKash → contact admissions → staff manual pathway | No public manual payment evidence upload; existing five-option staff process only. |
| WF-P09 | Returning student applies to different batch/course → shared form/browser autofill → eligibility/identity check | Existing verified identity linked safely; no public PII prefill on contact match alone. Same-batch confirmed duplicate blocked; cancelled can reapply subject to eligibility and existing payment guard. |

## B. Catalog and batch workflow

| ID | Steps | Invariants / recovery |
|---|---|---|
| WF-C01 | Courses → New Course → enter required content/default mentors → Save unpublished → publish explicitly | Published course may have zero accepting batches. No implicit intake opening. |
| WF-C02 | Course → New Batch → blank/default mentors/copy previous → edit number label/schedule/venue/new dates/mentors/explicit Free or Paid/capacity → Save | New numbered draft, switch Off, unpublished; no copied dates/deadlines/students/attempts/payments/publication/history. Copy reusable fields only; review stale free text. |
| WF-C03 | Batch Details → complete required fields → Publish → Accept Applications On | Independent controls; show every blocker. Warn before any action reopens intake. No date-driven status. |
| WF-C04 | Batch → Accept Applications Off | New public intake blocked; eligible authorized checkout may finish. Staff eligible direct admission unaffected. Verified money always settled independently of eligibility. |
| WF-C05 | Batch → Start/Complete/Correct status → consequence preview → optional start/complete email default Off → confirm | Stage changes only; dates/other batches/money unchanged. Reverse never auto-sends. If reversal reopens intake, warn and allow explicit switch change separately. |
| WF-C06 | Batch capacity → switch fixed/unlimited or raise/lower → server floor check → Save | Occupied plus valid held seats floor; Full does not toggle switch; raising may reopen eligibility. MTO unlimited only at approved launch configuration. |
| WF-C07 | Batch fee/discount edit → review existing-application impact → Save | Old application snapshot retained, new applications use new price; explicit pricing mode; unsupported mode conversions gated. |
| WF-C08 | Course Application Form → edit configured question → save new version | Both online/staff current config; existing application retains question version and historical answers. |
| WF-C09 | Not-run/obsolete batch → archive impact preview → confirm | Never auto-cancel students or alter money. Genuinely unused draft may delete after exact dependency check; no operational history deletion. |

## C. Admissions, student and payment workflows

| ID | Steps | Completion / recovery |
|---|---|---|
| WF-A01 | Overview / Admissions / Batch Students / Student Profile → Add Student → choose context → search student → select/create → complete shared fields → choose payment or free → review → confirm | Single atomic admission, seat, collection/audit and outbox intent where selected; success panel; PDF post-commit; Add Another retains batch only. No second-person routine review. |
| WF-A02 | Existing student → profile → Add to Batch → prefilled identity/relevant answers → review new required questions → eligible payment | One student, separate admission. Contact edit separate audited action, no silent overwrite. |
| WF-A03 | Staff finds unfinished public application → inspect attempt → query-only recheck if unresolved → continue same record only if safe/no unresolved attempt → record approved manual option | Preserve old source/attempts and invalidate obsolete checkout. Pending/unknown blocks new collection; late distinct verified evidence retained and flagged, not double-count identical money. |
| WF-A04 | Shared contact collision → inspect existing identity → explicitly attest different student and required reason → eligible Add Student | No automatic merge or bypass; preserve audit, same-batch duplicate and capacity rules. Public generic response only. |
| WF-A05 | Caller quotes phone/TrxID/ref → Admissions search (including expired) → admission/attempt detail → inspect payment/email | If paid confirmed and email queued, dispatch existing intent; definitive fail retry; Unknown requires explicit review/warning; unresolved payment query-only recheck. |
| WF-A06 | Needs Attention → verified receipt without seat → inspect merchant/amount/student/context → choose eligible admission or same-student re-admission → note → confirm link | Atomic allocation, one collection, one active allocation; no sixth payment method. Reject mismatch/unverified/foreign/other student/already allocated. No automatic selection or unsupported transfer. |
| WF-A07 | Extra genuine receipt or mismatch → case detail → read evidence → Mark Reviewed with mandatory note | Preserve all evidence and financial flag; distinct verified LNA collection counted once; reviewed not financial resolution. Material new payment evidence reopens. |
| WF-A08 | Admission → Cancel → consequence preview + mandatory reason → confirm | Seat released atomically, cancelled stays cancelled even late callback; collection/PDF preserved, no refund action. |
| WF-A09 | Cancelled student returns → Admit Again → select same-student eligible previously received collection if reusable → review/note → confirm new linked admission | No second collection or receipt; old admission remains cancelled. Exact allocation release/transfer conditions gated in W4; no arbitrary unallocation. |
| WF-A10 | Admission → Move → eligible same-course destination → capacity/duplicate/fee-impact review → reason → Notify student checkbox default On → confirm | Source Moved, destination linked, history and receipt original, roster destination. Moving back creates new linked admission. No new collection/waiver/automatic charge/refund; exceptional free/paid move policy gated. |
| WF-A11 | SA opens manual payment correction → compare old/new fields → reason → confirm | Atomic audit and canonical report effect; original PDF preserved, new corrected version; optional explicit audited resend. Admin and gateway edits denied. Wrong-student/no-money factual error path not authorized until defined. |
| WF-A12 | Receipt generation or attachment fails → persistent confirmed admission + queued confirmation → Needs Attention → authorized retry | Stable receipt number; no rollback, no separate automatic email, no false attachment sent claim. |
| WF-A13 | Student contact correction → audited edit and duplicate check → revoke old recovery tokens → supersede unsent incorrectly addressed messages → explicit resend if needed | Preserve prior sent recipients and issued documents; no automatic resend of Unknown; privacy issue escalated per approved policy. |
| WF-A14 | Two staff act on same admission/last seat → submit expected-state token and idempotency key | First valid action wins; other sees conflict/current state, no lost money/overbooking; review and explicit retry only. Timeout look up original intent before retry. |

## D. Website management workflows

| ID | Steps | Completion / recovery |
|---|---|---|
| WF-W01 | Website → Hero Slider → Add course-linked slide → choose source course/batch and image/text → preview → Save and Show/Hidden | Live facts from source; ineligible no apply CTA, unpublished/archived suppressed. General announcement same list with different fields. |
| WF-W02 | Partners/Events/Reviews → add/edit → optimize image/alt if applicable → Save → visibility/order actions | Genuine authorized content only; upcoming/past date-derived for events; no placeholders or registration. |
| WF-W03 | Mentors → create/edit reusable profile → Courses/Batch mentor picker → assign | Usage shown; default roster prefill only, existing batch roster unchanged; assigned mentor cannot delete. |
| WF-W04 | Any editor → Choose/Replace Image → validate/optimize → preview/alt → Save | Single item reference replaced, other uses remain; legacy asset replaceable; no referenced image cleanup. Concurrent reference changes safe. |
| WF-W05 | Footer & Contact → edit central record → Save | All authorized consumers update together, protected links stay. |
| WF-W06 | Pages → fixed policy editor → edit structured content → Save approved wording/effective date | Prior policy retained, no raw HTML/page builder. Checkout consent version reflects approved policy. |
| WF-W07 | SEO → override auto values or reset → save | One canonical course editor; no hidden duplicate. |
| WF-W08 | Content mistake → hide or edit → review Website Activity → safe correction | No silent overwrite; hide-before-remove; preserve prior policy; no general version management. Cache errors visible, authoritative cutover never stale fallback. |

## E. Reports and communications

| ID | Steps | Completion / recovery |
|---|---|---|
| WF-R01 | Overview → click count/quick action → filtered canonical module | Same count definition and filter; no duplicate workflow; loading/error separate. |
| WF-R02 | Transactions → search/filter → View → linked admission/case | Read-only; actual collection default, failed/pending/test opt-in; no money actions. |
| WF-R03 | Reports or batch roster/Transactions shortcut → select report/filter → preview count → allowed fields → CSV/XLSX → export | Same query definitions; safe PII and spreadsheet text; audit actor/time/criteria/outcome; no stored export file. Empty explains, failure no partial file. |
| WF-R04 | Batch Notifications → subject/message → preview active confirmed recipients and quota → confirm send | Individual emails, immutable send intent and recipient snapshot; queued remaining work; per-recipient status; cancel only unsent. No automatic start/complete notice unless selected. |
| WF-R05 | Admissions Email activity → filter status → Send Pending or Retry Failed → result | Dispatch existing intent/definitive retries only; provider accepted distinct from delivered; Unknown explicit review and warning, never auto resend. |
| WF-R06 | Quota exhausted or public recovery abuse → queue deferral/abuse limit → worker scheduled dispatch | Confirmations prioritized, recovery bounded, bulk waits; staff see actual quota/health where verified. No effect on seats/money. |

## F. Staff and security

| ID | Steps | Completion / recovery |
|---|---|---|
| WF-S01 | SA Settings → Staff → Invite name/email/role → invitation → password → verified MFA | No access until active authorized profile/AAL2; incomplete invite safe retry; public signup unavailable. |
| WF-S02 | Staff My Account → password or authenticator replacement → verify current identity/new factor → confirm | Old factor not removed before safe replacement; both roles, no escalation. Logout invalidates sessions. |
| WF-S03 | Lost MFA/password → approved recovery identity proof → invalidate sessions → re-enroll MFA → sign in | No password-only factor takeover; audit; sole-SA emergency path documented outside normal UI, isolated proof before launch. |
| WF-S04 | SA staff detail → change role/deactivate/reactivate → consequence confirm → server check/audit | Last active SA cannot be removed; denied next request even old Auth session; old actor history retained. |
| WF-S05 | Staff session warning → extend if permitted or reauthenticate → original form memory reviewed → explicit submit same idempotency key | No automatic money replay; no persistent PII draft. Clear on changed identity/role/deactivation. Proposed limits verified before implementation. |
| WF-S06 | Batch/Website Activity → inspect scoped events; SA global Activity → filter actor/entity/date | Read-only/redacted, direct cross-scope denied. Moves visible in both batch histories. |

## G. Operational release sequence (not authorization)

W0-E00 read-only actual production verification → separate containment if needed → W0-E01 documentation only after approval → E02 branch/runtime baseline → E03 isolated DB replay/preflight and E04/E05 provider/restore gates → W2A permission/audit/shared UI → W1 catalog → W2B staff and W3 email/jobs → W4 admissions/payment → W5 reports/PDF → W6 notices → W7 CMS parity/cutover → W8 integrated staged verification and cleanup rehearsal → W9 separately authorized release/controlled live test/reconciliation/allowlisted cleanup/final go/no-go. W2B and W3 may progress independently when dependencies pass. Never open general intake for a test; preserve true financial evidence. Final opening is separate owner action.

## H. State and failure principles

One source of each student, admission, collection and receipt document; independent academic/intake/payment/email states. No assumption that absence of refund tooling means no-refund policy. Unknown outcomes never treated as failure or automatically replayed. Authorization and eligibility checked at commit, not from UI. Preserve committed money and seat evidence despite email/PDF failures. Technical edge cases not decided here: exact timing, allocation semantics, mode-conversion/move policy, exceptional correction, provider/hosting/retention choices. Follow implementation plan §8 and acceptance register before dependent task. No additional scope implied by workflow examples.
