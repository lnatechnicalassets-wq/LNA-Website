-- W4: safe retry, settlement eligibility, durable query-only reconciliation lease.
BEGIN;

ALTER TABLE public.payment_attempts ADD COLUMN reconcile_owner uuid,
  ADD COLUMN reconcile_until timestamptz;
CREATE INDEX idx_payment_attempts_w4_reconcile ON public.payment_attempts(updated_at)
  WHERE gateway='bkash' AND status IN ('initiated','pending') AND payment_id IS NOT NULL;

CREATE FUNCTION public.claim_bkash_reconciliation(p_attempt_id uuid,p_owner uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
  IF p_owner IS NULL THEN RETURN false; END IF;
  UPDATE public.payment_attempts SET reconcile_owner=p_owner,reconcile_until=now()+interval '3 minutes'
    WHERE id=p_attempt_id AND gateway='bkash' AND payment_id IS NOT NULL
      AND status IN ('initiated','pending')
      AND failure_reason IN ('EXECUTE_STARTED','EXECUTE_NO_RESPONSE','CALLBACK_STARTED','CALLBACK_UNVERIFIED')
      AND updated_at<=now()-interval '60 seconds'
      AND (reconcile_until IS NULL OR reconcile_until<=now());
  RETURN FOUND;
END; $$;
CREATE FUNCTION public.release_bkash_reconciliation(p_attempt_id uuid,p_owner uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
  UPDATE public.payment_attempts SET reconcile_owner=NULL,reconcile_until=NULL
    WHERE id=p_attempt_id AND reconcile_owner=p_owner;
  RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.claim_bkash_reconciliation(uuid,uuid),public.release_bkash_reconciliation(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_bkash_reconciliation(uuid,uuid),public.release_bkash_reconciliation(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.retry_enrollment_payment(p_public_ref text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_enrollment public.enrollments%ROWTYPE;
  v_batch public.batches%ROWTYPE;
  v_course public.courses%ROWTYPE;
  v_attempt public.payment_attempts%ROWTYPE;
  v_clean_ref text;
  v_attempt_seq integer;
  v_tran_id text;
BEGIN
  IF p_public_ref IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENTS';
  END IF;

  v_clean_ref := upper(trim(p_public_ref));

  SELECT * INTO v_enrollment
  FROM public.enrollments
  WHERE public_ref = v_clean_ref
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ENROLLMENT_NOT_FOUND');
  END IF;

  IF v_enrollment.status = 'confirmed' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_CONFIRMED');
  END IF;

  IF v_enrollment.status <> 'pending' OR v_enrollment.payment_method <> 'bkash' OR v_enrollment.archived_at IS NOT NULL
    OR v_enrollment.staff_payment_recorded_by IS NOT NULL OR v_enrollment.applicant_payment_submitted THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_RETRYABLE');
  END IF;

  IF v_enrollment.hold_expires_at IS NOT NULL AND v_enrollment.hold_expires_at <= now() THEN
    UPDATE public.enrollments SET status = 'expired' WHERE id = v_enrollment.id;
    RETURN jsonb_build_object('ok', false, 'code', 'HOLD_EXPIRED');
  END IF;

  SELECT * INTO v_batch FROM public.batches WHERE id = v_enrollment.batch_id FOR UPDATE;
  SELECT * INTO v_course FROM public.courses WHERE id = v_enrollment.course_id FOR SHARE;

  IF v_enrollment.archived_at IS NOT NULL OR v_batch.archived_at IS NOT NULL OR v_course.status <> 'published'
     OR v_course.archived_at IS NOT NULL
     OR (CASE WHEN v_batch.accept_applications IS NULL THEN v_batch.status <> 'open_for_enrollment'
              ELSE v_batch.status NOT IN ('upcoming', 'open_for_enrollment', 'in_progress') END) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'BATCH_CLOSED');
  END IF;

  -- The enrollment lock serializes retries. Never replace unresolved or verified funds.
  IF EXISTS (SELECT 1 FROM public.payment_attempts
    WHERE enrollment_id = v_enrollment.id
      AND status IN ('initiated','pending','review_hold','validated')) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'PAYMENT_UNRESOLVED');
  END IF;

  SELECT COUNT(*)::integer + 1 INTO v_attempt_seq
  FROM public.payment_attempts
  WHERE enrollment_id = v_enrollment.id;

  v_tran_id := v_enrollment.public_ref || '-' || lpad(v_attempt_seq::text, 2, '0') || '-' ||
               substr(encode(extensions.gen_random_bytes(3), 'hex'), 1, 6);

  INSERT INTO public.payment_attempts (
    enrollment_id,
    gateway,
    tran_id,
    amount_poisha,
    currency,
    status
  )
  VALUES (
    v_enrollment.id,
    'bkash',
    v_tran_id,
    v_enrollment.payable_poisha,
    'BDT',
    'initiated'
  )
  RETURNING * INTO v_attempt;

  RETURN jsonb_build_object(
    'ok', true,
    'enrollment_id', v_enrollment.id,
    'public_ref', v_enrollment.public_ref,
    'attempt_id', v_attempt.id,
    'tran_id', v_attempt.tran_id,
    'amount_poisha', v_attempt.amount_poisha,
    'currency', 'BDT',
    'hold_expires_at', v_enrollment.hold_expires_at,
    'course_title', v_course.title,
    'batch_name', v_batch.name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_payment(
  p_attempt_id uuid,
  p_payment_id text,
  p_trx_id text,
  p_verified_poisha bigint,
  p_currency text,
  p_gateway_status_code text,
  p_gateway_status_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attempt public.payment_attempts%ROWTYPE;
  v_enrollment public.enrollments%ROWTYPE;
  v_batch public.batches%ROWTYPE;
  v_course public.courses%ROWTYPE;
  v_outbox_id uuid;
  v_trx text;
  v_pay_id text;
  v_currency text;
  v_code text;
  v_other_active_seats integer;
  v_block_reason text;
BEGIN
  IF p_attempt_id IS NULL OR p_payment_id IS NULL OR p_trx_id IS NULL
     OR p_verified_poisha IS NULL OR p_currency IS NULL OR p_gateway_status_code IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENTS';
  END IF;

  v_trx := trim(p_trx_id);
  v_pay_id := trim(p_payment_id);
  v_currency := upper(trim(p_currency));
  v_code := trim(p_gateway_status_code);

  IF v_trx = '' OR v_pay_id = '' THEN
    RAISE EXCEPTION 'INVALID_ARGUMENTS';
  END IF;

  -- Lock attempt -> enrollment -> batch in strict hierarchy order
  SELECT * INTO v_attempt
  FROM public.payment_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_ATTEMPT_NOT_FOUND';
  END IF;

  SELECT * INTO v_enrollment
  FROM public.enrollments
  WHERE id = v_attempt.enrollment_id
  FOR UPDATE;

  SELECT * INTO v_batch
  FROM public.batches
  WHERE id = v_enrollment.batch_id
  FOR UPDATE;

  SELECT * INTO v_course
  FROM public.courses
  WHERE id = v_enrollment.course_id FOR SHARE;

  IF v_enrollment.staff_payment_recorded_by IS NOT NULL OR v_enrollment.applicant_payment_submitted THEN
    RAISE EXCEPTION 'STAFF_PAYMENT_REQUIRES_MANUAL_REVIEW' USING ERRCODE = '22023';
  END IF;

  -- Idempotency guard: repeated validated callback must NOT reconfirm or send another email
  IF v_attempt.status = 'validated' THEN
    SELECT id INTO v_outbox_id
    FROM public.email_outbox
    WHERE idempotency_key = 'confirm:' || v_enrollment.id::text;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'already_validated',
      'already_validated', true,
      'enrollment_id', v_enrollment.id,
      'public_ref', v_enrollment.public_ref,
      'outbox_id', v_outbox_id
    );
  END IF;

  -- Never attach another gateway payment ID to this attempt.
  IF v_attempt.payment_id IS NOT NULL AND v_attempt.payment_id <> v_pay_id THEN
    UPDATE public.payment_attempts SET status='review_hold', failure_reason='PAYMENT_ID_MISMATCH'
      WHERE id=v_attempt.id;
    INSERT INTO public.audit_events(actor_role,action,target_entity,target_id,after_state)
      VALUES('system','payment_flagged_review_hold','payment_attempts',v_attempt.id::text,
        jsonb_build_object('reason','PAYMENT_ID_MISMATCH','reported_payment_id',v_pay_id,
          'reported_trx_id',v_trx,'reported_amount_poisha',p_verified_poisha,'reported_currency',v_currency));
    RETURN jsonb_build_object('success',false,'status','review_hold','reason','PAYMENT_ID_MISMATCH',
      'enrollment_id',v_enrollment.id,'public_ref',v_enrollment.public_ref);
  END IF;

  -- Serialize transaction claims with staff verification, including across batches.
  PERFORM pg_advisory_xact_lock(hashtextextended('lna:payment:bkash:' || upper(v_trx), 0));

  -- Duplicate transaction ID replay guard across gateway attempts and verified staff payments.
  IF EXISTS (
    SELECT 1 FROM public.payment_attempts pa
    WHERE upper(trim(pa.trx_id)) = upper(v_trx) AND pa.id <> v_attempt.id
  ) OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.payment_method = 'bkash' AND e.payment_status = 'verified'
      AND upper(trim(e.submitted_payment_ref)) = upper(v_trx)
      AND e.id <> v_enrollment.id
  ) THEN
    UPDATE public.payment_attempts
    SET status = 'review_hold',
        gateway_status_code = v_code,
        gateway_status_message = p_gateway_status_message,
        failure_reason = 'DUPLICATE_TRX_ID',
        validated_amount_poisha = p_verified_poisha
    WHERE id = v_attempt.id;

    INSERT INTO public.audit_events (actor_role, action, target_entity, target_id, after_state)
    VALUES (
      'system',
      'payment_duplicate_trx_hold',
      'payment_attempts',
      v_attempt.id::text,
      jsonb_build_object('enrollment_id', v_enrollment.id, 'trx_id', v_trx)
    );

    RETURN jsonb_build_object(
      'success', false,
      'status', 'review_hold',
      'reason', 'DUPLICATE_TRX_ID',
      'enrollment_id', v_enrollment.id,
      'public_ref', v_enrollment.public_ref
    );
  END IF;

  -- Guard against two simultaneous attempts both trying to confirm one enrollment
  IF v_enrollment.status = 'confirmed' THEN
    UPDATE public.payment_attempts
    SET status = 'review_hold',
        trx_id = v_trx,
        gateway_status_code = v_code,
        gateway_status_message = p_gateway_status_message,
        failure_reason = 'ENROLLMENT_ALREADY_CONFIRMED',
        validated_amount_poisha = p_verified_poisha
    WHERE id = v_attempt.id;

    INSERT INTO public.audit_events (actor_role, action, target_entity, target_id, after_state)
    VALUES (
      'system',
      'payment_second_attempt_on_confirmed_enrollment',
      'payment_attempts',
      v_attempt.id::text,
      jsonb_build_object('enrollment_id', v_enrollment.id, 'trx_id', v_trx)
    );

    RETURN jsonb_build_object(
      'success', false,
      'status', 'review_hold',
      'reason', 'ENROLLMENT_ALREADY_CONFIRMED',
      'enrollment_id', v_enrollment.id,
      'public_ref', v_enrollment.public_ref
    );
  END IF;

  -- A paid receipt and an eligible seat are independent facts. Preserve completed
  -- gateway evidence on the attempt without reopening archived/cancelled admissions.
  IF v_enrollment.archived_at IS NOT NULL OR v_enrollment.status NOT IN ('pending','expired','review_hold')
    OR v_enrollment.payment_method <> 'bkash' OR v_batch.archived_at IS NOT NULL
    OR v_course.archived_at IS NOT NULL OR v_course.status <> 'published'
    OR v_batch.status NOT IN ('upcoming','open_for_enrollment','in_progress') THEN
    v_block_reason := 'ENROLLMENT_INELIGIBLE';
  ELSIF EXISTS (SELECT 1 FROM public.enrollments e WHERE e.batch_id=v_batch.id
      AND e.id<>v_enrollment.id AND (lower(e.email::text)=lower(v_enrollment.email::text) OR e.phone=v_enrollment.phone)
      AND e.status IN ('confirmed','review_hold','application_in_process','pending')) THEN
    v_block_reason := 'CONTACT_CONFLICT';
  ELSE
    SELECT COUNT(*)::integer INTO v_other_active_seats FROM public.enrollments e
    WHERE e.batch_id=v_batch.id AND e.id<>v_enrollment.id AND (
      e.status IN ('confirmed','review_hold') OR
      (e.status='application_in_process' AND e.staff_payment_recorded_by IS NULL AND NOT e.applicant_payment_submitted) OR
      (e.status='pending' AND (e.hold_expires_at IS NULL OR e.hold_expires_at>now())));
    IF v_batch.capacity IS NOT NULL AND v_batch.capacity-v_batch.historical_enrolled_count-v_other_active_seats<=0 THEN
      v_block_reason := 'HOLD_EXPIRED_BATCH_FULL';
    END IF;
  END IF;
  IF v_block_reason IS NOT NULL THEN
    UPDATE public.payment_attempts SET status='review_hold', payment_id=coalesce(payment_id,v_pay_id),
      trx_id=v_trx, validated_amount_poisha=p_verified_poisha, gateway_status_code=v_code,
      gateway_status_message=p_gateway_status_message, failure_reason=v_block_reason
      WHERE id=v_attempt.id;
    INSERT INTO public.audit_events(actor_role,action,target_entity,target_id,after_state)
      VALUES('system','payment_flagged_review_hold','payment_attempts',v_attempt.id::text,
        jsonb_build_object('reason',v_block_reason,'enrollment_id',v_enrollment.id,
          'trx_id',v_trx,'reported_currency',v_currency,'reported_poisha',p_verified_poisha));
    RETURN jsonb_build_object('success',false,'status','review_hold','reason',v_block_reason,
      'enrollment_id',v_enrollment.id,'public_ref',v_enrollment.public_ref);
  END IF;

  -- Strict gateway value comparison (BR-02 / Rule 10)
  IF v_currency <> 'BDT' OR p_verified_poisha <> v_attempt.amount_poisha OR v_code <> '0000' THEN
    UPDATE public.payment_attempts
    SET status = 'review_hold',
        payment_id = coalesce(payment_id, v_pay_id),
        trx_id = v_trx,
        validated_amount_poisha = p_verified_poisha,
        gateway_status_code = v_code,
        gateway_status_message = p_gateway_status_message,
        failure_reason = 'GATEWAY_VALUE_MISMATCH'
    WHERE id = v_attempt.id;

    UPDATE public.enrollments
    SET status = 'review_hold',
        payment_status = 'review_hold',
        submitted_payment_ref = coalesce(submitted_payment_ref, v_trx),
        verification_notes = 'Flagged for manual review due to gateway currency, amount, or status mismatch.'
    WHERE id = v_enrollment.id AND status IN ('pending','review_hold')
      AND (hold_expires_at IS NULL OR hold_expires_at > now());

    INSERT INTO public.audit_events (actor_role, action, target_entity, target_id, after_state)
    VALUES (
      'system',
      'payment_flagged_review_hold',
      'enrollments',
      v_enrollment.id::text,
      jsonb_build_object(
        'expected_poisha', v_attempt.amount_poisha,
        'verified_poisha', p_verified_poisha,
        'currency', v_currency,
        'gateway_status_code', v_code
      )
    );

    RETURN jsonb_build_object(
      'success', false,
      'status', 'review_hold',
      'reason', 'GATEWAY_VALUE_MISMATCH',
      'enrollment_id', v_enrollment.id,
      'public_ref', v_enrollment.public_ref
    );
  END IF;

  -- Atomic Paid Confirmation & Decoupled Outbox Insert
  UPDATE public.payment_attempts
  SET status = 'validated',
      payment_id = coalesce(payment_id, v_pay_id),
      trx_id = v_trx,
      validated_amount_poisha = p_verified_poisha,
      gateway_status_code = v_code,
      gateway_status_message = p_gateway_status_message,
      executed_at = now()
  WHERE id = v_attempt.id;

  UPDATE public.enrollments
  SET status = 'confirmed',
      payment_status = 'verified',
      submitted_payment_ref = v_trx,
      verified_at = now(),
      confirmed_at = now()
  WHERE id = v_enrollment.id;

  INSERT INTO public.email_outbox (
    enrollment_id,
    template,
    recipient_email,
    idempotency_key,
    payload,
    status
  )
  VALUES (
    v_enrollment.id,
    'enrollment_confirmed_paid',
    v_enrollment.email,
    'confirm:' || v_enrollment.id::text,
    jsonb_build_object(
      'public_ref', v_enrollment.public_ref,
      'full_name', v_enrollment.full_name,
      'course_title', v_course.title,
      'batch_name', v_batch.name,
      'venue', v_batch.venue,
      'start_date', v_batch.start_date::text,
      'payable_poisha', v_enrollment.payable_poisha,
      'payment_method', 'bkash'
    ),
    'pending'
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  SELECT id INTO v_outbox_id
  FROM public.email_outbox
  WHERE idempotency_key = 'confirm:' || v_enrollment.id::text;

  INSERT INTO public.audit_events (actor_role, action, target_entity, target_id, after_state)
  VALUES (
    'system',
    'payment_confirmed',
    'enrollments',
    v_enrollment.id::text,
    jsonb_build_object(
      'public_ref', v_enrollment.public_ref,
      'attempt_id', v_attempt.id,
      'verified_poisha', p_verified_poisha
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'validated',
    'already_validated', false,
    'enrollment_id', v_enrollment.id,
    'public_ref', v_enrollment.public_ref,
    'outbox_id', v_outbox_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_payment_outcome(
  p_attempt_id uuid,
  p_next_status text,
  p_payment_id text DEFAULT NULL,
  p_failure_reason text DEFAULT NULL,
  p_gateway_status_code text DEFAULT NULL,
  p_gateway_status_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attempt public.payment_attempts%ROWTYPE;
  v_enrollment public.enrollments%ROWTYPE;
BEGIN
  IF p_attempt_id IS NULL OR p_next_status IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENTS';
  END IF;

  IF p_next_status NOT IN ('pending', 'failed', 'cancelled', 'review_hold') THEN
    RAISE EXCEPTION 'INVALID_NEXT_STATUS';
  END IF;

  SELECT * INTO v_attempt
  FROM public.payment_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_ATTEMPT_NOT_FOUND';
  END IF;

  SELECT * INTO v_enrollment
  FROM public.enrollments
  WHERE id = v_attempt.enrollment_id
  FOR UPDATE;

  IF v_attempt.status IN ('validated', 'failed', 'cancelled', 'review_hold') THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', v_attempt.status,
      'already_terminal', true,
      'enrollment_id', v_enrollment.id,
      'public_ref', v_enrollment.public_ref,
      'hold_expires_at', v_enrollment.hold_expires_at
    );
  END IF;

  UPDATE public.payment_attempts
  SET status = p_next_status,
      payment_id = coalesce(payment_id, nullif(trim(coalesce(p_payment_id, '')), '')),
      failure_reason = coalesce(p_failure_reason, failure_reason),
      gateway_status_code = coalesce(p_gateway_status_code, gateway_status_code),
      gateway_status_message = coalesce(p_gateway_status_message, gateway_status_message)
  WHERE id = v_attempt.id;

  IF p_next_status = 'review_hold' AND v_enrollment.status = 'pending'
      AND v_enrollment.archived_at IS NULL
      AND (v_enrollment.hold_expires_at IS NULL OR v_enrollment.hold_expires_at > now()) THEN
    UPDATE public.enrollments
    SET status = 'review_hold',
        payment_status = 'review_hold',
        verification_notes = coalesce(p_failure_reason, 'Flagged for manual payment review.')
    WHERE id = v_enrollment.id;
  END IF;

  -- Strictly preserve enrollments.status = 'pending' and enrollments.hold_expires_at for 'failed'/'cancelled'/'pending'
  RETURN jsonb_build_object(
    'success', true,
    'status', p_next_status,
    'already_terminal', false,
    'enrollment_id', v_enrollment.id,
    'public_ref', v_enrollment.public_ref,
    'hold_expires_at', v_enrollment.hold_expires_at
  );
END;
$$;
CREATE OR REPLACE FUNCTION public.start_checked_public_enrollment(
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
              AND pa.status IN ('initiated','pending','review_hold','validated')))
          OR (e.status='cancelled' AND EXISTS (SELECT 1 FROM public.payment_attempts pa
            WHERE pa.enrollment_id=e.id AND pa.status IN ('initiated','pending','review_hold'))))) THEN
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

NOTIFY pgrst, 'reload schema';
COMMIT;
