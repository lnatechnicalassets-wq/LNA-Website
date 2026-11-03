# 0007. Human-Controlled Git and GitHub Workflow

**Status:** Accepted  
**Date:** 3 November 2026  
**Deciders:** Refat (Owner), Engineering Agent  
**Citations:** Master Execution Prompt Section 6.1; Blueprint Part 8.2 (Rule R14), Part 8.4, Part 10.1  

## Context
Blueprint Part 8.2 (Rule R14), Part 8.4, and Part 10.1 specified autonomous commits by the engineering agent. To prevent unauthorized history rewrites, accidental secret commits, or uncontrolled branching, the project owner (Refat) retains exclusive control over all repository history operations.

## Decision
1. **Human Ownership of Git Operations:**
   - Refat personally performs all staging (`git add`), commits (`git commit`), pushes (`git push`), pull requests, and merges (`git merge`).
   - The agent is permitted only read-only Git commands (`git status`, `git diff`, `git log`, `git branch`) and creating task branches locally (`task/<id>-<slug>`) from an up-to-date `main` when the working tree is clean.
   - The agent must never stage, commit, push, merge, rebase, reset, tag, stash, clean, checkout files, or delete branches without explicit human authorization in the current conversation turn.
2. **Replacement of Rule R14 in AGENTS.md:**
   - Rule R14 is replaced verbatim with the human-controlled Git rule:
     > "R14 Git (human-controlled). One task, one branch: task/<id>-<slug>. You may inspect (status, diff, log, branch) and create the task branch locally when authorized. You never stage, commit, push, merge, rebase, reset, tag, stash, force-push, delete branches or rewrite history unless the owner explicitly authorizes that specific operation. After every task, show a GIT CHECKPOINT with recommended Conventional Commit messages in the form <type>(<scope>): <summary> [SRS IDs]. Never commit to main. Do not edit AGENTS.md, .agents/ or docs/decisions unless the task says so."
3. **Mandatory Checkpoints:**
   - Every task ends with a formatted **GIT CHECKPOINT** detailing files changed, verification evidence, commit readiness (`READY` / `NOT READY`), recommended Conventional Commit messages, and exact Git commands for Refat to execute.
   - Every phase ends with a **PHASE COMPLETION: GITHUB CHECKPOINT**.

## Consequences
- Full human auditability and gatekeeping over all code entering `main`.
- Clean, atomic Conventional Commits mapped directly to SRS requirement IDs.

