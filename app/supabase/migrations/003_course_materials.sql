-- Add selected_material_ids to oral_assessment_configs
ALTER TABLE oral_assessment_configs
  ADD COLUMN selected_material_ids UUID[] NOT NULL DEFAULT '{}';

-- Course materials: course-library (assignment_id IS NULL) or assignment-specific (assignment_id SET)
CREATE TABLE course_materials (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID        NOT NULL REFERENCES courses(id)     ON DELETE CASCADE,
  assignment_id UUID                 REFERENCES assignments(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL CHECK (char_length(title)   BETWEEN 1 AND 200),
  content       TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 50000),
  created_by    UUID        NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_course_materials_course_id     ON course_materials(course_id);
CREATE INDEX idx_course_materials_assignment_id ON course_materials(assignment_id) WHERE assignment_id IS NOT NULL;

CREATE TRIGGER set_updated_at_course_materials
  BEFORE UPDATE ON course_materials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_materials FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON course_materials
  USING ((select auth.role()) = 'service_role');
