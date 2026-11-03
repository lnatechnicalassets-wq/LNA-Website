# Dependency Allowlist

**Authority:** LNA Website Development Blueprint Part 3.3  
**Status:** Approved Initial Allowlist (No versions resolved yet; awaiting P1-T1 Step 1 review)  
**Policy:** Only packages on this allowlist may be installed. Exact versions will be pinned with `save-exact=true`. Upgrades require written approval and dedicated pull requests.

---

## Core Framework & Runtime
- `next`: Core web framework providing App Router, server components, and edge routing.
- `react`: Foundational declarative UI library for web components.
- `react-dom`: DOM renderer for React applications.
- `typescript`: Static type checker enforcing strict schema-to-code safety.
- `tailwindcss`: Utility-first CSS framework for design token styling.
- `@tailwindcss/postcss`: PostCSS plugin for Tailwind CSS 4 integration.

## Data & Authentication
- `@supabase/supabase-js`: Supabase client library for querying database and calling RPC functions.
- `@supabase/ssr`: Official Supabase utilities for managing authentication cookies across Next.js App Router surfaces.
- `zod`: TypeScript-first schema declaration and data validation library for JSON content, form submissions, and API routes.

## User Interface & Accessibility
- `@radix-ui/react-dialog`: Accessible modal dialog and sheet primitive.
- `@radix-ui/react-dropdown-menu`: Accessible dropdown menu primitive for navigation and actions.
- `@radix-ui/react-tabs`: Accessible tab container primitive for course status filtering.
- `@radix-ui/react-accordion`: Accessible collapsible accordion primitive for FAQs and curriculum modules.
- `@radix-ui/react-select`: Accessible select and dropdown picker primitive for forms.
- `@radix-ui/react-checkbox`: Accessible checkbox primitive for policy consent.
- `embla-carousel-react`: Lightweight, accessible carousel hook for hero slides and testimonials.
- `lucide-react`: SVG icon library for consistent visual indicators.
- `clsx`: Utility for constructing conditional className strings.
- `tailwind-merge`: Utility for safely merging Tailwind CSS classes without style conflicts.

## Internationalization
- `next-intl`: Localization library providing static path prefixing (`/bn`) and translation messages for system labels.

## External Services & Utilities
- `resend`: Official SDK for delivering transactional emails (receipts, passes, verification codes).
- `@upstash/redis`: Serverless HTTP-based Redis client for distributed state management.
- `@upstash/ratelimit`: Edge-compatible rate limiter for sensitive authentication and payment endpoints.
- `@sentry/nextjs`: Application error monitoring and performance tracking SDK with PII scrubbing.
- `pdf-lib`: Pure JavaScript library for reading and generating PDF receipts and certificates.
- `@pdf-lib/fontkit`: Advanced font engine for embedding custom fonts within PDF generation.

## Development, Testing & Quality Assurance
- `vitest`: Fast unit and integration test runner for business logic and server actions.
- `@testing-library/react`: DOM testing utilities for rendering and asserting React components.
- `jsdom`: Browser environment simulation for Vitest unit tests.
- `@playwright/test`: Cross-browser end-to-end test framework across mobile and desktop viewports.
- `@axe-core/playwright`: Automated WCAG 2.2 accessibility testing engine integrated with Playwright.
- `eslint`: Static code analysis tool enforcing linting and code quality standards.
- `eslint-plugin-jsx-a11y`: Static accessibility rules linter for JSX elements.
- `prettier`: Opinionated code formatter enforcing consistent syntax style.
- `supabase`: Local development CLI for database migrations, local Postgres stack, and type generation.
- `@lhci/cli`: Lighthouse CI command line tool for enforcing Core Web Vitals performance budgets.

## External Binaries & CI Tools
- `gitleaks`: Automated secret scanner detecting exposed credentials in commits and bundles.
- `k6`: Load and stress testing tool for validating 500-reader and concurrent transaction thresholds.
- `OWASP ZAP baseline`: Automated dynamic application security testing (DAST) scanner for vulnerability detection.
- `OSV scanner`: Open Source Vulnerability scanner checking dependencies against known CVE databases.

