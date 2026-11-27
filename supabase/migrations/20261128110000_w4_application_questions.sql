-- Shared course application questions. Legacy configuration remains the fallback for unconfigured courses.
BEGIN;
ALTER TABLE public.courses
  ADD COLUMN application_questions jsonb,
  ADD COLUMN application_questions_version integer NOT NULL DEFAULT 0,
  ADD CONSTRAINT courses_application_questions_version_check CHECK (
    (application_questions IS NULL AND application_questions_version = 0)
    OR (application_questions IS NOT NULL AND application_questions_version > 0
      AND jsonb_typeof(application_questions) = 'array')
  );
ALTER TABLE public.enrollments ADD COLUMN program_questions_version integer
  CHECK (program_questions_version >= 0);
-- Historical snapshots deliberately retain NULL version; new legacy submissions record zero.

CREATE FUNCTION public.get_staff_application_questions(p_actor_id uuid, p_course_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE v_result jsonb;
BEGIN
  PERFORM public.require_staff_actor(p_actor_id, ARRAY['admin','super_admin'], 'CATALOG_EDIT_FORBIDDEN');
  SELECT jsonb_build_object('slug', slug, 'questions', application_questions, 'version', application_questions_version)
  INTO v_result FROM public.courses WHERE id=p_course_id AND archived_at IS NULL AND status <> 'archived';
  RETURN v_result;
END; $$;

CREATE FUNCTION public.set_staff_application_questions(p_actor_id uuid, p_course_id uuid, p_expected_version integer, p_questions jsonb)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  v_role text;
  v_course public.courses%ROWTYPE;
  v_question jsonb;
  v_option jsonb;
  v_id text;
  v_ids text[] := ARRAY[]::text[];
  v_options text[];
BEGIN
  v_role := public.require_staff_actor(p_actor_id, ARRAY['admin','super_admin'], 'CATALOG_EDIT_FORBIDDEN');
  IF jsonb_typeof(p_questions) IS DISTINCT FROM 'array' OR octet_length(p_questions::text)>150000 THEN RETURN 'INVALID'; END IF;
  IF jsonb_array_length(p_questions)>20 THEN RETURN 'INVALID'; END IF;
  FOR v_question IN SELECT value FROM jsonb_array_elements(p_questions) LOOP
    IF jsonb_typeof(v_question) IS DISTINCT FROM 'object' THEN RETURN 'INVALID'; END IF;
    IF v_question - ARRAY['id','label','type','required','placeholder','options'] <> '{}'::jsonb
      OR jsonb_typeof(v_question->'id') IS DISTINCT FROM 'string'
      OR jsonb_typeof(v_question->'label') IS DISTINCT FROM 'string'
      OR jsonb_typeof(v_question->'type') IS DISTINCT FROM 'string'
      OR jsonb_typeof(v_question->'required') IS DISTINCT FROM 'boolean'
      OR v_question->>'id' !~ '^[A-Za-z][A-Za-z0-9_]{0,63}$'
      OR char_length(btrim(v_question->>'label')) NOT BETWEEN 1 AND 160
      OR btrim(v_question->>'label') <> v_question->>'label'
      OR v_question->>'type' NOT IN ('text','textarea','select') THEN RETURN 'INVALID'; END IF;
    v_id := lower(v_question->>'id');
    IF v_id = ANY(v_ids) OR v_id IN ('constructor','prototype','tostring','tolocalestring','valueof','hasownproperty','isprototypeof','propertyisenumerable','fullname','email','phone','whatsapp','courseid','batchid','transactionid','policy','paymentmethod','applicationreference') THEN RETURN 'INVALID'; END IF;
    v_ids := array_append(v_ids,v_id);
    IF v_question ? 'placeholder' AND (jsonb_typeof(v_question->'placeholder') IS DISTINCT FROM 'string' OR char_length(v_question->>'placeholder') > 200 OR btrim(v_question->>'placeholder') <> v_question->>'placeholder') THEN RETURN 'INVALID'; END IF;
    IF v_question->>'type'='select' THEN
      IF jsonb_typeof(v_question->'options') IS DISTINCT FROM 'array' THEN RETURN 'INVALID'; END IF;
      IF jsonb_array_length(v_question->'options') NOT BETWEEN 2 AND 30 THEN RETURN 'INVALID'; END IF;
      v_options := ARRAY[]::text[];
      FOR v_option IN SELECT value FROM jsonb_array_elements(v_question->'options') LOOP
        IF jsonb_typeof(v_option) IS DISTINCT FROM 'string' OR char_length(btrim(v_option #>> '{}')) NOT BETWEEN 1 AND 160 OR btrim(v_option #>> '{}') <> (v_option #>> '{}') OR (v_option #>> '{}') = ANY(v_options) THEN RETURN 'INVALID'; END IF;
        v_options := array_append(v_options,v_option #>> '{}');
      END LOOP;
    ELSIF v_question ? 'options' THEN RETURN 'INVALID'; END IF;
  END LOOP;
  SELECT * INTO v_course FROM public.courses WHERE id=p_course_id FOR UPDATE;
  IF NOT FOUND OR v_course.archived_at IS NOT NULL OR v_course.status='archived' THEN RETURN 'NOT_FOUND'; END IF;
  IF v_course.application_questions_version IS DISTINCT FROM p_expected_version THEN RETURN 'STALE'; END IF;
  IF v_course.application_questions IS NOT DISTINCT FROM p_questions THEN RETURN 'OK'; END IF;
  UPDATE public.courses SET application_questions=p_questions,
    application_questions_version=v_course.application_questions_version+1 WHERE id=p_course_id;
  INSERT INTO public.audit_events(actor_id,actor_role,action,target_entity,target_id,audit_scope,before_state,after_state)
  VALUES(p_actor_id,v_role,'staff_updated_application_questions','courses',p_course_id::text,'global',
    jsonb_build_object('version',v_course.application_questions_version,'questions',v_course.application_questions),
    jsonb_build_object('version',v_course.application_questions_version+1,'questions',p_questions));
  RETURN 'OK';
END; $$;

-- Lock the course in the same transaction as insertion. Do not rewrite historical
-- snapshots on status updates or payment settlement. Existing RPC signatures stay intact.
CREATE FUNCTION public.capture_enrollment_question_version()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE v_questions jsonb; v_version integer; v_question jsonb; v_answer jsonb; v_text text;
BEGIN
  SELECT application_questions, application_questions_version INTO v_questions,v_version
  FROM public.courses WHERE id=NEW.course_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ENROLLMENT_COURSE_NOT_FOUND' USING ERRCODE='23503'; END IF;
  IF v_questions IS NOT NULL THEN
    IF NEW.program_questions_snapshot IS DISTINCT FROM v_questions THEN
      RAISE EXCEPTION 'STALE_APPLICATION_QUESTIONS';
    END IF;
    IF jsonb_typeof(NEW.answers) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'INVALID_APPLICATION_ANSWERS'; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_object_keys(NEW.answers) AS answer_key(key)
      WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_questions) AS question(value) WHERE question.value->>'id'=answer_key.key)) THEN
      RAISE EXCEPTION 'INVALID_APPLICATION_ANSWERS';
    END IF;
    FOR v_question IN SELECT value FROM jsonb_array_elements(v_questions) LOOP
      v_answer := NEW.answers->(v_question->>'id');
      v_text := btrim(coalesce(v_answer #>> '{}',''));
      IF (v_answer IS NOT NULL AND jsonb_typeof(v_answer) IS DISTINCT FROM 'string')
        OR ((v_question->>'required')::boolean AND v_text='')
        OR char_length(v_text)>2000
        OR (v_question->>'type'='select' AND v_text<>'' AND NOT ((v_question->'options') ? v_text)) THEN
        RAISE EXCEPTION 'INVALID_APPLICATION_ANSWERS';
      END IF;
    END LOOP;
  END IF;
  NEW.program_questions_version := v_version;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_enrollment_question_version BEFORE INSERT ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.capture_enrollment_question_version();

REVOKE ALL ON FUNCTION public.get_staff_application_questions(uuid,uuid),
  public.set_staff_application_questions(uuid,uuid,integer,jsonb),
  public.capture_enrollment_question_version() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_application_questions(uuid,uuid),
  public.set_staff_application_questions(uuid,uuid,integer,jsonb) TO service_role;
COMMIT;
