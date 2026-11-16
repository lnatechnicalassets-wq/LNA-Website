BEGIN;

CREATE FUNCTION public.purge_staff_student(
  p_actor_id uuid, p_student_id uuid, p_expected_updated_at timestamptz, p_confirmation text
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
SET lock_timeout = '1s'
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_enrollment_ids uuid[];
  v_mock_attempt_ids uuid[];
BEGIN
  PERFORM 1 FROM public.profiles
  WHERE id = p_actor_id AND role = 'super_admin' AND account_state = 'active'
  FOR SHARE;
  IF NOT FOUND THEN RAISE insufficient_privilege; END IF;

  SELECT * INTO v_student FROM public.students WHERE id = p_student_id FOR UPDATE NOWAIT;
  IF NOT FOUND THEN RETURN 'NOT_FOUND'; END IF;
  IF v_student.updated_at IS DISTINCT FROM p_expected_updated_at THEN RETURN 'STALE'; END IF;
  IF lower(v_student.email) IS DISTINCT FROM lower(btrim(p_confirmation)) THEN
    RETURN 'CONFIRMATION_MISMATCH';
  END IF;

  -- This rare staff operation must also cover unlinked applications. Prevent a
  -- concurrent enrollment insert or contact change from escaping that lookup.
  -- Reads continue, and contention returns a retryable result without deleting.
  LOCK TABLE public.enrollments IN SHARE ROW EXCLUSIVE MODE NOWAIT;

  SELECT ARRAY(
    SELECT e.id
    FROM public.enrollments e
    WHERE EXISTS (
      SELECT 1 FROM public.student_enrollment_links link
      WHERE link.enrollment_id = e.id AND link.student_id = p_student_id
    ) OR EXISTS (
      SELECT 1 FROM public.student_contacts contact
      WHERE contact.student_id = p_student_id
        AND contact.email = lower(btrim(e.email::text)) AND contact.phone = e.phone
    )
    ORDER BY e.id
    FOR UPDATE OF e NOWAIT
  ) INTO v_enrollment_ids;

  IF EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.id = ANY(v_enrollment_ids)
      AND (
        EXISTS (
          SELECT 1 FROM public.student_enrollment_links link
          WHERE link.enrollment_id = e.id AND link.student_id <> p_student_id
        )
        OR EXISTS (
          SELECT 1 FROM public.student_contacts contact
          WHERE contact.student_id <> p_student_id
            AND contact.email = lower(btrim(e.email::text)) AND contact.phone = e.phone
        )
      )
  ) THEN RETURN 'CONTACT_CONFLICT'; END IF;

  -- Match the IDs the local bKash mock derives from its own attempt UUID.
  SELECT ARRAY(
    SELECT attempt.id FROM public.payment_attempts attempt
    WHERE attempt.enrollment_id = ANY(v_enrollment_ids)
      AND attempt.payment_id = 'MOCKPAY-' || upper(left(replace(attempt.id::text, '-', ''), 12))
      AND (attempt.trx_id IS NULL OR attempt.trx_id = 'MOCKTRX' || right(attempt.payment_id, 8))
    ORDER BY attempt.id
    FOR UPDATE OF attempt NOWAIT
  ) INTO v_mock_attempt_ids;

  -- Paid and potentially paid records require independent reconciliation.
  -- Marked fixtures and provably simulated gateway attempts carry no real funds.
  IF EXISTS (
    SELECT 1 FROM public.payment_attempts attempt
    WHERE attempt.enrollment_id = ANY(v_enrollment_ids)
      AND NOT (attempt.id = ANY(v_mock_attempt_ids))
  ) OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.id = ANY(v_enrollment_ids)
      AND NOT e.is_dev_fixture
      AND (
        e.payment_status IN ('verified', 'review_hold') OR e.verified_at IS NOT NULL
        OR e.submitted_payment_ref IS NOT NULL OR e.staff_payment_recorded_by IS NOT NULL
        OR (e.status = 'confirmed' AND e.payable_poisha > 0)
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.payment_attempts attempt
        WHERE attempt.enrollment_id = e.id AND attempt.id = ANY(v_mock_attempt_ids)
          AND attempt.trx_id IS NOT NULL AND e.payment_method = 'bkash'
          AND e.staff_payment_recorded_by IS NULL
          AND upper(btrim(e.submitted_payment_ref)) = attempt.trx_id
      )
  ) THEN RETURN 'PAYMENT_PROTECTED'; END IF;

  DELETE FROM public.payment_events event USING public.payment_attempts attempt
  WHERE attempt.id = ANY(v_mock_attempt_ids)
    AND (event.payment_attempt_id = attempt.id OR (
      event.payment_attempt_id IS NULL
      AND (event.payment_id = attempt.payment_id OR event.tran_id = attempt.tran_id)
    ));
  DELETE FROM public.payment_attempts WHERE id = ANY(v_mock_attempt_ids);
  DELETE FROM public.email_outbox WHERE enrollment_id = ANY(v_enrollment_ids);
  DELETE FROM public.student_enrollment_links WHERE student_id = p_student_id;
  DELETE FROM public.enrollments WHERE id = ANY(v_enrollment_ids);
  DELETE FROM public.student_completions WHERE student_id = p_student_id;
  DELETE FROM public.student_contacts WHERE student_id = p_student_id;
  DELETE FROM public.students WHERE id = p_student_id;

  -- Keep a security audit event about the staff operation without student data.
  INSERT INTO public.audit_events (actor_id, actor_role, action, target_entity)
  VALUES (p_actor_id, 'super_admin', 'staff_deleted_student', 'students');

  RETURN 'OK';
EXCEPTION
  WHEN lock_not_available OR deadlock_detected THEN RETURN 'BUSY';
  WHEN foreign_key_violation THEN RETURN 'PROTECTED';
END;
$$;

REVOKE ALL ON FUNCTION public.purge_staff_student(uuid, uuid, timestamptz, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_staff_student(uuid, uuid, timestamptz, text)
  TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
