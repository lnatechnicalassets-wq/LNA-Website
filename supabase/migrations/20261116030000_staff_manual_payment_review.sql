-- ADR 0013. Record an offline transfer and review it separately from hosted checkout.
BEGIN;

ALTER TABLE public.enrollments
  ADD COLUMN staff_payment_recorded_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN staff_payment_reviewed_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT enrollments_staff_payment_review_consistent CHECK (
    (staff_payment_recorded_by IS NULL AND staff_payment_reviewed_by IS NULL)
    OR (
      staff_payment_recorded_by IS NOT NULL
      AND payment_method IN ('bkash', 'bank_transfer')
      AND submitted_payment_ref IS NOT NULL
      AND hold_expires_at IS NULL
      AND (
        (staff_payment_reviewed_by IS NULL AND status = 'application_in_process'
          AND payment_status = 'pending_verification' AND confirmed_at IS NULL AND verified_at IS NULL)
        OR (staff_payment_reviewed_by IS NOT NULL AND status = 'confirmed'
          AND payment_status = 'verified' AND confirmed_at IS NOT NULL AND verified_at IS NOT NULL)
        OR (staff_payment_reviewed_by IS NOT NULL AND status = 'cancelled'
          AND payment_status = 'rejected' AND confirmed_at IS NULL AND verified_at IS NULL)
      )
    )
  );

CREATE INDEX idx_payment_attempts_normalized_trx_id
  ON public.payment_attempts (upper(trim(trx_id)))
  WHERE trx_id IS NOT NULL;

-- Unverified staff references do not consume seats. Preserve legacy and gateway holds.
CREATE OR REPLACE FUNCTION public.count_batch_active_seats(p_batch_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(*)::integer
  FROM public.enrollments e
  WHERE e.batch_id = p_batch_id
    AND (
      e.status IN ('confirmed', 'review_hold')
      OR (e.status = 'application_in_process' AND e.staff_payment_recorded_by IS NULL)
      OR (
        e.status = 'pending'
        AND (e.hold_expires_at IS NULL OR e.hold_expires_at > now())
      )
    );
$$;

REVOKE ALL ON FUNCTION public.count_batch_active_seats(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_batch_active_seats(uuid) TO service_role;

CREATE FUNCTION public.record_staff_manual_enrollment(
  p_actor_id uuid,
  p_batch_id uuid,
  p_expected_updated_at timestamptz,
  p_public_ref text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_answers jsonb,
  p_program_questions_snapshot jsonb,
  p_payment_method text,
  p_payment_ref text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_batch public.batches%ROWTYPE;
  v_course public.courses%ROWTYPE;
  v_email text := lower(trim(p_email));
  v_reference text := upper(trim(p_payment_ref));
  v_existing_id uuid;
  v_enrollment_id uuid;
  v_payable bigint;
BEGIN
  PERFORM 1 FROM public.profiles
  WHERE id = p_actor_id AND role = 'super_admin' AND account_state = 'active'
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'STAFF_ENROLLMENT_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF char_length(trim(coalesce(p_full_name, ''))) NOT BETWEEN 2 AND 120
    OR char_length(coalesce(v_email, '')) NOT BETWEEN 5 AND 160
    OR coalesce(v_email, '') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    OR coalesce(p_phone, '') !~ '^01[3-9][0-9]{8}$'
    OR coalesce(p_public_ref, '') !~ '^LNA-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$'
    OR jsonb_typeof(p_answers) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_program_questions_snapshot) IS DISTINCT FROM 'array'
    OR coalesce(p_payment_method, '') NOT IN ('bkash', 'bank_transfer')
    OR coalesce(v_reference, '') !~ '^[A-Z0-9][A-Z0-9 ./_-]{3,127}$' THEN
    RAISE EXCEPTION 'STAFF_ENROLLMENT_INVALID' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_batch FROM public.batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND OR v_batch.archived_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'BATCH_NOT_FOUND');
  END IF;

  SELECT * INTO v_course FROM public.courses WHERE id = v_batch.course_id FOR SHARE;
  IF v_course.status <> 'published' OR v_course.archived_at IS NOT NULL
    OR v_batch.status <> 'open_for_enrollment'
    OR v_batch.enrollment_opens_at > now()
    OR v_batch.enrollment_closes_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'BATCH_CLOSED');
  END IF;

  v_payable := coalesce(v_batch.discount_fee_poisha, v_batch.fee_poisha);
  IF v_batch.updated_at IS DISTINCT FROM p_expected_updated_at OR v_payable <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'STALE_BATCH');
  END IF;

  -- Expire a stale reservation only if it has no gateway payment still in play.
  WITH expired AS (
    SELECT e.id FROM public.enrollments e
    WHERE e.batch_id = v_batch.id AND lower(e.email::text) = v_email
      AND e.status = 'pending' AND e.hold_expires_at <= now()
      AND NOT EXISTS (
        SELECT 1 FROM public.payment_attempts pa
        WHERE pa.enrollment_id = e.id AND pa.status IN ('initiated', 'pending', 'review_hold', 'validated')
      )
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.enrollments AS e SET status = 'expired'
  FROM expired WHERE e.id = expired.id;

  SELECT e.id INTO v_existing_id
  FROM public.enrollments e
  WHERE e.batch_id = v_batch.id AND lower(e.email::text) = v_email
    AND (
      e.status IN ('application_in_process', 'pending', 'confirmed', 'review_hold')
      OR (e.status = 'expired' AND EXISTS (
        SELECT 1 FROM public.payment_attempts pa
        WHERE pa.enrollment_id = e.id AND pa.status IN ('initiated', 'pending', 'review_hold', 'validated')
      ))
    )
  ORDER BY e.created_at DESC, e.id
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_ENROLLMENT', 'existing_id', v_existing_id);
  END IF;

  INSERT INTO public.enrollments (
    public_ref, course_id, batch_id, full_name, email, phone, answers,
    program_questions_snapshot, payment_method, payment_status, submitted_payment_ref,
    base_fee_poisha, discount_amount_poisha, payable_poisha, status, staff_payment_recorded_by
  ) VALUES (
    p_public_ref, v_course.id, v_batch.id, trim(p_full_name), v_email, p_phone, p_answers,
    p_program_questions_snapshot, p_payment_method, 'pending_verification', v_reference,
    v_batch.fee_poisha, v_batch.fee_poisha - v_payable, v_payable, 'application_in_process', p_actor_id
  )
  RETURNING id INTO v_enrollment_id;

  INSERT INTO public.audit_events (actor_id, actor_role, action, target_entity, target_id, after_state)
  VALUES (p_actor_id, 'super_admin', 'staff_manual_payment_recorded', 'enrollments', v_enrollment_id::text,
    jsonb_build_object('batch_id', v_batch.id, 'payment_method', p_payment_method, 'payable_poisha', v_payable));

  RETURN jsonb_build_object('ok', true, 'enrollment_id', v_enrollment_id, 'outbox_id', NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.record_staff_manual_enrollment(uuid, uuid, timestamptz, text, text, text, text, jsonb, jsonb, text, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_staff_manual_enrollment(uuid, uuid, timestamptz, text, text, text, text, jsonb, jsonb, text, text)
TO service_role;

CREATE FUNCTION public.review_staff_manual_payment(
  p_actor_id uuid,
  p_enrollment_id uuid,
  p_expected_updated_at timestamptz,
  p_decision text,
  p_verified_poisha bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_enrollment public.enrollments%ROWTYPE;
  v_batch public.batches%ROWTYPE;
  v_course public.courses%ROWTYPE;
  v_outbox_id uuid;
  v_reference text;
BEGIN
  PERFORM 1 FROM public.profiles
  WHERE id = p_actor_id AND role = 'super_admin' AND account_state = 'active'
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'STAFF_PAYMENT_REVIEW_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF coalesce(p_decision, '') NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'STAFF_PAYMENT_REVIEW_INVALID' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_enrollment FROM public.enrollments
  WHERE id = p_enrollment_id AND staff_payment_recorded_by IS NOT NULL AND archived_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'REVIEW_UNAVAILABLE');
  END IF;

  -- Same lock order as public intake when it finds a duplicate application.
  SELECT * INTO v_batch FROM public.batches WHERE id = v_enrollment.batch_id FOR UPDATE;
  SELECT * INTO v_enrollment FROM public.enrollments
  WHERE id = p_enrollment_id AND batch_id = v_batch.id AND staff_payment_recorded_by IS NOT NULL
    AND archived_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'REVIEW_UNAVAILABLE');
  END IF;

  IF (p_decision = 'approve' AND v_enrollment.status = 'confirmed')
    OR (p_decision = 'reject' AND v_enrollment.status = 'cancelled') THEN
    RETURN jsonb_build_object('ok', true, 'outbox_id', NULL, 'already_reviewed', true);
  END IF;
  IF v_enrollment.status <> 'application_in_process' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'REVIEW_UNAVAILABLE');
  END IF;
  IF v_enrollment.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RETURN jsonb_build_object('ok', false, 'code', 'STALE_REVIEW');
  END IF;

  IF p_decision = 'reject' THEN
    UPDATE public.enrollments
    SET status = 'cancelled', payment_status = 'rejected', staff_payment_reviewed_by = p_actor_id
    WHERE id = v_enrollment.id;

    INSERT INTO public.audit_events (actor_id, actor_role, action, target_entity, target_id, after_state)
    VALUES (p_actor_id, 'super_admin', 'staff_manual_payment_rejected', 'enrollments', v_enrollment.id::text,
      jsonb_build_object('batch_id', v_batch.id, 'payment_method', v_enrollment.payment_method));
    RETURN jsonb_build_object('ok', true, 'outbox_id', NULL);
  END IF;

  IF p_verified_poisha IS DISTINCT FROM v_enrollment.payable_poisha THEN
    RETURN jsonb_build_object('ok', false, 'code', 'AMOUNT_MISMATCH');
  END IF;

  SELECT * INTO v_course FROM public.courses WHERE id = v_enrollment.course_id FOR SHARE;
  -- A submission received within the intake window can be reviewed after the deadline.
  IF v_batch.archived_at IS NOT NULL
    OR v_batch.status NOT IN ('open_for_enrollment', 'in_progress')
    OR v_course.status <> 'published' OR v_course.archived_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'BATCH_CLOSED');
  END IF;
  IF public.count_batch_active_seats(v_batch.id) >= v_batch.capacity - v_batch.historical_enrolled_count THEN
    RETURN jsonb_build_object('ok', false, 'code', 'BATCH_FULL');
  END IF;

  v_reference := upper(trim(v_enrollment.submitted_payment_ref));
  PERFORM pg_advisory_xact_lock(hashtextextended('lna:payment:' || v_enrollment.payment_method || ':' || v_reference, 0));
  IF EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.payment_method = v_enrollment.payment_method AND e.payment_status = 'verified'
      AND upper(trim(e.submitted_payment_ref)) = v_reference AND e.id <> v_enrollment.id
  ) OR (v_enrollment.payment_method = 'bkash' AND EXISTS (
    SELECT 1 FROM public.payment_attempts pa
    WHERE upper(trim(pa.trx_id)) = v_reference
  )) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_PAYMENT_REFERENCE');
  END IF;

  UPDATE public.enrollments
  SET status = 'confirmed', payment_status = 'verified', staff_payment_reviewed_by = p_actor_id,
      verified_at = now(), confirmed_at = now()
  WHERE id = v_enrollment.id;

  INSERT INTO public.email_outbox (enrollment_id, template, recipient_email, idempotency_key, payload, status)
  VALUES (v_enrollment.id, 'enrollment_confirmed_paid', v_enrollment.email,
    'confirm:' || v_enrollment.id::text,
    jsonb_build_object(
      'public_ref', v_enrollment.public_ref, 'full_name', v_enrollment.full_name,
      'course_title', v_course.title, 'batch_name', v_batch.name,
      'venue', v_batch.venue, 'start_date', v_batch.start_date::text,
      'payable_poisha', v_enrollment.payable_poisha, 'payment_method', v_enrollment.payment_method
    ), 'pending')
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_outbox_id;

  INSERT INTO public.audit_events (actor_id, actor_role, action, target_entity, target_id, after_state)
  VALUES (p_actor_id, 'super_admin', 'staff_manual_payment_approved', 'enrollments', v_enrollment.id::text,
    jsonb_build_object(
      'batch_id', v_batch.id, 'payment_method', v_enrollment.payment_method, 'verified_poisha', p_verified_poisha
    ));

  RETURN jsonb_build_object('ok', true, 'outbox_id', v_outbox_id);
END;
$$;

REVOKE ALL ON FUNCTION public.review_staff_manual_payment(uuid, uuid, timestamptz, text, bigint)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_staff_manual_payment(uuid, uuid, timestamptz, text, bigint)
TO service_role;

-- Preserve hosted gateway validation and include the shared seat and reference rules.
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
  v_remaining_for_this integer;
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
  WHERE id = v_enrollment.course_id;

  IF v_enrollment.staff_payment_recorded_by IS NOT NULL THEN
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
    WHERE id = v_enrollment.id;

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

  -- Capacity guard when hold already expired before completion arrived
  IF v_enrollment.status = 'expired'
     OR (v_enrollment.hold_expires_at IS NOT NULL AND v_enrollment.hold_expires_at <= now()) THEN
    SELECT COUNT(*)::integer INTO v_other_active_seats
    FROM public.enrollments e
    WHERE e.batch_id = v_batch.id
      AND e.id <> v_enrollment.id
      AND (
        e.status IN ('confirmed', 'review_hold')
        OR (e.status = 'application_in_process' AND e.staff_payment_recorded_by IS NULL)
        OR (e.status = 'pending' AND (e.hold_expires_at IS NULL OR e.hold_expires_at > now()))
      );

    v_remaining_for_this := v_batch.capacity - v_batch.historical_enrolled_count - v_other_active_seats;

    IF v_remaining_for_this <= 0 THEN
      UPDATE public.payment_attempts
      SET status = 'review_hold',
          payment_id = coalesce(payment_id, v_pay_id),
          trx_id = v_trx,
          validated_amount_poisha = p_verified_poisha,
          gateway_status_code = v_code,
          gateway_status_message = p_gateway_status_message,
          failure_reason = 'HOLD_EXPIRED_BATCH_FULL'
      WHERE id = v_attempt.id;

      UPDATE public.enrollments
      SET status = 'review_hold',
          payment_status = 'review_hold',
          submitted_payment_ref = v_trx,
          verification_notes = 'Payment completed after seat hold expired and batch reached capacity.'
      WHERE id = v_enrollment.id;

      INSERT INTO public.audit_events (actor_role, action, target_entity, target_id, after_state)
      VALUES (
        'system',
        'payment_expired_hold_batch_full',
        'enrollments',
        v_enrollment.id::text,
        jsonb_build_object('trx_id', v_trx, 'verified_poisha', p_verified_poisha)
      );

      RETURN jsonb_build_object(
        'success', false,
        'status', 'review_hold',
        'reason', 'HOLD_EXPIRED_BATCH_FULL',
        'enrollment_id', v_enrollment.id,
        'public_ref', v_enrollment.public_ref
      );
    END IF;
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

REVOKE ALL ON FUNCTION public.confirm_payment(uuid, text, text, bigint, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment(uuid, text, text, bigint, text, text, text) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
