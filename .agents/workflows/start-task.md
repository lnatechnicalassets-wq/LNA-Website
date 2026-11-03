# Workflow: Start Task

**Purpose:** Protocol to execute at the start of every session or task.

---

## 1. Context Ingestion & Reconciliation
Before writing code or editing files, complete the following steps in order:
1. **Read Core Files:**
   - `AGENTS.md` (Standing non-negotiable rules)
   - `docs/STATE.md` (Current project progress, open gates, next task)
   - Relevant `.agents/rules/*.md` files matching the task scope
   - Relevant SRS requirement IDs in `docs/SRS.md`
   - Every existing file that will be modified
2. **Reconcile Git State:**
   - Run read-only commands: `git status`, `git branch -a`, `git log -n 3`.
   - Confirm current working tree is clean. If uncommitted changes exist from a prior task, halt and request human action.
   - Confirm predecessor task is committed/merged.
3. **Branch Verification:**
   - Confirm or create the local task branch `task/<id>-<slug>` from an up-to-date `main`. Never work directly on `main`.

---

## 2. Plan Formulation
State an explicit, focused scope in your response before touching code:
- **Objective:** One clear paragraph describing the outcome.
- **In Scope:** Exact files to create or modify and specific behaviors to implement.
- **Out of Scope:** Modules or behaviors not strictly required for this task.
- **Existing Helpers Check:** Confirmation of search in `src/components/` and `src/lib/` for existing code to reuse (Rule R6).
- **Security & Constraints Checklist:** Invariants, RLS policies, validation schemas, and gates touched.

---

## 3. Stop-and-Ask Conditions
Halt and ask the human owner before proceeding if:
- Requirements conflict or the SRS is ambiguous.
- A rule or invariant requires an exception.
- Tests reveal an architectural or design flaw.
- A new package or version change is needed that is not in `docs/DEPENDENCIES.md`.
- Code would touch files outside the task scope.
- Anything involves live money, real credentials, authentication bypass, or data deletion.
