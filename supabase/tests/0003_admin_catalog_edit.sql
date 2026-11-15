BEGIN;
SELECT plan(11);

INSERT INTO auth.users (id, email)
VALUES ('33333333-3333-4333-8333-333333333333', 'catalog-edit@example.invalid');
INSERT INTO public.profiles (id, email, full_name, role)
VALUES ('33333333-3333-4333-8333-333333333333', 'catalog-edit@example.invalid', 'Catalog Test', 'super_admin');

INSERT INTO public.courses (
  id, slug, title, subtitle, category, summary, description, venue, provenance
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'pgtap-catalog-edit', 'Original title',
  'Test subtitle', 'Training', 'Original course summary', 'Original course description for this test.',
  'Dhaka', '{"class":"B","verified":false,"source":"pgTAP edit fixture"}'
);

INSERT INTO public.batches (
  id, course_id, slug, batch_number, name, start_date, end_date, schedule_description,
  capacity, historical_enrolled_count, fee_poisha, venue, provenance
) VALUES (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'pgtap-catalog-edit-batch', 1, 'Test batch', '2027-01-01', '2027-01-02',
  'Weekday sessions', 4, 1, 100000, 'Dhaka',
  '{"class":"B","verified":false,"source":"pgTAP edit fixture"}'
);
INSERT INTO public.enrollments (
  public_ref, course_id, batch_id, full_name, email, phone, payment_method, payment_status,
  base_fee_poisha, payable_poisha, status, confirmed_at
) VALUES (
  'LNA-9J9J-9J9J', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'Example Learner', 'catalog-learner@example.invalid', '01711111111', 'free', 'not_required',
  0, 0, 'confirmed', now()
);

SELECT ok(NOT has_function_privilege('anon', 'public.update_admin_catalog_record(uuid,text,uuid,timestamptz,jsonb)', 'EXECUTE'), 'Anon cannot run catalog edit RPC');
SELECT ok(NOT has_function_privilege('authenticated', 'public.update_admin_catalog_record(uuid,text,uuid,timestamptz,jsonb)', 'EXECUTE'), 'Browser users cannot run catalog edit RPC');

SET LOCAL ROLE service_role;

SELECT throws_ok($test$
  SELECT public.update_admin_catalog_record('44444444-4444-4444-8444-444444444444',
    'courses', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', now(), '{}')
$test$, '42501', 'CATALOG_EDIT_FORBIDDEN', 'Unknown staff actor rejected');

SELECT throws_ok($test$
  SELECT public.update_admin_catalog_record('33333333-3333-4333-8333-333333333333',
    'courses', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2000-01-01Z', '{}')
$test$, 'P0001', 'CATALOG_EDIT_STALE', 'Stale revision rejected');

SELECT lives_ok($test$
  SELECT public.update_admin_catalog_record('33333333-3333-4333-8333-333333333333',
    'courses', id, updated_at, '{"title":"Edited title","subtitle":"Test subtitle","category":"Training",
    "summary":"Updated course summary","description":"Updated description for the course test.","venue":"Dhaka",
    "status":"published","slug":"untrusted"}')
  FROM public.courses WHERE slug = 'pgtap-catalog-edit'
$test$, 'Super Admin can save allowed course fields');

SELECT is(
  (SELECT title || ':' || status FROM public.courses WHERE slug = 'pgtap-catalog-edit'),
  'Edited title:draft', 'Course title saved and lifecycle fields protected'
);

SELECT throws_ok($test$
  SELECT public.update_admin_catalog_record('33333333-3333-4333-8333-333333333333',
    'batches', id, updated_at, '{"capacity":1}')
  FROM public.batches WHERE slug = 'pgtap-catalog-edit-batch'
$test$, 'P0001', 'CATALOG_EDIT_CAPACITY', 'Existing seats set the capacity floor');

SELECT lives_ok($test$
  SELECT public.update_admin_catalog_record('33333333-3333-4333-8333-333333333333',
    'batches', id, updated_at, '{"name":"Edited batch","start_date":"2027-01-01","end_date":"2027-01-02",
    "schedule_description":"Weekday sessions","venue":"Dhaka","capacity":2,"fee_poisha":"123450",
    "discount_fee_poisha":"100025"}')
  FROM public.batches WHERE slug = 'pgtap-catalog-edit-batch'
$test$, 'Super Admin can save batch fields');

SELECT is(
  (SELECT fee_poisha::text || ':' || discount_fee_poisha::text FROM public.batches WHERE slug = 'pgtap-catalog-edit-batch'),
  '123450:100025', 'Prices saved exactly in poisha'
);
SELECT is((SELECT payable_poisha FROM public.enrollments WHERE public_ref = 'LNA-9J9J-9J9J'), 0::bigint,
  'Existing enrollment amounts are retained');
SELECT is((SELECT count(*) FROM public.audit_events
  WHERE action = 'catalog_edit' AND actor_id = '33333333-3333-4333-8333-333333333333'
    AND before_state IS NOT NULL AND after_state IS NOT NULL), 2::bigint,
  'Successful edits have attributable audit entries and rejected edits have none');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
