
-- Add contract_category to contracts
DO $$ BEGIN
  ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_category TEXT DEFAULT 'contract';
EXCEPTION WHEN others THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_contracts_category ON contracts(contract_category);

-- Add columns to grants for vacuum upsert compatibility
DO $$ BEGIN
  ALTER TABLE grants ADD COLUMN IF NOT EXISTS award_id TEXT;
  ALTER TABLE grants ADD COLUMN IF NOT EXISTS awarding_sub_agency TEXT;
  ALTER TABLE grants ADD COLUMN IF NOT EXISTS pop_state TEXT;
  ALTER TABLE grants ADD COLUMN IF NOT EXISTS pop_city TEXT;
  ALTER TABLE grants ADD COLUMN IF NOT EXISTS grant_category TEXT DEFAULT 'grant';
  ALTER TABLE grants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
EXCEPTION WHEN others THEN NULL;
END $$;

-- Unique constraint on grants.award_id for upsert
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grants_award_id_key') THEN
    DELETE FROM grants a USING grants b WHERE a.id < b.id AND a.award_id = b.award_id AND a.award_id IS NOT NULL;
    ALTER TABLE grants ADD CONSTRAINT grants_award_id_key UNIQUE (award_id);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;
