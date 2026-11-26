BEGIN;
SELECT plan(10);

SELECT has_column(
  'public',
  'payment_attempts',
  'bkash_callback_signature_hash',
  'payment_attempts stores the bKash callback signature hash'::text
);
SELECT has_column(
  'public',
  'payment_attempts',
  'bkash_sandbox_v2',
  'payment_attempts marks v2 sandbox attempts'::text
);
SELECT has_column(
  'public',
  'payment_attempts',
  'bkash_execute_claimed',
  'payment_attempts tracks active Execute claims'::text
);
SELECT has_column(
  'public',
  'payment_attempts',
  'sandbox_refund_state',
  'payment_attempts tracks sandbox refund state'::text
);
SELECT has_index(
  'public',
  'payment_attempts',
  'idx_payment_attempts_bkash_no_execute_response',
  'payment_attempts indexes attempts without an Execute response'::text
);
SELECT has_index(
  'public',
  'payment_attempts',
  'idx_payment_attempts_one_active_execute',
  'payment_attempts indexes one active Execute claim per enrollment'::text
);
SELECT ok(
  (SELECT indisunique FROM pg_index WHERE indexrelid = 'public.idx_payment_attempts_one_active_execute'::regclass),
  'An active Execute claim is unique per enrollment'
);
SELECT ok(
  NOT has_column_privilege('anon', 'public.payment_attempts', 'bkash_callback_signature_hash', 'SELECT'),
  'Anonymous users cannot read stored callback signature hashes'
);
SELECT ok(
  NOT has_column_privilege('authenticated', 'public.payment_attempts', 'sandbox_refund_state', 'UPDATE'),
  'Authenticated browser clients cannot claim refunds'
);
SELECT ok(
  has_column_privilege('service_role', 'public.payment_attempts', 'sandbox_refund_trx_id', 'UPDATE'),
  'The server can store the sandbox refund transaction ID'
);

SELECT * FROM finish();
ROLLBACK;
