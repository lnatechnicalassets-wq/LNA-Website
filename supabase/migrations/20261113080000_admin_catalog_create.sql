-- Create catalog drafts and their audit entries atomically.
BEGIN;

CREATE FUNCTION public.create_admin_catalog_draft(
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
  v_course_id uuid;
  v_course_slug text;
  v_batch_number integer;
  v_fee bigint;
  v_id uuid;
  v_after jsonb;
  v_constraint text;
BEGIN
  PERFORM 1 FROM public.profiles
  WHERE id = p_actor_id AND role = 'super_admin' AND account_state = 'active'
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CATALOG_CREATE_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

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
    actor_id, actor_role, action, target_entity, target_id, after_state
  ) VALUES (
    p_actor_id, 'super_admin', 'catalog_create', p_section, v_id::text, v_after
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

REVOKE ALL ON FUNCTION public.create_admin_catalog_draft(uuid, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_admin_catalog_draft(uuid, text, jsonb)
  TO service_role;

COMMIT;
