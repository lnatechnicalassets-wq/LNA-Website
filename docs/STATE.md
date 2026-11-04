# Project State: Lead Nation Academy (lnabd.org) Rebuild

**Last Updated:** 4 November 2026  
**Session Context:** Scope Revision & Development Workflow Optimization (Task `task/p0-scope-revision`)  

---

## 1. Current Phase and Task
- **Current Phase:** Phase 0 (Governance Baseline) & Phase 1 (Scaffold and CI)
- **Current Task:** Scope Revision & Governance Alignment (`task/p0-scope-revision`)
- **Task Status:** Implemented & Verified; Pending Human Review & Commit by Refat
- **Current Git Branch:** `task/p0-scope-revision`
- **Base Commit:** `cfc4dfe` (`main`)
- **Remote:** `https://github.com/BlazeDashX/LNA-Website.git`

---

## 2. Completed Tasks

### Task P0-Scope-Revision: Seven-Module Scope Alignment & Efficiency Protocol
- **SRS IDs Covered:** NFR-MNT-01
- **Target Branch:** `task/p0-scope-revision`
- **Commit Status:** Pending (awaiting Refat review and commit)
- **Deliverables Created / Modified:**
  - `docs/SCOPE-REVISION-V1.md`: Formal Scope Addendum establishing the 7 supervisor-approved modules and classifying all 129 requirements into 67 RETAIN, 24 MODIFY, and 38 DEFER.
  - `docs/decisions/0009-direct-bkash-payment-gateway.md`: Proposed Architecture Decision Record for direct bKash Payment Gateway integration (Tokenized/PGW), delayed verification, passive 30-min seat holds, pure integer poisha math, and signed receipt security.
  - `docs/decisions/0010-development-efficiency-and-risk-based-testing.md`: Formal ADR establishing the 4-tier Risk-Based Testing hierarchy (Levels 0–3), context-loading rules, and 2-attempt diagnostic limits.
  - `docs/traceability.csv`: Updated with exact `scope_v1` classifications (67 RETAIN, 24 MODIFY, 38 DEFER) preserving all original IDs and P0–P14 phase mappings.
  - `docs/architecture.md`: Updated architecture specification reflecting bKash payment gateway, CMS scope (banners, sections, images), Resend async outbox, and streamlined v1 surfaces.
  - `AGENTS.md`: Updated agent rules with bKash payment flow, Risk-Based Testing protocol (ADR 0010), and efficiency guidelines.
  - `.agents/rules/10-security-payments.md`: Codified direct bKash security rules, passive seat hold protections, and pure integer poisha math.
  - `.agents/rules/20-content-json.md`: Explicitly added homepage banners/hero slides, section toggles, and image pipeline to CMS scope.
  - `.agents/rules/40-testing.md`: Codified Level 0–3 testing tiers and operational diagnostics.
  - `docs/STATE.md`: Updated project tracking state.
- **Verification Evidence (Level 0 Documentation Checks):**
  - `node scripts/check-traceability.mjs`: PASSED (129/129 exact 1:1 match).
  - Scope classification totals: PASSED (67 RETAIN, 24 MODIFY, 38 DEFER = 129 total).
  - `git status`: PASSED (only documentation and governance files modified).

### Task P1-T2: Setup ESLint, Prettier, TypeScript Strict, Vitest, and pnpm verify
- **SRS IDs Covered:** NFR-MNT-01
- **Target Branch:** `task/p1-t2-code-quality`
- **Commit Status:** Merged into `main` via PR #3 (`cfc4dfe`)
- **Key Commit Hashes:** `cfc4dfe`

### Task P1-T1: Scaffold Next.js with Exact Pinned Versions
- **SRS IDs Covered:** NFR-MNT-01
- **Target Branch:** `task/p1-t1-scaffold`
- **Commit Status:** Merged into `main` via PR #2 (`8ca4d4b`)
- **Key Commit Hashes:** `ac27c11`, `b2bcadd`, `8ca4d4b`

### Task P0-T3: Agent Rules and Workflows
- **SRS IDs Covered:** NFR-MNT-01
- **Target Branch:** `task/p0-t3-agent-rules`
- **Commit Status:** Merged into `main` via PR #1 (`24bc59f`)

### Task P0-T2: Documentation Baseline
- **SRS IDs Covered:** All (77 FR, 15 NFR, 18 BR, 15 AT, 4 UC)
- **Target Branch:** `main`
- **Commit Status:** Merged & Pushed to `origin/main` (`5a669fd` through `dd87afa`)

### Task P0-T1: Git Repository and Remote Setup
- **Target Branch:** `main`
- **Commit Status:** Merged & Pushed to `origin/main`

---

## 3. Open Decisions and Approvals Awaiting Human (Refat)

| Decision / Gate | Description | Needed Before | Status | Owner |
| :--- | :--- | :--- | :--- | :--- |
| **ADR 0009** | Formal approval of Proposed ADR 0009 (Direct bKash Payment Gateway) | Phase 10 (Payments) | Proposed | Refat |
| **Scope Addendum** | Approval of `docs/SCOPE-REVISION-V1.md` (7 approved modules, 38 deferred features) | Immediate | Approved in Principle | Refat |
| **B0** | Brand extraction: palette, fonts, logo from live site | Phase 2 (P2-T0) | Open | Refat |
| **D1** | Live bKash merchant account credentials & sandbox credentials | Phase 10 | Open | LNA & Refat |

---

## 4. Pending Actions Awaiting Human (Refat)

1. **Review and Commit `task/p0-scope-revision`:**
   - Review modified files.
   - Stage, commit, push, and open PR for `task/p0-scope-revision`.
   - Merge PR into `main`.

---

## 5. Exact Next Eligible Task
- **Prerequisite:** Human review and merge of `task/p0-scope-revision` pull request into `main`.
- **Next Task:** **Phase 1 (Scaffold and CI) — Task P1-T3: env.ts with client and server split, server-only guard, security headers, health route, mode assertions** (on branch `task/p1-t3-env-headers`).
