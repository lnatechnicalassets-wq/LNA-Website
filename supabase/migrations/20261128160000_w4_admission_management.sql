-- W4 admission management: keep a single financial/admission identity, append batch history.
BEGIN;
-- Verified manual payments remain verified after an administrative cancellation.
ALTER TABLE public.enrollments DROP CONSTRAINT enrollments_staff_payment_review_consistent,
  ADD CONSTRAINT enrollments_staff_payment_review_consistent CHECK (
    (NOT applicant_payment_submitted AND staff_payment_recorded_by IS NULL AND staff_payment_reviewed_by IS NULL)
    OR (
      ((NOT applicant_payment_submitted AND staff_payment_recorded_by IS NOT NULL AND payment_method IN ('bkash','bank_transfer'))
        OR (applicant_payment_submitted AND staff_payment_recorded_by IS NULL AND payment_method='bkash' AND payable_poisha>0))
      AND submitted_payment_ref IS NOT NULL AND hold_expires_at IS NULL
      AND ((staff_payment_reviewed_by IS NULL AND status='application_in_process' AND payment_status='pending_verification' AND confirmed_at IS NULL AND verified_at IS NULL)
        OR (staff_payment_reviewed_by IS NOT NULL AND status IN ('confirmed','cancelled') AND payment_status='verified' AND confirmed_at IS NOT NULL AND verified_at IS NOT NULL)
        OR (staff_payment_reviewed_by IS NOT NULL AND status='cancelled' AND payment_status='rejected' AND confirmed_at IS NULL AND verified_at IS NULL))
    ));

CREATE FUNCTION public.get_staff_admission_management(p_actor_id uuid,p_enrollment_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE v_enrollment public.enrollments%ROWTYPE; v_batch public.batches%ROWTYPE; v_course public.courses%ROWTYPE;
  v_destinations jsonb; v_history jsonb;
BEGIN
  PERFORM public.require_staff_actor(p_actor_id,ARRAY['admin','super_admin'],'STAFF_ENROLLMENT_FORBIDDEN');
  SELECT * INTO v_enrollment FROM public.enrollments WHERE id=p_enrollment_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO v_batch FROM public.batches WHERE id=v_enrollment.batch_id;
  SELECT * INTO v_course FROM public.courses WHERE id=v_enrollment.course_id;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'revision',b.updated_at,
    'start_date',b.start_date,'fee_poisha',coalesce(b.discount_fee_poisha,b.fee_poisha)::text,
    'remaining',CASE WHEN b.capacity IS NULL THEN NULL ELSE greatest(0,b.capacity-b.historical_enrolled_count-public.count_batch_active_seats(b.id)) END)
    ORDER BY b.start_date,b.id),'[]'::jsonb) INTO v_destinations
  FROM public.batches b WHERE b.course_id=v_enrollment.course_id AND b.id<>v_enrollment.batch_id
    AND v_enrollment.status='confirmed' AND v_enrollment.archived_at IS NULL
    AND v_course.status='published' AND v_course.archived_at IS NULL
    AND public.batch_intake_allowed(b,true) AND b.is_dev_fixture=v_batch.is_dev_fixture;
  SELECT coalesce(jsonb_agg(to_jsonb(h) ORDER BY h.created_at DESC,h.id DESC),'[]'::jsonb) INTO v_history
  FROM (SELECT id,action,reason,created_at,before_state,after_state FROM public.audit_events
    WHERE target_entity='enrollments' AND target_id=v_enrollment.id::text
      AND action IN ('staff_cancelled_admission','staff_transferred_admission')
    ORDER BY created_at DESC,id DESC LIMIT 50) h;
  RETURN jsonb_build_object('id',v_enrollment.id,'public_ref',v_enrollment.public_ref,
    'full_name',v_enrollment.full_name,'course_title',v_course.title,'batch_name',v_batch.name,
    'revision',v_enrollment.updated_at,'status',v_enrollment.status,'payment_status',v_enrollment.payment_status,
    'payable_poisha',v_enrollment.payable_poisha::text,'archived',v_enrollment.archived_at IS NOT NULL,
    'destinations',v_destinations,'history',v_history);
END; $$;

CREATE FUNCTION public.manage_staff_admission_lifecycle(
  p_actor_id uuid,p_enrollment_id uuid,p_revision timestamptz,p_operation text,
  p_reason text,p_destination_id uuid,p_destination_revision timestamptz,p_attested boolean
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public SET lock_timeout='3s' AS $$
DECLARE v_enrollment public.enrollments%ROWTYPE; v_source public.batches%ROWTYPE;
  v_destination public.batches%ROWTYPE; v_course public.courses%ROWTYPE; v_student uuid;
  v_before jsonb; v_after jsonb;
BEGIN
  PERFORM public.require_staff_actor(p_actor_id,ARRAY['admin','super_admin'],'STAFF_ENROLLMENT_FORBIDDEN');
  IF p_operation IS NULL OR p_operation NOT IN ('cancel','transfer') OR p_attested IS DISTINCT FROM true
    OR char_length(btrim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 500 THEN RETURN 'INVALID'; END IF;
  -- This operation never writes gateway attempts. Follow their enrollment -> batch lock order.
  SELECT * INTO v_enrollment FROM public.enrollments WHERE id=p_enrollment_id FOR UPDATE;
  IF NOT FOUND OR v_enrollment.archived_at IS NOT NULL THEN RETURN 'NOT_FOUND'; END IF;
  IF v_enrollment.updated_at IS DISTINCT FROM p_revision THEN RETURN 'STALE'; END IF;
  IF v_enrollment.status='cancelled' THEN RETURN 'NOT_ELIGIBLE'; END IF;
  -- A manual payment must be verified or rejected before cancellation; do not hide unresolved proof.
  IF (v_enrollment.applicant_payment_submitted OR v_enrollment.staff_payment_recorded_by IS NOT NULL)
    AND v_enrollment.payment_status IN ('pending_verification','review_hold') THEN RETURN 'MANUAL_REVIEW_REQUIRED'; END IF;
  -- Until the durable mail worker is installed, do not leave an unsent confirmation for the wrong batch/status.
  IF EXISTS (SELECT 1 FROM public.email_outbox WHERE enrollment_id=v_enrollment.id
    AND template IN ('enrollment_confirmed_paid','enrollment_confirmed_free') AND status<>'sent') THEN
    RETURN 'CONFIRMATION_PENDING'; END IF;
  IF p_operation='transfer' THEN
    IF v_enrollment.status<>'confirmed' OR p_destination_id IS NULL OR p_destination_id=v_enrollment.batch_id THEN RETURN 'NOT_ELIGIBLE'; END IF;
    IF EXISTS (SELECT 1 FROM public.payment_attempts WHERE enrollment_id=v_enrollment.id
      AND (status IN ('initiated','pending','review_hold') OR sandbox_refund_state IS NOT NULL)) THEN RETURN 'PAYMENT_UNRESOLVED'; END IF;
  END IF;
  -- Sorted batch locks serialize transfers with each other and with ordinary admissions/settlement.
  PERFORM 1 FROM public.batches WHERE id IN (v_enrollment.batch_id,p_destination_id) ORDER BY id FOR UPDATE;
  SELECT * INTO v_source FROM public.batches WHERE id=v_enrollment.batch_id;
  SELECT * INTO v_course FROM public.courses WHERE id=v_enrollment.course_id FOR SHARE;
  SELECT student_id INTO v_student FROM public.student_enrollment_links WHERE enrollment_id=v_enrollment.id;
  IF v_student IS NOT NULL AND EXISTS (SELECT 1 FROM public.student_completions sc
      WHERE sc.student_id=v_student AND sc.course_id=v_enrollment.course_id AND (sc.batch_id=v_source.id OR sc.batch_id IS NULL)) THEN
    RETURN 'COMPLETION_PROTECTED'; END IF;
  v_before:=jsonb_build_object('status',v_enrollment.status,'batch_id',v_source.id,'batch_name',v_source.name,
    'payment_status',v_enrollment.payment_status,'payable_poisha',v_enrollment.payable_poisha::text);
  IF p_operation='cancel' THEN
    IF p_destination_id IS NOT NULL OR p_destination_revision IS NOT NULL THEN RETURN 'INVALID'; END IF;
    UPDATE public.enrollments SET status='cancelled',hold_expires_at=NULL WHERE id=v_enrollment.id;
    v_after:=v_before||jsonb_build_object('status','cancelled');
    PERFORM public.record_staff_audit_event(p_actor_id,ARRAY['admin','super_admin'],
      'staff_cancelled_admission','enrollments',v_enrollment.id::text,'batch',v_source.id,NULL,btrim(p_reason),v_before,v_after);
    RETURN 'OK';
  END IF;
  SELECT * INTO v_destination FROM public.batches WHERE id=p_destination_id;
  IF NOT FOUND OR v_destination.course_id<>v_enrollment.course_id OR v_destination.is_dev_fixture IS DISTINCT FROM v_source.is_dev_fixture
    OR v_course.status<>'published' OR v_course.archived_at IS NOT NULL OR NOT public.batch_intake_allowed(v_destination,true) THEN RETURN 'BATCH_CLOSED'; END IF;
  IF v_destination.updated_at IS DISTINCT FROM p_destination_revision THEN RETURN 'STALE_BATCH'; END IF;
  IF v_destination.capacity IS NOT NULL AND public.count_batch_active_seats(v_destination.id)>=v_destination.capacity-v_destination.historical_enrolled_count THEN RETURN 'BATCH_FULL'; END IF;
  IF EXISTS (SELECT 1 FROM public.enrollments e WHERE e.batch_id=v_destination.id AND e.id<>v_enrollment.id
      AND (lower(btrim(e.email::text))=lower(btrim(v_enrollment.email::text)) OR e.phone=v_enrollment.phone)
      AND (e.status IN ('confirmed','application_in_process','pending','review_hold') OR
        (e.status IN ('expired','cancelled') AND EXISTS (SELECT 1 FROM public.payment_attempts pa WHERE pa.enrollment_id=e.id AND pa.status IN ('initiated','pending','review_hold'))))) THEN RETURN 'DUPLICATE_ENROLLMENT'; END IF;
  IF v_student IS NOT NULL AND EXISTS (SELECT 1 FROM public.student_enrollment_links l JOIN public.enrollments e ON e.id=l.enrollment_id
      WHERE l.student_id=v_student AND e.batch_id=v_destination.id AND e.status IN ('confirmed','pending','application_in_process','review_hold')) THEN RETURN 'DUPLICATE_ENROLLMENT'; END IF;
  -- No receipt duplication, gateway change, new fee, refund or new collection. Old batch retained in audit.
  UPDATE public.enrollments SET batch_id=v_destination.id WHERE id=v_enrollment.id;
  v_after:=v_before||jsonb_build_object('batch_id',v_destination.id,'batch_name',v_destination.name,
    'destination_fee_poisha',coalesce(v_destination.discount_fee_poisha,v_destination.fee_poisha)::text);
  PERFORM public.record_staff_audit_event(p_actor_id,ARRAY['admin','super_admin'],
    'staff_transferred_admission','enrollments',v_enrollment.id::text,'batch',v_source.id,v_destination.id,btrim(p_reason),v_before,v_after);
  RETURN 'OK';
EXCEPTION WHEN lock_not_available OR deadlock_detected THEN RETURN 'BUSY';
  WHEN unique_violation THEN RETURN 'DUPLICATE_ENROLLMENT';
END; $$;
REVOKE ALL ON FUNCTION public.get_staff_admission_management(uuid,uuid),public.manage_staff_admission_lifecycle(uuid,uuid,timestamptz,text,text,uuid,timestamptz,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_admission_management(uuid,uuid),public.manage_staff_admission_lifecycle(uuid,uuid,timestamptz,text,text,uuid,timestamptz,boolean) TO service_role;
-- Match the public M24 duplicate protection when staff try to add a student after cancellation.
DO $$
DECLARE v_definition text; v_updated text;
BEGIN
  v_definition:=pg_get_functiondef('public.create_confirmed_staff_admission(uuid,uuid,timestamptz,text,text,text,text,jsonb,jsonb,text,text,bigint,bigint,text,text,boolean,boolean,boolean)'::regprocedure);
  v_updated:=replace(v_definition,$old$      (e.status='expired' AND EXISTS(SELECT 1 FROM public.payment_attempts pa WHERE pa.enrollment_id=e.id AND pa.status IN ('initiated','pending','review_hold','validated'))))$old$,$new$      (e.status='expired' AND EXISTS(SELECT 1 FROM public.payment_attempts pa WHERE pa.enrollment_id=e.id AND pa.status IN ('initiated','pending','review_hold','validated'))) OR
      (e.status='cancelled' AND EXISTS(SELECT 1 FROM public.payment_attempts pa WHERE pa.enrollment_id=e.id AND pa.status IN ('initiated','pending','review_hold'))))$new$);
  IF v_updated=v_definition THEN RAISE EXCEPTION 'W4_ADMISSION_DUPLICATE_GUARD_SOURCE_CHANGED'; END IF;
  EXECUTE v_updated;
END; $$;
COMMIT;
