-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Missing FK indexes
-- Postgres does not auto-index FK columns. These are needed for fast JOINs
-- and efficient ON DELETE CASCADE operations.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX idx_users_registration_id
  ON users(registration_id);

CREATE INDEX idx_courses_registration_id
  ON courses(registration_id);

CREATE INDEX idx_assignments_created_by
  ON assignments(created_by);

-- oral_assessment_configs.assignment_id and oral_assessment_submissions.submission_id
-- already have implicit indexes from their UNIQUE constraints — no action needed.

CREATE INDEX idx_oral_assessment_submissions_graded_by
  ON oral_assessment_submissions(graded_by)
  WHERE graded_by IS NOT NULL;

CREATE INDEX idx_assignment_type_requests_user_id
  ON assignment_type_requests(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS policy performance — wrap auth.role() in (select ...)
-- Without the subquery wrapper, auth.role() is called once per row.
-- With it, the result is evaluated once and cached for the entire query.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY "service_role_only" ON lti_registrations;
DROP POLICY "service_role_only" ON users;
DROP POLICY "service_role_only" ON courses;
DROP POLICY "service_role_only" ON assignments;
DROP POLICY "service_role_only" ON oral_assessment_configs;
DROP POLICY "service_role_only" ON submissions;
DROP POLICY "service_role_only" ON oral_assessment_submissions;
DROP POLICY "service_role_only" ON grade_sync_log;
DROP POLICY "service_role_only" ON assignment_type_requests;

CREATE POLICY "service_role_only" ON lti_registrations
  USING ((select auth.role()) = 'service_role');

CREATE POLICY "service_role_only" ON users
  USING ((select auth.role()) = 'service_role');

CREATE POLICY "service_role_only" ON courses
  USING ((select auth.role()) = 'service_role');

CREATE POLICY "service_role_only" ON assignments
  USING ((select auth.role()) = 'service_role');

CREATE POLICY "service_role_only" ON oral_assessment_configs
  USING ((select auth.role()) = 'service_role');

CREATE POLICY "service_role_only" ON submissions
  USING ((select auth.role()) = 'service_role');

CREATE POLICY "service_role_only" ON oral_assessment_submissions
  USING ((select auth.role()) = 'service_role');

CREATE POLICY "service_role_only" ON grade_sync_log
  USING ((select auth.role()) = 'service_role');

CREATE POLICY "service_role_only" ON assignment_type_requests
  USING ((select auth.role()) = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. FORCE ROW LEVEL SECURITY
-- Prevents table owner (postgres role) from bypassing RLS.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE lti_registrations           FORCE ROW LEVEL SECURITY;
ALTER TABLE users                       FORCE ROW LEVEL SECURITY;
ALTER TABLE courses                     FORCE ROW LEVEL SECURITY;
ALTER TABLE assignments                 FORCE ROW LEVEL SECURITY;
ALTER TABLE oral_assessment_configs     FORCE ROW LEVEL SECURITY;
ALTER TABLE submissions                 FORCE ROW LEVEL SECURITY;
ALTER TABLE oral_assessment_submissions FORCE ROW LEVEL SECURITY;
ALTER TABLE grade_sync_log              FORCE ROW LEVEL SECURITY;
ALTER TABLE assignment_type_requests    FORCE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Auto-update updated_at via trigger
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_courses
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_assignments
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_oral_assessment_configs
  BEFORE UPDATE ON oral_assessment_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_oral_assessment_submissions
  BEFORE UPDATE ON oral_assessment_submissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
