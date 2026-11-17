BEGIN;
SELECT plan(17);

INSERT INTO auth.users (id, email) VALUES
  ('59f66819-394e-4d84-898b-4d67f7e1528b', 'manual-bkash-reviewer@example.invalid');
INSERT INTO public.profiles (id, email, full_name, role) VALUES
  ('59f66819-394e-4d84-898b-4d67f7e1528b', 'manual-bkash-reviewer@example.invalid',
    'Manual bKash reviewer', 'super_admin');

INSERT INTO public.courses (id, slug, title, subtitle, category, summary, description, venue, status, published_at, provenance)
VALUES ('f643a45c-3d8b-4c5f-bfd7-4d1ce269befa', 'pgtap-public-manual', 'Public manual payment fixture',
  'Admissions fixture', 'Training', 'Course summary for test enrollment', 'Course description for test enrollment',
  'Dhaka', 'published', now(), '{"class":"B","verified":false,"source":"pgTAP admissions fixture"}');
INSERT INTO public.batches (
  id, course_id, slug, batch_number, name, start_date, end_date, schedule_description,
  capacity, fee_poisha, discount_fee_poisha, venue, status, provenance
)
VALUES ('7ed4b95d-ba03-4d3a-9696-c5f44f0e2ce2', 'f643a45c-3d8b-4c5f-bfd7-4d1ce269befa',
  'public-manual-paid', 1, 'Manual bKash batch', current_date + 14, current_date + 15,
  'Weekend sessions', 1, 750000, 550025, 'Dhaka', 'open_for_enrollment',
  '{"class":"B","verified":false,"source":"pgTAP admissions fixture"}'),
  ('ed36efd2-69d2-4397-8963-763f1505799a', 'f643a45c-3d8b-4c5f-bfd7-4d1ce269befa',
  'public-manual-free', 2, 'Free batch', current_date + 14, current_date + 15,
  'Weekend sessions', 1, 0, NULL, 'Dhaka', 'open_for_enrollment',
  '{"class":"B","verified":false,"source":"pgTAP admissions fixture"}');

CREATE FUNCTION pg_temp.submit_proof(p_ref text, p_trx text, p_contact text, p_batch text DEFAULT 'public-manual-paid')
RETURNS jsonb LANGUAGE sql AS $$
  SELECT public.submit_public_manual_enrollment(
    'pgtap-public-manual', p_batch, p_ref, 'Fixture Applicant',
    'manual-' || p_contact || '@example.invalid', '0171100' || p_contact, '{"university":"DU"}',
    '[{"id":"university","label":"University","type":"text","required":true}]', p_trx
  )
$$;
CREATE FUNCTION pg_temp.approve_proof(p_ref text, p_amount bigint)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT public.review_staff_manual_payment('59f66819-394e-4d84-898b-4d67f7e1528b', id, updated_at, 'approve', p_amount)
  FROM public.enrollments WHERE public_ref = p_ref
$$;

SELECT ok(NOT has_function_privilege('anon',
  'public.submit_public_manual_enrollment(text,text,text,text,text,text,jsonb,jsonb,text)', 'EXECUTE'),
  'Browser anonymous role cannot call the submission RPC');
SELECT ok(NOT has_function_privilege('authenticated',
  'public.submit_public_manual_enrollment(text,text,text,text,text,text,jsonb,jsonb,text)', 'EXECUTE'),
  'Browser authenticated role cannot call the submission RPC');
SET LOCAL ROLE service_role;

SELECT is(pg_temp.submit_proof('LNA-BKSA-0001', NULL, '0601')->>'code',
  'TRANSACTION_ID_REQUIRED', 'A paid application requires a transaction ID');
SELECT is(pg_temp.submit_proof('LNA-BKSA-0001', ' bK15a2h90x ', '0601')->>'status',
  'application_in_process', 'Applicant proof creates an application for Admissions');
SELECT ok((SELECT applicant_payment_submitted AND staff_payment_recorded_by IS NULL
  AND payment_method = 'bkash' AND payment_status = 'pending_verification'
  AND submitted_payment_ref = 'BK15A2H90X' AND payable_poisha = 550025 AND hold_expires_at IS NULL
  AND answers->>'university' = 'DU' AND program_questions_snapshot->0->>'id' = 'university'
  FROM public.enrollments WHERE public_ref = 'LNA-BKSA-0001'),
  'Transaction, applicant answers, question snapshot and authoritative fee are saved together');
SELECT is((SELECT count(*) FROM public.payment_attempts a JOIN public.enrollments e ON e.id = a.enrollment_id
  WHERE e.public_ref = 'LNA-BKSA-0001'), 0::bigint, 'Manual payment creates no gateway attempt');
SELECT is((SELECT count(*) FROM public.email_outbox o JOIN public.enrollments e ON e.id = o.enrollment_id
  WHERE e.public_ref = 'LNA-BKSA-0001'), 0::bigint, 'Receipt submission does not queue a seat confirmation');
SELECT is(public.count_batch_active_seats('7ed4b95d-ba03-4d3a-9696-c5f44f0e2ce2'), 0,
  'Applicant receipts awaiting verification consume no seats');
SELECT is(pg_temp.submit_proof('LNA-BKSA-0002', 'BK15A2H90X', '0601')->>'public_ref',
  'LNA-BKSA-0001', 'Exact retries return the original application');
SELECT is(pg_temp.submit_proof('LNA-BKSA-0002', 'BK15A2H90X', '0602')->>'code',
  'DUPLICATE_PAYMENT_REFERENCE', 'Another contact cannot claim an existing transaction ID');
SELECT is(pg_temp.submit_proof('LNA-BKSA-0002', 'BK15A2H91X', '0601')->>'code',
  'DUPLICATE_ENROLLMENT', 'A different receipt cannot create a second application for the same contact');
SELECT is(pg_temp.approve_proof('LNA-BKSA-0001', 550024)->>'code',
  'AMOUNT_MISMATCH', 'The existing staff review requires the exact amount');
SELECT is(pg_temp.approve_proof('LNA-BKSA-0001', 550025)->>'ok', 'true',
  'Staff can verify the applicant payment');
SELECT is(public.count_batch_active_seats('7ed4b95d-ba03-4d3a-9696-c5f44f0e2ce2'), 1,
  'Verification confirms and consumes one seat');
SELECT is(pg_temp.submit_proof('LNA-BKSA-0002', 'BK15A2H91X', '0602')->>'status',
  'application_in_process', 'An already-paid applicant can submit evidence if the last seat fills during payment');
SELECT is(pg_temp.approve_proof('LNA-BKSA-0002', 550025)->>'code', 'BATCH_FULL',
  'A receipt received after the last seat fills cannot overbook the cohort');
SELECT is(pg_temp.submit_proof('LNA-BKSA-0003', NULL, '0603', 'public-manual-free')->>'status',
  'confirmed', 'Free enrollment still confirms without bKash');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
