-- =============================================================================
-- pgTAP Security, RLS, Idempotency & Payment RPC Tests for 20261110235500
-- Authority: ADR 0009, .agents/rules/10-security-payments.md, .agents/rules/50-database.md
-- Prerequisite: migration 20261110161500 AND 20261110235500 applied; pgTAP enabled.
-- Reproducibility: Self-contained fixtures inside BEGIN; ... ROLLBACK;.
-- =============================================================================

BEGIN;
SELECT plan(58);

-- -----------------------------------------------------------------------------
-- 0. Reproducible Transaction-Scoped Fixtures (Rolled Back Cleanly)
-- -----------------------------------------------------------------------------
INSERT INTO public.courses (
  slug, title, subtitle, category, summary, description, delivery_mode, venue, status, provenance, is_dev_fixture, fixture_label, published_at
)
VALUES
  (
    'pgtap2-paid-course',
    'pgTAP2 Paid Course',
    'Paid course test subtitle',
    'Testing',
    'Paid course summary long enough for check.',
    'Paid course description long enough for minimum length constraint check.',
    'offline',
    'Dhaka Test Campus',
    'published',
    '{"class":"B","verified":false,"source":"pgTAP2 course fixture","verifiedBy":null,"verifiedOn":null}'::jsonb,
    true,
    'PGTAP2_FIXTURE',
    TIMESTAMPTZ '2026-11-10T00:00:00Z'
  ),
  (
    'pgtap2-free-course',
    'pgTAP2 Free Course',
    'Free course test subtitle',
    'Testing',
    'Free course summary long enough for check.',
    'Free course description long enough for minimum length constraint check.',
    'offline',
    'Dhaka Test Campus',
    'published',
    '{"class":"B","verified":false,"source":"pgTAP2 free course fixture","verifiedBy":null,"verifiedOn":null}'::jsonb,
    true,
    'PGTAP2_FIXTURE',
    TIMESTAMPTZ '2026-11-10T00:00:00Z'
  );

INSERT INTO public.batches (
  course_id, slug, batch_number, name, start_date, end_date, schedule_description, capacity, historical_enrolled_count,
  seat_hold_duration_minutes, fee_poisha, status, venue, provenance, is_dev_fixture, fixture_label
)
SELECT
  c.id,
  'pgtap2-batch-small',
  1,
  'pgTAP2 Small Capacity Batch',
  DATE '2026-12-01',
  DATE '2027-01-31',
  '16 Sessions Test',
  2,
  1,
  30,
  750000::bigint,
  'open_for_enrollment',
  'Dhaka Test Campus',
  '{"class":"B","verified":false,"source":"pgTAP2 batch fixture","verifiedBy":null,"verifiedOn":null}'::jsonb,
  true,
  'PGTAP2_FIXTURE'
FROM public.courses c WHERE c.slug = 'pgtap2-paid-course';

INSERT INTO public.batches (
  course_id, slug, batch_number, name, start_date, end_date, schedule_description, capacity, historical_enrolled_count,
  seat_hold_duration_minutes, fee_poisha, status, venue, provenance, is_dev_fixture, fixture_label
)
SELECT
  c.id,
  'pgtap2-batch-free',
  1,
  'pgTAP2 Free Batch',
  DATE '2026-12-15',
  DATE '2026-12-15',
  '1 Workshop Session',
  5,
  0,
  30,
  0::bigint,
  'open_for_enrollment',
  'Dhaka Test Campus',
  '{"class":"B","verified":false,"source":"pgTAP2 free batch fixture","verifiedBy":null,"verifiedOn":null}'::jsonb,
  true,
  'PGTAP2_FIXTURE'
FROM public.courses c WHERE c.slug = 'pgtap2-free-course';

-- Synthetic Auth users + staff profiles for RLS isolation verification
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'superadmin.test1@example.invalid', '{"provider":"email"}'::jsonb, '{}'::jsonb, now(), now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin.test2@example.invalid', '{"provider":"email"}'::jsonb, '{}'::jsonb, now(), now()),
  ('33333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'disabled.test3@example.invalid', '{"provider":"email"}'::jsonb, '{}'::jsonb, now(), now());

INSERT INTO public.profiles (id, email, full_name, role, account_state)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'superadmin.test1@example.invalid', 'Super Admin One', 'super_admin', 'active'),
  ('22222222-2222-4222-8222-222222222222', 'admin.test2@example.invalid', 'Staff Two', 'admin', 'active'),
  ('33333333-3333-4333-8333-333333333333', 'disabled.test3@example.invalid', 'Disabled Staff', 'super_admin', 'disabled');

-- -----------------------------------------------------------------------------
-- 1. Schema & RLS Posture (10 assertions)
-- -----------------------------------------------------------------------------
SELECT has_table('public', 'profiles', 'profiles table exists');
SELECT has_table('public', 'payment_attempts', 'payment_attempts table exists');
SELECT has_table('public', 'payment_events', 'payment_events table exists');
SELECT has_table('public', 'email_outbox', 'email_outbox table exists');
SELECT has_table('public', 'audit_events', 'audit_events table exists');

SELECT ok((SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'profiles'), 'RLS enabled on profiles');
SELECT ok((SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'payment_attempts'), 'RLS enabled on payment_attempts');
SELECT ok((SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'payment_events'), 'RLS enabled on payment_events');
SELECT ok((SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'email_outbox'), 'RLS enabled on email_outbox');
SELECT ok((SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'audit_events'), 'RLS enabled on audit_events');

-- -----------------------------------------------------------------------------
-- 2. Explicit Privilege & Immutability Matrix (21 assertions)
-- -----------------------------------------------------------------------------
SELECT ok(has_table_privilege('authenticated', 'public.profiles', 'SELECT'), 'authenticated has SELECT grant on profiles');
SELECT ok(NOT has_table_privilege('authenticated', 'public.profiles', 'INSERT'), 'authenticated has NO INSERT grant on profiles');
SELECT ok(NOT has_table_privilege('authenticated', 'public.profiles', 'UPDATE'), 'authenticated has NO UPDATE grant on profiles');
SELECT ok(NOT has_table_privilege('authenticated', 'public.profiles', 'DELETE'), 'authenticated has NO DELETE grant on profiles');

SELECT ok(NOT has_table_privilege('anon', 'public.profiles', 'SELECT'), 'anon has NO SELECT grant on profiles');
SELECT ok(NOT has_table_privilege('anon', 'public.payment_attempts', 'SELECT'), 'anon has NO SELECT grant on payment_attempts');
SELECT ok(NOT has_table_privilege('authenticated', 'public.payment_attempts', 'SELECT'), 'authenticated has NO SELECT grant on payment_attempts');
SELECT ok(NOT has_table_privilege('authenticated', 'public.payment_events', 'SELECT'), 'authenticated has NO SELECT grant on payment_events');
SELECT ok(NOT has_table_privilege('authenticated', 'public.email_outbox', 'SELECT'), 'authenticated has NO SELECT grant on email_outbox');
SELECT ok(NOT has_table_privilege('authenticated', 'public.audit_events', 'SELECT'), 'authenticated has NO SELECT grant on audit_events');

SELECT ok(NOT has_table_privilege('service_role', 'public.profiles', 'DELETE'), 'service_role has NO DELETE grant on profiles');
SELECT ok(NOT has_table_privilege('service_role', 'public.payment_attempts', 'DELETE'), 'service_role has NO DELETE grant on payment_attempts');
SELECT ok(NOT has_table_privilege('service_role', 'public.payment_events', 'DELETE'), 'service_role has NO DELETE grant on payment_events');
SELECT ok(NOT has_table_privilege('service_role', 'public.payment_events', 'UPDATE'), 'service_role has NO UPDATE grant on append-only payment_events');
SELECT ok(NOT has_table_privilege('service_role', 'public.email_outbox', 'DELETE'), 'service_role has NO DELETE grant on email_outbox');
SELECT ok(NOT has_table_privilege('service_role', 'public.audit_events', 'DELETE'), 'service_role has NO DELETE grant on audit_events');
SELECT ok(NOT has_table_privilege('service_role', 'public.audit_events', 'UPDATE'), 'service_role has NO UPDATE grant on append-only audit_events');

SELECT ok(NOT has_function_privilege('anon', 'public.start_enrollment(text,text,text,text,text,text,jsonb,jsonb)', 'EXECUTE'), 'anon cannot EXECUTE start_enrollment');
SELECT ok(NOT has_function_privilege('authenticated', 'public.start_enrollment(text,text,text,text,text,text,jsonb,jsonb)', 'EXECUTE'), 'authenticated cannot EXECUTE start_enrollment');
SELECT ok(NOT has_function_privilege('authenticated', 'public.confirm_payment(uuid,text,text,bigint,text,text,text)', 'EXECUTE'), 'authenticated cannot EXECUTE confirm_payment');
SELECT ok(NOT has_function_privilege('authenticated', 'public.record_payment_outcome(uuid,text,text,text,text,text)', 'EXECUTE'), 'authenticated cannot EXECUTE record_payment_outcome');

-- -----------------------------------------------------------------------------
-- 3. Browser Role Isolation Checks (8 assertions)
-- -----------------------------------------------------------------------------
SET LOCAL ROLE anon;
SELECT throws_ok($$ SELECT email FROM public.profiles $$, '42501', NULL, 'anon cannot read profiles');
SELECT throws_ok($$ SELECT tran_id FROM public.payment_attempts $$, '42501', NULL, 'anon cannot read payment_attempts');
SELECT throws_ok($$ SELECT payload FROM public.email_outbox $$, '42501', NULL, 'anon cannot read email_outbox');
RESET ROLE;

DO $$ BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
END $$;
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.profiles), 1, 'authenticated active staff can read only own profile row');
SELECT is((SELECT count(*)::int FROM public.profiles WHERE id = '22222222-2222-4222-8222-222222222222'), 0, 'authenticated staff cannot read another staff profile');
RESET ROLE;

DO $$ BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
END $$;
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.profiles), 0, 'disabled staff profile cannot read own row');

SELECT throws_ok($$ SELECT tran_id FROM public.payment_attempts $$, '42501', NULL, 'authenticated cannot SELECT payment_attempts');
SELECT throws_ok($$ SELECT action FROM public.audit_events $$, '42501', NULL, 'authenticated cannot SELECT audit_events');
RESET ROLE;

-- -----------------------------------------------------------------------------
-- 4. Atomic Server RPCs, Seat Holds, Idempotency & Security Invariants (19 assertions)
-- -----------------------------------------------------------------------------
SET LOCAL ROLE service_role;

-- 4.1 start_enrollment creates paid hold with DB fee snapshot (750000 poisha)
SELECT is(
  (
    SELECT (res->>'ok')::boolean
    FROM (
      SELECT public.start_enrollment(
        'pgtap2-paid-course',
        'pgtap2-batch-small',
        'LNA-PG2A-0001',
        'First Applicant',
        'Applicant.One@example.invalid',
        '01711111111',
        '{"university":"BUET"}'::jsonb,
        '[]'::jsonb
      ) AS res
    ) q
  ),
  true,
  'start_enrollment creates initial held enrollment on open paid batch'
);

SELECT is(
  (SELECT status FROM public.enrollments WHERE public_ref = 'LNA-PG2A-0001'),
  'pending',
  'paid bKash checkout starts enrollment in pending hold status'
);

SELECT is(
  (SELECT payable_poisha FROM public.enrollments WHERE public_ref = 'LNA-PG2A-0001'),
  750000::bigint,
  'payable_poisha is snapshotted strictly from DB batch fee'
);

-- 4.2 Duplicate active hold for same email (case-insensitive) reuses reservation cleanly
SELECT is(
  (
    SELECT (res->>'reused_hold')::boolean
    FROM (
      SELECT public.start_enrollment(
        'pgtap2-paid-course',
        'pgtap2-batch-small',
        'LNA-PG2A-9999',
        'First Applicant Updated',
        'applicant.one@EXAMPLE.invalid',
        '01711111111',
        '{"university":"BUET"}'::jsonb,
        '[]'::jsonb
      ) AS res
    ) q
  ),
  true,
  'duplicate submission during active hold reuses existing enrollment without second seat'
);

-- 4.3 Capacity is now full (1 historical + 1 active hold out of capacity 2)
SELECT is(
  (
    SELECT res->>'code'
    FROM (
      SELECT public.start_enrollment(
        'pgtap2-paid-course',
        'pgtap2-batch-small',
        'LNA-PG2B-0002',
        'Second Blocked Applicant',
        'applicant.two@example.invalid',
        '01722222222',
        '{}'::jsonb,
        '[]'::jsonb
      ) AS res
    ) q
  ),
  'BATCH_FULL',
  'start_enrollment enforces capacity cap under historical + live hold seats'
);

-- 4.4 record_payment_outcome cancel & failure NEVER clear hold_expires_at
SELECT is(
  (
    SELECT (
      public.record_payment_outcome(
        (SELECT id FROM public.payment_attempts WHERE enrollment_id = (SELECT id FROM public.enrollments WHERE public_ref = 'LNA-PG2A-0001') AND tran_id LIKE 'LNA-PG2A-0001-01-%' LIMIT 1),
        'cancelled',
        'PAY_CANCEL_01',
        'USER_CANCELLED',
        NULL,
        'Cancelled by user'
      )->>'status'
    )
  ),
  'cancelled',
  'record_payment_outcome records cancelled attempt status'
);

SELECT ok(
  (SELECT status = 'pending' AND hold_expires_at > now() FROM public.enrollments WHERE public_ref = 'LNA-PG2A-0001'),
  'cancel callback preserves enrollment pending status and 30-min seat hold'
);

SELECT is(
  (
    SELECT (
      public.record_payment_outcome(
        (SELECT id FROM public.payment_attempts WHERE enrollment_id = (SELECT id FROM public.enrollments WHERE public_ref = 'LNA-PG2A-0001') AND tran_id LIKE 'LNA-PG2A-0001-02-%' LIMIT 1),
        'failed',
        'PAY_FAIL_02',
        'GATEWAY_DECLINED',
        '2029',
        'Insufficient balance'
      )->>'status'
    )
  ),
  'failed',
  'record_payment_outcome records failed attempt status'
);

SELECT ok(
  (SELECT status = 'pending' AND hold_expires_at > now() FROM public.enrollments WHERE public_ref = 'LNA-PG2A-0001'),
  'failed callback preserves enrollment pending status and 30-min seat hold'
);

-- 4.5 retry_enrollment_payment creates third attempt on active hold cleanly
SELECT is(
  (SELECT (public.retry_enrollment_payment('LNA-PG2A-0001')->>'ok')::boolean),
  true,
  'retry_enrollment_payment allows retrying on active hold after failed/cancelled attempts'
);

-- 4.6 confirm_payment confirms enrollment atomically & enqueues single email_outbox row
SELECT is(
  (
    SELECT (
      public.confirm_payment(
        (SELECT id FROM public.payment_attempts WHERE enrollment_id = (SELECT id FROM public.enrollments WHERE public_ref = 'LNA-PG2A-0001') AND tran_id LIKE 'LNA-PG2A-0001-03-%' LIMIT 1),
        'PAY_VALID_03',
        'TRXPG2VALID03',
        750000::bigint,
        'BDT',
        '0000',
        'Successful'
      )->>'status'
    )
  ),
  'validated',
  'confirm_payment validates latest attempt atomically'
);

SELECT is(
  (SELECT status || ':' || payment_status || ':' || coalesce(submitted_payment_ref, '') FROM public.enrollments WHERE public_ref = 'LNA-PG2A-0001'),
  'confirmed:verified:TRXPG2VALID03',
  'confirm_payment sets enrollment confirmed, payment verified, and records trxID'
);

-- 4.7 Repeated callback hits same validated attempt without queueing a second email
SELECT is(
  (
    SELECT (
      public.confirm_payment(
        (SELECT id FROM public.payment_attempts WHERE trx_id = 'TRXPG2VALID03'),
        'PAY_VALID_03',
        'TRXPG2VALID03',
        750000::bigint,
        'BDT',
        '0000',
        'Successful'
      )->>'already_validated'
    )::boolean
  ),
  true,
  'repeated confirm_payment callback returns already_validated idempotently'
);

SELECT is(
  (SELECT count(*)::int FROM public.email_outbox WHERE enrollment_id = (SELECT id FROM public.enrollments WHERE public_ref = 'LNA-PG2A-0001')),
  1,
  'repeated confirm_payment inserts strictly one email_outbox confirmation record'
);

-- 4.8 Free course immediate confirmation
SELECT is(
  (
    SELECT (
      public.start_enrollment(
        'pgtap2-free-course',
        'pgtap2-batch-free',
        'LNA-PG2F-0001',
        'Free Workshop Applicant',
        'free.applicant@example.invalid',
        '01811111111',
        '{}'::jsonb,
        '[]'::jsonb
      )->>'status'
    )
  ),
  'confirmed',
  'free batch enrollment confirms immediately without payment step'
);

SELECT is(
  (SELECT count(*)::int FROM public.email_outbox WHERE enrollment_id = (SELECT id FROM public.enrollments WHERE public_ref = 'LNA-PG2F-0001') AND template = 'enrollment_confirmed_free'),
  1,
  'free batch queues free confirmation email in email_outbox'
);

-- 4.9 Mismatched currency/amount quarantines into review_hold (using temporary open batch capacity)
UPDATE public.batches SET capacity = 4 WHERE slug = 'pgtap2-batch-small';
DO $$ BEGIN
  PERFORM public.start_enrollment('pgtap2-paid-course', 'pgtap2-batch-small', 'LNA-PG2M-0001', 'Mismatch Applicant', 'mismatch@example.invalid', '01911111111', '{}'::jsonb, '[]'::jsonb);
END $$;

SELECT is(
  (
    SELECT (
      public.confirm_payment(
        (SELECT id FROM public.payment_attempts WHERE enrollment_id = (SELECT id FROM public.enrollments WHERE public_ref = 'LNA-PG2M-0001') LIMIT 1),
        'PAY_MISMATCH_01',
        'TRXMISMATCH01',
        100::bigint,
        'BDT',
        '0000',
        'Successful'
      )->>'status'
    )
  ),
  'review_hold',
  'confirm_payment isolates amount mismatch into review_hold'
);

SELECT is(
  (SELECT status FROM public.enrollments WHERE public_ref = 'LNA-PG2M-0001'),
  'review_hold',
  'amount mismatch leaves enrollment in review_hold and never confirmed'
);

-- 4.10 Append-only tables deny UPDATE and DELETE even for service_role
SELECT throws_ok(
  $$ DELETE FROM public.audit_events $$,
  '42501',
  NULL,
  'service_role cannot DELETE append-only audit_events'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
