BEGIN;

ALTER TABLE public.mentors ADD COLUMN company_logo_src text;

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (char_length(trim(full_name)) BETWEEN 2 AND 120),
  email text NOT NULL CHECK (char_length(email) >= 5 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text NOT NULL CHECK (phone ~ '^01[3-9][0-9]{8}$'),
  university text CHECK (university IS NULL OR char_length(university) <= 200),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_students_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.student_contacts (
  email text NOT NULL,
  phone text NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  PRIMARY KEY (email, phone)
);
CREATE TABLE public.student_enrollment_links (
  enrollment_id uuid PRIMARY KEY REFERENCES public.enrollments(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT
);
CREATE INDEX idx_student_enrollment_links_student ON public.student_enrollment_links(student_id);

CREATE TABLE public.student_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  batch_id uuid,
  completed_on date,
  recorded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (batch_id, course_id) REFERENCES public.batches(id, course_id) ON DELETE RESTRICT,
  UNIQUE NULLS NOT DISTINCT (student_id, course_id, batch_id)
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_completions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.students, public.student_contacts, public.student_enrollment_links, public.student_completions
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.students TO service_role;
GRANT SELECT, INSERT ON public.student_contacts, public.student_enrollment_links, public.student_completions TO service_role;

-- Exact email and phone pairs link historical enrollments; shared phones or emails
-- on their own are insufficient to merge two people.
WITH contacts AS (
  SELECT DISTINCT ON (lower(trim(email::text)), phone)
    left(trim(full_name), 120) AS full_name, lower(trim(email::text)) AS email, phone
  FROM public.enrollments WHERE status = 'confirmed' AND NOT is_dev_fixture
  ORDER BY lower(trim(email::text)), phone, coalesce(confirmed_at, created_at) DESC, id
), universities AS (
  SELECT DISTINCT ON (lower(trim(email::text)), phone)
    lower(trim(email::text)) AS email, phone, left(trim(answers->>'university'), 200) AS university
  FROM public.enrollments
  WHERE status = 'confirmed' AND NOT is_dev_fixture
    AND jsonb_typeof(answers->'university') = 'string' AND nullif(trim(answers->>'university'), '') IS NOT NULL
  ORDER BY lower(trim(email::text)), phone, coalesce(confirmed_at, created_at) DESC, id
), created AS (
  INSERT INTO public.students (full_name, email, phone, university)
  SELECT c.full_name, c.email, c.phone, u.university FROM contacts c LEFT JOIN universities u USING (email, phone)
  RETURNING id, email, phone
)
INSERT INTO public.student_contacts (student_id, email, phone) SELECT id, email, phone FROM created;

INSERT INTO public.student_enrollment_links (enrollment_id, student_id)
SELECT e.id, c.student_id FROM public.enrollments e
JOIN public.student_contacts c ON c.email = lower(trim(e.email::text)) AND c.phone = e.phone
WHERE e.status = 'confirmed' AND NOT e.is_dev_fixture;

CREATE FUNCTION public.link_confirmed_student() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public
AS $$
DECLARE
  v_student_id uuid;
  v_email text := lower(trim(new.email::text));
BEGIN
  IF EXISTS (SELECT 1 FROM public.student_enrollment_links WHERE enrollment_id = new.id) THEN RETURN new; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('lna:student:' || v_email || ':' || new.phone, 0));
  SELECT student_id INTO v_student_id FROM public.student_contacts WHERE email = v_email AND phone = new.phone;
  IF v_student_id IS NULL THEN
    INSERT INTO public.students (full_name, email, phone, university)
    VALUES (left(trim(new.full_name), 120), v_email, new.phone,
      CASE WHEN jsonb_typeof(new.answers->'university') = 'string' THEN left(nullif(trim(new.answers->>'university'), ''), 200) END)
    RETURNING id INTO v_student_id;
    INSERT INTO public.student_contacts (email, phone, student_id) VALUES (v_email, new.phone, v_student_id);
  END IF;
  INSERT INTO public.student_enrollment_links (enrollment_id, student_id) VALUES (new.id, v_student_id)
    ON CONFLICT (enrollment_id) DO NOTHING;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.link_confirmed_student() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_enrollment_confirmed_student AFTER INSERT OR UPDATE OF status ON public.enrollments
  FOR EACH ROW WHEN (new.status = 'confirmed' AND NOT new.is_dev_fixture) EXECUTE FUNCTION public.link_confirmed_student();

CREATE FUNCTION public.manage_staff_student(
  p_actor uuid, p_operation text, p_id uuid, p_revision timestamptz,
  p_name text, p_email text, p_phone text, p_university text,
  p_course uuid, p_batch uuid, p_completed date
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public
AS $$
DECLARE
  v_existing public.students%ROWTYPE;
  v_id uuid := p_id;
  v_claim uuid;
  v_email text := lower(trim(p_email));
BEGIN
  PERFORM 1 FROM public.profiles WHERE id = p_actor AND role = 'super_admin' AND account_state = 'active' FOR SHARE;
  IF NOT FOUND THEN RAISE insufficient_privilege; END IF;
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
    END IF;
  ELSE
    UPDATE public.students SET archived_at = CASE WHEN p_operation = 'archive' THEN coalesce(archived_at, now()) END
      WHERE id = v_id;
  END IF;
  INSERT INTO public.audit_events (actor_id, actor_role, action, target_entity, target_id, after_state)
  VALUES (p_actor, 'super_admin', 'staff_student_' || p_operation, 'students', v_id::text,
    jsonb_build_object('recorded_course', p_course, 'recorded_batch', p_batch));
  RETURN 'OK';
END;
$$;
REVOKE ALL ON FUNCTION public.manage_staff_student(uuid,text,uuid,timestamptz,text,text,text,text,uuid,uuid,date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_staff_student(uuid,text,uuid,timestamptz,text,text,text,text,uuid,uuid,date) TO service_role;

CREATE FUNCTION public.manage_staff_mentor(
  p_actor uuid, p_operation text, p_id uuid, p_revision timestamptz,
  p_name text, p_role text, p_company text, p_bio text, p_photo text, p_logo text
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public
AS $$
DECLARE
  v_existing public.mentors%ROWTYPE;
  v_id uuid := p_id;
  v_slug text;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id = p_actor AND role = 'super_admin' AND account_state = 'active' FOR SHARE;
  IF NOT FOUND THEN RAISE insufficient_privilege; END IF;
  IF coalesce(p_operation, '') NOT IN ('create', 'edit', 'archive', 'restore') THEN RETURN 'INVALID'; END IF;
  IF p_operation <> 'create' THEN
    SELECT * INTO v_existing FROM public.mentors WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN RETURN 'NOT_FOUND'; END IF;
    IF v_existing.updated_at IS DISTINCT FROM p_revision THEN RETURN 'STALE'; END IF;
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
  ELSE
    UPDATE public.mentors SET archived_at = CASE WHEN p_operation = 'archive' THEN coalesce(archived_at, now()) END
      WHERE id = p_id;
  END IF;
  INSERT INTO public.audit_events (actor_id, actor_role, action, target_entity, target_id)
  VALUES (p_actor, 'super_admin', 'staff_mentor_' || p_operation, 'mentors', v_id::text);
  RETURN 'OK';
END;
$$;
REVOKE ALL ON FUNCTION public.manage_staff_mentor(uuid,text,uuid,timestamptz,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_staff_mentor(uuid,text,uuid,timestamptz,text,text,text,text,text,text) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
