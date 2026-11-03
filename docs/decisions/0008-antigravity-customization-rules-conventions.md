# 0008. Antigravity Customization Rules Conventions and Limits

**Status:** Accepted  
**Date:** 3 November 2026  
**Deciders:** Refat (Owner), Engineering Agent  
**Citations:** Master Execution Prompt Section 2; Blueprint Part 8.1, 8.4; Antigravity 2.0 System Documentation  

## Context
Blueprint Part 8.1 noted that Antigravity rules and workflow files might be capped at 12,000 characters based on secondary sources. Master Prompt Section 2 required verifying the installed Antigravity version conventions and terminal execution settings prior to creating configuration files.

## Decision
1. **Rule File Limits:**
   - Inspection of the installed Antigravity version (`agy-customizations`) confirms a **Per-File Limit of 24,000 bytes (24 KB)** after include expansion.
   - The aggregate budget for always-on and global rules is **20,000 tokens** (`defaultRulesBudget`). Over-budget rules are demoted from full inline text to file path pointers.
   - All `.agents/rules/*.md` and `AGENTS.md` files must remain strictly under 10,000 characters to stay well clear of limits.
2. **File Locations & Loading Precedence:**
   - Root project rules: `AGENTS.md` and `GEMINI.md` at project root.
   - Topic rules: `.agents/rules/*.md`.
   - Workflows: `.agents/workflows/*.md`.
   - Skills: `.agents/skills/<name>/SKILL.md` (progressive disclosure).
3. **Terminal Execution Policy Enforcement:**
   - Antigravity 2.0 provides `Tool Execution Policy` (`always-proceed`, `request-review`, `strict`, `proceed-in-sandbox`) and `Command Allowlist / Denylist`.
   - We recommend that Refat place Git-mutating commands (`git add`, `git commit`, `git push`, `git merge`, `git rebase`, `git reset`, `git tag`, `git stash`, `git clean`, `git checkout` of files, `git branch -d`/`-D`) on the **Command Denylist** or require explicit user review, mechanically enforcing ADR 0007.

## Consequences
- Prevents context truncation or rule demotion.
- Aligns repository structure with official Antigravity discovery paths.

