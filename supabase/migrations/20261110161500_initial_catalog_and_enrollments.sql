-- =============================================================================
-- Migration: 20261110161500_initial_catalog_and_enrollments
-- Authority: docs/architecture.md (§4.2), ADR 0002, ADR 0012, .agents/rules/50-database.md
-- Scope:
--   1. Core catalog and faculty schema: courses, batches, mentors, course_mentors
--   2. Enrollment applications table: enrollments (integer poisha, citext, Crockford Base32 ref)
--   3. Strict defense-in-depth grants and Row Level Security (RLS)
--   4. Verified Class A catalog baseline data (development-only fixtures live in supabase/seed.sql)
-- Forward-only migration: do not edit once applied.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Extensions
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- 2. Shared Timestamp Trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. Core Tables
-- -----------------------------------------------------------------------------

-- 3.1 Courses (Reusable offline course definitions; canonical slugs preserved)
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text NOT NULL,
  category text NOT NULL,
  summary text NOT NULL,
  description text NOT NULL,
  learning_outcomes jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_audience jsonb NOT NULL DEFAULT '[]'::jsonb,
  prerequisites jsonb NOT NULL DEFAULT '[]'::jsonb,
  modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  refund_policy_text text NOT NULL DEFAULT '',
  delivery_mode text NOT NULL DEFAULT 'offline',
  venue text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  featured boolean NOT NULL DEFAULT false,
  provenance jsonb NOT NULL,
  is_dev_fixture boolean NOT NULL DEFAULT false,
  fixture_label text,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT courses_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT courses_title_len CHECK (char_length(trim(title)) >= 3),
  CONSTRAINT courses_subtitle_len CHECK (char_length(trim(subtitle)) >= 5),
  CONSTRAINT courses_category_len CHECK (char_length(trim(category)) >= 3),
  CONSTRAINT courses_summary_len CHECK (char_length(trim(summary)) >= 10),
  CONSTRAINT courses_description_len CHECK (char_length(trim(description)) >= 20),
  CONSTRAINT courses_venue_len CHECK (char_length(trim(venue)) >= 3),
  CONSTRAINT courses_delivery_offline_only CHECK (delivery_mode = 'offline'),
  CONSTRAINT courses_status_valid CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT courses_arrays_valid CHECK (
    jsonb_typeof(learning_outcomes) = 'array'
    AND jsonb_typeof(target_audience) = 'array'
    AND jsonb_typeof(prerequisites) = 'array'
    AND jsonb_typeof(modules) = 'array'
    AND jsonb_typeof(faq) = 'array'
  ),
  CONSTRAINT courses_provenance_valid CHECK (
    jsonb_typeof(provenance) = 'object'
    AND coalesce(jsonb_typeof(provenance -> 'class'), '') = 'string'
    AND coalesce(provenance ->> 'class', '') IN ('A', 'B')
    AND coalesce(jsonb_typeof(provenance -> 'verified'), '') = 'boolean'
    AND coalesce(jsonb_typeof(provenance -> 'source'), '') = 'string'
    AND char_length(trim(coalesce(provenance ->> 'source', ''))) >= 5
    AND (
      coalesce(provenance ->> 'class', '') = 'B'
      OR (
        coalesce(provenance ->> 'verified', '') = 'true'
        AND coalesce(jsonb_typeof(provenance -> 'verifiedBy'), '') = 'string'
        AND nullif(trim(coalesce(provenance ->> 'verifiedBy', '')), '') IS NOT NULL
        AND coalesce(jsonb_typeof(provenance -> 'verifiedOn'), '') = 'string'
        AND nullif(trim(coalesce(provenance ->> 'verifiedOn', '')), '') IS NOT NULL
      )
    )
  ),
  CONSTRAINT courses_dev_fixture_labeled CHECK (
    NOT is_dev_fixture OR nullif(trim(coalesce(fixture_label, '')), '') IS NOT NULL
  )
);

CREATE INDEX idx_courses_status_featured ON public.courses (status, featured);

CREATE TRIGGER trg_courses_set_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3.2 Batches (Dated instances of courses; integer poisha fees per Rule R5)
CREATE TABLE public.batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  slug text NOT NULL UNIQUE,
  batch_number integer NOT NULL,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  schedule_description text NOT NULL,
  capacity integer NOT NULL,
  historical_enrolled_count integer NOT NULL DEFAULT 0,
  seat_hold_duration_minutes integer NOT NULL DEFAULT 30,
  fee_poisha bigint NOT NULL,
  discount_fee_poisha bigint,
  status text NOT NULL DEFAULT 'draft',
  venue text NOT NULL,
  enrollment_opens_at timestamptz,
  enrollment_closes_at timestamptz,
  provenance jsonb NOT NULL,
  is_dev_fixture boolean NOT NULL DEFAULT false,
  fixture_label text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT batches_id_course_unique UNIQUE (id, course_id),
  CONSTRAINT batches_course_batch_number_unique UNIQUE (course_id, batch_number),
  CONSTRAINT batches_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT batches_number_positive CHECK (batch_number > 0),
  CONSTRAINT batches_name_len CHECK (char_length(trim(name)) >= 3),
  CONSTRAINT batches_dates_ordered CHECK (end_date >= start_date),
  CONSTRAINT batches_schedule_len CHECK (char_length(trim(schedule_description)) >= 5),
  CONSTRAINT batches_capacity_positive CHECK (capacity > 0),
  CONSTRAINT batches_historical_count_bounds CHECK (
    historical_enrolled_count >= 0 AND historical_enrolled_count <= capacity
  ),
  CONSTRAINT batches_hold_duration_positive CHECK (seat_hold_duration_minutes > 0),
  CONSTRAINT batches_fee_nonnegative CHECK (fee_poisha >= 0),
  CONSTRAINT batches_discount_bounds CHECK (
    discount_fee_poisha IS NULL
    OR (discount_fee_poisha >= 0 AND discount_fee_poisha <= fee_poisha)
  ),
  CONSTRAINT batches_status_valid CHECK (
    status IN ('draft', 'upcoming', 'open_for_enrollment', 'in_progress', 'completed', 'cancelled', 'archived')
  ),
  CONSTRAINT batches_venue_len CHECK (char_length(trim(venue)) >= 3),
  CONSTRAINT batches_provenance_valid CHECK (
    jsonb_typeof(provenance) = 'object'
    AND coalesce(jsonb_typeof(provenance -> 'class'), '') = 'string'
    AND coalesce(provenance ->> 'class', '') IN ('A', 'B')
    AND coalesce(jsonb_typeof(provenance -> 'verified'), '') = 'boolean'
    AND coalesce(jsonb_typeof(provenance -> 'source'), '') = 'string'
    AND char_length(trim(coalesce(provenance ->> 'source', ''))) >= 5
    AND (
      coalesce(provenance ->> 'class', '') = 'B'
      OR (
        coalesce(provenance ->> 'verified', '') = 'true'
        AND coalesce(jsonb_typeof(provenance -> 'verifiedBy'), '') = 'string'
        AND nullif(trim(coalesce(provenance ->> 'verifiedBy', '')), '') IS NOT NULL
        AND coalesce(jsonb_typeof(provenance -> 'verifiedOn'), '') = 'string'
        AND nullif(trim(coalesce(provenance ->> 'verifiedOn', '')), '') IS NOT NULL
      )
    )
  ),
  CONSTRAINT batches_dev_fixture_labeled CHECK (
    NOT is_dev_fixture OR nullif(trim(coalesce(fixture_label, '')), '') IS NOT NULL
  )
);

CREATE INDEX idx_batches_course_status ON public.batches (course_id, status);
CREATE INDEX idx_batches_status_start_date ON public.batches (status, start_date);

CREATE TRIGGER trg_batches_set_updated_at
  BEFORE UPDATE ON public.batches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3.3 Mentors (Canonical mentor profiles)
CREATE TABLE public.mentors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL,
  organization text NOT NULL,
  bio text NOT NULL,
  portrait_src text,
  linkedin_url text,
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  expertise jsonb NOT NULL DEFAULT '[]'::jsonb,
  career_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  featured boolean NOT NULL DEFAULT false,
  is_placeholder boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT true,
  provenance jsonb NOT NULL,
  is_dev_fixture boolean NOT NULL DEFAULT false,
  fixture_label text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT mentors_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT mentors_name_len CHECK (char_length(trim(name)) >= 2),
  CONSTRAINT mentors_role_len CHECK (char_length(trim(role)) >= 2),
  CONSTRAINT mentors_org_len CHECK (char_length(trim(organization)) >= 2),
  CONSTRAINT mentors_bio_len CHECK (char_length(trim(bio)) >= 10),
  CONSTRAINT mentors_display_order_nonnegative CHECK (display_order >= 0),
  CONSTRAINT mentors_arrays_valid CHECK (
    jsonb_typeof(categories) = 'array'
    AND jsonb_typeof(expertise) = 'array'
    AND jsonb_typeof(career_history) = 'array'
  ),
  CONSTRAINT mentors_provenance_valid CHECK (
    jsonb_typeof(provenance) = 'object'
    AND coalesce(jsonb_typeof(provenance -> 'class'), '') = 'string'
    AND coalesce(provenance ->> 'class', '') IN ('A', 'B')
    AND coalesce(jsonb_typeof(provenance -> 'verified'), '') = 'boolean'
    AND coalesce(jsonb_typeof(provenance -> 'source'), '') = 'string'
    AND char_length(trim(coalesce(provenance ->> 'source', ''))) >= 5
    AND (
      coalesce(provenance ->> 'class', '') = 'B'
      OR (
        coalesce(provenance ->> 'verified', '') = 'true'
        AND coalesce(jsonb_typeof(provenance -> 'verifiedBy'), '') = 'string'
        AND nullif(trim(coalesce(provenance ->> 'verifiedBy', '')), '') IS NOT NULL
        AND coalesce(jsonb_typeof(provenance -> 'verifiedOn'), '') = 'string'
        AND nullif(trim(coalesce(provenance ->> 'verifiedOn', '')), '') IS NOT NULL
      )
    )
  ),
  CONSTRAINT mentors_dev_fixture_labeled CHECK (
    NOT is_dev_fixture OR nullif(trim(coalesce(fixture_label, '')), '') IS NOT NULL
  )
);

CREATE INDEX idx_mentors_published_order ON public.mentors (published, display_order);

CREATE TRIGGER trg_mentors_set_updated_at
  BEFORE UPDATE ON public.mentors
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3.4 Ordered Course Mentor Assignments (ADR 0012)
CREATE TABLE public.course_mentors (
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE RESTRICT,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (course_id, mentor_id),
  CONSTRAINT course_mentors_display_order_nonnegative CHECK (display_order >= 0),
  CONSTRAINT course_mentors_unique_order_per_course UNIQUE (course_id, display_order)
);

CREATE INDEX idx_course_mentors_course ON public.course_mentors (course_id, display_order);
CREATE INDEX idx_course_mentors_mentor ON public.course_mentors (mentor_id);

CREATE TRIGGER trg_course_mentors_set_updated_at
  BEFORE UPDATE ON public.course_mentors
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3.5 Enrollment Applications & Confirmed Enrollments
-- Zero direct access to browser roles (anon / authenticated).
-- Server handlers/RPCs (service_role) mediate all writes and sanitized status lookups.
CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_ref text NOT NULL UNIQUE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE RESTRICT,
  full_name text NOT NULL,
  email extensions.citext NOT NULL,
  phone text NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  program_questions_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_method text NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending_verification',
  submitted_payment_ref text,
  base_fee_poisha bigint NOT NULL,
  discount_amount_poisha bigint NOT NULL DEFAULT 0,
  payable_poisha bigint NOT NULL,
  currency text NOT NULL DEFAULT 'BDT',
  status text NOT NULL DEFAULT 'application_in_process',
  hold_expires_at timestamptz,
  verified_at timestamptz,
  verification_notes text,
  confirmed_at timestamptz,
  archived_at timestamptz,
  is_dev_fixture boolean NOT NULL DEFAULT false,
  fixture_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT enrollments_batch_course_match
    FOREIGN KEY (batch_id, course_id) REFERENCES public.batches(id, course_id) ON DELETE RESTRICT,
  CONSTRAINT enrollments_public_ref_crockford CHECK (
    public_ref ~ '^LNA-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$'
  ),
  CONSTRAINT enrollments_full_name_len CHECK (char_length(trim(full_name)) >= 2),
  CONSTRAINT enrollments_email_format CHECK (
    char_length(trim(email::text)) >= 5
    AND email::text ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  CONSTRAINT enrollments_phone_bd_format CHECK (phone ~ '^01[3-9][0-9]{8}$'),
  CONSTRAINT enrollments_json_shapes CHECK (
    jsonb_typeof(answers) = 'object'
    AND jsonb_typeof(program_questions_snapshot) = 'array'
  ),
  CONSTRAINT enrollments_payment_method_valid CHECK (
    payment_method IN ('bkash', 'bank_transfer', 'free')
  ),
  CONSTRAINT enrollments_payment_status_valid CHECK (
    payment_status IN ('not_required', 'pending_verification', 'verified', 'rejected', 'review_hold')
  ),
  CONSTRAINT enrollments_submitted_payment_ref_len CHECK (
    submitted_payment_ref IS NULL OR char_length(trim(submitted_payment_ref)) BETWEEN 4 AND 128
  ),
  CONSTRAINT enrollments_money_nonnegative CHECK (
    base_fee_poisha >= 0
    AND discount_amount_poisha >= 0
    AND discount_amount_poisha <= base_fee_poisha
    AND payable_poisha >= 0
    AND payable_poisha = base_fee_poisha - discount_amount_poisha
  ),
  CONSTRAINT enrollments_currency_bdt CHECK (currency = 'BDT'),
  CONSTRAINT enrollments_status_valid CHECK (
    status IN ('application_in_process', 'pending', 'confirmed', 'review_hold', 'expired', 'cancelled')
  ),
  CONSTRAINT enrollments_payment_amount_consistency CHECK (
    (payment_method = 'free' AND payable_poisha = 0)
    OR (payment_method IN ('bkash', 'bank_transfer') AND payable_poisha > 0)
  ),
  CONSTRAINT enrollments_free_payment_status_consistency CHECK (
    payment_method <> 'free' OR payment_status = 'not_required'
  ),
  CONSTRAINT enrollments_manual_payment_ref_required CHECK (
    NOT (
      status = 'application_in_process'
      AND payment_method IN ('bkash', 'bank_transfer')
      AND nullif(trim(coalesce(submitted_payment_ref, '')), '') IS NULL
    )
  ),
  CONSTRAINT enrollments_dev_fixture_labeled CHECK (
    NOT is_dev_fixture OR nullif(trim(coalesce(fixture_label, '')), '') IS NOT NULL
  )
);

-- Prevent duplicate active applications/seats per email per batch (BR-03, FR-ENR-003)
CREATE UNIQUE INDEX idx_enrollments_active_batch_email
  ON public.enrollments (batch_id, email)
  WHERE status IN ('application_in_process', 'pending', 'confirmed', 'review_hold');

-- Prevent reusing the same verified payment reference on the same payment rail
CREATE UNIQUE INDEX idx_enrollments_verified_payment_ref
  ON public.enrollments (payment_method, upper(trim(submitted_payment_ref)))
  WHERE payment_status = 'verified' AND submitted_payment_ref IS NOT NULL;

CREATE INDEX idx_enrollments_batch_status ON public.enrollments (batch_id, status);
CREATE INDEX idx_enrollments_course_id ON public.enrollments (course_id);
CREATE INDEX idx_enrollments_public_ref_email ON public.enrollments (public_ref, email);
CREATE INDEX idx_enrollments_public_ref_phone ON public.enrollments (public_ref, phone);

CREATE TRIGGER trg_enrollments_set_updated_at
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Explicit Grants & Row Level Security (ADR 0002, Rule R8, Rule R9)
-- -----------------------------------------------------------------------------

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Strip Supabase default schema table privileges from browser/public roles and service_role
REVOKE ALL ON TABLE public.courses FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.batches FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.mentors FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.course_mentors FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.enrollments FROM PUBLIC, anon, authenticated, service_role;

-- Backend service_role retains catalog management privileges
GRANT ALL ON TABLE
  public.courses,
  public.batches,
  public.mentors,
  public.course_mentors
TO service_role;

-- Principle of least privilege & Rule R10: enrollment records are archived, never deleted or truncated.
GRANT SELECT, INSERT, UPDATE ON TABLE public.enrollments TO service_role;

-- Read-only SELECT grants for public catalog tables only (zero write grants)
GRANT SELECT ON TABLE public.courses TO anon, authenticated;
GRANT SELECT ON TABLE public.batches TO anon, authenticated;
GRANT SELECT ON TABLE public.mentors TO anon, authenticated;
GRANT SELECT ON TABLE public.course_mentors TO anon, authenticated;
-- Strictly NO grants on public.enrollments for PUBLIC, anon, or authenticated.

-- Public catalog RLS policies
CREATE POLICY "Public read published courses"
  ON public.courses
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published' AND archived_at IS NULL);

CREATE POLICY "Public read visible batches of published courses"
  ON public.batches
  FOR SELECT
  TO anon, authenticated
  USING (
    status IN ('upcoming', 'open_for_enrollment', 'in_progress', 'completed')
    AND archived_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = batches.course_id
        AND c.status = 'published'
        AND c.archived_at IS NULL
    )
  );

CREATE POLICY "Public read published mentors"
  ON public.mentors
  FOR SELECT
  TO anon, authenticated
  USING (published = true AND archived_at IS NULL);

CREATE POLICY "Public read published course mentor assignments"
  ON public.course_mentors
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = course_mentors.course_id
        AND c.status = 'published'
        AND c.archived_at IS NULL
    )
    AND EXISTS (
      SELECT 1
      FROM public.mentors m
      WHERE m.id = course_mentors.mentor_id
        AND m.published = true
        AND m.archived_at IS NULL
    )
  );

-- Explicit deny-all policy for browser roles on private applicant records
CREATE POLICY "Deny direct browser access to enrollments"
  ON public.enrollments
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- -----------------------------------------------------------------------------
-- 5. Verified Class A Catalog Reference Data (Non-Fixture Public Baseline)
--    Development-only fixtures (mto-readiness, batches, enrollments) live in supabase/seed.sql
-- -----------------------------------------------------------------------------

-- 5.1 Verified Course ('irgp' from content/catalog/courses.json)
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
VALUES
  (
    'irgp',
    'Industry Readiness Graduate Program',
    'Industry-focused learning and career preparation.',
    'Industry Readiness',
    'Industry-focused practical learning and corporate placement gateway.',
    'The Industry Readiness Graduate Program (IRGP) is a professionally structured development initiative designed to close the gap between academic education and real-world corporate expectations. Delivered entirely through offline, face-to-face sessions in collaboration with industry experts, IRGP equips participants with practical simulations, executive mentorship, and a structured evaluation-to-hiring framework.',
    $json$[
      "Industry-focused practical corporate problem solving and case analysis",
      "Real corporate case studies & scenario-based training under seasoned directors",
      "Mentorship from experienced Bangladeshi CEOs, founders, and industry leaders",
      "Structured evaluation-to-hiring gateway with on-spot recruitment access",
      "Internship opportunities and career placement support",
      "Joint graduation certification from AIUB ICE & Lead Nation Academy"
    ]$json$::jsonb,
    $json$[
      "Open to all university students (public or private universities)",
      "Fresh graduates aiming to strengthen their corporate readiness",
      "Early-career working professionals preparing for executive acceleration"
    ]$json$::jsonb,
    $json$["Undergraduate degree or equivalent"]$json$::jsonb,
    $json$[
      {
        "id": "mod-irgp-01",
        "title": "Communication & Networking",
        "duration": "Week 1",
        "topics": ["Professional business correspondence", "Active listening & corporate networking", "Workplace relationship management"]
      },
      {
        "id": "mod-irgp-02",
        "title": "Operations & Workflow Management",
        "duration": "Week 2",
        "topics": ["Standard operating procedures (SOPs)", "Cross-departmental workflows", "Process efficiency & execution"]
      },
      {
        "id": "mod-irgp-03",
        "title": "Customer Experience (CX)",
        "duration": "Week 3",
        "topics": ["Customer journey mapping", "Retention strategies", "Service excellence & issue resolution"]
      },
      {
        "id": "mod-irgp-04",
        "title": "Basic Finance & Budgeting",
        "duration": "Week 4",
        "topics": ["Reading financial statements", "Departmental budget management", "Cost control & ROI metrics"]
      },
      {
        "id": "mod-irgp-05",
        "title": "Sales Techniques & Strategies",
        "duration": "Week 5",
        "topics": ["Consultative B2B & B2C selling", "Pitching & negotiation", "Sales pipeline management"]
      },
      {
        "id": "mod-irgp-06",
        "title": "Marketing & Branding Basics",
        "duration": "Week 6",
        "topics": ["Brand architecture", "Integrated marketing campaigns", "Market research & positioning"]
      },
      {
        "id": "mod-irgp-07",
        "title": "Tools for Professionals",
        "duration": "Week 7",
        "topics": ["Modern office productivity suites", "Data dashboards & spreadsheets", "Digital collaboration platforms"]
      },
      {
        "id": "mod-irgp-08",
        "title": "Entrepreneurship & Startup Basics",
        "duration": "Week 8",
        "topics": ["Business model canvas", "Validating market demand", "Early-stage fundraising & agility"]
      },
      {
        "id": "mod-irgp-09",
        "title": "Technology in Business",
        "duration": "Week 9",
        "topics": ["Enterprise software & cloud infrastructure", "Cybersecurity fundamentals", "Automation & AI in the workplace"]
      },
      {
        "id": "mod-irgp-10",
        "title": "Personal Branding & Career Growth",
        "duration": "Week 10",
        "topics": ["LinkedIn profile optimization", "Executive presence & thought leadership", "Career roadmapping"]
      },
      {
        "id": "mod-irgp-11",
        "title": "Communication for Leadership",
        "duration": "Week 11",
        "topics": ["Difficult workplace conversations", "Leading team syndicates", "Inspiring accountability & action"]
      },
      {
        "id": "mod-irgp-12",
        "title": "Presentation Skills & Public Speaking",
        "duration": "Week 12",
        "topics": ["Structured slide deck creation", "Confidence on stage & delivery", "Handling Q&A from executive panels"]
      },
      {
        "id": "mod-irgp-13",
        "title": "Comprehensive Review & Case Simulation",
        "duration": "Week 13",
        "topics": ["Cross-module review", "Mock boardroom simulations", "Mentor feedback roundtables"]
      },
      {
        "id": "mod-irgp-14",
        "title": "Evaluation & Assessment (Written Exam)",
        "duration": "Week 14",
        "topics": ["Comprehensive written assessment", "Business case analysis test"]
      },
      {
        "id": "mod-irgp-15",
        "title": "Evaluation & Viva Voce",
        "duration": "Week 15",
        "topics": ["One-on-one executive viva interview", "Portfolio evaluation by industry jury"]
      },
      {
        "id": "mod-irgp-16",
        "title": "Graduation & Placement Showcase",
        "duration": "Week 16",
        "topics": ["Formal graduation ceremony", "On-spot hiring interviews & corporate networking"]
      }
    ]$json$::jsonb,
    'offline',
    'AIUB – Institute of Continuing Education (ICE), Banani, Plot 58/B, Road #21, Banani, Dhaka',
    'published',
    true,
    $json${
      "class": "A",
      "verified": true,
      "source": "WordPress lnabdorg_wp955.sql (post ID 469)",
      "verifiedBy": "Content Migration",
      "verifiedOn": "2026-11-09"
    }$json$::jsonb,
    false,
    null,
    TIMESTAMPTZ '2026-11-09T00:00:00Z'
  )
ON CONFLICT (slug) DO NOTHING;

-- 5.2 Verified Class A Mentors (all 15 profiles from content/home/mentors.json; slugs preserved)
INSERT INTO public.mentors (
  slug,
  name,
  role,
  organization,
  bio,
  portrait_src,
  categories,
  expertise,
  career_history,
  display_order,
  is_placeholder,
  published,
  provenance,
  is_dev_fixture,
  fixture_label
)
VALUES
  (
    'mentor-mohammad-salekeen-ibrahim',
    'Mohammad Salekeen Ibrahim',
    'Head of Asset, Retail & SME Banking',
    'Eastern Bank PLC',
    'Head of Asset, Retail & SME Banking at Eastern Bank PLC with extensive leadership in corporate lending, credit risk, and banking operations.',
    '/images/mentors/mohammad-salekeen-ibrahim.png',
    $json$["Financial Analysis", "Leadership & Career", "Operations & Management"]$json$::jsonb,
    $json$["Retail & SME Banking", "Asset Management", "Credit Operations", "Financial Strategy"]$json$::jsonb,
    $json$[{"company": "Eastern Bank PLC", "role": "Head of Asset, Retail & SME Banking"}]$json$::jsonb,
    1,
    false,
    true,
    $json${"class": "A", "verified": true, "source": "Official MTO Faculty Reference", "verifiedBy": "Executive Team", "verifiedOn": "2026-11-09"}$json$::jsonb,
    false,
    null
  ),
  (
    'mentor-syed-himyanuddin-ahmed',
    'Syed Himyanuddin Ahmed',
    'Senior Associate Administrator, Administrator’s Office Division',
    'Nagad Ltd.',
    'Senior Associate Administrator at Nagad Ltd., specializing in executive administration, institutional governance, and corporate operations.',
    '/images/mentors/syed-himyanuddin-ahmed.png',
    $json$["Operations & Management", "Leadership & Career"]$json$::jsonb,
    $json$["Corporate Administration", "Institutional Governance", "Executive Operations", "Process Management"]$json$::jsonb,
    $json$[{"company": "Nagad Ltd.", "role": "Senior Associate Administrator, Administrator’s Office Division"}]$json$::jsonb,
    2,
    false,
    true,
    $json${"class": "A", "verified": true, "source": "Official MTO Faculty Reference", "verifiedBy": "Executive Team", "verifiedOn": "2026-11-09"}$json$::jsonb,
    false,
    null
  ),
  (
    'mentor-anubhab-rahman',
    'Anubhab Rahman',
    'Chief Human Resources Officer, Human Resources Division',
    'Nagad Ltd.',
    'Chief Human Resources Officer at Nagad Ltd., driving organizational development, executive talent acquisition, and HR strategy in fintech.',
    '/images/mentors/anubhab-rahman-v3.png',
    $json$["Leadership & Career", "Operations & Management"]$json$::jsonb,
    $json$["Human Resources Strategy", "Executive Recruitment", "Organizational Development", "Talent Governance"]$json$::jsonb,
    $json$[{"company": "Nagad Ltd.", "role": "Chief Human Resources Officer, Human Resources Division"}]$json$::jsonb,
    3,
    false,
    true,
    $json${"class": "A", "verified": true, "source": "Official MTO Faculty Reference", "verifiedBy": "Executive Team", "verifiedOn": "2026-11-09"}$json$::jsonb,
    false,
    null
  ),
  (
    'mentor-md-manik-hossain',
    'Md. Manik Hossain',
    'Head of HR Strategy & OD, Human Resources Division',
    'Nagad Ltd.',
    'Head of HR Strategy & OD at Nagad Ltd., leading organizational design, leadership development frameworks, and MTO performance assessment.',
    '/images/mentors/md-manik-hossain.png',
    $json$["Leadership & Career", "Operations & Management"]$json$::jsonb,
    $json$["HR Strategy", "Organizational Design", "MTO Assessment", "Talent Frameworks"]$json$::jsonb,
    $json$[{"company": "Nagad Ltd.", "role": "Head of HR Strategy & OD, Human Resources Division"}]$json$::jsonb,
    4,
    false,
    true,
    $json${"class": "A", "verified": true, "source": "Official MTO Faculty Reference", "verifiedBy": "Executive Team", "verifiedOn": "2026-11-09"}$json$::jsonb,
    false,
    null
  ),
  (
    'mentor-mir-hasib',
    'Mir Hasib Mahmud',
    'CEO',
    'Lead Nation Academy',
    'CEO & Co-founder of Lead Nation Academy and corporate strategist. Mentor of Workplace Communication, Executive Networking, and Career Acceleration.',
    '/images/mentors/mir-hasib.png',
    $json$["Communication & Influence", "Leadership & Career"]$json$::jsonb,
    $json$["Workplace Communication", "Executive Networking", "Negotiation", "Career Roadmapping"]$json$::jsonb,
    $json$[{"company": "Lead Nation Academy", "role": "CEO & Co-founder"}, {"company": "Goyara Ltd", "role": "CBO"}]$json$::jsonb,
    5,
    false,
    true,
    $json${"class": "A", "verified": true, "source": "Official CEO portrait provided by LNA leadership", "verifiedBy": "Executive Team", "verifiedOn": "2026-11-09"}$json$::jsonb,
    false,
    null
  ),
  (
    'mentor-shahnawaj-chowdhury',
    'Shahnawaj Chowdhury',
    'Additional Managing Director',
    'Modhumoti Bank PLC',
    'Additional Managing Director at Modhumoti Bank PLC with extensive commercial banking and workflow optimization experience. Mentor of Operations and Workflow Management.',
    '/images/mentors/shahnawaj-chowdhury.png',
    $json$["Operations & Management", "Financial Analysis"]$json$::jsonb,
    $json$["Operations Management", "Workflow Optimization", "Banking Systems", "Institutional Risk"]$json$::jsonb,
    $json$[{"company": "Modhumoti Bank PLC", "role": "Additional Managing Director"}]$json$::jsonb,
    6,
    false,
    true,
    $json${"class": "A", "verified": true, "source": "WordPress lnabdorg_wp955.sql (attachment ID 583)", "verifiedBy": "Content Migration", "verifiedOn": "2026-11-09"}$json$::jsonb,
    false,
    null
  ),
  (
    'mentor-gm-kamrul',
    'G M Kamrul Hassan',
    'CEO',
    'IGLOO',
    'CEO at IGLOO and corporate leader with decades of executive leadership in FMCG and technology. Mentor of Sales Techniques & Strategies.',
    '/images/mentors/gm-kamrul.png',
    $json$["Marketing & Sales", "Leadership & Career"]$json$::jsonb,
    $json$["Sales Strategy", "FMCG Leadership", "Revenue Growth", "Market Expansion"]$json$::jsonb,
    $json$[{"company": "IGLOO", "role": "CEO"}]$json$::jsonb,
    7,
    false,
    true,
    $json${"class": "A", "verified": true, "source": "WordPress lnabdorg_wp955.sql (attachment ID 592)", "verifiedBy": "Content Migration", "verifiedOn": "2026-11-09"}$json$::jsonb,
    false,
    null
  ),
  (
    'mentor-istiaque-bhuiyan',
    'Istiaque Ahmed Bhuiyan',
    'Sr. GM (Cloud, Colo, ANS)',
    'Axentec PLC (a Robi Axiata company)',
    'Senior General Manager at Axentec PLC (a Robi Axiata company) leading enterprise cloud and IT infrastructure. Mentor of Technology in Business.',
    '/images/mentors/istiaque-bhuiyan.png',
    $json$["Technology & AI", "Operations & Management"]$json$::jsonb,
    $json$["Cloud Infrastructure", "Enterprise IT", "Tech in Business", "Digital Transformation"]$json$::jsonb,
    $json$[{"company": "Axentec PLC (Robi Axiata)", "role": "Sr. GM"}]$json$::jsonb,
    8,
    false,
    true,
    $json${"class": "A", "verified": true, "source": "WordPress lnabdorg_wp955.sql (attachment ID 586)", "verifiedBy": "Content Migration", "verifiedOn": "2026-11-09"}$json$::jsonb,
    false,
    null
  ),
  (
    'mentor-munaf-chowdhury',
    'Munaf Mojib Chowdhury',
    'Head of Brand & Communication',
    'Axentec PLC',
    'Head of Brand & Communication at Axentec PLC and Founder of Ekshathe Foundation. Mentor of Modern Productivity & Digital Tools.',
    '/images/mentors/munaf-chowdhury.png',
    $json$["Technology & AI", "Communication & Influence"]$json$::jsonb,
    $json$["Digital Tools", "Productivity Systems", "Brand Communication", "Social Impact"]$json$::jsonb,
    $json$[{"company": "Axentec PLC", "role": "Head of Brand & Communication"}, {"company": "Ekshathe Foundation", "role": "Founder"}]$json$::jsonb,
    9,
    false,
    true,
    $json${"class": "A", "verified": true, "source": "WordPress lnabdorg_wp955.sql (attachment ID 776)", "verifiedBy": "Content Migration", "verifiedOn": "2026-11-09"}$json$::jsonb,
    false,
    null
  ),
  (
    'mentor-ilmul-sajib',
    'Ilmul Haque Sajib',
    'Co-founder',
    'Sheba Platform Ltd (SPL)',
    'Co-founder of Sheba Platform Ltd (SPL). Industry mentor for Entrepreneurship & Startup Basics, Personal Branding & Career Growth.',
    '/images/mentors/ilmul-sajib.png',
    $json$["Entrepreneurship & Strategy", "Leadership & Career"]$json$::jsonb,
    $json$["Entrepreneurship", "Startup Basics", "Personal Branding", "Career Growth"]$json$::jsonb,
    $json$[{"company": "Sheba Platform Ltd", "role": "Co-founder"}]$json$::jsonb,
    10,
    false,
    true,
    $json${"class": "A", "verified": true, "source": "WordPress lnabdorg_wp955.sql (attachment ID 584)", "verifiedBy": "Content Migration", "verifiedOn": "2026-11-09"}$json$::jsonb,
    false,
    null
  ),
  (
    'mentor-biplob-rahul',
    'Biplob G Rahul',
    'CEO',
    'e-Courier Limited',
    'Founder & CEO of e-Courier Limited, pioneering tech logistics and supply chain innovation in Bangladesh. Mentor of Presentation & Public Speaking.',
    '/images/mentors/biplob-rahul.png',
    $json$["Communication & Influence", "Entrepreneurship & Strategy"]$json$::jsonb,
    $json$["Public Speaking", "Corporate Pitching", "Logistics", "Business Storytelling"]$json$::jsonb,
    $json$[{"company": "e-Courier Limited", "role": "CEO"}]$json$::jsonb,
    11,
    false,
    true,
    $json${"class": "A", "verified": true, "source": "WordPress lnabdorg_wp955.sql (attachment ID 587)", "verifiedBy": "Content Migration", "verifiedOn": "2026-11-09"}$json$::jsonb,
    false,
    null
  ),
  (
    'mentor-zia-ashraf',
    'Zia Ashraf',
    'COO',
    'Chaldal PLC',
    'Co-founder & COO at Chaldal PLC, building Bangladesh''s premier tech-driven e-grocery ecosystem. Mentor of Customer Experience (CX).',
    '/images/mentors/zia-ashraf.png',
    $json$["Operations & Management", "Technology & AI"]$json$::jsonb,
    $json$["Customer Experience", "Operations Management", "E-Commerce Logistics", "Customer Retention"]$json$::jsonb,
    $json$[{"company": "Chaldal PLC", "role": "COO"}]$json$::jsonb,
    12,
    false,
    true,
    $json${"class": "A", "verified": true, "source": "WordPress lnabdorg_wp955.sql (attachment ID 589)", "verifiedBy": "Content Migration", "verifiedOn": "2026-11-09"}$json$::jsonb,
    false,
    null
  ),
  (
    'mentor-sayeda-salma',
    'Sayeda Umme Salma',
    'MD & CEO',
    'BrandGear Limited',
    'Managing Director & CEO of BrandGear Limited and seasoned marketing strategist. Mentor of Branding & Integrated Marketing.',
    '/images/mentors/sayeda-salma.png',
    $json$["Marketing & Sales"]$json$::jsonb,
    $json$["Brand Architecture", "Integrated Marketing", "Brand Positioning", "Consumer Strategy"]$json$::jsonb,
    $json$[{"company": "BrandGear Limited", "role": "MD & CEO"}]$json$::jsonb,
    13,
    false,
    true,
    $json${"class": "A", "verified": true, "source": "WordPress lnabdorg_wp955.sql (attachment ID 594)", "verifiedBy": "Content Migration", "verifiedOn": "2026-11-09"}$json$::jsonb,
    false,
    null
  ),
  (
    'mentor-zeeshan-huq',
    'Zeeshan Kingshuk Huq',
    'Chief Communication Officer',
    'United Commercial Bank PLC',
    'Chief Communication Officer at United Commercial Bank PLC. Industry mentor of Branding & Marketing, Leadership & Team Management.',
    '/images/mentors/zeeshan-huq.png',
    $json$["Marketing & Sales", "Leadership & Career", "Communication & Influence"]$json$::jsonb,
    $json$["Branding & Marketing", "Leadership & Team Management", "Corporate Communications", "Brand Strategy"]$json$::jsonb,
    $json$[{"company": "United Commercial Bank PLC", "role": "Chief Communication Officer"}]$json$::jsonb,
    14,
    false,
    true,
    $json${"class": "A", "verified": true, "source": "WordPress lnabdorg_wp955.sql (attachment ID 588)", "verifiedBy": "Content Migration", "verifiedOn": "2026-11-09"}$json$::jsonb,
    false,
    null
  ),
  (
    'mentor-talat-rahim',
    'Talat Rahim',
    'Chief Business Officer',
    'Shohoz.com',
    'Chief Business Officer at Shohoz.com. Industry mentor of Marketing and Branding.',
    '/images/mentors/talat-rahim.png',
    $json$["Marketing & Sales", "Entrepreneurship & Strategy"]$json$::jsonb,
    $json$["Marketing and Branding", "Business Growth", "Commercial Strategy"]$json$::jsonb,
    $json$[{"company": "Shohoz.com", "role": "Chief Business Officer"}]$json$::jsonb,
    15,
    false,
    true,
    $json${"class": "A", "verified": true, "source": "WordPress lnabdorg_wp955.sql (attachment ID 1240)", "verifiedBy": "Content Migration", "verifiedOn": "2026-11-09"}$json$::jsonb,
    false,
    null
  )
ON CONFLICT (slug) DO NOTHING;

-- 5.3 Ordered Course Mentor Assignments for Verified Class A Course (ADR 0012)
INSERT INTO public.course_mentors (course_id, mentor_id, display_order)
SELECT
  c.id,
  m.id,
  v.display_order
FROM (
  VALUES
    -- Industry Readiness Graduate Program (8 ordered mentors)
    ('irgp', 'mentor-shahnawaj-chowdhury', 1),
    ('irgp', 'mentor-gm-kamrul', 2),
    ('irgp', 'mentor-istiaque-bhuiyan', 3),
    ('irgp', 'mentor-munaf-chowdhury', 4),
    ('irgp', 'mentor-ilmul-sajib', 5),
    ('irgp', 'mentor-biplob-rahul', 6),
    ('irgp', 'mentor-zia-ashraf', 7),
    ('irgp', 'mentor-sayeda-salma', 8)
) AS v(course_slug, mentor_slug, display_order)
JOIN public.courses c ON c.slug = v.course_slug
JOIN public.mentors m ON m.slug = v.mentor_slug
ON CONFLICT (course_id, mentor_id) DO NOTHING;

COMMIT;
