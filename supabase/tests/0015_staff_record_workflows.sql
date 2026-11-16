BEGIN;
SELECT plan(23);

INSERT INTO auth.users (id, email) VALUES
  ('66666666-6666-4666-8666-666666666666', 'purge-student-staff@example.invalid'),
  ('77777777-7777-4777-8777-777777777777', 'purge-student-admin@example.invalid');
INSERT INTO public.profiles (id, email, full_name, role) VALUES
  ('66666666-6666-4666-8666-666666666666', 'purge-student-staff@example.invalid', 'Fixture staff', 'super_admin'),
  ('77777777-7777-4777-8777-777777777777', 'purge-student-admin@example.invalid', 'Fixture staff', 'admin');

INSERT INTO public.courses (id, slug, title, subtitle, category, summary, description, venue, status, published_at, provenance)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'pgtap-student-purge', 'Student fixture',
  'Test fixture', 'Training', 'Course summary for test enrollment', 'Course description for test enrollment',
  'Dhaka', 'published', now(), '{"class":"B","verified":false,"source":"pgTAP student deletion"}');
INSERT INTO public.batches (
  id, course_id, slug, batch_number, name, start_date, end_date, schedule_description,
  capacity, historical_enrolled_count, fee_poisha, venue, status, provenance
)
VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'pgtap-student-purge-batch', 1, 'Student fixture batch', current_date + 14,
  current_date + 15, 'Weekend sessions', 20, 0, 1000, 'Dhaka', 'open_for_enrollment',
  '{"class":"B","verified":false,"source":"pgTAP student deletion"}');

INSERT INTO public.students (id, full_name, email, phone)
SELECT ('cccccccc-cccc-4ccc-8ccc-' || lpad(n::text, 12, '0'))::uuid, 'Test student',
  'student' || n || '@example.invalid', '0170012300' || n
FROM generate_series(1, 4) AS n;
INSERT INTO public.student_contacts (student_id, email, phone)
SELECT id, email, phone FROM public.students WHERE id::text LIKE 'cccccccc-cccc-4ccc-8ccc-%';
INSERT INTO public.student_contacts (student_id, email, phone)
VALUES ('cccccccc-cccc-4ccc-8ccc-000000000001', 'old-email@example.invalid', '01700123101');
INSERT INTO public.student_completions (student_id, course_id, completed_on, recorded_by)
VALUES ('cccccccc-cccc-4ccc-8ccc-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  current_date - 1, '66666666-6666-4666-8666-666666666666');

-- A simulation, an older unpaid application, a genuine payment, an unverified
-- manual reference, two unrelated shared-contact records, and a live attempt.
INSERT INTO public.enrollments (
  id, public_ref, course_id, batch_id, full_name, email, phone, payment_method, payment_status,
  base_fee_poisha, payable_poisha, status, archived_at, submitted_payment_ref, verified_at, confirmed_at,
  staff_payment_recorded_by
)
SELECT ('eeeeeeee-eeee-4eee-8eee-' || lpad(n::text, 12, '0'))::uuid,
  'LNA-PRG7-' || lpad(n::text, 4, '0'),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'Test applicant', email, phone, method, pay_status, 1000, 1000,
  enrollment_status, CASE WHEN n = 2 THEN now() END, reference,
  CASE WHEN pay_status = 'verified' THEN now() END, CASE WHEN enrollment_status = 'confirmed' THEN now() END,
  CASE WHEN n = 4 THEN '66666666-6666-4666-8666-666666666666'::uuid END
FROM (VALUES
  (1, 'student1@example.invalid', '01700123001', 'bkash', 'verified', 'confirmed', 'MOCKTRXAAAAAAA1'),
  (2, 'old-email@example.invalid', '01700123101', 'bkash', 'pending_verification', 'expired', NULL),
  (3, 'student2@example.invalid', '01700123002', 'bank_transfer', 'verified', 'confirmed', 'BANK-POSTED-3'),
  (4, 'student3@example.invalid', '01700123003', 'bank_transfer', 'pending_verification', 'application_in_process', 'BANK-OPEN-4'),
  (5, 'another@example.invalid', '01700123001', 'bkash', 'pending_verification', 'expired', NULL),
  (6, 'student1@example.invalid', '01700123999', 'bkash', 'pending_verification', 'expired', NULL),
  (7, 'student4@example.invalid', '01700123004', 'bkash', 'pending_verification', 'pending', NULL)
) AS fixture(n, email, phone, method, pay_status, enrollment_status, reference);

INSERT INTO public.payment_attempts (id, enrollment_id, tran_id, payment_id, trx_id, status, amount_poisha)
VALUES
  ('aaaaaaaa-aaa1-4aaa-8aaa-aaaaaaaaaaaa', 'eeeeeeee-eeee-4eee-8eee-000000000001',
   'mock-invoice-001', 'MOCKPAY-AAAAAAAAAAA1', 'MOCKTRXAAAAAAA1', 'validated', 1000),
  ('aaaaaaaa-aaa2-4aaa-8aaa-aaaaaaaaaaaa', 'eeeeeeee-eeee-4eee-8eee-000000000007',
   'gateway-invoice-007', 'gateway-payment-007', NULL, 'pending', 1000);
INSERT INTO public.payment_events (payment_attempt_id, tran_id, payment_id, source) VALUES
  ('aaaaaaaa-aaa1-4aaa-8aaa-aaaaaaaaaaaa', 'mock-invoice-001', 'MOCKPAY-AAAAAAAAAAA1', 'mock_callback'),
  (NULL, 'mock-invoice-001', 'MOCKPAY-AAAAAAAAAAA1', 'mock_callback'),
  ('aaaaaaaa-aaa2-4aaa-8aaa-aaaaaaaaaaaa', 'gateway-invoice-007', 'gateway-payment-007', 'callback');
INSERT INTO public.email_outbox (enrollment_id, template, recipient_email, idempotency_key)
VALUES ('eeeeeeee-eeee-4eee-8eee-000000000001', 'enrollment_confirmed_paid',
  'student1@example.invalid', 'pgtap-student-purge-email');



INSERT INTO public.batches (id, course_id, slug, batch_number, name, start_date, end_date, schedule_description,
  capacity, historical_enrolled_count, fee_poisha, venue, status, provenance)
VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'pgtap-previous-batch', 2, 'Past batch', current_date - 15, current_date - 14, 'Weekend sessions',
  20, 0, 1000, 'Dhaka', 'completed', '{"class":"B","verified":false,"source":"pgTAP"}');

INSERT INTO public.students (id, full_name, email, phone)
VALUES ('cccccccc-cccc-4ccc-8ccc-000000000005', 'Orphan Student', 'another@example.invalid', '01700123001'),
       ('cccccccc-cccc-4ccc-8ccc-000000000006', 'Independent Student', 'other@example.invalid', '01700123200');
INSERT INTO public.student_contacts (student_id,email,phone)
SELECT id,email,phone FROM public.students WHERE id IN ('cccccccc-cccc-4ccc-8ccc-000000000005','cccccccc-cccc-4ccc-8ccc-000000000006');
INSERT INTO public.student_enrollment_links (student_id,enrollment_id)
VALUES ('cccccccc-cccc-4ccc-8ccc-000000000005','eeeeeeee-eeee-4eee-8eee-000000000005'),
       ('cccccccc-cccc-4ccc-8ccc-000000000006','eeeeeeee-eeee-4eee-8eee-000000000006');
INSERT INTO public.audit_events(actor_id,actor_role,action,target_entity,target_id)
VALUES ('66666666-6666-4666-8666-666666666666','super_admin','staff_student_create','students','cccccccc-cccc-4ccc-8ccc-000000000006');

CREATE FUNCTION pg_temp.preview_record(p_kind text, p_id uuid)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT public.preview_staff_record_purge('66666666-6666-4666-8666-666666666666', p_kind, p_id);
$$;

CREATE FUNCTION pg_temp.purge_admission(n integer, token text DEFAULT NULL)
RETURNS text LANGUAGE sql AS $$
  SELECT public.purge_staff_record('66666666-6666-4666-8666-666666666666', 'admission', id, updated_at, public_ref,
    coalesce(token, pg_temp.preview_record('admission', id)->>'token'))
  FROM public.enrollments WHERE public_ref = 'LNA-PRG7-' || lpad(n::text, 4, '0');
$$;

CREATE FUNCTION pg_temp.history(p_batch uuid, p_completion uuid, p_date date)
RETURNS text LANGUAGE sql AS $$
  SELECT public.manage_staff_course_history('66666666-6666-4666-8666-666666666666',
    'cccccccc-cccc-4ccc-8ccc-000000000006', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    p_batch, p_completion, p_date);
$$;

SELECT ok(NOT has_function_privilege('authenticated', 'public.purge_staff_record(uuid,text,uuid,timestamptz,text,text)', 'EXECUTE'), 'Browser roles cannot purge');
SELECT ok(NOT has_function_privilege('authenticated', 'public.preview_staff_record_purge(uuid,text,uuid)', 'EXECUTE'), 'Browser roles cannot read purge scopes');
SELECT ok(NOT has_function_privilege('authenticated', 'public.manage_staff_course_history(uuid,uuid,uuid,uuid,uuid,date)', 'EXECUTE'), 'Browser roles cannot edit history');

SET LOCAL ROLE service_role;
SELECT throws_ok($$SELECT public.preview_staff_record_purge('77777777-7777-4777-8777-777777777777','admission','eeeeeeee-eeee-4eee-8eee-000000000005');$$,
  '42501', NULL, 'Preview is restricted to active Super Admins');
SELECT is(pg_temp.history('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', NULL, NULL), 'INVALID_COURSE', 'Future batches cannot be entered as past courses');
SELECT is(pg_temp.history(NULL, NULL, NULL), 'OK', 'Batch unknown is available');
SELECT is(pg_temp.history(NULL, NULL, NULL), 'ALREADY_RECORDED', 'Batch unknown is idempotent');
SELECT is(pg_temp.history('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', NULL, NULL), 'OK', 'Past batch is recorded');
SELECT is(pg_temp.history('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', NULL, NULL), 'ALREADY_RECORDED', 'A repeated request does not add the batch twice');
SELECT is(pg_temp.history(NULL, (SELECT id FROM public.student_completions WHERE student_id = 'cccccccc-cccc-4ccc-8ccc-000000000006' AND batch_id IS NULL), current_date + 1),
  'INVALID_DATE', 'Future completion dates are rejected');
SELECT is(pg_temp.history(NULL, (SELECT id FROM public.student_completions WHERE student_id = 'cccccccc-cccc-4ccc-8ccc-000000000006' AND batch_id IS NULL), current_date - 1),
  'OK', 'Completion date can be recorded separately');
SELECT is(pg_temp.preview_record('admission','eeeeeeee-eeee-4eee-8eee-000000000003')->>'status','payment_protected','Verified payment blocks preview');
SELECT is(pg_temp.purge_admission(4), 'PAYMENT_PROTECTED', 'Pending manual payment still blocks writes');
SELECT is(pg_temp.purge_admission(7), 'PAYMENT_PROTECTED', 'Real bKash attempt still blocks writes');
SELECT is(pg_temp.preview_record('admission','eeeeeeee-eeee-4eee-8eee-000000000001')->>'profile','kept','An independent course prevents automatic profile deletion');
SELECT is(pg_temp.preview_record('admission','eeeeeeee-eeee-4eee-8eee-000000000005')->>'profile','deleted','Shared phone alone does not prevent lone linked profile deletion');
SELECT is(pg_temp.purge_admission(5, '00000000000000000000000000000000'), 'IMPACT_CHANGED', 'A changed preview prevents deletion');
SELECT is(pg_temp.purge_admission(5), 'OK', 'Lone admission and profile are deleted together');
SELECT ok(NOT EXISTS (SELECT 1 FROM public.students WHERE id='cccccccc-cccc-4ccc-8ccc-000000000005')
  AND EXISTS (SELECT 1 FROM public.students WHERE id='cccccccc-cccc-4ccc-8ccc-000000000001'), 'Only the lone student profile was removed');
SELECT is(pg_temp.purge_admission(6), 'OK', 'Application with independent student details can still be deleted');
SELECT ok(EXISTS(SELECT 1 FROM public.students WHERE id='cccccccc-cccc-4ccc-8ccc-000000000006'),'Independent student record survives');

SELECT is(pg_temp.preview_record('student','cccccccc-cccc-4ccc-8ccc-000000000001')->>'applications','2','Student preview includes exact contact history across applications');
SELECT is((SELECT public.purge_staff_record('66666666-6666-4666-8666-666666666666','student', id, updated_at,email,
    pg_temp.preview_record('student', id)->>'token') FROM public.students WHERE id='cccccccc-cccc-4ccc-8ccc-000000000001'),
  'OK', 'Student purge still clears eligible course and test payment records together');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
