BEGIN;
SELECT plan(12);

INSERT INTO auth.users (id, email)
VALUES ('44444444-4444-4444-8444-444444444444', 'catalog-create@example.invalid');
INSERT INTO public.profiles (id, email, full_name, role)
VALUES ('44444444-4444-4444-8444-444444444444', 'catalog-create@example.invalid', 'Catalog Create Test', 'super_admin');

SELECT ok(NOT has_function_privilege('anon', 'public.create_admin_catalog_draft(uuid,text,jsonb)', 'EXECUTE'), 'Anon cannot create catalog drafts');
SELECT ok(NOT has_function_privilege('authenticated', 'public.create_admin_catalog_draft(uuid,text,jsonb)', 'EXECUTE'), 'Browser users cannot call draft RPC');

SET LOCAL ROLE service_role;

SELECT throws_ok($test$
  SELECT public.create_admin_catalog_draft('55555555-5555-4555-8555-555555555555', 'courses', '{}')
$test$, '42501', 'CATALOG_CREATE_FORBIDDEN', 'Unknown actor cannot create drafts');

SELECT lives_ok($test$
  SELECT public.create_admin_catalog_draft('44444444-4444-4444-8444-444444444444', 'courses',
    '{"slug":"pgtap-catalog-create","title":"Draft course","subtitle":"Test subtitle","category":"Training",
      "summary":"Draft course summary","description":"Draft course description for this test.",
      "venue":"Dhaka","status":"published"}')
$test$, 'Super Admin can create a course draft');

SELECT is((SELECT status FROM public.courses WHERE slug = 'pgtap-catalog-create'), 'draft',
  'Course status is forced to draft');

SELECT throws_ok($test$
  SELECT public.create_admin_catalog_draft('44444444-4444-4444-8444-444444444444', 'courses',
    '{"slug":"pgtap-catalog-create","title":"Draft course","subtitle":"Test subtitle","category":"Training",
      "summary":"Draft course summary","description":"Draft course description for this test.","venue":"Dhaka"}')
$test$, '23505', 'CATALOG_CREATE_COURSE_SLUG', 'Duplicate course slug is rejected');

SELECT throws_ok($test$
  SELECT public.create_admin_catalog_draft('44444444-4444-4444-8444-444444444444', 'batches',
    '{"course_id":"55555555-5555-4555-8555-555555555555"}')
$test$, 'P0001', 'CATALOG_CREATE_COURSE_UNAVAILABLE', 'Batch requires an available parent course');

SELECT lives_ok($test$
  SELECT public.create_admin_catalog_draft('44444444-4444-4444-8444-444444444444', 'batches',
    jsonb_build_object('course_id', id) || '{"batch_number":2,"name":"Draft batch",
      "start_date":"2027-01-01","end_date":"2027-01-02","schedule_description":"Weekday sessions",
      "venue":"Dhaka","capacity":30,"fee_poisha":"123450","discount_fee_poisha":"100025",
      "status":"open_for_enrollment"}')
  FROM public.courses WHERE slug = 'pgtap-catalog-create'
$test$, 'Super Admin can create a batch draft');

SELECT is(
  (SELECT status || ':' || fee_poisha::text || ':' || discount_fee_poisha::text
    FROM public.batches WHERE slug = 'pgtap-catalog-create-batch-2'),
  'draft:123450:100025', 'Batch is a draft and fees are exact integer poisha'
);

SELECT throws_ok($test$
  SELECT public.create_admin_catalog_draft('44444444-4444-4444-8444-444444444444', 'batches',
    jsonb_build_object('course_id', id) || '{"batch_number":2,"name":"Duplicate batch",
      "start_date":"2027-01-01","end_date":"2027-01-02","schedule_description":"Weekday sessions",
      "venue":"Dhaka","capacity":30,"fee_poisha":"123450"}')
  FROM public.courses WHERE slug = 'pgtap-catalog-create'
$test$, '23505', 'CATALOG_CREATE_BATCH_NUMBER', 'Duplicate batch number is rejected');

SELECT is((SELECT count(*) FROM public.audit_events
  WHERE action = 'catalog_create' AND actor_id = '44444444-4444-4444-8444-444444444444'
    AND before_state IS NULL AND after_state ->> 'status' = 'draft'), 2::bigint,
  'Each successful draft has one audit event and rejected requests have none');

SET LOCAL ROLE anon;
SELECT is((SELECT count(*) FROM public.courses WHERE slug = 'pgtap-catalog-create') +
  (SELECT count(*) FROM public.batches WHERE slug = 'pgtap-catalog-create-batch-2'), 0::bigint,
  'Course and batch drafts are hidden from the public');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
