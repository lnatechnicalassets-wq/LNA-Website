-- W1 first increment: course content editing without changing admissions or payment contracts.
BEGIN;

CREATE FUNCTION public.get_staff_course_content(p_actor_id uuid, p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM public.require_staff_actor(p_actor_id, ARRAY['admin', 'super_admin'], 'CATALOG_EDIT_FORBIDDEN');
  SELECT jsonb_build_object(
    'slug', slug, 'revision', updated_at, 'learning_outcomes', learning_outcomes,
    'target_audience', target_audience, 'prerequisites', prerequisites,
    'modules', modules, 'featured', featured
  ) INTO v_result
  FROM public.courses
  WHERE id = p_course_id AND status <> 'archived' AND archived_at IS NULL;
  RETURN v_result;
END;
$$;

CREATE FUNCTION public.update_staff_course_content(
  p_actor_id uuid, p_course_id uuid, p_expected_updated_at timestamptz, p_values jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role text;
  v_course public.courses%ROWTYPE;
  v_after jsonb;
  v_field text;
  v_item jsonb;
  v_module jsonb;
  v_min integer;
BEGIN
  v_role := public.require_staff_actor(p_actor_id, ARRAY['admin', 'super_admin'], 'CATALOG_EDIT_FORBIDDEN');
  IF jsonb_typeof(p_values) IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_values -> 'featured') IS DISTINCT FROM 'boolean'
     OR octet_length(p_values::text) > 1000000 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID');
  END IF;
  FOREACH v_field IN ARRAY ARRAY['learning_outcomes', 'target_audience', 'prerequisites', 'modules'] LOOP
    IF jsonb_typeof(p_values -> v_field) IS DISTINCT FROM 'array' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'INVALID');
    END IF;
    IF jsonb_array_length(p_values -> v_field) > 30 THEN
      RETURN jsonb_build_object('ok', false, 'code', 'INVALID');
    END IF;
    IF v_field <> 'modules' THEN
      v_min := CASE WHEN v_field = 'prerequisites' THEN 1 ELSE 3 END;
      FOR v_item IN SELECT value FROM jsonb_array_elements(p_values -> v_field) LOOP
        IF jsonb_typeof(v_item) IS DISTINCT FROM 'string'
           OR char_length(btrim(v_item #>> '{}')) NOT BETWEEN v_min AND 500 THEN
          RETURN jsonb_build_object('ok', false, 'code', 'INVALID');
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  FOR v_module IN SELECT value FROM jsonb_array_elements(p_values -> 'modules') LOOP
    IF jsonb_typeof(v_module) IS DISTINCT FROM 'object'
       OR jsonb_typeof(v_module -> 'id') IS DISTINCT FROM 'string'
       OR jsonb_typeof(v_module -> 'title') IS DISTINCT FROM 'string'
       OR jsonb_typeof(v_module -> 'duration') IS DISTINCT FROM 'string'
       OR jsonb_typeof(v_module -> 'topics') IS DISTINCT FROM 'array'
       OR char_length(btrim(v_module ->> 'id')) NOT BETWEEN 1 AND 128
       OR char_length(btrim(v_module ->> 'title')) NOT BETWEEN 3 AND 160
       OR char_length(btrim(v_module ->> 'duration')) NOT BETWEEN 1 AND 100 THEN
      RETURN jsonb_build_object('ok', false, 'code', 'INVALID');
    END IF;
    IF jsonb_array_length(v_module -> 'topics') > 30 THEN
      RETURN jsonb_build_object('ok', false, 'code', 'INVALID');
    END IF;
    FOR v_item IN SELECT value FROM jsonb_array_elements(v_module -> 'topics') LOOP
      IF jsonb_typeof(v_item) IS DISTINCT FROM 'string'
         OR char_length(btrim(v_item #>> '{}')) NOT BETWEEN 1 AND 500 THEN
        RETURN jsonb_build_object('ok', false, 'code', 'INVALID');
      END IF;
    END LOOP;
  END LOOP;
  IF (SELECT count(DISTINCT value ->> 'id') FROM jsonb_array_elements(p_values -> 'modules'))
     <> jsonb_array_length(p_values -> 'modules') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID');
  END IF;

  SELECT * INTO v_course FROM public.courses WHERE id = p_course_id FOR UPDATE;
  IF NOT FOUND OR v_course.status = 'archived' OR v_course.archived_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;
  IF v_course.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RETURN jsonb_build_object('ok', false, 'code', 'STALE');
  END IF;
  UPDATE public.courses SET
    learning_outcomes = p_values -> 'learning_outcomes',
    target_audience = p_values -> 'target_audience',
    prerequisites = p_values -> 'prerequisites',
    modules = p_values -> 'modules',
    featured = (p_values ->> 'featured')::boolean
  WHERE id = p_course_id RETURNING to_jsonb(courses) INTO v_after;
  INSERT INTO public.audit_events (actor_id, actor_role, action, target_entity, target_id, audit_scope, before_state, after_state)
  VALUES (p_actor_id, v_role, 'catalog_course_content_edit', 'courses', p_course_id::text, 'global', to_jsonb(v_course), v_after);
  RETURN jsonb_build_object('ok', true, 'slug', v_course.slug);
END;
$$;

REVOKE ALL ON FUNCTION public.get_staff_course_content(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_course_content(uuid, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.update_staff_course_content(uuid, uuid, timestamptz, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_staff_course_content(uuid, uuid, timestamptz, jsonb) TO service_role;
CREATE FUNCTION public.get_staff_course_mentors(p_actor_id uuid, p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_course public.courses%ROWTYPE;
  v_options jsonb;
BEGIN
  PERFORM public.require_staff_actor(p_actor_id, ARRAY['admin', 'super_admin'], 'CATALOG_EDIT_FORBIDDEN');
  SELECT * INTO v_course FROM public.courses WHERE id = p_course_id FOR SHARE;
  IF NOT FOUND OR v_course.status = 'archived' OR v_course.archived_at IS NOT NULL THEN
    RETURN NULL;
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name,
    'archived', m.archived_at IS NOT NULL, 'selected', cm.mentor_id IS NOT NULL)
    ORDER BY cm.display_order NULLS LAST, m.name, m.id), '[]'::jsonb)
  INTO v_options FROM public.mentors m
  LEFT JOIN public.course_mentors cm ON cm.mentor_id = m.id AND cm.course_id = p_course_id
  WHERE m.archived_at IS NULL OR cm.mentor_id IS NOT NULL;
  RETURN jsonb_build_object('revision', v_course.updated_at, 'options', v_options);
END;
$$;

CREATE FUNCTION public.set_staff_course_mentors(
  p_actor_id uuid, p_course_id uuid, p_expected_updated_at timestamptz, p_mentor_ids uuid[]
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role text;
  v_course public.courses%ROWTYPE;
  v_before_ids uuid[];
BEGIN
  v_role := public.require_staff_actor(p_actor_id, ARRAY['admin', 'super_admin'], 'CATALOG_EDIT_FORBIDDEN');
  SELECT * INTO v_course FROM public.courses WHERE id = p_course_id FOR UPDATE;
  IF NOT FOUND OR v_course.status = 'archived' OR v_course.archived_at IS NOT NULL THEN RETURN 'NOT_FOUND'; END IF;
  IF v_course.updated_at IS DISTINCT FROM p_expected_updated_at THEN RETURN 'STALE'; END IF;
  IF p_mentor_ids IS NULL OR cardinality(p_mentor_ids) > 100
    OR (SELECT count(DISTINCT id) FROM unnest(p_mentor_ids) AS input(id)) <> cardinality(p_mentor_ids)
  THEN RETURN 'INVALID'; END IF;
  SELECT coalesce(array_agg(mentor_id ORDER BY display_order), '{}'::uuid[]) INTO v_before_ids
  FROM public.course_mentors WHERE course_id = p_course_id;
  -- Lock selected mentor records before validating existence/archival.
  PERFORM m.id FROM public.mentors m WHERE m.id = ANY(p_mentor_ids) ORDER BY m.id FOR SHARE;
  IF EXISTS (SELECT 1 FROM unnest(p_mentor_ids) AS input(id)
    LEFT JOIN public.mentors m ON m.id = input.id
    WHERE m.id IS NULL OR (m.archived_at IS NOT NULL AND NOT (m.id = ANY(v_before_ids))))
  THEN RETURN 'INVALID'; END IF;
  IF v_before_ids = p_mentor_ids THEN RETURN 'OK'; END IF;
  DELETE FROM public.course_mentors WHERE course_id = p_course_id;
  INSERT INTO public.course_mentors (course_id, mentor_id, display_order)
    SELECT p_course_id, id, ord - 1 FROM unnest(p_mentor_ids) WITH ORDINALITY AS input(id, ord);
  UPDATE public.courses SET updated_at = now() WHERE id = p_course_id;
  INSERT INTO public.audit_events (actor_id, actor_role, action, target_entity, target_id, audit_scope, before_state, after_state)
    VALUES (p_actor_id, v_role, 'staff_updated_course_mentors', 'courses', p_course_id::text, 'global',
      jsonb_build_object('mentor_ids', v_before_ids), jsonb_build_object('mentor_ids', p_mentor_ids));
  RETURN 'OK';
END;
$$;

REVOKE ALL ON FUNCTION public.get_staff_course_mentors(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_course_mentors(uuid, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.set_staff_course_mentors(uuid, uuid, timestamptz, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_staff_course_mentors(uuid, uuid, timestamptz, uuid[]) TO service_role;

-- W1 batch intake controls. Keep the legacy window semantics for untouched rows.
-- NULL is a migration compatibility state, not a third user-facing switch setting.
ALTER TABLE public.batches ADD COLUMN accept_applications boolean;

CREATE FUNCTION public.batch_intake_allowed(p_batch public.batches, p_staff boolean)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
  SELECT coalesce(
    (p_batch).archived_at IS NULL AND
    CASE WHEN (p_batch).accept_applications IS NULL THEN
      (p_batch).status = 'open_for_enrollment'
      AND ((p_batch).enrollment_opens_at IS NULL OR (p_batch).enrollment_opens_at <= now())
      AND ((p_batch).enrollment_closes_at IS NULL OR (p_batch).enrollment_closes_at > now())
    ELSE
      (p_batch).status IN ('upcoming', 'open_for_enrollment', 'in_progress')
      AND (p_staff OR (p_batch).accept_applications)
    END, false);
$$;
REVOKE ALL ON FUNCTION public.batch_intake_allowed(public.batches, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.batch_intake_allowed(public.batches, boolean) TO service_role;

-- Narrow, checked replacements of the verified M18/M19 RPC bodies. Preserve all other
-- enrollment/payment calculations, locks, actor checks, attributes and existing grants.
-- Abort the entire migration if a source body differs from the reviewed baseline.
DO $intake_upgrade$
DECLARE
  r record;
  v_oid regprocedure;
  v_source text;
  v_definition text;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('public.start_enrollment(text,text,text,text,text,text,jsonb,jsonb)',
     '115245fc73f27b685a4661ab2fabca17',
     $old$  SELECT * INTO v_course FROM public.courses WHERE id = v_batch.course_id;

  IF v_batch.status <> 'open_for_enrollment'
     OR (v_batch.enrollment_opens_at IS NOT NULL AND v_batch.enrollment_opens_at > now())
     OR (v_batch.enrollment_closes_at IS NOT NULL AND v_batch.enrollment_closes_at < now()) THEN$old$,
     $new$  SELECT * INTO v_course FROM public.courses WHERE id = v_batch.course_id FOR SHARE;

  IF v_course.status <> 'published' OR v_course.archived_at IS NOT NULL
     OR NOT public.batch_intake_allowed(v_batch, false) THEN$new$),
    ('public.submit_public_manual_enrollment(text,text,text,text,text,text,jsonb,jsonb,text)',
     '0ee700efb7937d44b7c0871393096c56',
     $old$    OR v_batch.status <> 'open_for_enrollment'
    OR v_batch.enrollment_opens_at > now() OR v_batch.enrollment_closes_at <= now() THEN$old$,
     $new$    OR NOT public.batch_intake_allowed(v_batch, false) THEN$new$),
    ('public.create_staff_enrollment(uuid,uuid,timestamptz,text,text,text,text,jsonb,jsonb)',
     '8c6b36624c98b81d961f273d97c0d540',
     $old$    OR v_batch.status <> 'open_for_enrollment'
    OR v_batch.enrollment_opens_at > now()
    OR v_batch.enrollment_closes_at <= now() THEN$old$,
     $new$    OR NOT public.batch_intake_allowed(v_batch, true) THEN$new$),
    ('public.record_staff_manual_enrollment(uuid,uuid,timestamptz,text,text,text,text,jsonb,jsonb,text,text)',
     'a542eb66de7db347fe3eddcef723af90',
     $old$    OR v_batch.status <> 'open_for_enrollment'
    OR v_batch.enrollment_opens_at > now()
    OR v_batch.enrollment_closes_at <= now() THEN$old$,
     $new$    OR NOT public.batch_intake_allowed(v_batch, true) THEN$new$),
    ('public.review_staff_manual_payment(uuid,uuid,timestamptz,text,bigint)',
     'ddc2f87523148e2d66d011e05e843a0a',
     $old$    OR v_batch.status NOT IN ('open_for_enrollment', 'in_progress')$old$,
     $new$    OR (CASE WHEN v_batch.accept_applications IS NULL
          THEN v_batch.status NOT IN ('open_for_enrollment', 'in_progress')
          ELSE v_batch.status NOT IN ('upcoming', 'open_for_enrollment', 'in_progress') END)$new$),
    ('public.retry_enrollment_payment(text)',
     '08809cba5abece96865d3e961e6fafba',
     $old$  SELECT * INTO v_course FROM public.courses WHERE id = v_enrollment.course_id;

  IF v_batch.status <> 'open_for_enrollment' THEN$old$,
     $new$  SELECT * INTO v_course FROM public.courses WHERE id = v_enrollment.course_id FOR SHARE;

  IF v_batch.archived_at IS NOT NULL OR v_course.status <> 'published'
     OR v_course.archived_at IS NOT NULL
     OR (CASE WHEN v_batch.accept_applications IS NULL THEN v_batch.status <> 'open_for_enrollment'
              ELSE v_batch.status NOT IN ('upcoming', 'open_for_enrollment', 'in_progress') END) THEN$new$),
    ('public.publish_admin_catalog_draft(uuid,text,uuid,timestamptz)',
     'c6ae5a3303c07b74d66fdf3e54805544',
     $old$    UPDATE public.batches SET status = 'upcoming'$old$,
     $new$    UPDATE public.batches SET status = 'upcoming', accept_applications = false$new$)
  ) AS changes(signature, source_md5, old_text, new_text)
  LOOP
    v_oid := to_regprocedure(r.signature);
    IF v_oid IS NULL THEN RAISE EXCEPTION 'W1 missing baseline function: %', r.signature; END IF;
    SELECT replace(prosrc, E'\r\n', E'\n') INTO v_source FROM pg_proc WHERE oid = v_oid;
    IF md5(v_source) <> r.source_md5 THEN
      RAISE EXCEPTION 'W1 baseline function body differs: %', r.signature;
    END IF;
    v_definition := replace(pg_get_functiondef(v_oid), E'\r\n', E'\n');
    IF length(v_definition) - length(replace(v_definition, r.old_text, '')) <> length(r.old_text) THEN
      RAISE EXCEPTION 'W1 expected exactly one guard: %', r.signature;
    END IF;
    EXECUTE replace(v_definition, r.old_text, r.new_text);
  END LOOP;
END;
$intake_upgrade$;

-- Keep an archived explicitly configured batch closed on restore. Legacy rows retain
-- their existing behavior until staff save the new controls.
CREATE FUNCTION public.close_configured_batch_on_archive()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.accept_applications IS NOT NULL AND
     (NEW.archived_at IS NOT NULL OR NEW.status = 'archived') THEN
    NEW.accept_applications := false;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.close_configured_batch_on_archive() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_w1_close_configured_batch_on_archive
BEFORE UPDATE OF archived_at, status ON public.batches
FOR EACH ROW EXECUTE FUNCTION public.close_configured_batch_on_archive();

CREATE FUNCTION public.get_staff_batch_intake(p_actor_id uuid, p_batch_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_batch public.batches%ROWTYPE;
  v_course public.courses%ROWTYPE;
  v_course_published boolean;
  v_remaining bigint;
BEGIN
  PERFORM public.require_staff_actor(p_actor_id, ARRAY['admin', 'super_admin'], 'CATALOG_EDIT_FORBIDDEN');
  SELECT * INTO v_batch FROM public.batches WHERE id = p_batch_id;
  IF NOT FOUND OR v_batch.archived_at IS NOT NULL OR v_batch.status NOT IN ('upcoming', 'open_for_enrollment', 'in_progress', 'completed') THEN RETURN NULL; END IF;
  SELECT * INTO v_course FROM public.courses WHERE id = v_batch.course_id;
  v_course_published := coalesce(v_course.status = 'published' AND v_course.archived_at IS NULL, false);
  v_remaining := CASE WHEN v_batch.capacity IS NULL THEN NULL
    ELSE greatest(0, v_batch.capacity::bigint - v_batch.historical_enrolled_count - public.count_batch_active_seats(v_batch.id)) END;
  RETURN jsonb_build_object('revision', v_batch.updated_at,
    'stage', CASE WHEN v_batch.status = 'open_for_enrollment' THEN 'upcoming' ELSE v_batch.status END,
    'acceptApplications', coalesce(v_batch.accept_applications, public.batch_intake_allowed(v_batch, false)),
    'legacy', v_batch.accept_applications IS NULL,
    'coursePublished', v_course_published,
    'publicEligible', v_course_published AND (v_remaining IS NULL OR v_remaining > 0) AND public.batch_intake_allowed(v_batch, false),
    'remainingSeats', v_remaining, 'deadline', v_batch.enrollment_closes_at);
END;
$$;

CREATE FUNCTION public.set_staff_batch_intake(p_actor_id uuid, p_batch_id uuid,
  p_expected_updated_at timestamptz, p_stage text, p_accept_applications boolean, p_confirm_open boolean)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role text;
  v_batch public.batches%ROWTYPE;
  v_course public.courses%ROWTYPE;
  v_after jsonb;
  v_can_open boolean;
BEGIN
  v_role := public.require_staff_actor(p_actor_id, ARRAY['admin', 'super_admin'], 'CATALOG_EDIT_FORBIDDEN');
  IF p_stage IS NULL OR p_stage NOT IN ('upcoming', 'in_progress', 'completed')
     OR p_accept_applications IS NULL OR p_confirm_open IS NULL THEN RETURN 'INVALID'; END IF;
  SELECT * INTO v_batch FROM public.batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND OR v_batch.archived_at IS NOT NULL OR v_batch.status NOT IN ('upcoming', 'open_for_enrollment', 'in_progress', 'completed') THEN RETURN 'NOT_FOUND'; END IF;
  IF v_batch.updated_at IS DISTINCT FROM p_expected_updated_at THEN RETURN 'STALE'; END IF;
  SELECT * INTO v_course FROM public.courses WHERE id = v_batch.course_id FOR SHARE;
  v_can_open := p_accept_applications AND p_stage IN ('upcoming', 'in_progress');
  IF v_can_open AND (v_course.status <> 'published' OR v_course.archived_at IS NOT NULL) THEN RETURN 'PARENT_UNPUBLISHED'; END IF;
  -- Confirm even if the batch is full: a subsequent seat release can make it available.
  IF v_can_open AND (v_batch.accept_applications IS DISTINCT FROM true
      OR v_batch.status NOT IN ('upcoming', 'open_for_enrollment', 'in_progress')) AND NOT p_confirm_open THEN RETURN 'CONFIRM_OPEN'; END IF;
  IF v_batch.status = p_stage AND v_batch.accept_applications IS NOT DISTINCT FROM p_accept_applications THEN RETURN 'OK'; END IF;
  UPDATE public.batches SET status = p_stage, accept_applications = p_accept_applications
  WHERE id = p_batch_id RETURNING jsonb_build_object('status', status, 'accept_applications', accept_applications) INTO v_after;
  INSERT INTO public.audit_events (actor_id, actor_role, action, target_entity, target_id, audit_scope, batch_id, before_state, after_state)
  VALUES (p_actor_id, v_role, 'staff_updated_batch_intake', 'batches', p_batch_id::text, 'batch', p_batch_id,
    jsonb_build_object('status', v_batch.status, 'accept_applications', v_batch.accept_applications), v_after);
  RETURN 'OK';
END;
$$;
REVOKE ALL ON FUNCTION public.get_staff_batch_intake(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_batch_intake(uuid, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.set_staff_batch_intake(uuid, uuid, timestamptz, text, boolean, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_staff_batch_intake(uuid, uuid, timestamptz, text, boolean, boolean) TO service_role;

-- W1-04: real unlimited capacity (NULL); preserve every existing fixed limit.
ALTER TABLE public.batches ALTER COLUMN capacity DROP NOT NULL;
ALTER TABLE public.batches DROP CONSTRAINT batches_historical_count_bounds;
ALTER TABLE public.batches ADD CONSTRAINT batches_historical_count_bounds CHECK (
  historical_enrolled_count >= 0 AND (capacity IS NULL OR historical_enrolled_count <= capacity)
);
-- The existing capacity > 0 CHECK already permits NULL but rejects zero and negatives.
-- Existing checkout expiry remains a payment/session timeout; no unlimited seat ceiling.
DO $capacity_upgrade$
DECLARE
  r record;
  v_oid regprocedure;
  v_definition text;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('public.start_enrollment(text,text,text,text,text,text,jsonb,jsonb)',
     $old$  IF v_remaining_seats <= 0 THEN$old$,
     $new$  IF v_batch.capacity IS NOT NULL AND v_remaining_seats <= 0 THEN$new$),
    ('public.create_staff_enrollment(uuid,uuid,timestamptz,text,text,text,text,jsonb,jsonb)',
     $old$  IF public.count_batch_active_seats(v_batch.id) >= v_batch.capacity - v_batch.historical_enrolled_count THEN$old$,
     $new$  IF v_batch.capacity IS NOT NULL AND public.count_batch_active_seats(v_batch.id) >= v_batch.capacity - v_batch.historical_enrolled_count THEN$new$),
    ('public.review_staff_manual_payment(uuid,uuid,timestamptz,text,bigint)',
     $old$  IF public.count_batch_active_seats(v_batch.id) >= v_batch.capacity - v_batch.historical_enrolled_count THEN$old$,
     $new$  IF v_batch.capacity IS NOT NULL AND public.count_batch_active_seats(v_batch.id) >= v_batch.capacity - v_batch.historical_enrolled_count THEN$new$),
    ('public.confirm_payment(uuid,text,text,bigint,text,text,text)',
     $old$    IF v_remaining_for_this <= 0 THEN$old$,
     $new$    IF v_batch.capacity IS NOT NULL AND v_remaining_for_this <= 0 THEN$new$),
    ('public.update_admin_catalog_record(uuid,text,uuid,timestamptz,jsonb)',
     $old$    v_capacity := (p_values ->> 'capacity')::integer;$old$,
     $new$    IF NOT coalesce(p_values ? 'capacity', false) THEN
      RAISE EXCEPTION 'CATALOG_EDIT_INVALID_CAPACITY';
    END IF;
    v_capacity := (p_values ->> 'capacity')::integer;$new$),
    ('public.update_admin_catalog_record(uuid,text,uuid,timestamptz,jsonb)',
     $old$    IF v_capacity IS DISTINCT FROM v_batch.capacity$old$,
     $new$    IF v_capacity IS NOT NULL AND v_capacity IS DISTINCT FROM v_batch.capacity$new$),
    ('public.create_admin_catalog_draft(uuid,text,jsonb)',
     $old$    v_batch_number := (p_values ->> 'batch_number')::integer;$old$,
     $new$    IF NOT coalesce(p_values ? 'capacity', false) THEN
      RAISE EXCEPTION 'CATALOG_CREATE_INVALID_CAPACITY';
    END IF;
    v_batch_number := (p_values ->> 'batch_number')::integer;$new$)
  ) AS changes(signature, old_text, new_text)
  LOOP
    v_oid := to_regprocedure(r.signature);
    IF v_oid IS NULL THEN RAISE EXCEPTION 'W1 capacity: missing function %', r.signature; END IF;
    v_definition := replace(pg_get_functiondef(v_oid), E'\r\n', E'\n');
    IF length(v_definition) - length(replace(v_definition, r.old_text, '')) <> length(r.old_text) THEN
      RAISE EXCEPTION 'W1 capacity: expected exactly one guard in %', r.signature;
    END IF;
    EXECUTE replace(v_definition, r.old_text, r.new_text);
  END LOOP;
END;
$capacity_upgrade$;


-- W1-06: explicit draft pricing and serialized automatic batch numbering.
-- Legacy service callers that supply a valid number and no pricing_mode remain compatible.
DO $draft_numbering$
DECLARE
  v_def text := replace(pg_get_functiondef('public.create_admin_catalog_draft(uuid,text,jsonb)'::regprocedure), E'\r\n', E'\n');
  r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ($old$    WHERE id = v_course_id AND status IN ('draft', 'published') AND archived_at IS NULL
    FOR SHARE;$old$,
     $new$    WHERE id = v_course_id AND status IN ('draft', 'published') AND archived_at IS NULL
    FOR UPDATE;$new$),
    ($old$    v_batch_number := (p_values ->> 'batch_number')::integer;$old$,
     $new$    v_batch_number := (p_values ->> 'batch_number')::integer;
    IF v_batch_number IS NULL THEN
      SELECT coalesce(max(batch_number), 0) + 1 INTO v_batch_number
      FROM public.batches WHERE course_id = v_course_id;
    END IF;
    IF p_values ? 'pricing_mode' AND NOT coalesce(
      ((p_values ->> 'pricing_mode') = 'free' AND (p_values ->> 'fee_poisha')::bigint = 0
        AND coalesce((p_values ->> 'discount_fee_poisha')::bigint, 0) = 0)
      OR ((p_values ->> 'pricing_mode') = 'paid'
        AND coalesce((p_values ->> 'discount_fee_poisha')::bigint, (p_values ->> 'fee_poisha')::bigint) > 0), false)
    THEN RAISE EXCEPTION 'CATALOG_CREATE_INVALID_PRICING' USING ERRCODE = '22023'; END IF;$new$)
  ) AS changes(old_text,new_text)
  LOOP
    IF length(v_def)-length(replace(v_def,r.old_text,'')) <> length(r.old_text) THEN
      RAISE EXCEPTION 'W1 draft creation baseline differs';
    END IF;
    v_def := replace(v_def,r.old_text,r.new_text);
  END LOOP;
  EXECUTE v_def;
END;
$draft_numbering$;

-- Keep draft defaults out of the public catalog table's browser SELECT grant.
CREATE TABLE public.course_batch_defaults (
  course_id uuid PRIMARY KEY REFERENCES public.courses(id) ON DELETE RESTRICT,
  defaults jsonb NOT NULL CHECK (jsonb_typeof(defaults) = 'object')
);
ALTER TABLE public.course_batch_defaults ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.course_batch_defaults FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.course_batch_defaults TO service_role;

CREATE FUNCTION public.get_staff_course_batch_defaults(p_actor_id uuid, p_course_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE v_result jsonb;
BEGIN
  PERFORM public.require_staff_actor(p_actor_id, ARRAY['admin','super_admin'], 'CATALOG_EDIT_FORBIDDEN');
  SELECT jsonb_build_object('revision',c.updated_at,'defaults',d.defaults) INTO v_result
  FROM public.courses c LEFT JOIN public.course_batch_defaults d ON d.course_id=c.id
  WHERE c.id=p_course_id AND c.status <> 'archived' AND c.archived_at IS NULL;
  RETURN v_result;
END;
$$;

CREATE FUNCTION public.set_staff_course_batch_defaults(p_actor_id uuid, p_course_id uuid,
  p_expected_updated_at timestamptz, p_defaults jsonb)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  v_role text;
  v_course public.courses%ROWTYPE;
  v_fee bigint;
  v_discount bigint;
  v_capacity integer;
  v_before jsonb;
BEGIN
  v_role := public.require_staff_actor(p_actor_id, ARRAY['admin','super_admin'], 'CATALOG_EDIT_FORBIDDEN');
  SELECT * INTO v_course FROM public.courses WHERE id=p_course_id FOR UPDATE;
  IF NOT FOUND OR v_course.status='archived' OR v_course.archived_at IS NOT NULL THEN RETURN 'NOT_FOUND'; END IF;
  IF v_course.updated_at IS DISTINCT FROM p_expected_updated_at THEN RETURN 'STALE'; END IF;
  IF jsonb_typeof(p_defaults) IS DISTINCT FROM 'object'
    OR NOT (p_defaults ?& ARRAY['venue','schedule_description','capacity','fee_poisha','discount_fee_poisha'])
    OR jsonb_typeof(p_defaults->'venue') IS DISTINCT FROM 'string'
    OR char_length(btrim(p_defaults->>'venue')) NOT BETWEEN 3 AND 240
    OR jsonb_typeof(p_defaults->'schedule_description') IS DISTINCT FROM 'string'
    OR char_length(btrim(p_defaults->>'schedule_description')) NOT BETWEEN 5 AND 2000
    OR jsonb_typeof(p_defaults->'fee_poisha') IS DISTINCT FROM 'string'
    OR coalesce(p_defaults->>'fee_poisha','') !~ '^[0-9]{1,16}$'
    OR (p_defaults->'discount_fee_poisha' <> 'null'::jsonb AND
      (jsonb_typeof(p_defaults->'discount_fee_poisha') IS DISTINCT FROM 'string' OR coalesce(p_defaults->>'discount_fee_poisha','') !~ '^[0-9]{1,16}$'))
    OR (p_defaults->'capacity' <> 'null'::jsonb AND
      (jsonb_typeof(p_defaults->'capacity') IS DISTINCT FROM 'number' OR coalesce(p_defaults->>'capacity','') !~ '^[1-9][0-9]{0,9}$'))
  THEN RETURN 'INVALID'; END IF;
  v_fee := (p_defaults->>'fee_poisha')::bigint;
  v_discount := (p_defaults->>'discount_fee_poisha')::bigint;
  IF v_fee > 9007199254740991 OR v_discount > v_fee OR (p_defaults->>'capacity')::bigint > 2147483647 THEN RETURN 'INVALID'; END IF;
  v_capacity := (p_defaults->>'capacity')::integer;
  -- Whitelist every stored value; unknown fields, dates, publication, and history are never copied.
  p_defaults := jsonb_build_object('venue',btrim(p_defaults->>'venue'), 'schedule_description',btrim(p_defaults->>'schedule_description'),
    'fee_poisha',v_fee::text,'discount_fee_poisha',v_discount::text,'capacity',v_capacity);
  SELECT defaults INTO v_before FROM public.course_batch_defaults WHERE course_id=p_course_id;
  IF v_before IS NOT DISTINCT FROM p_defaults THEN RETURN 'OK'; END IF;
  INSERT INTO public.course_batch_defaults(course_id, defaults) VALUES(p_course_id,p_defaults)
    ON CONFLICT (course_id) DO UPDATE SET defaults=excluded.defaults;
  UPDATE public.courses SET updated_at=now() WHERE id=p_course_id;
  INSERT INTO public.audit_events(actor_id,actor_role,action,target_entity,target_id,audit_scope,before_state,after_state)
    VALUES(p_actor_id,v_role,'staff_updated_course_batch_defaults','courses',p_course_id::text,'global',v_before,p_defaults);
  RETURN 'OK';
END;
$$;
REVOKE ALL ON FUNCTION public.get_staff_course_batch_defaults(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_course_batch_defaults(uuid,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.set_staff_course_batch_defaults(uuid,uuid,timestamptz,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_staff_course_batch_defaults(uuid,uuid,timestamptz,jsonb) TO service_role;

CREATE FUNCTION public.delete_unused_batch_draft(p_actor_id uuid,p_batch_id uuid,p_expected_updated_at timestamptz)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  v_role text;
  v_batch public.batches%ROWTYPE;
  dep record;
  v_predicate text;
  v_linked boolean;
BEGIN
  v_role := public.require_staff_actor(p_actor_id,ARRAY['admin','super_admin'],'CATALOG_DELETE_FORBIDDEN');
  SELECT * INTO v_batch FROM public.batches WHERE id=p_batch_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'NOT_FOUND'; END IF;
  IF v_batch.updated_at IS DISTINCT FROM p_expected_updated_at THEN RETURN 'STALE'; END IF;
  IF v_batch.status <> 'draft' OR v_batch.archived_at IS NOT NULL OR v_batch.staff_archived_from_status IS NOT NULL
    OR v_batch.historical_enrolled_count <> 0 OR v_batch.accept_applications IS TRUE THEN RETURN 'PROTECTED'; END IF;
  -- Retain all audit history. Only ordinary draft creation and editing are permitted history.
  IF EXISTS (SELECT 1 FROM public.audit_events a WHERE
    a.secondary_batch_id=p_batch_id OR ((a.batch_id=p_batch_id OR (a.target_entity='batches' AND a.target_id=p_batch_id::text))
      AND a.action NOT IN ('catalog_create','catalog_edit'))) THEN RETURN 'PROTECTED'; END IF;
  -- Reject every incoming FK, including CASCADE or SET NULL relations and composite keys.
  -- The locked parent row prevents concurrent child inserts from committing before the delete.
  FOR dep IN SELECT oid,conrelid,conkey,confkey FROM pg_constraint WHERE contype='f' AND confrelid='public.batches'::regclass
  LOOP
    SELECT string_agg(format('d.%I = b.%I',da.attname,ba.attname),' AND ' ORDER BY k.ord) INTO v_predicate
    FROM unnest(dep.conkey,dep.confkey) WITH ORDINALITY k(child_col,parent_col,ord)
    JOIN pg_attribute da ON da.attrelid=dep.conrelid AND da.attnum=k.child_col
    JOIN pg_attribute ba ON ba.attrelid='public.batches'::regclass AND ba.attnum=k.parent_col;
    IF v_predicate IS NULL THEN RETURN 'PROTECTED'; END IF;
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s d JOIN public.batches b ON %s WHERE b.id=$1)',dep.conrelid::regclass,v_predicate)
      INTO v_linked USING p_batch_id;
    IF v_linked THEN RETURN 'PROTECTED'; END IF;
  END LOOP;
  INSERT INTO public.audit_events(actor_id,actor_role,action,target_entity,target_id,audit_scope,before_state)
    VALUES(p_actor_id,v_role,'staff_deleted_unused_batch_draft','batches',p_batch_id::text,'global',to_jsonb(v_batch));
  DELETE FROM public.batches WHERE id=p_batch_id;
  RETURN 'OK';
END;
$$;
REVOKE ALL ON FUNCTION public.delete_unused_batch_draft(uuid,uuid,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_unused_batch_draft(uuid,uuid,timestamptz) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
