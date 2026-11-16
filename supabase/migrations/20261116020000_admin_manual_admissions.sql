-- Staff may enter an application through the existing enrollment and payment lifecycle.
BEGIN;

CREATE FUNCTION public.create_staff_enrollment(
  p_actor_id uuid,
  p_batch_id uuid,
  p_expected_updated_at timestamptz,
  p_public_ref text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_answers jsonb,
  p_program_questions_snapshot jsonb
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
  v_existing_id uuid;
  v_new_id uuid;
  v_result jsonb;
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
    OR jsonb_typeof(p_program_questions_snapshot) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'STAFF_ENROLLMENT_INVALID' USING ERRCODE = '22023';
  END IF;

  -- Serialize with public reservations and batch edits before inspecting capacity.
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

  IF v_batch.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RETURN jsonb_build_object('ok', false, 'code', 'STALE_BATCH');
  END IF;

  -- Don't wait on an enrollment locked by a retry or callback while holding its batch lock.
  WITH expired AS (
    SELECT id FROM public.enrollments
    WHERE batch_id = v_batch.id AND lower(email::text) = v_email AND status = 'pending'
      AND hold_expires_at <= now()
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.enrollments AS e SET status = 'expired'
  FROM expired WHERE e.id = expired.id;

  SELECT id INTO v_existing_id FROM public.enrollments
  WHERE batch_id = v_batch.id AND lower(email::text) = v_email
    AND status IN ('application_in_process', 'pending', 'confirmed', 'review_hold');
  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', false, 'code', 'DUPLICATE_ENROLLMENT', 'existing_id', v_existing_id
    );
  END IF;

  IF public.count_batch_active_seats(v_batch.id) >= v_batch.capacity - v_batch.historical_enrolled_count THEN
    RETURN jsonb_build_object('ok', false, 'code', 'BATCH_FULL');
  END IF;

  v_payable := coalesce(v_batch.discount_fee_poisha, v_batch.fee_poisha);
  IF v_payable = 0 THEN
    -- Reuse free confirmation and its idempotent confirmation email queue.
    v_result := public.start_enrollment(
      v_course.slug, v_batch.slug, p_public_ref, trim(p_full_name), v_email, p_phone,
      p_answers, p_program_questions_snapshot
    );
    IF v_result ->> 'ok' IS DISTINCT FROM 'true' THEN
      RETURN v_result;
    END IF;
    v_new_id := (v_result ->> 'enrollment_id')::uuid;
  ELSE
    -- The learner continues via the existing public checkout with the same email.
    -- The public checkout creates the actual payment attempt.
    INSERT INTO public.enrollments (
      public_ref, course_id, batch_id, full_name, email, phone, answers,
      program_questions_snapshot, payment_method, payment_status, base_fee_poisha,
      discount_amount_poisha, payable_poisha, status, hold_expires_at
    ) VALUES (
      p_public_ref, v_course.id, v_batch.id, trim(p_full_name), v_email, p_phone, p_answers,
      p_program_questions_snapshot, 'bkash', 'pending_verification', v_batch.fee_poisha,
      v_batch.fee_poisha - v_payable, v_payable, 'pending',
      now() + make_interval(mins => v_batch.seat_hold_duration_minutes)
    )
    RETURNING id INTO v_new_id;
  END IF;

  INSERT INTO public.audit_events (actor_id, actor_role, action, target_entity, target_id, after_state)
  VALUES (
    p_actor_id, 'super_admin', 'staff_created_enrollment', 'enrollments', v_new_id::text,
    jsonb_build_object('batch_id', v_batch.id, 'status', CASE WHEN v_payable = 0 THEN 'confirmed' ELSE 'pending' END)
  );

  RETURN jsonb_build_object('ok', true, 'enrollment_id', v_new_id, 'outbox_id', v_result ->> 'outbox_id');
END;
$$;

REVOKE ALL ON FUNCTION public.create_staff_enrollment(
  uuid, uuid, timestamptz, text, text, text, text, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_staff_enrollment(
  uuid, uuid, timestamptz, text, text, text, text, jsonb, jsonb
) TO service_role;

COMMIT;
