BEGIN;
SELECT plan(35);

INSERT INTO auth.users (id, email) VALUES
  ('66666666-6666-4666-8666-666666666666', 'review-staff@example.invalid'),
  ('77777777-7777-4777-8777-777777777777', 'review-admin@example.invalid');
INSERT INTO public.profiles (id, email, full_name, role) VALUES
  ('66666666-6666-4666-8666-666666666666', 'review-staff@example.invalid', 'Review fixture staff', 'super_admin'),
  ('77777777-7777-4777-8777-777777777777', 'review-admin@example.invalid', 'Review fixture admin', 'admin');
INSERT INTO public.courses (id, slug, title, subtitle, category, summary, description, venue, status, published_at, provenance)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'pgtap-offline-review', 'Manual review fixture',
  'Admissions fixture', 'Training', 'Course summary for test enrollment', 'Course description for test enrollment',
  'Dhaka', 'published', now(), '{"class":"B","verified":false,"source":"pgTAP admissions fixture"}');
INSERT INTO public.batches (
  id, course_id, slug, batch_number, name, start_date, end_date, schedule_description,
  capacity, historical_enrolled_count, fee_poisha, discount_fee_poisha, venue, status, provenance
)
SELECT fixture.id, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', fixture.slug, fixture.n, 'Review batch',
  current_date + 14, current_date + 15, 'Weekend sessions', 2, fixture.historical,
  750000, 550025, 'Dhaka', 'open_for_enrollment',
  '{"class":"B","verified":false,"source":"pgTAP admissions fixture"}'::jsonb
FROM (VALUES
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid, 'pgtap-offline-first', 1, 1),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid, 'pgtap-offline-second', 2, 0)
) AS fixture(id, slug, n, historical);

CREATE FUNCTION pg_temp.record_contact(p_batch_number integer, p_ref text, p_email text, p_phone text)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT public.record_staff_manual_enrollment(
    '66666666-6666-4666-8666-666666666666', id, updated_at, p_ref, 'Fixture Student',
    p_email, p_phone, '{}', '[]', 'bkash', p_ref || 'PAY'
  ) FROM public.batches WHERE batch_number = p_batch_number AND slug LIKE 'pgtap-offline-%'
$$;
CREATE FUNCTION pg_temp.change_contact(p_ref text, p_operation text, p_email text DEFAULT NULL, p_phone text DEFAULT NULL)
RETURNS text LANGUAGE sql AS $$
  SELECT public.manage_staff_enrollment(
    '66666666-6666-4666-8666-666666666666', id, updated_at, p_operation, 'Updated Fixture', p_email, p_phone
  ) FROM public.enrollments WHERE public_ref = p_ref
$$;
CREATE FUNCTION pg_temp.archive_catalog(p_section text, p_id uuid, p_restore boolean)
RETURNS text LANGUAGE sql AS $$
  SELECT public.archive_staff_catalog('66666666-6666-4666-8666-666666666666', p_section, p_id, updated_at, p_restore)
  FROM (SELECT id, updated_at FROM public.courses UNION ALL SELECT id, updated_at FROM public.batches) c WHERE c.id = p_id
$$;

SELECT ok(NOT has_function_privilege('authenticated', 'public.manage_staff_enrollment(uuid,uuid,timestamptz,text,text,text,text)', 'EXECUTE'), 'Browser roles cannot modify an enrollment');
SELECT ok(NOT has_function_privilege('authenticated', 'public.archive_staff_catalog(uuid,text,uuid,timestamptz,boolean)', 'EXECUTE'), 'Browser roles cannot archive catalog records');
SELECT ok(NOT has_table_privilege('anon', 'public.batch_mentors', 'SELECT'), 'Neither batch roster nor staff RPC is public');
SELECT ok(NOT has_function_privilege('authenticated', 'public.set_staff_batch_mentors(uuid,uuid,timestamptz,uuid[])', 'EXECUTE'), 'Browser roles cannot modify the mentor roster');

SET LOCAL ROLE service_role;
SELECT is(pg_temp.record_contact(1, 'LNA-C0N7-0001', 'first@example.invalid', '01711000001')->>'ok', 'true', 'Records the first contact');
SELECT is(pg_temp.record_contact(1, 'LNA-C0N7-0002', ' First@Example.Invalid ', '01711000002')->>'existing_id',
  (SELECT id::text FROM public.enrollments WHERE public_ref = 'LNA-C0N7-0001'), 'Matches existing email across case and whitespace');
SELECT is(pg_temp.record_contact(1, 'LNA-C0N7-0002', 'other@example.invalid', '01711000001')->>'existing_id',
  (SELECT id::text FROM public.enrollments WHERE public_ref = 'LNA-C0N7-0001'), 'Matches an existing phone even with a different email');
SELECT is(pg_temp.record_contact(2, 'LNA-C0N7-0002', 'first@example.invalid', '01711000001')->>'ok', 'true', 'The same learner can join another batch');

SELECT throws_ok($sql$
  SELECT public.start_enrollment('pgtap-offline-review', 'pgtap-offline-first', 'LNA-C0N7-0003',
    'Fixture Student', 'other@example.invalid', '01711000001', '{}', '[]')
$sql$, '23505', NULL, 'Public checkout cannot insert a duplicate phone');
SELECT is(pg_temp.record_contact(1, 'LNA-C0N7-0003', 'third@example.invalid', '01711000003')->>'ok', 'true', 'Can record a distinct learner');
SELECT throws_ok($$ SELECT pg_temp.change_contact('LNA-C0N7-0003', 'edit', 'third@example.invalid', '01711000001') $$,
  '23505', NULL, 'Staff cannot edit a phone to duplicate an active record');
SELECT is(pg_temp.change_contact('LNA-C0N7-0003', 'edit', 'third-updated@example.invalid', '01711000005'),
  'OK', 'Staff can update a pending application contact');
SELECT is(pg_temp.change_contact('LNA-C0N7-0003', 'archive'), 'OK', 'Archive performs a soft removal');
SELECT ok((SELECT status = 'application_in_process' AND archived_at IS NOT NULL
  FROM public.enrollments WHERE public_ref = 'LNA-C0N7-0003'), 'Archive keeps the enrollment state and history');
SELECT is(pg_temp.change_contact('LNA-C0N7-0003', 'restore'), 'OK', 'Restore clears the archive flag');
SELECT ok((SELECT archived_at IS NULL AND phone = '01711000005' AND email::text = 'third-updated@example.invalid'
  FROM public.enrollments WHERE public_ref = 'LNA-C0N7-0003'), 'Restore retains contact changes');
SELECT is((SELECT public.review_staff_manual_payment(
  '66666666-6666-4666-8666-666666666666', id, updated_at, 'approve', 550025)->>'ok'
  FROM public.enrollments WHERE public_ref = 'LNA-C0N7-0001'), 'true', 'Approval still completes normally');
SELECT is(pg_temp.change_contact('LNA-C0N7-0001', 'edit', 'changed@example.invalid', '01711000001'),
  'EMAIL_LOCKED', 'Confirmed email history is retained');
SELECT is(pg_temp.change_contact('LNA-C0N7-0001', 'archive'), 'OK', 'Can archive a confirmed record');
SELECT is(public.count_batch_active_seats('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 1, 'Archiving a confirmed record does not sell its seat again');
SELECT is((SELECT count(*) FROM public.email_outbox o JOIN public.enrollments e ON e.id = o.enrollment_id
  WHERE e.public_ref = 'LNA-C0N7-0001'), 1::bigint, 'Archiving preserves the payment confirmation history');
SELECT is((SELECT count(*) FROM public.audit_events WHERE action IN ('staff_edited_enrollment_contact', 'staff_archived_enrollment', 'staff_restored_enrollment')), 4::bigint, 'Enrollment changes are audited');

SELECT is((SELECT public.set_staff_batch_mentors('66666666-6666-4666-8666-666666666666', id, updated_at,
    ARRAY(SELECT m.id FROM public.mentors m ORDER BY name, id LIMIT 2))
  FROM public.batches WHERE slug = 'pgtap-offline-first'), 'OK', 'Can save a batch-specific roster');
SELECT is((SELECT count(*) FROM public.batch_mentors WHERE batch_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 2::bigint, 'Roster persists the two selected mentors');
SELECT is((SELECT public.set_staff_batch_mentors('66666666-6666-4666-8666-666666666666', id, updated_at,
    ARRAY['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid])
  FROM public.batches WHERE slug = 'pgtap-offline-first'), 'INVALID', 'An unknown mentor cannot replace the roster');
SELECT is((SELECT count(*) FROM public.batch_mentors WHERE batch_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 2::bigint, 'A rejected save preserves the roster');

SELECT is(pg_temp.archive_catalog('batches', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', false), 'OK', 'A batch with history can be archived');
SELECT is((SELECT status FROM public.batches WHERE slug = 'pgtap-offline-first'), 'archived', 'Batch archive updates its catalog status');
SELECT is((SELECT count(*) FROM public.batch_mentors WHERE batch_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 2::bigint, 'Archiving a batch retains its mentor assignments');
SELECT is(pg_temp.archive_catalog('batches', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true), 'OK', 'The batch can be restored');
SELECT is((SELECT status FROM public.batches WHERE slug = 'pgtap-offline-first'), 'open_for_enrollment', 'Restores the batch’s previous state');
SELECT is(pg_temp.archive_catalog('courses', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false), 'OK', 'A course with batches can be archived');
SELECT is((SELECT status FROM public.courses WHERE slug = 'pgtap-offline-review'), 'archived', 'Course archive updates the catalog status');
SELECT is(pg_temp.archive_catalog('courses', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true), 'OK', 'The course can be restored');
SELECT is((SELECT status FROM public.courses WHERE slug = 'pgtap-offline-review'), 'published', 'Restores the previous course status');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
