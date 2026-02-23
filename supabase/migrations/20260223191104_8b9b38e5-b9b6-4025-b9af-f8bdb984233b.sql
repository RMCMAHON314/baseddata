
-- Vacuum run log
CREATE TABLE IF NOT EXISTS vacuum_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running',
  trigger TEXT DEFAULT 'manual',
  results JSONB DEFAULT '{}',
  errors JSONB DEFAULT '[]',
  total_loaded INT DEFAULT 0,
  total_errors INT DEFAULT 0,
  duration_seconds NUMERIC
);
ALTER TABLE vacuum_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read vacuum" ON vacuum_runs FOR SELECT USING (true);
CREATE POLICY "Service write vacuum" ON vacuum_runs FOR ALL USING (true) WITH CHECK (true);

-- Subawards table
CREATE TABLE IF NOT EXISTS subawards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prime_award_id TEXT,
  subaward_number TEXT,
  subaward_amount DECIMAL(18,2),
  subaward_action_date DATE,
  subaward_description TEXT,
  sub_awardee_name TEXT,
  sub_awardee_city TEXT,
  sub_awardee_state TEXT,
  sub_awardee_zip TEXT,
  sub_awardee_country TEXT,
  prime_recipient_name TEXT,
  prime_recipient_uei TEXT,
  awarding_agency TEXT,
  awarding_sub_agency TEXT,
  naics_code TEXT,
  source TEXT DEFAULT 'usaspending_sub',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prime_award_id, subaward_number)
);
CREATE INDEX IF NOT EXISTS idx_sub_prime ON subawards(prime_recipient_name);
CREATE INDEX IF NOT EXISTS idx_sub_sub ON subawards(sub_awardee_name);
CREATE INDEX IF NOT EXISTS idx_sub_agency ON subawards(awarding_agency);
CREATE INDEX IF NOT EXISTS idx_sub_state ON subawards(sub_awardee_state);
ALTER TABLE subawards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sub" ON subawards FOR SELECT USING (true);
CREATE POLICY "Service write sub" ON subawards FOR ALL USING (true) WITH CHECK (true);

-- Ensure contracts has unique constraint for upsert (safe idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_award_id_key') THEN
    DELETE FROM contracts a USING contracts b WHERE a.id < b.id AND a.award_id = b.award_id AND a.award_id IS NOT NULL;
    ALTER TABLE contracts ADD CONSTRAINT contracts_award_id_key UNIQUE (award_id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;
