BEGIN;
SELECT plan(21);
INSERT INTO public.courses(id,slug,title,subtitle,category,summary,description,venue,status,published_at,provenance)
VALUES('e2400000-0000-4000-8000-000000000001','w4-payment-test','Payment fixture','Course test subtitle','Training','Fixture summary','Fixture description for payment safety','Dhaka','published',now(),'{"class":"B","verified":false,"source":"pgTAP fixture"}');
INSERT INTO public.batches(id,course_id,slug,batch_number,name,start_date,end_date,schedule_description,capacity,fee_poisha,status,venue,accept_applications,provenance)
VALUES('e2400000-0000-4000-8000-000000000002','e2400000-0000-4000-8000-000000000001','w4-payment-paid',1,'Paid batch',current_date+1,current_date+2,'Weekend sessions',10,750000,'upcoming','Dhaka',true,'{"class":"B","verified":false,"source":"pgTAP fixture"}');
SELECT ok(NOT has_function_privilege('anon','public.claim_bkash_reconciliation(uuid,uuid)','EXECUTE') AND NOT has_function_privilege('authenticated','public.release_bkash_reconciliation(uuid,uuid)','EXECUTE'),'Browser cannot claim or release reconciliation lease');
SET LOCAL ROLE service_role;
SELECT is(public.start_checked_public_enrollment('w4-payment-test','w4-payment-paid','LNA-W4P0-0001','Payment Fixture','w4-payment-1@example.invalid','01799002401','{}','[]',NULL,750000,'hosted')->>'ok','true','Creates one hosted payment attempt');
SELECT is(public.retry_enrollment_payment('LNA-W4P0-0001')->>'code','PAYMENT_UNRESOLVED','Initiated attempt blocks another checkout');
SELECT is((SELECT count(*) FROM public.payment_attempts pa JOIN public.enrollments e ON e.id=pa.enrollment_id WHERE e.public_ref='LNA-W4P0-0001'),1::bigint,'No second attempt created');
SELECT is((SELECT public.record_payment_outcome(pa.id,'failed','PAY-FIXTURE-01','GATEWAY_DECLINED','2023','Fixture decline')->>'status' FROM public.payment_attempts pa JOIN public.enrollments e ON e.id=pa.enrollment_id WHERE e.public_ref='LNA-W4P0-0001'),'failed','Definitively declined attempt recorded');
SELECT is(public.retry_enrollment_payment('LNA-W4P0-0001')->>'ok','true','Definitively failed attempt allows retry');
SELECT is(public.retry_enrollment_payment('LNA-W4P0-0001')->>'code','PAYMENT_UNRESOLVED','New initiated attempt blocks repeated retry');
RESET ROLE;
UPDATE public.batches SET accept_applications=false WHERE slug='w4-payment-paid';
SET LOCAL ROLE service_role;
SELECT is((SELECT public.confirm_payment(pa.id,'PAY-FIXTURE-02','TRX-FIXTURE-02',750000,'BDT','0000','Completed')->>'status' FROM public.payment_attempts pa JOIN public.enrollments e ON e.id=pa.enrollment_id WHERE e.public_ref='LNA-W4P0-0001' AND pa.status='initiated'),'validated','Eligible existing checkout may finish after intake closes');
SELECT is((SELECT count(*) FROM public.email_outbox o JOIN public.enrollments e ON e.id=o.enrollment_id WHERE e.public_ref='LNA-W4P0-0001' AND o.template='enrollment_confirmed_paid'),1::bigint,'Single paid confirmation queued');
SELECT is((SELECT public.confirm_payment(pa.id,'PAY-FIXTURE-01','TRX-FIXTURE-EXTRA',750000,'BDT','0000','Late receipt')->>'reason' FROM public.payment_attempts pa JOIN public.enrollments e ON e.id=pa.enrollment_id WHERE e.public_ref='LNA-W4P0-0001' AND pa.status='failed'),'ENROLLMENT_ALREADY_CONFIRMED','Second completed receipt requires review instead of reconfirmation');
SELECT ok((SELECT count(*)=1 FROM public.payment_attempts pa JOIN public.enrollments e ON e.id=pa.enrollment_id WHERE e.public_ref='LNA-W4P0-0001' AND pa.trx_id='TRX-FIXTURE-EXTRA' AND pa.status='review_hold' AND pa.validated_amount_poisha=750000),'Second receipt evidence retained independently');
RESET ROLE;
UPDATE public.batches SET accept_applications=true WHERE slug='w4-payment-paid';
SET LOCAL ROLE service_role;
SELECT is(public.start_checked_public_enrollment('w4-payment-test','w4-payment-paid','LNA-W4P0-0002','Late Fixture','w4-payment-2@example.invalid','01799002402','{}','[]',NULL,750000,'hosted')->>'ok','true','Create second reservation');
RESET ROLE;
UPDATE public.enrollments SET status='cancelled' WHERE public_ref='LNA-W4P0-0002';
SET LOCAL ROLE service_role;
SELECT is((SELECT public.confirm_payment(pa.id,'PAY-FIXTURE-03','TRX-FIXTURE-03',750000,'BDT','0000','Completed')->>'reason' FROM public.payment_attempts pa JOIN public.enrollments e ON e.id=pa.enrollment_id WHERE e.public_ref='LNA-W4P0-0002'),'ENROLLMENT_INELIGIBLE','Late receipt cannot reopen cancelled enrollment');
SELECT ok((SELECT e.status='cancelled' AND pa.status='review_hold' AND pa.trx_id='TRX-FIXTURE-03' AND pa.validated_amount_poisha=750000 FROM public.payment_attempts pa JOIN public.enrollments e ON e.id=pa.enrollment_id WHERE e.public_ref='LNA-W4P0-0002'),'Cancelled state and late payment evidence both preserved');
SELECT is((SELECT count(*) FROM public.email_outbox o JOIN public.enrollments e ON e.id=o.enrollment_id WHERE e.public_ref='LNA-W4P0-0002'),0::bigint,'No false confirmation email');
SELECT is((SELECT public.record_payment_outcome(pa.id,'failed','PAY-FIXTURE-03','LATE_DECLINE','2023','Old decline')->>'status' FROM public.payment_attempts pa JOIN public.enrollments e ON e.id=pa.enrollment_id WHERE e.public_ref='LNA-W4P0-0002'),'review_hold','Older decline cannot overwrite review evidence');
SELECT is(public.start_checked_public_enrollment('w4-payment-test','w4-payment-paid','LNA-W4P0-0003','Lease Fixture','w4-payment-3@example.invalid','01799002403','{}','[]',NULL,750000,'hosted')->>'ok','true','Create reservation for lease test');
RESET ROLE;
-- Fixture-only backdate: the standard updated_at trigger would otherwise use this transaction's now().
ALTER TABLE public.payment_attempts DISABLE TRIGGER trg_payment_attempts_set_updated_at;
UPDATE public.payment_attempts SET payment_id='PAY-FIXTURE-04',failure_reason='EXECUTE_STARTED',updated_at=now()-interval '2 minutes'
WHERE enrollment_id=(SELECT id FROM public.enrollments WHERE public_ref='LNA-W4P0-0003');
ALTER TABLE public.payment_attempts ENABLE TRIGGER trg_payment_attempts_set_updated_at;
SET LOCAL ROLE service_role;
SELECT ok((SELECT public.claim_bkash_reconciliation(pa.id,'e2400000-0000-4000-8000-000000000010') FROM public.payment_attempts pa JOIN public.enrollments e ON e.id=pa.enrollment_id WHERE e.public_ref='LNA-W4P0-0003'),'Abandoned Execute claim recoverable by query worker');
SELECT ok(NOT (SELECT public.claim_bkash_reconciliation(pa.id,'e2400000-0000-4000-8000-000000000011') FROM public.payment_attempts pa JOIN public.enrollments e ON e.id=pa.enrollment_id WHERE e.public_ref='LNA-W4P0-0003'),'Second worker cannot claim active lease');
SELECT ok(NOT (SELECT public.release_bkash_reconciliation(pa.id,'e2400000-0000-4000-8000-000000000011') FROM public.payment_attempts pa JOIN public.enrollments e ON e.id=pa.enrollment_id WHERE e.public_ref='LNA-W4P0-0003'),'Non-owner cannot release lease');
SELECT ok((SELECT public.release_bkash_reconciliation(pa.id,'e2400000-0000-4000-8000-000000000010') FROM public.payment_attempts pa JOIN public.enrollments e ON e.id=pa.enrollment_id WHERE e.public_ref='LNA-W4P0-0003'),'Owner can release lease');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
