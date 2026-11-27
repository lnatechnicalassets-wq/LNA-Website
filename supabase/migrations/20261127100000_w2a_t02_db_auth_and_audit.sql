-- W2A-T02: Shared database actor validation, scoped redacted audit ledger,
-- and role-specific operational staff RPC authorization (SEC-01, SEC-02, SEC-05, D64, D73).
-- Forward-only additive migration; preserves all historical audit rows and existing RPC signatures.
BEGIN;

-- =============================================================================
-- 1. Additive Audit Schema Enhancements (D73, SEC-05; history-preserving)
-- =============================================================================

ALTER TABLE public.audit_events
  ADD COLUMN reason text,
  ADD COLUMN audit_scope text NOT NULL DEFAULT 'global',
  ADD COLUMN batch_id uuid,
  ADD COLUMN secondary_batch_id uuid;

-- Enforce append-only audit ledger semantics across all roles including service_role.
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.audit_events
  FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.audit_events
  ADD CONSTRAINT audit_events_reason_len CHECK (
    reason IS NULL OR char_length(trim(reason)) <= 500
  ),
  ADD CONSTRAINT audit_events_scope_valid CHECK (
    audit_scope IN ('batch', 'website', 'global')
  ),
  ADD CONSTRAINT audit_events_batch_scope_consistent CHECK (
    (audit_scope = 'batch' AND batch_id IS NOT NULL)
    OR (audit_scope IN ('website', 'global') AND batch_id IS NULL AND secondary_batch_id IS NULL)
  ),
  ADD CONSTRAINT audit_events_distinct_secondary_batch CHECK (
    secondary_batch_id IS NULL OR secondary_batch_id IS DISTINCT FROM batch_id
  );

CREATE INDEX idx_audit_events_scope_created
  ON public.audit_events (audit_scope, created_at DESC);

CREATE INDEX idx_audit_events_batch_created
  ON public.audit_events (batch_id, created_at DESC)
  WHERE batch_id IS NOT NULL;

CREATE INDEX idx_audit_events_secondary_batch_created
  ON public.audit_events (secondary_batch_id, created_at DESC)
  WHERE secondary_batch_id IS NOT NULL;

-- =============================================================================
-- 2. Sensitive-Data Redaction Helper & Trigger (SEC-05)
-- =============================================================================

-- Recursively strips sensitive JSONB keys (snake_case, camelCase, and separator variants
-- including tokens, keys, secrets, passwords, OTP/MFA, cookies, and signature hashes)
-- while preserving legitimate operational fields; does not inspect arbitrary free-text values.
CREATE FUNCTION public.redact_audit_jsonb(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_payload IS NULL THEN
    RETURN NULL;
  END IF;

  CASE jsonb_typeof(p_payload)
    WHEN 'object' THEN
      SELECT coalesce(
        jsonb_object_agg(
          e.key,
          public.redact_audit_jsonb(e.value)
        ),
        '{}'::jsonb
      )
      INTO v_result
      FROM jsonb_each(p_payload) AS e(key, value)
      WHERE regexp_replace(
        regexp_replace(
          regexp_replace(e.key, '([A-Z]+)([A-Z][a-z])', '\1_\2', 'g'),
          '([a-z0-9])([A-Z])',
          '\1_\2',
          'g'
        ),
        '[^a-zA-Z0-9]+',
        '_',
        'g'
      ) !~* '(^|_)(password|passhash|password_hash|encrypted_password|secret|token|access_token|refresh_token|id_token|app_key|api_key|app_secret|private_key|signing_key|hmac_key|encryption_key|credential|credentials|authorization|cookie|cookies|otp|totp|recovery_code|recovery_codes|signature_hash|service_role_key)(_|$)';
      RETURN v_result;

    WHEN 'array' THEN
      SELECT coalesce(
        jsonb_agg(public.redact_audit_jsonb(elem.value)),
        '[]'::jsonb
      )
      INTO v_result
      FROM jsonb_array_elements(p_payload) AS elem(value);
      RETURN v_result;

    ELSE
      RETURN p_payload;
  END CASE;
END;
$$;

REVOKE ALL ON FUNCTION public.redact_audit_jsonb(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redact_audit_jsonb(jsonb)
  TO service_role;

CREATE FUNCTION public.sanitize_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  new.before_state := public.redact_audit_jsonb(new.before_state);
  new.after_state := public.redact_audit_jsonb(new.after_state);
  IF new.reason IS NOT NULL THEN
    new.reason := nullif(btrim(new.reason), '');
  END IF;
  -- Validate batch identifiers at write time without FK ON DELETE RESTRICT so
  -- historical audit rows survive future authorized unused-draft deletion (D08).
  IF new.batch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.batches b WHERE b.id = new.batch_id
  ) THEN
    RAISE EXCEPTION 'AUDIT_EVENT_BATCH_NOT_FOUND' USING ERRCODE = '23503';
  END IF;
  IF new.secondary_batch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.batches b WHERE b.id = new.secondary_batch_id
  ) THEN
    RAISE EXCEPTION 'AUDIT_EVENT_SECONDARY_BATCH_NOT_FOUND' USING ERRCODE = '23503';
  END IF;
  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.sanitize_audit_event()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_audit_events_sanitize
  BEFORE INSERT ON public.audit_events
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_audit_event();

-- =============================================================================
-- 3. Shared Authoritative Database Actor Validation & Audit Helpers (SEC-01/02)
-- =============================================================================

-- Validates staff actor identity, active account state, and authoritative database role
-- under a FOR SHARE row lock on public.profiles so concurrent deactivation commits
-- serialize deterministically and fail closed on the next or overlapping write.
CREATE FUNCTION public.require_staff_actor(
  p_actor_id uuid,
  p_allowed_roles text[],
  p_error_code text DEFAULT 'STAFF_FORBIDDEN'
)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role text;
  v_account_state text;
BEGIN
  IF p_actor_id IS NULL
    OR p_allowed_roles IS NULL
    OR cardinality(p_allowed_roles) = 0
    OR array_position(p_allowed_roles, NULL::text) IS NOT NULL THEN
    RAISE EXCEPTION '%', coalesce(nullif(p_error_code, ''), 'STAFF_FORBIDDEN')
      USING ERRCODE = '42501';
  END IF;

  SELECT role, account_state
  INTO v_role, v_account_state
  FROM public.profiles
  WHERE id = p_actor_id
  FOR SHARE;

  IF NOT FOUND
    OR v_account_state IS DISTINCT FROM 'active'
    OR v_role IS NULL
    OR v_role NOT IN ('admin', 'super_admin')
    OR (v_role = ANY(p_allowed_roles)) IS NOT TRUE THEN
    RAISE EXCEPTION '%', coalesce(nullif(p_error_code, ''), 'STAFF_FORBIDDEN')
      USING ERRCODE = '42501';
  END IF;

  RETURN v_role;
END;
$$;

REVOKE ALL ON FUNCTION public.require_staff_actor(uuid, text[], text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.require_staff_actor(uuid, text[], text)
  TO service_role;

-- Read-only (STABLE) actor validation helper for non-volatile preview/query functions
-- where FOR SHARE locking is disallowed by PostgreSQL.
CREATE FUNCTION public.is_staff_actor_authorized(
  p_actor_id uuid,
  p_allowed_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
  SELECT coalesce(
    p_actor_id IS NOT NULL
    AND p_allowed_roles IS NOT NULL
    AND cardinality(p_allowed_roles) > 0
    AND array_position(p_allowed_roles, NULL::text) IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = p_actor_id
        AND p.account_state = 'active'
        AND p.role IN ('admin', 'super_admin')
        AND (p.role = ANY(p_allowed_roles)) IS TRUE
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_staff_actor_authorized(uuid, text[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_actor_authorized(uuid, text[])
  TO service_role;

-- Shared atomic scoped audit writer that derives actor_role from require_staff_actor()
-- and never accepts caller-supplied role strings.
CREATE FUNCTION public.record_staff_audit_event(
  p_actor_id uuid,
  p_allowed_roles text[],
  p_action text,
  p_target_entity text,
  p_target_id text,
  p_audit_scope text DEFAULT 'global',
  p_batch_id uuid DEFAULT NULL,
  p_secondary_batch_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_before_state jsonb DEFAULT NULL,
  p_after_state jsonb DEFAULT NULL,
  p_error_code text DEFAULT 'STAFF_FORBIDDEN'
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_role text;
  v_audit_id uuid;
BEGIN
  v_actor_role := public.require_staff_actor(p_actor_id, p_allowed_roles, p_error_code);

  INSERT INTO public.audit_events (
    actor_id,
    actor_role,
    action,
    target_entity,
    target_id,
    audit_scope,
    batch_id,
    secondary_batch_id,
    reason,
    before_state,
    after_state
  ) VALUES (
    p_actor_id,
    v_actor_role,
    p_action,
    p_target_entity,
    p_target_id,
    coalesce(p_audit_scope, 'global'),
    p_batch_id,
    p_secondary_batch_id,
    nullif(btrim(p_reason), ''),
    p_before_state,
    p_after_state
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_staff_audit_event(
  uuid, text[], text, text, text, text, uuid, uuid, text, jsonb, jsonb, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_staff_audit_event(
  uuid, text[], text, text, text, text, uuid, uuid, text, jsonb, jsonb, text
) TO service_role;

-- =============================================================================
-- 4. Operational Staff RPC Refactors (Approved Admin + Super Admin Matrix)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_admin_catalog_record(
  p_actor_id uuid,
  p_section text,
  p_record_id uuid,
  p_expected_updated_at timestamptz,
  p_values jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_role text;
  v_course public.courses%ROWTYPE;
  v_batch public.batches%ROWTYPE;
  v_before jsonb;
  v_after jsonb;
  v_capacity integer;
  v_fee bigint;
  v_discount bigint;
BEGIN
  v_actor_role := public.require_staff_actor(
    p_actor_id, ARRAY['admin', 'super_admin'], 'CATALOG_EDIT_FORBIDDEN'
  );

  IF p_section = 'courses' THEN
    SELECT * INTO v_course FROM public.courses WHERE id = p_record_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'CATALOG_EDIT_MISSING'; END IF;
    IF v_course.status = 'archived' OR v_course.archived_at IS NOT NULL THEN
      RAISE EXCEPTION 'CATALOG_EDIT_ARCHIVED';
    END IF;
    IF v_course.updated_at IS DISTINCT FROM p_expected_updated_at THEN
      RAISE EXCEPTION 'CATALOG_EDIT_STALE';
    END IF;

    v_before := to_jsonb(v_course);
    UPDATE public.courses SET
      title = p_values ->> 'title',
      subtitle = p_values ->> 'subtitle',
      category = p_values ->> 'category',
      summary = p_values ->> 'summary',
      description = p_values ->> 'description',
      venue = p_values ->> 'venue'
    WHERE id = p_record_id
    RETURNING to_jsonb(courses) INTO v_after;

  ELSIF p_section = 'batches' THEN
    SELECT * INTO v_batch FROM public.batches WHERE id = p_record_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'CATALOG_EDIT_MISSING'; END IF;
    IF v_batch.status = 'archived' OR v_batch.archived_at IS NOT NULL THEN
      RAISE EXCEPTION 'CATALOG_EDIT_ARCHIVED';
    END IF;
    IF v_batch.updated_at IS DISTINCT FROM p_expected_updated_at THEN
      RAISE EXCEPTION 'CATALOG_EDIT_STALE';
    END IF;

    v_capacity := (p_values ->> 'capacity')::integer;
    v_fee := (p_values ->> 'fee_poisha')::bigint;
    v_discount := (p_values ->> 'discount_fee_poisha')::bigint;
    IF v_capacity IS DISTINCT FROM v_batch.capacity
      AND v_capacity::bigint < v_batch.historical_enrolled_count::bigint
        + public.count_batch_active_seats(v_batch.id) THEN
      RAISE EXCEPTION 'CATALOG_EDIT_CAPACITY';
    END IF;
    IF v_fee > 9007199254740991 THEN
      RAISE EXCEPTION 'CATALOG_EDIT_FEE';
    END IF;

    v_before := to_jsonb(v_batch);
    UPDATE public.batches SET
      name = p_values ->> 'name',
      start_date = (p_values ->> 'start_date')::date,
      end_date = (p_values ->> 'end_date')::date,
      schedule_description = p_values ->> 'schedule_description',
      venue = p_values ->> 'venue',
      capacity = v_capacity,
      fee_poisha = v_fee,
      discount_fee_poisha = v_discount
    WHERE id = p_record_id
    RETURNING to_jsonb(batches) INTO v_after;

  ELSE
    RAISE EXCEPTION 'CATALOG_EDIT_INVALID_SECTION';
  END IF;

  INSERT INTO public.audit_events (
    actor_id, actor_role, action, target_entity, target_id,
    audit_scope, batch_id, reason, before_state, after_state
  ) VALUES (
    p_actor_id, v_actor_role, 'catalog_edit', p_section, p_record_id::text,
    CASE WHEN p_section = 'batches' THEN 'batch' ELSE 'global' END,
    CASE WHEN p_section = 'batches' THEN p_record_id ELSE NULL END,
    nullif(btrim(p_values ->> 'reason'), ''),
    v_before, v_after
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_admin_catalog_draft(
  p_actor_id uuid,
  p_section text,
  p_values jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_provenance constant jsonb := '{"class":"B","verified":false,"source":"Staff catalog draft"}';
  v_actor_role text;
  v_course_id uuid;
  v_course_slug text;
  v_batch_number integer;
  v_fee bigint;
  v_id uuid;
  v_after jsonb;
  v_constraint text;
BEGIN
  v_actor_role := public.require_staff_actor(
    p_actor_id, ARRAY['admin', 'super_admin'], 'CATALOG_CREATE_FORBIDDEN'
  );

  IF p_section = 'courses' THEN
    IF char_length(p_values ->> 'slug') > 100
      OR (p_values ->> 'slug') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
      RAISE EXCEPTION 'CATALOG_CREATE_INVALID_SLUG' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.courses (
      slug, title, subtitle, category, summary, description, venue, status, provenance
    ) VALUES (
      p_values ->> 'slug', p_values ->> 'title', p_values ->> 'subtitle',
      p_values ->> 'category', p_values ->> 'summary', p_values ->> 'description',
      p_values ->> 'venue', 'draft', v_provenance
    )
    RETURNING id, to_jsonb(courses) INTO v_id, v_after;

  ELSIF p_section = 'batches' THEN
    v_course_id := (p_values ->> 'course_id')::uuid;
    SELECT slug INTO v_course_slug FROM public.courses
    WHERE id = v_course_id AND status IN ('draft', 'published') AND archived_at IS NULL
    FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'CATALOG_CREATE_COURSE_UNAVAILABLE';
    END IF;

    v_batch_number := (p_values ->> 'batch_number')::integer;
    v_fee := (p_values ->> 'fee_poisha')::bigint;
    IF v_fee > 9007199254740991 THEN
      RAISE EXCEPTION 'CATALOG_CREATE_FEE' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.batches (
      course_id, slug, batch_number, name, start_date, end_date, schedule_description,
      venue, capacity, fee_poisha, discount_fee_poisha, status, provenance
    ) VALUES (
      v_course_id, v_course_slug || '-batch-' || v_batch_number, v_batch_number,
      p_values ->> 'name', (p_values ->> 'start_date')::date, (p_values ->> 'end_date')::date,
      p_values ->> 'schedule_description', p_values ->> 'venue', (p_values ->> 'capacity')::integer,
      v_fee, (p_values ->> 'discount_fee_poisha')::bigint, 'draft', v_provenance
    )
    RETURNING id, to_jsonb(batches) INTO v_id, v_after;

  ELSE
    RAISE EXCEPTION 'CATALOG_CREATE_INVALID_SECTION' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.audit_events (
    actor_id, actor_role, action, target_entity, target_id,
    audit_scope, batch_id, reason, after_state
  ) VALUES (
    p_actor_id, v_actor_role, 'catalog_create', p_section, v_id::text,
    CASE WHEN p_section = 'batches' THEN 'batch' ELSE 'global' END,
    CASE WHEN p_section = 'batches' THEN v_id ELSE NULL END,
    nullif(btrim(p_values ->> 'reason'), ''),
    v_after
  );

EXCEPTION WHEN unique_violation THEN
  GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
  IF v_constraint = 'courses_slug_key' THEN
    RAISE EXCEPTION 'CATALOG_CREATE_COURSE_SLUG' USING ERRCODE = '23505';
  ELSIF v_constraint IN ('batches_course_batch_number_unique', 'batches_slug_key') THEN
    RAISE EXCEPTION 'CATALOG_CREATE_BATCH_NUMBER' USING ERRCODE = '23505';
  END IF;
  RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_admin_catalog_draft(
  p_actor_id uuid,
  p_section text,
  p_record_id uuid,
  p_expected_updated_at timestamptz
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_role text;
  v_course public.courses%ROWTYPE;
  v_batch public.batches%ROWTYPE;
  v_course_slug text;
  v_before jsonb;
  v_after jsonb;
BEGIN
  v_actor_role := public.require_staff_actor(
    p_actor_id, ARRAY['admin', 'super_admin'], 'CATALOG_PUBLISH_FORBIDDEN'
  );

  IF p_section = 'courses' THEN
    SELECT * INTO v_course FROM public.courses WHERE id = p_record_id FOR UPDATE;
    IF NOT FOUND OR v_course.status <> 'draft' OR v_course.archived_at IS NOT NULL
      OR v_course.updated_at IS DISTINCT FROM p_expected_updated_at THEN
      RAISE EXCEPTION 'CATALOG_PUBLISH_STALE';
    END IF;

    v_course_slug := v_course.slug;
    v_before := to_jsonb(v_course);
    UPDATE public.courses SET status = 'published', published_at = now()
    WHERE id = p_record_id
    RETURNING to_jsonb(courses) INTO v_after;

  ELSIF p_section = 'batches' THEN
    SELECT * INTO v_batch FROM public.batches WHERE id = p_record_id FOR UPDATE;
    IF NOT FOUND OR v_batch.status <> 'draft' OR v_batch.archived_at IS NOT NULL
      OR v_batch.updated_at IS DISTINCT FROM p_expected_updated_at THEN
      RAISE EXCEPTION 'CATALOG_PUBLISH_STALE';
    END IF;

    SELECT slug INTO v_course_slug FROM public.courses
    WHERE id = v_batch.course_id AND status = 'published' AND archived_at IS NULL
    FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'CATALOG_PUBLISH_PARENT';
    END IF;

    v_before := to_jsonb(v_batch);
    UPDATE public.batches SET status = 'upcoming'
    WHERE id = p_record_id
    RETURNING to_jsonb(batches) INTO v_after;

  ELSE
    RAISE EXCEPTION 'CATALOG_PUBLISH_INVALID_SECTION' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.audit_events (
    actor_id, actor_role, action, target_entity, target_id,
    audit_scope, batch_id, before_state, after_state
  ) VALUES (
    p_actor_id, v_actor_role, 'catalog_publish', p_section, p_record_id::text,
    CASE WHEN p_section = 'batches' THEN 'batch' ELSE 'global' END,
    CASE WHEN p_section = 'batches' THEN p_record_id ELSE NULL END,
    v_before, v_after
  );

  RETURN v_course_slug;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_staff_catalog(
  p_actor_id uuid, p_section text, p_record_id uuid, p_expected_updated_at timestamptz, p_restore boolean
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_role text;
  v_status text;
  v_next_status text;
  v_previous_status text;
  v_revision timestamptz;
  v_archived_at timestamptz;
BEGIN
  v_actor_role := public.require_staff_actor(
    p_actor_id, ARRAY['admin', 'super_admin'], 'STAFF_CATALOG_FORBIDDEN'
  );
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

  INSERT INTO public.audit_events (
    actor_id, actor_role, action, target_entity, target_id,
    audit_scope, batch_id, before_state, after_state
  ) VALUES (
    p_actor_id, v_actor_role,
    CASE WHEN p_restore THEN 'staff_restored_catalog' ELSE 'staff_archived_catalog' END,
    p_section, p_record_id::text,
    CASE WHEN p_section = 'batches' THEN 'batch' ELSE 'global' END,
    CASE WHEN p_section = 'batches' THEN p_record_id ELSE NULL END,
    jsonb_build_object('status', v_status),
    jsonb_build_object('status', v_next_status)
  );
  RETURN 'OK';
END;
$$;

CREATE OR REPLACE FUNCTION public.set_staff_batch_mentors(
  p_actor_id uuid, p_batch_id uuid, p_expected_updated_at timestamptz, p_mentor_ids uuid[]
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_role text;
  v_batch public.batches%ROWTYPE;
  v_before_ids uuid[];
BEGIN
  v_actor_role := public.require_staff_actor(
    p_actor_id, ARRAY['admin', 'super_admin'], 'STAFF_CATALOG_FORBIDDEN'
  );

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

  SELECT coalesce(array_agg(bm.mentor_id ORDER BY bm.display_order), '{}'::uuid[])
  INTO v_before_ids
  FROM public.batch_mentors bm
  WHERE bm.batch_id = p_batch_id;

  DELETE FROM public.batch_mentors WHERE batch_id = p_batch_id;
  INSERT INTO public.batch_mentors (batch_id, mentor_id, display_order)
  SELECT p_batch_id, id, ord - 1 FROM unnest(p_mentor_ids) WITH ORDINALITY AS input(id, ord);

  UPDATE public.batches SET updated_at = now() WHERE id = p_batch_id;
  INSERT INTO public.audit_events (
    actor_id, actor_role, action, target_entity, target_id,
    audit_scope, batch_id, before_state, after_state
  ) VALUES (
    p_actor_id, v_actor_role, 'staff_updated_batch_mentors', 'batches', p_batch_id::text,
    'batch', p_batch_id,
    jsonb_build_object('mentor_ids', v_before_ids),
    jsonb_build_object('mentor_ids', p_mentor_ids)
  );
  RETURN 'OK';
END;
$$;

CREATE OR REPLACE FUNCTION public.create_staff_enrollment(
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
  v_actor_role text;
  v_batch public.batches%ROWTYPE;
  v_course public.courses%ROWTYPE;
  v_email text := lower(trim(p_email));
  v_existing_id uuid;
  v_new_id uuid;
  v_result jsonb;
  v_payable bigint;
BEGIN
  v_actor_role := public.require_staff_actor(
    p_actor_id, ARRAY['admin', 'super_admin'], 'STAFF_ENROLLMENT_FORBIDDEN'
  );

  IF char_length(trim(coalesce(p_full_name, ''))) NOT BETWEEN 2 AND 120
    OR char_length(coalesce(v_email, '')) NOT BETWEEN 5 AND 160
    OR coalesce(v_email, '') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    OR coalesce(p_phone, '') !~ '^01[3-9][0-9]{8}$'
    OR coalesce(p_public_ref, '') !~ '^LNA-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$'
    OR jsonb_typeof(p_answers) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_program_questions_snapshot) IS DISTINCT FROM 'array' THEN
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

  IF v_batch.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RETURN jsonb_build_object('ok', false, 'code', 'STALE_BATCH');
  END IF;

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
    v_result := public.start_enrollment(
      v_course.slug, v_batch.slug, p_public_ref, trim(p_full_name), v_email, p_phone,
      p_answers, p_program_questions_snapshot
    );
    IF v_result ->> 'ok' IS DISTINCT FROM 'true' THEN
      RETURN v_result;
    END IF;
    v_new_id := (v_result ->> 'enrollment_id')::uuid;
  ELSE
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

  INSERT INTO public.audit_events (
    actor_id, actor_role, action, target_entity, target_id,
    audit_scope, batch_id, after_state
  ) VALUES (
    p_actor_id, v_actor_role, 'staff_created_enrollment', 'enrollments', v_new_id::text,
    'batch', v_batch.id,
    jsonb_build_object('batch_id', v_batch.id, 'status', CASE WHEN v_payable = 0 THEN 'confirmed' ELSE 'pending' END)
  );

  RETURN jsonb_build_object('ok', true, 'enrollment_id', v_new_id, 'outbox_id', v_result ->> 'outbox_id');
END;
$$;

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
  v_actor_role text;
  v_batch public.batches%ROWTYPE;
  v_course public.courses%ROWTYPE;
  v_email text := lower(trim(p_email));
  v_reference text := upper(trim(p_payment_ref));
  v_existing_id uuid;
  v_enrollment_id uuid;
  v_payable bigint;
BEGIN
  v_actor_role := public.require_staff_actor(
    p_actor_id, ARRAY['admin', 'super_admin'], 'STAFF_ENROLLMENT_FORBIDDEN'
  );

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

  INSERT INTO public.audit_events (
    actor_id, actor_role, action, target_entity, target_id,
    audit_scope, batch_id, after_state
  ) VALUES (
    p_actor_id, v_actor_role, 'staff_manual_payment_recorded', 'enrollments', v_enrollment_id::text,
    'batch', v_batch.id,
    jsonb_build_object('batch_id', v_batch.id, 'payment_method', p_payment_method, 'payable_poisha', v_payable)
  );

  RETURN jsonb_build_object('ok', true, 'enrollment_id', v_enrollment_id, 'outbox_id', NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.review_staff_manual_payment(
  p_actor_id uuid,
  p_enrollment_id uuid,
  p_expected_updated_at timestamptz,
  p_decision text,
  p_verified_poisha bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_actor_role text;
  v_enrollment public.enrollments%ROWTYPE;
  v_batch public.batches%ROWTYPE;
  v_course public.courses%ROWTYPE;
  v_outbox_id uuid;
  v_reference text;
  v_before jsonb;
BEGIN
  v_actor_role := public.require_staff_actor(
    p_actor_id, ARRAY['admin', 'super_admin'], 'STAFF_PAYMENT_REVIEW_FORBIDDEN'
  );
  IF coalesce(p_decision, '') NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'STAFF_PAYMENT_REVIEW_INVALID' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_enrollment FROM public.enrollments
  WHERE id = p_enrollment_id AND (staff_payment_recorded_by IS NOT NULL OR applicant_payment_submitted) AND archived_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'REVIEW_UNAVAILABLE');
  END IF;

  SELECT * INTO v_batch FROM public.batches WHERE id = v_enrollment.batch_id FOR UPDATE;
  SELECT * INTO v_enrollment FROM public.enrollments
  WHERE id = p_enrollment_id AND batch_id = v_batch.id AND (staff_payment_recorded_by IS NOT NULL OR applicant_payment_submitted)
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

  v_before := jsonb_build_object(
    'status', v_enrollment.status,
    'payment_status', v_enrollment.payment_status
  );

  IF p_decision = 'reject' THEN
    UPDATE public.enrollments
    SET status = 'cancelled', payment_status = 'rejected', staff_payment_reviewed_by = p_actor_id
    WHERE id = v_enrollment.id;

    INSERT INTO public.audit_events (
      actor_id, actor_role, action, target_entity, target_id,
      audit_scope, batch_id, before_state, after_state
    ) VALUES (
      p_actor_id, v_actor_role, 'staff_manual_payment_rejected', 'enrollments', v_enrollment.id::text,
      'batch', v_batch.id,
      v_before,
      jsonb_build_object(
        'batch_id', v_batch.id, 'payment_method', v_enrollment.payment_method,
        'status', 'cancelled', 'payment_status', 'rejected'
      )
    );
    RETURN jsonb_build_object('ok', true, 'outbox_id', NULL);
  END IF;

  IF p_verified_poisha IS DISTINCT FROM v_enrollment.payable_poisha THEN
    RETURN jsonb_build_object('ok', false, 'code', 'AMOUNT_MISMATCH');
  END IF;

  SELECT * INTO v_course FROM public.courses WHERE id = v_enrollment.course_id FOR SHARE;
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

  INSERT INTO public.audit_events (
    actor_id, actor_role, action, target_entity, target_id,
    audit_scope, batch_id, before_state, after_state
  ) VALUES (
    p_actor_id, v_actor_role, 'staff_manual_payment_approved', 'enrollments', v_enrollment.id::text,
    'batch', v_batch.id,
    v_before,
    jsonb_build_object(
      'batch_id', v_batch.id, 'payment_method', v_enrollment.payment_method,
      'status', 'confirmed', 'payment_status', 'verified', 'verified_poisha', p_verified_poisha
    )
  );

  RETURN jsonb_build_object('ok', true, 'outbox_id', v_outbox_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.manage_staff_enrollment(
  p_actor_id uuid, p_enrollment_id uuid, p_expected_updated_at timestamptz,
  p_operation text, p_name text, p_email text, p_phone text
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_role text;
  v_enrollment public.enrollments%ROWTYPE;
  v_action text;
  v_before jsonb;
  v_after jsonb;
  v_changed_fields text[];
BEGIN
  v_actor_role := public.require_staff_actor(
    p_actor_id, ARRAY['admin', 'super_admin'], 'STAFF_ENROLLMENT_FORBIDDEN'
  );

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

      v_changed_fields := array_remove(ARRAY[
        CASE WHEN v_enrollment.full_name IS DISTINCT FROM btrim(p_name) THEN 'full_name' END,
        CASE WHEN lower(v_enrollment.email::text) IS DISTINCT FROM lower(btrim(p_email)) THEN 'email' END,
        CASE WHEN v_enrollment.phone IS DISTINCT FROM p_phone THEN 'phone' END
      ], NULL);

      v_before := jsonb_build_object('status', v_enrollment.status, 'archived_at', v_enrollment.archived_at);
      UPDATE public.enrollments
      SET full_name = btrim(p_name), email = lower(btrim(p_email)), phone = p_phone
      WHERE id = p_enrollment_id;
      v_action := 'staff_edited_enrollment_contact';
      v_after := jsonb_build_object('operation', p_operation, 'changed_fields', v_changed_fields);
    WHEN 'archive' THEN
      IF v_enrollment.archived_at IS NOT NULL THEN RETURN 'OK'; END IF;
      v_before := jsonb_build_object('archived_at', v_enrollment.archived_at);
      UPDATE public.enrollments SET archived_at = now() WHERE id = p_enrollment_id;
      v_action := 'staff_archived_enrollment';
      v_after := jsonb_build_object('operation', p_operation, 'archived', true);
    WHEN 'restore' THEN
      IF v_enrollment.archived_at IS NULL THEN RETURN 'OK'; END IF;
      v_before := jsonb_build_object('archived_at', v_enrollment.archived_at);
      UPDATE public.enrollments SET archived_at = NULL WHERE id = p_enrollment_id;
      v_action := 'staff_restored_enrollment';
      v_after := jsonb_build_object('operation', p_operation, 'archived', false);
    ELSE RETURN 'INVALID';
  END CASE;

  INSERT INTO public.audit_events (
    actor_id, actor_role, action, target_entity, target_id,
    audit_scope, batch_id, before_state, after_state
  ) VALUES (
    p_actor_id, v_actor_role, v_action, 'enrollments', p_enrollment_id::text,
    'batch', v_enrollment.batch_id, v_before, v_after
  );
  RETURN 'OK';
END;
$$;

CREATE OR REPLACE FUNCTION public.manage_staff_student(
  p_actor uuid, p_operation text, p_id uuid, p_revision timestamptz,
  p_name text, p_email text, p_phone text, p_university text,
  p_course uuid, p_batch uuid, p_completed date
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_role text;
  v_existing public.students%ROWTYPE;
  v_id uuid := p_id;
  v_claim uuid;
  v_email text := lower(trim(p_email));
  v_before jsonb;
  v_after jsonb;
  v_audit_scope text := 'global';
  v_audit_batch uuid := NULL;
BEGIN
  v_actor_role := public.require_staff_actor(
    p_actor, ARRAY['admin', 'super_admin'], 'STAFF_STUDENT_FORBIDDEN'
  );
  IF coalesce(p_operation, '') NOT IN ('create', 'edit', 'archive', 'restore') THEN RETURN 'INVALID'; END IF;

  IF p_operation IN ('create', 'edit') THEN
    IF coalesce(char_length(trim(p_name)), 0) NOT BETWEEN 2 AND 120
      OR coalesce(char_length(v_email), 0) NOT BETWEEN 5 AND 160
      OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      OR coalesce(p_phone, '') !~ '^01[3-9][0-9]{8}$'
      OR char_length(p_university) > 200
      OR p_completed > current_date
      OR ((p_batch IS NOT NULL OR p_completed IS NOT NULL) AND p_course IS NULL)
    THEN RETURN 'INVALID'; END IF;
    IF p_course IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course) THEN RETURN 'INVALID'; END IF;
    IF p_batch IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.batches WHERE id = p_batch AND course_id = p_course
        AND (status = 'completed' OR end_date <= current_date)
        AND status NOT IN ('draft', 'cancelled')
    ) THEN RETURN 'INVALID'; END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('lna:student:' || v_email || ':' || p_phone, 0));
    SELECT student_id INTO v_claim FROM public.student_contacts WHERE email = v_email AND phone = p_phone;
    IF v_claim IS NOT NULL AND (p_operation = 'create' OR v_claim IS DISTINCT FROM p_id) THEN RETURN 'DUPLICATE'; END IF;
  END IF;

  IF p_operation <> 'create' THEN
    SELECT * INTO v_existing FROM public.students WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN RETURN 'NOT_FOUND'; END IF;
    IF v_existing.updated_at IS DISTINCT FROM p_revision THEN RETURN 'STALE'; END IF;
    v_before := jsonb_build_object(
      'university', v_existing.university,
      'archived_at', v_existing.archived_at
    );
  END IF;

  IF p_operation IN ('create', 'edit') THEN
    IF p_operation = 'edit' AND v_existing.archived_at IS NOT NULL THEN RETURN 'INVALID'; END IF;
    IF p_course IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.student_completions WHERE student_id = v_id AND course_id = p_course
        AND batch_id IS NOT DISTINCT FROM p_batch
    ) THEN RETURN 'ALREADY_RECORDED'; END IF;

    IF p_operation = 'create' THEN
      INSERT INTO public.students (full_name, email, phone, university)
      VALUES (trim(p_name), v_email, p_phone, nullif(trim(p_university), '')) RETURNING id INTO v_id;
    ELSE
      UPDATE public.students SET full_name = trim(p_name), email = v_email, phone = p_phone,
        university = nullif(trim(p_university), '') WHERE id = v_id;
    END IF;
    INSERT INTO public.student_contacts (email, phone, student_id) VALUES (v_email, p_phone, v_id)
      ON CONFLICT (email, phone) DO NOTHING;
    IF p_course IS NOT NULL THEN
      INSERT INTO public.student_completions (student_id, course_id, batch_id, completed_on, recorded_by)
      VALUES (v_id, p_course, p_batch, p_completed, p_actor);
      IF p_batch IS NOT NULL THEN
        v_audit_scope := 'batch';
        v_audit_batch := p_batch;
      END IF;
    END IF;
    v_after := jsonb_build_object(
      'recorded_course', p_course,
      'recorded_batch', CASE WHEN p_course IS NOT NULL THEN p_batch ELSE NULL END
    );
  ELSE
    UPDATE public.students SET archived_at = CASE WHEN p_operation = 'archive' THEN coalesce(archived_at, now()) END
      WHERE id = v_id;
    v_after := jsonb_build_object('archived', p_operation = 'archive');
  END IF;

  INSERT INTO public.audit_events (
    actor_id, actor_role, action, target_entity, target_id,
    audit_scope, batch_id, before_state, after_state
  ) VALUES (
    p_actor, v_actor_role, 'staff_student_' || p_operation, 'students', v_id::text,
    v_audit_scope, v_audit_batch, v_before, v_after
  );
  RETURN 'OK';
END;
$$;

CREATE OR REPLACE FUNCTION public.manage_staff_course_history(
  p_actor uuid, p_student uuid, p_course uuid, p_batch uuid, p_completion uuid, p_completed date
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_role text;
  v_student public.students%ROWTYPE;
  v_completion uuid;
  v_existing_completed date;
  v_existing_batch uuid;
  v_audit_batch uuid := p_batch;
BEGIN
  v_actor_role := public.require_staff_actor(
    p_actor, ARRAY['admin', 'super_admin'], 'STAFF_STUDENT_FORBIDDEN'
  );

  SELECT * INTO v_student FROM public.students WHERE id = p_student FOR UPDATE;
  IF NOT FOUND OR v_student.archived_at IS NOT NULL THEN RETURN 'NOT_AVAILABLE'; END IF;
  IF p_completed > current_date THEN RETURN 'INVALID_DATE'; END IF;

  IF p_completion IS NOT NULL THEN
    SELECT completed_on, batch_id INTO v_existing_completed, v_existing_batch
    FROM public.student_completions
    WHERE id = p_completion AND student_id = p_student
    FOR UPDATE;
    IF NOT FOUND THEN RETURN 'NOT_AVAILABLE'; END IF;

    UPDATE public.student_completions SET completed_on = p_completed
    WHERE id = p_completion AND student_id = p_student RETURNING id INTO v_completion;
    v_audit_batch := v_existing_batch;
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

  INSERT INTO public.audit_events (
    actor_id, actor_role, action, target_entity, target_id,
    audit_scope, batch_id, before_state, after_state
  ) VALUES (
    p_actor, v_actor_role,
    CASE WHEN p_completion IS NULL THEN 'staff_student_course_added' ELSE 'staff_student_course_date_updated' END,
    'student_completions', v_completion::text,
    CASE WHEN v_audit_batch IS NOT NULL THEN 'batch' ELSE 'global' END,
    v_audit_batch,
    CASE WHEN p_completion IS NOT NULL THEN jsonb_build_object('completed_on', v_existing_completed) END,
    jsonb_build_object('completed_on', p_completed, 'batch_id', v_audit_batch)
  );
  RETURN 'OK';
END;
$$;

CREATE OR REPLACE FUNCTION public.manage_staff_mentor(
  p_actor uuid, p_operation text, p_id uuid, p_revision timestamptz,
  p_name text, p_role text, p_company text, p_bio text, p_photo text, p_logo text
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_role text;
  v_existing public.mentors%ROWTYPE;
  v_id uuid := p_id;
  v_slug text;
  v_before jsonb;
  v_after jsonb;
BEGIN
  v_actor_role := public.require_staff_actor(
    p_actor, ARRAY['admin', 'super_admin'], 'STAFF_MENTOR_FORBIDDEN'
  );
  IF coalesce(p_operation, '') NOT IN ('create', 'edit', 'archive', 'restore') THEN RETURN 'INVALID'; END IF;
  IF p_operation <> 'create' THEN
    SELECT * INTO v_existing FROM public.mentors WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN RETURN 'NOT_FOUND'; END IF;
    IF v_existing.updated_at IS DISTINCT FROM p_revision THEN RETURN 'STALE'; END IF;
    v_before := jsonb_build_object(
      'name', v_existing.name, 'role', v_existing.role,
      'organization', v_existing.organization, 'archived_at', v_existing.archived_at
    );
  END IF;

  IF p_operation IN ('create', 'edit') THEN
    IF (p_operation = 'edit' AND v_existing.archived_at IS NOT NULL)
      OR coalesce(char_length(trim(p_name)), 0) NOT BETWEEN 2 AND 120
      OR coalesce(char_length(trim(p_role)), 0) NOT BETWEEN 2 AND 160
      OR coalesce(char_length(trim(p_company)), 0) NOT BETWEEN 2 AND 160
      OR coalesce(char_length(trim(p_bio)), 0) NOT BETWEEN 10 AND 2200
      OR (p_photo IS NOT NULL AND p_photo !~ '^/images/([a-zA-Z0-9_-]+/)*[a-zA-Z0-9_.-]+\.(png|jpe?g|webp|avif|svg)$')
      OR (p_logo IS NOT NULL AND p_logo !~ '^/images/([a-zA-Z0-9_-]+/)*[a-zA-Z0-9_.-]+\.(png|jpe?g|webp|avif|svg)$')
    THEN RETURN 'INVALID'; END IF;

    IF p_operation = 'create' THEN
      v_id := gen_random_uuid();
      v_slug := 'mentor-' || v_id::text;
      INSERT INTO public.mentors (id, slug, name, role, organization, bio, portrait_src, company_logo_src, published, provenance)
      VALUES (v_id, v_slug, trim(p_name), trim(p_role), trim(p_company), trim(p_bio), p_photo, p_logo, false,
        '{"class":"B","verified":false,"source":"Staff mentor directory"}');
    ELSE
      UPDATE public.mentors SET name = trim(p_name), role = trim(p_role), organization = trim(p_company),
        bio = trim(p_bio), portrait_src = p_photo, company_logo_src = p_logo WHERE id = p_id;
    END IF;
    v_after := jsonb_build_object('name', trim(p_name), 'role', trim(p_role), 'organization', trim(p_company));
  ELSE
    UPDATE public.mentors SET archived_at = CASE WHEN p_operation = 'archive' THEN coalesce(archived_at, now()) END
      WHERE id = p_id;
    v_after := jsonb_build_object('archived', p_operation = 'archive');
  END IF;

  INSERT INTO public.audit_events (
    actor_id, actor_role, action, target_entity, target_id,
    audit_scope, before_state, after_state
  ) VALUES (
    p_actor, v_actor_role, 'staff_mentor_' || p_operation, 'mentors', v_id::text,
    'website', v_before, v_after
  );
  RETURN 'OK';
END;
$$;

CREATE OR REPLACE FUNCTION public.save_staff_mentor_profile(
  p_actor uuid, p_operation text, p_id uuid, p_revision timestamptz,
  p_name text, p_role text, p_company text, p_bio text, p_photo text, p_logo text,
  p_linkedin text, p_expertise jsonb, p_published boolean
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_role text;
  v_existing public.mentors%ROWTYPE;
  v_id uuid := p_id;
  v_slug text;
  v_before jsonb;
  v_after jsonb;
BEGIN
  v_actor_role := public.require_staff_actor(
    p_actor, ARRAY['admin', 'super_admin'], 'STAFF_MENTOR_FORBIDDEN'
  );
  IF coalesce(p_operation, '') NOT IN ('create', 'edit', 'archive', 'restore') THEN RETURN 'INVALID'; END IF;
  IF p_operation <> 'create' THEN
    SELECT * INTO v_existing FROM public.mentors WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN RETURN 'NOT_FOUND'; END IF;
    IF v_existing.updated_at IS DISTINCT FROM p_revision THEN RETURN 'STALE'; END IF;
    v_before := jsonb_build_object(
      'name', v_existing.name, 'role', v_existing.role,
      'organization', v_existing.organization, 'published', v_existing.published,
      'archived_at', v_existing.archived_at
    );
  END IF;

  IF p_operation IN ('create', 'edit') THEN
    IF (p_operation = 'edit' AND v_existing.archived_at IS NOT NULL)
      OR coalesce(char_length(trim(p_name)), 0) NOT BETWEEN 2 AND 120
      OR coalesce(char_length(trim(p_role)), 0) NOT BETWEEN 2 AND 160
      OR coalesce(char_length(trim(p_company)), 0) NOT BETWEEN 2 AND 160
      OR coalesce(char_length(trim(p_bio)), 0) NOT BETWEEN 10 AND 2200
      OR (p_photo IS NOT NULL AND p_photo !~ '^/api/mentor-media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$' AND p_photo !~ '^/images/([a-zA-Z0-9_-]+/)*[a-zA-Z0-9_.-]+\.(png|jpe?g|webp|avif|svg)$')
      OR (p_logo IS NOT NULL AND p_logo !~ '^/api/mentor-media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$' AND p_logo !~ '^/images/([a-zA-Z0-9_-]+/)*[a-zA-Z0-9_.-]+\.(png|jpe?g|webp|avif|svg)$')
      OR (p_linkedin IS NOT NULL AND (char_length(p_linkedin) > 240
        OR p_linkedin !~* '^https://(www\.)?linkedin\.com/in/[a-z0-9_%.-]+/?(\?[^#[:space:]]*)?(#[^[:space:]]*)?$'))
      OR p_published IS NULL
      OR coalesce(jsonb_typeof(p_expertise), '') <> 'array'
    THEN RETURN 'INVALID'; END IF;
    IF jsonb_array_length(p_expertise) > 12 OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_expertise) AS item(value)
      WHERE jsonb_typeof(item.value) <> 'string'
        OR char_length(trim(item.value #>> '{}')) NOT BETWEEN 1 AND 80
    ) THEN RETURN 'INVALID'; END IF;

    IF p_operation = 'create' THEN
      v_id := gen_random_uuid();
      v_slug := 'mentor-' || v_id::text;
      INSERT INTO public.mentors (id, slug, name, role, organization, bio, portrait_src, company_logo_src, linkedin_url, expertise, published, provenance)
      VALUES (v_id, v_slug, trim(p_name), trim(p_role), trim(p_company), trim(p_bio), p_photo, p_logo, p_linkedin, p_expertise, p_published,
        '{"class":"B","verified":false,"source":"Staff mentor directory"}');
    ELSE
      UPDATE public.mentors SET name = trim(p_name), role = trim(p_role), organization = trim(p_company),
        bio = trim(p_bio), portrait_src = p_photo, company_logo_src = p_logo, linkedin_url = p_linkedin,
        expertise = p_expertise, published = p_published WHERE id = p_id;
    END IF;
    v_after := jsonb_build_object(
      'name', trim(p_name), 'role', trim(p_role),
      'organization', trim(p_company), 'published', p_published
    );
  ELSE
    UPDATE public.mentors SET archived_at = CASE WHEN p_operation = 'archive' THEN coalesce(archived_at, now()) END
      WHERE id = p_id;
    v_after := jsonb_build_object('archived', p_operation = 'archive');
  END IF;

  INSERT INTO public.audit_events (
    actor_id, actor_role, action, target_entity, target_id,
    audit_scope, before_state, after_state
  ) VALUES (
    p_actor, v_actor_role, 'staff_mentor_' || p_operation, 'mentors', v_id::text,
    'website', v_before, v_after
  );
  RETURN 'OK';
END;
$$;

-- =============================================================================
-- 5. Transitional Legacy Purge RPCs (Strictly Super Admin-Only Until W2A-T06)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.purge_staff_dev_admission(
  p_actor_id uuid, p_enrollment_id uuid, p_expected_updated_at timestamptz,
  p_confirmation text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_role text;
  v_record public.enrollments%ROWTYPE;
BEGIN
  v_actor_role := public.require_staff_actor(
    p_actor_id, ARRAY['super_admin'], 'STAFF_PURGE_FORBIDDEN'
  );

  SELECT * INTO v_record FROM public.enrollments WHERE id = p_enrollment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'NOT_FOUND'; END IF;
  IF v_record.updated_at IS DISTINCT FROM p_expected_updated_at THEN RETURN 'STALE'; END IF;
  IF v_record.public_ref IS DISTINCT FROM upper(trim(p_confirmation)) THEN RETURN 'CONFIRMATION_MISMATCH'; END IF;
  IF NOT public.can_purge_dev_admission(v_record) THEN RETURN 'PROTECTED'; END IF;

  DELETE FROM public.enrollments WHERE id = v_record.id;
  INSERT INTO public.audit_events (
    actor_id, actor_role, action, target_entity, target_id, audit_scope, batch_id
  ) VALUES (
    p_actor_id, v_actor_role, 'staff_deleted_dev_admission', 'enrollments', v_record.id::text,
    'batch', v_record.batch_id
  );

  RETURN 'OK';
EXCEPTION WHEN foreign_key_violation THEN
  RETURN 'PROTECTED';
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_staff_student(
  p_actor_id uuid, p_student_id uuid, p_expected_updated_at timestamptz, p_confirmation text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
SET lock_timeout = '1s'
AS $$
DECLARE
  v_actor_role text;
  v_student public.students%ROWTYPE;
  v_enrollment_ids uuid[];
  v_mock_attempt_ids uuid[];
BEGIN
  v_actor_role := public.require_staff_actor(
    p_actor_id, ARRAY['super_admin'], 'STAFF_PURGE_FORBIDDEN'
  );

  SELECT * INTO v_student FROM public.students WHERE id = p_student_id FOR UPDATE NOWAIT;
  IF NOT FOUND THEN RETURN 'NOT_FOUND'; END IF;
  IF v_student.updated_at IS DISTINCT FROM p_expected_updated_at THEN RETURN 'STALE'; END IF;
  IF lower(v_student.email) IS DISTINCT FROM lower(btrim(p_confirmation)) THEN
    RETURN 'CONFIRMATION_MISMATCH';
  END IF;

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

  SELECT ARRAY(
    SELECT attempt.id FROM public.payment_attempts attempt
    WHERE attempt.enrollment_id = ANY(v_enrollment_ids)
      AND attempt.payment_id = 'MOCKPAY-' || upper(left(replace(attempt.id::text, '-', ''), 12))
      AND (attempt.trx_id IS NULL OR attempt.trx_id = 'MOCKTRX' || right(attempt.payment_id, 8))
    ORDER BY attempt.id
    FOR UPDATE OF attempt NOWAIT
  ) INTO v_mock_attempt_ids;

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

  INSERT INTO public.audit_events (actor_id, actor_role, action, target_entity, audit_scope)
  VALUES (p_actor_id, v_actor_role, 'staff_deleted_student', 'students', 'global');

  RETURN 'OK';
EXCEPTION
  WHEN lock_not_available OR deadlock_detected THEN RETURN 'BUSY';
  WHEN foreign_key_violation THEN RETURN 'PROTECTED';
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_staff_admission(
  p_actor_id uuid, p_enrollment_id uuid, p_expected_updated_at timestamptz, p_confirmation text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
SET lock_timeout = '1s'
AS $$
DECLARE
  v_actor_role text;
  v_record public.enrollments%ROWTYPE;
BEGIN
  v_actor_role := public.require_staff_actor(
    p_actor_id, ARRAY['super_admin'], 'STAFF_PURGE_FORBIDDEN'
  );

  SELECT * INTO v_record FROM public.enrollments WHERE id = p_enrollment_id FOR UPDATE NOWAIT;
  IF NOT FOUND THEN RETURN 'NOT_FOUND'; END IF;
  IF v_record.updated_at IS DISTINCT FROM p_expected_updated_at THEN RETURN 'STALE'; END IF;
  IF v_record.public_ref IS DISTINCT FROM upper(btrim(p_confirmation)) THEN
    RETURN 'CONFIRMATION_MISMATCH';
  END IF;

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

  INSERT INTO public.audit_events (
    actor_id, actor_role, action, target_entity, audit_scope, batch_id
  ) VALUES (
    p_actor_id, v_actor_role, 'staff_deleted_admission', 'enrollments', 'batch', v_record.batch_id
  );

  RETURN 'OK';
EXCEPTION
  WHEN lock_not_available OR deadlock_detected THEN RETURN 'BUSY';
  WHEN foreign_key_violation THEN RETURN 'PROTECTED';
END;
$$;

CREATE OR REPLACE FUNCTION public.preview_staff_record_purge(p_actor uuid, p_kind text, p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_staff_actor_authorized(p_actor, ARRAY['super_admin']) THEN
    RAISE EXCEPTION 'STAFF_PURGE_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  RETURN public.staff_purge_impact(p_kind, p_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_staff_record(
  p_actor uuid, p_kind text, p_id uuid, p_revision timestamptz, p_confirmation text, p_impact_token text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
SET lock_timeout = '1s'
AS $$
DECLARE
  v_actor_role text;
  v_student uuid;
  v_ids uuid[];
  v_impact jsonb;
  v_result text;
BEGIN
  v_actor_role := public.require_staff_actor(
    p_actor, ARRAY['super_admin'], 'STAFF_PURGE_FORBIDDEN'
  );
  IF p_kind IS NULL OR p_kind NOT IN ('student', 'admission') THEN RETURN 'NOT_FOUND'; END IF;

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
    INSERT INTO public.audit_events (actor_id, actor_role, action, target_entity, audit_scope)
    VALUES (p_actor, v_actor_role, 'staff_deleted_student', 'students', 'global');
  END IF;
  RETURN v_result;
EXCEPTION
  WHEN lock_not_available OR deadlock_detected THEN RETURN 'BUSY';
  WHEN foreign_key_violation THEN RETURN 'PROTECTED';
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
