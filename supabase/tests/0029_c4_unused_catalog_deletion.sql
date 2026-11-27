BEGIN;
SELECT plan(13);
INSERT INTO auth.users(id,email) VALUES('e2900000-0000-4000-8000-000000000001','c4-admin@example.invalid');
INSERT INTO public.profiles(id,email,full_name,role,account_state) VALUES('e2900000-0000-4000-8000-000000000001','c4-admin@example.invalid','C4 Admin','admin','active');
INSERT INTO public.courses(id,slug,title,subtitle,category,summary,description,venue,status,provenance)
VALUES('e2900000-0000-4000-8000-000000000002','c4-delete-course','Deletion fixture','Course test subtitle','Training','Fixture summary','Fixture description for catalog deletion','Dhaka','draft','{"class":"B","verified":false,"source":"pgTAP fixture"}');
INSERT INTO public.batches(id,course_id,slug,batch_number,name,start_date,end_date,schedule_description,capacity,fee_poisha,status,venue,accept_applications,provenance)
VALUES('e2900000-0000-4000-8000-000000000003','e2900000-0000-4000-8000-000000000002','c4-delete-batch',1,'Unused batch',current_date+1,current_date+2,'Weekend sessions',10,10000,'upcoming','Dhaka',false,'{"class":"B","verified":false,"source":"pgTAP fixture"}'),
('e2900000-0000-4000-8000-000000000004','e2900000-0000-4000-8000-000000000002','c4-used-batch',2,'Used batch',current_date-10,current_date-1,'Weekend sessions',10,10000,'completed','Dhaka',false,'{"class":"B","verified":false,"source":"pgTAP fixture"}');
INSERT INTO public.courses(id,slug,title,subtitle,category,summary,description,venue,status,published_at,provenance)
VALUES('e2900000-0000-4000-8000-000000000005','c4-protected-course','Protected fixture','Course test subtitle','Training','Fixture summary','Fixture description for protected enrollment','Dhaka','published',now(),'{"class":"B","verified":false,"source":"pgTAP fixture"}');
INSERT INTO public.batches(id,course_id,slug,batch_number,name,start_date,end_date,schedule_description,capacity,fee_poisha,status,venue,accept_applications,provenance)
VALUES('e2900000-0000-4000-8000-000000000006','e2900000-0000-4000-8000-000000000005','c4-protected-paid',1,'Protected batch',current_date+1,current_date+2,'Weekend sessions',10,750000,'upcoming','Dhaka',false,'{"class":"B","verified":false,"source":"pgTAP fixture"}'),
('e2900000-0000-4000-8000-000000000007','e2900000-0000-4000-8000-000000000005','c4-open-batch',2,'Open batch',current_date+1,current_date+2,'Weekend sessions',10,750000,'upcoming','Dhaka',true,'{"class":"B","verified":false,"source":"pgTAP fixture"}');
INSERT INTO public.batch_mentors(batch_id,mentor_id,display_order)
SELECT 'e2900000-0000-4000-8000-000000000003',id,0 FROM public.mentors LIMIT 1;
SELECT ok(NOT has_function_privilege('anon','public.delete_unused_catalog_record(uuid,text,uuid,timestamptz)','EXECUTE'),'Anonymous cannot delete');
SELECT ok(NOT has_function_privilege('authenticated','public.delete_unused_catalog_record(uuid,text,uuid,timestamptz)','EXECUTE'),'Browser users cannot delete');
SET LOCAL ROLE service_role;
SELECT is((SELECT public.create_confirmed_staff_admission('e2900000-0000-4000-8000-000000000001',id,updated_at,'LNA-C4F0-0001','C4 Fixture','c4-paid@example.invalid','01799002901','{}','[]','cash','cash',750000,0,'C4-RECEIPT',NULL,false,true,false)->>'ok' FROM public.batches WHERE slug='c4-protected-paid'),'true','Paid fixture created');
SELECT is((SELECT public.delete_unused_catalog_record('e2900000-0000-4000-8000-000000000001','batches',id,updated_at) FROM public.batches WHERE slug='c4-protected-paid'),'PROTECTED','Batch with payment and admission cannot be deleted');
SELECT is((SELECT public.delete_unused_catalog_record('e2900000-0000-4000-8000-000000000001','batches',id,updated_at) FROM public.batches WHERE slug='c4-open-batch'),'PROTECTED','Open intake cannot be deleted');
SELECT is((SELECT public.delete_unused_catalog_record('e2900000-0000-4000-8000-000000000001','courses',id,updated_at) FROM public.courses WHERE slug='c4-delete-course'),'PROTECTED','Course with batches is protected');
SELECT is((SELECT public.delete_unused_catalog_record('e2900000-0000-4000-8000-000000000001','batches',id,updated_at-interval '1 second') FROM public.batches WHERE slug='c4-delete-batch'),'STALE','Stale deletion rejected');
SELECT is((SELECT public.delete_unused_catalog_record('e2900000-0000-4000-8000-000000000001','batches',id,updated_at) FROM public.batches WHERE slug='c4-used-batch'),'PROTECTED','Completed batch is protected');
SELECT is((SELECT public.delete_unused_catalog_record('e2900000-0000-4000-8000-000000000001','batches',id,updated_at) FROM public.batches WHERE slug='c4-delete-batch'),'OK','Unused closed upcoming batch can be deleted');
SELECT is((SELECT count(*) FROM public.batches WHERE slug='c4-delete-batch'),0::bigint,'Unused batch gone');
SELECT is((SELECT count(*) FROM public.audit_events WHERE action='staff_deleted_unused_catalog' AND target_id='e2900000-0000-4000-8000-000000000003'),1::bigint,'Deletion audit preserved');
RESET ROLE;
DELETE FROM public.batches WHERE slug='c4-used-batch'; -- isolated fixture only, no history
SET LOCAL ROLE service_role;
SELECT is((SELECT public.delete_unused_catalog_record('e2900000-0000-4000-8000-000000000001','courses',id,updated_at) FROM public.courses WHERE slug='c4-delete-course'),'OK','Unused draft course can be deleted');
SELECT is((SELECT count(*) FROM public.courses WHERE slug='c4-delete-course'),0::bigint,'Course gone');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
