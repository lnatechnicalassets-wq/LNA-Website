# 10. Security & Payments Engineering Rules

**Authority:** Blueprint Part 7; docs/SCOPE-REVISION-V1.md; Proposed ADR 0009; SRS Section 9.1, 10.1, 10.2  
**Scope:** Applies to all server code, authentication, authorization, payments, and database access.

---

## 1. Non-Negotiable Payment Invariants (bKash Gateway)
1. **Server-Only Gateway Calls:** Only server-side modules in `src/server/payments/bkash.ts` may call bKash endpoints. No credentials (`BKASH_*`) may be present in client bundles or public requests. All secrets are loaded via `src/env.ts` with `server-only` guards.
2. **Server-Side Validation Mandatory:** A payment is confirmed **only** inside `confirm_payment()`, and **only** after direct server-to-server `executePayment` and secondary status query (`queryPaymentStatus`) confirm `transactionStatus === "Completed"`, `statusCode === "0000"`, exact poisha amount, and currency `BDT`.
3. **Untrusted Redirects & Safe Seat Holds:** The `callbackURL` parameters are completely untrusted triggers.
   - Browser redirects with `status=cancel` or `status=failure` **NEVER** release seat holds.
   - The 30-minute seat hold remains intact for applicant retry until passive read-time SQL expiration (`hold_expires_at > now()`).
4. **Integer Currency Only (Rule R5):** All prices, fees, and payments are stored and calculated in integer poisha (`bigint`, `1 BDT = 100 poisha`). Floating-point arithmetic (`Number`, `parseFloat`, `.toFixed()`) is strictly forbidden for financial calculations. Use integer poisha and pure integer/string conversion utilities (`poishaToBdtString`, `bdtStringToPoisha`).
5. **No Mobile Banking PIN/OTP Storage:** bKash PINs, OTPs, and customer credentials never touch LNA servers. Authorization occurs on bKash-hosted interfaces.
6. **Secure Receipt Access:** Private receipts require short-lived HMAC-SHA256 signature tokens or verified staff sessions (`requireStaff("enrollments:read")`).

---

## 2. bKash Notification & Callback Processing Lifecycle
When an applicant returns to `/api/payments/bkash/callback`, the route handler must execute:
1. **Store Raw Notification:** Save raw parameters, with credentials redacted, in append-only table `payment_events`.
2. **Lookup Attempt:** Look up `payment_attempts` by stored `tran_id` / `paymentID`. If unknown, log anomaly and terminate without effect.
3. **Idempotency Check:** If the attempt is already in a terminal state (`validated`, `failed`, `cancelled`), return the existing result immediately without modifying state.
4. **Handle User Cancel / Failure Safely:** If status is `cancel` or `failure`, mark attempt as failed, but do **not** release the seat hold. Allow the applicant to retry within their 30-minute reservation window.
5. **Execute Payment:** If status is `success`, invoke bKash `executePayment(paymentID)` from the server.
6. **Secondary Server Status Query:** Execute `queryPaymentStatus(paymentID)` to independently verify `transactionStatus === "Completed"`.
7. **Strict Value Comparison:** Compare:
   - `merchantInvoiceNumber` matches stored attempt `tran_id`
   - Received `amount` parsed to poisha exactly matches `payment_attempts.amount_minor`
   - `currency` is `BDT`  
   *Any mismatch sets status to `review_hold`, alerts staff, and halts automated activation.*
8. **Atomic Confirmation:** Call database RPC `confirm_payment(attempt_id, trxID, verified_poisha)` under a transaction. Marks paid, transitions enrollment to `confirmed`, creates receipt row, and inserts outbox receipt email.
9. **Redirect User:** Redirect applicant to success screen with signed receipt download link.

---

## 3. Threat Model Summary (T1 to T20)
- **T1 (Forged callback):** Server-side `executePayment` + `queryPaymentStatus` with bKash; browser redirect never marks paid.
- **T2 (Amount tampering):** Server-side pricing calculation; client sends zero price fields.
- **T3 (Callback replay):** Unique constraints on `trx_id` and `tran_id`; row lock idempotency check.
- **T4 (Seat oversell):** PostgreSQL row lock (`SELECT ... FOR UPDATE`) in `start_enrollment` and `confirm_payment`.
- **T5 (IDOR):** Random Crockford Base32 public refs + HMAC-SHA256 signed receipt URLs (`requireOwnership`).
- **T6 (Broken admin access):** `requireStaff(permission)` wrapper on all staff actions + RLS policies.
- **T7 (Credential brute force):** Upstash Redis rate limiting + generic errors + Turnstile challenges.
- **T8 (Staff account takeover):** Mandatory second factor (TOTP/code), short sessions, session revocation on password reset.
- **T9 (2FA bypass via email):** Super Admin must use TOTP authenticator app only; password reset revokes sessions.
- **T10 (SQL injection):** Parameterized queries and RPC arguments only; Zod input validation schemas.
- **T11 (Stored XSS):** Automatic React escaping; strict HTML sanitization; restrictive Content Security Policy.
- **T12 (CSRF):** Server Actions with Origin checks and SameSite cookies; mutation route handlers check Origin.
- **T13 (Malicious uploads):** File signature checks, format allowlist, size limits, image re-encoding.
- **T14 (Applicant enumeration):** Status lookup requires both `public_ref` AND `email`; uniform response timing.
- **T15 (Data leakage in exports):** Export permissions enforced, all export operations logged in `audit_events`.
- **T16 (Secret key exposure):** `src/env.ts` validation, server-only import guards, CI `gitleaks` scanning.
- **T17 (Supply chain attack):** Dependency allowlist in `docs/DEPENDENCIES.md`, exact version pinning, `pnpm audit`.
- **T18 (AI agent code drift):** Automated test assertions, CI policy checks, human review on security files.
- **T19 (Mass email abuse):** Turnstile on public forms, IP and email rate limits, single confirmation email per day.
- **T20 (Gateway outage):** Graceful `pending` state retention, automated cron reconciliation, outbox retries.

---

## 4. Banned Patterns
- Banned: `dangerouslySetInnerHTML` without explicit sanitization and security approval.
- Banned: Reading user roles from `user_metadata` (must use `profiles.role` or `app_metadata`).
- Banned: Using `parseFloat`, `Number`, or `.toFixed()` for financial amounts (must parse integer poisha).
- Banned: Releasing a seat hold based on an untrusted browser cancel/failure callback.
- Banned: Calling gateway APIs from browser client components or public client routes.
- Banned: Skipping RLS policies or granting operational table writes to `anon` or public roles.
- Banned: Hardcoding API keys, bKash credentials, or Supabase service keys in code or client bundles.
