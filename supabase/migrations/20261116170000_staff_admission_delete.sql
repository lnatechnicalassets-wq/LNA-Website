BEGIN;

CREATE FUNCTION public.is_mock_admission_payment(p_attempt public.payment_attempts)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, public
AS $$
  SELECT coalesce(
    p_attempt.payment_id = 'MOCKPAY-' || upper(left(replace(p_attempt.id::text, '-', ''), 12))
    AND (p_attempt.trx_id IS NULL OR p_attempt.trx_id = 'MOCKTRX' || right(p_attempt.payment_id, 8)),
    false
  );
$$;

-- Computed field for the staff list and detail. The delete RPC checks it again
-- after locking the enrollment and payment attempts.
CREATE FUNCTION public.admission_delete_eligibility(p_record public.enrollments)
RETURNS text LANGUAGE sql STABLE SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.payment_attempts attempt
      WHERE attempt.enrollment_id = p_record.id AND NOT public.is_mock_admission_payment(attempt)
    ) THEN 'payment_protected'
    WHEN NOT p_record.is_dev_fixture
      AND (
        p_record.payment_status IN ('verified', 'review_hold')
        OR p_record.verified_at IS NOT NULL
        OR p_record.submitted_payment_ref IS NOT NULL
        OR p_record.staff_payment_recorded_by IS NOT NULL
        OR (p_record.status = 'confirmed' AND p_record.payable_poisha > 0)
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.payment_attempts attempt
        WHERE attempt.enrollment_id = p_record.id AND public.is_mock_admission_payment(attempt)
          AND attempt.trx_id IS NOT NULL AND p_record.payment_method = 'bkash'
          AND p_record.staff_payment_recorded_by IS NULL
          AND upper(btrim(p_record.submitted_payment_ref)) = attempt.trx_id
      )
    THEN 'payment_protected'
    ELSE 'eligible'
  END;
$$;

CREATE FUNCTION public.purge_staff_admission(
  p_actor_id uuid, p_enrollment_id uuid, p_expected_updated_at timestamptz, p_confirmation text
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
SET lock_timeout = '1s'
AS $$
DECLARE
  v_record public.enrollments%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.profiles
  WHERE id = p_actor_id AND role = 'super_admin' AND account_state = 'active'
  FOR SHARE;
  IF NOT FOUND THEN RAISE insufficient_privilege; END IF;

  SELECT * INTO v_record FROM public.enrollments WHERE id = p_enrollment_id FOR UPDATE NOWAIT;
  IF NOT FOUND THEN RETURN 'NOT_FOUND'; END IF;
  IF v_record.updated_at IS DISTINCT FROM p_expected_updated_at THEN RETURN 'STALE'; END IF;
  IF v_record.public_ref IS DISTINCT FROM upper(btrim(p_confirmation)) THEN
    RETURN 'CONFIRMATION_MISMATCH';
  END IF;

  -- The enrollment lock prevents new attempts from referencing this row.
  PERFORM 1 FROM public.payment_attempts WHERE enrollment_id = v_record.id
  ORDER BY id FOR UPDATE NOWAIT;
  IF public.admission_delete_eligibility(v_record) <> 'eligible' THEN RETURN 'PAYMENT_PROTECTED'; END IF;

  DELETE FROM public.payment_events event USING public.payment_attempts attempt
  WHERE attempt.enrollment_id = v_record.id
    AND (event.payment_attempt_id = attempt.id OR (
      event.payment_attempt_id IS NULL
      AND (event.payment_id = attempt.payment_id OR event.tran_id = attempt.tran_id)
    ));
  DELETE FROM public.payment_attempts WHERE enrollment_id = v_record.id;
  DELETE FROM public.email_outbox WHERE enrollment_id = v_record.id;
  DELETE FROM public.student_enrollment_links WHERE enrollment_id = v_record.id;
  DELETE FROM public.enrollments WHERE id = v_record.id;

  INSERT INTO public.audit_events (actor_id, actor_role, action, target_entity)
  VALUES (p_actor_id, 'super_admin', 'staff_deleted_admission', 'enrollments');

  RETURN 'OK';
EXCEPTION
  WHEN lock_not_available OR deadlock_detected THEN RETURN 'BUSY';
  WHEN foreign_key_violation THEN RETURN 'PROTECTED';
END;
$$;

REVOKE ALL ON FUNCTION public.is_mock_admission_payment(public.payment_attempts),
  public.admission_delete_eligibility(public.enrollments),
  public.purge_staff_admission(uuid, uuid, timestamptz, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_mock_admission_payment(public.payment_attempts),
  public.admission_delete_eligibility(public.enrollments),
  public.purge_staff_admission(uuid, uuid, timestamptz, text) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
