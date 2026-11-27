-- Core release: immutable payment receipts, bounded email dispatch, managed partners.
BEGIN;
CREATE TABLE public.payment_receipts (
  enrollment_id uuid PRIMARY KEY REFERENCES public.enrollments(id) ON DELETE RESTRICT,
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_receipts FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.payment_receipts TO service_role;

CREATE FUNCTION public.capture_payment_receipt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_course text; v_batch text; v_test boolean;
BEGIN
  IF NEW.status <> 'confirmed' OR NEW.payment_status <> 'verified'
     OR NEW.payable_poisha <= 0 OR NEW.confirmed_at IS NULL OR NEW.verified_at IS NULL
     OR NEW.payment_method NOT IN ('bkash','bank_transfer','cash') THEN RETURN NEW; END IF;
  -- A confirmed flag alone is not gateway evidence (including legacy fixture inserts).
  IF NEW.staff_payment_details IS NULL AND NEW.staff_payment_recorded_by IS NULL
     AND NOT NEW.applicant_payment_submitted AND NEW.payment_method='bkash'
     AND NOT EXISTS (SELECT 1 FROM public.payment_attempts pa WHERE pa.enrollment_id=NEW.id
       AND pa.status='validated' AND pa.trx_id=NEW.submitted_payment_ref
       AND pa.validated_amount_poisha=NEW.payable_poisha AND pa.currency='BDT') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'confirmed' AND OLD.payment_status = 'verified' THEN RETURN NEW; END IF;
  END IF;
  SELECT title INTO STRICT v_course FROM public.courses WHERE id=NEW.course_id;
  SELECT name INTO STRICT v_batch FROM public.batches WHERE id=NEW.batch_id;
  v_test := NEW.is_dev_fixture OR EXISTS (
    SELECT 1 FROM public.payment_attempts pa WHERE pa.enrollment_id=NEW.id
      AND (pa.bkash_sandbox_v2 OR pa.payment_id LIKE 'MOCKPAY-%')
  );
  INSERT INTO public.payment_receipts(enrollment_id,snapshot) VALUES (NEW.id,jsonb_build_object(
    'receipt_number','LNA-R-' || regexp_replace(NEW.public_ref,'^LNA-',''),
    'public_ref',NEW.public_ref,'full_name',NEW.full_name,'course_title',v_course,
    'batch_name',v_batch,'confirmed_at',NEW.confirmed_at,'collected_poisha',NEW.payable_poisha::text,
    'payment_method',NEW.payment_method,'is_test',v_test
  )) ON CONFLICT(enrollment_id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.capture_payment_receipt() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER trg_capture_payment_receipt AFTER INSERT OR UPDATE OF status,payment_status ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.capture_payment_receipt();

-- Do not fabricate historical receipts. Existing records must be reconciled before issuance.
ALTER TABLE public.email_outbox ADD COLUMN dispatch_token uuid,
  ADD COLUMN dispatch_expires_at timestamptz,
  ADD COLUMN first_dispatch_at timestamptz,
  ADD COLUMN next_dispatch_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX idx_email_outbox_due ON public.email_outbox(next_dispatch_at,created_at)
  WHERE status IN ('pending','failed');

CREATE FUNCTION public.claim_confirmation_email(p_id uuid,p_live boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE v_row public.email_outbox%ROWTYPE; v_receipt jsonb; v_enrollment public.enrollments%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.email_outbox WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','missing'); END IF;
  IF v_row.status='sent' THEN RETURN jsonb_build_object('status','sent','provider_message_id',v_row.provider_message_id); END IF;
  IF v_row.template NOT IN ('enrollment_confirmed_paid','enrollment_confirmed_free') THEN
    RETURN jsonb_build_object('status','unsupported'); END IF;
  IF v_row.dispatch_expires_at>now() OR v_row.next_dispatch_at>now() OR v_row.retry_count>=5
    OR (v_row.status='failed' AND v_row.first_dispatch_at IS NULL)
    OR v_row.first_dispatch_at<now()-interval '20 hours' THEN RETURN jsonb_build_object('status','deferred'); END IF;
  SELECT * INTO v_enrollment FROM public.enrollments WHERE id=v_row.enrollment_id;
  IF NOT FOUND OR v_enrollment.status<>'confirmed' OR v_enrollment.archived_at IS NOT NULL
    OR lower(v_enrollment.email::text)<>lower(v_row.recipient_email::text) THEN
    RETURN jsonb_build_object('status','ineligible'); END IF;
  IF v_row.template='enrollment_confirmed_paid' THEN
    SELECT snapshot INTO v_receipt FROM public.payment_receipts WHERE enrollment_id=v_row.enrollment_id;
    IF v_receipt IS NULL OR v_enrollment.payment_status<>'verified'
      OR v_receipt->>'collected_poisha' IS DISTINCT FROM v_row.payload->>'payable_poisha' THEN
      RETURN jsonb_build_object('status','receipt_missing'); END IF;
  ELSIF v_enrollment.payable_poisha<>0 THEN RETURN jsonb_build_object('status','ineligible'); END IF;
  IF p_live AND (v_enrollment.is_dev_fixture OR coalesce((v_receipt->>'is_test')::boolean,false)) THEN
    RETURN jsonb_build_object('status','test_record'); END IF;
  -- 75 confirmation first attempts per rolling day; recovery independently reserves 25.
  IF p_live AND v_row.first_dispatch_at IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('lna_confirmation_daily_quota'));
    IF (SELECT count(*) FROM public.email_outbox WHERE first_dispatch_at>=now()-interval '24 hours')>=75 THEN
      RETURN jsonb_build_object('status','quota'); END IF;
  END IF;
  UPDATE public.email_outbox SET dispatch_token=gen_random_uuid(), dispatch_expires_at=now()+interval '2 minutes',
    first_dispatch_at=coalesce(first_dispatch_at,now()) WHERE id=p_id RETURNING * INTO v_row;
  RETURN jsonb_build_object('status','claimed','outbox',to_jsonb(v_row),'receipt',v_receipt);
END $$;

CREATE FUNCTION public.finish_confirmation_email(p_id uuid,p_token uuid,p_provider_id text,p_error text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
  UPDATE public.email_outbox SET dispatch_token=NULL,dispatch_expires_at=NULL,
    status=CASE WHEN p_provider_id IS NOT NULL THEN 'sent' ELSE 'failed' END,
    provider_message_id=p_provider_id,
    sent_at=CASE WHEN p_provider_id IS NOT NULL THEN now() ELSE NULL END,
    retry_count=retry_count+CASE WHEN p_provider_id IS NULL THEN 1 ELSE 0 END,
    last_error=CASE WHEN p_provider_id IS NOT NULL THEN NULL ELSE left(coalesce(p_error,'DISPATCH_FAILED'),200) END,
    next_dispatch_at=now()+interval '5 minutes'
  WHERE id=p_id AND dispatch_token=p_token AND status<>'sent';
  RETURN FOUND;
END $$;

CREATE FUNCTION public.list_due_confirmation_emails(p_limit integer DEFAULT 20)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
  SELECT o.id FROM public.email_outbox o JOIN public.enrollments e ON e.id=o.enrollment_id
  LEFT JOIN public.payment_receipts r ON r.enrollment_id=e.id
  WHERE o.status IN ('pending','failed') AND o.template IN ('enrollment_confirmed_paid','enrollment_confirmed_free')
    AND o.retry_count<5 AND (o.dispatch_expires_at IS NULL OR o.dispatch_expires_at<=now())
    AND o.next_dispatch_at<=now() AND (o.first_dispatch_at IS NULL AND o.status='pending' OR o.first_dispatch_at>=now()-interval '20 hours')
    AND e.status='confirmed' AND e.archived_at IS NULL AND NOT e.is_dev_fixture
    AND lower(e.email::text)=lower(o.recipient_email::text)
    AND (o.template='enrollment_confirmed_free' AND e.payable_poisha=0 OR
      o.template='enrollment_confirmed_paid' AND e.payment_status='verified' AND r.snapshot IS NOT NULL
      AND NOT coalesce((r.snapshot->>'is_test')::boolean,false))
  ORDER BY o.created_at LIMIT least(greatest(coalesce(p_limit,20),1),50)
$$;
REVOKE ALL ON FUNCTION public.claim_confirmation_email(uuid,boolean),public.finish_confirmation_email(uuid,uuid,text,text),public.list_due_confirmation_emails(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_confirmation_email(uuid,boolean),public.finish_confirmation_email(uuid,uuid,text,text),public.list_due_confirmation_emails(integer) TO service_role;

CREATE TABLE public.website_partners (
  id text PRIMARY KEY CHECK(id ~ '^partner-[a-z0-9-]{1,100}$'),
  name text NOT NULL CHECK(char_length(btrim(name)) BETWEEN 2 AND 120),
  sector text NOT NULL CHECK(char_length(btrim(sector)) BETWEEN 2 AND 160),
  logo_src text CHECK(logo_src IS NULL OR logo_src ~ '^/images/partners/[A-Za-z0-9_.-]+\.(png|jpg|jpeg|webp|avif|svg)$'),
  display_order integer NOT NULL DEFAULT 0 CHECK(display_order BETWEEN 0 AND 9999),
  published boolean NOT NULL DEFAULT false,
  provenance jsonb NOT NULL CHECK(jsonb_typeof(provenance)='object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.website_partners ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.website_partners FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.website_partners TO service_role;
INSERT INTO public.website_partners(id,name,sector,logo_src,display_order,published,provenance) VALUES
('partner-btrc','BTRC','Telecommunications & Regulatory','/images/partners/btrc.png',1,true,'{"class": "A", "verified": true, "source": "WordPress lnabdorg_wp955.sql (attachment ID 748)", "verifiedBy": "Content Migration", "verifiedOn": "2026-11-09"}'::jsonb),
('partner-sheba','Sheba Platform','Technology & Platform Services','/images/partners/sheba.png',2,true,'{"class": "A", "verified": true, "source": "WordPress lnabdorg_wp955.sql (attachment ID 744)", "verifiedBy": "Content Migration", "verifiedOn": "2026-11-09"}'::jsonb),
('partner-ictd','ICT Division','Digital Innovation & Public Sector','/images/partners/ictd.png',3,true,'{"class": "A", "verified": true, "source": "WordPress lnabdorg_wp955.sql (attachment ID 749)", "verifiedBy": "Content Migration", "verifiedOn": "2026-11-09"}'::jsonb),
('partner-ecourier','eCourier','Logistics & Supply Chain','/images/partners/ecourier.png',4,true,'{"class": "A", "verified": true, "source": "WordPress lnabdorg_wp955.sql (attachment ID 745)", "verifiedBy": "Content Migration", "verifiedOn": "2026-11-09"}'::jsonb),
('partner-goyara','Goyara','Technology & E-commerce','/images/partners/goyara.png',5,true,'{"class": "A", "verified": true, "source": "WordPress lnabdorg_wp955.sql (attachment ID 750)", "verifiedBy": "Content Migration", "verifiedOn": "2026-11-09"}'::jsonb),
('partner-unicert','Unicert Global','Certification & Quality Systems','/images/partners/unicert.png',6,true,'{"class": "A", "verified": true, "source": "WordPress lnabdorg_wp955.sql (attachment ID 1221)", "verifiedBy": "Content Migration", "verifiedOn": "2026-11-09"}'::jsonb),
('partner-triptakerz','Trip Takerz','Travel & Corporate Hospitality','/images/partners/triptakerz.png',7,true,'{"class": "A", "verified": true, "source": "WordPress lnabdorg_wp955.sql (attachment ID 1230)", "verifiedBy": "Content Migration", "verifiedOn": "2026-11-09"}'::jsonb);
CREATE FUNCTION public.save_staff_partner(p_actor uuid,p_id text,p_revision timestamptz,p_name text,p_sector text,p_logo text,p_order integer,p_published boolean,p_attested boolean)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE v_role text; v_old public.website_partners%ROWTYPE; v_id text; v_provenance jsonb;
BEGIN
  v_role:=public.require_staff_actor(p_actor,ARRAY['admin','super_admin'],'PARTNER_EDIT_FORBIDDEN');
  IF p_attested IS DISTINCT FROM true OR p_name IS NULL OR p_sector IS NULL OR p_published IS NULL
    OR char_length(btrim(p_name)) NOT BETWEEN 2 AND 120 OR char_length(btrim(p_sector)) NOT BETWEEN 2 AND 160
    OR p_order IS NULL OR p_order NOT BETWEEN 0 AND 9999
    OR (p_logo IS NOT NULL AND p_logo !~ '^/images/partners/[A-Za-z0-9_.-]+\.(png|jpg|jpeg|webp|avif|svg)$') THEN RETURN 'INVALID'; END IF;
  v_provenance:=jsonb_build_object('class','A','verified',true,'source','Staff verified partner','verifiedBy','Lead Nation Academy staff','verifiedOn',current_date::text);
  IF p_id IS NULL THEN
    v_id:='partner-'||gen_random_uuid()::text;
    INSERT INTO public.website_partners VALUES(v_id,btrim(p_name),btrim(p_sector),p_logo,p_order,p_published,v_provenance,now());
  ELSE
    SELECT * INTO v_old FROM public.website_partners WHERE id=p_id FOR UPDATE;
    IF NOT FOUND OR v_old.updated_at IS DISTINCT FROM p_revision THEN RETURN 'STALE'; END IF;
    v_id:=p_id;
    UPDATE public.website_partners SET name=btrim(p_name),sector=btrim(p_sector),logo_src=p_logo,display_order=p_order,
      published=p_published,provenance=v_provenance,updated_at=clock_timestamp() WHERE id=v_id;
  END IF;
  INSERT INTO public.audit_events(actor_id,actor_role,action,target_entity,target_id,audit_scope,before_state,after_state)
    VALUES(p_actor,v_role,'staff_saved_partner','website_partners',v_id,'website',CASE WHEN p_id IS NULL THEN NULL ELSE to_jsonb(v_old) END,
      jsonb_build_object('name',btrim(p_name),'sector',btrim(p_sector),'logo_src',p_logo,'display_order',p_order,'published',p_published));
  RETURN 'OK';
END $$;
REVOKE ALL ON FUNCTION public.save_staff_partner(uuid,text,timestamptz,text,text,text,integer,boolean,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_staff_partner(uuid,text,timestamptz,text,text,text,integer,boolean,boolean) TO service_role;
COMMIT;
