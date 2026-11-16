BEGIN;
SELECT plan(3);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.mentors
    WHERE slug = 'mentor-mir-hasib' AND organization = 'Lead Nation Academy' AND published
  ),
  'Mir Hasib remains a published Lead Nation Academy mentor'
);

SELECT is(
  (SELECT career_history FROM public.mentors WHERE slug = 'mentor-mir-hasib'),
  '[{"company":"Lead Nation Academy","role":"CEO & Co-founder"}]'::jsonb,
  'Mir Hasib retains his Lead Nation Academy career history'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.mentors WHERE slug = 'mentor-mir-hasib'
      AND (company_logo_src IS NULL OR company_logo_src NOT ILIKE '/images/partners/goyara%')
  ),
  'Mir Hasib has no selected Goyara logo'
);

SELECT * FROM finish();
ROLLBACK;
