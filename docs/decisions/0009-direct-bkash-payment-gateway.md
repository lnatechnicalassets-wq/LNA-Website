# 0009. Direct bKash Payment Gateway Integration

**Status:** Proposed (Pending Human Approval)  
**Date:** 4 November 2026  
**Deciders:** Refat (Owner), Engineering Agent  
**Supersedes:** ADR 0003 (In-House SSLCOMMERZ Hosted Checkout Client)  
**Citations:** Supervisor Scope Revision; SRS Section 9.1; Business Rules BR-02, BR-05, BR-06  

---

## Context

The original project specification (ADR 0003) specified SSLCOMMERZ as the sole hosted payment processor for BDT course fee collection. The supervisor-approved initial release requirements explicitly mandate direct integration with the **bKash Payment Gateway API**. 

bKash is the dominant mobile financial service in Bangladesh. Directly integrating bKash eliminates intermediary gateway aggregator fees, reduces redirect friction for applicants, and aligns with the approved business requirements.

However, moving from a hosted multi-card aggregator (SSLCOMMERZ) to direct bKash requires strict architectural safeguards to prevent seat overselling, premature hold release, float arithmetic rounding errors, callback spoofing, and reconciliation gaps during network interruptions.

---

## Decision

### 1. In-House Typed Client Architecture
Implement a lightweight, strictly typed in-house client in `src/server/payments/bkash.ts` using standard Node.js `fetch`. Third-party npm wrapper packages are strictly forbidden (Rule R3).

The client implements a decoupled gateway interface:
```typescript
export interface PaymentGatewayClient {
  initiateCheckout(attempt: PaymentAttemptRecord): Promise<{ paymentId: string; redirectUrl: string }>;
  executePayment(paymentId: string): Promise<PaymentExecutionResult>;
  queryPaymentStatus(paymentId: string): Promise<PaymentStatusResult>;
  searchTransaction(trxId: string): Promise<TransactionSearchResult>;
}
```

### 2. Supported Products and API Parameterization
Official bKash merchant integration supports:
- **bKash Checkout (URL-Based PGW API)** for one-time e-commerce payments.
- **bKash Tokenized Checkout (Merchant API)** in agreement-less mode (`mode: "0011"`).

To guarantee compatibility with whichever merchant contract and credentials bKash issues during LNA merchant onboarding, all endpoint URLs, version paths, and credentials will be fully parameterized in server-only environment variables:
* `BKASH_BASE_URL` (Sandbox: `https://tokenized.sandbox.bka.sh` or `https://pay.bka.sh`; Production: `https://tokenized.pay.bka.sh` or `https://pay.bka.sh`)
* `BKASH_API_VERSION` (e.g. `v1.2.0-beta` or `v1`)
* `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD`

All credentials reside strictly on the server and are validated in `src/env.ts` with `server-only` guards. Zero credentials touch client bundles.

### 3. Pure Integer-Safe Monetary Arithmetic (Rule R5)
All prices, fees, discounts, and payment amounts are stored and calculated strictly in integer poisha (`bigint`, where `1 BDT = 100 poisha`). 

Floating-point operations, `parseFloat()`, `Number()`, and `.toFixed()` are strictly banned:
```typescript
export function poishaToBdtString(poisha: bigint): string {
  if (poisha < 0n) throw new Error("Amount cannot be negative");
  const taka = poisha / 100n;
  const rem = poisha % 100n;
  const remStr = rem < 10n ? `0${rem}` : `${rem}`;
  return `${taka}.${remStr}`;
}

export function bdtStringToPoisha(amountStr: string): bigint {
  const trimmed = amountStr.trim();
  const match = trimmed.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) throw new Error(`Invalid monetary amount format: "${amountStr}"`);
  const taka = BigInt(match[1]);
  const decimal = match[2] ? match[2].padEnd(2, "0") : "00";
  return taka * 100n + BigInt(decimal);
}
```

### 4. Safe Server-Controlled Seat Reservation & Expiration
* **Atomic Hold Reservation:** When an applicant submits an enrollment, the server calls PostgreSQL RPC `start_enrollment()` under an exclusive row lock (`SELECT ... FOR UPDATE` on the batch). A 30-minute reservation hold is granted (`hold_expires_at = now() + interval '30 minutes'`).
* **Untrusted Browser Callbacks:** Browser return redirects with `status=cancel` or `status=failure` are completely untrusted. **The server NEVER releases a seat hold based on browser redirect parameters.**
* **Retry Window Protection:** The seat hold remains active for the full 30 minutes, allowing the applicant to retry payment without losing their seat.
* **Passive Read-Time Expiration:** Available batch capacity is calculated in SQL at query time:
  $$\text{Available Seats} = \text{Capacity} - \text{Confirmed Enrollments} - \text{Active Holds } (\text{where } hold\_expires\_at > now())$$
* **Prevention of Overselling:** If the batch reaches capacity, no new holds can be created, and any checkout attempt for an expired hold is rejected during confirmation.

### 5. Delayed Verification & Reconciliation Engine
* **2-Step Payment Execution:** When the browser returns to the server callback URL with `paymentID` and `status=success`, the server calls:
  1. `executePayment(paymentID)`
  2. `queryPaymentStatus(paymentID)` (Independent server-to-server secondary check)
* **Delayed Verification Handling:** If a network drop, timeout, or gateway gateway disruption occurs during execution, the attempt remains in `pending` status. The user is shown a clear "Payment Pending Verification" screen.
* **Asynchronous Reconciliation Cron:** A secure background worker runs periodically to reconcile unresolved transactions using bKash `searchTransaction` by `trxID` or `queryPaymentStatus` by `paymentID`.
* **Atomic Confirmation:** Only when the gateway explicitly confirms `transactionStatus === "Completed"`, `statusCode === "0000"`, `currency === "BDT"`, and the amount parsed to poisha exactly matches the stored attempt does the database RPC `confirm_payment()` mark the enrollment as `confirmed` and issue a receipt.

### 6. Secure Receipt Access via HMAC-SHA256 Signatures
Because the student authentication portal is deferred from Release v1.0, private payment receipts are protected from enumeration:
* Receipt downloads from confirmation emails or public status lookups require a short-lived cryptographic signature:
  $$\text{Signature} = \text{HMAC\_SHA256}(\text{receipt\_no} + \text{public\_ref} + \text{expires\_timestamp}, \text{APP\_SECRET})$$
* Valid signature lifetime: 30 minutes.
* Authenticated staff administrators with `requireStaff("enrollments:read")` can inspect receipts directly.

---

## Consequences

### Positive
* Delivers the direct bKash mobile payment integration required by the supervisor.
* Completely eliminates third-party payment gateway fees and reduces redirect hops.
* Guarantees financial accuracy through pure integer poisha calculations.
* Eliminates race conditions and seat overselling via database row locks and passive hold expiration.
* Protects receipts against IDOR and scraping without needing learner accounts.

### Negative & Operational Requirements
* Requires managing bKash merchant credentials (`app_key`, `app_secret`, `username`, `password`) and token refresh lifecycles on the server.
* Requires an authenticated reconciliation cron to handle transient bKash timeouts.

