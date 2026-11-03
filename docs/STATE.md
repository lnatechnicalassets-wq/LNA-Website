# Project State: Lead Nation Academy (lnabd.org) Rebuild

**Last Updated:** 3 November 2026  
**Session Context:** Foundation P0-T3 Agent Rules Drafted on Branch task/p0-t3-agent-rules  

---

## 1. Current Phase and Task
- **Current Phase:** Phase 0 (Foundation)
- **Current Task:** P0-T3 (Create AGENTS.md and .agents rules and workflows)
- **Task Status:** Implemented & Verified; Pending Human Review & Commit by Refat
- **Current Git Branch:** `task/p0-t3-agent-rules`
- **Remote:** `https://github.com/BlazeDashX/LNA-Website.git`

---

## 2. Completed Tasks

### Task P0-T3: Agent Rules and Workflows
- **SRS IDs Covered:** NFR-MNT-01
- **Target Branch:** `task/p0-t3-agent-rules`
- **Commit Status:** Pending (awaiting Refat review and commit)
- **Commit Hash:** Pending
- **Files Created:**
  - `AGENTS.md` (standing agent rules with human-controlled Git rule R14 from ADR 0007)
  - `.agents/rules/10-security-payments.md` (Part 7 invariants, 9-step gateway flow, T1-T20 threat table, banned patterns)
  - `.agents/rules/20-content-json.md` (Part 5 directory tree, Class A/B provenance, repository interfaces)
  - `.agents/rules/30-ui-accessibility.md` (Part 4 token system, breakpoints, components, WCAG 2.2 AA checklist)
  - `.agents/rules/40-testing.md` (Part 11 test pyramid, coverage thresholds, definition of done)
  - `.agents/rules/50-database.md` (forward-only migrations, RLS template, SECURITY DEFINER RPC template, pgTAP)
  - `.agents/workflows/start-task.md` (context reading sequence, plan format, stop conditions)
  - `.agents/workflows/finish-task.md` (verification checklist, GIT CHECKPOINT mandatory, no agent commits)
  - `.agents/workflows/security-review.md` (per-task audit against threats T1 to T20)
- **Files Modified:**
  - `docs/traceability.csv` (NFR-MNT-01 marked implemented)
  - `docs/STATE.md` (updated with P0-T3 status)
- **Checks Run & Results:**
  - `node scripts/check-traceability.mjs`: PASSED (all 129 IDs verified 1:1)
  - File size checks: All rule files range from 1.6 KB to 5.7 KB (strictly within the 24 KB / 24,000 bytes system cap and 12,000 char threshold).
  - Rule review gate: Per Blueprint Part 8.1, agent rules are treated as drafted pending Refat's review and approval before becoming active.

### Task P0-T2: Documentation Baseline
- **SRS IDs Covered:** All (77 FR, 15 NFR, 18 BR, 15 AT, 4 UC)
- **Target Branch:** `main`
- **Commit Status:** Merged & Pushed to `origin/main`
- **Confirmed Commit Hashes:**
  - `5a669fd`: `chore(repo): initialize git repository with gitignore and source documentation`
  - `778ecad`: `docs(srs): add plain-text copy of LNA-SRS-001 specification`
  - `254f9be`: `docs(arch): add architecture specification, initial ADRs 0001-0008, and dependencies allowlist`
  - `6f3dae7`: `docs(traceability): add requirement traceability matrix and validation script`
  - `7ea6051`: `docs(state): initialize persistent project state tracker`
  - `dd87afa`: `docs(state): record remote push and verified runtime environment`
- **Files in Repository:**
  - `.gitignore` (configured to exclude all root PDFs and `*SRS*.pdf` per owner directive)
  - `docs/source/LNA Website Development Blueprint.pdf` (source of truth copy)
  - `docs/SRS.md` (faithful plain-text transcription of LNA-SRS-001)
  - `docs/architecture.md` (derived system architecture from Blueprint Parts 3, 5, 6, 7)
  - `docs/decisions/0001-core-tech-stack-and-runtime.md`
  - `docs/decisions/0002-database-and-row-level-security.md`
  - `docs/decisions/0003-inhouse-sslcommerz-payment-gateway.md`
  - `docs/decisions/0004-dual-layer-content-architecture.md`
  - `docs/decisions/0005-content-security-policy-and-caching.md`
  - `docs/decisions/0006-testing-pyramid-and-quality-gates.md`
  - `docs/decisions/0007-human-controlled-git-workflow.md` (approved workflow adjustment replacing R14)
  - `docs/decisions/0008-antigravity-customization-rules-conventions.md` (Antigravity limits & settings)
  - `docs/DEPENDENCIES.md` (approved initial allowlist from Blueprint Part 3.3, unversioned)
  - `docs/traceability.csv` (129 requirement rows mapped to phases, modules, acceptance tests)
  - `scripts/check-traceability.mjs` (Node.js ES module validation script)
  - `scripts/check-traceability.py` (Python validation script)
  - `docs/STATE.md` (this file)
- **Excluded per Owner Directive:**
  - `LNA_Website_SRS.pdf` and `docs/source/LNA_Website_SRS.pdf` are preserved locally on disk but permanently excluded from Git tracking and remote upload via `.gitignore`.
- **Checks Run & Results:**
  - `node scripts/check-traceability.mjs`: PASSED (129 IDs extracted from `docs/SRS.md`, 129 rows in `docs/traceability.csv`: 77 FR, 15 NFR, 18 BR, 15 AT, 4 UC; zero duplicates, zero missing, 1:1 exact match).
  - `python scripts/check-traceability.py`: PASSED (identical 1:1 validation result).
  - Runtime Environment Verification: Node.js `v26.13.0` and pnpm `12.16.1` installed and verified.
  - Inspection of Antigravity custom limits: PASSED (verified 24 KB / 24,000 bytes per-file cap; 20,000-token aggregate rules budget).

---

## 3. Open Decisions, Gates, and Gaps

### Architecture Gates
| Gate | Description | Needed Before | Status | Owner |
| :--- | :--- | :--- | :--- | :--- |
| **B0** | Brand extraction: palette, fonts, logo from live site (Part 4.1) | Phase 2 (P2-T0) | Open | Refat |
| **D1** | Decisions on G1 (navigation), G2 (URL slug), G11 (SRS version label) | Phase 0 (P0-T1 / P0-T3) | Open (Flagged as needed before P0 per Blueprint 9.1; documentation baseline created) | Refat & LNA |
| **D2** | Decisions on G4 (free enrollment holding), G5 (staff 2FA), G9 (discount roles) | Phase 7 & Phase 9 | Open | LNA |
| **D3** | Decisions on G6 (late payment/full seat), G7 (IPN/validation wording), G14 (receipt format/tax) | Phase 10 | Open | LNA Finance |
| **D4** | Refund policy parameters (G10), certificate artwork and field coordinates | Phase 11 | Open | LNA Operations |
| **D5** | 15 assessment questions and 0–4 option weights, Bangla interface copy | Phase 12 | Open | LNA |
| **D6** | Verified impact content, legal advice on data location (G3, G13) | Phase 14 | Open | LNA & Legal |
| **D7** | Live SSLCOMMERZ merchant account, production domains, Resend sender domain | Phase 14 | Open | LNA |

### Blueprint Gaps (G1 to G16) Status
- **G1 (Navigation scope):** Live site has Internship, Community, News; SRS excludes them. *Proposed decision: Keep SRS navigation; 301-redirect legacy URLs.* Status: Open (D1).
- **G2 (IRGP course URL):** Preserve SEO value of `/industry-readiness-graduate-program-irgp/`. *Proposed decision: Keep slug, 301-redirect old path.* Status: Open (D1).
- **G3 (Live copy contradictions):** Conflicting fees (9,999 vs 20,000), class counts, mentor details. *Proposed decision: Class B demo data until written confirmation.* Status: Open (D6, blocks Phase 4 content).
- **G4 (Free batch seat reservation):** Fake emails could exhaust seats. *Proposed decision: Turnstile + rate limits; hold seat for 30 minutes; activate on setup email confirmation.* Status: Open (D2).
- **G5 (Staff 2FA deviation):** SRS FR-AUT-004 allows emailed code; Supabase native MFA supports TOTP only. Emailed code risks inbox compromise. *Proposed decision: Custom hashed single-use email code for Admin; mandatory TOTP for Super Admin.* Status: Open (D2; deviates from SRS text).
- **G6 (Delayed payment on full batch):** Payment arrives after seat hold expires and batch is full. *Proposed decision: Record payment; if full, set status to review, alert staff, manual refund (Assumption A5).* Status: Open (D3).
- **G7 (Payment validation terminology):** Clarify that both IPN and server-side Order Validation are required before marking paid. Status: Open (D3).
- **G8 (Non-sequential public references):** SRS mockups show sequential IDs (`LNA-2026-01842`), but SRS 8.2 forbids sequential IDs. *Adopted: Crockford Base32 random references (`LNA-7K3M-9XQ2`).* Status: Resolved in architecture.
- **G9 (Discount permissions):** FR-PAY-001 allows staff discounts; BR-09 limits universal discounts to Super Admin. *Proposed decision: Batch discounts = Admin; Universal discounts = Super Admin.* Status: Open (D2).
- **G10 (Refund policy period):** SRS FR-RFC-001 references "policy period" without numbers. *Proposed decision: Structured fields per course (days after payment, days before start) plus text.* Status: Open (D4, blocks Phase 11).
- **G11 (SRS version label inconsistency):** Document cover and control say Version 1.0; page footers say Version 2.0; approval records are blank. *Proposed decision: Establish baseline as Version 1.0 pending formal sign-off.* Status: Open (D1).
- **G12 (Homepage reviews/mentors priority):** FR-PUB-002 is Priority M, but review/mentor management are Priority G. *Adopted: Read-only UI in Phase 4; admin forms in Phase 8.* Status: Resolved in architecture.
- **G13 (Data sovereignty & cloud location):** Bangladesh Personal Data Protection Ordinance 2025 cross-border restrictions. *Proposed decision: Supabase region selection pending legal advice.* Status: Open (D6, blocks production).
- **G14 (Receipt numbering and tax):** Format and VAT treatment undefined. *Proposed decision: Sequential internal serial with separate Crockford Base32 public ref.* Status: Open (D3).
- **G15 (Duplicate applications):** FR-ENR-003 "prevent or reconcile". *Adopted: Reuse existing pending enrollment for identical email and batch.* Status: Resolved in architecture.
- **G16 (Missing content inputs):** Bangla copy, assessment questions, certificate template. *Proposed decision: Labeled demo content in dev; gates enforce presence before release.* Status: Open (D5).

---

## 4. Pending Actions Awaiting Human (Refat)

1. **Repository Settings (P0-T1 completion):**
   - Configure branch protection rules on GitHub for `main` (require PR, require checks, no force push).
   - Configure `CODEOWNERS` requiring Refat's review on `src/server/payments`, `src/server/auth`, `supabase/migrations`, `AGENTS.md`, `.agents/`, and `docs/DEPENDENCIES.md`.
2. **Antigravity Execution Protection Settings:**
   - Configure Antigravity `Command Denylist` (or review settings) to require confirmation for mutating Git commands (`git add`, `commit`, `push`, `merge`, `rebase`, `reset`, `tag`, `stash`, `clean`, `checkout`, `branch -d`).
3. **Decide Gate D1:**
   - Formally approve resolutions for G1 (navigation), G2 (URL slug), and G11 (SRS version label baseline).

---

## 5. Known Issues, Deviations, and Unverified Items
1. **Missing Blueprint Appendices:** The supplied Blueprint PDF (77 pages) references "Appendix A" (requirement mapping) and "Part 13" in earlier sections, but ends at page 77 without these appendices. Per protocol, phase mappings were derived directly from the Blueprint Part 9.4 Task Table and Section 11.3 instead of reconstructing from memory.
2. **SRS PDF Excluded from Git:** Per Refat's explicit directive, `LNA_Website_SRS.pdf` is excluded from Git tracking via `.gitignore` and was not pushed to GitHub. The plain-text specification copy [`docs/SRS.md`](docs/SRS.md) remains fully tracked and tested.

---

## 6. Exact Next Eligible Task
- **Prerequisite:** Human review and merge of `task/p0-t3-agent-rules` pull request into `main`.
- **Next Task:** **Phase 1 (Scaffold and CI) — Task P1-T1: Scaffold Next.js application with exact pinned versions** (on branch `task/p1-t1-scaffold`).
  - *Note:* P1-T1 Step 1 produces a resolved package version and peer dependency compatibility table for Refat's review and approval before any package is installed.

