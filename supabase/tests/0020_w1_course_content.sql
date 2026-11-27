BEGIN;
SELECT plan(56);
INSERT INTO auth.users (id, email) VALUES
  ('e2000000-0000-4000-8000-000000000001', 'w1-course-admin@example.invalid'),
  ('e2000000-0000-4000-8000-000000000002', 'w1-course-disabled@example.invalid');
INSERT INTO public.profiles (id, email, full_name, role, account_state) VALUES
  ('e2000000-0000-4000-8000-000000000001', 'w1-course-admin@example.invalid', 'Course Admin', 'admin', 'active'),
  ('e2000000-0000-4000-8000-000000000002', 'w1-course-disabled@example.invalid', 'Disabled Admin', 'admin', 'disabled');
INSERT INTO public.courses (id, slug, title, subtitle, category, summary, description, venue, status, provenance)
VALUES ('e2000000-0000-4000-8000-000000000003', 'w1-content-test', 'Course fixture', 'Course test subtitle', 'Training', 'Fixture course summary', 'Fixture description for course content tests', 'Dhaka', 'draft', '{"class":"B","verified":false,"source":"pgTAP fixture"}');
INSERT INTO public.mentors (id, slug, name, role, organization, bio, published, provenance) VALUES
  ('e2000000-0000-4000-8000-000000000004', 'w1-test-mentor', 'Fixture Mentor', 'Instructor', 'Fixture Org', 'Synthetic biography for course mentor tests.', false, '{"class":"B","verified":false,"source":"pgTAP fixture"}');
SELECT ok(NOT has_function_privilege('authenticated', 'public.set_staff_course_mentors(uuid,uuid,timestamptz,uuid[])', 'EXECUTE'), 'Browser cannot mutate course mentors');
SELECT ok(NOT has_function_privilege('authenticated', 'public.update_staff_course_content(uuid,uuid,timestamptz,jsonb)', 'EXECUTE'), 'Browser cannot mutate course content');
SELECT ok(NOT has_function_privilege('anon', 'public.get_staff_course_content(uuid,uuid)', 'EXECUTE'), 'Anonymous client cannot read staff RPC');
SET LOCAL ROLE service_role;
SELECT is(public.get_staff_course_content('e2000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000003')->>'slug', 'w1-content-test', 'Admin can load course editor');
SELECT throws_ok($sql$SELECT public.get_staff_course_content('e2000000-0000-4000-8000-000000000002','e2000000-0000-4000-8000-000000000003')$sql$, '42501', 'CATALOG_EDIT_FORBIDDEN', 'Inactive actor denied');
SELECT is((SELECT public.update_staff_course_content('e2000000-0000-4000-8000-000000000001', id, updated_at, '{}'::jsonb)->>'code' FROM public.courses WHERE slug='w1-content-test'), 'INVALID', 'Missing content fields rejected');
SELECT is((SELECT public.update_staff_course_content('e2000000-0000-4000-8000-000000000001', id, updated_at - interval '1 minute', '{"learning_outcomes":["Outcome one"],"target_audience":["Graduates"],"prerequisites":[],"modules":[],"featured":true}'::jsonb)->>'code' FROM public.courses WHERE slug='w1-content-test'), 'STALE', 'Stale update denied');
SELECT is((SELECT public.update_staff_course_content('e2000000-0000-4000-8000-000000000001', id, updated_at, '{"learning_outcomes":["Outcome one"],"target_audience":["Graduates"],"prerequisites":[],"modules":[{"id":"m1","title":"Module one","duration":"2 hours","topics":["Topic one"]}],"featured":true}'::jsonb)->>'ok' FROM public.courses WHERE slug='w1-content-test'), 'true', 'Admin can save structured content');
SELECT is((SELECT learning_outcomes FROM public.courses WHERE slug='w1-content-test'), '["Outcome one"]'::jsonb, 'Outcomes persisted');
SELECT ok((SELECT featured AND status='draft' AND modules->0->>'title'='Module one' FROM public.courses WHERE slug='w1-content-test'), 'Modules and featured flag saved without publishing draft');
SELECT is((SELECT count(*) FROM public.audit_events WHERE target_id='e2000000-0000-4000-8000-000000000003' AND actor_id='e2000000-0000-4000-8000-000000000001' AND actor_role='admin' AND action='catalog_course_content_edit'), 1::bigint, 'Only successful save creates authoritative audit');
SELECT throws_ok($sql$SELECT public.get_staff_course_mentors('e2000000-0000-4000-8000-000000000002','e2000000-0000-4000-8000-000000000003')$sql$, '42501', 'CATALOG_EDIT_FORBIDDEN', 'Disabled actor cannot load mentor roster');
SELECT is((SELECT public.set_staff_course_mentors('e2000000-0000-4000-8000-000000000001', id, updated_at - interval '1 minute', ARRAY['e2000000-0000-4000-8000-000000000004'::uuid]) FROM public.courses WHERE slug='w1-content-test'), 'STALE', 'Stale roster update denied');
SELECT is((SELECT public.set_staff_course_mentors('e2000000-0000-4000-8000-000000000001', id, updated_at, ARRAY['e2000000-0000-4000-8000-000000000099'::uuid]) FROM public.courses WHERE slug='w1-content-test'), 'INVALID', 'Unknown mentor rejected');
SELECT is((SELECT public.set_staff_course_mentors('e2000000-0000-4000-8000-000000000001', id, updated_at, ARRAY['e2000000-0000-4000-8000-000000000004'::uuid]) FROM public.courses WHERE slug='w1-content-test'), 'OK', 'Admin saves course mentor roster');
SELECT ok((SELECT count(*) = 1 FROM public.course_mentors WHERE course_id='e2000000-0000-4000-8000-000000000003' AND mentor_id='e2000000-0000-4000-8000-000000000004' AND display_order=0), 'Roster persisted');
SELECT is((SELECT count(*) FROM public.audit_events WHERE target_id='e2000000-0000-4000-8000-000000000003' AND action='staff_updated_course_mentors' AND actor_role='admin'), 1::bigint, 'Roster change audited');
RESET ROLE;
-- Intake controls: both public entry points and staff admission behavior.
UPDATE public.courses SET status='published', published_at=now() WHERE slug='w1-content-test';
INSERT INTO public.batches (id,course_id,slug,batch_number,name,start_date,end_date,schedule_description,capacity,fee_poisha,status,venue,enrollment_closes_at,provenance)
VALUES ('e2000000-0000-4000-8000-000000000005','e2000000-0000-4000-8000-000000000003','w1-intake-test',1,'Intake fixture',current_date+1,current_date+2,'Weekend sessions',10,500000,'upcoming','Dhaka',now()-interval '1 day','{"class":"B","verified":false,"source":"pgTAP intake fixture"}');
SELECT ok(NOT has_function_privilege('authenticated','public.set_staff_batch_intake(uuid,uuid,timestamptz,text,boolean,boolean)','EXECUTE'),'Browser cannot change intake');
SET LOCAL ROLE service_role;
SELECT throws_ok($sql$SELECT public.get_staff_batch_intake('e2000000-0000-4000-8000-000000000002','e2000000-0000-4000-8000-000000000005')$sql$,'42501','CATALOG_EDIT_FORBIDDEN','Disabled Admin denied intake access');
SELECT is((SELECT public.set_staff_batch_intake('e2000000-0000-4000-8000-000000000001',id,updated_at-interval '1 minute','upcoming',true,true) FROM public.batches WHERE slug='w1-intake-test'),'STALE','Stale intake changes denied');
SELECT is((SELECT public.set_staff_batch_intake('e2000000-0000-4000-8000-000000000001',id,updated_at,'upcoming',true,false) FROM public.batches WHERE slug='w1-intake-test'),'CONFIRM_OPEN','Public opening requires explicit acknowledgment');
SELECT is((SELECT public.set_staff_batch_intake('e2000000-0000-4000-8000-000000000001',id,updated_at,'upcoming',false,false) FROM public.batches WHERE slug='w1-intake-test'),'OK','Staff can save an independent Off switch');
SELECT ok((SELECT NOT public.batch_intake_allowed(b,false) AND public.batch_intake_allowed(b,true) FROM public.batches b WHERE slug='w1-intake-test'),'Public Off does not close staff intake');
SELECT is(public.start_enrollment('w1-content-test','w1-intake-test','LNA-W1A0-0001','Public Fixture','w1-public@example.invalid','01799000101','{}','[]')->>'code','BATCH_CLOSED','Hosted checkout intake honors Off');
SELECT is(public.submit_public_manual_enrollment('w1-content-test','w1-intake-test','LNA-W1A0-0002','Manual Fixture','w1-manual@example.invalid','01799000102','{}','[]','W1TEST0001')->>'code','BATCH_CLOSED','Public manual payment intake honors Off');
SELECT is((SELECT public.create_staff_enrollment('e2000000-0000-4000-8000-000000000001',id,updated_at,'LNA-W1A0-0003','Staff Fixture','w1-staff@example.invalid','01799000103','{}','[]')->>'ok' FROM public.batches WHERE slug='w1-intake-test'),'true','Staff admission succeeds with public Off');
SELECT is((SELECT public.set_staff_batch_intake('e2000000-0000-4000-8000-000000000001',id,updated_at,'in_progress',true,true) FROM public.batches WHERE slug='w1-intake-test'),'OK','Running batch can explicitly open');
SELECT ok((SELECT public.batch_intake_allowed(b,false) FROM public.batches b WHERE slug='w1-intake-test'),'Past legacy deadline does not override explicit On');
SELECT is(public.start_enrollment('w1-content-test','w1-intake-test','LNA-W1A0-0004','New Fixture','w1-new@example.invalid','01799000104','{}','[]')->>'ok','true','Hosted checkout intake accepts eligible running batch');
SELECT is((SELECT public.set_staff_batch_intake('e2000000-0000-4000-8000-000000000001',id,updated_at,'completed',true,false) FROM public.batches WHERE slug='w1-intake-test'),'OK','Staff can complete batch without editing dates');
SELECT ok((SELECT NOT public.batch_intake_allowed(b,false) AND NOT public.batch_intake_allowed(b,true) AND accept_applications FROM public.batches b WHERE slug='w1-intake-test'),'Completed stage blocks admissions independent of stored switch');
SELECT is((SELECT public.set_staff_batch_intake('e2000000-0000-4000-8000-000000000001',id,updated_at,'upcoming',true,false) FROM public.batches WHERE slug='w1-intake-test'),'CONFIRM_OPEN','Reversal cannot silently reopen intake');
SELECT ok((SELECT count(*) = 3 FROM public.audit_events WHERE target_id='e2000000-0000-4000-8000-000000000005' AND action='staff_updated_batch_intake' AND actor_role='admin'),'Only successful changed settings are audited');
RESET ROLE;
-- Unlimited capacity: no invented ceiling and fixed limit cannot undercut occupancy.
UPDATE public.batches SET status='upcoming', accept_applications=true, capacity=NULL,
  fee_poisha=0, historical_enrolled_count=100 WHERE slug='w1-intake-test';
SET LOCAL ROLE service_role;
SELECT ok((SELECT (public.get_staff_batch_intake('e2000000-0000-4000-8000-000000000001',id)->'remainingSeats') = 'null'::jsonb FROM public.batches WHERE slug='w1-intake-test'),'Unlimited intake reports no numeric remaining seats');
SELECT ok((SELECT (public.get_staff_batch_intake('e2000000-0000-4000-8000-000000000001',id)->>'publicEligible')::boolean FROM public.batches WHERE slug='w1-intake-test'),'Unlimited published batch remains eligible');
SELECT is(public.start_enrollment('w1-content-test','w1-intake-test','LNA-W1A0-0005','Unlimited Fixture','w1-unlimited@example.invalid','01799000105','{}','[]')->>'ok','true','Free public admission succeeds with unlimited capacity');
SELECT throws_ok($sql$SELECT public.update_admin_catalog_record('e2000000-0000-4000-8000-000000000001','batches',id,updated_at,jsonb_build_object('name',name,'start_date',start_date,'end_date',end_date,'schedule_description',schedule_description,'venue',venue,'capacity',1,'fee_poisha',fee_poisha,'discount_fee_poisha',discount_fee_poisha)) FROM public.batches WHERE slug='w1-intake-test'$sql$,'P0001','CATALOG_EDIT_CAPACITY','Cannot reduce unlimited batch below historical and active seats');
SELECT lives_ok($sql$SELECT public.update_admin_catalog_record('e2000000-0000-4000-8000-000000000001','batches',id,updated_at,jsonb_build_object('name',name,'start_date',start_date,'end_date',end_date,'schedule_description',schedule_description,'venue',venue,'capacity',1000,'fee_poisha',fee_poisha,'discount_fee_poisha',discount_fee_poisha)) FROM public.batches WHERE slug='w1-intake-test'$sql$,'Unlimited can be converted to a sufficient fixed limit');
SELECT is((SELECT capacity FROM public.batches WHERE slug='w1-intake-test'),1000,'Fixed limit persisted');
SELECT lives_ok($sql$SELECT public.update_admin_catalog_record('e2000000-0000-4000-8000-000000000001','batches',id,updated_at,jsonb_build_object('name',name,'start_date',start_date,'end_date',end_date,'schedule_description',schedule_description,'venue',venue,'capacity',NULL,'fee_poisha',fee_poisha,'discount_fee_poisha',discount_fee_poisha)) FROM public.batches WHERE slug='w1-intake-test'$sql$,'Fixed batch can become unlimited');
SELECT ok((SELECT capacity IS NULL FROM public.batches WHERE slug='w1-intake-test'),'Unlimited persisted as SQL NULL');
RESET ROLE;
-- W1-06 defaults, pricing, automatic numbering and draft deletion.
SELECT ok(NOT has_function_privilege('authenticated','public.delete_unused_batch_draft(uuid,uuid,timestamptz)','EXECUTE'),'Browser cannot delete drafts');
SELECT ok(NOT has_table_privilege('anon','public.course_batch_defaults','SELECT') AND NOT has_table_privilege('authenticated','public.course_batch_defaults','SELECT'),'Defaults are not exposed to the public');
SET LOCAL ROLE service_role;
SELECT is((SELECT public.set_staff_course_batch_defaults('e2000000-0000-4000-8000-000000000001',id,updated_at,'{"venue":"Dhaka","schedule_description":"Weekend sessions","capacity":null,"fee_poisha":"500000","discount_fee_poisha":"400000","start_date":"2099-01-01"}'::jsonb) FROM public.courses WHERE slug='w1-content-test'),'OK','Staff save batch defaults');
SELECT ok((SELECT defaults->>'fee_poisha'='500000' AND defaults->'capacity'='null'::jsonb AND NOT(defaults ? 'start_date') FROM public.course_batch_defaults WHERE course_id='e2000000-0000-4000-8000-000000000003'),'Defaults persist only configuration');
SELECT is((SELECT public.set_staff_course_batch_defaults('e2000000-0000-4000-8000-000000000001',c.id,c.updated_at-interval '1 minute',d.defaults) FROM public.courses c JOIN public.course_batch_defaults d ON d.course_id=c.id WHERE c.slug='w1-content-test'),'STALE','Stale defaults denied');
SELECT is((SELECT public.set_staff_course_batch_defaults('e2000000-0000-4000-8000-000000000001',c.id,c.updated_at,jsonb_set(d.defaults,'{discount_fee_poisha}','"999999"')) FROM public.courses c JOIN public.course_batch_defaults d ON d.course_id=c.id WHERE c.slug='w1-content-test'),'INVALID','Discount cannot exceed fee');
SELECT lives_ok($sql$SELECT public.create_admin_catalog_draft('e2000000-0000-4000-8000-000000000001','batches',jsonb_build_object('course_id','e2000000-0000-4000-8000-000000000003','batch_number',NULL,'name','Auto numbered free batch','start_date',current_date+10,'end_date',current_date+11,'schedule_description','Weekend sessions','venue','Dhaka','capacity',NULL,'fee_poisha','0','discount_fee_poisha',NULL,'pricing_mode','free'))$sql$,'Automatic batch number and explicit free fee');
SELECT ok((SELECT batch_number=2 AND status='draft' AND fee_poisha=0 FROM public.batches WHERE slug='w1-content-test-batch-2'),'Next batch number is assigned within course');
SELECT throws_ok($sql$SELECT public.create_admin_catalog_draft('e2000000-0000-4000-8000-000000000001','batches',jsonb_build_object('course_id','e2000000-0000-4000-8000-000000000003','batch_number',NULL,'name','Invalid paid batch','start_date',current_date+10,'end_date',current_date+11,'schedule_description','Weekend sessions','venue','Dhaka','capacity',NULL,'fee_poisha','0','discount_fee_poisha',NULL,'pricing_mode','paid'))$sql$,'22023','CATALOG_CREATE_INVALID_PRICING','Paid batch must have positive payable fee');
SELECT is((SELECT public.delete_unused_batch_draft('e2000000-0000-4000-8000-000000000001',id,updated_at-interval '1 minute') FROM public.batches WHERE slug='w1-content-test-batch-2'),'STALE','Stale draft deletion denied');
SELECT is((SELECT public.delete_unused_batch_draft('e2000000-0000-4000-8000-000000000001',id,updated_at) FROM public.batches WHERE slug='w1-intake-test'),'PROTECTED','Operational batch cannot be deleted');
INSERT INTO public.batch_mentors(batch_id,mentor_id,display_order)
SELECT id,'e2000000-0000-4000-8000-000000000004',0 FROM public.batches WHERE slug='w1-content-test-batch-2';
SELECT is((SELECT public.delete_unused_batch_draft('e2000000-0000-4000-8000-000000000001',id,updated_at) FROM public.batches WHERE slug='w1-content-test-batch-2'),'PROTECTED','Draft with linked mentor cannot be deleted');
DELETE FROM public.batch_mentors WHERE batch_id IN (SELECT id FROM public.batches WHERE slug='w1-content-test-batch-2');
SELECT is((SELECT public.delete_unused_batch_draft('e2000000-0000-4000-8000-000000000001',id,updated_at) FROM public.batches WHERE slug='w1-content-test-batch-2'),'OK','Unused draft can be deleted');
SELECT ok(NOT EXISTS (SELECT 1 FROM public.batches WHERE slug='w1-content-test-batch-2'),'Unused draft removed');
SELECT ok(EXISTS (SELECT 1 FROM public.audit_events WHERE action='staff_deleted_unused_batch_draft' AND before_state->>'slug'='w1-content-test-batch-2' AND actor_role='admin'),'Deletion preserves audit evidence');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
