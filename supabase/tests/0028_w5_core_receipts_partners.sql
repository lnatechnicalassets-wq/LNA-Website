BEGIN;
SELECT plan(15);
INSERT INTO auth.users(id,email) VALUES('e2800000-0000-4000-8000-000000000001','release-admin@example.invalid');
INSERT INTO public.profiles(id,email,full_name,role,account_state) VALUES('e2800000-0000-4000-8000-000000000001','release-admin@example.invalid','Release Admin','admin','active');
INSERT INTO public.courses(id,slug,title,subtitle,category,summary,description,venue,status,published_at,provenance)
VALUES('e2800000-0000-4000-8000-000000000002','release-fixture','Release course','Course test subtitle','Training','Fixture summary','Fixture description for release enrollment','Dhaka','published',now(),'{"class":"B","verified":false,"source":"pgTAP fixture"}');
INSERT INTO public.batches(id,course_id,slug,batch_number,name,start_date,end_date,schedule_description,capacity,fee_poisha,status,venue,accept_applications,provenance)
VALUES('e2800000-0000-4000-8000-000000000003','e2800000-0000-4000-8000-000000000002','release-paid',1,'Paid batch',current_date+1,current_date+2,'Weekend sessions',10,750000,'upcoming','Dhaka',false,'{"class":"B","verified":false,"source":"pgTAP fixture"}');
SELECT ok(NOT has_table_privilege('authenticated','public.payment_receipts','SELECT') AND NOT has_table_privilege('anon','public.payment_receipts','SELECT'),'Browser cannot read private receipts');
SELECT ok(NOT has_table_privilege('service_role','public.payment_receipts','UPDATE') AND NOT has_table_privilege('service_role','public.payment_receipts','DELETE'),'Receipt snapshots immutable to service role');
SELECT ok(NOT has_function_privilege('authenticated','public.claim_confirmation_email(uuid,boolean)','EXECUTE'),'Browser cannot dispatch emails');
SELECT ok(NOT has_function_privilege('anon','public.save_staff_partner(uuid,text,timestamptz,text,text,text,integer,boolean,boolean)','EXECUTE'),'Browser cannot edit partners');
SET LOCAL ROLE service_role;
SELECT is((SELECT public.create_confirmed_staff_admission('e2800000-0000-4000-8000-000000000001',id,updated_at,'LNA-W5A0-0001','Receipt Fixture','receipt-fixture@example.invalid','01799002801','{}','[]','cash','cash',750000,0,'RECEIPT-TEST',NULL,false,true,true)->>'ok' FROM public.batches WHERE slug='release-paid'),'true','Paid staff confirmation succeeds');
SELECT is((SELECT r.snapshot->>'collected_poisha' FROM public.payment_receipts r JOIN public.enrollments e ON e.id=r.enrollment_id WHERE e.public_ref='LNA-W5A0-0001'),'750000','Receipt snapshots actual paid amount');
SELECT is((SELECT r.snapshot->>'receipt_number' FROM public.payment_receipts r JOIN public.enrollments e ON e.id=r.enrollment_id WHERE e.public_ref='LNA-W5A0-0001'),'LNA-R-W5A0-0001','Stable receipt number issued');
SELECT is((SELECT public.create_confirmed_staff_admission('e2800000-0000-4000-8000-000000000001',id,updated_at,'LNA-W5A0-0002','Waiver Fixture','waiver-28@example.invalid','01799002802','{}','[]','full_fee_waiver',NULL,750000,750000,'WAIVER-TEST','Approved',false,true,true)->>'ok' FROM public.batches WHERE slug='release-paid'),'true','Full waiver confirms');
SELECT is((SELECT count(*) FROM public.payment_receipts r JOIN public.enrollments e ON e.id=r.enrollment_id WHERE e.public_ref='LNA-W5A0-0002'),0::bigint,'Zero collections do not issue receipts');
SELECT is((SELECT public.claim_confirmation_email(o.id,false)->>'status' FROM public.email_outbox o JOIN public.enrollments e ON e.id=o.enrollment_id WHERE e.public_ref='LNA-W5A0-0001'),'claimed','First worker receives lease');
SELECT is((SELECT public.claim_confirmation_email(o.id,false)->>'status' FROM public.email_outbox o JOIN public.enrollments e ON e.id=o.enrollment_id WHERE e.public_ref='LNA-W5A0-0001'),'deferred','Concurrent email claim blocked');
SELECT ok((SELECT public.finish_confirmation_email(o.id,o.dispatch_token,'provider-fixture',NULL) FROM public.email_outbox o JOIN public.enrollments e ON e.id=o.enrollment_id WHERE e.public_ref='LNA-W5A0-0001'),'Lease owner finalizes provider acceptance');
SELECT is((SELECT public.claim_confirmation_email(o.id,false)->>'status' FROM public.email_outbox o JOIN public.enrollments e ON e.id=o.enrollment_id WHERE e.public_ref='LNA-W5A0-0001'),'sent','Accepted message is not dispatched twice');
SELECT is(public.save_staff_partner('e2800000-0000-4000-8000-000000000001',NULL,NULL,'Release fixture partner','Training',NULL,20,false,true),'OK','Admin creates hidden partner');
SELECT ok((SELECT count(*)=1 FROM public.website_partners WHERE name='Release fixture partner' AND NOT published),'Partner remains hidden until explicitly published');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
