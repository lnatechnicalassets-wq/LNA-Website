BEGIN;

WITH corrected AS (
  SELECT mentor.id,
    coalesce(
      (
        SELECT jsonb_agg(entry.item ORDER BY entry.position)
        FROM jsonb_array_elements(mentor.career_history) WITH ORDINALITY AS entry(item, position)
        WHERE regexp_replace(lower(coalesce(entry.item->>'company', '')), '[^a-z0-9]', '', 'g')
          NOT IN ('goyara', 'goyaraltd', 'goyaralimited')
      ),
      '[]'::jsonb
    ) AS career_history,
    CASE
      WHEN lower(mentor.company_logo_src) IN ('/images/partners/goyara.png', '/images/partners/goyara-white.png')
        THEN NULL
      ELSE mentor.company_logo_src
    END AS company_logo_src
  FROM public.mentors AS mentor
  WHERE mentor.slug = 'mentor-mir-hasib'
)
UPDATE public.mentors AS mentor
SET career_history = corrected.career_history, company_logo_src = corrected.company_logo_src
FROM corrected
WHERE mentor.id = corrected.id
  AND (
    mentor.career_history IS DISTINCT FROM corrected.career_history
    OR mentor.company_logo_src IS DISTINCT FROM corrected.company_logo_src
  );

COMMIT;
