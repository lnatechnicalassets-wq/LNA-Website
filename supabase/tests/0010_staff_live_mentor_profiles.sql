BEGIN;
SELECT plan(10);

INSERT INTO auth.users (id, email) VALUES
  ('8540901b-5c23-4660-b591-673c521c2ab0', 'live-mentor-fixture@example.invalid');
INSERT INTO public.profiles (id, email, full_name, role) VALUES
  ('8540901b-5c23-4660-b591-673c521c2ab0', 'live-mentor-fixture@example.invalid', 'Fixture Super Admin', 'super_admin');

SELECT is((SELECT public FROM storage.buckets WHERE id = 'mentor-media'), false, 'Mentor media bucket is private');
SELECT is((SELECT file_size_limit FROM storage.buckets WHERE id = 'mentor-media'), 1400000::bigint, 'Bucket applies the upload cap');
SELECT ok(NOT has_function_privilege('authenticated',
 'public.save_staff_mentor_profile(uuid,text,uuid,timestamptz,text,text,text,text,text,text,text,jsonb,boolean)',
 'EXECUTE'), 'Browser role cannot write a mentor profile');

CREATE FUNCTION pg_temp.save_mentor_fixture(operation text, visibility boolean, profile_url text, topics jsonb)
RETURNS text LANGUAGE sql AS $$
  SELECT public.save_staff_mentor_profile(
    '8540901b-5c23-4660-b591-673c521c2ab0', operation, m.id, m.updated_at,
    'Live Mentor Fixture', 'Facilitator', 'Fixture Company', 'An example mentor in an isolated test',
    '/api/mentor-media/12888888-4444-4555-8666-123456789abc.webp', NULL,
    profile_url, topics, visibility
  ) FROM (SELECT 1) AS once LEFT JOIN public.mentors m ON m.name = 'Live Mentor Fixture';
$$;

SET LOCAL ROLE service_role;
SELECT is(pg_temp.save_mentor_fixture('create', false, 'https://www.linkedin.com/in/example-fixture/', '["Leadership"]'), 'OK', 'Can save a mentor draft');
SELECT is((SELECT expertise->>0 FROM public.mentors WHERE name = 'Live Mentor Fixture'), 'Leadership', 'Expertise persists');
SELECT is(pg_temp.save_mentor_fixture('edit', true, 'https://linkedin.com.evil.example/in/fixture', '["Leadership"]'), 'INVALID', 'LinkedIn lookalike rejected');
SELECT is(pg_temp.save_mentor_fixture('edit', true, NULL, '42'), 'INVALID', 'Expertise must be an array');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT is((SELECT count(*) FROM public.mentors WHERE name = 'Live Mentor Fixture'), 0::bigint, 'Draft remains private');
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT is(pg_temp.save_mentor_fixture('edit', true, 'https://linkedin.com/in/example-fixture/', '["Coaching","Facilitation"]'), 'OK', 'Saving published mentor updates the public record');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT results_eq(
  $$ SELECT linkedin_url, expertise->>1 FROM public.mentors WHERE name = 'Live Mentor Fixture' $$,
  $$ VALUES ('https://linkedin.com/in/example-fixture/'::text, 'Facilitation'::text) $$,
  'Public reader sees saved LinkedIn and expertise'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
