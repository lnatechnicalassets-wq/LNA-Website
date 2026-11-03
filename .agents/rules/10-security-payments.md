# 10. Security & Payments Engineering Rules

**Authority:** Blueprint Part 7; SRS Section 9.1, 10.1, 10.2  
**Scope:** Applies to all server code, authentication, authorization, payments, and database access.

---

## 1. Non-Negotiable Payment Invariants
1. **Server-Only Gateway Calls:** Only server-side modules in `src/server/payments/` may call SSLCOMMERZ endpoints. No store credentials or API keys may be present in client bundles or public requests.
2. **Order Validation Mandatory:** A payment is confirmed **only** inside `confirm_payment()`, and **only** after server-to-server Order Validation succeeds with an exact match on `tran_id`, `amount_minor`, `currency` (BDT), and `store_id`.
3. **Redirects Never Mark Paid:** The `success`, `fail`, and `cancel` return URLs never alter payment state directly. They display a pending state while polling the server verification result.
4. **Integer Currency Only:** All prices and payments are stored and calculated in integer poisha (`bigint`, `1 BDT = 100 poisha`). Floating-point arithmetic (`Number`, `parseFloat`) is strictly forbidden for financial calculations.
5. **No Card Data Storage:** Card numbers, CVV/CVC, expiration dates, and mobile banking OTPs never touch LNA servers.

---

## 2. Nine-Step Gateway Notification Processing
`processGatewayNotification(payload, source)` must follow these exact nine steps:
1. **Store Raw Payload:** Save the raw payload, with credentials redacted, in append-only table `payment_events`. Never fail silently.
2. **Lookup Attempt:** Look up `payment_attempts` by `tran_id`. If unknown, log anomaly and terminate without effect.
3. **Idempotency Check:** If the attempt is already in a terminal state (`validated`, `failed`, `cancelled`), return the existing result immediately.
4. **Verify Signature:** Verify `verify_sign` over gateway-specified fields using the store password. If invalid, record, alert, and stop.
5. **Server-to-Server Order Validation:** Call the SSLCOMMERZ Order Validation API with `val_id` and store credentials. If network/gateway error, leave attempt as `pending` for reconciliation cron.
6. **Strict Value Comparison:** Accept only `VALID` or `VALIDATED`. Compare:
   - `tran_id` matches stored attempt
   - `amount` matches stored `amount_minor` (parsed to integer poisha)
   - `currency` is `BDT`
   - `store_id` matches configured store ID  
   *Any mismatch sets status to `review_hold`, alerts staff, and stops.*
7. **Risk Assessment:** If gateway reports a risk flag (`risk_level === 1`), set `review_hold` and do not activate the account (SRS FR-PAY-008).
8. **Atomic Confirmation:** Call database RPC `confirm_payment(attempt_id, ...)` once under a transaction. Marks paid, confirms enrollment if seat is free, creates receipt row, and inserts outbox emails.
9. **Acknowledge Gateway:** Return standard plain acknowledgement (`200 OK`) to the gateway.

---

## 3. Threat Model Summary (T1 to T20)
- **T1 (Forged callback):** Validate signature hash + server-to-server Order Validation.
- **T2 (Amount tampering):** Server-side pricing calculation; client sends zero price fields.
- **T3 (Callback replay):** Unique constraints on `val_id` and `tran_id`; row lock idempotency check.
- **T4 (Seat oversell):** Row lock (`SELECT ... FOR UPDATE`) in `start_enrollment` and `confirm_payment`.
- **T5 (IDOR):** Random Crockford Base32 public refs + server ownership validation (`requireOwnership`).
- **T6 (Broken admin access):** `withStaff(permission)` wrapper on all staff actions + RLS policies.
- **T7 (Credential brute force):** Upstash Redis rate limiting + generic errors + Turnstile challenges.
- **T8 (Staff account takeover):** Mandatory second factor, short sessions, session revocation on password reset.
- **T9 (2FA bypass via email):** Super Admin must use TOTP authenticator app only; password reset revokes sessions.
- **T10 (SQL injection):** Parameterized queries and RPC arguments only; Zod input validation schemas.
- **T11 (Stored XSS):** Automatic React escaping; strict HTML sanitization; restrictive Content Security Policy.
- **T12 (CSRF):** Server Actions with Origin checks and SameSite cookies; mutation route handlers check Origin.
- **T13 (Malicious uploads):** File signature checks, format allowlist, size limits, image re-encoding.
- **T14 (Applicant enumeration):** Status lookup requires both `public_ref` AND `email`; uniform response timing.
- **T15 (Data leakage in exports):** Export permissions enforced, all export operations logged in `export_log`.
- **T16 (Secret key exposure):** `src/env.ts` validation, server-only import guards, CI `gitleaks` scanning.
- **T17 (Supply chain attack):** Dependency allowlist in `docs/DEPENDENCIES.md`, exact version pinning, `pnpm audit`.
- **T18 (AI agent code drift):** Automated test assertions, CI policy checks, human review on security files.
- **T19 (Mass email abuse):** Turnstile on public forms, IP and email rate limits, single confirmation email per day.
- **T20 (Gateway outage):** Graceful `pending` state retention, automated cron reconciliation, outbox retries.

---

## 4. Banned Patterns
- Banned: `dangerouslySetInnerHTML` without explicit sanitization and security approval.
- Banned: Reading user roles from `user_metadata` (must use `profiles.role` or `app_metadata`).
- Banned: Using `parseFloat` or `Number` for financial amounts (must parse integer poisha).
- Banned: Calling gateway APIs from browser client components or public route handlers.
- Banned: Skipping RLS policies or granting operational table writes to `anon` or `authenticated`.
- Banned: Hardcoding API keys, store passwords, or Supabase service keys in code or client bundles.
