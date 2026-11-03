# 0004. Dual-Layer Content Architecture (JSON to Supabase)

**Status:** Accepted  
**Date:** 3 November 2026  
**Deciders:** Refat (Owner), Engineering Agent  
**Citations:** Blueprint Part 5; SRS Section 4.1, 4.3, 5.2, 8.4  

## Context
SRS requirements mandate that staff can manage courses, batches, events, mentors, and homepage content through web forms without redeploying the site (SRS FR-CMS-001, FR-CMS-002). However, early development requires fast, version-controlled mock data in Git without dependency on live database instances.

## Decision
1. **Centralized JSON Baseline:** Content is stored as domain-organized JSON files under `content/` with build-time Zod schema validation (`pnpm content:validate`).
2. **Provenance Enforcement:** Every record carries an explicit provenance block (`class: "A" | "B"`, `verified: boolean`, `source`, `verifiedBy`, `verifiedOn`). Unverified claims are flagged as Class B and fail the production build when `CONTENT_STRICT=true`.
3. **Repository Abstraction:** Components never import from `content/` directly. All UI code accesses content via repository interfaces defined in `@/lib/content`.
4. **Gradual Cutover:** A server environment configuration (`CONTENT_SOURCE_<DOMAIN>=json|supabase`) allows domain-by-domain migration to PostgreSQL tables behind identical repository interfaces.

## Consequences
- Preserves clean Git-based content workflows during development while providing a zero-downtime path to dynamic database administration.
- Guarantees that unverified marketing or partnership claims cannot be deployed to production.

