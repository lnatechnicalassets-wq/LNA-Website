# Dependency Allowlist

**Authority:** LNA Website Development Blueprint Part 3.3 + LNA Rev3.0 Reconciliation (`W0-E01`)  
**Status:** Synchronized with `package.json` (`next` `16.4.6`, Node `.nvmrc` `26.13.0`, `pnpm` `12.16.1`)  
**Policy:** Only approved packages on this allowlist may be installed (`AGENTS.md` Rule R3). Exact versions must be pinned with `save-exact=true`. Pending Rev3.0 additions (`.xlsx` generator in `W5-T03`, PDF receipt verification in `W5-T04`, Playwright/axe in `W0-E02`/`W8`) require explicit owner approval before installation.

---

## 1. Installed Core & Tooling Packages (Observed in `package.json`)

| Package | Pinned Version | Purpose | Peer / Runtime Status |
| :--- | :--- | :--- | :--- |
| `next` | `16.4.6` | App Router, Turbopack, SSR, Edge runtime | Node.js `>=26.0.0` (`.nvmrc` `26.13.0`; subject to `W0-E04` host check) |
| `react` | `19.3.1` | Core UI library | Installed |
| `react-dom` | `19.3.1` | React DOM renderer | Installed |
| `@supabase/supabase-js` | `2.49.1` | Supabase client for database operations, Storage, and RPCs | **Installed** |
| `@supabase/ssr` | `0.5.2` | Server-side auth and cookie management for Next.js App Router | **Installed** |
| `resend` | `4.1.2` | Transactional email delivery (`W3` worker pending) | **Installed** |
| `@upstash/redis` | `1.34.4` | Distributed Redis client over HTTP (`W2A-T05` completion pending) | **Installed** |
| `@upstash/ratelimit` | `2.0.5` | Sliding-window rate limiter (`W2A-T05` completion pending) | **Installed** |
| `tailwindcss` | `4.3.4` | CSS-first styling framework | Installed |
| `@tailwindcss/postcss` | `4.3.4` | PostCSS plugin for Tailwind CSS 4 | Installed |
| `postcss` | `8.5.3` | PostCSS core runner | Installed |
| `typescript` | `5.8.2` | Strict TypeScript compiler | Installed |
| `@types/node` | `22.13.10` | Node.js type definitions | Installed |
| `@types/react` | `19.0.10` | React 19 type definitions | Installed |
| `@types/react-dom` | `19.0.4` | React DOM 19 type definitions | Installed |
| `eslint` | `9.22.0` | Static code analysis engine | Installed |
| `typescript-eslint` | `8.26.0` | TypeScript AST parser and tooling for ESLint 9 | Installed |
| `eslint-plugin-jsx-a11y` | `6.10.2` | JSX accessibility rule linter | Installed |
| `prettier` | `3.5.3` | Code syntax and style formatter | Installed |
| `vitest` | `3.0.8` | Fast unit and integration test runner | Installed |
| `@testing-library/react` | `16.2.0` | React DOM testing utilities | Installed |
| `jsdom` | `26.0.0` | DOM environment simulation for Vitest | Installed |
| `zod` | `3.24.2` | Runtime schema declaration and validation | Installed |
| `server-only` | `0.0.1` | Next.js compile-time boundary for server-only modules | Installed |
| `@radix-ui/react-dialog` | `1.1.6` | Accessible modal dialog and sheet primitive | Installed |
| `clsx` | `2.1.1` | Conditional class name utility | Installed |
| `tailwind-merge` | `3.0.2` | Conflict-free utility class merging | Installed |
| `lucide-react` | `0.477.0` | Accessible SVG icon system | Installed |
| `@vercel/analytics` | `2.0.1` | Privacy-focused web analytics without PII or tracking cookies | Installed |
| `@vercel/speed-insights` | `2.0.0` | Real User Monitoring (RUM) Core Web Vitals telemetry | Installed |

---

## 2. Pre-Resolved / Pending Rev3.0 Packages (Not Yet Installed)

> **Important (`W0-E01`):** None of the packages below are currently installed in `package.json`. Install strictly under their governing task after verifying license, Bengali rendering/security, and host compatibility.

### PDF Payment Receipts (`PAY-13` / `C-16` / `W5-T04` — Under Review, Not Installed)
- `pdf-lib` (`1.17.1`) and `@pdf-lib/fontkit` (`1.1.1`) — Previously pre-resolved; must be evaluated in `W5-T04` for A4 branded receipt layout and Unicode/Bengali name font embedding before installation.

### True `.xlsx` Spreadsheet Export (`REP-04` / `D57` / `W5-T03` — Approval Pending)
- **No `.xlsx` library is currently approved or installed.** In `W5-T03`, submit an explicit Rule R3 comparison (security/CVEs, bundle size, maintenance status, formula-injection safety) for owner approval before installing any package.

### Optional / Deferred Packages
- `@sentry/nextjs` (`9.5.0`) — **Optional** (`INF-12`, `C-09`); not required by Rev3.0 baseline.
- `next-intl` (`3.26.5`) — **Deferred / Excluded** from LNA v1.1 (`CMS-01`, English-only).
- Unused Radix / carousel optional pre-resolutions (`@radix-ui/react-dropdown-menu` `2.1.6`, `@radix-ui/react-tabs` `1.1.3`, `@radix-ui/react-accordion` `1.2.3`, `@radix-ui/react-select` `2.1.6`, `@radix-ui/react-checkbox` `1.1.4`, `embla-carousel-react` `8.5.2`) — retain as pre-approved only if needed by shared `W2A-T03` / `W7` components.

### Testing & Local Database Tooling (`W0-E02`, `W0-E03`, `W8`)
- `@playwright/test` (`1.51.0`) — **Not Installed**; required for E2E regression (`W8-T03`).
- `@axe-core/playwright` (`4.10.1`) — **Not Installed**; required for WCAG 2.2 AA audits (`W8-T02`/`W8-T03`).
- `supabase` (`2.15.8` npm wrapper) — **Not Installed** and reported to fail `postinstall` on Windows `win32-x64` (`INF-03`); prefer supported Windows installer (e.g., Scoop) or pinned Linux CI + Docker (`W0-E03`) instead of adding npm wrapper to `package.json` without approval.
- `@lhci/cli` (`0.14.0`) — Optional Lighthouse CI auditor.

---

## 3. External Binaries & CI Tools

- `gitleaks`: Automated secret scanner detecting exposed credentials in commits and bundles.
- `k6`: Load and stress testing tool for 500-reader and concurrent transaction thresholds.
- `OWASP ZAP baseline`: Automated dynamic application security testing (DAST) scanner.
- `OSV scanner`: Dependency CVE vulnerability auditor.
