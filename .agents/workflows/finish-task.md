# Workflow: Finish Task

**Purpose:** Protocol to execute at the completion of every task before presenting the report.

---

## 1. Automated Verification
Run all required quality checks and record exact output:
1. Execute `pnpm verify` (linting, typechecking, content validation, unit tests, and production build).
2. Execute task-specific test suites (e.g., `pnpm test`, `pnpm test:e2e`, or `pnpm db:test`).
3. Verify that zero tests were skipped, deleted, or assertions loosened.
4. If any check fails, fix the underlying defect before declaring completion.

---

## 2. Documentation Updates
1. Update `docs/traceability.csv`:
   - Set status of touched requirement IDs to `implemented` (if code is written) or `verified` (if tests ran and passed).
   - Add reference links to test files or implementation modules in the `evidence` column.
2. Update `docs/STATE.md`:
   - Record completed task ID, summary, branch name, and files changed.
   - Record exact commands run and actual pass/fail results.
   - Record commit status as `pending` (awaiting owner commit).
   - Update open gates, pending human actions, and identify the exact next eligible task.

---

## 3. Mandatory GIT CHECKPOINT
Display a block labeled exactly `GIT CHECKPOINT` formatted as specified in Master Prompt Section 6.4.

**CRITICAL INVARIANT:**
- Under ADR 0007 (Human-Controlled Git Workflow), the agent **must never** execute `git add`, `git commit`, `git push`, or `git merge`.
- This workflow must contain **no instruction or script** for the agent to commit or push.
- The checkpoint must provide exact, formatted commands for the human owner (Refat) to review, stage, and commit.

