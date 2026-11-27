-- Staff payment exception workspace. Does not allocate receipts or execute charges/refunds.
BEGIN;
CREATE TABLE public.payment_attention_reviews (
  attempt_id uuid PRIMARY KEY REFERENCES public.payment_attempts(id) ON DELETE RESTRICT,
  evidence_key text NOT NULL,
  note text NOT NULL CHECK (char_length(btrim(note)) BETWEEN 1 AND 500),
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.payment_attention_checks (
  attempt_id uuid PRIMARY KEY REFERENCES public.payment_attempts(id) ON DELETE RESTRICT,
  result jsonb NOT NULL CHECK (jsonb_typeof(result)='object'),
  checked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_attention_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attention_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_attention_reviews,public.payment_attention_checks FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.payment_attention_reviews,public.payment_attention_checks TO service_role;

-- The evidence key deliberately excludes lease timestamps. Identical rechecks do not
-- reopen a reviewed exception, but changed financial or admission evidence does.
CREATE VIEW public.staff_payment_attention_items WITH (security_invoker=true) AS
WITH attempt_items AS (
  SELECT pa.id AS attempt_id,e.id AS enrollment_id,e.batch_id,e.public_ref,e.full_name,
    e.status AS enrollment_status,pa.status AS attempt_status,
    CASE WHEN pa.sandbox_refund_state IN ('started','unconfirmed') THEN 'sandbox_refund'
         WHEN pa.status='review_hold' THEN 'gateway_review' ELSE 'unresolved_gateway' END AS kind,
    pa.amount_poisha::text AS amount_poisha,pa.trx_id AS reference,
    pa.failure_reason AS reason,pa.payment_id IS NOT NULL AS has_payment_id,
    pa.bkash_sandbox_v2 OR coalesce(pa.payment_id LIKE 'MOCKPAY-%',false) OR e.is_dev_fixture AS test_record,
    pa.updated_at AS changed_at,ch.result AS last_check,ch.checked_at,
    md5(jsonb_build_object('attempt_status',pa.status,'payment_id',pa.payment_id,'trx_id',pa.trx_id,
      'invoice',pa.tran_id,'amount',pa.amount_poisha,'validated_amount',pa.validated_amount_poisha,
      'code',pa.gateway_status_code,'reason',pa.failure_reason,'enrollment_status',e.status,
      'payment_status',e.payment_status,'batch_id',e.batch_id,'archived_at',e.archived_at,
      'payable',e.payable_poisha,'refund',pa.sandbox_refund_state,'last_check',ch.result)::text) AS evidence_key
  FROM public.payment_attempts pa JOIN public.enrollments e ON e.id=pa.enrollment_id
  LEFT JOIN public.payment_attention_checks ch ON ch.attempt_id=pa.id
  WHERE pa.status='review_hold' OR pa.sandbox_refund_state IN ('started','unconfirmed')
    OR (pa.status IN ('initiated','pending') AND pa.created_at<=now()-interval '60 seconds')
), gateway_items AS (
  SELECT a.*,r.note AS review_note,r.reviewed_at,
    coalesce(a.kind='gateway_review' AND r.evidence_key=a.evidence_key,false) AS reviewed
  FROM attempt_items a LEFT JOIN public.payment_attention_reviews r ON r.attempt_id=a.attempt_id
)
SELECT * FROM gateway_items
UNION ALL
SELECT NULL::uuid,e.id,e.batch_id,e.public_ref,e.full_name,e.status,NULL::text,
  'manual_review',e.payable_poisha::text,e.submitted_payment_ref,NULL::text,false,e.is_dev_fixture,
  e.updated_at,NULL::jsonb,NULL::timestamptz,NULL::text,NULL::text,NULL::timestamptz,false
FROM public.enrollments e
WHERE (e.staff_payment_recorded_by IS NOT NULL OR e.applicant_payment_submitted)
  AND e.payment_status IN ('pending_verification','review_hold')
  AND e.status IN ('application_in_process','review_hold');
REVOKE ALL ON public.staff_payment_attention_items FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.staff_payment_attention_items TO service_role;

CREATE FUNCTION public.list_staff_payment_attention(p_actor_id uuid,p_reviewed boolean,p_page integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE v_items jsonb; v_count bigint;
BEGIN
  PERFORM public.require_staff_actor(p_actor_id,ARRAY['admin','super_admin'],'PAYMENT_ATTENTION_FORBIDDEN');
  IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 10000 OR p_reviewed IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENTS' USING ERRCODE='22023';
  END IF;
  SELECT count(*) INTO v_count FROM public.staff_payment_attention_items WHERE reviewed=p_reviewed;
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.changed_at DESC,x.enrollment_id,x.attempt_id),'[]'::jsonb)
    INTO v_items FROM (SELECT * FROM public.staff_payment_attention_items WHERE reviewed=p_reviewed
      ORDER BY changed_at DESC,enrollment_id,attempt_id LIMIT 25 OFFSET (p_page-1)*25) x;
  RETURN jsonb_build_object('items',v_items,'total',v_count);
END; $$;

CREATE FUNCTION public.mark_staff_payment_reviewed(p_actor_id uuid,p_attempt_id uuid,p_evidence_key text,p_note text)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE v_attempt public.payment_attempts%ROWTYPE; v_item public.staff_payment_attention_items%ROWTYPE;
BEGIN
  PERFORM public.require_staff_actor(p_actor_id,ARRAY['admin','super_admin'],'PAYMENT_ATTENTION_FORBIDDEN');
  IF p_note IS NULL OR char_length(btrim(p_note)) NOT BETWEEN 1 AND 500 THEN RETURN 'INVALID'; END IF;
  SELECT * INTO v_attempt FROM public.payment_attempts WHERE id=p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'NOT_FOUND'; END IF;
  PERFORM 1 FROM public.enrollments WHERE id=v_attempt.enrollment_id FOR UPDATE;
  SELECT * INTO v_item FROM public.staff_payment_attention_items WHERE attempt_id=p_attempt_id;
  IF NOT FOUND OR v_item.kind<>'gateway_review' THEN RETURN 'NOT_REVIEWABLE'; END IF;
  IF v_item.evidence_key IS DISTINCT FROM p_evidence_key THEN RETURN 'STALE'; END IF;
  INSERT INTO public.payment_attention_reviews(attempt_id,evidence_key,note,actor_id,reviewed_at)
    VALUES(p_attempt_id,p_evidence_key,btrim(p_note),p_actor_id,now())
    ON CONFLICT(attempt_id) DO UPDATE SET evidence_key=excluded.evidence_key,note=excluded.note,
      actor_id=excluded.actor_id,reviewed_at=excluded.reviewed_at;
  PERFORM public.record_staff_audit_event(p_actor_id,ARRAY['admin','super_admin'],
    'staff_reviewed_payment_exception','payment_attempts',p_attempt_id::text,'batch',v_item.batch_id,
    NULL,btrim(p_note),NULL,jsonb_build_object('evidence_key',p_evidence_key));
  RETURN 'OK';
END; $$;

-- Manual query workers share M24's lease with the scheduled reconciler.
CREATE FUNCTION public.claim_staff_payment_recheck(p_actor_id uuid,p_attempt_id uuid,p_owner uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE v_attempt public.payment_attempts%ROWTYPE;
BEGIN
  PERFORM public.require_staff_actor(p_actor_id,ARRAY['admin','super_admin'],'PAYMENT_ATTENTION_FORBIDDEN');
  IF p_owner IS NULL THEN RETURN NULL; END IF;
  UPDATE public.payment_attempts SET reconcile_owner=p_owner,reconcile_until=now()+interval '3 minutes'
    WHERE id=p_attempt_id AND gateway='bkash' AND payment_id IS NOT NULL
      AND status IN ('initiated','pending','review_hold')
      AND sandbox_refund_state IS NULL AND updated_at<=now()-interval '60 seconds'
      AND (reconcile_until IS NULL OR reconcile_until<=now()) RETURNING * INTO v_attempt;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('payment_id',v_attempt.payment_id,'tran_id',v_attempt.tran_id,
    'amount_poisha',v_attempt.amount_poisha::text,'sandbox',v_attempt.bkash_sandbox_v2);
END; $$;

-- Accept only a server-obtained query result. An expired/foreign lease cannot change state.
-- Review-held receipts remain held; staff cannot clear them by typing a transaction ID.
CREATE FUNCTION public.finish_staff_payment_recheck(p_actor_id uuid,p_attempt_id uuid,p_owner uuid,p_result jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE v_attempt public.payment_attempts%ROWTYPE; v_enrollment public.enrollments%ROWTYPE;
  v_result jsonb; v_match boolean; v_amount bigint; v_status text; v_trx text; v_currency text; v_code text;
BEGIN
  PERFORM public.require_staff_actor(p_actor_id,ARRAY['admin','super_admin'],'PAYMENT_ATTENTION_FORBIDDEN');
  SELECT * INTO v_attempt FROM public.payment_attempts WHERE id=p_attempt_id FOR UPDATE;
  IF NOT FOUND OR p_owner IS NULL OR v_attempt.reconcile_owner IS DISTINCT FROM p_owner
    OR v_attempt.reconcile_until IS NULL OR v_attempt.reconcile_until<=now() THEN
    RETURN jsonb_build_object('status','lease_lost');
  END IF;
  IF jsonb_typeof(p_result) IS DISTINCT FROM 'object' OR octet_length(p_result::text)>4096 THEN
    RETURN jsonb_build_object('status','invalid');
  END IF;
  SELECT * INTO v_enrollment FROM public.enrollments WHERE id=v_attempt.enrollment_id FOR UPDATE;
  v_status:=left(coalesce(p_result->>'transaction_status','Unknown'),64);
  v_trx:=nullif(btrim(p_result->>'trx_id'),'');
  v_code:=left(coalesce(p_result->>'status_code',''),64);
  v_currency:=upper(coalesce(p_result->>'currency','UNKNOWN'));
  IF coalesce(p_result->>'amount_poisha','') ~ '^[0-9]{1,18}$' THEN v_amount:=(p_result->>'amount_poisha')::bigint; END IF;
  v_match:=coalesce(p_result->>'payment_id'=v_attempt.payment_id AND p_result->>'invoice'=v_attempt.tran_id,false);
  -- Store the allowlisted facts, not raw gateway messages, credentials or payer identifiers.
  v_result:=jsonb_build_object('transaction_status',v_status,'status_code',v_code,
    'payment_id',left(p_result->>'payment_id',128),'invoice',left(p_result->>'invoice',128),
    'trx_id',left(v_trx,128),'amount_poisha',v_amount::text,'currency',left(v_currency,16),'identity_matches',v_match);
  INSERT INTO public.payment_events(payment_attempt_id,tran_id,payment_id,source,event_status,redacted_payload)
    VALUES(v_attempt.id,v_attempt.tran_id,v_attempt.payment_id,'query_status',v_status,v_result);
  INSERT INTO public.payment_attention_checks(attempt_id,result,checked_at) VALUES(v_attempt.id,v_result,now())
    ON CONFLICT(attempt_id) DO UPDATE SET result=excluded.result,checked_at=excluded.checked_at;
  -- Never replace recorded evidence or reopen an admission on a staff recheck.
  IF v_attempt.status IN ('initiated','pending') AND v_attempt.trx_id IS NULL
     AND v_attempt.validated_amount_poisha IS NULL THEN
    IF v_match AND v_status='Completed' AND v_code='0000' AND char_length(v_trx) BETWEEN 4 AND 128
       AND v_amount=v_attempt.amount_poisha AND v_currency='BDT'
       AND v_enrollment.staff_payment_recorded_by IS NULL AND NOT v_enrollment.applicant_payment_submitted THEN
      BEGIN
        v_result:=public.confirm_payment(v_attempt.id,v_attempt.payment_id,v_trx,v_amount,v_currency,v_code,'Verified by staff query');
      EXCEPTION WHEN unique_violation OR check_violation THEN
        v_result:=public.record_payment_outcome(v_attempt.id,'review_hold',v_attempt.payment_id,
          'SETTLEMENT_CONFLICT','0000','Verified receipt requires manual review');
      END;
    ELSIF v_status='Completed' THEN
      v_result:=public.record_payment_outcome(v_attempt.id,'review_hold',v_attempt.payment_id,
        'STAFF_QUERY_REQUIRES_REVIEW',coalesce(nullif(v_code,''),'MISMATCH'),'Completed query requires review');
    ELSIF v_match AND v_code='0000' AND v_status IN ('Failed','Cancelled') AND v_trx IS NULL THEN
      v_result:=public.record_payment_outcome(v_attempt.id,'failed',v_attempt.payment_id,
        'GATEWAY_DECLINED_RECONCILED',v_code,'Terminal decline confirmed by query');
    ELSE v_result:=jsonb_build_object('status','pending'); END IF;
  ELSE v_result:=jsonb_build_object('status',v_attempt.status); END IF;
  PERFORM public.record_staff_audit_event(p_actor_id,ARRAY['admin','super_admin'],
    'staff_rechecked_payment','payment_attempts',v_attempt.id::text,'batch',v_enrollment.batch_id,NULL,NULL,
    NULL,jsonb_build_object('query_status',v_status,'identity_matches',v_match,'outcome',v_result->>'status'));
  UPDATE public.payment_attempts SET reconcile_owner=NULL,reconcile_until=NULL WHERE id=v_attempt.id AND reconcile_owner=p_owner;
  RETURN v_result;
END; $$;
REVOKE ALL ON FUNCTION public.list_staff_payment_attention(uuid,boolean,integer),public.mark_staff_payment_reviewed(uuid,uuid,text,text),public.claim_staff_payment_recheck(uuid,uuid,uuid),public.finish_staff_payment_recheck(uuid,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_staff_payment_attention(uuid,boolean,integer),public.mark_staff_payment_reviewed(uuid,uuid,text,text),public.claim_staff_payment_recheck(uuid,uuid,uuid),public.finish_staff_payment_recheck(uuid,uuid,uuid,jsonb) TO service_role;
COMMIT;
