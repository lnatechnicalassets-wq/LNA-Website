BEGIN;
SELECT plan(14);

INSERT INTO auth.users(id,email)
VALUES ('e3000000-0000-4000-8000-000000000001','receipt-admin@example.invalid');
INSERT INTO public.profiles(id,email,full_name,role,account_state)
VALUES ('e3000000-0000-4000-8000-000000000001','receipt-admin@example.invalid','Receipt Admin','admin','active');
INSERT INTO public.courses(id,slug,title,subtitle,category,summary,description,venue,status,published_at,provenance)
VALUES ('e3000000-0000-4000-8000-000000000002','w5-receipt-fields','Receipt fields','Field test subtitle',
  'Training','Fixture summary','Fixture description for receipt fields','Dhaka','published',now(),
  '{"class":"B","verified":false,"source":"pgTAP fixture"}');
INSERT INTO public.batches(id,course_id,slug,batch_number,name,start_date,end_date,schedule_description,
  capacity,fee_poisha,discount_fee_poisha,status,venue,accept_applications,provenance)
VALUES ('e3000000-0000-4000-8000-000000000003','e3000000-0000-4000-8000-000000000002','w5-receipt-paid',1,
  'Paid batch',current_date+1,current_date+2,'Weekend sessions',10,750000,700000,'upcoming','Dhaka',true,
  '{"class":"B","verified":false,"source":"pgTAP fixture"}');

SELECT ok(NOT has_table_privilege('authenticated','public.payment_receipts','SELECT')
  AND NOT has_table_privilege('service_role','public.payment_receipts','UPDATE'),'Receipt grants remain private');
SET LOCAL ROLE service_role;
SELECT is(public.start_checked_public_enrollment('w5-receipt-fields','w5-receipt-paid','LNA-W5B0-0001',
  'Hosted Receipt','w5-receipt-1@example.invalid','01799003001','{}','[]',NULL,700000,'hosted')->>'ok',
  'true','Starts a hosted enrollment');
SELECT is((SELECT public.confirm_payment(pa.id,'PAY-RECEIPT-01','TRX-RECEIPT-01',700000,'BDT','0000','Completed')->>'status'
  FROM public.payment_attempts pa JOIN public.enrollments e ON e.id=pa.enrollment_id
  WHERE e.public_ref='LNA-W5B0-0001'),'validated','Confirms the expected collection');
SELECT is((SELECT r.snapshot->>'transaction_id' FROM public.payment_receipts r JOIN public.enrollments e
  ON e.id=r.enrollment_id WHERE e.public_ref='LNA-W5B0-0001'),'TRX-RECEIPT-01','Captures the verified TrxID');
SELECT ok((SELECT (r.snapshot->>'issued_at')::timestamptz=r.created_at FROM public.payment_receipts r
  JOIN public.enrollments e ON e.id=r.enrollment_id WHERE e.public_ref='LNA-W5B0-0001'),
  'Snapshot issue date is the stored issuance timestamp');
SELECT is((SELECT r.snapshot->>'base_fee_poisha' FROM public.payment_receipts r JOIN public.enrollments e
  ON e.id=r.enrollment_id WHERE e.public_ref='LNA-W5B0-0001'),'750000','Snapshots original fee');
SELECT is((SELECT r.snapshot->>'adjustment_poisha' FROM public.payment_receipts r JOIN public.enrollments e
  ON e.id=r.enrollment_id WHERE e.public_ref='LNA-W5B0-0001'),'50000','Snapshots discount amount');
SELECT is((SELECT r.snapshot->>'adjustment_kind' FROM public.payment_receipts r JOIN public.enrollments e
  ON e.id=r.enrollment_id WHERE e.public_ref='LNA-W5B0-0001'),'discount','Classifies online discount');
SELECT is((SELECT public.confirm_payment(pa.id,'PAY-RECEIPT-01','TRX-RECEIPT-01',700000,'BDT','0000','Completed')->>'status'
  FROM public.payment_attempts pa JOIN public.enrollments e ON e.id=pa.enrollment_id
  WHERE e.public_ref='LNA-W5B0-0001'),'already_validated','Callback replay is idempotent');
SELECT is((SELECT public.claim_confirmation_email(o.id,false)->'receipt'->>'transaction_id'
  FROM public.email_outbox o JOIN public.enrollments e ON e.id=o.enrollment_id
  WHERE e.public_ref='LNA-W5B0-0001'),'TRX-RECEIPT-01','Email claim receives the same receipt snapshot');

SELECT is((SELECT public.create_confirmed_staff_admission('e3000000-0000-4000-8000-000000000001',id,updated_at,
  'LNA-W5B0-0002','Waiver Receipt','w5-receipt-2@example.invalid','01799003002','{}','[]',
  'partial_fee_waiver','bank_transfer',700000,100000,'BANK-RECEIPT-02','Approved waiver',false,true,true)->>'ok'
  FROM public.batches WHERE slug='w5-receipt-paid'),'true','Records a paid partial waiver');
SELECT is((SELECT r.snapshot->>'adjustment_kind' FROM public.payment_receipts r JOIN public.enrollments e
  ON e.id=r.enrollment_id WHERE e.public_ref='LNA-W5B0-0002'),'partial_waiver','Classifies staff waiver');
SELECT is((SELECT r.snapshot->>'payment_reference' FROM public.payment_receipts r JOIN public.enrollments e
  ON e.id=r.enrollment_id WHERE e.public_ref='LNA-W5B0-0002'),'BANK-RECEIPT-02','Records staff payment reference');
SELECT ok((SELECT NOT (r.snapshot ? 'transaction_id') FROM public.payment_receipts r JOIN public.enrollments e
  ON e.id=r.enrollment_id WHERE e.public_ref='LNA-W5B0-0002'),'Staff reference is distinct from a verified bKash TrxID');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
