# LNA Website: agent rules (read fully before every task)

## Project

Rebuild of lnabd.org for Lead Nation Academy: public site, learner portal, admin portal.
Offline courses only. Paid enrollment through SSLCOMMERZ hosted checkout (BDT).
Sources of truth, in order: docs/SRS.md (requirement IDs), docs/architecture.md, docs/decisions/, docs/STATE.md. If a task prompt conflicts with them, STOP and ask.

## Fixed stack

Next.js 16.x App Router, TypeScript strict, Tailwind 4, Supabase (Postgres, Auth, Storage), Zod, pnpm, Vitest, Playwright, Resend, Upstash, Sentry.
Versions: package.json and pnpm-lock.yaml. Node: .nvmrc.

## Rules

R1 Architecture is fixed. Do not change stack, folder layout, data model, auth model or payment flow without an approved ADR in docs/decisions. If a task seems to need it, stop.
R2 Read before write. Before editing read: this file, docs/STATE.md, the task's SRS IDs, and every file you will modify. List them in your plan first.
R3 Dependencies: only packages in docs/DEPENDENCIES.md. No new packages, no version changes, no "latest", no lockfile regeneration. If one is needed, stop and ask with reason, alternatives, size and maintenance status.
R4 Content: no visible text, name, price, contact detail, URL or color hardcoded in components. Use @/lib/content repositories, message keys via t(), and design tokens. Components never import from /content directly.
R5 Money: integer poisha, never floats. Never compute a chargeable price in the browser or from JSON. Use the server pricing function backed by the database.
R6 Reuse: search src/components and src/lib for an existing component or helper before creating one. Extend instead of duplicating.
R7 Scope: change only files the task names or strictly requires. No drive-by refactors, renames or formatting sweeps. Report other problems instead of fixing them.
R8 Security, non-negotiable:

- Every protected page, server action and route handler calls requireLearner, requireStaff(permission) or requireOwnership on the server. Never rely on middleware, hidden UI or client checks.
- Never read a role from user_metadata. Never expose the service key, store password or any secret to client code. src/server files import "server-only".
- Validate all input with Zod on the server. Parameterized queries or RPC only. No dangerouslySetInnerHTML.
- Payment becomes paid only inside confirm_payment() after gateway server-side validation. Never trust success, fail or cancel redirect data. Never accept an amount from the client.
- Never weaken or disable RLS, CSP, rate limits, Turnstile or tests to make code pass.
- Never write real credentials anywhere. .env.example holds names only.
R9 Database: change schema only with a new forward SQL migration in supabase/migrations. Never edit an applied migration. Every table has RLS enabled and pgTAP tests. No destructive statement without approval.
R10 Never delete enrollment, payment, refund, certificate or audit records. Archive.
R11 Tests: add or update tests for the behavior you change. Run `pnpm verify` and the task's extra checks before saying done. Never mark done with failing, skipped or deleted tests, and never loosen an assertion to pass.
R12 Report honestly: what you ran, the results, and what you did not verify. Say so when work is incomplete. Never call something complete without evidence.
R13 Accessibility: semantic HTML, labels, visible focus, keyboard operation, 24 px minimum targets, reduced motion. Add an axe check for each new page.
R14 Git (human-controlled). One task, one branch: task/<id>-<slug>. You may inspect (status, diff, log, branch) and create the task branch locally when authorized. You never stage, commit, push, merge, rebase, reset, tag, stash, force-push, delete branches or rewrite history unless the owner explicitly authorizes that specific operation. After every task, show a GIT CHECKPOINT with recommended Conventional Commit messages in the form <type>(<scope>): <summary> [SRS IDs]. Never commit to main. Do not edit AGENTS.md, .agents/ or docs/decisions unless the task says so.
R15 Demo data: new samples carry provenance class B. Never invent accreditation, statistics, testimonials, partners or mentor claims.
R16 Errors and logs: throw AppError with stable codes. Never log secrets or personal data. No console.log in committed code.
R17 Stop and ask when requirements conflict, the SRS is ambiguous, a rule needs an exception, or tests reveal a design flaw. Never guess about money, auth or deletion.
R18 End of every task: update docs/STATE.md (done, files changed, open issues, next task) and docs/traceability.csv (status implemented or verified, with evidence).

## Commands

pnpm dev | pnpm verify (lint, typecheck, content:validate, unit, build) | pnpm test | pnpm test:e2e | pnpm content:validate | pnpm tokens | pnpm db:reset (local only) | pnpm db:test

## Where things live

Architecture docs/architecture.md | Decisions docs/decisions/ | Security .agents/rules/10-*| Content .agents/rules/20-* | UI .agents/rules/30-*| Testing .agents/rules/40-* | Database .agents/rules/50-* | Task workflow .agents/workflows/
