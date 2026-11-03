# 40. Testing Strategy & Quality Gates

**Authority:** Blueprint Part 11; SRS Section 12, NFR-MNT-01  
**Scope:** Applies to all automated tests, assertions, CI execution, and task verification.

---

## 1. Testing Pyramid
1. **Static Checks:** TypeScript strict typechecking (`tsc --noEmit`), ESLint with `jsx-a11y` accessibility rules, Prettier formatting checks, and Gitleaks secret scans.
2. **Unit Tests (Vitest):** Core pure business logic:
   - Pricing functions, discount rules, fee calculation, integer poisha conversions.
   - Reference generation (Crockford Base32 format and uniqueness).
   - Zod validation schemas with valid and invalid fixtures.
   - Assessment scoring algorithms and label categorization.
3. **Component Tests (Vitest + Testing Library):**
   - Form state transitions (default, submitting, validation error, success, failure).
   - Modal focus trapping and accessible disclosures.
   - Keyboard navigation on carousels, tabs, and filters.
4. **Database & Policy Tests (pgTAP):**
   - RLS isolation: prove `anon` cannot read unpublished data or write operational records.
   - Prove `authenticated` learners cannot read or modify another learner's records.
   - Concurrency tests: verify row-locking prevents seat overselling under parallel calls.
5. **End-to-End Tests (Playwright):**
   - Validate full acceptance test journeys (AT-01 to AT-15) on Chromium, Firefox, and WebKit.
   - Run at three explicit viewports: `320px`, `768px`, and `1280px`.
   - Run automated `@axe-core/playwright` accessibility audits on every page.

---

## 2. What Each Task Must Test
- Every new behavior must have at least one test.
- Every business rule must have at least one failure case test demonstrating that unauthorized or invalid actions are correctly rejected.
- Any bug fix must include a regression test that fails before the fix and passes after.
- Never weaken, skip, or delete tests to get CI green.

---

## 3. Definition of Done & Quality Gates
A task is eligible for completion only when all required checks pass:
- `pnpm verify` passes cleanly (lint, typecheck, content:validate, unit tests, build).
- Zero ESLint errors and zero warnings.
- Code coverage targets: >= 90% line and branch coverage in `src/server/payments`, `src/server/auth`, and pricing logic; >= 70% elsewhere.
- Zero high or critical vulnerability findings in `pnpm audit` or OSV scans.
- Zero secret detection findings from `gitleaks`.
- Task documentation updated in `docs/STATE.md` and `docs/traceability.csv`.
