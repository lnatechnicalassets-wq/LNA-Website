BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('mentor-media', 'mentor-media', false, 1400000, ARRAY['image/webp']);

-- Only the staff service may write media. The app checks publication and
-- current profile references before returning files from this private bucket.
CREATE FUNCTION public.save_staff_mentor_profile(
  p_actor uuid, p_operation text, p_id uuid, p_revision timestamptz,
  p_name text, p_role text, p_company text, p_bio text, p_photo text, p_logo text,
  p_linkedin text, p_expertise jsonb, p_published boolean
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
  ELSE
    UPDATE public.mentors SET archived_at = CASE WHEN p_operation = 'archive' THEN coalesce(archived_at, now()) END
      WHERE id = p_id;
  END IF;
  INSERT INTO public.audit_events (actor_id, actor_role, action, target_entity, target_id)
  VALUES (p_actor, 'super_admin', 'staff_mentor_' || p_operation, 'mentors', v_id::text);
  RETURN 'OK';
END;
$$;
REVOKE ALL ON FUNCTION public.save_staff_mentor_profile(uuid,text,uuid,timestamptz,text,text,text,text,text,text,text,jsonb,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_staff_mentor_profile(uuid,text,uuid,timestamptz,text,text,text,text,text,text,text,jsonb,boolean) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
