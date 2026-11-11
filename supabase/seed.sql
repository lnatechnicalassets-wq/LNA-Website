-- =============================================================================
-- Separate Development Seed: Labeled Class B Catalog & Synthetic Enrollment Fixtures
-- Authority: Rule R15, docs/architecture.md (§3.2), supabase/migrations/20261110161500
-- Usage: Run in local/development databases AFTER applying supabase/migrations/.
--        Excluded from production schema migrations.
-- =============================================================================

BEGIN;

-- 1. Development Course Fixture ('mto-readiness', Class B curriculum awaiting Gate B0)
INSERT INTO public.courses (
  slug,
  title,
  subtitle,
  category,
  summary,
  description,
  learning_outcomes,
  target_audience,
  prerequisites,
  modules,
  delivery_mode,
  venue,
  status,
  featured,
  provenance,
  is_dev_fixture,
  fixture_label,
  published_at
)
VALUES (
  'mto-readiness',
  'MTO Readiness Program',
  'Graduate Career & Leadership Accelerator',
  'Career Readiness',
  'Graduate Career & Leadership Accelerator',
  'An intensive leadership and career readiness accelerator designed to prepare high-potential university graduates for Management Trainee Officer (MTO) recruitment in leading multinational and national corporations.',
  $json$[
    "Aptitude test mastery and analytical problem solving",
    "Comprehensive business case interview simulations",
    "Assessment center team dynamics and presentation skills",
    "Executive personal branding and leadership presence"
  ]$json$::jsonb,
  $json$[
    "Final-year undergraduate and graduate students",
    "Recent university graduates targeting corporate MTO tracks",
    "Early-career professionals aiming for fast-track leadership roles"
  ]$json$::jsonb,
  $json$[
    "Graduating within 12 months or graduated within the last 2 years",
    "Commitment to intensive offline weekend sessions"
  ]$json$::jsonb,
  $json$[
    {
      "id": "mod-mto-01",
      "title": "Corporate Aptitude & Analytical Problem Solving",
      "duration": "4 Sessions",
      "topics": ["Analytical reasoning", "Numerical problem solving", "Critical comprehension"]
    },
    {
      "id": "mod-mto-02",
      "title": "Business Case Analysis & Strategic Frameworks",
      "duration": "4 Sessions",
      "topics": ["Market entry cases", "Profitability diagnosis", "Executive synthesis"]
    },
    {
      "id": "mod-mto-03",
      "title": "Assessment Center Dynamics & Group Exercises",
      "duration": "4 Sessions",
      "topics": ["Leaderless group discussions", "In-tray simulations", "Team consensus"]
    },
    {
      "id": "mod-mto-04",
      "title": "Boardroom Presentations & Leadership Communication",
      "duration": "4 Sessions",
      "topics": ["Executive storytelling", "Stress interviews", "Personal leadership branding"]
    }
  ]$json$::jsonb,
  'offline',
  'Designated Executive Venue, Dhaka',
  'published',
  true,
  $json${
    "class": "B",
    "verified": false,
    "source": "[DEV FIXTURE] Approved MTO program curriculum",
    "verifiedBy": null,
    "verifiedOn": null
  }$json$::jsonb,
  true,
  'DEV_FIXTURE_CATALOG_CLASS_B',
  TIMESTAMPTZ '2026-11-09T00:00:00Z'
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Ordered MTO Faculty Roster (depends on 'mto-readiness' dev fixture & migration mentors)
INSERT INTO public.course_mentors (course_id, mentor_id, display_order)
SELECT
  c.id,
  m.id,
  v.display_order
FROM (
  VALUES
    ('mto-readiness', 'mentor-mohammad-salekeen-ibrahim', 1),
    ('mto-readiness', 'mentor-syed-himyanuddin-ahmed', 2),
    ('mto-readiness', 'mentor-anubhab-rahman', 3),
    ('mto-readiness', 'mentor-md-manik-hossain', 4),
    ('mto-readiness', 'mentor-mir-hasib', 5)
) AS v(course_slug, mentor_slug, display_order)
JOIN public.courses c ON c.slug = v.course_slug
JOIN public.mentors m ON m.slug = v.mentor_slug
ON CONFLICT (course_id, mentor_id) DO NOTHING;

-- 3. Development Batch Fixtures (from content/catalog/batches.json; integer poisha per Rule R5)
INSERT INTO public.batches (
  course_id,
  slug,
  batch_number,
  name,
  start_date,
  end_date,
  schedule_description,
  capacity,
  historical_enrolled_count,
  seat_hold_duration_minutes,
  fee_poisha,
  discount_fee_poisha,
  status,
  venue,
  provenance,
  is_dev_fixture,
  fixture_label
)
SELECT
  c.id,
  v.slug,
  v.batch_number,
  v.name,
  v.start_date,
  v.end_date,
  v.schedule_description,
  v.capacity,
  v.historical_enrolled_count,
  v.seat_hold_duration_minutes,
  v.fee_poisha,
  v.discount_fee_poisha,
  v.status,
  v.venue,
  v.provenance,
  v.is_dev_fixture,
  v.fixture_label
FROM (
  VALUES
    (
      'mto-readiness',
      'batch-mto-2026-01',
      1,
      'MTO Readiness Cohort 1',
      DATE '2026-12-01',
      DATE '2027-01-31',
      '16 Sessions (1.5h each)',
      30,
      18,
      30,
      750000::bigint,
      NULL::bigint,
      'open_for_enrollment',
      'Designated Executive Venue, Dhaka',
      $json${
        "class": "B",
        "verified": false,
        "source": "[DEV FIXTURE] Approved MTO batch schedule",
        "verifiedBy": null,
        "verifiedOn": null
      }$json$::jsonb,
      true,
      'DEV_FIXTURE_CATALOG_CLASS_B'
    ),
    (
      'irgp',
      'batch-irgp-cohort-1',
      1,
      'IRGP Cohort 1',
      DATE '2025-09-01',
      DATE '2025-11-30',
      '10 focus areas (8 industry mentors)',
      40,
      40,
      30,
      0::bigint,
      NULL::bigint,
      'completed',
      'AIUB – Institute of Continuing Education (ICE), Banani, Dhaka',
      $json${
        "class": "B",
        "verified": false,
        "source": "[DEV FIXTURE] Completed IRGP cohort record",
        "verifiedBy": null,
        "verifiedOn": null
      }$json$::jsonb,
      true,
      'DEV_FIXTURE_CATALOG_CLASS_B'
    )
) AS v(
  course_slug,
  slug,
  batch_number,
  name,
  start_date,
  end_date,
  schedule_description,
  capacity,
  historical_enrolled_count,
  seat_hold_duration_minutes,
  fee_poisha,
  discount_fee_poisha,
  status,
  venue,
  provenance,
  is_dev_fixture,
  fixture_label
)
JOIN public.courses c ON c.slug = v.course_slug
ON CONFLICT (slug) DO NOTHING;

-- 4. Clearly Labeled Synthetic Enrollment Fixtures (Rule R15; RFC 2606 @example.invalid emails)
INSERT INTO public.enrollments (
  public_ref,
  course_id,
  batch_id,
  full_name,
  email,
  phone,
  answers,
  program_questions_snapshot,
  payment_method,
  payment_status,
  submitted_payment_ref,
  base_fee_poisha,
  discount_amount_poisha,
  payable_poisha,
  currency,
  status,
  verified_at,
  verification_notes,
  confirmed_at,
  is_dev_fixture,
  fixture_label
)
SELECT
  v.public_ref,
  b.course_id,
  b.id,
  v.full_name,
  v.email::extensions.citext,
  v.phone,
  v.answers,
  v.program_questions_snapshot,
  v.payment_method,
  v.payment_status,
  v.submitted_payment_ref,
  b.fee_poisha,
  0::bigint,
  b.fee_poisha,
  'BDT',
  v.status,
  v.verified_at,
  v.verification_notes,
  v.confirmed_at,
  true,
  'DEV_FIXTURE_ENROLLMENT_M1'
FROM (
  VALUES
    (
      'LNA-DEVF-0001',
      'batch-mto-2026-01',
      '[DEV FIXTURE] Sample Applicant (Pending)',
      'dev.fixture.pending@example.invalid',
      '01700000001',
      $json${
        "university": "Sample University (Dev Fixture)",
        "department": "Finance",
        "professionalPhase": "Graduating soon",
        "goals": "Synthetic development fixture for bKash pending verification state."
      }$json$::jsonb,
      $json$[
        {"id": "university", "label": "University", "type": "text", "required": true},
        {"id": "department", "label": "Department", "type": "text", "required": true},
        {"id": "professionalPhase", "label": "Current professional phase", "type": "select", "options": ["Undergraduate", "Graduating soon", "Recent graduate", "Working professional"], "required": true},
        {"id": "goals", "label": "What would you like to get out of this program? (optional)", "type": "textarea", "required": false}
      ]$json$::jsonb,
      'bkash',
      'pending_verification',
      'DEVBKASH901',
      'application_in_process',
      NULL::timestamptz,
      'Clearly labeled development fixture awaiting staff verification.',
      NULL::timestamptz
    ),
    (
      'LNA-DEVF-0002',
      'batch-mto-2026-01',
      '[DEV FIXTURE] Sample Applicant (Confirmed)',
      'dev.fixture.confirmed@example.invalid',
      '01800000002',
      $json${
        "university": "Sample University (Dev Fixture)",
        "department": "Marketing",
        "professionalPhase": "Recent graduate",
        "goals": "Synthetic development fixture for confirmed bank transfer state."
      }$json$::jsonb,
      $json$[
        {"id": "university", "label": "University", "type": "text", "required": true},
        {"id": "department", "label": "Department", "type": "text", "required": true},
        {"id": "professionalPhase", "label": "Current professional phase", "type": "select", "options": ["Undergraduate", "Graduating soon", "Recent graduate", "Working professional"], "required": true},
        {"id": "goals", "label": "What would you like to get out of this program? (optional)", "type": "textarea", "required": false}
      ]$json$::jsonb,
      'bank_transfer',
      'verified',
      'DEVBANKREF02',
      'confirmed',
      TIMESTAMPTZ '2026-11-10T10:00:00Z',
      'Clearly labeled development fixture representing verified bank transfer enrollment.',
      TIMESTAMPTZ '2026-11-10T10:00:00Z'
    )
) AS v(
  public_ref,
  batch_slug,
  full_name,
  email,
  phone,
  answers,
  program_questions_snapshot,
  payment_method,
  payment_status,
  submitted_payment_ref,
  status,
  verified_at,
  verification_notes,
  confirmed_at
)
JOIN public.batches b ON b.slug = v.batch_slug
ON CONFLICT (public_ref) DO NOTHING;

COMMIT;

