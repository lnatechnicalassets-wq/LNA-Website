BEGIN;
SELECT plan(15);

INSERT INTO auth.users (id, email) VALUES
  ('66666666-6666-4666-8666-666666666666', 'purge-staff@example.invalid'),
  ('77777777-7777-4777-8777-777777777777', 'purge-admin@example.invalid');
INSERT INTO public.profiles (id, email, full_name, role) VALUES
  ('66666666-6666-4666-8666-666666666666', 'purge-staff@example.invalid', 'Fixture Super Admin', 'super_admin'),
  ('77777777-7777-4777-8777-777777777777', 'purge-admin@example.invalid', 'Fixture Admin', 'admin');

INSERT INTO public.courses (id, slug, title, subtitle, category, summary, description, venue, status, published_at, provenance)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'pgtap-admission-cleanup', 'Admission fixture',
  'Admissions fixture', 'Training', 'Course summary for test enrollment', 'Course description for test enrollment',
  'Dhaka', 'published', now(), '{"class":"B","verified":false,"source":"pgTAP cleanup fixture"}');
INSERT INTO public.batches (
  id, course_id, slug, batch_number, name, start_date, end_date, schedule_description,
  capacity, historical_enrolled_count, fee_poisha, venue, status, provenance
)
VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'pgtap-admission-cleanup-batch', 1, 'Admission cleanup fixture batch', current_date + 14,
  current_date + 15, 'Weekend sessions', 20, 0, 1000, 'Dhaka', 'open_for_enrollment',
  '{"class":"B","verified":false,"source":"pgTAP cleanup fixture"}');

INSERT INTO public.enrollments (
  id, public_ref, course_id, batch_id, full_name, email, phone,
  payment_method, payment_status, base_fee_poisha, payable_poisha, status, archived_at,
  is_dev_fixture, fixture_label, submitted_payment_ref, verified_at, confirmed_at, hold_expires_at
)
SELECT
  ('eeeeeeee-eeee-4eee-8eee-' || lpad(n::text, 12, '0'))::uuid,
  'LNA-D3V7-' || lpad(n::text, 4, '0'),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'Synthetic cleanup fixture', ('applicant' || n || '@example.invalid')::extensions.citext,
  '0170012300' || n,
  'bkash', CASE WHEN n = 4 THEN 'verified' ELSE 'pending_verification' END, 1000, 1000,
  CASE WHEN n = 4 THEN 'confirmed' ELSE 'cancelled' END,
  CASE WHEN n <> 3 THEN now() END,
  n <> 2, CASE WHEN n <> 2 THEN 'pgTAP cleanup fixture' END,
  CASE WHEN n = 5 THEN 'FIXTURE-REF-5' END,
  CASE WHEN n = 4 THEN now() END, CASE WHEN n = 4 THEN now() END,
  CASE WHEN n = 8 THEN now() + interval '1 hour' END
FROM generate_series(1, 8) AS n;

INSERT INTO public.payment_attempts (enrollment_id, tran_id, amount_poisha)
SELECT id, 'fixture-attempt-6', 1000 FROM public.enrollments WHERE public_ref = 'LNA-D3V7-0006';
INSERT INTO public.email_outbox (enrollment_id, template, recipient_email, idempotency_key)
SELECT id, 'enrollment_review_hold', email, 'fixture-outbox-7'
FROM public.enrollments WHERE public_ref = 'LNA-D3V7-0007';

CREATE FUNCTION pg_temp.purge_fixture(p_number integer, p_confirmation text DEFAULT NULL,
  p_revision timestamptz DEFAULT NULL, p_actor uuid DEFAULT '66666666-6666-4666-8666-666666666666')
RETURNS text LANGUAGE sql AS $$
  SELECT public.purge_staff_dev_admission(p_actor, id, coalesce(p_revision, updated_at), coalesce(p_confirmation, public_ref))
  FROM public.enrollments WHERE public_ref = 'LNA-D3V7-' || lpad(p_number::text, 4, '0');
$$;

SELECT ok(NOT has_table_privilege('service_role', 'public.enrollments', 'DELETE'), 'Service role keeps its existing table permissions');
SELECT ok(NOT has_function_privilege('authenticated', 'public.purge_staff_dev_admission(uuid,uuid,timestamptz,text)', 'EXECUTE'), 'Browser roles cannot call the deletion RPC');

SET LOCAL ROLE service_role;
SELECT is((SELECT public.can_purge_dev_admission(e) FROM public.enrollments e WHERE public_ref = 'LNA-D3V7-0001'), true, 'Archived unused fixture is eligible');
SELECT throws_ok(
  $$SELECT pg_temp.purge_fixture(1, NULL, NULL, '77777777-7777-4777-8777-777777777777');$$,
  '42501', NULL, 'A regular admin cannot permanently delete fixtures');
SELECT is(pg_temp.purge_fixture(1, 'LNA-D3V7-9999'), 'CONFIRMATION_MISMATCH', 'An exact application ID is required');
SELECT is(pg_temp.purge_fixture(1, NULL, '2000-01-01Z'), 'STALE', 'A stale form cannot delete a newer record');
SELECT is(pg_temp.purge_fixture(2), 'PROTECTED', 'A live record is protected even when archived');
SELECT is(pg_temp.purge_fixture(3), 'PROTECTED', 'An active fixture must be archived first');
SELECT is(pg_temp.purge_fixture(4), 'PROTECTED', 'A confirmed and verified fixture is protected');
SELECT is(pg_temp.purge_fixture(5), 'PROTECTED', 'A submitted payment reference is protected');
SELECT is(pg_temp.purge_fixture(6), 'PROTECTED', 'A gateway attempt is protected');
SELECT is(pg_temp.purge_fixture(7), 'PROTECTED', 'An email outbox message is preserved');
SELECT is(pg_temp.purge_fixture(8), 'PROTECTED', 'A fixture with a seat hold is protected');
SELECT is(pg_temp.purge_fixture(1), 'OK', 'The Super Admin can permanently delete an unused archived fixture');
SELECT ok(NOT EXISTS (SELECT 1 FROM public.enrollments WHERE public_ref = 'LNA-D3V7-0001')
  AND EXISTS (SELECT 1 FROM public.audit_events WHERE action = 'staff_deleted_dev_admission'
    AND target_id = 'eeeeeeee-eeee-4eee-8eee-000000000001' AND before_state IS NULL AND after_state IS NULL),
  'The deleted fixture is gone and its audit event retains no applicant details');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
