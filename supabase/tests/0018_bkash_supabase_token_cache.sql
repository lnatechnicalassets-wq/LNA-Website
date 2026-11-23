BEGIN;
SELECT plan(16);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'bkash_private.gateway_tokens'::regclass),
  'Token storage has RLS'
);
SELECT ok(
  NOT has_schema_privilege('service_role', 'bkash_private', 'USAGE'),
  'Service role uses the cache functions and has no direct schema access'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.bkash_acquire_gateway_token(text,uuid)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.bkash_acquire_gateway_token(text,uuid)', 'EXECUTE'),
  'Public clients cannot acquire or read tokens'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.bkash_finish_gateway_token(text,uuid,text,integer)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.bkash_finish_gateway_token(text,uuid,text,integer)', 'EXECUTE'),
  'Public clients cannot store or release tokens'
);
SELECT ok(
  has_function_privilege('service_role', 'public.bkash_acquire_gateway_token(text,uuid)', 'EXECUTE')
  AND has_function_privilege('service_role', 'public.bkash_finish_gateway_token(text,uuid,text,integer)', 'EXECUTE'),
  'Service role can use both cache functions'
);
SELECT is(
  public.bkash_acquire_gateway_token(repeat('a', 64), '11111111-1111-4111-8111-111111111111')->>'state',
  'grant', 'First worker gets a lease'
);
SELECT is(
  public.bkash_acquire_gateway_token(repeat('a', 64), '22222222-2222-4222-8222-222222222222')->>'state',
  'wait', 'Second worker waits while Grant is in progress'
);
SELECT is(
  public.bkash_finish_gateway_token(repeat('a', 64), '22222222-2222-4222-8222-222222222222', 'wrong-owner', 120000),
  false, 'Only the lease owner can save a token'
);
SELECT is(
  public.bkash_finish_gateway_token(repeat('a', 64), '11111111-1111-4111-8111-111111111111', 'fixture-token', 120000),
  true, 'Lease owner can publish a token'
);
SELECT is(
  public.bkash_acquire_gateway_token(repeat('a', 64), '22222222-2222-4222-8222-222222222222'),
  '{"state":"cached","token":"fixture-token"}'::jsonb, 'Another worker gets the same token'
);
SELECT ok(
  (SELECT token_expires_at BETWEEN clock_timestamp() + interval '110 seconds'
     AND clock_timestamp() + interval '120 seconds'
   FROM bkash_private.gateway_tokens WHERE merchant_key = repeat('a', 64)),
  'Cache honors a token lifetime shorter than one hour'
);

UPDATE bkash_private.gateway_tokens SET token_expires_at = clock_timestamp() - interval '1 second'
WHERE merchant_key = repeat('a', 64);

SELECT is(
  public.bkash_acquire_gateway_token(repeat('a', 64), '22222222-2222-4222-8222-222222222222')->>'state',
  'grant', 'An expired token can be renewed'
);
SELECT is(
  public.bkash_finish_gateway_token(repeat('a', 64), '22222222-2222-4222-8222-222222222222', NULL, 0),
  false, 'Failed Grant clears its lease without publishing a token'
);
SELECT is(
  public.bkash_acquire_gateway_token(repeat('a', 64), '33333333-3333-4333-8333-333333333333')->>'state',
  'limited', 'An unsuccessful Grant counts against the two-per-hour limit'
);
SELECT is(
  public.bkash_acquire_gateway_token(repeat('b', 64), '33333333-3333-4333-8333-333333333333')->>'state',
  'grant', 'A distinct merchant has an independent limit'
);

UPDATE bkash_private.gateway_tokens SET previous_grant_at = clock_timestamp() - interval '61 minutes'
WHERE merchant_key = repeat('a', 64);

SELECT is(
  public.bkash_acquire_gateway_token(repeat('a', 64), '33333333-3333-4333-8333-333333333333')->>'state',
  'grant', 'Quota opens when the older Grant is outside the rolling hour'
);

SELECT * FROM finish();
ROLLBACK;
