BEGIN;
SELECT plan(18);

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


CREATE FUNCTION pg_temp.purge_admission(
  n integer, confirmation text DEFAULT NULL, revision timestamptz DEFAULT NULL,
  actor uuid DEFAULT '66666666-6666-4666-8666-666666666666'
) RETURNS text LANGUAGE sql AS $$
  SELECT public.purge_staff_admission(actor, id, coalesce(revision, updated_at), coalesce(confirmation, public_ref))
  FROM public.enrollments WHERE public_ref = 'LNA-PRG7-' || lpad(n::text, 4, '0');
$$;

SELECT ok(NOT has_function_privilege('authenticated', 'public.purge_staff_admission(uuid,uuid,timestamptz,text)', 'EXECUTE'),
  'Browser roles cannot execute the purge');
SELECT ok(NOT has_table_privilege('service_role', 'public.enrollments', 'DELETE'), 'No broad table deletion grant');

SET LOCAL ROLE service_role;
SELECT throws_ok($$SELECT pg_temp.purge_admission(1, NULL, NULL, '77777777-7777-4777-8777-777777777777');$$,
  '42501', NULL, 'Only a Super Admin can delete an admission');
SELECT is(pg_temp.purge_admission(1, 'LNA-PRG7-0123'), 'CONFIRMATION_MISMATCH', 'Requires the current application ID');
SELECT is(pg_temp.purge_admission(1, NULL, '2000-01-01Z'), 'STALE', 'A stale form cannot delete a newer record');
SELECT is((SELECT public.admission_delete_eligibility(e) FROM public.enrollments e WHERE public_ref = 'LNA-PRG7-0001'),
  'eligible', 'A proven simulation is eligible');
SELECT is((SELECT public.admission_delete_eligibility(e) FROM public.enrollments e WHERE public_ref = 'LNA-PRG7-0003'),
  'payment_protected', 'A verified bank payment is protected in the list');
SELECT is(pg_temp.purge_admission(3), 'PAYMENT_PROTECTED', 'Verified bank transfers are retained');
SELECT is(pg_temp.purge_admission(4), 'PAYMENT_PROTECTED', 'Pending manual references are retained');
SELECT is(pg_temp.purge_admission(7), 'PAYMENT_PROTECTED', 'A live gateway attempt is retained');
SELECT is(pg_temp.purge_admission(5), 'OK', 'An unarchived unpaid application can be deleted');
SELECT is(public.count_batch_active_seats('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 3, 'Two confirmed seats and a hold are counted');
SELECT is(pg_temp.purge_admission(1, ' lna-prg7-0001 '), 'OK', 'A mock payment can be deleted with its enrollment');
SELECT is(public.count_batch_active_seats('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 2, 'Deleting a confirmed test payment frees its seat');
SELECT ok(EXISTS (SELECT 1 FROM public.students WHERE email = 'student1@example.invalid')
  AND EXISTS (SELECT 1 FROM public.student_completions WHERE student_id = 'cccccccc-cccc-4ccc-8ccc-000000000001')
  AND EXISTS (SELECT 1 FROM public.enrollments WHERE public_ref = 'LNA-PRG7-0002')
  AND NOT EXISTS (SELECT 1 FROM public.student_enrollment_links WHERE enrollment_id = 'eeeeeeee-eeee-4eee-8eee-000000000001'),
  'Other enrollments, the profile and course history are retained while the deleted enrollment is unlinked');
SELECT is((SELECT count(*) FROM public.payment_events WHERE tran_id = 'mock-invoice-001'), 0::bigint, 'Linked and orphaned test events are removed');
SELECT is((SELECT sum(amount_poisha) FROM public.payment_attempts), 1000::numeric, 'The unrelated gateway amount remains');
SELECT ok(NOT EXISTS (SELECT 1 FROM public.email_outbox WHERE idempotency_key = 'pgtap-student-purge-email')
  AND EXISTS (SELECT 1 FROM public.audit_events WHERE action = 'staff_deleted_admission'
    AND target_id IS NULL AND before_state IS NULL AND after_state IS NULL),
  'Queued mail is removed and the deletion audit records the staff operation');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
