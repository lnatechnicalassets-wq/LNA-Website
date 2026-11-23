BEGIN;
SELECT plan(10);

SELECT has_column('public', 'payment_attempts', 'bkash_callback_signature_hash');
SELECT has_column('public', 'payment_attempts', 'bkash_sandbox_v2');
SELECT has_column('public', 'payment_attempts', 'bkash_execute_claimed');
SELECT has_column('public', 'payment_attempts', 'sandbox_refund_state');
SELECT has_index('public', 'payment_attempts', 'idx_payment_attempts_bkash_no_execute_response');
SELECT has_index('public', 'payment_attempts', 'idx_payment_attempts_one_active_execute');
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
