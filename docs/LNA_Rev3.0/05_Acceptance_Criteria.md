# LNA Rev3.0 | Acceptance criteria and traceability

**Status:** Owner-approved UX and business decisions, planning baseline prepared 26 November 2026. No implementation, production changes, purchases, deployment or destructive work authorized. Test criteria are targets, not results.

Each AC-Dxx verifies the corresponding owner decision. Use the primary task(s) as owning implementation points; dependent integration tests in W8-T03. All status = NOT RUN. Preserve all Rev2.0 baseline cases and R-01–R-16 gates in plan §7.

| Test ID | Decision | Owning task(s) | Acceptance scenario | Status |
| --- | --- | --- | --- | --- |
| AC-D01 | D01 | W1-T04 W4-T01 W7-T04 | Edit one question in Courses; new public/staff forms match; no duplicate editor. | NOT RUN |
| AC-D02 | D02 | W1-T03 | Copy populated batch; new number, draft, switch Off, no dates, attempts, publication, history or learners; approved reusable fields prefilled. | NOT RUN |
| AC-D03 | D03 | W1-T03 | Blank creation cannot save without pricing selection; copied pricing explicitly reviewed. | NOT RUN |
| AC-D04 | D04 | W1-T01 W4-T02 | Change fee after application creation; old snapshot and expected payment unchanged; new application uses new fee. | NOT RUN |
| AC-D05 | D05 | W1-T02 W1-T04 | Test switch On with full/unpublished/completed/archived blockers; public and admin agree. | NOT RUN |
| AC-D06 | D06 | W1-T03 | Reverse completed with switch On; show resulting state; no automatic switch mutation. | NOT RUN |
| AC-D07 | D07 | W1-T02 W4-T05 | Both roles add to eligible published upcoming/running Off batch; deny prohibited states and full batch. | NOT RUN |
| AC-D08 | D08 | W1-T03 | Draft dependency checks incl expired applications, payment, emails; archive keeps history; direct deletion denied when protected. | NOT RUN |
| AC-D09 | D09 | W1-T03 W1-T04 | Advance clock past deadline; switch and stage unchanged; warning appears. | NOT RUN |
| AC-D10 | D10 | W4-T01 W7-T04 | Change question label/requiredness; resume old version; new submissions use new version; historical export readable. | NOT RUN |
| AC-D11 | D11 | W1-T03 | Archive with records; public hidden; students/payment unchanged; impact shown. | NOT RUN |
| AC-D12 | D12 | W1-T02 W4-T03 W4-T04 | Off alone does not invalidate eligible checkout; full/archived/cancelled cases preserve verified money without ineligible confirmation. | NOT RUN |
| AC-D13 | D13 | W4-T01 W4-T09 | Enroll same identified student in two batches; one person, two admissions; ambiguous contact not auto-merged. | NOT RUN |
| AC-D14 | D14 | W4-T05 W4-T09 W8-T01 | All four routes open same form/validation; selected context prefilled; return to origin. | NOT RUN |
| AC-D15 | D15 | W4-T01 W4-T09 | Select returning student; previous answers labelled editable; contact change explicit, duplicate checked and audited. | NOT RUN |
| AC-D16 | D16 | W4-T03 W4-T05 | Pending/unknown blocks staff collection; query-only recheck; safe conversion preserves attempts and disables old checkout; late evidence retained. | NOT RUN |
| AC-D17 | D17 | W4-T09 | Search each key incl normalized phone and expired records; hidden-default overridden, explicit filters respected. | NOT RUN |
| AC-D18 | D18 | W4-T07 W4-T09 W5-T04 | Attempt without admission and expired paid case reachable; email/PDF failure listed; counts link to matching queue. | NOT RUN |
| AC-D19 | D19 | W4-T06 W4-T07 | Explicit select eligible existing collection; amount/ownership/active allocation validated atomically; no additional collection. | NOT RUN |
| AC-D20 | D20 | W4-T05 W4-T07 | Gateway/manual duplicate blocked under race; repeated cash/bank warning requires acknowledgement and audit. | NOT RUN |
| AC-D21 | D21 | W4-T05 | Test zero/blank/negative/excess/decimal boundary; waiver math in poisha; free exempt ref. | NOT RUN |
| AC-D22 | D22 | W4-T09 W5-T04 | After commit and refresh show same result; receipt ready/pending accurately; Add Another retains batch only. | NOT RUN |
| AC-D23 | D23 | W4-T06 W6-T02 | Move to eligible Off destination and back; one collection/waiver; audit source/destination; checkbox On, explicit Off suppresses notice. | NOT RUN |
| AC-D24 | D24 | W4-T08 W5-T04 | Admin/direct API denied; corrected manual amount/version, old immutable, reports adjusted once; gateway proof not editable. | NOT RUN |
| AC-D25 | D25 | W4-T07 | Review with reason; financial flag stays; repeated event no reopen; new distinct relevant evidence reopens. | NOT RUN |
| AC-D26 | D26 | W2A-T03 W4-T05 W4-T06 W4-T07 W7-T03 | Simultaneous staff actions and repeat request; one effect; conflict shows latest state; no silent overwrite. | NOT RUN |
| AC-D27 | D27 | W3-T02 W5-T04 | Inject PDF failure; committed seat/collection intact; outbox waits, case appears; retry same receipt number and email intent. | NOT RUN |
| AC-D28 | D28 | W4-T09 W3-T04 | Correct verified contact; old tokens fail; supersede unsent intent with audited replacement; no resend of unknown automatically. | NOT RUN |
| AC-D29 | D29 | W7-T03 W7-T05 | Empty reviews/events/partners/mentors do not show empty headings; no fabricated content; essential header/footer remain usable. | NOT RUN |
| AC-D30 | D30 | W1-T04 W7-T05 | Published batchless/closed course page renders, no ineligible apply link. | NOT RUN |
| AC-D31 | D31 | W1-T04 W4-T04 W7-T05 | One prefill; two no forced default; stale deep link revalidated and alternatives offered. | NOT RUN |
| AC-D32 | D32 | W4-T04 | Mobile autofill and accessible errors; no redundant course selection; values kept on validation failure. | NOT RUN |
| AC-D33 | D33 | W4-T04 | Typo hint nonblocking; readback visible; no confirm-email field. | NOT RUN |
| AC-D34 | D34 | W4-T02 W4-T04 | Change fee between render/submit; server blocks old price and requires explicit acceptance; existing snapshot unaffected. | NOT RUN |
| AC-D35 | D35 | W4-T04 W7-T04 W9-T01 | Missing policy blocks paid launch; consent version recorded; no fabricated policy claim. | NOT RUN |
| AC-D36 | D36 | W4-T04 W3-T04 | Free eligible submission works gateway closed; confirmed message even quota unavailable; no receipt. | NOT RUN |
| AC-D37 | D37 | W4-T03 W4-T04 | Mock each verified/unknown outcome; wording/action matches evidence; no retry for unresolved. | NOT RUN |
| AC-D38 | D38 | W2A-T05 W4-T04 W3-T04 | Known/unknown email same response; only valid scoped token reveals records; expiry/revocation/rate limits tested. | NOT RUN |
| AC-D39 | D39 | W4-T03 W4-T04 | Unknown/timeout/refresh cannot Create/Execute again blindly; definitive safe failure and eligibility permit retry. | NOT RUN |
| AC-D40 | D40 | W4-T04 W5-T04 | Refresh/back/return in supported context no new effect; authorized view shows committed state and queued/accepted truth. | NOT RUN |
| AC-D41 | D41 | W5-T04 | Positive collection PDF same email; zero collection none; public URL denied; authorized resend audited. | NOT RUN |
| AC-D42 | D42 | W4-T04 | Contact CTA from paid form; no public manual receipt submission introduced. | NOT RUN |
| AC-D43 | D43 | W1-T04 W7-T05 | Advance date; promotional deadline hidden, intake unchanged; staff warning. | NOT RUN |
| AC-D44 | D44 | W4-T04 W7-T01 W8-T02 | Mobile enrollment and admin checks, keyboard/focus/live announcements, reduced motion, measured image/LCP review. | NOT RUN |
| AC-D45 | D45 | W7-T03 W7-T04 | Each section accessible; course display links to canonical editor; no duplicate inputs. | NOT RUN |
| AC-D46 | D46 | W7-T03 | Unsaved content not live; save updates; reorder/toggle persists; hidden not public. | NOT RUN |
| AC-D47 | D47 | W7-T03 W7-T05 | Change fee/availability; slide reflects source; unpublish suppresses, CTA eligibility enforced. | NOT RUN |
| AC-D48 | D48 | W7-T03 | Event date changes category without intake side effects; unapproved review hidden; no registration route. | NOT RUN |
| AC-D49 | D49 | W1-T03 W7-T03 | Show usage; hide allowed; delete assigned denied; course default edits do not rewrite batch roster. | NOT RUN |
| AC-D50 | D50 | W7-T01 W7-T02 | Replace legacy image through editor; valid optimized variants/alt; referenced asset not removed under concurrent update. | NOT RUN |
| AC-D51 | D51 | W7-T04 | One contact edit updates consumers; unsafe HTML blocked; required policy link protected; SEO default/reset works. | NOT RUN |
| AC-D52 | D52 | W7-T03 W7-T04 | Stale save rejected; prior policy retrievable; hide then eligible remove; references protected. | NOT RUN |
| AC-D53 | D53 | W2B-T04 W7-T03 | Admin accesses scoped CMS log; cannot fetch global/staff audit through direct API. | NOT RUN |
| AC-D54 | D54 | W5-T01 W8-T01 | Counts drill to identical filtered totals; actions reuse canonical flows; no separate financial module. | NOT RUN |
| AC-D55 | D55 | W5-T02 W5-T03 | No mutation endpoint; verified and recorded distinct; attempts/test opt-in; link to admission/case and shared export. | NOT RUN |
| AC-D56 | D56 | W5-T01 | Fixture repeat callback, second receipt, cancel, move, waiver, test; list/report/export totals reconcile. | NOT RUN |
| AC-D57 | D57 | W5-T03 | Read valid XLSX/UTF8 CSV; PII field control/formula safety; phone text; audit metadata; no retained export file. | NOT RUN |
| AC-D58 | D58 | W3-T04 W4-T09 | Admin can dispatch existing queued intent, retry definitive failures, unknown explicit warning; no duplicate admission/payment. | NOT RUN |
| AC-D59 | D59 | W3-T01 W3-T02 W2A-T05 | Simulate abuse and exhausted quota; confirmations prioritized, deferred work preserved, unknown no auto retry. | NOT RUN |
| AC-D60 | D60 | W6-T01 W6-T02 | Preview snapshot; idempotent send, private recipients; cancel queued not sending/accepted/unknown; audit results. | NOT RUN |
| AC-D61 | D61 | W7-T05 W8-T01 | Existing approved news links work; no extra module/feature; no stale content fallback. | NOT RUN |
| AC-D62 | D62 | W2A-T03 W8-T01 | Role-specific navigation and direct route authorization; both account menus work. | NOT RUN |
| AC-D63 | D63 | W2A-T03 W8-T01 | Shared patterns established before W1 screens; later modules reuse; W8 verifies not rebuilds. | NOT RUN |
| AC-D64 | D64 | W2A-T01 W2A-T02 W2A-T03 | Role matrix positive and negative API/RPC/Storage tests; AAL1 denied; no custom roles. | NOT RUN |
| AC-D65 | D65 | W2B-T01 | Invite sets password, MFA; incomplete onboarding no protected access; public signup disabled. | NOT RUN |
| AC-D66 | D66 | W2B-T01 W2B-T02 | Concurrent demotion/deactivation cannot remove last SA; next protected request denied; old audit remains. | NOT RUN |
| AC-D67 | D67 | W2B-T03 | Current verified identity required; new factor verified before old removed; logout invalidates session; no role escalation. | NOT RUN |
| AC-D68 | D68 | W2A-T04 W2B-T03 | Recovery token scoped, expired/replayed denied; no password-only factor hijack; isolated sole-SA drill. | NOT RUN |
| AC-D69 | D69 | W2A-T04 | Verify configuration and provider feasibility; idle/max cannot bypass direct API; warning before expiration. | NOT RUN |
| AC-D70 | D70 | W2A-T04 W4-T05 | Expire mid-form; same authorized user reauth preserves input, changed role/deactivation clears; explicit retry same key. | NOT RUN |
| AC-D71 | D71 | W2A-T03 W4-T09 W8-T01 | Navigate transaction→admission→student→batch; return filters/sort/page restored; external return rejected. | NOT RUN |
| AC-D72 | D72 | W4-T09 W5-T02 W8-T01 | Relevant search keys available in each module; no global search subsystem. | NOT RUN |
| AC-D73 | D73 | W2A-T02 W2B-T04 W7-T03 | Same event model, authorized scoped visibility; move in both batches; direct cross-scope denied; no secrets. | NOT RUN |
| AC-D74 | D74 | W2A-T03 W8-T02 | Shared component patterns in critical routes; error not empty; routine reversible action direct save. | NOT RUN |
| AC-D75 | D75 | W2A-T03 W4-T05 W4-T06 W4-T08 | Cancel/move/correction show effects and reasons; repeat/stale request safe; unauthorized denied. | NOT RUN |
| AC-D76 | D76 | W2A-T03 W8-T02 | Critical workflows function at mobile and desktop sizes; focus/keyboard/manual accessibility tests. | NOT RUN |
| AC-D77 | D77 | W3-T03 W3-T05 W8-T01 | Last job/backup status from real evidence, unknown labelled; no secrets; limited role views. | NOT RUN |
| AC-D78 | D78 | W8-T02 W8-T03 W9-T07 | Real representative staff/student walkthroughs and staged E2E for all seven stated workflows; blockers corrected and documented. | NOT RUN |

## Cross-module release scenarios (D78)

| ID | Scenario | Pass condition | Evidence |
|---|---|---|---|
| UX-E2E-01 | Mobile first-time paid student, two batches, slow connection, gateway return | Explicit batch, authoritative fee/policy, one application and charge, status recovery, correct PDF same email | Staged browser recording + DB/provider mock assertions |
| UX-E2E-02 | Free student, gateway and email unavailable | Seat confirmed immediately, no charge/PDF, queued mail truthfully shown | E2E + outbox/DB |
| UX-E2E-03 | Staff walk-in new/returning, cash/waiver/bank/bKash | One form, correct math/reference, duplicate safeguards, receipt status, repeat-safe | Staff walkthrough + role/DB tests |
| UX-E2E-04 | Unknown payment, late/full/cancelled, distinct second receipt | No new charge, proof retained, one active seat, case and truthful UI | Sandbox/mock + parallel sessions |
| UX-E2E-05 | Batch copy, open/close, full, reversal | New draft Off, no copied dates, capacity correct, reopening warning, checkout eligible | Staff walkthrough + pgTAP |
| UX-E2E-06 | Content edit by nontechnical Admin | Seven sections, live facts, safe media replace, policy history, no developer | Staff walkthrough + cache/route tests |
| UX-E2E-07 | Reports, test receipts, move and cancellation | Count once, roster destination, source collection, filtered export parity, safe PII | Synthetic fixture and independent reconciliation |
| UX-E2E-08 | Quota, PDF failure, unknown send and bulk cancellation | Confirmation priority, queue visible, no second automatic email, unsent-only cancellation | Worker integration tests |
| UX-E2E-09 | Invite, MFA, session expiry, roles/deactivation, sole-SA recovery | No bypass; safe explicit retry; history, scope and last-SA guard; recovery proof | Isolated Auth/API/DB/Storage tests |
| UX-E2E-10 | Mobile/keyboard and performance | Essential workflows usable, focus/errors/reduced motion, measured image/LCP results; no fabricated targets | Automated axe + manual checks + measured traces |

## Execution and sign-off

For every task: report requirement/decision IDs, actual files and migrations, exact commands and environment, expected vs observed, evidence links, failures/skips, rollback and owner decision. Record NOT RUN, PASS, FAIL, BLOCKED or explicitly approved nonblocking exception; never mark unexecuted cases PASS. Staging uses synthetic data and sandbox/mock only. Real controlled live test requires separate authorization and R-13. No launch-critical skips; W9-T07 is explicit owner go/no-go.
