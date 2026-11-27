BEGIN;
SELECT plan(33);

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

CREATE FUNCTION pg_temp.record_payment(p_batch_number integer, p_ref text, p_method text, p_payment_ref text, p_email text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT public.record_staff_manual_enrollment(
    '66666666-6666-4666-8666-666666666666', id, updated_at, p_ref, 'Fixture Student',
    coalesce(p_email, lower(p_ref) || '@example.invalid'), '0171100' || right(p_ref, 4), '{}', '[]', p_method, p_payment_ref
  ) FROM public.batches WHERE batch_number = p_batch_number AND slug LIKE 'pgtap-offline-%'
$$;

CREATE FUNCTION pg_temp.review_payment(p_ref text, p_amount bigint, p_decision text DEFAULT 'approve',
  p_actor uuid DEFAULT '66666666-6666-4666-8666-666666666666')
RETURNS jsonb LANGUAGE sql AS $$
  SELECT public.review_staff_manual_payment(p_actor, id, updated_at, p_decision, p_amount)
  FROM public.enrollments WHERE public_ref = p_ref
$$;

SELECT ok(NOT has_function_privilege('anon', 'public.record_staff_manual_enrollment(uuid,uuid,timestamptz,text,text,text,text,jsonb,jsonb,text,text)', 'EXECUTE'), 'Anon cannot record payment');
SELECT ok(NOT has_function_privilege('authenticated', 'public.review_staff_manual_payment(uuid,uuid,timestamptz,text,bigint)', 'EXECUTE'), 'Browser role cannot review payment');
SET LOCAL ROLE service_role;

SELECT throws_ok($$ SELECT pg_temp.record_payment(1, 'LNA-MAN1-0001', 'bkash', '') $$,
  '22023', 'STAFF_ENROLLMENT_INVALID', 'A reference is required');
SELECT is(pg_temp.record_payment(1, 'LNA-MAN1-0001', 'bkash', '  SharedBkash01  ')->>'ok', 'true', 'Records a bKash reference');
SELECT is(pg_temp.record_payment(1, 'LNA-MAN1-0002', 'bank_transfer', 'Bank/Payment-01')->>'ok', 'true', 'Records a bank reference');
SELECT is(pg_temp.record_payment(2, 'LNA-MAN1-0003', 'bkash', 'shareDbkash01')->>'ok', 'true', 'Another application can queue a matching unverified reference for review');
SELECT is(pg_temp.record_payment(2, 'LNA-MAN1-0004', 'bank_transfer', 'SharedBkash01')->>'ok', 'true', 'A bank reference has its own payment rail');
SELECT is(pg_temp.record_payment(1, 'LNA-MAN1-0005', 'bkash', 'AnotherBkash', 'LNA-MAN1-0001@example.invalid')->>'code',
  'DUPLICATE_ENROLLMENT', 'Same email and batch returns the existing pending application');
SELECT results_eq($sql$
  SELECT status, payment_status, submitted_payment_ref, payable_poisha
  FROM public.enrollments WHERE public_ref = 'LNA-MAN1-0001'
$sql$, $$ VALUES ('application_in_process'::text, 'pending_verification'::text, 'SHAREDBKASH01'::text, 550025::bigint) $$,
  'Records a normalized reference and the configured discounted price');
SELECT is(public.count_batch_active_seats('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 0, 'Unverified references consume no seats');
SELECT is((SELECT count(*) FROM public.email_outbox o JOIN public.enrollments e ON e.id = o.enrollment_id
  WHERE e.public_ref LIKE 'LNA-MAN1-%'), 0::bigint, 'Recording a reference does not queue a confirmation');
SELECT is(public.start_enrollment('pgtap-offline-review', 'pgtap-offline-first', 'LNA-MAN1-0050', 'Fixture Student',
  'lna-man1-0001@example.invalid', '01711000001', '{}', '[]')->>'code',
  'DUPLICATE_ENROLLMENT', 'Public checkout cannot overwrite a manual reference');
SELECT throws_ok($$ SELECT pg_temp.review_payment('LNA-MAN1-0001', 550025, 'approve', '99999999-9999-4999-8999-999999999999') $$,
  '42501', 'STAFF_PAYMENT_REVIEW_FORBIDDEN', 'An unknown actor cannot bypass staff authorization');
SELECT is(pg_temp.review_payment('LNA-MAN1-0001', 550024)->>'code', 'AMOUNT_MISMATCH', 'Exact credited amount is required');

UPDATE public.batches SET enrollment_closes_at = now() - interval '1 minute' WHERE slug = 'pgtap-offline-first';
SELECT is(pg_temp.review_payment('LNA-MAN1-0001', 550025)->>'ok', 'true', 'A submission made before the intake deadline can be approved afterward');
SELECT is(pg_temp.review_payment('LNA-MAN1-0001', 550025)->>'already_reviewed', 'true', 'Retrying approval does not reconfirm');
SELECT ok((SELECT status = 'confirmed' AND payment_status = 'verified' AND confirmed_at IS NOT NULL
    AND verified_at IS NOT NULL AND hold_expires_at IS NULL AND staff_payment_reviewed_by = '66666666-6666-4666-8666-666666666666'
  FROM public.enrollments WHERE public_ref = 'LNA-MAN1-0001'), 'Confirmation records the reviewer and timestamp');
SELECT is((SELECT count(*) FROM public.email_outbox o JOIN public.enrollments e ON e.id = o.enrollment_id
  WHERE e.public_ref = 'LNA-MAN1-0001' AND o.template = 'enrollment_confirmed_paid'), 1::bigint, 'Retries queue only one confirmation');
SELECT is(pg_temp.review_payment('LNA-MAN1-0002', 550025)->>'code', 'BATCH_FULL', 'A full batch cannot confirm another student');
SELECT is(pg_temp.review_payment('LNA-MAN1-0003', 550025)->>'code', 'DUPLICATE_PAYMENT_REFERENCE', 'Normalized bKash reference cannot confirm a second enrollment');
SELECT is(pg_temp.review_payment('LNA-MAN1-0004', 550025)->>'ok', 'true', 'Confirms the bank transfer in the other batch');
SELECT is((SELECT o.payload ->> 'payment_method' FROM public.email_outbox o
  JOIN public.enrollments e ON e.id = o.enrollment_id WHERE e.public_ref = 'LNA-MAN1-0004'),
  'bank_transfer', 'The confirmation keeps the actual payment method');
SELECT is(pg_temp.review_payment('LNA-MAN1-0002', NULL, 'reject')->>'ok', 'true', 'Rejecting a reference cancels the application');
SELECT is(pg_temp.review_payment('LNA-MAN1-0002', NULL, 'reject')->>'already_reviewed', 'true', 'Rejecting twice does not create another decision');
SELECT is(pg_temp.review_payment('LNA-MAN1-0002', 550025)->>'code', 'REVIEW_UNAVAILABLE', 'A rejected application cannot be approved later');
SELECT is((SELECT count(*) FROM public.audit_events WHERE action = 'staff_manual_payment_approved'
  AND actor_id = '66666666-6666-4666-8666-666666666666'), 2::bigint, 'Only two successful approvals were audited');
SELECT ok(NOT EXISTS (SELECT 1 FROM public.audit_events WHERE action LIKE 'staff_manual_payment_%'
  AND (after_state ? 'email' OR after_state ? 'payment_ref' OR after_state::text LIKE '%SHAREDBKASH01%')),
  'Manual payment audit rows omit raw references and student contact data');

SELECT is(public.start_enrollment('pgtap-offline-review', 'pgtap-offline-second', 'LNA-MAN1-0006', 'Gateway Fixture',
  'gateway-one@example.invalid', '01711000006', '{}', '[]')->>'ok', 'true', 'A pending manual review does not block a gateway seat reservation');
SELECT is((SELECT public.confirm_payment(a.id, 'payment-fixture-01', 'shareDbkash01', 550025, 'BDT', '0000', 'success')->>'reason'
  FROM public.payment_attempts a JOIN public.enrollments e ON e.id = a.enrollment_id
  WHERE e.public_ref = 'LNA-MAN1-0006'), 'DUPLICATE_TRX_ID', 'A gateway callback cannot reuse an approved manual transaction');

UPDATE public.enrollments SET hold_expires_at = now() - interval '1 minute' WHERE public_ref = 'LNA-MAN1-0006';
SELECT is(public.start_enrollment('pgtap-offline-review', 'pgtap-offline-second', 'LNA-MAN1-0007', 'Gateway Fixture',
  'gateway-two@example.invalid', '01711000007', '{}', '[]')->>'ok', 'true', 'An expired gateway attempt frees capacity');
UPDATE public.enrollments SET hold_expires_at = now() - interval '1 minute' WHERE public_ref = 'LNA-MAN1-0007';
SELECT is((SELECT public.confirm_payment(a.id, 'payment-fixture-02', 'GatewayBkash01', 550025, 'BDT', '0000', 'success')->>'success'
  FROM public.payment_attempts a JOIN public.enrollments e ON e.id = a.enrollment_id
  WHERE e.public_ref = 'LNA-MAN1-0007'), 'true', 'An unverified manual reference does not block a late valid gateway confirmation');
SELECT is(pg_temp.record_payment(2, 'LNA-MAN1-0008', 'bkash', 'gatewaybkash01')->>'ok', 'true', 'Staff can log a reference for review even when the batch is full');
UPDATE public.batches SET capacity = 3 WHERE slug = 'pgtap-offline-second';
SELECT is(pg_temp.review_payment('LNA-MAN1-0008', 550025)->>'code',
  'DUPLICATE_PAYMENT_REFERENCE', 'Staff cannot verify a transaction already claimed by the gateway');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
