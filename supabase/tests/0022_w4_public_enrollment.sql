BEGIN;
SELECT plan(13);
INSERT INTO public.courses(id,slug,title,subtitle,category,summary,description,venue,status,published_at,provenance)
VALUES('e2200000-0000-4000-8000-000000000001','w4-public-test','Public fixture','Course test subtitle','Training','Fixture summary','Fixture description for public enrollment','Dhaka','published',now(),' {"class":"B","verified":false,"source":"pgTAP fixture"}');
INSERT INTO public.batches(id,course_id,slug,batch_number,name,start_date,end_date,schedule_description,capacity,fee_poisha,status,venue,accept_applications,provenance)
VALUES
 ('e2200000-0000-4000-8000-000000000002','e2200000-0000-4000-8000-000000000001','w4-public-free',1,'Free batch',current_date+1,current_date+2,'Weekend sessions',NULL,0,'upcoming','Dhaka',true,'{"class":"B","verified":false,"source":"pgTAP fixture"}'),
 ('e2200000-0000-4000-8000-000000000003','e2200000-0000-4000-8000-000000000001','w4-public-paid',2,'Paid batch',current_date+1,current_date+2,'Weekend sessions',10,750000,'upcoming','Dhaka',true,'{"class":"B","verified":false,"source":"pgTAP fixture"}');
SELECT ok(NOT has_function_privilege('anon','public.start_checked_public_enrollment(text,text,text,text,text,text,jsonb,jsonb,text,bigint,text)','EXECUTE') AND NOT has_function_privilege('authenticated','public.start_checked_public_enrollment(text,text,text,text,text,text,jsonb,jsonb,text,bigint,text)','EXECUTE'),'Browser cannot bypass server submission boundary');
SET LOCAL ROLE service_role;
SELECT is(public.start_checked_public_enrollment('w4-public-test','w4-public-paid','LNA-W4F0-0001','Fee Fixture','w4-fee@example.invalid','01799002201','{}','[]',NULL,500000,'hosted')->>'code','FEE_CHANGED','Changed fee is rejected before checkout');
SELECT is(public.start_checked_public_enrollment('w4-public-test','w4-public-paid','LNA-W4F0-0002','Free Claim','w4-claim@example.invalid','01799002202','{}','[]',NULL,0,'free')->>'code','FEE_CHANGED','Paid batch cannot bypass checkout using zero');
SELECT is((SELECT count(*) FROM public.enrollments WHERE course_id='e2200000-0000-4000-8000-000000000001'),0::bigint,'Rejected price claims have no enrollment side effect');
SELECT is(public.start_checked_public_enrollment('w4-public-test','w4-public-free','LNA-W4F0-0003','Free Fixture','w4-free@example.invalid','01799002203','{}','[]',NULL,0,'free')->>'status','confirmed','Free application confirms directly');
SELECT ok((SELECT payment_method='free' AND payable_poisha=0 AND policy_accepted_at IS NOT NULL FROM public.enrollments WHERE public_ref='LNA-W4F0-0003'),'Free registration records acceptance and no collection');
SELECT is((SELECT count(*) FROM public.payment_attempts pa JOIN public.enrollments e ON e.id=pa.enrollment_id WHERE e.public_ref='LNA-W4F0-0003'),0::bigint,'Free registration creates no payment attempts');
SELECT is(public.start_checked_public_enrollment('w4-public-test','w4-public-paid','LNA-W4F0-0004','Paid Fixture','w4-paid@example.invalid','01799002204','{}','[]',NULL,750000,'hosted')->>'ok','true','Confirmed price starts hosted reservation');
SELECT ok((SELECT payable_poisha=750000 AND policy_accepted_at IS NOT NULL FROM public.enrollments WHERE public_ref='LNA-W4F0-0004'),'Paid reservation saves agreed price and acceptance');
SELECT is(public.start_checked_public_enrollment('w4-public-test','w4-public-paid','LNA-W4F0-0005','Different Name','w4-paid@example.invalid','01799002205','{}','[]',NULL,750000,'hosted')->>'code','DUPLICATE_ENROLLMENT','Fresh submission cannot reuse existing email hold');
SELECT is(public.start_checked_public_enrollment('w4-public-test','w4-public-paid','LNA-W4F0-0006','Different Name','w4-other@example.invalid','01799002204','{}','[]',NULL,750000,'hosted')->>'code','DUPLICATE_ENROLLMENT','Fresh submission cannot reuse existing phone hold');
SELECT is((SELECT count(*) FROM public.payment_attempts pa JOIN public.enrollments e ON e.id=pa.enrollment_id WHERE e.public_ref='LNA-W4F0-0004'),1::bigint,'Duplicate requests do not create another attempt');
RESET ROLE;
UPDATE public.batches SET accept_applications=false WHERE slug='w4-public-free';
SET LOCAL ROLE service_role;
SELECT is(public.start_checked_public_enrollment('w4-public-test','w4-public-free','LNA-W4F0-0007','Closed Fixture','w4-closed@example.invalid','01799002207','{}','[]',NULL,0,'free')->>'code','BATCH_CLOSED','Free registration still obeys batch intake switch');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
