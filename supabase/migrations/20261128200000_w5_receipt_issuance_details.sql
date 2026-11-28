BEGIN;

CREATE OR REPLACE FUNCTION public.capture_payment_receipt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_course text;
  v_batch text;
  v_test boolean;
  v_trx_id text;
  v_manual_reference text;
  v_issued_at timestamptz;
BEGIN
  IF NEW.status <> 'confirmed' OR NEW.payment_status <> 'verified'
     OR NEW.payable_poisha <= 0 OR NEW.confirmed_at IS NULL OR NEW.verified_at IS NULL
     OR NEW.payment_method NOT IN ('bkash','bank_transfer','cash') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'confirmed' AND OLD.payment_status = 'verified' THEN RETURN NEW; END IF;
  END IF;

  IF NEW.payment_method = 'bkash' AND NEW.staff_payment_details IS NULL
     AND NEW.staff_payment_recorded_by IS NULL AND NOT NEW.applicant_payment_submitted THEN
    SELECT pa.trx_id INTO v_trx_id
    FROM public.payment_attempts pa
    WHERE pa.enrollment_id = NEW.id AND pa.status = 'validated'
      AND pa.trx_id = NEW.submitted_payment_ref
      AND pa.validated_amount_poisha = NEW.payable_poisha AND pa.currency = 'BDT';
    IF v_trx_id IS NULL THEN RETURN NEW; END IF;
  ELSE
    v_manual_reference := NULLIF(btrim(NEW.submitted_payment_ref), '');
  END IF;

  SELECT title INTO STRICT v_course FROM public.courses WHERE id=NEW.course_id;
  SELECT name INTO STRICT v_batch FROM public.batches WHERE id=NEW.batch_id;
  v_test := NEW.is_dev_fixture OR EXISTS (
    SELECT 1 FROM public.payment_attempts pa WHERE pa.enrollment_id=NEW.id
      AND (pa.bkash_sandbox_v2 OR pa.payment_id LIKE 'MOCKPAY-%')
  );
  v_issued_at := clock_timestamp();
  INSERT INTO public.payment_receipts(enrollment_id, snapshot, created_at)
  VALUES (NEW.id, jsonb_strip_nulls(jsonb_build_object(
    'receipt_number', 'LNA-R-' || regexp_replace(NEW.public_ref, '^LNA-', ''),
    'public_ref', NEW.public_ref,
    'full_name', NEW.full_name,
    'course_title', v_course,
    'batch_name', v_batch,
    'confirmed_at', NEW.confirmed_at,
    'issued_at', v_issued_at,
    'collected_poisha', NEW.payable_poisha::text,
    'base_fee_poisha', NEW.base_fee_poisha::text,
    'adjustment_poisha', NEW.discount_amount_poisha::text,
    'adjustment_kind', CASE WHEN NEW.discount_amount_poisha > 0 THEN
      CASE WHEN NEW.staff_payment_details->>'kind' = 'partial_fee_waiver' THEN 'partial_waiver'
           ELSE 'discount' END
    END,
    'payment_method', NEW.payment_method,
    'transaction_id', v_trx_id,
    'payment_reference', v_manual_reference,
    'is_test', v_test
  )), v_issued_at) ON CONFLICT(enrollment_id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.capture_payment_receipt() FROM PUBLIC, anon, authenticated, service_role;

-- Keep the original issuance timestamp and all previously recorded receipt details.
UPDATE public.payment_receipts r
SET snapshot = r.snapshot || jsonb_build_object('issued_at', r.created_at)
WHERE NOT (r.snapshot ? 'issued_at');

-- Match the exact validated collection that originally confirmed a hosted bKash admission.
UPDATE public.payment_receipts r
SET snapshot = r.snapshot || jsonb_build_object('transaction_id', pa.trx_id)
FROM public.enrollments e
JOIN public.payment_attempts pa ON pa.enrollment_id = e.id
  AND pa.trx_id = e.submitted_payment_ref
  AND pa.status = 'validated' AND pa.currency = 'BDT'
  AND NOT pa.bkash_sandbox_v2 AND pa.payment_id NOT LIKE 'MOCKPAY-%'
WHERE r.enrollment_id = e.id
  AND r.snapshot->>'payment_method' = 'bkash'
  AND NOT (r.snapshot ? 'transaction_id')
  AND r.snapshot->>'is_test' = 'false'
  AND e.staff_payment_details IS NULL AND e.staff_payment_recorded_by IS NULL
  AND NOT e.applicant_payment_submitted
  AND pa.executed_at = (r.snapshot->>'confirmed_at')::timestamptz
  AND pa.validated_amount_poisha::text = r.snapshot->>'collected_poisha';

COMMIT;
