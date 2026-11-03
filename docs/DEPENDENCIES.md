# Dependency Allowlist

**Authority:** LNA Website Development Blueprint Part 3.3  
**Status:** Phase 1 Tooling Pinned (P1-T1 & P1-T2 installed packages verified; subsequent package versions pre-resolved & approved)  
**Policy:** Only packages on this allowlist may be installed. Exact versions must be pinned with `save-exact=true`. Upgrades require written approval and dedicated pull requests.

---

## 1. Installed Core & Tooling Packages (Phase 1: Task P1-T1 & P1-T2)

| Package | Pinned Version | Purpose | Peer / Runtime Status |
| :--- | :--- | :--- | :--- |
| `next` | `16.4.4` | App Router, Turbopack, SSR, Edge runtime | Node.js >=20.9.0 (Running on 26.13.0) |
| `react` | `19.3.1` | Core UI library | Peer dependency of Next.js 16 |
| `react-dom` | `19.3.1` | React DOM renderer | Peer dependency of Next.js 16 |
| `tailwindcss` | `4.3.4` | CSS-first styling framework | Compatible with Next.js 16 |
| `@tailwindcss/postcss` | `4.3.4` | PostCSS plugin for Tailwind CSS 4 | PostCSS 8 integration |
| `postcss` | `8.5.3` | PostCSS core runner | Required by `@tailwindcss/postcss` |
| `typescript` | `5.8.2` | Strict TypeScript compiler | Typecheck passed |
| `@types/node` | `22.13.10` | Node.js type definitions | Node runtime typing |
| `@types/react` | `19.0.10` | React 19 type definitions | React 19 typing |
| `@types/react-dom` | `19.0.4` | React DOM 19 type definitions | React DOM typing |
| `eslint` | `9.22.0` | Static code analysis engine | Flat config enabled |
| `typescript-eslint` | `8.26.0` | TypeScript AST parser and tooling for ESLint 9 | Approved via Rule R3 review |
| `eslint-plugin-jsx-a11y` | `6.10.2` | JSX accessibility rule linter | WCAG 2.2 AA linting |
| `prettier` | `3.5.3` | Code syntax and style formatter | Formatter verified |
| `vitest` | `3.0.8` | Fast unit and integration test runner | Unit tests passing |
| `@testing-library/react` | `16.2.0` | React DOM testing utilities | Component tests passing |
| `jsdom` | `26.0.0` | DOM environment simulation for Vitest | Test environment |

---

## 2. Approved Pre-Resolved Packages (Subsequent Tasks)

These packages and versions were verified against the npm registry and approved by the owner during P1-T1 Step 1. They will be installed strictly as their respective tasks are executed.

### Data & Authentication (Phase 1 / Phase 2+)
- `@supabase/supabase-js`: `2.49.1` — Supabase client for database operations and RPC functions.
- `@supabase/ssr`: `0.5.2` — Server-side auth and cookie management for Next.js App Router.
- `zod`: `3.24.2` — Runtime schema declaration and validation.

### UI Primitives & Accessibility (Phase 2+)
- `@radix-ui/react-dialog`: `1.1.6` — Accessible modal dialog and sheet primitive.
- `@radix-ui/react-dropdown-menu`: `2.1.6` — Accessible dropdown menu primitive.
- `@radix-ui/react-tabs`: `1.1.3` — Accessible tab container primitive.
- `@radix-ui/react-accordion`: `1.2.3` — Accessible collapsible accordion primitive.
- `@radix-ui/react-select`: `2.1.6` — Accessible select dropdown primitive.
- `@radix-ui/react-checkbox`: `1.1.4` — Accessible checkbox primitive.
- `embla-carousel-react`: `8.5.2` — Touch/swipe carousel hook for hero and reviews.
- `lucide-react`: `0.477.0` — Consistent SVG icon system.
- `clsx`: `2.1.1` — Utility for conditional class names.
- `tailwind-merge`: `3.0.2` — Conflict-free utility class merging.

### Internationalization (Phase 3+)
- `next-intl`: `3.26.5` — Route localization (`/bn`) and translation messages.

### External Services & Utilities (Phase 5+)
- `resend`: `4.1.2` — Transactional email delivery.
- `@upstash/redis`: `1.34.4` — Distributed Redis client over HTTP.
- `@upstash/ratelimit`: `2.0.5` — Edge rate limiter for security endpoints.
- `@sentry/nextjs`: `9.5.0` — Application error and performance monitoring with PII scrubbing.
- `pdf-lib`: `1.17.1` — Pure JS PDF generation for receipts and certificates.
- `@pdf-lib/fontkit`: `1.1.1` — Font embedding engine for PDF rendering.

### Future Testing & CI (P1-T4, P1-T5+)
- `@playwright/test`: `1.51.0` — Cross-browser end-to-end test runner.
- `@axe-core/playwright`: `4.10.1` — Automated WCAG 2.2 AA accessibility auditor.
- `supabase`: `2.15.8` — Local Supabase stack, CLI, and migrations runner.
- `@lhci/cli`: `0.14.0` — Lighthouse CI performance auditor.

---

## 3. External Binaries & CI Tools

- `gitleaks`: Automated secret scanner detecting exposed credentials in commits and bundles.
- `k6`: Load and stress testing tool for 500-reader and concurrent transaction thresholds.
- `OWASP ZAP baseline`: Automated dynamic application security testing (DAST) scanner.
- `OSV scanner`: Dependency CVE vulnerability auditor.
