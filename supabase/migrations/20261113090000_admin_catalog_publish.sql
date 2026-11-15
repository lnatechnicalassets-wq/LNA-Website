-- Publish saved drafts and record the status change in the same transaction.
BEGIN;

CREATE FUNCTION public.publish_admin_catalog_draft(
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
  v_course public.courses%ROWTYPE;
  v_batch public.batches%ROWTYPE;
  v_course_slug text;
  v_before jsonb;
  v_after jsonb;
BEGIN
  PERFORM 1 FROM public.profiles
  WHERE id = p_actor_id AND role = 'super_admin' AND account_state = 'active'
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CATALOG_PUBLISH_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

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
    actor_id, actor_role, action, target_entity, target_id, before_state, after_state
  ) VALUES (
    p_actor_id, 'super_admin', 'catalog_publish', p_section, p_record_id::text, v_before, v_after
  );

  RETURN v_course_slug;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_admin_catalog_draft(uuid, text, uuid, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_admin_catalog_draft(uuid, text, uuid, timestamptz)
  TO service_role;

COMMIT;
