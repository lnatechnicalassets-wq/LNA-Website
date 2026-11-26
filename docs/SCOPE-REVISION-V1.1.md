# LNA Website Scope Revision Addendum (LNA v1.1 / Planning Revision 3.0)

**Document Version:** 1.1 (Rev3.0 Reconciliation)  
**Effective Date:** 26 November 2026  
**Status:** Approved planning baseline (`W0-E01` reconciled; individual execution waves require separate owner task approval)  
**Governing Package:** [`docs/LNA_Rev3.0/`](LNA_Rev3.0/README.md) ([Plan](LNA_Rev3.0/01_Implementation_Plan_Rev3.0.md), [Decisions](LNA_Rev3.0/02_Master_Decision_Register.md), [UI/UX](LNA_Rev3.0/03_UI_UX_Specification.md), [Workflows](LNA_Rev3.0/04_User_Workflows.md), [Acceptance](LNA_Rev3.0/05_Acceptance_Criteria.md))  
**Historical Baselines Preserved:** [`docs/SRS.md`](SRS.md) (`LNA-SRS-001 v1.0`), [`docs/SCOPE-REVISION-V1.md`](SCOPE-REVISION-V1.md) (`v1.0`, superseded where conflicting)

> **Source Limitation Note:** `docs/source/LNA_Website_SRS.pdf` is unavailable in the repository, and binary `docs/source/LNA Website Development Blueprint.pdf` is excluded per `AGENTS.md` Rule R18. Historical baseline reconciliation relies on plain-text Markdown (`docs/SRS.md`, `docs/SCOPE-REVISION-V1.md`, `docs/decisions/`) without inventing unavailable PDF content.

---

## 1. Authority Hierarchy & Planning Boundary

1. **Controlling Specifications:** [`docs/LNA_Rev3.0/01_Implementation_Plan_Rev3.0.md`](LNA_Rev3.0/01_Implementation_Plan_Rev3.0.md) and [`docs/LNA_Rev3.0/02_Master_Decision_Register.md`](LNA_Rev3.0/02_Master_Decision_Register.md) (`D01`–`D78`, `C-01`–`C-16`, `OD-001`–`OD-111` where not superseded, and `TR-01`–`TR-10`) govern all LNA v1.1 work and supersede conflicting clauses in [`docs/SCOPE-REVISION-V1.md`](SCOPE-REVISION-V1.md), [`docs/SRS.md`](SRS.md), and legacy ADRs (`0001`, `0003`, `0004`, `0011`–`0015`).
2. **Scope Freeze & Verification Discipline:** Approval of Rev3.0 planning documents does **not** mark features implemented, does **not** authorize `W0-E00` containment or production mutations, and does **not** authorize package installation or paid infrastructure upgrades. Every task (`W2A-T01` onward) requires explicit task authorization and passing gates (`AC-D01`–`AC-D78`, `UX-E2E-01`–`UX-E2E-10`, `R-01`–`R-16`).
3. **Production Safety Gate (`W0-E00`):** Deferred by owner at `W0-E01` entry; remains mandatory before production changes, live checkout testing, or launch.

---

## 2. Reconciled Seven Approved Modules (Rev3.0 Summary)

| Module | Addendum IDs | Key Changes from v1.0 (`SCOPE-REVISION-V1.md`) | Governing Task Waves |
| :--- | :--- | :--- | :--- |
| **1. Course & Batch Management** | `CAT-01`–`CAT-10` | Decoupled publication, academic stage (`Upcoming`/`Running`/`Completed`/`Draft`), and manual `Accept Applications` switch; unlimited capacity default (MTO launches unlimited); optional display-only deadlines; copy excludes dates/deadlines/switch/publication/history; course-level shared application questions (`D01`, `D10`); unused dependency-free draft delete (`D08`); published courses stay visible with 0 open batches (`D30`). | `W1`, `W7-T04` |
| **2. Unified Admissions & Students** | `ADM-01`–`ADM-13` | Identical shared fields/questions across `/enroll` and single-step staff `Add Student`; normalized `email OR phone` per-batch duplicate checks + audited shared-contact exceptions; secure `/status` recovery links (`D38`); same-course transfers preserving `Moved` source + payment lineage (`D23`); single `Needs Attention` queue (`D18`); zero routine student/admission deletion (`ADM-12`). | `W4` |
| **3. Payments & Collections** | `PAY-01`–`PAY-13` | Direct bKash server execute/query (`ADR 0009`); late/duplicate/mismatched verified evidence always preserved (`PAY-02`, `TR-02`); exactly 5 staff paid-batch options (`Cash`, `Full Fee Waiver`, `Partial Fee Waiver`, `Bank Transfer`, `bKash Transfer` — no Sponsor option); free-batch ref exemption (`C-14`); mandatory trimmed ref (`>=1` char); editable individual fee with auto-audit (`C-15`); integer poisha snapshots; `PAY-11` verified receipt association + `Mark Reviewed`; `PAY-12` restricted live test access; **`PAY-13` (`C-16`) branded PDF payment receipts for actual positive collections** attached to confirmation email and downloadable by staff in admission details; zero live refund UI/ledger/processing. | `W2A-T06`, `W4`, `W5-T04`, `W9-T04` |
| **4. Website & CMS** | `CMS-01`–`CMS-10` | Amends `ADR 0011`: all **7 homepage sections** (`Hero Slider`, `Partners`, `Courses`, `Events`, `Mentors`, `Reviews`, `Footer`) in fixed order are admin-managed (`W7`); single canonical Courses editor; reusable Mentors, Partners, Reviews, and date-derived upcoming/past Events; shared media optimization/alt/reference-safe cleanup (`D50`); structured static/policy pages & optional SEO (`D51`); static `/news` preserved without news CMS (`D61`); production JSON fallback removed after verified DB cutover (`W7-T06`); no unverified claims/placeholders (`D29`). | `W7` |
| **5. Reports & Data Extraction** | `REP-01`–`REP-05` | Read-only `Transactions` workspace (`D55`); canonical gross operating collections separated from waivers/free/sandbox/Live Test subtotals (`D56`); shared configurable **CSV and true `.xlsx`** exports (`D57`) with formula-injection protection and audit logging; Overview operational counts/quick actions (`D54`); no separate finance dashboard. | `W5` |
| **6. Email & Notifications** | `EML-01`–`EML-06` | Foundational transport & persistent-lease scheduling moved to **`W3`**; confirmation emails include eligible `PAY-13` PDF (`EML-01`, `D27`, `D41`); quota priority (confirmations > public recovery > bulk); provider `accepted` vs. `delivered` truthfulness (`TR-07`); no auto retry of `Unknown`; manual `Batch Notify Students` workspace (`W6`); optional `Move` default-on (`D23`) & `Start/Complete` default-off (`W6-T02`) notices. | `W3`, `W6` |
| **7. Security, Staff, UX & Ops** | `SEC-01`–`SEC-10` | Two roles (`Admin` operational + batch/Website scoped activity; `Super Admin` + staff/settings/manual payment corrections/global activity); protect last active SA; app-enforced `30m/12h` sessions subject to verification (`D69`); 8-module sidebar (`D62`) + shared foundations (`W2A-T03`) ahead of W1 UI; invite-only MFA (`AAL2`) + emergency sole-SA recovery (`D68`); Turnstile/Upstash hardening (`W2A-T05`); ExonHost-first commercial hosting check (`W0-E04`); recurring encrypted DB/Auth/Storage backups & restore drills (`W0-E05`, `W3-T05`); controlled `W9` launch cleanup. | `W0`, `W2A`, `W2B`, `W8`, `W9` |

---

## 3. Historical v1.0 Classification Reconciliation & Exclusions

- **Preserved Core Invariants:** Offline-only training; Crockford Base32 `public_ref`; atomic `SELECT ... FOR UPDATE` seat holds; server-side bKash execution/query validation; untrusted cancel/fail redirects preserving checkout holds; integer poisha (`bigint`); zero student auth accounts; `/status` without learner dashboard; zero routine operational deletion (`BR-18`); WCAG 2.2 AA (`NFR-A11Y-01`).
- **Restored from Original SRS / Expanded in v1.1:** Admin CMS management for Hero Slider (`FR-PUB-003`), Partners, Events (`FR-EVT-001/002/005` showcase/listing only, without ticketing), Mentors (`FR-MEN-001`), Reviews (`FR-REV-001`), and Footer/Static Pages/SEO (`W7`); branded server-generated PDF payment receipts (`C-16`/`PAY-13`) and `.xlsx` export (`REP-04`).
- **Superseded / Retired from v1.0 & Earlier Codebase:**
  - `SSLCOMMERZ` (`SRS 9.1`, `ADR 0003`) -> Direct bKash (`ADR 0009`).
  - `SCOPE-REVISION-V1.md` `FR-RFC-002`/`003` offline refund ledger, `UC-04`, `AT-09`, and `sandbox-refund` production exposure -> **Zero live refund UI, ledger, or endpoint** (`PAY-09`, `W2A-T06`).
  - Routine student/admission permanent purge (`20261116160000`–`180000`) -> **Prohibited/retired** (`ADM-12`, `W2A-T06`); unused dependency-free draft batch deletion (`CAT-09`/`D08`) and separately authorized `W9` launch test cleanup only.
  - `ADR 0011` CMS admin prohibitions -> Amended (`CMS-01`–`CMS-08`).
  - `ADR 0013` two-step staff-entered review & Sponsor option -> Replaced by single-step 5-option `Add Student` (`ADM-04`, `PAY-03`–`05`).
- **Remaining Post-v1 Deferred Items (Unchanged Exclusions):** Learner Portal/dashboard & learner auth (`FR-LRN-001/003`, `FR-AUT-006`); Readiness Assessment (`FR-OTH-001`–`005`); PDF Certificates (`FR-RFC-005`–`008`); Public Event Ticket Registration & Passes (`FR-EVT-003/004`); Bilingual Bangla UI toggle (`FR-OTH-007`); Promo/Coupon campaigns (`FR-PAY-001`); News CMS (`D61`); Global search (`D72`); Installment/balance tracking (`PAY-04`); Public PDF receipt downloads (`D41`).

---

## 4. Implementation Sequence & Implementation Truth Boundary

- **Approved Wave Order:** `W0` -> `W2A` -> `W1` -> (`W2B` / `W3` independent when prerequisites pass) -> `W4` -> `W5` -> `W6` -> `W7` -> `W8` -> `W9` (`58` tasks; see [`01_Implementation_Plan_Rev3.0.md`](LNA_Rev3.0/01_Implementation_Plan_Rev3.0.md) §4).
- **Current Implementation vs. Target Baseline:** Partial Phase 1–10 repository code exists (public pages, `/enroll`, `/status`, bKash PGW client/token cache, partial catalog/batches/mentors/admissions/students admin, `email_outbox`), **including conflicting artifacts scheduled for retirement in `W2A-T06` (`sandbox-refund`, `staff_student_purge`, `staff_admission_delete`)**. **All 78 Rev3.0 UX acceptance cases (`AC-D01`–`AC-D78`) and 10 integrated scenarios (`UX-E2E-01`–`10`) remain `NOT RUN`.**
- **Pending Technical/Owner Gates Before Affected Tasks:**
  - `W0-E00` owner dashboard/SQL checks + `W0-E02` runtime/verify + `W0-E03` isolated PG 17/CLI/pgTAP replay + `W0-E04` ExonHost/Auth/bKash merchant verification + `W0-E05` backup/restore runbook.
  - Package approvals (`W5-T03` `.xlsx` library if any; `W5-T04` PDF template/Bengali font usage of `pdf-lib`/`@pdf-lib/fontkit`) remain **pending**.
  - Proposed ADRs (Authorization/Session `30m/12h` policy, Catalog & Payment Invariants, CMS/Media Lifecycle, Hosting/Scheduler/Backup) remain **pending authoring** during their governing waves without inventing unapproved numbers now.
