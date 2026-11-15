BEGIN;
SELECT plan(12);

INSERT INTO auth.users (id, email)
VALUES ('55555555-5555-4555-8555-555555555555', 'catalog-publish@example.invalid');
INSERT INTO public.profiles (id, email, full_name, role)
VALUES ('55555555-5555-4555-8555-555555555555', 'catalog-publish@example.invalid', 'Catalog Publish Test', 'super_admin');
INSERT INTO public.courses (
  id, slug, title, subtitle, category, summary, description, venue, provenance
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'pgtap-catalog-publish', 'Draft course',
  'Test subtitle', 'Training', 'Original course summary', 'Original course description for this test.',
  'Dhaka', '{"class":"B","verified":false,"source":"pgTAP publish fixture"}'
);
INSERT INTO public.batches (
  id, course_id, slug, batch_number, name, start_date, end_date, schedule_description,
  capacity, fee_poisha, venue, provenance
) VALUES (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'pgtap-catalog-publish-batch', 1, 'Draft batch', '2027-01-01', '2027-01-02',
  'Weekday sessions', 4, 100000, 'Dhaka',
  '{"class":"B","verified":false,"source":"pgTAP publish fixture"}'
);

SELECT ok(NOT has_function_privilege('anon', 'public.publish_admin_catalog_draft(uuid,text,uuid,timestamptz)', 'EXECUTE'), 'Anon cannot run publishing RPC');
SELECT ok(NOT has_function_privilege('authenticated', 'public.publish_admin_catalog_draft(uuid,text,uuid,timestamptz)', 'EXECUTE'), 'Browser users cannot run publishing RPC');
SET LOCAL ROLE service_role;

SELECT throws_ok($test$
  SELECT public.publish_admin_catalog_draft('77777777-7777-4777-8777-777777777777', 'courses', id, updated_at)
  FROM public.courses WHERE slug = 'pgtap-catalog-publish'
$test$, '42501', 'CATALOG_PUBLISH_FORBIDDEN', 'Unknown staff actor cannot publish');

SELECT throws_ok($test$
  SELECT public.publish_admin_catalog_draft('55555555-5555-4555-8555-555555555555', 'batches', id, updated_at)
  FROM public.batches WHERE slug = 'pgtap-catalog-publish-batch'
$test$, 'P0001', 'CATALOG_PUBLISH_PARENT', 'Batch cannot publish while its course is a draft');

SELECT throws_ok($test$
  SELECT public.publish_admin_catalog_draft('55555555-5555-4555-8555-555555555555', 'courses', id, updated_at - interval '1 second')
  FROM public.courses WHERE slug = 'pgtap-catalog-publish'
$test$, 'P0001', 'CATALOG_PUBLISH_STALE', 'Stale course revision cannot publish');

SELECT is(
  (SELECT public.publish_admin_catalog_draft('55555555-5555-4555-8555-555555555555', 'courses', id, updated_at)
    FROM public.courses WHERE slug = 'pgtap-catalog-publish'),
  'pgtap-catalog-publish', 'Course publishes and returns its public slug'
);

SELECT throws_ok($test$
  SELECT public.publish_admin_catalog_draft('55555555-5555-4555-8555-555555555555', 'courses', id, updated_at)
  FROM public.courses WHERE slug = 'pgtap-catalog-publish'
$test$, 'P0001', 'CATALOG_PUBLISH_STALE', 'Repeated publication cannot create a second audit event');

SELECT ok((SELECT published_at IS NOT NULL FROM public.courses WHERE slug = 'pgtap-catalog-publish'),
  'Course records its publication timestamp');

SELECT is(
  (SELECT public.publish_admin_catalog_draft('55555555-5555-4555-8555-555555555555', 'batches', id, updated_at)
    FROM public.batches WHERE slug = 'pgtap-catalog-publish-batch'),
  'pgtap-catalog-publish', 'Batch publishes and returns the parent public slug'
);
SELECT is(
  (SELECT status FROM public.batches WHERE slug = 'pgtap-catalog-publish-batch'),
  'upcoming', 'Publishing a batch keeps enrollment closed'
);
SELECT is((SELECT count(*) FROM public.audit_events
  WHERE action = 'catalog_publish' AND actor_id = '55555555-5555-4555-8555-555555555555'
    AND before_state ->> 'status' = 'draft'
    AND after_state ->> 'status' IN ('published', 'upcoming')), 2::bigint,
  'Successful publications record before and after audit state exactly once');

SET LOCAL ROLE anon;
SELECT is((SELECT count(*) FROM public.courses WHERE slug = 'pgtap-catalog-publish') +
  (SELECT count(*) FROM public.batches WHERE slug = 'pgtap-catalog-publish-batch'), 2::bigint,
  'Published course and upcoming batch are visible to the public');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
