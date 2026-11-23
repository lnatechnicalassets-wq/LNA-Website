-- bKash v2 callback binding and one sandbox UAT refund per verified payment.
ALTER TABLE public.payment_attempts
  ADD COLUMN bkash_callback_signature_hash text,
  ADD COLUMN bkash_sandbox_v2 boolean NOT NULL DEFAULT false,
  ADD COLUMN bkash_execute_claimed boolean NOT NULL DEFAULT false,
  ADD COLUMN sandbox_refund_state text
    CHECK (sandbox_refund_state IN ('started', 'completed', 'unconfirmed')),
  ADD COLUMN sandbox_refund_trx_id text;

CREATE INDEX idx_payment_attempts_bkash_no_execute_response
  ON public.payment_attempts (updated_at)
  WHERE gateway = 'bkash'
    AND failure_reason = 'EXECUTE_NO_RESPONSE'
    AND status IN ('initiated', 'pending');

-- A second hosted session must not charge the same enrollment while the
-- first Execute is unresolved, under review, or already confirmed.
CREATE UNIQUE INDEX idx_payment_attempts_one_active_execute
  ON public.payment_attempts (enrollment_id)
  WHERE bkash_execute_claimed
    AND status IN ('initiated', 'pending', 'validated', 'review_hold');
