BEGIN;
SELECT plan(21);

INSERT INTO auth.users (id, email) VALUES
  ('66666666-6666-4666-8666-666666666666', 'manual-staff@example.invalid'),
  ('77777777-7777-4777-8777-777777777777', 'manual-admin@example.invalid');
INSERT INTO public.profiles (id, email, full_name, role) VALUES
  ('66666666-6666-4666-8666-666666666666', 'manual-staff@example.invalid', 'Manual admission test', 'super_admin'),
  ('77777777-7777-4777-8777-777777777777', 'manual-admin@example.invalid', 'Regular admin test', 'admin');
INSERT INTO public.courses (id, slug, title, subtitle, category, summary, description, venue, status, published_at, provenance)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'pgtap-staff-admission', 'Staff enrollment test',
  'Admissions fixture', 'Training', 'Course summary for test enrollment', 'Course description for test enrollment',
  'Dhaka', 'published', now(), '{"class":"B","verified":false,"source":"pgTAP admissions fixture"}');
INSERT INTO public.batches (
  id, course_id, slug, batch_number, name, start_date, end_date, schedule_description,
  capacity, historical_enrolled_count, fee_poisha, discount_fee_poisha, venue, status,
  enrollment_closes_at, provenance
)
SELECT fixture.id, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', fixture.slug, fixture.n, fixture.name,
  current_date + 14, current_date + 15, 'Weekend sessions', 2, fixture.historical,
  750000, fixture.discount, 'Dhaka', fixture.status, fixture.closes,
  '{"class":"B","verified":false,"source":"pgTAP admissions fixture"}'::jsonb
FROM (VALUES
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid, 'pgtap-staff-paid', 1, 'Paid batch', 1, 550000, 'open_for_enrollment', NULL::timestamptz),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid, 'pgtap-staff-free', 2, 'Free batch', 0, 0, 'open_for_enrollment', NULL::timestamptz),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid, 'pgtap-staff-closed', 3, 'Form closed', 0, 550000, 'open_for_enrollment', now() - interval '1 hour')
) AS fixture(id, slug, n, name, historical, discount, status, closes);

SELECT ok(NOT has_function_privilege('anon', 'public.create_staff_enrollment(uuid,uuid,timestamptz,text,text,text,text,jsonb,jsonb)', 'EXECUTE'), 'Anon has no RPC permission');
SELECT ok(NOT has_function_privilege('authenticated', 'public.create_staff_enrollment(uuid,uuid,timestamptz,text,text,text,text,jsonb,jsonb)', 'EXECUTE'), 'Browser sessions have no RPC permission');
SET LOCAL ROLE service_role;

SELECT throws_ok($sql$
  SELECT public.create_staff_enrollment('99999999-9999-4999-8999-999999999999', id, updated_at,
    'LNA-MAN0-0001', 'Fixture Student', 'paid@example.invalid', '01711000001', '{}', '[]')
  FROM public.batches WHERE slug = 'pgtap-staff-paid'
$sql$, '42501', 'STAFF_ENROLLMENT_FORBIDDEN', 'Unknown actor cannot create an enrollment');

SELECT throws_ok($sql$
  SELECT public.create_staff_enrollment('66666666-6666-4666-8666-666666666666', id, updated_at,
    'LNA-MAN0-0001', 'Fixture Student', 'paid@example.invalid', 'invalid', '{}', '[]')
  FROM public.batches WHERE slug = 'pgtap-staff-paid'
$sql$, '22023', 'STAFF_ENROLLMENT_INVALID', 'Invalid input is rejected before writing');

SELECT is((SELECT public.create_staff_enrollment('66666666-6666-4666-8666-666666666666', id, updated_at - interval '1 minute',
  'LNA-MAN0-0001', 'Fixture Student', 'paid@example.invalid', '01711000001', '{}', '[]')->>'code'
  FROM public.batches WHERE slug = 'pgtap-staff-paid'), 'STALE_BATCH', 'Staff must have seen the current batch revision');
SELECT is((SELECT public.create_staff_enrollment('66666666-6666-4666-8666-666666666666', id, updated_at,
  'LNA-MAN0-0001', 'Fixture Student', 'paid@example.invalid', '01711000001', '{}', '[]')->>'code'
  FROM public.batches WHERE slug = 'pgtap-staff-closed'), 'BATCH_CLOSED', 'Closed registration window is enforced');

SELECT is((SELECT public.create_staff_enrollment('66666666-6666-4666-8666-666666666666', id, updated_at,
  'LNA-MAN0-0001', 'Fixture Student', ' PAID@example.invalid ', '01711000001', '{"university":"Fixture University"}', '[]')->>'ok'
  FROM public.batches WHERE slug = 'pgtap-staff-paid'), 'true', 'Adds a paid application');

SELECT results_eq($sql$
  SELECT status, payment_method, payment_status, base_fee_poisha, discount_amount_poisha, payable_poisha
  FROM public.enrollments WHERE public_ref = 'LNA-MAN0-0001'
$sql$, $$ VALUES ('pending'::text, 'bkash'::text, 'pending_verification'::text, 750000::bigint, 200000::bigint, 550000::bigint) $$,
  'Paid admission snapshots the batch fee and awaits verification');

SELECT ok((SELECT hold_expires_at > now() AND confirmed_at IS NULL AND email::text = 'paid@example.invalid'
  FROM public.enrollments WHERE public_ref = 'LNA-MAN0-0001'), 'Paid admission has an active hold and is not confirmed');

SELECT is((SELECT count(*) FROM public.payment_attempts a JOIN public.enrollments e ON e.id = a.enrollment_id
  WHERE e.public_ref = 'LNA-MAN0-0001'), 0::bigint, 'No gateway attempt exists until the learner checks out');
SELECT is((SELECT count(*) FROM public.email_outbox o JOIN public.enrollments e ON e.id = o.enrollment_id
  WHERE e.public_ref = 'LNA-MAN0-0001'), 0::bigint, 'Paid reservation does not queue a confirmation');

UPDATE public.enrollments SET email = 'PAID@example.invalid' WHERE public_ref = 'LNA-MAN0-0001';
SELECT is((SELECT public.create_staff_enrollment('66666666-6666-4666-8666-666666666666', id, updated_at,
  'LNA-MAN0-0002', 'Duplicate Student', 'paid@example.invalid', '01711000002', '{}', '[]')->>'existing_id'
  FROM public.batches WHERE slug = 'pgtap-staff-paid'),
  (SELECT id::text FROM public.enrollments WHERE public_ref = 'LNA-MAN0-0001'), 'Duplicate email returns the existing enrollment, including mixed case');
UPDATE public.enrollments SET email = 'paid@example.invalid' WHERE public_ref = 'LNA-MAN0-0001';

SELECT is((SELECT public.create_staff_enrollment('66666666-6666-4666-8666-666666666666', id, updated_at,
  'LNA-MAN0-0002', 'Other Student', 'other@example.invalid', '01711000002', '{}', '[]')->>'code'
  FROM public.batches WHERE slug = 'pgtap-staff-paid'), 'BATCH_FULL', 'Historical occupancy and the active staff hold use up capacity');

SELECT is(public.start_enrollment(
  'pgtap-staff-admission', 'pgtap-staff-paid', 'LNA-MAN0-0003', 'Fixture Student',
  'paid@example.invalid', '01711000001', '{}', '[]'
)->>'public_ref', 'LNA-MAN0-0001', 'Existing public checkout can reuse the same reservation');

UPDATE public.enrollments SET hold_expires_at = now() - interval '1 minute' WHERE public_ref = 'LNA-MAN0-0001';
SELECT is((SELECT public.create_staff_enrollment('66666666-6666-4666-8666-666666666666', id, updated_at,
  'LNA-MAN0-0004', 'Fixture Student', 'paid@example.invalid', '01711000001', '{}', '[]')->>'ok'
  FROM public.batches WHERE slug = 'pgtap-staff-paid'), 'true', 'Expired hold can be replaced');
SELECT is((SELECT status FROM public.enrollments WHERE public_ref = 'LNA-MAN0-0001'), 'expired', 'Expired roster record is retained');

SELECT is((SELECT public.create_staff_enrollment('66666666-6666-4666-8666-666666666666', id, updated_at,
  'LNA-MAN0-0005', 'Free Student', 'free@example.invalid', '01711000003', '{}', '[]')->>'ok'
  FROM public.batches WHERE slug = 'pgtap-staff-free'), 'true', 'Staff enrollment succeeds for a zero-payable batch');
SELECT results_eq($sql$
  SELECT status, payment_method, payment_status, payable_poisha FROM public.enrollments
  WHERE public_ref = 'LNA-MAN0-0005'
$sql$, $$ VALUES ('confirmed'::text, 'free'::text, 'not_required'::text, 0::bigint) $$, 'Free admission confirms normally');
SELECT is((SELECT count(*) FROM public.email_outbox o JOIN public.enrollments e ON e.id = o.enrollment_id
  WHERE e.public_ref = 'LNA-MAN0-0005' AND o.template = 'enrollment_confirmed_free'), 1::bigint, 'Free confirmation is queued exactly once');
SELECT is((SELECT count(*) FROM public.audit_events
  WHERE actor_id = '66666666-6666-4666-8666-666666666666' AND action = 'staff_created_enrollment'),
  3::bigint, 'Only successful staff submissions produce a staff audit entry');
SELECT ok(NOT EXISTS (SELECT 1 FROM public.audit_events WHERE action = 'staff_created_enrollment'
  AND (after_state ? 'email' OR after_state ? 'phone' OR after_state ? 'full_name')), 'Staff audit snapshot excludes student contact details');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
