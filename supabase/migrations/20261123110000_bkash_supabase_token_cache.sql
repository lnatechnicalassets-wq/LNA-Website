BEGIN;

CREATE SCHEMA bkash_private;
REVOKE ALL ON SCHEMA bkash_private FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE bkash_private.gateway_tokens (
  merchant_key text PRIMARY KEY CHECK (merchant_key ~ '^[0-9a-f]{64}$'),
  id_token text,
  token_expires_at timestamptz,
  grant_owner uuid,
  grant_lease_until timestamptz,
  previous_grant_at timestamptz,
  latest_grant_at timestamptz,
  CHECK ((id_token IS NULL) = (token_expires_at IS NULL)),
  CHECK ((grant_owner IS NULL) = (grant_lease_until IS NULL))
);

ALTER TABLE bkash_private.gateway_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE bkash_private.gateway_tokens FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.bkash_acquire_gateway_token(p_merchant_key text, p_owner uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cache bkash_private.gateway_tokens%ROWTYPE;
  v_now timestamptz;
  v_lease interval := interval '45 seconds';
BEGIN
  IF p_merchant_key IS NULL OR p_merchant_key !~ '^[0-9a-f]{64}$' OR p_owner IS NULL THEN
    RAISE EXCEPTION 'Invalid bKash cache key or lease owner' USING ERRCODE = '22023';
  END IF;

  INSERT INTO bkash_private.gateway_tokens (merchant_key)
  VALUES (p_merchant_key)
  ON CONFLICT (merchant_key) DO NOTHING;

  -- One transaction at a time may inspect and claim a renewal for this merchant.
  SELECT * INTO v_cache FROM bkash_private.gateway_tokens
  WHERE merchant_key = p_merchant_key FOR UPDATE;
  v_now := clock_timestamp();

  IF v_cache.token_expires_at > v_now THEN
    RETURN jsonb_build_object('state', 'cached', 'token', v_cache.id_token);
  END IF;
  IF v_cache.grant_lease_until > v_now THEN
    RETURN jsonb_build_object('state', 'wait');
  END IF;
  IF v_cache.previous_grant_at > v_now - interval '1 hour' THEN
    RETURN jsonb_build_object('state', 'limited');
  END IF;

  -- Reserve quota before issuing Grant. If a worker disappears, count the
  -- attempt from the lease deadline, conservatively covering its send time.
  UPDATE bkash_private.gateway_tokens
  SET id_token = NULL,
      token_expires_at = NULL,
      grant_owner = p_owner,
      grant_lease_until = v_now + v_lease,
      previous_grant_at = v_cache.latest_grant_at,
      latest_grant_at = v_now + v_lease
  WHERE merchant_key = p_merchant_key;

  RETURN jsonb_build_object('state', 'grant');
END;
$$;

CREATE FUNCTION public.bkash_finish_gateway_token(
  p_merchant_key text, p_owner uuid, p_token text, p_valid_for_ms integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cache bkash_private.gateway_tokens%ROWTYPE;
  v_now timestamptz;
  v_expires_at timestamptz;
BEGIN
  SELECT * INTO v_cache FROM bkash_private.gateway_tokens
  WHERE merchant_key = p_merchant_key FOR UPDATE;
  v_now := clock_timestamp();

  IF NOT FOUND OR p_owner IS NULL OR v_cache.grant_owner IS DISTINCT FROM p_owner
      OR v_cache.grant_lease_until <= v_now THEN
    RETURN false;
  END IF;

  IF p_token IS NOT NULL AND p_token <> '' AND p_valid_for_ms BETWEEN 1 AND 3600000 THEN
    -- Start the token lifetime at the original database claim, before the
    -- provider issued it, so network delay and clock skew cannot extend it.
    v_expires_at := v_cache.grant_lease_until - interval '45 seconds'
      + p_valid_for_ms * interval '1 millisecond';
    IF v_expires_at <= v_now THEN
      v_expires_at := NULL;
    END IF;
  END IF;

  UPDATE bkash_private.gateway_tokens
  SET id_token = CASE WHEN v_expires_at IS NOT NULL THEN p_token END,
      token_expires_at = v_expires_at,
      grant_owner = NULL,
      grant_lease_until = NULL,
      latest_grant_at = v_now
  WHERE merchant_key = p_merchant_key;

  -- A failed Grant still consumes quota, even when its owner releases it.
  RETURN v_expires_at IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.bkash_acquire_gateway_token(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bkash_finish_gateway_token(text, uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bkash_acquire_gateway_token(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.bkash_finish_gateway_token(text, uuid, text, integer) TO service_role;

COMMIT;
