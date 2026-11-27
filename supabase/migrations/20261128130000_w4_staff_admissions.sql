-- W4 staff admission: record a staff-attested collection or waiver, never a fabricated gateway attempt.
BEGIN;
ALTER TABLE public.enrollments ADD COLUMN staff_payment_details jsonb;
ALTER TABLE public.enrollments
  DROP CONSTRAINT enrollments_payment_method_valid,
  ADD CONSTRAINT enrollments_payment_method_valid CHECK (payment_method IN ('bkash','bank_transfer','cash','free','full_fee_waiver')),
  DROP CONSTRAINT enrollments_payment_amount_consistency,
  ADD CONSTRAINT enrollments_payment_amount_consistency CHECK (
    (payment_method IN ('free','full_fee_waiver') AND payable_poisha=0)
    OR (payment_method IN ('bkash','bank_transfer','cash') AND payable_poisha>0)),
  DROP CONSTRAINT enrollments_free_payment_status_consistency,
  ADD CONSTRAINT enrollments_free_payment_status_consistency CHECK (
    payment_method NOT IN ('free','full_fee_waiver') OR payment_status='not_required'),
  DROP CONSTRAINT enrollments_submitted_payment_ref_len,
  ADD CONSTRAINT enrollments_submitted_payment_ref_len CHECK (
    submitted_payment_ref IS NULL OR char_length(trim(submitted_payment_ref)) BETWEEN
      CASE WHEN staff_payment_details IS NULL THEN 4 ELSE 1 END AND 128),
  ADD CONSTRAINT enrollments_staff_collection_shape CHECK (
    (staff_payment_details IS NULL AND payment_method NOT IN ('cash','full_fee_waiver')) OR
    (staff_payment_details IS NOT NULL AND jsonb_typeof(staff_payment_details)='object'
      AND (staff_payment_details->>'collected_poisha')::bigint IS NOT DISTINCT FROM payable_poisha
      AND (staff_payment_details->>'adjusted_poisha')::bigint IS NOT DISTINCT FROM base_fee_poisha
      AND (staff_payment_details->>'waiver_poisha')::bigint IS NOT DISTINCT FROM discount_amount_poisha
      AND coalesce(staff_payment_details->>'kind','') IN ('free','cash','bkash','bank_transfer','full_fee_waiver','partial_fee_waiver')));
-- Preserve strict bKash uniqueness and legacy bank uniqueness; new bank/cash receipts
-- may repeat only with explicit acknowledgement in the staff RPC.
DROP INDEX public.idx_enrollments_verified_payment_ref;
CREATE UNIQUE INDEX idx_enrollments_verified_payment_ref ON public.enrollments(payment_method,upper(trim(submitted_payment_ref)))
  WHERE payment_status='verified' AND submitted_payment_ref IS NOT NULL
    AND (payment_method='bkash' OR (payment_method='bank_transfer' AND staff_payment_details IS NULL));

CREATE FUNCTION public.create_confirmed_staff_admission(
  p_actor_id uuid,p_batch_id uuid,p_expected_updated_at timestamptz,p_public_ref text,
  p_full_name text,p_email text,p_phone text,p_answers jsonb,p_program_questions_snapshot jsonb,
  p_kind text,p_channel text,p_adjusted_poisha bigint,p_waiver_poisha bigint,p_payment_ref text,
  p_waiver_reason text,p_reuse_ack boolean,p_attested boolean,p_notify boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE
  v_role text; v_batch public.batches%ROWTYPE; v_course public.courses%ROWTYPE;
  v_email text:=lower(btrim(p_email)); v_ref text:=nullif(upper(btrim(p_payment_ref)),'');
  v_reason text:=nullif(btrim(p_waiver_reason),''); v_original bigint; v_adjusted bigint;
  v_waiver bigint; v_collected bigint; v_method text; v_id uuid; v_existing uuid;
  v_student uuid; v_outbox uuid; v_details jsonb; v_duplicate_ref boolean:=false;
BEGIN
  v_role:=public.require_staff_actor(p_actor_id,ARRAY['admin','super_admin'],'STAFF_ENROLLMENT_FORBIDDEN');
  IF char_length(btrim(coalesce(p_full_name,''))) NOT BETWEEN 2 AND 120
    OR char_length(coalesce(v_email,'')) NOT BETWEEN 5 AND 160
    OR coalesce(v_email,'') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    OR coalesce(p_phone,'') !~ '^01[3-9][0-9]{8}$'
    OR coalesce(p_public_ref,'') !~ '^LNA-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$'
    OR jsonb_typeof(p_answers) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_program_questions_snapshot) IS DISTINCT FROM 'array'
    OR p_kind IS NULL OR p_kind NOT IN ('free','cash','bkash','bank_transfer','full_fee_waiver','partial_fee_waiver')
    OR p_notify IS NULL THEN
    RETURN jsonb_build_object('ok',false,'code','INVALID_ADMISSION');
  END IF;
  SELECT * INTO v_batch FROM public.batches WHERE id=p_batch_id FOR UPDATE;
  IF NOT FOUND OR v_batch.archived_at IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'code','BATCH_NOT_FOUND'); END IF;
  SELECT * INTO v_course FROM public.courses WHERE id=v_batch.course_id FOR SHARE;
  IF v_course.status<>'published' OR v_course.archived_at IS NOT NULL OR NOT public.batch_intake_allowed(v_batch,true) THEN
    RETURN jsonb_build_object('ok',false,'code','BATCH_CLOSED');
  END IF;
  IF v_batch.updated_at IS DISTINCT FROM p_expected_updated_at THEN RETURN jsonb_build_object('ok',false,'code','STALE_BATCH'); END IF;
  v_original:=coalesce(v_batch.discount_fee_poisha,v_batch.fee_poisha);
  IF (p_kind='free') IS DISTINCT FROM (v_original=0) THEN RETURN jsonb_build_object('ok',false,'code','STALE_BATCH'); END IF;
  IF p_kind='free' THEN
    IF p_adjusted_poisha IS DISTINCT FROM 0::bigint OR p_waiver_poisha IS DISTINCT FROM 0::bigint OR p_channel IS NOT NULL OR v_ref IS NOT NULL OR v_reason IS NOT NULL THEN
      RETURN jsonb_build_object('ok',false,'code','INVALID_PAYMENT'); END IF;
    v_method:='free'; v_adjusted:=0; v_waiver:=0;
  ELSE
    IF p_attested IS DISTINCT FROM true OR v_ref IS NULL OR char_length(v_ref)>128 THEN RETURN jsonb_build_object('ok',false,'code','INVALID_PAYMENT'); END IF;
    IF p_kind='full_fee_waiver' THEN
      IF p_adjusted_poisha IS DISTINCT FROM v_original OR p_waiver_poisha IS DISTINCT FROM v_original OR p_channel IS NOT NULL
        OR char_length(coalesce(v_reason,'')) NOT BETWEEN 1 AND 500 THEN RETURN jsonb_build_object('ok',false,'code','INVALID_PAYMENT'); END IF;
      v_method:='full_fee_waiver'; v_adjusted:=v_original; v_waiver:=v_original;
    ELSE
      IF p_adjusted_poisha IS NULL OR p_adjusted_poisha NOT BETWEEN 1 AND 9007199254740991 OR p_waiver_poisha IS NULL THEN RETURN jsonb_build_object('ok',false,'code','INVALID_PAYMENT'); END IF;
      v_adjusted:=p_adjusted_poisha; v_waiver:=p_waiver_poisha;
      IF p_kind='partial_fee_waiver' THEN
        IF v_waiver<=0 OR v_waiver>=v_adjusted OR v_waiver>=v_original OR p_channel IS NULL OR p_channel NOT IN ('cash','bkash','bank_transfer')
          OR char_length(coalesce(v_reason,'')) NOT BETWEEN 1 AND 500 THEN RETURN jsonb_build_object('ok',false,'code','INVALID_PAYMENT'); END IF;
        v_method:=p_channel;
      ELSE
        IF v_waiver<>0 OR v_reason IS NOT NULL OR p_channel IS DISTINCT FROM p_kind THEN RETURN jsonb_build_object('ok',false,'code','INVALID_PAYMENT'); END IF;
        v_method:=p_kind;
      END IF;
    END IF;
  END IF;
  v_collected:=v_adjusted-v_waiver;
  IF v_method='bkash' AND v_ref !~ '^[A-Z0-9]{1,128}$' THEN RETURN jsonb_build_object('ok',false,'code','INVALID_PAYMENT'); END IF;
  -- Serialize with public intake, and do not take over a pending checkout or unresolved money.
  WITH expired AS (
    SELECT e.id FROM public.enrollments e WHERE e.batch_id=v_batch.id
      AND (lower(btrim(e.email::text))=v_email OR e.phone=p_phone)
      AND e.status='pending' AND e.hold_expires_at<=now()
      AND NOT EXISTS(SELECT 1 FROM public.payment_attempts pa WHERE pa.enrollment_id=e.id AND pa.status IN ('initiated','pending','review_hold','validated'))
    FOR UPDATE SKIP LOCKED
  ) UPDATE public.enrollments e SET status='expired' FROM expired WHERE e.id=expired.id;
  SELECT e.id INTO v_existing FROM public.enrollments e WHERE e.batch_id=v_batch.id
    AND (lower(btrim(e.email::text))=v_email OR e.phone=p_phone)
    AND (e.status IN ('confirmed','application_in_process','pending','review_hold') OR
      (e.status='expired' AND EXISTS(SELECT 1 FROM public.payment_attempts pa WHERE pa.enrollment_id=e.id AND pa.status IN ('initiated','pending','review_hold','validated'))))
    ORDER BY e.created_at DESC,e.id LIMIT 1;
  IF FOUND THEN RETURN jsonb_build_object('ok',false,'code','DUPLICATE_ENROLLMENT','existing_id',v_existing); END IF;
  IF v_batch.capacity IS NOT NULL AND public.count_batch_active_seats(v_batch.id)>=v_batch.capacity-v_batch.historical_enrolled_count THEN
    RETURN jsonb_build_object('ok',false,'code','BATCH_FULL'); END IF;
  IF v_method IN ('cash','bank_transfer','bkash') THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('lna:payment:'||v_method||':'||v_ref,0));
    v_duplicate_ref:=EXISTS(SELECT 1 FROM public.enrollments e WHERE e.payment_method=v_method AND upper(btrim(e.submitted_payment_ref))=v_ref);
    IF v_method='bkash' AND (v_duplicate_ref OR EXISTS(SELECT 1 FROM public.payment_attempts pa WHERE upper(btrim(pa.trx_id))=v_ref)) THEN RETURN jsonb_build_object('ok',false,'code','DUPLICATE_PAYMENT_REFERENCE'); END IF;
    IF v_method IN ('cash','bank_transfer') AND v_duplicate_ref AND p_reuse_ack IS DISTINCT FROM true THEN RETURN jsonb_build_object('ok',false,'code','REFERENCE_ACK_REQUIRED'); END IF;
  END IF;
  -- Exact contact pairs are the current canonical student identity. Never silently merge a partial match.
  PERFORM pg_advisory_xact_lock(hashtextextended('lna:student:'||v_email||':'||p_phone,0));
  SELECT sc.student_id INTO v_student FROM public.student_contacts sc WHERE sc.email=v_email AND sc.phone=p_phone;
  IF EXISTS(SELECT 1 FROM public.student_contacts sc WHERE (sc.email=v_email OR sc.phone=p_phone) AND sc.student_id IS DISTINCT FROM v_student)
    OR EXISTS(SELECT 1 FROM public.students s WHERE (lower(btrim(s.email))=v_email OR s.phone=p_phone) AND s.id IS DISTINCT FROM v_student)
    OR (v_student IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.students s WHERE s.id=v_student AND s.archived_at IS NULL AND lower(btrim(s.full_name))=lower(btrim(p_full_name)))) THEN
    RETURN jsonb_build_object('ok',false,'code','STUDENT_CONTACT_CONFLICT'); END IF;
  IF v_student IS NOT NULL THEN
    PERFORM 1 FROM public.students s WHERE s.id=v_student AND s.archived_at IS NULL FOR SHARE;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','STUDENT_CONTACT_CONFLICT'); END IF;
    IF EXISTS(SELECT 1 FROM public.student_enrollment_links l JOIN public.enrollments e ON e.id=l.enrollment_id WHERE l.student_id=v_student AND e.batch_id=v_batch.id AND e.status IN ('confirmed','pending','application_in_process','review_hold')) THEN
      RETURN jsonb_build_object('ok',false,'code','DUPLICATE_ENROLLMENT'); END IF;
  END IF;
  v_details:=jsonb_build_object('kind',p_kind,'channel',p_channel,'original_payable_poisha',v_original,
    'catalog_base_poisha',v_batch.fee_poisha,'adjusted_poisha',v_adjusted,'waiver_poisha',v_waiver,
    'collected_poisha',v_collected,'waiver_reason',v_reason,'actor_id',p_actor_id,'recorded_at',now(),
    'duplicate_reference_acknowledged',v_duplicate_ref AND p_reuse_ack IS TRUE);
  INSERT INTO public.enrollments(public_ref,course_id,batch_id,full_name,email,phone,answers,program_questions_snapshot,
    payment_method,payment_status,submitted_payment_ref,base_fee_poisha,discount_amount_poisha,payable_poisha,status,
    confirmed_at,verified_at,staff_payment_details,is_dev_fixture,fixture_label)
  VALUES(p_public_ref,v_course.id,v_batch.id,btrim(p_full_name),v_email,p_phone,p_answers,p_program_questions_snapshot,
    v_method,CASE WHEN v_collected=0 THEN 'not_required' ELSE 'verified' END,v_ref,v_adjusted,v_waiver,v_collected,'confirmed',
    now(),CASE WHEN v_collected>0 THEN now() ELSE NULL END,v_details,
    v_batch.is_dev_fixture OR v_course.is_dev_fixture,
    CASE WHEN v_batch.is_dev_fixture OR v_course.is_dev_fixture THEN coalesce(v_batch.fixture_label,v_course.fixture_label,'Staff admission fixture') ELSE NULL END) RETURNING id INTO v_id;
  SELECT student_id INTO v_student FROM public.student_enrollment_links WHERE enrollment_id=v_id;
  IF p_notify AND NOT (v_batch.is_dev_fixture OR v_course.is_dev_fixture) THEN
    INSERT INTO public.email_outbox(enrollment_id,template,recipient_email,idempotency_key,payload,status)
    VALUES(v_id,CASE WHEN v_collected=0 THEN 'enrollment_confirmed_free' ELSE 'enrollment_confirmed_paid' END,v_email,
      'confirm:'||v_id::text,jsonb_build_object('public_ref',p_public_ref,'full_name',btrim(p_full_name),'course_title',v_course.title,
      'batch_name',v_batch.name,'venue',v_batch.venue,'start_date',v_batch.start_date::text,'payable_poisha',v_collected,'payment_method',v_method),'pending')
    RETURNING id INTO v_outbox;
  END IF;
  INSERT INTO public.audit_events(actor_id,actor_role,action,target_entity,target_id,audit_scope,batch_id,reason,after_state)
    VALUES(p_actor_id,v_role,'staff_confirmed_admission','enrollments',v_id::text,'batch',v_batch.id,v_reason,
      v_details||jsonb_build_object('student_id',v_student,'status','confirmed','payment_method',v_method));
  RETURN jsonb_build_object('ok',true,'enrollment_id',v_id,'student_id',v_student,'outbox_id',v_outbox,'public_ref',p_public_ref,'collected_poisha',v_collected::text);
END; $$;
REVOKE ALL ON FUNCTION public.create_confirmed_staff_admission(uuid,uuid,timestamptz,text,text,text,text,jsonb,jsonb,text,text,bigint,bigint,text,text,boolean,boolean,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_confirmed_staff_admission(uuid,uuid,timestamptz,text,text,text,text,jsonb,jsonb,text,text,bigint,bigint,text,text,boolean,boolean,boolean) TO service_role;
COMMIT;
