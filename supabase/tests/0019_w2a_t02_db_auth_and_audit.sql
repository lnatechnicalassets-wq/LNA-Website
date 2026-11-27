-- W2A-T02 pgTAP verification suite (SEC-01, SEC-02, SEC-05, D08, D64, D73).
-- Covers:
--   1. Browser-role & PUBLIC privilege denial + audit_events append-only immutability (incl. service_role)
--   2. Shared actor helper checks (unknown, disabled, NULL, empty, NULL-containing roles, non-spoofable role)
--   3. Authorized operational Admin & Super Admin RPCs (incl. create_staff_enrollment) + derived audit accuracy
--   4. Admin denial of Super Admin-only legacy purge operations (pending W2A-T06)
--   5. Secret/credential redaction (snake/camel/separator), D08 draft-delete audit preservation, genuine atomicity
BEGIN;
SELECT plan(54);

-- -----------------------------------------------------------------------------
-- Fixtures (Provenance Class B synthetic records; zero real PII)
-- -----------------------------------------------------------------------------
INSERT INTO auth.users (id, email) VALUES
  ('10000000-0000-4000-8000-000000000001', 'w2a-t02-super@example.invalid'),
  ('10000000-0000-4000-8000-000000000002', 'w2a-t02-admin@example.invalid'),
  ('10000000-0000-4000-8000-000000000003', 'w2a-t02-disabled@example.invalid');

INSERT INTO public.profiles (id, email, full_name, role, account_state) VALUES
  ('10000000-0000-4000-8000-000000000001', 'w2a-t02-super@example.invalid', 'W2A Super Admin', 'super_admin', 'active'),
  ('10000000-0000-4000-8000-000000000002', 'w2a-t02-admin@example.invalid', 'W2A Operational Admin', 'admin', 'active'),
  ('10000000-0000-4000-8000-000000000003', 'w2a-t02-disabled@example.invalid', 'W2A Disabled Super', 'super_admin', 'disabled');

INSERT INTO public.courses (id, slug, title, subtitle, category, summary, description, venue, status, published_at, provenance)
VALUES (
  '20000000-0000-4000-8000-000000000001', 'w2a-t02-course', 'W2A-T02 Course',
  'Auth fixture', 'Training', 'Synthetic course summary', 'Synthetic course description',
  'Dhaka', 'published', now(), '{"class":"B","verified":false,"source":"pgTAP W2A-T02"}'
);

INSERT INTO public.batches (
  id, course_id, slug, batch_number, name, start_date, end_date, schedule_description,
  capacity, historical_enrolled_count, fee_poisha, discount_fee_poisha, venue, status, provenance
) VALUES
  (
    '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
    'w2a-t02-open-batch', 1, 'Open Batch', current_date + 10, current_date + 11,
    'Weekend sessions', 10, 0, 500000, 400000, 'Dhaka', 'open_for_enrollment',
    '{"class":"B","verified":false,"source":"pgTAP W2A-T02"}'
  ),
  (
    '30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001',
    'w2a-t02-completed-batch', 2, 'Completed Batch', current_date - 20, current_date - 19,
    'Weekend sessions', 10, 0, 500000, NULL, 'Dhaka', 'completed',
    '{"class":"B","verified":false,"source":"pgTAP W2A-T02"}'
  );

INSERT INTO public.mentors (
  id, slug, name, role, organization, bio, published, provenance
) VALUES (
  '40000000-0000-4000-8000-000000000001', 'w2a-t02-mentor', 'Fixture Mentor',
  'Instructor', 'Fixture Org', 'Detailed synthetic mentor biography for tests.',
  false, '{"class":"B","verified":false,"source":"pgTAP W2A-T02"}'
);

INSERT INTO public.enrollments (
  id, public_ref, course_id, batch_id, full_name, email, phone,
  payment_method, payment_status, base_fee_poisha, payable_poisha, status,
  archived_at, is_dev_fixture, fixture_label
) VALUES (
  '50000000-0000-4000-8000-000000000001', 'LNA-W2A0-0001',
  '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
  'Purge Guard Fixture', 'purge-guard@example.invalid', '01799000001',
  'bkash', 'pending_verification', 400000, 400000, 'cancelled',
  now(), true, 'W2A-T02 purge guard'
);

INSERT INTO public.students (id, full_name, email, phone)
VALUES ('60000000-0000-4000-8000-000000000001', 'Purge Student Fixture', 'purge-student@example.invalid', '01799000002');
INSERT INTO public.student_contacts (student_id, email, phone)
VALUES ('60000000-0000-4000-8000-000000000001', 'purge-student@example.invalid', '01799000002');

-- Synthetic historical audit record verifying non-destructive migration preservation
INSERT INTO public.audit_events (actor_id, actor_role, action, target_entity, target_id, after_state, created_at)
VALUES (
  '10000000-0000-4000-8000-000000000001', 'super_admin', 'historical_seed_event',
  'batches', '30000000-0000-4000-8000-000000000001', '{"preserved":true}'::jsonb,
  '2026-11-15T10:00:00Z'::timestamptz
);

-- =============================================================================
-- 1. Privilege Boundaries, Direct Browser-Write Denial & Immutability (1-9)
-- =============================================================================
SELECT ok(
  NOT has_function_privilege('public', 'public.require_staff_actor(uuid,text[],text)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.require_staff_actor(uuid,text[],text)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.require_staff_actor(uuid,text[],text)', 'EXECUTE'),
  '1. require_staff_actor is denied to PUBLIC, anon, and authenticated'
);

SELECT ok(
  NOT has_function_privilege('public', 'public.record_staff_audit_event(uuid,text[],text,text,text,text,uuid,uuid,text,jsonb,jsonb,text)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.record_staff_audit_event(uuid,text[],text,text,text,text,uuid,uuid,text,jsonb,jsonb,text)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.record_staff_audit_event(uuid,text[],text,text,text,text,uuid,uuid,text,jsonb,jsonb,text)', 'EXECUTE'),
  '2. record_staff_audit_event is denied to PUBLIC, anon, and authenticated'
);

SELECT ok(
  NOT has_function_privilege('public', 'public.is_staff_actor_authorized(uuid,text[])', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.is_staff_actor_authorized(uuid,text[])', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.is_staff_actor_authorized(uuid,text[])', 'EXECUTE'),
  '3. is_staff_actor_authorized is denied to PUBLIC, anon, and authenticated'
);

SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$ INSERT INTO public.audit_events (actor_role, action, target_entity) VALUES ('admin', 'browser_spoof', 'batches') $$,
  '42501', NULL,
  '4. authenticated browser role cannot directly INSERT into audit_events'
);
SELECT throws_ok(
  $$ SELECT public.manage_staff_student('10000000-0000-4000-8000-000000000002', 'create', NULL, NULL, 'Bad', 'bad@example.invalid', '01799000099', NULL, NULL, NULL, NULL) $$,
  '42501', NULL,
  '5. authenticated browser role cannot execute service-only staff RPCs'
);
RESET ROLE;

SET LOCAL ROLE anon;
SELECT throws_ok(
  $$ INSERT INTO public.audit_events (actor_role, action, target_entity) VALUES ('admin', 'anon_spoof', 'batches') $$,
  '42501', NULL,
  '6. anon role cannot directly INSERT into audit_events'
);
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT throws_ok(
  $$ UPDATE public.audit_events SET reason = 'tampered' WHERE action = 'historical_seed_event' $$,
  '42501', NULL,
  '7. service_role cannot UPDATE audit_events (append-only enforcement)'
);
SELECT throws_ok(
  $$ DELETE FROM public.audit_events WHERE action = 'historical_seed_event' $$,
  '42501', NULL,
  '8. service_role cannot DELETE from audit_events (append-only enforcement)'
);
SELECT throws_ok(
  $$ TRUNCATE TABLE public.audit_events $$,
  '42501', NULL,
  '9. service_role cannot TRUNCATE audit_events (append-only enforcement)'
);

-- =============================================================================
-- 2. Shared Actor Validation Helper & Role Spoof Protection (10-19)
-- =============================================================================
SELECT throws_ok(
  $$ SELECT public.require_staff_actor(NULL, ARRAY['admin', 'super_admin'], 'STAFF_FORBIDDEN') $$,
  '42501', 'STAFF_FORBIDDEN',
  '10. NULL actor ID rejected'
);

SELECT throws_ok(
  $$ SELECT public.require_staff_actor('99999999-9999-4999-8999-999999999999', ARRAY['admin', 'super_admin'], 'STAFF_FORBIDDEN') $$,
  '42501', 'STAFF_FORBIDDEN',
  '11. Unknown actor ID rejected'
);

SELECT throws_ok(
  $$ SELECT public.require_staff_actor('10000000-0000-4000-8000-000000000003', ARRAY['admin', 'super_admin'], 'STAFF_FORBIDDEN') $$,
  '42501', 'STAFF_FORBIDDEN',
  '12. Disabled staff profile rejected even when role is super_admin'
);

SELECT throws_ok(
  $$ SELECT public.require_staff_actor('10000000-0000-4000-8000-000000000002', ARRAY['super_admin'], 'STAFF_SUPER_ONLY') $$,
  '42501', 'STAFF_SUPER_ONLY',
  '13. Active Admin denied when Super Admin role is required'
);

SELECT throws_ok(
  $$ SELECT public.require_staff_actor('10000000-0000-4000-8000-000000000001', ARRAY[]::text[], 'STAFF_FORBIDDEN') $$,
  '42501', 'STAFF_FORBIDDEN',
  '14. Empty allowed roles array fails closed'
);

SELECT throws_ok(
  $$ SELECT public.require_staff_actor('10000000-0000-4000-8000-000000000002', ARRAY[NULL::text], 'STAFF_FORBIDDEN') $$,
  '42501', 'STAFF_FORBIDDEN',
  '15. NULL-only allowed roles array fails closed'
);

SELECT throws_ok(
  $$ SELECT public.require_staff_actor('10000000-0000-4000-8000-000000000002', ARRAY['super_admin', NULL::text], 'STAFF_SUPER_ONLY') $$,
  '42501', 'STAFF_SUPER_ONLY',
  '16. Nonmatching roles array containing NULL fails closed instead of 3-valued NULL bypass'
);

SELECT is(
  public.is_staff_actor_authorized('10000000-0000-4000-8000-000000000003', ARRAY['super_admin']),
  false,
  '17. is_staff_actor_authorized returns false for disabled actor'
);

SELECT is(
  public.is_staff_actor_authorized('10000000-0000-4000-8000-000000000002', ARRAY[NULL::text])
    OR public.is_staff_actor_authorized('10000000-0000-4000-8000-000000000002', ARRAY['super_admin', NULL::text]),
  false,
  '18. is_staff_actor_authorized returns false for NULL-only and NULL-containing nonmatching arrays'
);

SELECT is(
  public.is_staff_actor_authorized('10000000-0000-4000-8000-000000000002', ARRAY['admin', 'super_admin']),
  true,
  '19. is_staff_actor_authorized returns true for active operational admin'
);

-- =============================================================================
-- 3. Authorized Admin & Super Admin Operational RPCs + Audit Accuracy (20-39)
-- =============================================================================

-- Disabled Super Admin rejected on operational RPC
SELECT throws_ok(
  $sql$
    SELECT public.update_admin_catalog_record(
      '10000000-0000-4000-8000-000000000003', 'batches', id, updated_at,
      jsonb_build_object(
        'name', name, 'start_date', start_date, 'end_date', end_date,
        'schedule_description', schedule_description, 'venue', venue,
        'capacity', capacity, 'fee_poisha', fee_poisha, 'discount_fee_poisha', discount_fee_poisha
      )
    ) FROM public.batches WHERE id = '30000000-0000-4000-8000-000000000001'
  $sql$,
  '42501', 'CATALOG_EDIT_FORBIDDEN',
  '20. Disabled Super Admin denied by catalog edit RPC'
);

-- Active Admin creates batch draft -> batch-scoped audit with actor_role = 'admin'
SELECT lives_ok(
  $sql$
    SELECT public.create_admin_catalog_draft(
      '10000000-0000-4000-8000-000000000002',
      'batches',
      jsonb_build_object(
        'course_id', '20000000-0000-4000-8000-000000000001',
        'batch_number', 99,
        'name', 'Admin Draft Batch',
        'start_date', (current_date + 30)::text,
        'end_date', (current_date + 31)::text,
        'schedule_description', 'Weekend cohort',
        'venue', 'Dhaka',
        'capacity', 25,
        'fee_poisha', 300000,
        'discount_fee_poisha', NULL,
        'reason', 'Create Spring cohort draft'
      )
    )
  $sql$,
  '21. Active operational Admin can create a catalog batch draft'
);

SELECT results_eq(
  $sql$
    SELECT a.actor_role, a.audit_scope, a.batch_id = b.id, a.reason
    FROM public.audit_events a
    JOIN public.batches b ON b.batch_number = 99 AND b.course_id = '20000000-0000-4000-8000-000000000001'
    WHERE a.actor_id = '10000000-0000-4000-8000-000000000002'
      AND a.action = 'catalog_create'
      AND a.target_entity = 'batches'
  $sql$,
  $$ VALUES ('admin'::text, 'batch'::text, true, 'Create Spring cohort draft'::text) $$,
  '22. Draft audit event records derived actor_role=admin, batch scope, batch_id, and reason'
);

-- Active Admin updates batch with reason -> before/after state + batch scope
SELECT lives_ok(
  $sql$
    SELECT public.update_admin_catalog_record(
      '10000000-0000-4000-8000-000000000002', 'batches', id, updated_at,
      jsonb_build_object(
        'name', 'Open Batch Edited', 'start_date', start_date, 'end_date', end_date,
        'schedule_description', schedule_description, 'venue', 'Dhaka Updated',
        'capacity', 15, 'fee_poisha', fee_poisha, 'discount_fee_poisha', discount_fee_poisha,
        'reason', 'Adjusted venue and capacity'
      )
    ) FROM public.batches WHERE id = '30000000-0000-4000-8000-000000000001'
  $sql$,
  '23. Active operational Admin can edit batch catalog record'
);

SELECT results_eq(
  $sql$
    SELECT actor_role, audit_scope, batch_id, reason,
           before_state->>'venue', after_state->>'venue'
    FROM public.audit_events
    WHERE actor_id = '10000000-0000-4000-8000-000000000002'
      AND action = 'catalog_edit'
      AND target_id = '30000000-0000-4000-8000-000000000001'
  $sql$,
  $$ VALUES ('admin'::text, 'batch'::text, '30000000-0000-4000-8000-000000000001'::uuid, 'Adjusted venue and capacity'::text, 'Dhaka'::text, 'Dhaka Updated'::text) $$,
  '24. Batch edit audit captures verified actor_role, batch scope, reason, and before/after states'
);

-- Active Admin assigns batch mentors
SELECT is(
  (
    SELECT public.set_staff_batch_mentors(
      '10000000-0000-4000-8000-000000000002', id, updated_at,
      ARRAY['40000000-0000-4000-8000-000000000001'::uuid]
    ) FROM public.batches WHERE id = '30000000-0000-4000-8000-000000000001'
  ),
  'OK',
  '25. Active operational Admin can update batch mentor roster'
);

-- Active Admin saves mentor profile -> website-scoped audit with actor_role = 'admin'
SELECT is(
  (
    SELECT public.save_staff_mentor_profile(
      '10000000-0000-4000-8000-000000000002', 'edit', id, updated_at,
      'Fixture Mentor Edited', 'Lead Mentor', 'Fixture Org',
      'Updated synthetic mentor biography for tests.',
      '/images/mentors/gm-kamrul.png', NULL,
      'https://www.linkedin.com/in/fixture-mentor/', '["Coaching"]'::jsonb, true
    ) FROM public.mentors WHERE id = '40000000-0000-4000-8000-000000000001'
  ),
  'OK',
  '26. Active operational Admin can save Website mentor profile'
);

SELECT results_eq(
  $sql$
    SELECT actor_role, audit_scope, batch_id IS NULL,
           before_state->>'published', after_state->>'published'
    FROM public.audit_events
    WHERE actor_id = '10000000-0000-4000-8000-000000000002'
      AND action = 'staff_mentor_edit'
      AND target_id = '40000000-0000-4000-8000-000000000001'
  $sql$,
  $$ VALUES ('admin'::text, 'website'::text, true, 'false'::text, 'true'::text) $$,
  '27. Mentor profile edit audit uses website scope with NULL batch_id and before/after state'
);

-- Active Admin invokes create_staff_enrollment on open paid batch
SELECT is(
  (
    SELECT public.create_staff_enrollment(
      '10000000-0000-4000-8000-000000000002', id, updated_at, 'LNA-W2A0-0003',
      'Staff Created Learner', 'create-admin@example.invalid', '01799000005', '{}', '[]'
    )->>'ok'
    FROM public.batches WHERE id = '30000000-0000-4000-8000-000000000001'
  ),
  'true',
  '28. Active operational Admin can create staff enrollment on open batch'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.audit_events a
      ON a.target_entity = 'enrollments'
      AND a.target_id = e.id::text
      AND a.action = 'staff_created_enrollment'
    WHERE e.public_ref = 'LNA-W2A0-0003'
      AND e.status = 'pending'
      AND e.payment_method = 'bkash'
      AND e.payment_status = 'pending_verification'
      AND e.payable_poisha = 400000
      AND e.hold_expires_at > now()
      AND a.actor_id = '10000000-0000-4000-8000-000000000002'
      AND a.actor_role = 'admin'
      AND a.audit_scope = 'batch'
      AND a.batch_id = '30000000-0000-4000-8000-000000000001'
      AND a.after_state->>'status' = 'pending'
  ),
  '29. Admin-created enrollment and batch-scoped staff_created_enrollment audit reflect exact state'
);

-- Active Admin records & approves manual payment + manages enrollment + edits student/course history
SELECT is(
  (
    SELECT public.record_staff_manual_enrollment(
      '10000000-0000-4000-8000-000000000002', id, updated_at, 'LNA-W2A0-0002',
      'Operational Student', 'op-student@example.invalid', '01799000003', '{}', '[]',
      'bkash', 'ADMINBKASH001'
    )->>'ok'
    FROM public.batches WHERE id = '30000000-0000-4000-8000-000000000001'
  ),
  'true',
  '30. Active operational Admin can record manual enrollment'
);

SELECT is(
  (
    SELECT public.review_staff_manual_payment(
      '10000000-0000-4000-8000-000000000002', id, updated_at, 'approve', 400000
    )->>'ok'
    FROM public.enrollments WHERE public_ref = 'LNA-W2A0-0002'
  ),
  'true',
  '31. Active operational Admin can verify manual payment'
);

SELECT is(
  (
    SELECT public.manage_staff_enrollment(
      '10000000-0000-4000-8000-000000000002', id, updated_at,
      'archive', NULL, NULL, NULL
    ) FROM public.enrollments WHERE public_ref = 'LNA-W2A0-0002'
  ),
  'OK',
  '32. Active operational Admin can archive enrollment'
);

SELECT is(
  public.manage_staff_student(
    '10000000-0000-4000-8000-000000000002', 'create', NULL, NULL,
    'Admin Created Alumni', 'alumni-admin@example.invalid', '01799000004', 'Dhaka University',
    '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', current_date - 5
  ),
  'OK',
  '33. Active operational Admin can create student directory entry with completed batch history'
);

SELECT is(
  (
    SELECT public.manage_staff_student(
      '10000000-0000-4000-8000-000000000002', 'archive', id, updated_at,
      NULL, NULL, NULL, NULL,
      '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', NULL
    ) FROM public.students WHERE email = 'alumni-admin@example.invalid'
  ),
  'OK',
  '34. Active operational Admin can archive student even when unrelated course/batch args are supplied'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.audit_events a
      ON a.target_entity = 'students'
      AND a.target_id = s.id::text
      AND a.action = 'staff_student_archive'
    WHERE s.email = 'alumni-admin@example.invalid'
      AND s.archived_at IS NOT NULL
      AND a.actor_role = 'admin'
      AND a.audit_scope = 'global'
      AND a.batch_id IS NULL
      AND a.after_state->>'archived' = 'true'
      AND NOT (a.after_state ? 'recorded_course')
      AND NOT (a.after_state ? 'recorded_batch')
  ),
  '35. Student archive derives global scope with NULL batch_id and ignores caller batch attribution'
);

-- Active Admin publishes draft batch -> batch-scoped audit with actor_role = 'admin'
SELECT is(
  (
    SELECT public.publish_admin_catalog_draft(
      '10000000-0000-4000-8000-000000000002', 'batches', id, updated_at
    ) FROM public.batches WHERE batch_number = 99 AND course_id = '20000000-0000-4000-8000-000000000001'
  ),
  'w2a-t02-course',
  '36. Active operational Admin can publish catalog batch draft'
);

-- Active Admin records student course completion via manage_staff_course_history -> batch-scoped audit
SELECT is(
  (
    SELECT public.manage_staff_course_history(
      '10000000-0000-4000-8000-000000000002', id,
      '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002',
      NULL, current_date - 3
    ) FROM public.students WHERE id = '60000000-0000-4000-8000-000000000001'
  ),
  'OK',
  '37. Active operational Admin can add historical course completion'
);

-- Active Super Admin archives batch 99 -> actor_role = 'super_admin'
SELECT is(
  (
    SELECT public.archive_staff_catalog(
      '10000000-0000-4000-8000-000000000001', 'batches', id, updated_at, false
    ) FROM public.batches WHERE batch_number = 99 AND course_id = '20000000-0000-4000-8000-000000000001'
  ),
  'OK',
  '38. Active Super Admin can archive batch'
);

SELECT is(
  (
    SELECT actor_role FROM public.audit_events
    WHERE actor_id = '10000000-0000-4000-8000-000000000001' AND action = 'staff_archived_catalog'
    LIMIT 1
  ),
  'super_admin',
  '39. Super Admin action records actor_role=super_admin'
);

-- =============================================================================
-- 4. Admin Denial of Super Admin-Only Legacy Purge Operations (40-44)
-- =============================================================================
SELECT throws_ok(
  $sql$
    SELECT public.purge_staff_dev_admission(
      '10000000-0000-4000-8000-000000000002', id, updated_at, public_ref
    ) FROM public.enrollments WHERE id = '50000000-0000-4000-8000-000000000001'
  $sql$,
  '42501', 'STAFF_PURGE_FORBIDDEN',
  '40. Active Admin denied on purge_staff_dev_admission (Super Admin-only pending W2A-T06)'
);

SELECT throws_ok(
  $sql$
    SELECT public.purge_staff_student(
      '10000000-0000-4000-8000-000000000002', id, updated_at, email
    ) FROM public.students WHERE id = '60000000-0000-4000-8000-000000000001'
  $sql$,
  '42501', 'STAFF_PURGE_FORBIDDEN',
  '41. Active Admin denied on purge_staff_student (Super Admin-only pending W2A-T06)'
);

SELECT throws_ok(
  $sql$
    SELECT public.purge_staff_admission(
      '10000000-0000-4000-8000-000000000002', id, updated_at, public_ref
    ) FROM public.enrollments WHERE id = '50000000-0000-4000-8000-000000000001'
  $sql$,
  '42501', 'STAFF_PURGE_FORBIDDEN',
  '42. Active Admin denied on purge_staff_admission (Super Admin-only pending W2A-T06)'
);

SELECT throws_ok(
  $$ SELECT public.preview_staff_record_purge('10000000-0000-4000-8000-000000000002', 'student', '60000000-0000-4000-8000-000000000001') $$,
  '42501', 'STAFF_PURGE_FORBIDDEN',
  '43. Active Admin denied on preview_staff_record_purge (Super Admin-only pending W2A-T06)'
);

SELECT throws_ok(
  $sql$
    SELECT public.purge_staff_record(
      '10000000-0000-4000-8000-000000000002', 'student', id, updated_at, email, 'fake-token'
    ) FROM public.students WHERE id = '60000000-0000-4000-8000-000000000001'
  $sql$,
  '42501', 'STAFF_PURGE_FORBIDDEN',
  '44. Active Admin denied on purge_staff_record (Super Admin-only pending W2A-T06)'
);

-- =============================================================================
-- 5. Secret Redaction, Draft-Delete Audit Preservation, Genuine Atomicity (45-54)
-- =============================================================================
SELECT lives_ok(
  $sql$
    SELECT public.record_staff_audit_event(
      '10000000-0000-4000-8000-000000000002',
      ARRAY['admin', 'super_admin'],
      'admission_batch_moved',
      'enrollments',
      '50000000-0000-4000-8000-000000000001',
      'batch',
      '30000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000002',
      '  Learner switched cohort schedule  ',
      jsonb_build_object(
        'batch_id', '30000000-0000-4000-8000-000000000001',
        'idempotency_key', 'idem-preserve-1',
        'password', 'plain-secret',
        'accessToken', 'camel-access',
        'refreshToken', 'camel-refresh',
        'recoveryCode', 'camel-recovery',
        'nested', jsonb_build_object('access_token', 'tok-123', 'recovery-code', 'sep-rec', 'safe_note', 'keep-me')
      ),
      jsonb_build_object(
        'batch_id', '30000000-0000-4000-8000-000000000002',
        'staff_payment_recorded_by', '10000000-0000-4000-8000-000000000002',
        'public_ref', 'LNA-W2A0-0001',
        'api_key', 'k-secret',
        'appKey', 'camel-app-key',
        'appSecret', 'camel-app-secret',
        'items', jsonb_build_array(jsonb_build_object('totp_secret', 'otp-99', 'app.secret', 'dot-sec', 'status', 'moved'))
      ),
      'STAFF_FORBIDDEN'
    )
  $sql$,
  '45. record_staff_audit_event supports dual-batch moves, reason trimming, and camelCase/separator redaction'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.audit_events a
    WHERE a.action = 'admission_batch_moved'
      AND a.actor_role = 'admin'
      AND a.audit_scope = 'batch'
      AND a.batch_id = '30000000-0000-4000-8000-000000000001'
      AND a.secondary_batch_id = '30000000-0000-4000-8000-000000000002'
      AND a.reason = 'Learner switched cohort schedule'
      AND a.before_state->>'idempotency_key' = 'idem-preserve-1'
      AND NOT (a.before_state ? 'password')
      AND NOT (a.before_state ? 'accessToken')
      AND NOT (a.before_state ? 'refreshToken')
      AND NOT (a.before_state ? 'recoveryCode')
      AND NOT ((a.before_state->'nested') ? 'access_token')
      AND NOT ((a.before_state->'nested') ? 'recovery-code')
      AND (a.before_state->'nested'->>'safe_note') = 'keep-me'
      AND a.after_state->>'staff_payment_recorded_by' = '10000000-0000-4000-8000-000000000002'
      AND a.after_state->>'public_ref' = 'LNA-W2A0-0001'
      AND NOT (a.after_state ? 'api_key')
      AND NOT (a.after_state ? 'appKey')
      AND NOT (a.after_state ? 'appSecret')
      AND NOT ((a.after_state->'items'->0) ? 'totp_secret')
      AND NOT ((a.after_state->'items'->0) ? 'app.secret')
      AND (a.after_state->'items'->0->>'status') = 'moved'
  ),
  '46. Sensitive camelCase, snake_case, and separator secret keys stripped while legitimate operational fields persist'
);

SELECT throws_ok(
  $$ INSERT INTO public.audit_events (actor_role, action, target_entity, audit_scope) VALUES ('system', 'bad_scope_row', 'batches', 'batch') $$,
  '23514', NULL,
  '47. Batch-scoped audit row without batch_id rejected by CHECK constraint'
);

SELECT throws_ok(
  $$ SELECT public.record_staff_audit_event('10000000-0000-4000-8000-000000000002', ARRAY['admin'], 'bad_batch_ref', 'batches', '00000000-0000-4000-8000-000000000099', 'batch', '00000000-0000-4000-8000-000000000099', NULL, NULL, NULL, NULL, 'STAFF_FORBIDDEN') $$,
  '23503', 'AUDIT_EVENT_BATCH_NOT_FOUND',
  '48. Write-time audit trigger rejects batch-scoped event targeting nonexistent batch_id'
);

SELECT lives_ok(
  $sql$
    SELECT public.create_admin_catalog_draft(
      '10000000-0000-4000-8000-000000000002',
      'batches',
      jsonb_build_object(
        'course_id', '20000000-0000-4000-8000-000000000001',
        'batch_number', 101,
        'name', 'Deletable Unused Draft',
        'start_date', (current_date + 60)::text,
        'end_date', (current_date + 61)::text,
        'schedule_description', 'Draft schedule',
        'venue', 'Dhaka',
        'capacity', 20,
        'fee_poisha', 300000,
        'discount_fee_poisha', NULL,
        'reason', 'Temporary draft to test D08 deletion compatibility'
      )
    )
  $sql$,
  '49. Active Admin creates dependency-free unused draft batch 101 with batch-scoped audit event'
);

SELECT set_config(
  'test.draft101_id',
  (SELECT id::text FROM public.batches WHERE course_id = '20000000-0000-4000-8000-000000000001' AND batch_number = 101),
  true
);

RESET ROLE;
SELECT lives_ok(
  $$ DELETE FROM public.batches WHERE id = current_setting('test.draft101_id')::uuid $$,
  '50. Future D08/W1-T03 unused draft batch deletion is not blocked by audit_events batch references'
);
SET LOCAL ROLE service_role;

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.batches WHERE id = current_setting('test.draft101_id')::uuid
  )
  AND EXISTS (
    SELECT 1 FROM public.audit_events
    WHERE action = 'catalog_create'
      AND target_entity = 'batches'
      AND target_id = current_setting('test.draft101_id')
      AND audit_scope = 'batch'
      AND batch_id = current_setting('test.draft101_id')::uuid
      AND reason = 'Temporary draft to test D08 deletion compatibility'
  ),
  '51. Deleted unused draft batch audit row retains historical batch_id and audit payload'
);

-- Pre-audit RPC failure leaves zero audit trace
SELECT throws_ok(
  $sql$
    SELECT public.update_admin_catalog_record(
      '10000000-0000-4000-8000-000000000002', 'batches', id, updated_at,
      jsonb_build_object(
        'name', 'Rollback Batch', 'start_date', start_date, 'end_date', end_date,
        'schedule_description', schedule_description, 'venue', venue,
        'capacity', capacity, 'fee_poisha', 9007199254740992, 'discount_fee_poisha', NULL,
        'reason', 'should_rollback_atomically'
      )
    ) FROM public.batches WHERE id = '30000000-0000-4000-8000-000000000001'
  $sql$,
  'P0001', 'CATALOG_EDIT_FEE',
  '52. Failed mutation aborts cleanly before writing audit'
);

-- Genuine atomicity test: valid catalog UPDATE followed by audit CHECK violation (reason > 500 chars)
SELECT set_config('test.pre_atomic_audit_count', (SELECT count(*)::text FROM public.audit_events), true);

SELECT throws_ok(
  $sql$
    SELECT public.update_admin_catalog_record(
      '10000000-0000-4000-8000-000000000002', 'batches', id, updated_at,
      jsonb_build_object(
        'name', 'Post-Failure Name Should Rollback', 'start_date', start_date, 'end_date', end_date,
        'schedule_description', schedule_description, 'venue', 'Post-Failure Venue Should Rollback',
        'capacity', capacity, 'fee_poisha', fee_poisha, 'discount_fee_poisha', discount_fee_poisha,
        'reason', repeat('R', 501)
      )
    ) FROM public.batches WHERE id = '30000000-0000-4000-8000-000000000001'
  $sql$,
  '23514', NULL,
  '53. Valid catalog mutation failing post-mutation audit constraint aborts transaction step'
);

SELECT ok(
  (SELECT count(*) FROM public.audit_events) = current_setting('test.pre_atomic_audit_count')::bigint
  AND EXISTS (
    SELECT 1 FROM public.batches
    WHERE id = '30000000-0000-4000-8000-000000000001'
      AND name = 'Open Batch Edited'
      AND venue = 'Dhaka Updated'
  )
  AND EXISTS (
    SELECT 1 FROM public.audit_events
    WHERE action = 'historical_seed_event'
      AND created_at = '2026-11-15T10:00:00Z'::timestamptz
      AND audit_scope = 'global'
      AND after_state->>'preserved' = 'true'
  ),
  '54. Post-mutation audit failure rolls back batch edit cleanly, audit count stays unchanged, and seed history persists'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
