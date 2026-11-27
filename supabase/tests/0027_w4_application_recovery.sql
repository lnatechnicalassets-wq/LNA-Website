BEGIN;
SELECT plan(26);
INSERT INTO auth.users(id,email) VALUES('e2700000-0000-4000-8000-000000000001','recovery-admin@example.invalid');
INSERT INTO public.profiles(id,email,full_name,role,account_state) VALUES('e2700000-0000-4000-8000-000000000001','recovery-admin@example.invalid','Recovery Admin','admin','active');
INSERT INTO public.courses(id,slug,title,subtitle,category,summary,description,venue,status,published_at,provenance)
VALUES('e2700000-0000-4000-8000-000000000003','recovery-fixture','Recovery course','Fixture course subtitle','Training','Fixture course summary','Fixture description for recovery tests','Dhaka','published',now(),'{"class":"B","verified":false,"source":"pgTAP fixture"}');
INSERT INTO public.batches(id,course_id,slug,batch_number,name,start_date,end_date,schedule_description,capacity,fee_poisha,status,venue,accept_applications,provenance) VALUES
('e2700000-0000-4000-8000-000000000004','e2700000-0000-4000-8000-000000000003','recovery-one',1,'First batch',current_date+1,current_date+2,'Weekend sessions',10,0,'upcoming','Dhaka',true,'{"class":"B","verified":false,"source":"pgTAP fixture"}'),
('e2700000-0000-4000-8000-000000000005','e2700000-0000-4000-8000-000000000003','recovery-two',2,'Second batch',current_date+5,current_date+6,'Weekend sessions',10,0,'upcoming','Dhaka',true,'{"class":"B","verified":false,"source":"pgTAP fixture"}');
INSERT INTO public.enrollments(id,public_ref,course_id,batch_id,full_name,email,phone,payment_method,payment_status,base_fee_poisha,payable_poisha,status) VALUES
('e2700000-0000-4000-8000-000000000006','LNA-W4R0-0001','e2700000-0000-4000-8000-000000000003','e2700000-0000-4000-8000-000000000004','Recovery Fixture','recover@example.invalid','01799002701','free','not_required',0,0,'application_in_process'),
('e2700000-0000-4000-8000-000000000007','LNA-W4R0-0002','e2700000-0000-4000-8000-000000000003','e2700000-0000-4000-8000-000000000005','Recovery Fixture','recover@example.invalid','01799002701','free','not_required',0,0,'application_in_process'),
('e2700000-0000-4000-8000-000000000008','LNA-W4R0-0003','e2700000-0000-4000-8000-000000000003','e2700000-0000-4000-8000-000000000004','Other Fixture','other@example.invalid','01799002702','free','not_required',0,0,'application_in_process');
SELECT ok(NOT has_table_privilege('anon','public.application_recovery_requests','SELECT'),'Recovery data is not publicly readable');
SELECT ok(NOT has_function_privilege('authenticated','public.issue_application_recovery(text,text,text,text)','EXECUTE'),'Browser cannot issue recovery tokens');
SELECT ok(NOT has_function_privilege('anon','public.redeem_application_recovery(text)','EXECUTE'),'Browser cannot redeem DB tokens directly');
SET LOCAL ROLE service_role;
SELECT is(public.issue_application_recovery('absent@example.invalid',repeat('f',24),NULL,repeat('f',64)),false,'Unknown addresses issue no token');
SELECT is(public.issue_application_recovery('recover@example.invalid',repeat('a',24),NULL,repeat('a',64)),true,'Email-only recovery covers matching records');
SELECT is(public.issue_application_recovery('recover@example.invalid',repeat('a',24),NULL,repeat('b',64)),false,'Database cooldown blocks another email');
SELECT is(jsonb_array_length(public.redeem_application_recovery(repeat('a',64))->'applications'),2,'Redeems both matching records');
SELECT is(public.redeem_application_recovery(repeat('a',64)),NULL::jsonb,'Consumed token cannot be replayed');
SELECT is(public.redeem_application_recovery(repeat('b',64)),NULL::jsonb,'Unknown token invalid');
SELECT is(public.issue_application_recovery('other@example.invalid',repeat('c',24),'LNA-W4R0-0001',repeat('c',64)),false,'Reference cannot be used with wrong email');
SELECT is(public.issue_application_recovery('other@example.invalid',repeat('c',24),'LNA-W4R0-0003',repeat('c',64)),true,'Matching reference issues a token');
SELECT is((SELECT public.correct_staff_admission_contact('e2700000-0000-4000-8000-000000000001',id,updated_at,full_name,'fixed@example.invalid',phone,'Verified applicant correction',false) FROM public.enrollments WHERE public_ref='LNA-W4R0-0003'),'INVALID','Attestation is mandatory');
SELECT is((SELECT public.correct_staff_admission_contact('e2700000-0000-4000-8000-000000000001',id,updated_at,full_name,'recover@example.invalid',phone,'Verified applicant correction',true) FROM public.enrollments WHERE public_ref='LNA-W4R0-0003'),'DUPLICATE','Existing email in same batch is protected');
SELECT is((SELECT public.correct_staff_admission_contact('e2700000-0000-4000-8000-000000000001',id,updated_at,full_name,'fixed@example.invalid',phone,'Verified applicant correction',true) FROM public.enrollments WHERE public_ref='LNA-W4R0-0003'),'OK','Contact correction succeeds');
SELECT is(jsonb_array_length(public.redeem_application_recovery(repeat('c',64))->'applications'),0,'Old contact token revoked');
SELECT ok((SELECT count(*)=1 FROM public.audit_events WHERE action='staff_corrected_admission_contact' AND target_id='e2700000-0000-4000-8000-000000000008' AND before_state->>'email'='other@example.invalid' AND after_state->>'email'='fixed@example.invalid'),'Contact correction audited');
SELECT is(public.issue_application_recovery('fixed@example.invalid',repeat('d',24),NULL,repeat('d',64)),true,'Corrected email can recover');
UPDATE public.application_recovery_requests SET expires_at=now()-interval '1 second' WHERE token_hash=repeat('d',64);
SELECT is(public.redeem_application_recovery(repeat('d',64)),NULL::jsonb,'Expired tokens cannot be redeemed');
-- A linked student profile controls recovery; the old enrollment email remains historical.
INSERT INTO public.enrollments(id,public_ref,course_id,batch_id,full_name,email,phone,payment_method,payment_status,base_fee_poisha,payable_poisha,status,confirmed_at)
VALUES('e2700000-0000-4000-8000-000000000009','LNA-W4R0-0004','e2700000-0000-4000-8000-000000000003','e2700000-0000-4000-8000-000000000005','Linked Fixture','linked@example.invalid','01799002703','free','not_required',0,0,'confirmed',now());
SELECT is(public.issue_application_recovery('linked@example.invalid',repeat('e',24),NULL,repeat('e',64)),true,'Linked student email can recover');
SELECT is((SELECT public.correct_staff_student_profile('e2700000-0000-4000-8000-000000000001',id,updated_at,full_name,'new-linked@example.invalid',phone,university,'Verified student contact correction',false) FROM public.students WHERE email='linked@example.invalid'),'INVALID','Profile correction needs attestation');
SELECT is((SELECT public.correct_staff_student_profile('e2700000-0000-4000-8000-000000000001',id,updated_at,full_name,'new-linked@example.invalid',phone,university,'Verified student contact correction',true) FROM public.students WHERE email='linked@example.invalid'),'OK','Profile correction audited and saved');
SELECT is(jsonb_array_length(public.redeem_application_recovery(repeat('e',64))->'applications'),0,'Canonical correction invalidates older links immediately');
SELECT is(public.issue_application_recovery('linked@example.invalid',repeat('1',24),NULL,repeat('1',64)),false,'Old historical email cannot recover linked record');
SELECT is(public.issue_application_recovery('new-linked@example.invalid',repeat('2',24),NULL,repeat('2',64)),true,'New canonical email recovers linked record');
SELECT is(public.redeem_application_recovery(repeat('2',64))->'applications'->0->>'reference','LNA-W4R0-0004','Recovered reference remains unchanged');
SELECT ok((SELECT email='linked@example.invalid' AND payment_status='not_required' FROM public.enrollments WHERE public_ref='LNA-W4R0-0004'),'Existing admission and payment snapshot preserved');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
