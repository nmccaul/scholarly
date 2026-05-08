-- ─────────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE assignment_type AS ENUM ('oral_assessment');

CREATE TYPE assignment_status AS ENUM ('draft', 'published', 'archived');

CREATE TYPE submission_status AS ENUM (
  'in_progress',
  'submitted',
  'grading',
  'graded',
  'error'
);

CREATE TYPE grade_sync_status AS ENUM ('pending', 'success', 'failed');

-- ─────────────────────────────────────────────────────────────────────────────
-- LTI Infrastructure
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE lti_registrations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     text NOT NULL UNIQUE,
  deployment_id text NOT NULL,
  platform_iss  text NOT NULL,
  platform_name text,
  oidc_auth_url text NOT NULL,
  jwks_url      text NOT NULL,
  token_url     text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform_iss, client_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Users & Courses
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES lti_registrations(id),
  lti_sub         text NOT NULL,
  email           text,
  name            text,
  given_name      text,
  family_name     text,
  picture_url     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (registration_id, lti_sub)
);

CREATE TABLE courses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id  uuid NOT NULL REFERENCES lti_registrations(id),
  lti_context_id   text NOT NULL,
  title            text,
  label            text,
  canvas_course_id text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (registration_id, lti_context_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Assignments
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE assignments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id        uuid NOT NULL REFERENCES courses(id),
  created_by       uuid NOT NULL REFERENCES users(id),
  resource_link_id text,
  lti_lineitem_url text,
  title            text NOT NULL,
  type             assignment_type NOT NULL,
  points_possible  numeric(6,2) NOT NULL,
  status           assignment_status NOT NULL DEFAULT 'published',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE oral_assessment_configs (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id               uuid NOT NULL UNIQUE REFERENCES assignments(id) ON DELETE CASCADE,
  prompt                      text NOT NULL,
  preparation_time_seconds    int NOT NULL DEFAULT 60,
  max_response_time_seconds   int NOT NULL DEFAULT 180,
  follow_up_question_count    int NOT NULL DEFAULT 2,
  camera_required             boolean NOT NULL DEFAULT true,
  ai_grading_enabled          boolean NOT NULL DEFAULT true,
  rubric                      jsonb NOT NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Submissions
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id),
  student_id    uuid NOT NULL REFERENCES users(id),
  status        submission_status NOT NULL DEFAULT 'in_progress',
  started_at    timestamptz NOT NULL DEFAULT now(),
  submitted_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);

CREATE TABLE oral_assessment_submissions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id        uuid NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
  recording_url        text,
  transcript           text,
  follow_up_exchanges  jsonb,
  ai_grade             numeric(6,2),
  ai_grade_rationale   jsonb,
  final_grade          numeric(6,2),
  teacher_feedback     text,
  graded_by            uuid REFERENCES users(id),
  graded_at            timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Grade Sync Log
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE grade_sync_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id),
  score         numeric(6,2) NOT NULL,
  status        grade_sync_status NOT NULL DEFAULT 'pending',
  canvas_response jsonb,
  attempt       int NOT NULL DEFAULT 1,
  synced_at     timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Product Feedback
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE assignment_type_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id),
  assignment_type text NOT NULL,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX idx_assignments_course_id     ON assignments(course_id);
CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX idx_submissions_student_id    ON submissions(student_id);
CREATE INDEX idx_grade_sync_submission_id  ON grade_sync_log(submission_id);
CREATE INDEX idx_users_registration_sub    ON users(registration_id, lti_sub);
CREATE INDEX idx_courses_registration_ctx  ON courses(registration_id, lti_context_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE lti_registrations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE oral_assessment_configs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions                ENABLE ROW LEVEL SECURITY;
ALTER TABLE oral_assessment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_sync_log             ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_type_requests   ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS — all application access uses service role key
-- with explicit registration scoping in the application layer.
-- These policies allow service role full access while blocking anon/authenticated.

CREATE POLICY "service_role_only" ON lti_registrations
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_only" ON users
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_only" ON courses
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_only" ON assignments
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_only" ON oral_assessment_configs
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_only" ON submissions
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_only" ON oral_assessment_submissions
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_only" ON grade_sync_log
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_only" ON assignment_type_requests
  USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- Dev seed data (for LTI_DEV_MODE=true)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO lti_registrations (id, client_id, deployment_id, platform_iss, platform_name, oidc_auth_url, jwks_url, token_url)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'dev-client-id',
  'dev-deployment-id',
  'https://canvas.instructure.com',
  'Canvas (Dev)',
  'https://sso.canvaslms.com/api/lti/authorize_redirect',
  'https://sso.canvaslms.com/api/lti/security/jwks',
  'https://sso.canvaslms.com/login/oauth2/token'
) ON CONFLICT DO NOTHING;

INSERT INTO users (id, registration_id, lti_sub, email, name, given_name, family_name)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'dev-sub-001',
  'teacher@dev.edu',
  'Dev Teacher',
  'Dev',
  'Teacher'
) ON CONFLICT DO NOTHING;

INSERT INTO courses (id, registration_id, lti_context_id, title, label)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'dev-context-001',
  'Introduction to Computer Science',
  'CS101'
) ON CONFLICT DO NOTHING;
