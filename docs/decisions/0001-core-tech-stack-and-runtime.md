# 0001. Core Tech Stack and Runtime Architecture

**Status:** Accepted  
**Date:** 3 November 2026  
**Deciders:** Refat (Owner), Engineering Agent  
**Citations:** Blueprint Part 3.1; SRS Section 9, Figures 1, 4, 7  

## Context
Lead Nation Academy (lnabd.org) requires a modern web platform supporting public browsing for 100,000 monthly visitors, offline course enrollment, BDT fee collection via SSLCOMMERZ, a learner self-service portal, and an administrative portal. The legacy WordPress/Elementor site lacks transactional and security foundations.

## Decision
We adopt the fixed core stack defined in Blueprint Part 3:
1. **Runtime:** Node.js 24 LTS, pinned in `.nvmrc` and `package.json` `engines`.
2. **Framework:** Next.js 16.x App Router with strict TypeScript (`strict: true`, `noImplicitAny: true`).
3. **Styling:** Tailwind CSS 4.x with CSS-first configuration (`@theme`) and design tokens injected via CSS variables.
4. **Accessible Primitives:** Unstyled Radix UI primitives with custom Tailwind styling.
5. **Hosting:** Vercel paid commercial tier with edge caching for public assets and serverless execution for transactional routes.

## Consequences
- **Positive:** Unified TypeScript codebase from UI to database RPCs; high-speed edge caching for public traffic; strong static analysis preventing runtime defects.
- **Negative / Constraints:** Next.js 16 cache and revalidation APIs must be isolated behind dedicated service abstractions (`src/lib/cache/revalidate.ts`) to manage version shifts; Tailwind 4 removes `tailwind.config.js`, requiring CSS-only token imports.

