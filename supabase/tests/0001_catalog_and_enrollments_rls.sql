-- =============================================================================
-- pgTAP Access Control, RLS, & Integrity Tests for 20261110161500
-- Authority: ADR 0002, ADR 0012, .agents/rules/50-database.md (§4), Rule R8, Rule R9, Rule R10
-- Prerequisite: pgTAP extension available in database search_path (e.g. extensions.pgtap)
-- Reproducibility: Creates deterministic transaction-scoped fixtures inside BEGIN...ROLLBACK;
--                  runs reliably with or without supabase/seed.sql applied.
-- =============================================================================

BEGIN;
SELECT plan(62);

-- -----------------------------------------------------------------------------
-- 0. Reproducible Transaction-Scoped Fixtures (Rolled Back Cleanly)
-- -----------------------------------------------------------------------------
INSERT INTO public.courses (
  slug, title, subtitle, category, summary, description, delivery_mode, venue, status, provenance, is_dev_fixture, fixture_label, published_at
)
VALUES
  (
    'pgtap-course-published',
    'pgTAP Published Course',
    'Reproducible test course subtitle',
    'Testing',
    'Reproducible published test course summary text.',
    'Reproducible published course description long enough to satisfy minimum length checks.',
    'offline',
    'Dhaka Test Campus',
    'published',
    '{"class":"A","verified":true,"source":"pgTAP reproducible fixture","verifiedBy":"pgTAP Suite","verifiedOn":"2026-11-10"}'::jsonb,
    true,
    'PGTAP_TEST_FIXTURE',
    TIMESTAMPTZ '2026-11-10T00:00:00Z'
  ),
  (
    'pgtap-course-draft',
    'pgTAP Draft Course',
    'Draft test course subtitle',
    'Testing',
    'Draft test course summary text for RLS.',
    'Long enough description for a draft course test row that must stay hidden from browser roles.',
    'offline',
    'Dhaka Test Campus',
    'draft',
    '{"class":"B","verified":false,"source":"pgTAP draft fixture","verifiedBy":null,"verifiedOn":null}'::jsonb,
    true,
    'PGTAP_TEST_FIXTURE',
    NULL
  );

INSERT INTO public.batches (
  course_id, slug, batch_number, name, start_date, end_date, schedule_description, capacity, fee_poisha, status, venue, provenance, is_dev_fixture, fixture_label
)
SELECT
  c.id,
  'pgtap-batch-open',
  1,
  'pgTAP Open Test Batch',
  DATE '2026-12-01',
  DATE '2027-01-31',
  '16 Sessions (Test)',
  30,
  750000::bigint,
  'open_for_enrollment',
  'Dhaka Test Campus',
  '{"class":"B","verified":false,"source":"pgTAP batch fixture","verifiedBy":null,"verifiedOn":null}'::jsonb,
  true,
  'PGTAP_TEST_FIXTURE'
FROM public.courses c
WHERE c.slug = 'pgtap-course-published';

INSERT INTO public.mentors (
  slug, name, role, organization, bio, display_order, published, provenance, is_dev_fixture, fixture_label
)
VALUES
  (
    'pgtap-mentor-published-1',
    'pgTAP Mentor One',
    'Director',
    'Test Organization',
    'Reproducible published mentor profile one inside rolled-back pgTAP transaction.',
    101,
    true,
    '{"class":"A","verified":true,"source":"pgTAP mentor fixture","verifiedBy":"pgTAP Suite","verifiedOn":"2026-11-10"}'::jsonb,
    true,
    'PGTAP_TEST_FIXTURE'
  ),
  (
    'pgtap-mentor-published-2',
    'pgTAP Mentor Two',
    'Head of Strategy',
    'Test Organization',
    'Reproducible published mentor profile two inside rolled-back pgTAP transaction.',
    102,
    true,
    '{"class":"A","verified":true,"source":"pgTAP mentor fixture","verifiedBy":"pgTAP Suite","verifiedOn":"2026-11-10"}'::jsonb,
    true,
    'PGTAP_TEST_FIXTURE'
  ),
  (
    'pgtap-mentor-unpublished',
    'pgTAP Unpublished Mentor',
    'Advisor',
    'Sample Org',
    'Temporary unpublished mentor bio used only inside rolled-back pgTAP test.',
    103,
    false,
    '{"class":"B","verified":false,"source":"pgTAP unpublished mentor fixture","verifiedBy":null,"verifiedOn":null}'::jsonb,
    true,
    'PGTAP_TEST_FIXTURE'
  );

INSERT INTO public.course_mentors (course_id, mentor_id, display_order)
SELECT
  c.id,
  m.id,
  v.display_order
FROM (
  VALUES
    ('pgtap-course-published', 'pgtap-mentor-published-1', 1),
    ('pgtap-course-published', 'pgtap-mentor-published-2', 2)
) AS v(course_slug, mentor_slug, display_order)
JOIN public.courses c ON c.slug = v.course_slug
JOIN public.mentors m ON m.slug = v.mentor_slug;

INSERT INTO public.enrollments (
  public_ref, course_id, batch_id, full_name, email, phone, answers, program_questions_snapshot,
  payment_method, payment_status, submitted_payment_ref, base_fee_poisha, discount_amount_poisha, payable_poisha,
  currency, status, verification_notes, is_dev_fixture, fixture_label
)
SELECT
  'LNA-PGT1-0001',
  b.course_id,
  b.id,
  'pgTAP Pending Fixture',
  'pgtap.pending@example.invalid'::extensions.citext,
  '01700000101',
  '{"university":"Sample Test University"}'::jsonb,
  '[{"id":"university","label":"University","type":"text","required":true}]'::jsonb,
  'bkash',
  'pending_verification',
  'PGTAPBKASH01',
  b.fee_poisha,
  0::bigint,
  b.fee_poisha,
  'BDT',
  'application_in_process',
  'Reproducible pgTAP enrollment fixture.',
  true,
  'PGTAP_ENROLLMENT_FIXTURE'
FROM public.batches b
WHERE b.slug = 'pgtap-batch-open';

-- -----------------------------------------------------------------------------
-- 1. Schema & RLS Posture (10 checks)
-- -----------------------------------------------------------------------------
SELECT has_table('public', 'courses', 'courses table exists');
SELECT has_table('public', 'batches', 'batches table exists');
SELECT has_table('public', 'mentors', 'mentors table exists');
SELECT has_table('public', 'course_mentors', 'course_mentors join table exists');
SELECT has_table('public', 'enrollments', 'enrollments table exists');

SELECT ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'courses'),
  'RLS is enabled on public.courses'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'batches'),
  'RLS is enabled on public.batches'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'mentors'),
  'RLS is enabled on public.mentors'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'course_mentors'),
  'RLS is enabled on public.course_mentors'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'enrollments'),
  'RLS is enabled on public.enrollments'
);

-- -----------------------------------------------------------------------------
-- 2. Explicit Privilege Assertions / Grants (19 checks)
-- -----------------------------------------------------------------------------
SELECT ok(NOT has_table_privilege('anon', 'public.enrollments', 'SELECT'), 'anon has no SELECT grant on enrollments');
SELECT ok(NOT has_table_privilege('anon', 'public.enrollments', 'INSERT'), 'anon has no INSERT grant on enrollments');
SELECT ok(NOT has_table_privilege('anon', 'public.enrollments', 'UPDATE'), 'anon has no UPDATE grant on enrollments');
SELECT ok(NOT has_table_privilege('anon', 'public.enrollments', 'DELETE'), 'anon has no DELETE grant on enrollments');
SELECT ok(NOT has_table_privilege('anon', 'public.enrollments', 'TRUNCATE'), 'anon has no TRUNCATE grant on enrollments');

SELECT ok(NOT has_table_privilege('authenticated', 'public.enrollments', 'SELECT'), 'authenticated has no SELECT grant on enrollments');
SELECT ok(NOT has_table_privilege('authenticated', 'public.enrollments', 'INSERT'), 'authenticated has no INSERT grant on enrollments');
SELECT ok(NOT has_table_privilege('authenticated', 'public.enrollments', 'UPDATE'), 'authenticated has no UPDATE grant on enrollments');
SELECT ok(NOT has_table_privilege('authenticated', 'public.enrollments', 'DELETE'), 'authenticated has no DELETE grant on enrollments');
SELECT ok(NOT has_table_privilege('authenticated', 'public.enrollments', 'TRUNCATE'), 'authenticated has no TRUNCATE grant on enrollments');

SELECT ok(has_table_privilege('service_role', 'public.enrollments', 'SELECT'), 'service_role has explicit SELECT grant on enrollments');
SELECT ok(has_table_privilege('service_role', 'public.enrollments', 'INSERT'), 'service_role has explicit INSERT grant on enrollments');
SELECT ok(has_table_privilege('service_role', 'public.enrollments', 'UPDATE'), 'service_role has explicit UPDATE grant on enrollments');
SELECT ok(NOT has_table_privilege('service_role', 'public.enrollments', 'DELETE'), 'service_role has NO DELETE grant on enrollments');
SELECT ok(NOT has_table_privilege('service_role', 'public.enrollments', 'TRUNCATE'), 'service_role has NO TRUNCATE grant on enrollments');

SELECT ok(has_table_privilege('anon', 'public.courses', 'SELECT'), 'anon has SELECT grant on courses');
SELECT ok(NOT has_table_privilege('anon', 'public.courses', 'INSERT'), 'anon has no INSERT grant on courses');
SELECT ok(NOT has_table_privilege('authenticated', 'public.batches', 'UPDATE'), 'authenticated has no UPDATE grant on batches');
SELECT ok(NOT has_table_privilege('authenticated', 'public.mentors', 'DELETE'), 'authenticated has no DELETE grant on mentors');

-- -----------------------------------------------------------------------------
-- 3. Ordered Course-Mentor Integrity Checks (2 checks)
-- -----------------------------------------------------------------------------
SELECT is(
  (
    SELECT array_agg(m.slug ORDER BY cm.display_order)
    FROM public.course_mentors cm
    JOIN public.courses c ON c.id = cm.course_id
    JOIN public.mentors m ON m.id = cm.mentor_id
    WHERE c.slug = 'pgtap-course-published'
  ),
  ARRAY[
    'pgtap-mentor-published-1',
    'pgtap-mentor-published-2'
  ],
  'course_mentors preserves deterministic mentor ordering per course'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM public.course_mentors cm
    JOIN public.courses c ON c.id = cm.course_id
    WHERE c.slug = 'irgp'
  ),
  8,
  'verified Class A irgp course retains 8 ordered mentor assignments from migration'
);

-- -----------------------------------------------------------------------------
-- 4. Browser Role Isolation Checks: anon (9 checks)
-- -----------------------------------------------------------------------------
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$ SELECT public_ref FROM public.enrollments $$,
  '42501',
  NULL,
  'anon cannot SELECT from enrollments'
);

SELECT throws_ok(
  $$ INSERT INTO public.enrollments (public_ref, course_id, batch_id, full_name, email, phone, payment_method, base_fee_poisha, payable_poisha) VALUES ('LNA-AAAA-BBBB', gen_random_uuid(), gen_random_uuid(), 'Test User', 'test@example.invalid', '01700000099', 'free', 0, 0) $$,
  '42501',
  NULL,
  'anon cannot INSERT into enrollments'
);

SELECT throws_ok(
  $$ UPDATE public.enrollments SET status = 'confirmed' $$,
  '42501',
  NULL,
  'anon cannot UPDATE enrollments'
);

SELECT throws_ok(
  $$ DELETE FROM public.enrollments $$,
  '42501',
  NULL,
  'anon cannot DELETE from enrollments'
);

SELECT throws_ok(
  $$ TRUNCATE TABLE public.enrollments $$,
  '42501',
  NULL,
  'anon cannot TRUNCATE enrollments'
);

SELECT is(
  (SELECT count(*)::int FROM public.courses WHERE slug = 'pgtap-course-published'),
  1,
  'anon RLS permits reading published courses'
);

SELECT is(
  (SELECT count(*)::int FROM public.courses WHERE slug = 'pgtap-course-draft'),
  0,
  'anon RLS hides draft courses'
);

SELECT is(
  (SELECT count(*)::int FROM public.mentors WHERE slug = 'pgtap-mentor-unpublished'),
  0,
  'anon RLS hides unpublished mentors'
);

SELECT throws_ok(
  $$ INSERT INTO public.courses (slug, title, subtitle, category, summary, description, venue, provenance) VALUES ('hack-course', 'Hack', 'Subtitle', 'Cat', 'Summary long enough', 'Description text long enough', 'Dhaka', '{"class":"B","verified":false,"source":"test source"}'::jsonb) $$,
  '42501',
  NULL,
  'anon cannot INSERT into courses'
);

RESET ROLE;

-- -----------------------------------------------------------------------------
-- 5. Browser Role Isolation Checks: authenticated (7 checks)
-- -----------------------------------------------------------------------------
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ SELECT public_ref FROM public.enrollments $$,
  '42501',
  NULL,
  'authenticated cannot SELECT from enrollments'
);

SELECT throws_ok(
  $$ INSERT INTO public.enrollments (public_ref, course_id, batch_id, full_name, email, phone, payment_method, base_fee_poisha, payable_poisha) VALUES ('LNA-CCCC-DDDD', gen_random_uuid(), gen_random_uuid(), 'Test User', 'auth@example.invalid', '01700000098', 'free', 0, 0) $$,
  '42501',
  NULL,
  'authenticated cannot INSERT into enrollments'
);

SELECT throws_ok(
  $$ UPDATE public.enrollments SET status = 'confirmed' $$,
  '42501',
  NULL,
  'authenticated cannot UPDATE enrollments'
);

SELECT throws_ok(
  $$ DELETE FROM public.enrollments $$,
  '42501',
  NULL,
  'authenticated cannot DELETE from enrollments'
);

SELECT throws_ok(
  $$ TRUNCATE TABLE public.enrollments $$,
  '42501',
  NULL,
  'authenticated cannot TRUNCATE enrollments'
);

SELECT is(
  (SELECT count(*)::int FROM public.courses WHERE slug = 'pgtap-course-draft'),
  0,
  'authenticated RLS hides draft courses'
);

SELECT is(
  (SELECT count(*)::int FROM public.mentors WHERE slug = 'pgtap-mentor-unpublished'),
  0,
  'authenticated RLS hides unpublished mentors'
);

RESET ROLE;

-- -----------------------------------------------------------------------------
-- 6. Server-Only Operational Bounds: service_role (5 checks)
--    SELECT, INSERT, UPDATE permitted; DELETE and TRUNCATE strictly denied
-- -----------------------------------------------------------------------------
SET LOCAL ROLE service_role;

SELECT is(
  (SELECT count(*)::int FROM public.enrollments WHERE public_ref = 'LNA-PGT1-0001' AND is_dev_fixture = true),
  1,
  'service_role can SELECT enrollment fixture'
);

SELECT lives_ok(
  $$
    INSERT INTO public.enrollments (
      public_ref, course_id, batch_id, full_name, email, phone, payment_method, payment_status, submitted_payment_ref,
      base_fee_poisha, discount_amount_poisha, payable_poisha, status, is_dev_fixture, fixture_label
    )
    SELECT
      'LNA-PGT1-0002', course_id, id, 'pgTAP Second Applicant', 'pgtap.second@example.invalid', '01800000102', 'bank_transfer',
      'pending_verification', 'PGTAPBANK02', fee_poisha, 0, fee_poisha, 'application_in_process', true, 'PGTAP_ENROLLMENT_FIXTURE'
    FROM public.batches WHERE slug = 'pgtap-batch-open'
  $$,
  'service_role can INSERT new enrollment records'
);

SELECT lives_ok(
  $$
    UPDATE public.enrollments
    SET verification_notes = 'Updated safely by service_role in pgTAP test.'
    WHERE public_ref = 'LNA-PGT1-0001'
  $$,
  'service_role can UPDATE existing enrollment records'
);

SELECT throws_ok(
  $$ DELETE FROM public.enrollments WHERE public_ref = 'LNA-PGT1-0001' $$,
  '42501',
  NULL,
  'service_role cannot DELETE from enrollments (Rule R10 archival invariant)'
);

SELECT throws_ok(
  $$ TRUNCATE TABLE public.enrollments $$,
  '42501',
  NULL,
  'service_role cannot TRUNCATE enrollments (Rule R10 archival invariant)'
);

-- -----------------------------------------------------------------------------
-- 7. Data Integrity & Catalog Provenance Constraint Tests: service_role (10 checks)
-- -----------------------------------------------------------------------------

-- Case-insensitive duplicate active application blocked on (batch_id, email)
SELECT throws_ok(
  $$
    INSERT INTO public.enrollments (
      public_ref, course_id, batch_id, full_name, email, phone, payment_method, payment_status, submitted_payment_ref, base_fee_poisha, discount_amount_poisha, payable_poisha, status
    )
    SELECT 'LNA-PGT1-9999', course_id, id, 'Duplicate Fixture', 'PGTAP.PENDING@EXAMPLE.INVALID', '01700000088', 'bkash', 'pending_verification', 'DEVTRX999', fee_poisha, 0, fee_poisha, 'application_in_process'
    FROM public.batches WHERE slug = 'pgtap-batch-open'
  $$,
  '23505',
  NULL,
  'citext partial unique index rejects duplicate active batch+email regardless of case'
);

-- Negative poisha fees rejected
SELECT throws_ok(
  $$
    INSERT INTO public.enrollments (
      public_ref, course_id, batch_id, full_name, email, phone, payment_method, payment_status, submitted_payment_ref, base_fee_poisha, discount_amount_poisha, payable_poisha, status
    )
    SELECT 'LNA-PGT1-9998', course_id, id, 'Negative Fee Fixture', 'negative.fee@example.invalid', '01700000077', 'bkash', 'pending_verification', 'DEVTRX998', -100, 0, -100, 'application_in_process'
    FROM public.batches WHERE slug = 'pgtap-batch-open'
  $$,
  '23514',
  NULL,
  'CHECK constraint rejects negative poisha amounts'
);

-- Invalid Crockford Base32 reference (contains I/O) rejected
SELECT throws_ok(
  $$
    INSERT INTO public.enrollments (
      public_ref, course_id, batch_id, full_name, email, phone, payment_method, payment_status, submitted_payment_ref, base_fee_poisha, discount_amount_poisha, payable_poisha, status
    )
    SELECT 'LNA-IIII-OOOO', course_id, id, 'Bad Ref Fixture', 'bad.ref@example.invalid', '01700000066', 'bkash', 'pending_verification', 'DEVTRX997', fee_poisha, 0, fee_poisha, 'application_in_process'
    FROM public.batches WHERE slug = 'pgtap-batch-open'
  $$,
  '23514',
  NULL,
  'CHECK constraint enforces Crockford Base32 alphabet on public_ref'
);

-- Catalog provenance: courses must reject missing class or verified fields (no CHECK(NULL) bypass)
SELECT throws_ok(
  $$
    INSERT INTO public.courses (
      slug, title, subtitle, category, summary, description, venue, provenance
    ) VALUES (
      'pgtap-course-missing-class', 'Missing Class', 'Test subtitle', 'Testing', 'Summary long enough',
      'Description text long enough for course check constraint.', 'Dhaka Campus',
      '{"verified":true,"source":"WordPress source","verifiedBy":"Admin","verifiedOn":"2026-11-10"}'::jsonb
    )
  $$,
  '23514',
  NULL,
  'courses_provenance_valid rejects provenance missing class field'
);

SELECT throws_ok(
  $$
    INSERT INTO public.courses (
      slug, title, subtitle, category, summary, description, venue, provenance
    ) VALUES (
      'pgtap-course-missing-verified', 'Missing Verified', 'Test subtitle', 'Testing', 'Summary long enough',
      'Description text long enough for course check constraint.', 'Dhaka Campus',
      '{"class":"B","source":"Test source without verified"}'::jsonb
    )
  $$,
  '23514',
  NULL,
  'courses_provenance_valid rejects provenance missing verified field'
);

SELECT throws_ok(
  $$
    INSERT INTO public.courses (
      slug, title, subtitle, category, summary, description, venue, provenance
    ) VALUES (
      'pgtap-course-class-a-unverified', 'Unverified Class A', 'Test subtitle', 'Testing', 'Summary long enough',
      'Description text long enough for course check constraint.', 'Dhaka Campus',
      '{"class":"A","verified":false,"source":"Class A source","verifiedBy":"Admin","verifiedOn":"2026-11-10"}'::jsonb
    )
  $$,
  '23514',
  NULL,
  'courses_provenance_valid rejects Class A provenance with verified=false'
);

-- Catalog provenance: batches must reject missing class or verified fields
SELECT throws_ok(
  $$
    INSERT INTO public.batches (
      course_id, slug, batch_number, name, start_date, end_date, schedule_description, capacity, fee_poisha, status, venue, provenance
    )
    SELECT id, 'pgtap-batch-missing-class', 91, 'Missing Class Batch', DATE '2026-12-01', DATE '2027-01-31',
      '10 sessions', 20, 500000, 'draft', 'Dhaka Campus',
      '{"verified":true,"source":"WordPress source","verifiedBy":"Admin","verifiedOn":"2026-11-10"}'::jsonb
    FROM public.courses WHERE slug = 'pgtap-course-published'
  $$,
  '23514',
  NULL,
  'batches_provenance_valid rejects provenance missing class field'
);

SELECT throws_ok(
  $$
    INSERT INTO public.batches (
      course_id, slug, batch_number, name, start_date, end_date, schedule_description, capacity, fee_poisha, status, venue, provenance
    )
    SELECT id, 'pgtap-batch-missing-verified', 92, 'Missing Verified Batch', DATE '2026-12-01', DATE '2027-01-31',
      '10 sessions', 20, 500000, 'draft', 'Dhaka Campus',
      '{"class":"B","source":"Batch source missing verified"}'::jsonb
    FROM public.courses WHERE slug = 'pgtap-course-published'
  $$,
  '23514',
  NULL,
  'batches_provenance_valid rejects provenance missing verified field'
);

-- Catalog provenance: mentors must reject missing class or verified fields
SELECT throws_ok(
  $$
    INSERT INTO public.mentors (
      slug, name, role, organization, bio, provenance
    ) VALUES (
      'pgtap-mentor-missing-class', 'No Class Mentor', 'Director', 'Test Org',
      'Long enough mentor biography for constraint checking.',
      '{"verified":true,"source":"WordPress source","verifiedBy":"Admin","verifiedOn":"2026-11-10"}'::jsonb
    )
  $$,
  '23514',
  NULL,
  'mentors_provenance_valid rejects provenance missing class field'
);

SELECT throws_ok(
  $$
    INSERT INTO public.mentors (
      slug, name, role, organization, bio, provenance
    ) VALUES (
      'pgtap-mentor-missing-verified', 'No Verified Mentor', 'Director', 'Test Org',
      'Long enough mentor biography for constraint checking.',
      '{"class":"B","source":"Mentor source missing verified"}'::jsonb
    )
  $$,
  '23514',
  NULL,
  'mentors_provenance_valid rejects provenance missing verified field'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
