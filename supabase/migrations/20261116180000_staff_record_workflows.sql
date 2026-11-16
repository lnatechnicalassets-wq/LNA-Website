BEGIN;

-- Course history uses the existing completion records, independently of contact edits.
CREATE FUNCTION public.manage_staff_course_history(
  p_actor uuid, p_student uuid, p_course uuid, p_batch uuid, p_completion uuid, p_completed date
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_completion uuid;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id = p_actor AND role = 'super_admin' AND account_state = 'active' FOR SHARE;
  IF NOT FOUND THEN RAISE insufficient_privilege; END IF;

  SELECT * INTO v_student FROM public.students WHERE id = p_student FOR UPDATE;
  IF NOT FOUND OR v_student.archived_at IS NOT NULL THEN RETURN 'NOT_AVAILABLE'; END IF;
  IF p_completed > current_date THEN RETURN 'INVALID_DATE'; END IF;

  IF p_completion IS NOT NULL THEN
    UPDATE public.student_completions SET completed_on = p_completed
    WHERE id = p_completion AND student_id = p_student RETURNING id INTO v_completion;
    IF NOT FOUND THEN RETURN 'NOT_AVAILABLE'; END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course) THEN RETURN 'INVALID_COURSE'; END IF;
    IF p_batch IS NOT NULL THEN
      PERFORM 1 FROM public.batches WHERE id = p_batch AND course_id = p_course
        AND (status = 'completed' OR end_date <= current_date)
        AND status NOT IN ('draft', 'cancelled') FOR SHARE;
      IF NOT FOUND THEN RETURN 'INVALID_COURSE'; END IF;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.student_enrollment_links link JOIN public.enrollments e ON e.id = link.enrollment_id
      WHERE link.student_id = p_student AND e.course_id = p_course AND e.batch_id IS NOT DISTINCT FROM p_batch
    ) THEN RETURN 'ALREADY_RECORDED'; END IF;

    INSERT INTO public.student_completions (student_id, course_id, batch_id, completed_on, recorded_by)
    VALUES (p_student, p_course, p_batch, p_completed, p_actor)
    ON CONFLICT (student_id, course_id, batch_id) DO NOTHING RETURNING id INTO v_completion;
    IF NOT FOUND THEN RETURN 'ALREADY_RECORDED'; END IF;
  END IF;

  INSERT INTO public.audit_events (actor_id, actor_role, action, target_entity, target_id)
  VALUES (p_actor, 'super_admin', CASE WHEN p_completion IS NULL THEN 'staff_student_course_added'
    ELSE 'staff_student_course_date_updated' END, 'student_completions', v_completion::text);
  RETURN 'OK';
END;
$$;

CREATE FUNCTION public.staff_student_purge_ids(p_student uuid)
RETURNS uuid[] LANGUAGE sql STABLE SET search_path = pg_catalog, public
AS $$
  SELECT ARRAY(
    SELECT e.id FROM public.enrollments e
    WHERE EXISTS (
      SELECT 1 FROM public.student_enrollment_links link WHERE link.enrollment_id = e.id AND link.student_id = p_student
    ) OR EXISTS (
      SELECT 1 FROM public.student_contacts c
      WHERE c.student_id = p_student AND c.email = lower(btrim(e.email::text)) AND c.phone = e.phone
    )
    ORDER BY e.id
  );
$$;

CREATE FUNCTION public.staff_purge_impact(p_kind text, p_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public
AS $$
DECLARE
  v_student uuid;
  v_ids uuid[];
  v_remove_profile boolean := false;
  v_conflict boolean := false;
  v_payments uuid[];
  v_events uuid[];
  v_emails uuid[];
  v_history uuid[];
  v_contacts integer := 0;
  v_status text;
BEGIN
  IF p_kind = 'student' THEN
    SELECT id INTO v_student FROM public.students WHERE id = p_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
    v_ids := public.staff_student_purge_ids(v_student);
    v_remove_profile := true;
    SELECT EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.id = ANY(v_ids)
        AND (
          EXISTS (SELECT 1 FROM public.student_enrollment_links link
                  WHERE link.enrollment_id = e.id AND link.student_id <> v_student)
          OR EXISTS (SELECT 1 FROM public.student_contacts c
                      WHERE c.student_id <> v_student AND c.email = lower(btrim(e.email::text)) AND c.phone = e.phone)
        )
    ) INTO v_conflict;
  ELSIF p_kind = 'admission' THEN
    IF NOT EXISTS (SELECT 1 FROM public.enrollments WHERE id = p_id) THEN
      RETURN jsonb_build_object('status', 'not_found');
    END IF;
    SELECT student_id INTO v_student FROM public.student_enrollment_links WHERE enrollment_id = p_id;
    v_ids := ARRAY[p_id];
    v_remove_profile := v_student IS NOT NULL
      AND public.staff_student_purge_ids(v_student) = v_ids
      AND NOT EXISTS (SELECT 1 FROM public.student_completions WHERE student_id = v_student)
      AND NOT EXISTS (
        SELECT 1 FROM public.audit_events WHERE target_entity = 'students'
          AND target_id = v_student::text AND action = 'staff_student_create'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.enrollments e JOIN public.student_contacts c
          ON c.email = lower(btrim(e.email::text)) AND c.phone = e.phone
        WHERE e.id = p_id AND c.student_id <> v_student
      );
  ELSE
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF v_conflict THEN RETURN jsonb_build_object('status', 'contact_conflict'); END IF;
  IF EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.id = ANY(v_ids) AND public.admission_delete_eligibility(e) <> 'eligible'
  ) THEN RETURN jsonb_build_object('status', 'payment_protected'); END IF;

  SELECT ARRAY(SELECT id FROM public.payment_attempts WHERE enrollment_id = ANY(v_ids) ORDER BY id) INTO v_payments;
  SELECT ARRAY(
    SELECT event.id FROM public.payment_events event WHERE EXISTS (
      SELECT 1 FROM public.payment_attempts attempt WHERE attempt.id = ANY(v_payments) AND (
        event.payment_attempt_id = attempt.id OR (event.payment_attempt_id IS NULL
          AND (event.payment_id = attempt.payment_id OR event.tran_id = attempt.tran_id))
      )
    ) ORDER BY event.id
  ) INTO v_events;
  SELECT ARRAY(SELECT id FROM public.email_outbox WHERE enrollment_id = ANY(v_ids) ORDER BY id) INTO v_emails;
  SELECT ARRAY(
    SELECT id FROM public.student_completions WHERE student_id = v_student AND v_remove_profile ORDER BY id
  ) INTO v_history;
  SELECT count(*)::integer INTO v_contacts FROM public.student_contacts
  WHERE student_id = v_student AND v_remove_profile;

  v_status := CASE WHEN v_remove_profile THEN 'deleted' WHEN v_student IS NOT NULL THEN 'kept' ELSE 'none' END;
  RETURN jsonb_build_object(
    'status', 'eligible',
    'profile', v_status,
    'applications', cardinality(v_ids),
    'paymentRecords', cardinality(v_payments) + cardinality(v_events),
    'emailRecords', cardinality(v_emails),
    'courseRecords', cardinality(v_history),
    'contactRecords', v_contacts,
    'token', md5(jsonb_build_array(p_kind, p_id, v_student, v_status, v_ids, v_payments, v_events, v_emails,
      v_history, v_contacts)::text)
  );
END;
$$;

CREATE FUNCTION public.preview_staff_record_purge(p_actor uuid, p_kind text, p_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_actor AND role = 'super_admin' AND account_state = 'active') THEN
    RAISE insufficient_privilege;
  END IF;
  RETURN public.staff_purge_impact(p_kind, p_id);
END;
$$;

CREATE FUNCTION public.purge_staff_record(
  p_actor uuid, p_kind text, p_id uuid, p_revision timestamptz, p_confirmation text, p_impact_token text
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public SET lock_timeout = '1s'
AS $$
DECLARE
  v_student uuid;
  v_ids uuid[];
  v_impact jsonb;
  v_result text;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id = p_actor AND role = 'super_admin' AND account_state = 'active' FOR SHARE;
  IF NOT FOUND THEN RAISE insufficient_privilege; END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('student', 'admission') THEN RETURN 'NOT_FOUND'; END IF;

  -- Covers applications matched by contact, including concurrent inserts. Reads continue.
  LOCK TABLE public.enrollments IN SHARE ROW EXCLUSIVE MODE NOWAIT;
  IF p_kind = 'student' THEN
    v_student := p_id;
    v_ids := public.staff_student_purge_ids(p_id);
  ELSE
    v_ids := ARRAY[p_id];
    SELECT student_id INTO v_student FROM public.student_enrollment_links WHERE enrollment_id = p_id;
  END IF;
  PERFORM 1 FROM public.students WHERE id = v_student FOR UPDATE NOWAIT;
  PERFORM 1 FROM public.enrollments WHERE id = ANY(v_ids) ORDER BY id FOR UPDATE NOWAIT;
  PERFORM 1 FROM public.payment_attempts WHERE enrollment_id = ANY(v_ids) ORDER BY id FOR UPDATE NOWAIT;

  v_impact := public.staff_purge_impact(p_kind, p_id);
  IF v_impact->>'status' IS DISTINCT FROM 'eligible' THEN RETURN upper(v_impact->>'status'); END IF;
  IF v_impact->>'token' IS DISTINCT FROM p_impact_token THEN RETURN 'IMPACT_CHANGED'; END IF;

  IF p_kind = 'student' THEN
    RETURN public.purge_staff_student(p_actor, p_id, p_revision, p_confirmation);
  END IF;

  v_result := public.purge_staff_admission(p_actor, p_id, p_revision, p_confirmation);
  IF v_result = 'OK' AND v_impact->>'profile' = 'deleted' THEN
    DELETE FROM public.student_contacts WHERE student_id = v_student;
    DELETE FROM public.students WHERE id = v_student;
    INSERT INTO public.audit_events (actor_id, actor_role, action, target_entity)
    VALUES (p_actor, 'super_admin', 'staff_deleted_student', 'students');
  END IF;
  RETURN v_result;
EXCEPTION
  WHEN lock_not_available OR deadlock_detected THEN RETURN 'BUSY';
  WHEN foreign_key_violation THEN RETURN 'PROTECTED';
END;
$$;

REVOKE ALL ON FUNCTION public.manage_staff_course_history(uuid,uuid,uuid,uuid,uuid,date),
  public.staff_student_purge_ids(uuid), public.staff_purge_impact(text,uuid),
  public.preview_staff_record_purge(uuid,text,uuid), public.purge_staff_record(uuid,text,uuid,timestamptz,text,text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.manage_staff_course_history(uuid,uuid,uuid,uuid,uuid,date),
  public.staff_student_purge_ids(uuid), public.staff_purge_impact(text,uuid),
  public.preview_staff_record_purge(uuid,text,uuid), public.purge_staff_record(uuid,text,uuid,timestamptz,text,text)
  TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
