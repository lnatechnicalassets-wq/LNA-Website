-- =============================================================================
-- Migration: 20261110235500_enrollment_bkash_outbox_and_staff_profiles
-- Authority: docs/architecture.md, ADR 0009, .agents/rules/10-security-payments.md,
--            .agents/rules/50-database.md, Rule R8, Rule R9, Rule R10
-- Scope:
--   1. Staff profiles (super_admin / admin MFA-gated operational identity table)
--   2. bKash payment ledger tables: payment_attempts, payment_events (append-only)
--   3. Decoupled confirmation outbox: email_outbox
--   4. Immutable security/operational audit trail: audit_events (append-only)
--   5. Atomic server-only PostgreSQL RPCs:
--      - count_batch_active_seats(uuid)
--      - start_enrollment(...)
--      - retry_enrollment_payment(text)
--      - confirm_payment(...)
--      - record_payment_outcome(...)
-- Forward-only migration: never modify 20261110161500_initial_catalog_and_enrollments.sql.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Core Operational & Security Tables
-- -----------------------------------------------------------------------------

-- 1.1 Staff Profiles (mapped strictly to pre-provisioned Supabase Auth users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  email extensions.citext NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL,
  account_state text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT profiles_email_format CHECK (
    char_length(trim(email::text)) >= 5
    AND email::text ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  CONSTRAINT profiles_full_name_len CHECK (char_length(trim(full_name)) >= 2),
  CONSTRAINT profiles_role_valid CHECK (role IN ('admin', 'super_admin')),
  CONSTRAINT profiles_account_state_valid CHECK (account_state IN ('active', 'disabled', 'archived'))
);

CREATE INDEX idx_profiles_role_state ON public.profiles (role, account_state);

CREATE TRIGGER trg_profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 1.2 Payment Attempts (Direct bKash Tokenized Checkout attempt state & idempotency lock target)
CREATE TABLE public.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE RESTRICT,
  gateway text NOT NULL DEFAULT 'bkash',
  tran_id text NOT NULL UNIQUE,
  payment_id text UNIQUE,
  trx_id text UNIQUE,
  amount_poisha bigint NOT NULL,
  currency text NOT NULL DEFAULT 'BDT',
  status text NOT NULL DEFAULT 'initiated',
  gateway_status_code text,
  gateway_status_message text,
  failure_reason text,
  validated_amount_poisha bigint,
  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT payment_attempts_gateway_valid CHECK (gateway IN ('bkash')),
  CONSTRAINT payment_attempts_tran_id_len CHECK (char_length(trim(tran_id)) BETWEEN 8 AND 64),
  CONSTRAINT payment_attempts_payment_id_len CHECK (
    payment_id IS NULL OR char_length(trim(payment_id)) BETWEEN 4 AND 128
  ),
  CONSTRAINT payment_attempts_trx_id_len CHECK (
    trx_id IS NULL OR char_length(trim(trx_id)) BETWEEN 4 AND 128
  ),
  CONSTRAINT payment_attempts_amount_positive CHECK (amount_poisha > 0),
  CONSTRAINT payment_attempts_currency_bdt CHECK (currency = 'BDT'),
  CONSTRAINT payment_attempts_status_valid CHECK (
    status IN ('initiated', 'pending', 'validated', 'failed', 'cancelled', 'review_hold')
  ),
  CONSTRAINT payment_attempts_validated_amount_nonnegative CHECK (
    validated_amount_poisha IS NULL OR validated_amount_poisha >= 0
  )
);

CREATE INDEX idx_payment_attempts_enrollment_created
  ON public.payment_attempts (enrollment_id, created_at DESC);
CREATE INDEX idx_payment_attempts_status_created
  ON public.payment_attempts (status, created_at DESC);

CREATE TRIGGER trg_payment_attempts_set_updated_at
  BEFORE UPDATE ON public.payment_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 1.3 Payment Events (Strictly append-only redacted bKash callback and verification log)
CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_attempt_id uuid REFERENCES public.payment_attempts(id) ON DELETE RESTRICT,
  tran_id text,
  payment_id text,
  source text NOT NULL,
  event_status text,
  redacted_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT payment_events_source_valid CHECK (
    source IN ('callback', 'execute', 'query_status', 'search_trx', 'mock_callback')
  ),
  CONSTRAINT payment_events_payload_object CHECK (jsonb_typeof(redacted_payload) = 'object')
);

CREATE INDEX idx_payment_events_attempt_received
  ON public.payment_events (payment_attempt_id, received_at DESC);
CREATE INDEX idx_payment_events_payment_id_received
  ON public.payment_events (payment_id, received_at DESC);

-- 1.4 Confirmation Email Outbox (Decoupled single-send outbox via Resend)
CREATE TABLE public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE RESTRICT,
  template text NOT NULL,
  recipient_email extensions.citext NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  provider_message_id text,
  retry_count integer NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT email_outbox_template_valid CHECK (
    template IN ('enrollment_confirmed_paid', 'enrollment_confirmed_free', 'enrollment_review_hold')
  ),
  CONSTRAINT email_outbox_email_format CHECK (
    char_length(trim(recipient_email::text)) >= 5
    AND recipient_email::text ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  CONSTRAINT email_outbox_idempotency_len CHECK (char_length(trim(idempotency_key)) >= 8),
  CONSTRAINT email_outbox_payload_object CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT email_outbox_status_valid CHECK (status IN ('pending', 'sent', 'failed')),
  CONSTRAINT email_outbox_retry_nonnegative CHECK (retry_count >= 0)
);

CREATE INDEX idx_email_outbox_enrollment_created
  ON public.email_outbox (enrollment_id, created_at DESC);
CREATE INDEX idx_email_outbox_status_created
  ON public.email_outbox (status, created_at DESC);

CREATE TRIGGER trg_email_outbox_set_updated_at
  BEFORE UPDATE ON public.email_outbox
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 1.5 Audit Events (Strictly append-only operational and security event ledger)
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_role text NOT NULL,
  action text NOT NULL,
  target_entity text NOT NULL,
  target_id text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT audit_events_actor_role_valid CHECK (actor_role IN ('system', 'admin', 'super_admin')),
  CONSTRAINT audit_events_action_len CHECK (char_length(trim(action)) >= 3),
  CONSTRAINT audit_events_target_entity_len CHECK (char_length(trim(target_entity)) >= 2)
);

CREATE INDEX idx_audit_events_created ON public.audit_events (created_at DESC);
CREATE INDEX idx_audit_events_target ON public.audit_events (target_entity, target_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 2. Explicit Grants & Row Level Security (Rule R8, Rule R9, Rule R10)
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.payment_attempts FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.payment_events FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.email_outbox FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.audit_events FROM PUBLIC, anon, authenticated, service_role;

-- Service role least-privilege grants (Rule R10: zero DELETE or TRUNCATE anywhere)
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.payment_attempts TO service_role;
GRANT SELECT, INSERT ON TABLE public.payment_events TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.email_outbox TO service_role;
GRANT SELECT, INSERT ON TABLE public.audit_events TO service_role;

-- Authenticated staff can inspect only their own active profile row; zero writes
GRANT SELECT ON TABLE public.profiles TO authenticated;

CREATE POLICY "Staff read own active profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id AND account_state = 'active');

CREATE POLICY "Deny anon access to profiles"
  ON public.profiles
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny direct browser access to payment_attempts"
  ON public.payment_attempts
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny direct browser access to payment_events"
  ON public.payment_events
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny direct browser access to email_outbox"
  ON public.email_outbox
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny direct browser access to audit_events"
  ON public.audit_events
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- -----------------------------------------------------------------------------
-- 3. Server-Only PostgreSQL RPC Functions (SECURITY DEFINER; locked concurrency)
-- -----------------------------------------------------------------------------

-- 3.1 Count currently occupied live seats for a batch (excludes expired holds)
CREATE OR REPLACE FUNCTION public.count_batch_active_seats(p_batch_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(*)::integer
  FROM public.enrollments e
  WHERE e.batch_id = p_batch_id
    AND (
      e.status IN ('application_in_process', 'confirmed', 'review_hold')
      OR (
        e.status = 'pending'
        AND (e.hold_expires_at IS NULL OR e.hold_expires_at > now())
      )
    );
$$;

REVOKE ALL ON FUNCTION public.count_batch_active_seats(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_batch_active_seats(uuid) TO service_role;

-- 3.2 Atomic Start Enrollment (persists application + computes DB fees BEFORE hosted checkout)
CREATE OR REPLACE FUNCTION public.start_enrollment(
  p_course_slug text,
  p_batch_slug text,
  p_public_ref text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_answers jsonb DEFAULT '{}'::jsonb,
  p_program_questions_snapshot jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_course public.courses%ROWTYPE;
  v_batch public.batches%ROWTYPE;
  v_existing public.enrollments%ROWTYPE;
  v_enrollment public.enrollments%ROWTYPE;
  v_attempt public.payment_attempts%ROWTYPE;
  v_outbox_id uuid;
  v_clean_email extensions.citext;
  v_clean_phone text;
  v_clean_name text;
  v_clean_ref text;
  v_active_seats integer;
  v_remaining_seats integer;
  v_base_fee bigint;
  v_payable bigint;
  v_discount bigint;
  v_hold_expires_at timestamptz;
  v_tran_id text;
  v_attempt_seq integer;
BEGIN
  IF p_course_slug IS NULL OR p_batch_slug IS NULL OR p_public_ref IS NULL
     OR p_full_name IS NULL OR p_email IS NULL OR p_phone IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENTS';
  END IF;

  v_clean_name := trim(p_full_name);
  v_clean_email := lower(trim(p_email))::extensions.citext;
  v_clean_phone := trim(p_phone);
  v_clean_ref := upper(trim(p_public_ref));

  IF char_length(v_clean_name) < 2 OR v_clean_phone !~ '^01[3-9][0-9]{8}$'
     OR v_clean_ref !~ '^LNA-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$' THEN
    RAISE EXCEPTION 'INVALID_ARGUMENTS';
  END IF;

  -- Lock the batch row exclusively for atomic capacity and window enforcement
  SELECT b.* INTO v_batch
  FROM public.batches b
  JOIN public.courses c ON c.id = b.course_id
  WHERE c.slug = trim(p_course_slug)
    AND b.slug = trim(p_batch_slug)
    AND c.status = 'published'
    AND c.archived_at IS NULL
    AND b.archived_at IS NULL
  FOR UPDATE OF b;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'BATCH_NOT_FOUND');
  END IF;

  SELECT * INTO v_course FROM public.courses WHERE id = v_batch.course_id;

  IF v_batch.status <> 'open_for_enrollment'
     OR (v_batch.enrollment_opens_at IS NOT NULL AND v_batch.enrollment_opens_at > now())
     OR (v_batch.enrollment_closes_at IS NOT NULL AND v_batch.enrollment_closes_at < now()) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'BATCH_CLOSED');
  END IF;

  -- Clean up expired pending holds on this batch before evaluating duplicates or capacity
  UPDATE public.enrollments
  SET status = 'expired'
  WHERE batch_id = v_batch.id
    AND status = 'pending'
    AND hold_expires_at IS NOT NULL
    AND hold_expires_at <= now();

  -- Duplicate check for active enrollment/application with same normalized email
  SELECT * INTO v_existing
  FROM public.enrollments
  WHERE batch_id = v_batch.id
    AND email = v_clean_email
    AND status IN ('application_in_process', 'pending', 'confirmed', 'review_hold')
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.status IN ('confirmed', 'application_in_process', 'review_hold') THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'DUPLICATE_ENROLLMENT',
        'existing_status', v_existing.status
      );
    END IF;

    -- Active unexpired hold for same email & batch: reuse reservation cleanly and issue fresh attempt
    UPDATE public.enrollments
    SET full_name = v_clean_name,
        phone = v_clean_phone,
        answers = coalesce(p_answers, '{}'::jsonb),
        program_questions_snapshot = coalesce(p_program_questions_snapshot, '[]'::jsonb)
    WHERE id = v_existing.id
    RETURNING * INTO v_enrollment;

    SELECT COUNT(*)::integer + 1 INTO v_attempt_seq
    FROM public.payment_attempts
    WHERE enrollment_id = v_enrollment.id;

    v_tran_id := v_enrollment.public_ref || '-' || lpad(v_attempt_seq::text, 2, '0') || '-' ||
                 substr(encode(extensions.gen_random_bytes(3), 'hex'), 1, 6);

    INSERT INTO public.payment_attempts (
      enrollment_id,
      gateway,
      tran_id,
      amount_poisha,
      currency,
      status
    )
    VALUES (
      v_enrollment.id,
      'bkash',
      v_tran_id,
      v_enrollment.payable_poisha,
      'BDT',
      'initiated'
    )
    RETURNING * INTO v_attempt;

    RETURN jsonb_build_object(
      'ok', true,
      'reused_hold', true,
      'is_free', false,
      'enrollment_id', v_enrollment.id,
      'public_ref', v_enrollment.public_ref,
      'attempt_id', v_attempt.id,
      'tran_id', v_attempt.tran_id,
      'amount_poisha', v_attempt.amount_poisha,
      'currency', 'BDT',
      'hold_expires_at', v_enrollment.hold_expires_at,
      'status', v_enrollment.status,
      'course_title', v_course.title,
      'batch_name', v_batch.name
    );
  END IF;

  -- Check live capacity including confirmed enrollments, manual verification holds, and valid holds
  v_active_seats := public.count_batch_active_seats(v_batch.id);
  v_remaining_seats := v_batch.capacity - v_batch.historical_enrolled_count - v_active_seats;

  IF v_remaining_seats <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'BATCH_FULL');
  END IF;

  -- Compute authoritative integer poisha pricing on DB server (Rule R5)
  v_base_fee := v_batch.fee_poisha;
  v_payable := coalesce(v_batch.discount_fee_poisha, v_batch.fee_poisha);
  v_discount := v_base_fee - v_payable;

  -- Path A: Free course batch (immediate confirmed registration + queued email)
  IF v_payable = 0 THEN
    INSERT INTO public.enrollments (
      public_ref,
      course_id,
      batch_id,
      full_name,
      email,
      phone,
      answers,
      program_questions_snapshot,
      payment_method,
      payment_status,
      submitted_payment_ref,
      base_fee_poisha,
      discount_amount_poisha,
      payable_poisha,
      currency,
      status,
      verified_at,
      confirmed_at
    )
    VALUES (
      v_clean_ref,
      v_course.id,
      v_batch.id,
      v_clean_name,
      v_clean_email,
      v_clean_phone,
      coalesce(p_answers, '{}'::jsonb),
      coalesce(p_program_questions_snapshot, '[]'::jsonb),
      'free',
      'not_required',
      NULL,
      v_base_fee,
      v_discount,
      0,
      'BDT',
      'confirmed',
      now(),
      now()
    )
    RETURNING * INTO v_enrollment;

    INSERT INTO public.email_outbox (
      enrollment_id,
      template,
      recipient_email,
      idempotency_key,
      payload,
      status
    )
    VALUES (
      v_enrollment.id,
      'enrollment_confirmed_free',
      v_enrollment.email,
      'confirm:' || v_enrollment.id::text,
      jsonb_build_object(
        'public_ref', v_enrollment.public_ref,
        'full_name', v_enrollment.full_name,
        'course_title', v_course.title,
        'batch_name', v_batch.name,
        'venue', v_batch.venue,
        'start_date', v_batch.start_date::text,
        'payable_poisha', 0,
        'payment_method', 'free'
      ),
      'pending'
    )
    ON CONFLICT (idempotency_key) DO NOTHING;

    SELECT id INTO v_outbox_id
    FROM public.email_outbox
    WHERE idempotency_key = 'confirm:' || v_enrollment.id::text;

    INSERT INTO public.audit_events (
      actor_role,
      action,
      target_entity,
      target_id,
      after_state
    )
    VALUES (
      'system',
      'enrollment_confirmed_free',
      'enrollments',
      v_enrollment.id::text,
      jsonb_build_object('public_ref', v_enrollment.public_ref, 'batch_slug', v_batch.slug)
    );

    RETURN jsonb_build_object(
      'ok', true,
      'reused_hold', false,
      'is_free', true,
      'enrollment_id', v_enrollment.id,
      'public_ref', v_enrollment.public_ref,
      'attempt_id', NULL,
      'outbox_id', v_outbox_id,
      'amount_poisha', 0,
      'currency', 'BDT',
      'hold_expires_at', NULL,
      'status', 'confirmed',
      'course_title', v_course.title,
      'batch_name', v_batch.name
    );
  END IF;

  -- Path B: Paid bKash Hosted Checkout (reserve seat for batch hold duration + create payment_attempt)
  v_hold_expires_at := now() + make_interval(mins => v_batch.seat_hold_duration_minutes);

  INSERT INTO public.enrollments (
    public_ref,
    course_id,
    batch_id,
    full_name,
    email,
    phone,
    answers,
    program_questions_snapshot,
    payment_method,
    payment_status,
    submitted_payment_ref,
    base_fee_poisha,
    discount_amount_poisha,
    payable_poisha,
    currency,
    status,
    hold_expires_at
  )
  VALUES (
    v_clean_ref,
    v_course.id,
    v_batch.id,
    v_clean_name,
    v_clean_email,
    v_clean_phone,
    coalesce(p_answers, '{}'::jsonb),
    coalesce(p_program_questions_snapshot, '[]'::jsonb),
    'bkash',
    'pending_verification',
    NULL,
    v_base_fee,
    v_discount,
    v_payable,
    'BDT',
    'pending',
    v_hold_expires_at
  )
  RETURNING * INTO v_enrollment;

  v_tran_id := v_enrollment.public_ref || '-01-' ||
               substr(encode(extensions.gen_random_bytes(3), 'hex'), 1, 6);

  INSERT INTO public.payment_attempts (
    enrollment_id,
    gateway,
    tran_id,
    amount_poisha,
    currency,
    status
  )
  VALUES (
    v_enrollment.id,
    'bkash',
    v_tran_id,
    v_payable,
    'BDT',
    'initiated'
  )
  RETURNING * INTO v_attempt;

  RETURN jsonb_build_object(
    'ok', true,
    'reused_hold', false,
    'is_free', false,
    'enrollment_id', v_enrollment.id,
    'public_ref', v_enrollment.public_ref,
    'attempt_id', v_attempt.id,
    'tran_id', v_attempt.tran_id,
    'amount_poisha', v_attempt.amount_poisha,
    'currency', 'BDT',
    'hold_expires_at', v_enrollment.hold_expires_at,
    'status', 'pending',
    'course_title', v_course.title,
    'batch_name', v_batch.name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.start_enrollment(text, text, text, text, text, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_enrollment(text, text, text, text, text, text, jsonb, jsonb) TO service_role;

-- 3.3 Retry Checkout for an Existing Active Seat Hold (AT-02)
CREATE OR REPLACE FUNCTION public.retry_enrollment_payment(p_public_ref text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_enrollment public.enrollments%ROWTYPE;
  v_batch public.batches%ROWTYPE;
  v_course public.courses%ROWTYPE;
  v_attempt public.payment_attempts%ROWTYPE;
  v_clean_ref text;
  v_attempt_seq integer;
  v_tran_id text;
BEGIN
  IF p_public_ref IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENTS';
  END IF;

  v_clean_ref := upper(trim(p_public_ref));

  SELECT * INTO v_enrollment
  FROM public.enrollments
  WHERE public_ref = v_clean_ref
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ENROLLMENT_NOT_FOUND');
  END IF;

  IF v_enrollment.status = 'confirmed' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_CONFIRMED');
  END IF;

  IF v_enrollment.status <> 'pending' OR v_enrollment.payment_method <> 'bkash' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_RETRYABLE');
  END IF;

  IF v_enrollment.hold_expires_at IS NOT NULL AND v_enrollment.hold_expires_at <= now() THEN
    UPDATE public.enrollments SET status = 'expired' WHERE id = v_enrollment.id;
    RETURN jsonb_build_object('ok', false, 'code', 'HOLD_EXPIRED');
  END IF;

  SELECT * INTO v_batch FROM public.batches WHERE id = v_enrollment.batch_id FOR UPDATE;
  SELECT * INTO v_course FROM public.courses WHERE id = v_enrollment.course_id;

  IF v_batch.status <> 'open_for_enrollment' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'BATCH_CLOSED');
  END IF;

  SELECT COUNT(*)::integer + 1 INTO v_attempt_seq
  FROM public.payment_attempts
  WHERE enrollment_id = v_enrollment.id;

  v_tran_id := v_enrollment.public_ref || '-' || lpad(v_attempt_seq::text, 2, '0') || '-' ||
               substr(encode(extensions.gen_random_bytes(3), 'hex'), 1, 6);

  INSERT INTO public.payment_attempts (
    enrollment_id,
    gateway,
    tran_id,
    amount_poisha,
    currency,
    status
  )
  VALUES (
    v_enrollment.id,
    'bkash',
    v_tran_id,
    v_enrollment.payable_poisha,
    'BDT',
    'initiated'
  )
  RETURNING * INTO v_attempt;

  RETURN jsonb_build_object(
    'ok', true,
    'enrollment_id', v_enrollment.id,
    'public_ref', v_enrollment.public_ref,
    'attempt_id', v_attempt.id,
    'tran_id', v_attempt.tran_id,
    'amount_poisha', v_attempt.amount_poisha,
    'currency', 'BDT',
    'hold_expires_at', v_enrollment.hold_expires_at,
    'course_title', v_course.title,
    'batch_name', v_batch.name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.retry_enrollment_payment(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retry_enrollment_payment(text) TO service_role;

-- 3.4 Atomic Confirm Payment (called ONLY after bKash server-to-server execute + query)
CREATE OR REPLACE FUNCTION public.confirm_payment(
  p_attempt_id uuid,
  p_payment_id text,
  p_trx_id text,
  p_verified_poisha bigint,
  p_currency text,
  p_gateway_status_code text,
  p_gateway_status_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attempt public.payment_attempts%ROWTYPE;
  v_enrollment public.enrollments%ROWTYPE;
  v_batch public.batches%ROWTYPE;
  v_course public.courses%ROWTYPE;
  v_outbox_id uuid;
  v_trx text;
  v_pay_id text;
  v_currency text;
  v_code text;
  v_other_active_seats integer;
  v_remaining_for_this integer;
BEGIN
  IF p_attempt_id IS NULL OR p_payment_id IS NULL OR p_trx_id IS NULL
     OR p_verified_poisha IS NULL OR p_currency IS NULL OR p_gateway_status_code IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENTS';
  END IF;

  v_trx := trim(p_trx_id);
  v_pay_id := trim(p_payment_id);
  v_currency := upper(trim(p_currency));
  v_code := trim(p_gateway_status_code);

  IF v_trx = '' OR v_pay_id = '' THEN
    RAISE EXCEPTION 'INVALID_ARGUMENTS';
  END IF;

  -- Lock attempt -> enrollment -> batch in strict hierarchy order
  SELECT * INTO v_attempt
  FROM public.payment_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_ATTEMPT_NOT_FOUND';
  END IF;

  SELECT * INTO v_enrollment
  FROM public.enrollments
  WHERE id = v_attempt.enrollment_id
  FOR UPDATE;

  SELECT * INTO v_batch
  FROM public.batches
  WHERE id = v_enrollment.batch_id
  FOR UPDATE;

  SELECT * INTO v_course
  FROM public.courses
  WHERE id = v_enrollment.course_id;

  -- Idempotency guard: repeated validated callback must NOT reconfirm or send another email
  IF v_attempt.status = 'validated' THEN
    SELECT id INTO v_outbox_id
    FROM public.email_outbox
    WHERE idempotency_key = 'confirm:' || v_enrollment.id::text;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'already_validated',
      'already_validated', true,
      'enrollment_id', v_enrollment.id,
      'public_ref', v_enrollment.public_ref,
      'outbox_id', v_outbox_id
    );
  END IF;

  -- Duplicate transaction ID replay guard across other attempts
  IF EXISTS (
    SELECT 1 FROM public.payment_attempts pa
    WHERE pa.trx_id = v_trx AND pa.id <> v_attempt.id
  ) THEN
    UPDATE public.payment_attempts
    SET status = 'review_hold',
        gateway_status_code = v_code,
        gateway_status_message = p_gateway_status_message,
        failure_reason = 'DUPLICATE_TRX_ID',
        validated_amount_poisha = p_verified_poisha
    WHERE id = v_attempt.id;

    INSERT INTO public.audit_events (actor_role, action, target_entity, target_id, after_state)
    VALUES (
      'system',
      'payment_duplicate_trx_hold',
      'payment_attempts',
      v_attempt.id::text,
      jsonb_build_object('enrollment_id', v_enrollment.id, 'trx_id', v_trx)
    );

    RETURN jsonb_build_object(
      'success', false,
      'status', 'review_hold',
      'reason', 'DUPLICATE_TRX_ID',
      'enrollment_id', v_enrollment.id,
      'public_ref', v_enrollment.public_ref
    );
  END IF;

  -- Guard against two simultaneous attempts both trying to confirm one enrollment
  IF v_enrollment.status = 'confirmed' THEN
    UPDATE public.payment_attempts
    SET status = 'review_hold',
        trx_id = v_trx,
        gateway_status_code = v_code,
        gateway_status_message = p_gateway_status_message,
        failure_reason = 'ENROLLMENT_ALREADY_CONFIRMED',
        validated_amount_poisha = p_verified_poisha
    WHERE id = v_attempt.id;

    INSERT INTO public.audit_events (actor_role, action, target_entity, target_id, after_state)
    VALUES (
      'system',
      'payment_second_attempt_on_confirmed_enrollment',
      'payment_attempts',
      v_attempt.id::text,
      jsonb_build_object('enrollment_id', v_enrollment.id, 'trx_id', v_trx)
    );

    RETURN jsonb_build_object(
      'success', false,
      'status', 'review_hold',
      'reason', 'ENROLLMENT_ALREADY_CONFIRMED',
      'enrollment_id', v_enrollment.id,
      'public_ref', v_enrollment.public_ref
    );
  END IF;

  -- Strict gateway value comparison (BR-02 / Rule 10)
  IF v_currency <> 'BDT' OR p_verified_poisha <> v_attempt.amount_poisha OR v_code <> '0000' THEN
    UPDATE public.payment_attempts
    SET status = 'review_hold',
        payment_id = coalesce(payment_id, v_pay_id),
        trx_id = v_trx,
        validated_amount_poisha = p_verified_poisha,
        gateway_status_code = v_code,
        gateway_status_message = p_gateway_status_message,
        failure_reason = 'GATEWAY_VALUE_MISMATCH'
    WHERE id = v_attempt.id;

    UPDATE public.enrollments
    SET status = 'review_hold',
        payment_status = 'review_hold',
        submitted_payment_ref = coalesce(submitted_payment_ref, v_trx),
        verification_notes = 'Flagged for manual review due to gateway currency, amount, or status mismatch.'
    WHERE id = v_enrollment.id;

    INSERT INTO public.audit_events (actor_role, action, target_entity, target_id, after_state)
    VALUES (
      'system',
      'payment_flagged_review_hold',
      'enrollments',
      v_enrollment.id::text,
      jsonb_build_object(
        'expected_poisha', v_attempt.amount_poisha,
        'verified_poisha', p_verified_poisha,
        'currency', v_currency,
        'gateway_status_code', v_code
      )
    );

    RETURN jsonb_build_object(
      'success', false,
      'status', 'review_hold',
      'reason', 'GATEWAY_VALUE_MISMATCH',
      'enrollment_id', v_enrollment.id,
      'public_ref', v_enrollment.public_ref
    );
  END IF;

  -- Capacity guard when hold already expired before completion arrived
  IF v_enrollment.status = 'expired'
     OR (v_enrollment.hold_expires_at IS NOT NULL AND v_enrollment.hold_expires_at <= now()) THEN
    SELECT COUNT(*)::integer INTO v_other_active_seats
    FROM public.enrollments e
    WHERE e.batch_id = v_batch.id
      AND e.id <> v_enrollment.id
      AND (
        e.status IN ('application_in_process', 'confirmed', 'review_hold')
        OR (e.status = 'pending' AND (e.hold_expires_at IS NULL OR e.hold_expires_at > now()))
      );

    v_remaining_for_this := v_batch.capacity - v_batch.historical_enrolled_count - v_other_active_seats;

    IF v_remaining_for_this <= 0 THEN
      UPDATE public.payment_attempts
      SET status = 'review_hold',
          payment_id = coalesce(payment_id, v_pay_id),
          trx_id = v_trx,
          validated_amount_poisha = p_verified_poisha,
          gateway_status_code = v_code,
          gateway_status_message = p_gateway_status_message,
          failure_reason = 'HOLD_EXPIRED_BATCH_FULL'
      WHERE id = v_attempt.id;

      UPDATE public.enrollments
      SET status = 'review_hold',
          payment_status = 'review_hold',
          submitted_payment_ref = v_trx,
          verification_notes = 'Payment completed after seat hold expired and batch reached capacity.'
      WHERE id = v_enrollment.id;

      INSERT INTO public.audit_events (actor_role, action, target_entity, target_id, after_state)
      VALUES (
        'system',
        'payment_expired_hold_batch_full',
        'enrollments',
        v_enrollment.id::text,
        jsonb_build_object('trx_id', v_trx, 'verified_poisha', p_verified_poisha)
      );

      RETURN jsonb_build_object(
        'success', false,
        'status', 'review_hold',
        'reason', 'HOLD_EXPIRED_BATCH_FULL',
        'enrollment_id', v_enrollment.id,
        'public_ref', v_enrollment.public_ref
      );
    END IF;
  END IF;

  -- Atomic Paid Confirmation & Decoupled Outbox Insert
  UPDATE public.payment_attempts
  SET status = 'validated',
      payment_id = coalesce(payment_id, v_pay_id),
      trx_id = v_trx,
      validated_amount_poisha = p_verified_poisha,
      gateway_status_code = v_code,
      gateway_status_message = p_gateway_status_message,
      executed_at = now()
  WHERE id = v_attempt.id;

  UPDATE public.enrollments
  SET status = 'confirmed',
      payment_status = 'verified',
      submitted_payment_ref = v_trx,
      verified_at = now(),
      confirmed_at = now()
  WHERE id = v_enrollment.id;

  INSERT INTO public.email_outbox (
    enrollment_id,
    template,
    recipient_email,
    idempotency_key,
    payload,
    status
  )
  VALUES (
    v_enrollment.id,
    'enrollment_confirmed_paid',
    v_enrollment.email,
    'confirm:' || v_enrollment.id::text,
    jsonb_build_object(
      'public_ref', v_enrollment.public_ref,
      'full_name', v_enrollment.full_name,
      'course_title', v_course.title,
      'batch_name', v_batch.name,
      'venue', v_batch.venue,
      'start_date', v_batch.start_date::text,
      'payable_poisha', v_enrollment.payable_poisha,
      'payment_method', 'bkash'
    ),
    'pending'
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  SELECT id INTO v_outbox_id
  FROM public.email_outbox
  WHERE idempotency_key = 'confirm:' || v_enrollment.id::text;

  INSERT INTO public.audit_events (actor_role, action, target_entity, target_id, after_state)
  VALUES (
    'system',
    'payment_confirmed',
    'enrollments',
    v_enrollment.id::text,
    jsonb_build_object(
      'public_ref', v_enrollment.public_ref,
      'attempt_id', v_attempt.id,
      'verified_poisha', p_verified_poisha
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'validated',
    'already_validated', false,
    'enrollment_id', v_enrollment.id,
    'public_ref', v_enrollment.public_ref,
    'outbox_id', v_outbox_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_payment(uuid, text, text, bigint, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment(uuid, text, text, bigint, text, text, text) TO service_role;

-- 3.5 Record Non-Confirmed Gateway Outcome (NEVER releases enrollment hold on cancel/failure)
CREATE OR REPLACE FUNCTION public.record_payment_outcome(
  p_attempt_id uuid,
  p_next_status text,
  p_payment_id text DEFAULT NULL,
  p_failure_reason text DEFAULT NULL,
  p_gateway_status_code text DEFAULT NULL,
  p_gateway_status_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attempt public.payment_attempts%ROWTYPE;
  v_enrollment public.enrollments%ROWTYPE;
BEGIN
  IF p_attempt_id IS NULL OR p_next_status IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENTS';
  END IF;

  IF p_next_status NOT IN ('pending', 'failed', 'cancelled', 'review_hold') THEN
    RAISE EXCEPTION 'INVALID_NEXT_STATUS';
  END IF;

  SELECT * INTO v_attempt
  FROM public.payment_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_ATTEMPT_NOT_FOUND';
  END IF;

  SELECT * INTO v_enrollment
  FROM public.enrollments
  WHERE id = v_attempt.enrollment_id
  FOR UPDATE;

  IF v_attempt.status IN ('validated', 'failed', 'cancelled') THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', v_attempt.status,
      'already_terminal', true,
      'enrollment_id', v_enrollment.id,
      'public_ref', v_enrollment.public_ref,
      'hold_expires_at', v_enrollment.hold_expires_at
    );
  END IF;

  UPDATE public.payment_attempts
  SET status = p_next_status,
      payment_id = coalesce(payment_id, nullif(trim(coalesce(p_payment_id, '')), '')),
      failure_reason = coalesce(p_failure_reason, failure_reason),
      gateway_status_code = coalesce(p_gateway_status_code, gateway_status_code),
      gateway_status_message = coalesce(p_gateway_status_message, gateway_status_message)
  WHERE id = v_attempt.id;

  IF p_next_status = 'review_hold' AND v_enrollment.status <> 'confirmed' THEN
    UPDATE public.enrollments
    SET status = 'review_hold',
        payment_status = 'review_hold',
        verification_notes = coalesce(p_failure_reason, 'Flagged for manual payment review.')
    WHERE id = v_enrollment.id;
  END IF;

  -- Strictly preserve enrollments.status = 'pending' and enrollments.hold_expires_at for 'failed'/'cancelled'/'pending'
  RETURN jsonb_build_object(
    'success', true,
    'status', p_next_status,
    'already_terminal', false,
    'enrollment_id', v_enrollment.id,
    'public_ref', v_enrollment.public_ref,
    'hold_expires_at', v_enrollment.hold_expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_payment_outcome(uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment_outcome(uuid, text, text, text, text, text) TO service_role;

COMMIT;

