# LNA Website: agent rules (read fully before every task)

## Project

Rebuild of lnabd.org for Lead Nation Academy (LNA Rev3.0 baseline): public site, admin portal, unified course application, status/recovery lookup, and branded PDF payment receipts for actual positive collections (`PAY-13` / `C-16`; learner portal/certificates/assessments/refunds deferred or excluded).
Offline courses only. Paid enrollment through direct bKash payment gateway (BDT) [Accepted ADR 0009; supersedes ADR 0003 SSLCOMMERZ].
Sources of truth, in order: `docs/LNA_Rev3.0/` (`01_Implementation_Plan_Rev3.0.md`, `02_Master_Decision_Register.md` D01–D78 & C-01–C-16, `03_UI_UX_Specification.md`, `04_User_Workflows.md`, `05_Acceptance_Criteria.md`), `docs/SCOPE-REVISION-V1.1.md`, `docs/SCOPE-REVISION-V1.md` (v1.0 superseded where conflicting), `docs/SRS.md` (historical baseline), `docs/architecture.md`, `docs/decisions/`, `docs/STATE.md`. If a task prompt conflicts with them, STOP and ask.

## Fixed stack

Next.js 16.x App Router, TypeScript strict, Tailwind 4, Supabase (Postgres, Auth, Storage), Zod, pnpm (`12.16.1`), Vitest, Playwright, Resend, Upstash; Sentry and Cloudflare R2 remain optional (`INF-11`/`INF-12`; hosting evaluation pending `W0-E04`).
Versions: `package.json` and `pnpm-lock.yaml`. Node: `.nvmrc` (`26.13.0`, subject to final hosting compatibility).
Approved wave sequence: `W0` -> `W2A` -> `W1` -> (`W2B` / `W3` independent when prerequisites pass) -> `W4` -> `W5` -> `W6` -> `W7` -> `W8` -> `W9`.

## Rules

R1 Architecture is fixed. Do not change stack, folder layout, data model, auth model or payment flow without an approved ADR in docs/decisions. If a task seems to need it, stop.
R2 Read before write. Before editing read: this file, docs/STATE.md, the task's SRS IDs, and every file you will modify. List them in your plan first.
R3 Dependencies: only packages in docs/DEPENDENCIES.md. No new packages, no version changes, no "latest", no lockfile regeneration. If one is needed, stop and ask with reason, alternatives, size and maintenance status.
R4 Content: no visible text, name, price, contact detail, URL or color hardcoded in components. Use @/lib/content repositories, message keys via t(), and design tokens. Components never import from /content directly.
R5 Money: integer poisha, never floats. Never use floating-point math, parseFloat(), Number() or .toFixed() for chargeable prices. Use integer poisha (bigint) and pure string/integer conversions.
R6 Reuse: search src/components and src/lib for an existing component or helper before creating one. Extend instead of duplicating.
R7 Scope: change only files the task names or strictly requires. No drive-by refactors, renames or formatting sweeps. Report other problems instead of fixing them.
R8 Security, non-negotiable:

- Every protected page, server action and route handler calls requireStaff(permission) or requireOwnership on the server. Never rely on middleware, hidden UI or client checks.
- Never read a role from user_metadata. Never expose the service key, gateway credentials or any secret to client code. src/server files import "server-only".
- Validate all input with Zod on the server. Parameterized queries or RPC only. No dangerouslySetInnerHTML.
- Payment becomes paid only inside confirm_payment() after gateway server-to-server validation (execute + query). Never trust success, fail or cancel redirect data. Browser cancel/fail redirects NEVER release seat holds.
- Private receipts and recovery links require short-lived HMAC-SHA256 / scoped verified tokens or authenticated staff sessions (`PAY-13` PDF downloads via staff admission details only).
- Never weaken or disable RLS, CSP, rate limits, Turnstile or tests to make code pass.
- Never write real credentials anywhere. .env.example holds names only.
R9 Database: change schema only with a new forward SQL migration in supabase/migrations. Never edit an applied migration. Every table has RLS enabled and pgTAP tests. No destructive statement without approval.
R10 Never delete student, enrollment, payment, receipt or audit records (zero live refund functionality; no routine history purge). Archive or cancel with mandatory reason. Only dependency-free unused draft batches (`CAT-09`/`D08`) or separately owner-approved `W9` launch test cleanup may delete explicitly scoped records.
R11 Testing & Quality Gates (Risk-Based Testing ADR 0010):
- Level 0 (Docs & Config): Targeted file check, syntax validation, secret scan. No next build, no Vitest suite.
- Level 1 (Isolated UI & Content): Targeted lint, tsc --noEmit, affected component test.
- Level 2 (Feature Development): Unit and integration tests, failure-path tests, typecheck.
- Level 3 (Payments, Security, Migrations, PR Merge Gate): Complete pnpm verify (lint, typecheck, format:check, test, build), pgTAP RLS tests. Never mark done with failing, skipped or deleted tests.
R12 Report honestly: what you ran, the results, and what you did not verify. Say so when work is incomplete. Never call something complete without evidence.
R13 Accessibility: semantic HTML, labels, visible focus, keyboard operation, 24 px minimum targets, reduced motion. Add an axe check for each new page.
R14 Git (human-controlled). One task, one branch: task/<id>-<slug>. You may inspect (status, diff, log, branch) and create the task branch locally when authorized. You never stage, commit, push, merge, rebase, reset, tag, stash, force-push, delete branches or rewrite history unless the owner explicitly authorizes that specific operation. After every task, show a GIT CHECKPOINT with recommended Conventional Commit messages in the form <type>(<scope>): <summary> [SRS IDs]. Never commit to main. Do not edit AGENTS.md, .agents/ or docs/decisions unless the task says so.
R15 Demo data: new samples carry provenance class B. Never invent accreditation, statistics, testimonials, partners or mentor claims.
R16 Errors and logs: throw AppError with stable codes. Never log secrets or personal data. No console.log in committed code.
R17 Stop and ask when requirements conflict, the SRS is ambiguous, a rule needs an exception, or tests reveal a design flaw. Never guess about money, auth or deletion.
R18 Development Efficiency & Diagnostics:
- Read AGENTS.md and docs/STATE.md once per task session. Do not re-scan the entire project repeatedly.
- Never parse or extract binary PDF files (docs/source/*.pdf). Plain-text markdown is the textual authority.
- Two-attempt limit: If a command or configuration fails, diagnose the root cause. If the issue persists after two informed attempts, stop and report the blocker.
R19 End of every task: update docs/STATE.md (done, files changed, open issues, next task) and docs/traceability.csv (status implemented or verified, with evidence).

## Commands

pnpm dev | pnpm verify (lint, typecheck, format:check, unit, build) | pnpm test | pnpm test:e2e | pnpm tokens | pnpm db:reset (local only) | pnpm db:test

## Where things live

Scope Addendum docs/SCOPE-REVISION-V1.1.md (v1.0: docs/SCOPE-REVISION-V1.md) | Rev3.0 Package docs/LNA_Rev3.0/ | Architecture docs/architecture.md | Decisions docs/decisions/ | Security .agents/rules/10-*| Content .agents/rules/20-* | UI .agents/rules/30-*| Testing .agents/rules/40-* | Database .agents/rules/50-* | Task workflow .agents/workflows/

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
