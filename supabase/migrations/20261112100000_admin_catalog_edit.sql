-- Save catalog edits and their audit entries in a single database transaction.
BEGIN;

CREATE FUNCTION public.update_admin_catalog_record(
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
  v_course public.courses%ROWTYPE;
  v_batch public.batches%ROWTYPE;
  v_before jsonb;
  v_after jsonb;
  v_capacity integer;
  v_fee bigint;
  v_discount bigint;
BEGIN
  PERFORM 1 FROM public.profiles
  WHERE id = p_actor_id AND role = 'super_admin' AND account_state = 'active'
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CATALOG_EDIT_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

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
    -- The enrollment RPC locks this same row before creating a seat hold.
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
    actor_id, actor_role, action, target_entity, target_id, before_state, after_state
  ) VALUES (
    p_actor_id, 'super_admin', 'catalog_edit', p_section, p_record_id::text, v_before, v_after
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_admin_catalog_record(uuid, text, uuid, timestamptz, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_admin_catalog_record(uuid, text, uuid, timestamptz, jsonb)
  TO service_role;

COMMIT;
