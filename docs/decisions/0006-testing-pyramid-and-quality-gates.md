# 0006. Testing Pyramid and Quality Gates

**Status:** Accepted  
**Date:** 3 November 2026  
**Deciders:** Refat (Owner), Engineering Agent  
**Citations:** Blueprint Part 11; SRS Section 12, NFR-MNT-01  

## Context
Automated verification must prove requirement satisfaction and prevent security regressions. AI agent claims of task completion cannot replace automated test evidence.

## Decision
1. **Verification Pyramid:**
   - **Static Analysis:** TypeScript strict mode, ESLint with `jsx-a11y`, Prettier, Gitleaks, dependency allowlist scan.
   - **Unit Tests (Vitest):** Core business logic, pricing, fee calculations, Zod schemas, reference generation.
   - **Component Tests (Testing Library):** Form state transitions, keyboard focus, error summary banners.
   - **Database Tests (pgTAP):** RLS policy evaluation across all roles, RPC concurrency, and function constraints.
   - **End-to-End Tests (Playwright):** All 15 SRS acceptance test journeys (AT-01 to AT-15) across 320px, 768px, and 1280px viewports with `@axe-core/playwright` accessibility audits.
2. **Quality Gates:**
   - Zero ESLint errors or warnings.
   - Line and branch test coverage >= 90% for payment and auth modules; >= 70% elsewhere.
   - Zero high/critical dependency vulnerabilities (`pnpm audit`, OSV).
   - Zero gitleaks findings.
   - Passing `pnpm verify` is mandatory before any task branch can be recommended for merge.

## Consequences
- Guarantees objective, reproducible verification of every feature.
- Bypassing, skipping, or loosening test assertions to pass CI is strictly banned.

