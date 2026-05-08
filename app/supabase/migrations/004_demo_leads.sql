CREATE TABLE demo_leads (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  email       TEXT        NOT NULL CHECK (char_length(email) BETWEEN 1 AND 200),
  institution TEXT        NOT NULL CHECK (char_length(institution) BETWEEN 1 AND 200),
  interests   TEXT        CHECK (interests IS NULL OR char_length(interests) <= 1000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE demo_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_leads FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON demo_leads
  USING ((select auth.role()) = 'service_role');
