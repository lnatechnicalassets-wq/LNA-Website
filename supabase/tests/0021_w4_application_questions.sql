BEGIN;
SELECT plan(15);
INSERT INTO auth.users (id,email) VALUES
 ('e2100000-0000-4000-8000-000000000001','w4-questions-admin@example.invalid'),
 ('e2100000-0000-4000-8000-000000000002','w4-questions-disabled@example.invalid');
INSERT INTO public.profiles(id,email,full_name,role,account_state) VALUES
 ('e2100000-0000-4000-8000-000000000001','w4-questions-admin@example.invalid','Questions Admin','admin','active'),
 ('e2100000-0000-4000-8000-000000000002','w4-questions-disabled@example.invalid','Disabled Admin','admin','disabled');
INSERT INTO public.courses(id,slug,title,subtitle,category,summary,description,venue,status,published_at,provenance)
VALUES('e2100000-0000-4000-8000-000000000003','w4-questions-test','Questions fixture','Course test subtitle','Training','Fixture summary','Fixture description for application questions','Dhaka','published',now(),'{"class":"B","verified":false,"source":"pgTAP fixture"}');
INSERT INTO public.batches(id,course_id,slug,batch_number,name,start_date,end_date,schedule_description,capacity,fee_poisha,status,venue,accept_applications,provenance)
VALUES('e2100000-0000-4000-8000-000000000004','e2100000-0000-4000-8000-000000000003','w4-questions-batch',1,'Questions batch',current_date+1,current_date+2,'Weekend sessions',NULL,0,'upcoming','Dhaka',true,'{"class":"B","verified":false,"source":"pgTAP fixture"}');
SELECT ok(NOT has_function_privilege('authenticated','public.set_staff_application_questions(uuid,uuid,integer,jsonb)','EXECUTE'),'Browser cannot edit questions');
SET LOCAL ROLE service_role;
SELECT throws_ok($sql$SELECT public.get_staff_application_questions('e2100000-0000-4000-8000-000000000002','e2100000-0000-4000-8000-000000000003')$sql$,'42501','CATALOG_EDIT_FORBIDDEN','Disabled actor denied');
SELECT is(public.get_staff_application_questions('e2100000-0000-4000-8000-000000000001','e2100000-0000-4000-8000-000000000003')->>'version','0','Legacy version starts at zero');
SELECT is(public.start_enrollment('w4-questions-test','w4-questions-batch','LNA-W2B0-0001','Legacy Student','w4-legacy@example.invalid','01799002101','{}','[]')->>'ok','true','Legacy application still works');
SELECT is((SELECT program_questions_version FROM public.enrollments WHERE public_ref='LNA-W2B0-0001'),0,'Legacy snapshot version captured');
SELECT is(public.set_staff_application_questions('e2100000-0000-4000-8000-000000000001','e2100000-0000-4000-8000-000000000003',0,'[{"id":"email","label":"Unsafe","type":"text","required":true}]'),'INVALID','Reserved question ID rejected');
SELECT is(public.set_staff_application_questions('e2100000-0000-4000-8000-000000000001','e2100000-0000-4000-8000-000000000003',0,'[{"id":"university","label":"University","type":"text","required":true}]'),'OK','Admin saves questions');
SELECT is(public.set_staff_application_questions('e2100000-0000-4000-8000-000000000001','e2100000-0000-4000-8000-000000000003',0,'[]'),'STALE','Stale editor version rejected');
SELECT throws_ok($sql$SELECT public.start_enrollment('w4-questions-test','w4-questions-batch','LNA-W2B0-0002','Stale Student','w4-stale@example.invalid','01799002102','{}','[]')$sql$,'P0001','STALE_APPLICATION_QUESTIONS','Old snapshot cannot be inserted');
SELECT throws_ok($sql$SELECT public.start_enrollment('w4-questions-test','w4-questions-batch','LNA-W2B0-0003','Missing Student','w4-missing@example.invalid','01799002103','{}','[{"id":"university","label":"University","type":"text","required":true}]')$sql$,'P0001','INVALID_APPLICATION_ANSWERS','Required answer enforced at database boundary');
SELECT is(public.start_enrollment('w4-questions-test','w4-questions-batch','LNA-W2B0-0004','New Student','w4-new@example.invalid','01799002104','{"university":"DU"}','[{"id":"university","label":"University","type":"text","required":true}]')->>'ok','true','Current public question set accepted');
SELECT is((SELECT program_questions_version FROM public.enrollments WHERE public_ref='LNA-W2B0-0004'),1,'New application stores configured version');
SELECT is(public.set_staff_application_questions('e2100000-0000-4000-8000-000000000001','e2100000-0000-4000-8000-000000000003',1,'[]'),'OK','Explicit empty question set allowed');
SELECT ok((SELECT program_questions_snapshot->0->>'label'='University' AND program_questions_version=1 FROM public.enrollments WHERE public_ref='LNA-W2B0-0004'),'Old application retains original snapshot after edit');
SELECT is((SELECT count(*) FROM public.audit_events WHERE target_id='e2100000-0000-4000-8000-000000000003' AND action='staff_updated_application_questions'),2::bigint,'Only successful edits audited');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
