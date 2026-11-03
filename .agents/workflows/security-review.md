# Workflow: Security Review

**Purpose:** Standard security evaluation checklist executed on every PR or task touching authentication, payments, database access, public inputs, or administrative features.

---

## Threat Review Checklist (T1 to T20)

Before completing any task touching sensitive boundaries, verify mitigations against the threat model:

| Threat | Check Item | Verification Question |
| :--- | :--- | :--- |
| **T1: Forged Payment** | SSLCOMMERZ callbacks | Is Order Validation called server-to-server with credentials kept off client? |
| **T2: Price Tampering** | Payment initiation | Is amount calculated entirely in server/DB from pricing function? |
| **T3: Replay Attack** | Idempotency | Are `val_id` and `tran_id` unique and verified under a database row lock? |
| **T4: Seat Oversell** | Concurrency | Does `start_enrollment` lock the batch row (`FOR UPDATE`) before capacity check? |
| **T5: IDOR** | Object access | Are public references random Crockford Base32 and verified via `requireOwnership`? |
| **T6: Admin Escalation** | Staff actions | Does every staff route/action call `withStaff(permission)` matching SRS 3.2? |
| **T7: Credential Stuffing** | Public forms | Are Upstash Redis rate limits and Turnstile challenges active? |
| **T8: Staff Account Takeover**| Sessions & 2FA | Is staff second factor verified and session revocable on password reset? |
| **T9: 2FA Bypass via Email** | Staff roles | Is TOTP mandatory for Super Admin? Are email codes hashed and short-lived? |
| **T10: SQL Injection** | Data queries | Are all queries parameterized or executed via typed Supabase RPCs? |
| **T11: Stored XSS** | Dynamic rendering | Is untrusted HTML escaped by default or sanitized via approved sanitizer? |
| **T12: CSRF** | Form submissions | Do server actions and mutation endpoints validate Origin and SameSite cookies? |
| **T13: Malicious Uploads** | Image pipeline | Are file magic numbers validated and images re-encoded? |
| **T14: Enumeration** | Status lookup | Does status lookup require both reference and email with uniform error timing? |
| **T15: Data Leak in Exports** | CSV exports | Are export actions restricted to authorized staff and logged in `export_log`? |
| **T16: Secret Exposure** | Bundles & Git | Are server secrets imported with `server-only` and checked by `gitleaks`? |
| **T17: Supply Chain** | Dependencies | Are all packages on the allowlist with exact pins in `pnpm-lock.yaml`? |
| **T18: Agent Code Drift** | Architecture | Are tests asserting policies passing without skipped assertions? |
| **T19: Mass Email Abuse** | Public mailers | Are forms rate-limited and emails restricted to submitted recipient? |
| **T20: Gateway Outage** | External resilience | Does payment stay pending safely with reconciliation cron handling retries? |

