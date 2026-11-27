-- W4 public submission: fee confirmation and payment mode are checked under the
-- same batch lock as enrollment creation. Existing RPCs remain for staff and legacy tests.
BEGIN;
ALTER TABLE public.enrollments ADD COLUMN policy_accepted_at timestamptz;

CREATE FUNCTION public.start_checked_public_enrollment(
  p_course_slug text, p_batch_slug text, p_public_ref text,
  p_full_name text, p_email text, p_phone text, p_answers jsonb,
  p_program_questions_snapshot jsonb, p_trx_id text,
  p_expected_payable_poisha bigint, p_mode text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  v_batch public.batches%ROWTYPE;
  v_course public.courses%ROWTYPE;
  v_payable bigint;
  v_result jsonb;
BEGIN
  IF p_expected_payable_poisha IS NULL OR p_expected_payable_poisha < 0
    OR p_mode IS NULL OR p_mode NOT IN ('free','manual','hosted') THEN
    RETURN jsonb_build_object('ok',false,'code','FEE_CONFIRMATION_REQUIRED');
  END IF;
  SELECT b.* INTO v_batch FROM public.batches b
    JOIN public.courses c ON c.id=b.course_id
    WHERE c.slug=p_course_slug AND b.slug=p_batch_slug AND b.archived_at IS NULL
    FOR UPDATE OF b;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','BATCH_NOT_FOUND'); END IF;
  SELECT * INTO v_course FROM public.courses WHERE id=v_batch.course_id FOR SHARE;
  IF v_course.status <> 'published' OR v_course.archived_at IS NOT NULL
    OR NOT public.batch_intake_allowed(v_batch,false) THEN
    RETURN jsonb_build_object('ok',false,'code','BATCH_CLOSED');
  END IF;
  v_payable := coalesce(v_batch.discount_fee_poisha,v_batch.fee_poisha);
  IF v_payable IS DISTINCT FROM p_expected_payable_poisha THEN
    RETURN jsonb_build_object('ok',false,'code','FEE_CHANGED');
  END IF;
  IF (p_mode='free') IS DISTINCT FROM (v_payable=0) THEN
    RETURN jsonb_build_object('ok',false,'code','FEE_CHANGED');
  END IF;
  IF p_mode IN ('free','hosted') THEN
    IF p_trx_id IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'code','TRANSACTION_ID_UNEXPECTED'); END IF;
    -- A fresh application must not resume another person's hold or create a second
    -- checkout. Existing reservations use the separately authorized retry path.
    IF EXISTS (SELECT 1 FROM public.enrollments e
      WHERE e.batch_id=v_batch.id AND (lower(e.email::text)=lower(trim(p_email)) OR e.phone=p_phone)
        AND (e.status IN ('confirmed','application_in_process','review_hold')
          OR (e.status='pending' AND (e.hold_expires_at IS NULL OR e.hold_expires_at>now()))
          OR (e.status IN ('pending','expired') AND EXISTS (
            SELECT 1 FROM public.payment_attempts pa WHERE pa.enrollment_id=e.id
              AND pa.status IN ('initiated','pending','review_hold','validated'))))) THEN
      RETURN jsonb_build_object('ok',false,'code','DUPLICATE_ENROLLMENT');
    END IF;
  END IF;
  IF p_mode='hosted' THEN
    v_result := public.start_enrollment(p_course_slug,p_batch_slug,p_public_ref,p_full_name,p_email,p_phone,p_answers,p_program_questions_snapshot);
  ELSE
    v_result := public.submit_public_manual_enrollment(p_course_slug,p_batch_slug,p_public_ref,p_full_name,p_email,p_phone,p_answers,p_program_questions_snapshot,p_trx_id);
  END IF;
  IF v_result->>'ok'='true' AND v_result->>'public_ref'=p_public_ref THEN
    UPDATE public.enrollments SET policy_accepted_at=now()
      WHERE id=(v_result->>'enrollment_id')::uuid AND policy_accepted_at IS NULL;
  END IF;
  RETURN v_result;
END; $$;
REVOKE ALL ON FUNCTION public.start_checked_public_enrollment(text,text,text,text,text,text,jsonb,jsonb,text,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.start_checked_public_enrollment(text,text,text,text,text,text,jsonb,jsonb,text,bigint,text) TO service_role;
COMMIT;
