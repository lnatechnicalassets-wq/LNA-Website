# 50. Database Engineering & Migration Rules

**Authority:** Blueprint Part 6.4, 7.3; SRS Section 8.1, 8.2, 9.2  
**Scope:** Applies to all Supabase PostgreSQL schemas, migrations, functions, RLS policies, and database tests.

---

## 1. Migration Conventions
1. **Forward-Only Migrations:** All schema changes must be written as forward-only SQL migration files in `supabase/migrations/` using timestamped naming (`YYYYMMDDHHMMSS_name.sql`).
2. **Applied Migrations Are Immutable:** Never edit or delete an existing migration file once merged to `main`. Bug fixes and alterations must be made in a new forward migration.
3. **Expand-Then-Contract:** When altering schemas, ensure the change is backward-compatible with the currently running application code so rollbacks do not cause downtime.
4. **Data Integrity Types:**
   - Money must use `bigint` storing poisha (`1 BDT = 100 poisha`) with `CHECK (amount >= 0)`.
   - Email addresses must use `citext` for case-insensitive uniqueness.
   - Public references must be unique Crockford Base32 text, never exposing internal sequence numbers.

---

## 2. Row Level Security (RLS) Template
Every table created in PostgreSQL must immediately enable RLS:
```sql
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Revoke default public mutations
REVOKE ALL ON public.enrollments FROM anon, authenticated;

-- Public read-only policy for published content
CREATE POLICY "Public read published batches"
  ON public.batches
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Learner policy for own data
CREATE POLICY "Learners read own enrollments"
  ON public.enrollments
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());
```

---

## 3. Database Function Template (RPC)
Critical mutations, seat allocation, and payment confirmations must execute inside server-only PostgreSQL functions with explicit row locks:
```sql
CREATE OR REPLACE FUNCTION public.confirm_payment(
  p_attempt_id UUID,
  p_val_id TEXT,
  p_bank_tran_id TEXT,
  p_validated_amount_minor BIGINT,
  p_risk_level INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attempt payment_attempts%ROWTYPE;
BEGIN
  -- Strict argument validation
  IF p_attempt_id IS NULL OR p_val_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENTS';
  END IF;

  -- Acquire row-level lock
  SELECT * INTO v_attempt
  FROM payment_attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  -- Idempotency check
  IF v_attempt.status = 'validated' THEN
    RETURN jsonb_build_object('success', true, 'status', 'already_validated');
  END IF;

  -- State mutation logic...
  UPDATE payment_attempts
  SET status = 'validated',
      val_id = p_val_id,
      bank_tran_id = p_bank_tran_id,
      validated_amount_minor = p_validated_amount_minor,
      risk_level = p_risk_level,
      updated_at = now()
  WHERE id = p_attempt_id;

  RETURN jsonb_build_object('success', true, 'status', 'validated');
END;
$$;

-- Restrict function execution strictly to service role
REVOKE EXECUTE ON FUNCTION public.confirm_payment FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment TO service_role;
```

---

## 4. pgTAP Testing Pattern
Every migration must be paired with pgTAP tests verifying policy enforcement:
```sql
BEGIN;
SELECT plan(3);

-- Test 1: Verify RLS is enabled
SELECT has_table('public', 'enrollments');
SELECT is_rls_enabled('public', 'enrollments');

-- Test 2: Verify anon cannot insert
SET ROLE anon;
SELECT throws_ok(
  $$ INSERT INTO public.enrollments (email) VALUES ('test@example.com') $$,
  '42501',
  'permission denied for table enrollments'
);

SELECT * FROM finish();
ROLLBACK;
```
