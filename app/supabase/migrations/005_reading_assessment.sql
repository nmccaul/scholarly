-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
-- Supabase runs this statement outside a transaction automatically.
ALTER TYPE assignment_type ADD VALUE IF NOT EXISTS 'reading_assessment';

-- ─── Assignment config ────────────────────────────────────────────────────────

CREATE TABLE reading_assessment_configs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id       uuid NOT NULL UNIQUE REFERENCES assignments(id) ON DELETE CASCADE,
  -- [{title: string, content: string}] — up to 20 sections, ~10k chars each
  sections            jsonb NOT NULL,
  checkpoint_type     text NOT NULL CHECK (checkpoint_type IN ('text', 'voice')),
  max_follow_ups      int NOT NULL DEFAULT 3, -- text mode only; voice mode is AI-controlled
  ai_grading_enabled  boolean NOT NULL DEFAULT true,
  rubric              jsonb NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ─── Per-student submission ───────────────────────────────────────────────────

CREATE TABLE reading_assessment_submissions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id         uuid NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
  current_section_index int NOT NULL DEFAULT 0,
  ai_grade              numeric(6,2),
  ai_grade_rationale    jsonb,
  final_grade           numeric(6,2),
  teacher_feedback      text,
  graded_by             uuid REFERENCES users(id),
  graded_at             timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ─── Per-section checkpoint ───────────────────────────────────────────────────

CREATE TABLE reading_checkpoints (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  section_index   int NOT NULL,
  -- Unified [{role: 'student'|'ai', text: string}] for both text and voice modes
  conversation    jsonb NOT NULL DEFAULT '[]',
  status          text NOT NULL DEFAULT 'locked'
                  CHECK (status IN ('locked', 'in_progress', 'passed', 'force_unlocked')),
  -- Mission Control wiring — stored at write time, queried by dashboard later
  started_at      timestamptz,            -- set when student clicks "I've finished reading"
  passed_at       timestamptz,
  follow_up_count int NOT NULL DEFAULT 0, -- denormalized for fast class-level aggregation
  ai_feedback     text,                   -- AI's final feedback for this checkpoint
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, section_index)
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX idx_reading_assessment_configs_assignment_id
  ON reading_assessment_configs(assignment_id);

CREATE INDEX idx_reading_assessment_submissions_submission_id
  ON reading_assessment_submissions(submission_id);

CREATE INDEX idx_reading_checkpoints_submission_id
  ON reading_checkpoints(submission_id);

CREATE INDEX idx_reading_checkpoints_submission_section
  ON reading_checkpoints(submission_id, section_index);

-- ─── Triggers (reuse set_updated_at from migration 002) ───────────────────────

CREATE TRIGGER set_updated_at_reading_assessment_configs
  BEFORE UPDATE ON reading_assessment_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_reading_assessment_submissions
  BEFORE UPDATE ON reading_assessment_submissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_reading_checkpoints
  BEFORE UPDATE ON reading_checkpoints
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── RLS (service role only — same pattern as all other tables) ───────────────

ALTER TABLE reading_assessment_configs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_assessment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_checkpoints            ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON reading_assessment_configs
  USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY "service_role_only" ON reading_assessment_submissions
  USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY "service_role_only" ON reading_checkpoints
  USING ((SELECT auth.role()) = 'service_role');

ALTER TABLE reading_assessment_configs     FORCE ROW LEVEL SECURITY;
ALTER TABLE reading_assessment_submissions FORCE ROW LEVEL SECURITY;
ALTER TABLE reading_checkpoints            FORCE ROW LEVEL SECURITY;
