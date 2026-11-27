-- Email possession replaces reference/contact guessing at the public status endpoint.
BEGIN;
ALTER TABLE public.enrollments ADD COLUMN recovery_contact_version bigint NOT NULL DEFAULT 0;
ALTER TABLE public.students ADD COLUMN recovery_contact_version bigint NOT NULL DEFAULT 0;
CREATE FUNCTION public.bump_enrollment_recovery_contact_version() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email OR NEW.phone IS DISTINCT FROM OLD.phone
     OR NEW.full_name IS DISTINCT FROM OLD.full_name OR NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN
    NEW.recovery_contact_version:=OLD.recovery_contact_version+1;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.bump_enrollment_recovery_contact_version() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bump_enrollment_recovery_contact_version() TO service_role;
CREATE TRIGGER trg_enrollment_recovery_contact_version BEFORE UPDATE OF email,phone,full_name,archived_at
ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.bump_enrollment_recovery_contact_version();
CREATE TRIGGER trg_student_recovery_contact_version BEFORE UPDATE OF email,phone,full_name,archived_at
ON public.students FOR EACH ROW EXECUTE FUNCTION public.bump_enrollment_recovery_contact_version();
CREATE INDEX idx_students_recovery_email ON public.students(lower(btrim(email))) WHERE archived_at IS NULL;
CREATE INDEX idx_enrollments_recovery_email ON public.enrollments(lower(btrim(email::text)),created_at DESC)
  WHERE archived_at IS NULL AND NOT is_dev_fixture;
CREATE TABLE public.application_recovery_requests (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  email_key text NOT NULL CHECK (email_key ~ '^[a-f0-9]{24}$'),
  contacts jsonb NOT NULL CHECK (jsonb_typeof(contacts)='array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '20 minutes',
  used_at timestamptz
);
CREATE INDEX idx_application_recovery_email ON public.application_recovery_requests(email_key,created_at DESC);
CREATE INDEX idx_application_recovery_created ON public.application_recovery_requests(created_at);
ALTER TABLE public.application_recovery_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.application_recovery_requests FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.application_recovery_requests TO service_role;

CREATE FUNCTION public.issue_application_recovery(p_email text,p_email_key text,p_reference text,p_token_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE v_contacts jsonb;
BEGIN
  IF coalesce(char_length(p_email),0) NOT BETWEEN 5 AND 160 OR p_email<>lower(btrim(p_email))
     OR p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     OR coalesce(p_email_key,'') !~ '^[a-f0-9]{24}$' OR coalesce(p_token_hash,'') !~ '^[a-f0-9]{64}$'
     OR (p_reference IS NOT NULL AND p_reference !~ '^LNA-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$') THEN RETURN false; END IF;
  -- Single short transaction serializes delivery allowance across all server instances.
  -- Reserve most of the daily transactional-email allowance for confirmations.
  PERFORM pg_advisory_xact_lock(hashtextextended('lna:application-recovery:delivery-budget',0));
  DELETE FROM public.application_recovery_requests WHERE created_at<now()-interval '24 hours';
  IF EXISTS (SELECT 1 FROM public.application_recovery_requests WHERE email_key=p_email_key AND created_at>now()-interval '10 minutes')
    OR (SELECT count(*) FROM public.application_recovery_requests)>=25 THEN RETURN false; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'version',e.recovery_contact_version,
    'student_id',e.student_id,'student_version',e.student_version) ORDER BY e.created_at DESC,e.id),'[]'::jsonb)
  INTO v_contacts FROM (
    -- Unlinked applications use their own address; confirmed linked records use the current
    -- student address, not stale email aliases or historical payment/email snapshots.
    SELECT e.id,e.recovery_contact_version,e.created_at,NULL::uuid AS student_id,NULL::bigint AS student_version
    FROM public.enrollments e WHERE lower(btrim(e.email::text))=p_email
      AND e.archived_at IS NULL AND NOT e.is_dev_fixture AND (p_reference IS NULL OR e.public_ref=p_reference)
      AND NOT EXISTS (SELECT 1 FROM public.student_enrollment_links l WHERE l.enrollment_id=e.id)
    UNION ALL
    SELECT e.id,e.recovery_contact_version,e.created_at,s.id,s.recovery_contact_version
    FROM public.students s JOIN public.student_enrollment_links l ON l.student_id=s.id
    JOIN public.enrollments e ON e.id=l.enrollment_id
    WHERE lower(btrim(s.email))=p_email AND s.archived_at IS NULL AND e.archived_at IS NULL
      AND NOT e.is_dev_fixture AND (p_reference IS NULL OR e.public_ref=p_reference)
    ORDER BY created_at DESC,id LIMIT 20
  ) e;
  IF jsonb_array_length(v_contacts)=0 THEN RETURN false; END IF;
  INSERT INTO public.application_recovery_requests(token_hash,email_key,contacts) VALUES(p_token_hash,p_email_key,v_contacts);
  RETURN true;
END; $$;
CREATE FUNCTION public.redeem_application_recovery(p_token_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE v_contacts jsonb; v_applications jsonb;
BEGIN
  IF coalesce(p_token_hash,'') !~ '^[a-f0-9]{64}$' THEN RETURN NULL; END IF;
  -- Consume exactly once even with parallel requests. Never trust a supplied email/reference.
  UPDATE public.application_recovery_requests SET used_at=now()
    WHERE token_hash=p_token_hash AND used_at IS NULL AND expires_at>now() RETURNING contacts INTO v_contacts;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('reference',e.public_ref,'course',c.title,'batch',b.name,
      'status',CASE WHEN e.status='pending' AND e.hold_expires_at<=now() AND NOT EXISTS (
        SELECT 1 FROM public.payment_attempts pa WHERE pa.enrollment_id=e.id AND pa.status IN ('initiated','pending','review_hold','validated')
      ) THEN 'expired' ELSE e.status END,'paymentStatus',e.payment_status) ORDER BY e.created_at DESC,e.id),'[]'::jsonb)
  INTO v_applications FROM jsonb_to_recordset(v_contacts) AS a(id uuid,version bigint,student_id uuid,student_version bigint)
  JOIN public.enrollments e ON e.id=a.id AND e.recovery_contact_version=a.version
  JOIN public.courses c ON c.id=e.course_id JOIN public.batches b ON b.id=e.batch_id
  LEFT JOIN public.student_enrollment_links l ON l.enrollment_id=e.id
  LEFT JOIN public.students s ON s.id=l.student_id
  WHERE e.archived_at IS NULL AND NOT e.is_dev_fixture
    AND l.student_id IS NOT DISTINCT FROM a.student_id
    AND (a.student_id IS NULL OR (s.archived_at IS NULL AND s.recovery_contact_version=a.student_version));
  RETURN jsonb_build_object('applications',v_applications);
END; $$;
REVOKE ALL ON FUNCTION public.issue_application_recovery(text,text,text,text),public.redeem_application_recovery(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.issue_application_recovery(text,text,text,text),public.redeem_application_recovery(text) TO service_role;

-- Staff contact correction without altering historic payments or sent correspondence.
-- Restrict linked-record changes until the student directory agrees on identity.
CREATE FUNCTION public.correct_staff_admission_contact(p_actor uuid,p_id uuid,p_revision timestamptz,
  p_name text,p_email text,p_phone text,p_reason text,p_attested boolean)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public SET lock_timeout='2s' AS $$
DECLARE v_old public.enrollments%ROWTYPE; v_student public.students%ROWTYPE; v_link uuid;
  v_email text:=lower(btrim(p_email)); v_name text:=btrim(p_name); v_claim uuid;
BEGIN
  PERFORM public.require_staff_actor(p_actor,ARRAY['admin','super_admin'],'STAFF_ENROLLMENT_FORBIDDEN');
  IF p_attested IS DISTINCT FROM true OR coalesce(char_length(btrim(p_reason)),0) NOT BETWEEN 1 AND 500
     OR coalesce(char_length(v_name),0) NOT BETWEEN 2 AND 120 OR coalesce(char_length(v_email),0) NOT BETWEEN 5 AND 160
     OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR coalesce(p_phone,'') !~ '^01[3-9][0-9]{8}$' THEN RETURN 'INVALID'; END IF;
  SELECT * INTO v_old FROM public.enrollments WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR v_old.archived_at IS NOT NULL THEN RETURN 'NOT_FOUND'; END IF;
  IF v_old.updated_at IS DISTINCT FROM p_revision THEN RETURN 'STALE'; END IF;
  IF v_old.full_name=v_name AND lower(v_old.email::text)=v_email AND v_old.phone=p_phone THEN RETURN 'OK'; END IF;
  IF v_old.status IN ('pending','review_hold') OR EXISTS (SELECT 1 FROM public.payment_attempts WHERE enrollment_id=p_id AND status IN ('initiated','pending','review_hold'))
     OR EXISTS (SELECT 1 FROM public.email_outbox WHERE enrollment_id=p_id AND status<>'sent') THEN RETURN 'WORK_IN_PROGRESS'; END IF;
  -- Serialize contact uniqueness with intake and transfer operations on the batch.
  PERFORM 1 FROM public.batches WHERE id=v_old.batch_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.enrollments e WHERE e.batch_id=v_old.batch_id AND e.id<>p_id
    AND (lower(e.email::text)=v_email OR e.phone=p_phone)
    AND (e.status IN ('application_in_process','pending','confirmed','review_hold') OR EXISTS (
      SELECT 1 FROM public.payment_attempts pa WHERE pa.enrollment_id=e.id AND pa.status IN ('initiated','pending','review_hold')))) THEN RETURN 'DUPLICATE'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('lna:student:'||v_email||':'||p_phone,0));
  SELECT student_id INTO v_claim FROM public.student_contacts WHERE email=v_email AND phone=p_phone;
  SELECT student_id INTO v_link FROM public.student_enrollment_links WHERE enrollment_id=p_id;
  IF v_link IS NOT NULL THEN
    SELECT * INTO v_student FROM public.students WHERE id=v_link FOR SHARE;
    IF v_student.archived_at IS NOT NULL OR v_claim IS DISTINCT FROM v_link OR v_student.email<>v_email OR v_student.phone<>p_phone THEN RETURN 'STUDENT_CONTACT_FIRST'; END IF;
  ELSIF EXISTS (SELECT 1 FROM public.student_contacts WHERE email=lower(v_old.email::text) AND phone=v_old.phone AND student_id IS DISTINCT FROM v_claim) THEN
    RETURN 'DUPLICATE';
  END IF;
  UPDATE public.enrollments SET full_name=v_name,email=v_email,phone=p_phone WHERE id=p_id;
  PERFORM public.record_staff_audit_event(p_actor,ARRAY['admin','super_admin'],'staff_corrected_admission_contact','enrollments',p_id::text,
    'batch',v_old.batch_id,NULL,btrim(p_reason),
    jsonb_build_object('full_name',v_old.full_name,'email',v_old.email::text,'phone',v_old.phone),
    jsonb_build_object('full_name',v_name,'email',v_email,'phone',p_phone));
  RETURN 'OK';
EXCEPTION WHEN lock_not_available OR deadlock_detected THEN RETURN 'BUSY';
  WHEN unique_violation THEN RETURN 'DUPLICATE';
END; $$;
REVOKE ALL ON FUNCTION public.correct_staff_admission_contact(uuid,uuid,timestamptz,text,text,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.correct_staff_admission_contact(uuid,uuid,timestamptz,text,text,text,text,boolean) TO service_role;
CREATE FUNCTION public.correct_staff_student_profile(p_actor uuid,p_id uuid,p_revision timestamptz,
  p_name text,p_email text,p_phone text,p_university text,p_reason text,p_attested boolean)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public SET lock_timeout='2s' AS $$
DECLARE v_student public.students%ROWTYPE; v_result text;
BEGIN
  PERFORM public.require_staff_actor(p_actor,ARRAY['admin','super_admin'],'STAFF_STUDENT_FORBIDDEN');
  IF p_attested IS DISTINCT FROM true OR coalesce(char_length(btrim(p_reason)),0) NOT BETWEEN 1 AND 500 THEN RETURN 'INVALID'; END IF;
  -- Match existing student contact lock order (pair then row).
  IF p_email IS NULL OR p_phone IS NULL THEN RETURN 'INVALID'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('lna:student:'||lower(btrim(p_email))||':'||p_phone,0));
  SELECT * INTO v_student FROM public.students WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR v_student.archived_at IS NOT NULL THEN RETURN 'NOT_FOUND'; END IF;
  IF v_student.updated_at IS DISTINCT FROM p_revision THEN RETURN 'STALE'; END IF;
  v_result:=public.manage_staff_student(p_actor,'edit',p_id,p_revision,p_name,p_email,p_phone,p_university,NULL,NULL,NULL);
  IF v_result<>'OK' THEN RETURN v_result; END IF;
  PERFORM public.record_staff_audit_event(p_actor,ARRAY['admin','super_admin'],'staff_corrected_student_profile','students',p_id::text,
    'global',NULL,NULL,btrim(p_reason),
    jsonb_build_object('full_name',v_student.full_name,'email',v_student.email,'phone',v_student.phone,'university',v_student.university),
    jsonb_build_object('full_name',btrim(p_name),'email',lower(btrim(p_email)),'phone',p_phone,'university',nullif(btrim(p_university),'')));
  RETURN 'OK';
EXCEPTION WHEN lock_not_available OR deadlock_detected THEN RETURN 'BUSY';
  WHEN unique_violation THEN RETURN 'DUPLICATE';
END; $$;
REVOKE ALL ON FUNCTION public.correct_staff_student_profile(uuid,uuid,timestamptz,text,text,text,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.correct_staff_student_profile(uuid,uuid,timestamptz,text,text,text,text,text,boolean) TO service_role;
COMMIT;
