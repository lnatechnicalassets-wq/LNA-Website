BEGIN;

-- Keep existing state and payment history if a legacy batch already contains
-- a shared active phone. Mark the extra rows for staff correction.
ALTER TABLE public.enrollments ADD COLUMN legacy_duplicate_phone boolean NOT NULL DEFAULT false;
WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY batch_id, phone
    ORDER BY (status = 'confirmed') DESC, created_at, id
  ) AS position
  FROM public.enrollments
  WHERE status IN ('application_in_process', 'pending', 'confirmed', 'review_hold')
)
UPDATE public.enrollments e SET legacy_duplicate_phone = true
FROM ranked WHERE e.id = ranked.id AND ranked.position > 1;

CREATE UNIQUE INDEX idx_enrollments_active_batch_phone
  ON public.enrollments (batch_id, phone)
  WHERE status IN ('application_in_process', 'pending', 'confirmed', 'review_hold')
    AND NOT legacy_duplicate_phone;
CREATE INDEX idx_enrollments_legacy_batch_phone
  ON public.enrollments (batch_id, phone) WHERE legacy_duplicate_phone;

CREATE FUNCTION public.enforce_active_enrollment_phone() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF new.status NOT IN ('application_in_process', 'pending', 'confirmed', 'review_hold') THEN
    new.legacy_duplicate_phone := false;
    RETURN new;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF old.status IN ('application_in_process', 'pending', 'confirmed', 'review_hold')
      AND new.batch_id = old.batch_id AND new.phone = old.phone
      AND (new.status <> 'confirmed' OR old.status = 'confirmed') THEN
      new.legacy_duplicate_phone := old.legacy_duplicate_phone;
      RETURN new;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.enrollments e WHERE e.batch_id = new.batch_id AND e.phone = new.phone
      AND e.legacy_duplicate_phone AND e.id <> new.id
  ) THEN
    RAISE unique_violation USING
      CONSTRAINT = 'idx_enrollments_active_batch_phone',
      MESSAGE = 'duplicate key value violates unique constraint "idx_enrollments_active_batch_phone"';
  END IF;
  new.legacy_duplicate_phone := false;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_active_enrollment_phone() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_enrollments_active_phone BEFORE INSERT OR UPDATE OF phone, batch_id, status, legacy_duplicate_phone
  ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.enforce_active_enrollment_phone();

CREATE FUNCTION public.manage_staff_enrollment(
  p_actor_id uuid, p_enrollment_id uuid, p_expected_updated_at timestamptz,
  p_operation text, p_name text, p_email text, p_phone text
) RETURNS text
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_enrollment public.enrollments%ROWTYPE;
  v_action text;
BEGIN
  PERFORM 1 FROM public.profiles
  WHERE id = p_actor_id AND role = 'super_admin' AND account_state = 'active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'STAFF_ENROLLMENT_FORBIDDEN' USING ERRCODE = '42501'; END IF;

  SELECT * INTO v_enrollment FROM public.enrollments WHERE id = p_enrollment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'NOT_FOUND'; END IF;
  IF v_enrollment.updated_at IS DISTINCT FROM p_expected_updated_at THEN RETURN 'STALE'; END IF;

  CASE p_operation
    WHEN 'edit' THEN
      IF v_enrollment.archived_at IS NOT NULL THEN RETURN 'ARCHIVED'; END IF;
      IF coalesce(char_length(btrim(p_name)), 0) NOT BETWEEN 2 AND 120
        OR coalesce(char_length(btrim(p_email)), 0) NOT BETWEEN 5 AND 160
        OR btrim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        OR coalesce(p_phone, '') !~ '^01[3-9][0-9]{8}$' THEN RETURN 'INVALID'; END IF;
      IF lower(v_enrollment.email::text) <> lower(btrim(p_email)) AND (
        v_enrollment.status IN ('confirmed', 'review_hold') OR v_enrollment.payment_status = 'verified'
        OR EXISTS (SELECT 1 FROM public.payment_attempts WHERE enrollment_id = p_enrollment_id)
        OR EXISTS (SELECT 1 FROM public.email_outbox WHERE enrollment_id = p_enrollment_id)
      ) THEN RETURN 'EMAIL_LOCKED'; END IF;

      UPDATE public.enrollments
      SET full_name = btrim(p_name), email = lower(btrim(p_email)), phone = p_phone
      WHERE id = p_enrollment_id;
      v_action := 'staff_edited_enrollment_contact';
    WHEN 'archive' THEN
      IF v_enrollment.archived_at IS NOT NULL THEN RETURN 'OK'; END IF;
      UPDATE public.enrollments SET archived_at = now() WHERE id = p_enrollment_id;
      v_action := 'staff_archived_enrollment';
    WHEN 'restore' THEN
      IF v_enrollment.archived_at IS NULL THEN RETURN 'OK'; END IF;
      UPDATE public.enrollments SET archived_at = NULL WHERE id = p_enrollment_id;
      v_action := 'staff_restored_enrollment';
    ELSE RETURN 'INVALID';
  END CASE;

  INSERT INTO public.audit_events (actor_id, actor_role, action, target_entity, target_id, after_state)
  VALUES (p_actor_id, 'super_admin', v_action, 'enrollments', p_enrollment_id::text,
          jsonb_build_object('operation', p_operation));
  RETURN 'OK';
END;
$$;
REVOKE ALL ON FUNCTION public.manage_staff_enrollment(uuid,uuid,timestamptz,text,text,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_staff_enrollment(uuid,uuid,timestamptz,text,text,text,text)
  TO service_role;

CREATE TABLE public.batch_mentors (
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE RESTRICT,
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE RESTRICT,
  display_order integer NOT NULL CHECK (display_order >= 0),
  PRIMARY KEY (batch_id, mentor_id),
  UNIQUE (batch_id, display_order)
);
ALTER TABLE public.batch_mentors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.batch_mentors FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.batch_mentors TO service_role;

CREATE FUNCTION public.set_staff_batch_mentors(
  p_actor_id uuid, p_batch_id uuid, p_expected_updated_at timestamptz, p_mentor_ids uuid[]
) RETURNS text
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_batch public.batches%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.profiles
  WHERE id = p_actor_id AND role = 'super_admin' AND account_state = 'active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'STAFF_CATALOG_FORBIDDEN' USING ERRCODE = '42501'; END IF;

  SELECT * INTO v_batch FROM public.batches WHERE id = p_batch_id AND archived_at IS NULL
    AND status <> 'archived' FOR UPDATE;
  IF NOT FOUND THEN RETURN 'NOT_FOUND'; END IF;
  IF v_batch.updated_at IS DISTINCT FROM p_expected_updated_at THEN RETURN 'STALE'; END IF;
  IF p_mentor_ids IS NULL OR cardinality(p_mentor_ids) > 100
    OR (SELECT count(DISTINCT id) FROM unnest(p_mentor_ids) AS input(id)) <> cardinality(p_mentor_ids)
    OR EXISTS (
      SELECT 1 FROM unnest(p_mentor_ids) AS input(id)
      LEFT JOIN public.mentors m ON m.id = input.id
      WHERE m.id IS NULL OR m.archived_at IS NOT NULL
    ) THEN RETURN 'INVALID'; END IF;

  DELETE FROM public.batch_mentors WHERE batch_id = p_batch_id;
  INSERT INTO public.batch_mentors (batch_id, mentor_id, display_order)
  SELECT p_batch_id, id, ord - 1 FROM unnest(p_mentor_ids) WITH ORDINALITY AS input(id, ord);

  -- Advance the existing optimistic revision when an independent roster is saved.
  UPDATE public.batches SET updated_at = now() WHERE id = p_batch_id;
  INSERT INTO public.audit_events (actor_id, actor_role, action, target_entity, target_id, after_state)
  VALUES (p_actor_id, 'super_admin', 'staff_updated_batch_mentors', 'batches', p_batch_id::text,
          jsonb_build_object('mentor_ids', p_mentor_ids));
  RETURN 'OK';
END;
$$;
REVOKE ALL ON FUNCTION public.set_staff_batch_mentors(uuid,uuid,timestamptz,uuid[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_staff_batch_mentors(uuid,uuid,timestamptz,uuid[])
  TO service_role;

-- Resolve a staff duplicate to an existing record on either contact field.
CREATE OR REPLACE FUNCTION public.record_staff_manual_enrollment(
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
    WHERE e.batch_id = v_batch.id AND (lower(e.email::text) = v_email OR e.phone = p_phone)
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
  WHERE e.batch_id = v_batch.id AND (lower(e.email::text) = v_email OR e.phone = p_phone)
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

ALTER TABLE public.courses ADD COLUMN staff_archived_from_status text
  CHECK (staff_archived_from_status IN ('draft', 'published'));
ALTER TABLE public.batches ADD COLUMN staff_archived_from_status text
  CHECK (staff_archived_from_status IN ('draft', 'upcoming', 'open_for_enrollment', 'in_progress', 'completed', 'cancelled'));

CREATE FUNCTION public.archive_staff_catalog(
  p_actor_id uuid, p_section text, p_record_id uuid, p_expected_updated_at timestamptz, p_restore boolean
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_status text;
  v_next_status text;
  v_previous_status text;
  v_revision timestamptz;
  v_archived_at timestamptz;
BEGIN
  PERFORM 1 FROM public.profiles
  WHERE id = p_actor_id AND role = 'super_admin' AND account_state = 'active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'STAFF_CATALOG_FORBIDDEN' USING ERRCODE = '42501'; END IF;
  IF p_section IS NULL OR p_section NOT IN ('courses', 'batches') OR p_restore IS NULL THEN
    RETURN 'INVALID';
  END IF;

  EXECUTE format('SELECT status, archived_at, updated_at, staff_archived_from_status FROM public.%I WHERE id = $1 FOR UPDATE', p_section)
    INTO v_status, v_archived_at, v_revision, v_previous_status USING p_record_id;
  IF v_revision IS NULL THEN RETURN 'NOT_FOUND'; END IF;
  IF v_revision IS DISTINCT FROM p_expected_updated_at THEN RETURN 'STALE'; END IF;
  IF p_restore THEN
    IF v_status <> 'archived' AND v_archived_at IS NULL THEN RETURN 'OK'; END IF;
    v_next_status := coalesce(v_previous_status, 'draft');
    EXECUTE format('UPDATE public.%I SET status = $2, archived_at = NULL, staff_archived_from_status = NULL WHERE id = $1', p_section)
      USING p_record_id, v_next_status;
  ELSE
    IF v_status = 'archived' OR v_archived_at IS NOT NULL THEN RETURN 'OK'; END IF;
    v_next_status := 'archived';
    EXECUTE format('UPDATE public.%I SET status = $2, archived_at = now(), staff_archived_from_status = $3 WHERE id = $1', p_section)
      USING p_record_id, v_next_status, v_status;
  END IF;
  INSERT INTO public.audit_events (actor_id, actor_role, action, target_entity, target_id, before_state, after_state)
  VALUES (p_actor_id, 'super_admin', CASE WHEN p_restore THEN 'staff_restored_catalog' ELSE 'staff_archived_catalog' END,
           p_section, p_record_id::text, jsonb_build_object('status', v_status), jsonb_build_object('status', v_next_status));
  RETURN 'OK';
END;
$$;
REVOKE ALL ON FUNCTION public.archive_staff_catalog(uuid,text,uuid,timestamptz,boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_staff_catalog(uuid,text,uuid,timestamptz,boolean)
  TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
