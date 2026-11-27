-- C4: delete unused catalog records only; never delete student or financial history.
BEGIN;
CREATE FUNCTION public.delete_unused_catalog_record(
  p_actor_id uuid, p_section text, p_record_id uuid, p_expected_updated_at timestamptz
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_role text;
  v_course public.courses%ROWTYPE;
  v_batch public.batches%ROWTYPE;
  v_parent regclass;
  v_before jsonb;
  v_stage text;
  dep record;
  v_predicate text;
  v_linked boolean;
BEGIN
  v_role := public.require_staff_actor(p_actor_id, ARRAY['admin','super_admin'], 'CATALOG_DELETE_FORBIDDEN');
  IF p_section IS NULL OR p_section NOT IN ('courses','batches') THEN RETURN 'INVALID'; END IF;
  IF p_section = 'courses' THEN
    v_parent := 'public.courses'::regclass;
    SELECT * INTO v_course FROM public.courses WHERE id=p_record_id FOR UPDATE;
    IF NOT FOUND THEN RETURN 'NOT_FOUND'; END IF;
    IF v_course.updated_at IS DISTINCT FROM p_expected_updated_at THEN RETURN 'STALE'; END IF;
    IF v_course.status NOT IN ('draft','archived') THEN RETURN 'PROTECTED'; END IF;
    v_before := to_jsonb(v_course);
    -- A deleted historical cohort can still leave useful evidence in audit history.
    IF EXISTS (SELECT 1 FROM public.audit_events a WHERE a.target_entity='batches'
      AND (a.before_state->>'course_id'=p_record_id::text OR a.after_state->>'course_id'=p_record_id::text)
      AND (a.before_state->>'status' IN ('in_progress','completed') OR a.after_state->>'status' IN ('in_progress','completed')))
      THEN RETURN 'PROTECTED'; END IF;
  ELSE
    v_parent := 'public.batches'::regclass;
    SELECT * INTO v_batch FROM public.batches WHERE id=p_record_id FOR UPDATE;
    IF NOT FOUND THEN RETURN 'NOT_FOUND'; END IF;
    IF v_batch.updated_at IS DISTINCT FROM p_expected_updated_at THEN RETURN 'STALE'; END IF;
    v_stage := CASE WHEN v_batch.status='archived' THEN v_batch.staff_archived_from_status ELSE v_batch.status END;
    IF v_stage IS NULL OR v_stage NOT IN ('draft','upcoming','open_for_enrollment','cancelled')
      OR v_batch.historical_enrolled_count<>0 OR v_batch.accept_applications IS TRUE
      OR public.batch_intake_allowed(v_batch,false) THEN RETURN 'PROTECTED'; END IF;
    -- Preserve any batch touched by admission, payment or non-catalog operational history.
    IF EXISTS (SELECT 1 FROM public.audit_events a WHERE a.secondary_batch_id=p_record_id
      OR ((a.batch_id=p_record_id OR (a.target_entity='batches' AND a.target_id=p_record_id::text))
        AND (a.action NOT IN ('catalog_create','catalog_edit','catalog_publish','staff_archived_catalog','staff_restored_catalog',
          'staff_updated_batch_intake','staff_updated_batch_mentors','staff_set_batch_mentors','catalog_batch_mentors_edit')
          OR a.before_state->>'status' IN ('in_progress','completed') OR a.after_state->>'status' IN ('in_progress','completed'))))
      THEN RETURN 'PROTECTED'; END IF;
    v_before := to_jsonb(v_batch);
  END IF;
  -- Locking the parent prevents concurrent FK inserts from committing against a deleted record.
  -- Only explicitly enumerated non-operational configuration associations may be detached.
  FOR dep IN SELECT conrelid,conkey,confkey FROM pg_constraint WHERE contype='f' AND confrelid=v_parent
  LOOP
    IF (p_section='courses' AND dep.conrelid IN ('public.course_mentors'::regclass,'public.course_batch_defaults'::regclass))
      OR (p_section='batches' AND dep.conrelid='public.batch_mentors'::regclass) THEN CONTINUE; END IF;
    SELECT string_agg(format('d.%I = b.%I',da.attname,ba.attname),' AND ' ORDER BY k.ord) INTO v_predicate
    FROM unnest(dep.conkey,dep.confkey) WITH ORDINALITY k(child_col,parent_col,ord)
    JOIN pg_attribute da ON da.attrelid=dep.conrelid AND da.attnum=k.child_col
    JOIN pg_attribute ba ON ba.attrelid=v_parent AND ba.attnum=k.parent_col;
    IF v_predicate IS NULL THEN RETURN 'PROTECTED'; END IF;
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s d JOIN %s b ON %s WHERE b.id=$1)',dep.conrelid::regclass,v_parent,v_predicate)
      INTO v_linked USING p_record_id;
    IF v_linked THEN RETURN 'PROTECTED'; END IF;
  END LOOP;
  IF p_section='courses' THEN
    v_before := v_before || jsonb_build_object('mentor_assignments',coalesce((SELECT jsonb_agg(to_jsonb(m)) FROM public.course_mentors m WHERE course_id=p_record_id),'[]'::jsonb),
      'batch_defaults',(SELECT defaults FROM public.course_batch_defaults WHERE course_id=p_record_id));
    DELETE FROM public.course_mentors WHERE course_id=p_record_id;
    DELETE FROM public.course_batch_defaults WHERE course_id=p_record_id;
    DELETE FROM public.courses WHERE id=p_record_id;
  ELSE
    v_before := v_before || jsonb_build_object('mentor_assignments',coalesce((SELECT jsonb_agg(to_jsonb(m)) FROM public.batch_mentors m WHERE batch_id=p_record_id),'[]'::jsonb));
    DELETE FROM public.batch_mentors WHERE batch_id=p_record_id;
    DELETE FROM public.batches WHERE id=p_record_id;
  END IF;
  INSERT INTO public.audit_events(actor_id,actor_role,action,target_entity,target_id,audit_scope,before_state)
    VALUES(p_actor_id,v_role,'staff_deleted_unused_catalog',p_section,p_record_id::text,'global',v_before);
  RETURN 'OK';
END;
$$;
REVOKE ALL ON FUNCTION public.delete_unused_catalog_record(uuid,text,uuid,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.delete_unused_catalog_record(uuid,text,uuid,timestamptz) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
