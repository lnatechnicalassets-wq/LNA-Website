BEGIN;
SELECT plan(19);

INSERT INTO auth.users (id, email) VALUES
  ('66666666-6666-4666-8666-666666666666', 'review-staff@example.invalid'),
  ('77777777-7777-4777-8777-777777777777', 'review-admin@example.invalid');
INSERT INTO public.profiles (id, email, full_name, role) VALUES
  ('66666666-6666-4666-8666-666666666666', 'review-staff@example.invalid', 'Review fixture staff', 'super_admin'),
  ('77777777-7777-4777-8777-777777777777', 'review-admin@example.invalid', 'Review fixture admin', 'admin');
INSERT INTO public.courses (id, slug, title, subtitle, category, summary, description, venue, status, published_at, provenance)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'pgtap-people', 'Manual review fixture',
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
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid, 'pgtap-people-first', 1, 1),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid, 'pgtap-people-second', 2, 0)
) AS fixture(id, slug, n, historical);

CREATE FUNCTION pg_temp.record_contact(p_batch_number integer, p_ref text, p_email text, p_phone text)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT public.record_staff_manual_enrollment(
    '66666666-6666-4666-8666-666666666666', id, updated_at, p_ref, 'Fixture Student',
    p_email, p_phone, '{}', '[]', 'bkash', p_ref || 'PAY'
  ) FROM public.batches WHERE batch_number = p_batch_number AND slug LIKE 'pgtap-people-%'
$$;
INSERT INTO public.batches (
  id, course_id, slug, batch_number, name, start_date, end_date, schedule_description,
  capacity, fee_poisha, venue, status, provenance
) VALUES (
  'bbbbbbbb-abbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'pgtap-people-completed', 3, 'Graduated cohort', current_date - 10, current_date - 9,
  'Weekend sessions', 20, 0, 'Dhaka', 'completed',
  '{"class":"B","verified":false,"source":"pgTAP student history fixture"}'
);

CREATE FUNCTION pg_temp.mentor_change(operation text)
RETURNS text LANGUAGE sql AS $$
  SELECT public.manage_staff_mentor(
    '66666666-6666-4666-8666-666666666666', operation, m.id, m.updated_at,
    CASE WHEN operation = 'edit' THEN 'Edited Mentor' ELSE 'Fixture Directory Mentor' END,
    'Mentor role', 'Fixture Company', 'Profile biography for the directory',
    '/images/mentors/gm-kamrul.png', '/images/partners/nagad.png'
  ) FROM (SELECT 1) AS once
  LEFT JOIN public.mentors m ON m.name IN ('Fixture Directory Mentor', 'Edited Mentor')
$$;

CREATE FUNCTION pg_temp.student_change(op text, address text, batch uuid DEFAULT NULL)
RETURNS text LANGUAGE sql AS $$
  SELECT public.manage_staff_student(
    '66666666-6666-4666-8666-666666666666', op, s.id, s.updated_at,
    'Fixture Alumni', address, '01711000201', 'Fixture University',
    CASE WHEN batch IS NOT NULL THEN 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid END,
    batch, CASE WHEN batch IS NOT NULL THEN current_date - 8 END
  ) FROM (SELECT 1) AS once LEFT JOIN public.students s ON s.full_name = 'Fixture Alumni'
$$;

SELECT ok(NOT has_table_privilege('anon', 'public.students', 'SELECT'), 'Guests cannot read the student directory');
SELECT ok(NOT has_table_privilege('authenticated', 'public.student_contacts', 'SELECT'), 'Browser sessions cannot read private contact aliases');
SELECT ok(NOT has_table_privilege('authenticated', 'public.student_enrollment_links', 'SELECT'), 'Browser sessions cannot read private enrollment links');
SELECT ok(NOT has_table_privilege('authenticated', 'public.student_completions', 'INSERT'), 'Browser sessions cannot write completion history');
SELECT ok(NOT has_function_privilege('authenticated', 'public.manage_staff_mentor(uuid,text,uuid,timestamptz,text,text,text,text,text,text)', 'EXECUTE'), 'Browser sessions cannot call the mentor RPC');

SET LOCAL ROLE service_role;
SELECT is(pg_temp.mentor_change('create'), 'OK', 'Super Admin can create a mentor');
SELECT is(pg_temp.mentor_change('edit'), 'OK', 'Super Admin can edit mentor details');
SELECT ok((SELECT slug = 'mentor-' || id::text AND company_logo_src = '/images/partners/nagad.png'
  FROM public.mentors WHERE name = 'Edited Mentor'), 'Editing preserves the slug and stores a company logo');
SELECT is(pg_temp.mentor_change('archive'), 'OK', 'Super Admin can archive a mentor');
SELECT is(pg_temp.mentor_change('restore'), 'OK', 'Super Admin can restore an archived mentor');
SELECT throws_ok($$ SELECT public.manage_staff_student(
  '77777777-7777-4777-8777-777777777777', 'create', NULL, NULL, 'Fixture Applicant',
  'other@example.invalid', '01711001201', NULL, NULL, NULL, NULL) $$,
  '42501', NULL, 'A regular admin cannot write student profiles');

SELECT is(pg_temp.student_change('create', 'alumni@example.invalid', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'INVALID', 'An upcoming cohort cannot be recorded as completed');
SELECT is(pg_temp.student_change('create', 'alumni@example.invalid', 'bbbbbbbb-abbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'OK', 'Super Admin can add a student and historical course completion');
SELECT is(pg_temp.student_change('create', ' ALUMNI@EXAMPLE.INVALID '), 'DUPLICATE',
  'Case-insensitive contact pairs identify the same directory profile');
SELECT is(pg_temp.student_change('archive', NULL), 'OK', 'Archiving preserves the student profile for recovery');
SELECT is((SELECT count(*) FROM public.student_completions
  WHERE batch_id = 'bbbbbbbb-abbb-4bbb-8bbb-bbbbbbbbbbbb'), 1::bigint,
  'Completed course remains linked after archive');
SELECT is(pg_temp.student_change('restore', NULL), 'OK', 'The student profile can be restored');

CREATE FUNCTION pg_temp.confirm_fixture_contact(ref text)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT public.review_staff_manual_payment(
    '66666666-6666-4666-8666-666666666666', id, updated_at, 'approve', 550025
  ) FROM public.enrollments WHERE public_ref = ref
$$;
DO $$
BEGIN
  PERFORM pg_temp.record_contact(1, 'LNA-PR0P-0001', 'alumni@example.invalid', '01711000201');
  PERFORM pg_temp.record_contact(2, 'LNA-PR0P-0002', 'alumni@example.invalid', '01711000201');
  PERFORM pg_temp.record_contact(2, 'LNA-PR0P-0003', 'different@example.invalid', '01711000202');
  PERFORM pg_temp.confirm_fixture_contact('LNA-PR0P-0001');
  PERFORM pg_temp.confirm_fixture_contact('LNA-PR0P-0002');
  PERFORM pg_temp.confirm_fixture_contact('LNA-PR0P-0003');
  PERFORM pg_temp.student_change('edit', 'alumni-new@example.invalid');
END;
$$;

SELECT is((SELECT count(*) FROM public.student_enrollment_links l JOIN public.students s ON s.id = l.student_id
  WHERE s.email = 'alumni-new@example.invalid'), 2::bigint,
  'Confirmations across cohorts follow the existing student even after their directory email changes');
SELECT is((SELECT count(*) FROM public.student_enrollment_links l JOIN public.students s ON s.id = l.student_id
  WHERE s.email = 'different@example.invalid'), 1::bigint, 'Confirmation creates a new profile for a different student');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
