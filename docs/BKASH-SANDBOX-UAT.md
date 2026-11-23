# bKash sandbox UAT

The hosted payment step is part of `/enroll`. Open a paid batch on a staging deployment and choose **Continue to bKash Checkout** on its payment step. The staging payment step is marked **Sandbox test payment**.

## Staging setup

1. Apply these migrations in order to the staging Supabase database before deploying this version. Skip any already applied.
   - `supabase/migrations/20261123100000_bkash_sandbox_checkout_v2.sql`
   - `supabase/migrations/20261123110000_bkash_supabase_token_cache.sql`
2. Set the following in the staging server environment. Keep the production merchant settings in the production environment. Use the Supabase project for staging.
3. Use the public HTTPS staging origin as `APP_URL`. The merchant callback must reach `/api/payments/bkash/callback` directly without a preview protection sign-in. Register the URL with bKash if required for your merchant account.

```dotenv
APP_URL=https://your-staging-domain.example
BKASH_CHECKOUT_MODE=live
BKASH_BASE_URL=https://tokenized.sandbox.bka.sh/v2
BKASH_API_VERSION=v2
BKASH_MODE=0011
BKASH_CHECKOUT_URL_APP_KEY=
BKASH_CHECKOUT_URL_APP_SECRET=
BKASH_CHECKOUT_URL_USER_NAME=
BKASH_CHECKOUT_URL_PASSWORD=
# Enable only while running the sandbox refund check.
BKASH_SANDBOX_REFUNDS_ENABLED=false
```

Fill the empty values from your bKash merchant account, and keep them server-side. The app also needs its staging Supabase URL and keys and a random `APP_SECRET` of at least 32 characters. The existing `live` mode means requests go to the configured host. The URL above sends them to bKash sandbox. Set or clear any existing canonical `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME` and `BKASH_PASSWORD` values in staging because canonical variables take precedence over the aliases.

All app instances using the same merchant credentials should point to the same Supabase database. PostgreSQL serializes Grant requests per merchant and counts failed and successful attempts toward the two-request rolling hourly limit. A cached token lasts up to one hour, or less if bKash issues a shorter lifetime. Upstash remains optional for the site's existing distributed rate limiting. The checkout does not use it.

When switching from the previous Redis-backed patch for an active merchant, stop the previous workers and allow one hour from the last Grant attempt before starting the new checkout workers. Supabase starts with an empty cache and cannot count previous Grant calls made through Redis. Avoid direct Grant calls in Postman during app testing.

## Validation checklist

| Case | Expected |
| --- | --- |
| Multiple checkouts and a refund within the token lifetime | They reuse the stored `id_token`. The token is sent only to bKash. |
| Hosted callback reports `failure` or `cancel` | The applicant returns to the failure or cancellation view. No Execute or Query runs. The existing seat hold remains active. |
| Hosted callback reports `success`, Execute returns `Completed` with matching values | Enrollment is atomically confirmed. No Query runs. |
| Execute returns a non-completed response | Applicant returns to the failure view and sees `errorMessageEn` when provided. No Query runs. |
| Execute times out or has a null response | The attempt is recorded as `EXECUTE_NO_RESPONSE` and Query is used as fallback. Inconclusive replies stay pending. |
| Two success callbacks arrive together | Only the claimed attempt sends Execute. A second unsettled charge for the same enrollment is blocked. |
| Ownership token or callback signature is tampered with | The callback cannot execute or show another application’s payment details. |
| Refund succeeds | The validated sandbox attempt records the refund transaction ID. A replay cannot send a second refund. |

Use a fault test or mocked Execute call for the timeout, null, and explicit gateway error cases. The server-side event trail stores redacted callback, Execute and Query payloads. If a worker stops after it claims Execute but before it records any outcome, the attempt stays pending for staff to review in the merchant records. It is not eligible for automatic Query because a missing gateway reply was never observed.

## Sandbox refund

1. Confirm one sandbox payment on staging.
2. Set `BKASH_SANDBOX_REFUNDS_ENABLED=true` on staging and redeploy. Sign in as an active Super Admin with MFA.
3. In **Admissions**, open the confirmed enrollment. Select **Refund sandbox payment** in the header action row, check the amount and original transaction ID, then select **Confirm refund**.
4. Confirm the refund status and transaction ID appear in the header. The same authenticated request can also be sent to `POST /api/payments/bkash/sandbox-refund` with `{ "paymentAttemptId": "<sandbox attempt UUID>" }` for API verification.

The test sends a full sandbox refund for the exact amount recorded on the validated attempt and uses the same Supabase-backed `id_token` as checkout. It records the result on the attempt and in the audit trail. The endpoint is disabled by default and is restricted to the sandbox v2 host, sandbox-origin payment attempts, and same-origin staff sessions. Refunds do not change the enrollment or seat state in this UAT workflow.

The request uses bKash’s documented v2 refund endpoint and field names. A report in the bKash developer repository describes a different contract for older integrations. Verify the endpoint and response for this merchant during UAT. An unconfirmed refund stays blocked from automatic resubmission. Check the merchant records for that transaction before any further action.

## Local verification

The payment and enrollment tests, TypeScript and the Webpack production build passed. Run the database checks in `supabase/tests/0017_bkash_sandbox_checkout_v2.sql` and `supabase/tests/0018_bkash_supabase_token_cache.sql`, then verify a sandbox wallet checkout and refund.
