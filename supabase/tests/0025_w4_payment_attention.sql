BEGIN;
SELECT plan(15);
INSERT INTO auth.users(id,email) VALUES
 ('e2500000-0000-4000-8000-000000000001','attention-admin@example.invalid'),
 ('e2500000-0000-4000-8000-000000000002','attention-disabled@example.invalid');
INSERT INTO public.profiles(id,email,full_name,role,account_state) VALUES
 ('e2500000-0000-4000-8000-000000000001','attention-admin@example.invalid','Attention Admin','admin','active'),
 ('e2500000-0000-4000-8000-000000000002','attention-disabled@example.invalid','Disabled Admin','admin','disabled');
INSERT INTO public.courses(id,slug,title,subtitle,category,summary,description,venue,status,published_at,provenance)
VALUES('e2500000-0000-4000-8000-000000000003','attention-course','Attention fixture','Course test subtitle','Training','Fixture summary','Fixture description for payment review','Dhaka','published',now(),'{"class":"B","verified":false,"source":"pgTAP fixture"}');
INSERT INTO public.batches(id,course_id,slug,batch_number,name,start_date,end_date,schedule_description,capacity,fee_poisha,status,venue,accept_applications,provenance)
VALUES('e2500000-0000-4000-8000-000000000004','e2500000-0000-4000-8000-000000000003','attention-batch',1,'Paid fixture',current_date+1,current_date+2,'Weekend sessions',10,750000,'upcoming','Dhaka',true,'{"class":"B","verified":false,"source":"pgTAP fixture"}');
SELECT ok(NOT has_table_privilege('authenticated','public.staff_payment_attention_items','SELECT') AND NOT has_function_privilege('anon','public.list_staff_payment_attention(uuid,boolean,integer)','EXECUTE'),'Payment queue is not exposed to browsers');
SET LOCAL ROLE service_role;
SELECT throws_ok($$SELECT public.list_staff_payment_attention('e2500000-0000-4000-8000-000000000002',false,1)$$,'42501','PAYMENT_ATTENTION_FORBIDDEN','Disabled staff denied');
SELECT is(public.start_checked_public_enrollment('attention-course','attention-batch','LNA-W5A0-0001','Attention Fixture','attention-student@example.invalid','01799002501','{}','[]',NULL,750000,'hosted')->>'ok','true','Creates a hosted attempt');
RESET ROLE;
UPDATE public.enrollments SET status='cancelled' WHERE public_ref='LNA-W5A0-0001';
SET LOCAL ROLE service_role;
SELECT is((SELECT public.confirm_payment(pa.id,'PAY-ATTENTION-1','TRX-ATTENTION-1',750000,'BDT','0000','Late receipt')->>'reason' FROM public.payment_attempts pa JOIN public.enrollments e ON e.id=pa.enrollment_id WHERE e.public_ref='LNA-W5A0-0001'),'ENROLLMENT_INELIGIBLE','Late cancelled receipt retained');
SELECT ok((SELECT count(*)=1 FROM public.staff_payment_attention_items WHERE public_ref='LNA-W5A0-0001' AND kind='gateway_review' AND NOT reviewed),'Cancelled admission appears in needs attention');
SELECT is((SELECT public.mark_staff_payment_reviewed('e2500000-0000-4000-8000-000000000001',attempt_id,evidence_key,' ') FROM public.staff_payment_attention_items WHERE public_ref='LNA-W5A0-0001'),'INVALID','Empty note denied');
SELECT is((SELECT public.mark_staff_payment_reviewed('e2500000-0000-4000-8000-000000000001',attempt_id,'stale','Checked') FROM public.staff_payment_attention_items WHERE public_ref='LNA-W5A0-0001'),'STALE','Changed evidence cannot be reviewed blindly');
SELECT is((SELECT public.mark_staff_payment_reviewed('e2500000-0000-4000-8000-000000000001',attempt_id,evidence_key,'Checked with finance') FROM public.staff_payment_attention_items WHERE public_ref='LNA-W5A0-0001'),'OK','Staff may record a review note');
SELECT ok((SELECT reviewed AND enrollment_status='cancelled' AND attempt_status='review_hold' FROM public.staff_payment_attention_items WHERE public_ref='LNA-W5A0-0001'),'Reviewed retains cancelled admission and payment hold');
RESET ROLE;
ALTER TABLE public.payment_attempts DISABLE TRIGGER trg_payment_attempts_set_updated_at;
UPDATE public.payment_attempts SET updated_at=now()-interval '2 minutes' WHERE trx_id='TRX-ATTENTION-1';
ALTER TABLE public.payment_attempts ENABLE TRIGGER trg_payment_attempts_set_updated_at;
SET LOCAL ROLE service_role;
SELECT ok((SELECT public.claim_staff_payment_recheck('e2500000-0000-4000-8000-000000000001',id,'e2500000-0000-4000-8000-000000000010') IS NOT NULL FROM public.payment_attempts WHERE trx_id='TRX-ATTENTION-1'),'Staff obtains a query lease for a held payment');
SELECT is((SELECT public.finish_staff_payment_recheck('e2500000-0000-4000-8000-000000000001',id,'e2500000-0000-4000-8000-000000000011','{}')->>'status' FROM public.payment_attempts WHERE trx_id='TRX-ATTENTION-1'),'lease_lost','Wrong lease owner cannot record a result');
SELECT is((SELECT public.finish_staff_payment_recheck('e2500000-0000-4000-8000-000000000001',id,'e2500000-0000-4000-8000-000000000010',jsonb_build_object('payment_id',payment_id,'invoice',tran_id,'trx_id',trx_id,'amount_poisha','750000','currency','BDT','transaction_status','Completed','status_code','0000'))->>'status' FROM public.payment_attempts WHERE trx_id='TRX-ATTENTION-1'),'review_hold','Query of held receipt does not force confirmation');
SELECT ok((SELECT NOT reviewed AND last_check->>'transaction_status'='Completed' AND enrollment_status='cancelled' FROM public.staff_payment_attention_items WHERE public_ref='LNA-W5A0-0001'),'New query evidence returns case to active review');
SELECT is((SELECT count(*) FROM public.payment_events pe JOIN public.payment_attempts pa ON pa.id=pe.payment_attempt_id WHERE pa.trx_id='TRX-ATTENTION-1' AND pe.source='query_status'),1::bigint,'Query evidence appended exactly once');
SELECT is((SELECT count(*) FROM public.audit_events ae JOIN public.payment_attempts pa ON ae.target_id=pa.id::text WHERE pa.trx_id='TRX-ATTENTION-1' AND ae.actor_id='e2500000-0000-4000-8000-000000000001' AND ae.action IN ('staff_reviewed_payment_exception','staff_rechecked_payment')),2::bigint,'Both review and recheck attributed to verified staff');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
