BEGIN;

CREATE FUNCTION public.can_purge_dev_admission(p_record public.enrollments)
RETURNS boolean LANGUAGE sql STABLE SET search_path = pg_catalog, public
AS $$
  SELECT coalesce(
    p_record.is_dev_fixture
    AND p_record.archived_at IS NOT NULL
    AND p_record.status IN ('application_in_process', 'expired', 'cancelled')
    AND p_record.payment_status IN ('not_required', 'pending_verification')
    AND p_record.submitted_payment_ref IS NULL
    AND p_record.staff_payment_recorded_by IS NULL
    AND p_record.verified_at IS NULL
    AND p_record.confirmed_at IS NULL
    AND p_record.hold_expires_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.payment_attempts AS attempt WHERE attempt.enrollment_id = p_record.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.email_outbox AS message WHERE message.enrollment_id = p_record.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.student_enrollment_links AS link WHERE link.enrollment_id = p_record.id
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.can_purge_dev_admission(public.enrollments)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_purge_dev_admission(public.enrollments) TO service_role;

-- The service role keeps its existing table privileges. This function is the
-- sole deletion path and accepts only an archived, unlinked synthetic fixture.
CREATE FUNCTION public.purge_staff_dev_admission(
  p_actor_id uuid, p_enrollment_id uuid, p_expected_updated_at timestamptz,
  p_confirmation text
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE
  v_record public.enrollments%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.profiles
  WHERE id = p_actor_id AND role = 'super_admin' AND account_state = 'active'
  FOR SHARE;
  IF NOT FOUND THEN RAISE insufficient_privilege; END IF;

  SELECT * INTO v_record FROM public.enrollments WHERE id = p_enrollment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'NOT_FOUND'; END IF;
  IF v_record.updated_at IS DISTINCT FROM p_expected_updated_at THEN RETURN 'STALE'; END IF;
  IF v_record.public_ref IS DISTINCT FROM upper(trim(p_confirmation)) THEN RETURN 'CONFIRMATION_MISMATCH'; END IF;
  IF NOT public.can_purge_dev_admission(v_record) THEN RETURN 'PROTECTED'; END IF;

  DELETE FROM public.enrollments WHERE id = v_record.id;
  INSERT INTO public.audit_events (actor_id, actor_role, action, target_entity, target_id)
  VALUES (p_actor_id, 'super_admin', 'staff_deleted_dev_admission', 'enrollments', v_record.id::text);

  RETURN 'OK';
EXCEPTION WHEN foreign_key_violation THEN
  -- Preserve the record if another relation starts referencing it.
  RETURN 'PROTECTED';
END;
$$;

REVOKE ALL ON FUNCTION public.purge_staff_dev_admission(uuid, uuid, timestamptz, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_staff_dev_admission(uuid, uuid, timestamptz, text)
  TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
