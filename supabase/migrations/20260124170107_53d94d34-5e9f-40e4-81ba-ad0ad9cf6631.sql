-- ============================================
-- 🌊 DATA OCEAN FOUNDATION - PART 1: TABLES 🌊
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Track entity aliases
CREATE TABLE IF NOT EXISTS entity_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES core_entities(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  alias_type TEXT DEFAULT 'alternate_name',
  confidence DECIMAL(3,2) DEFAULT 1.0,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track entity identifiers (UEI, DUNS, CAGE, EIN)
CREATE TABLE IF NOT EXISTS entity_identifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES core_entities(id) ON DELETE CASCADE,
  identifier_type TEXT NOT NULL,
  identifier_value TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identifier_type, identifier_value)
);

-- Track merge candidates for review
CREATE TABLE IF NOT EXISTS entity_merge_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_a_id UUID REFERENCES core_entities(id),
  entity_b_id UUID REFERENCES core_entities(id),
  match_score DECIMAL(5,4),
  match_reasons JSONB,
  status TEXT DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track completed merges
CREATE TABLE IF NOT EXISTS entity_merges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  winner_id UUID,
  loser_id UUID,
  loser_name TEXT,
  merge_reason TEXT,
  merged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add resolution columns to entities
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'core_entities' AND column_name = 'canonical_id') THEN
    ALTER TABLE core_entities ADD COLUMN canonical_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'core_entities' AND column_name = 'is_canonical') THEN
    ALTER TABLE core_entities ADD COLUMN is_canonical BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'core_entities' AND column_name = 'alternate_names') THEN
    ALTER TABLE core_entities ADD COLUMN alternate_names TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'core_entities' AND column_name = 'merge_count') THEN
    ALTER TABLE core_entities ADD COLUMN merge_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_aliases_entity ON entity_aliases(entity_id);
CREATE INDEX IF NOT EXISTS idx_aliases_alias ON entity_aliases USING gin(alias gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_identifiers_value ON entity_identifiers(identifier_value);
CREATE INDEX IF NOT EXISTS idx_identifiers_type ON entity_identifiers(identifier_type, identifier_value);
CREATE INDEX IF NOT EXISTS idx_merge_candidates_status ON entity_merge_candidates(status);
CREATE INDEX IF NOT EXISTS idx_entities_canonical ON core_entities(is_canonical) WHERE is_canonical = true;
CREATE INDEX IF NOT EXISTS idx_entities_name_trgm ON core_entities USING gin(canonical_name gin_trgm_ops);

-- Ocean health monitoring
CREATE TABLE IF NOT EXISTS ocean_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at TIMESTAMPTZ DEFAULT NOW(),
  total_entities INTEGER,
  total_contracts INTEGER,
  total_grants INTEGER,
  total_opportunities INTEGER,
  total_facts INTEGER,
  total_relationships INTEGER,
  total_insights INTEGER,
  total_contract_value DECIMAL(18,2),
  entities_last_hour INTEGER,
  contracts_last_hour INTEGER,
  records_last_hour INTEGER,
  avg_entity_quality DECIMAL(5,2),
  entities_with_uei INTEGER,
  entities_with_cage INTEGER,
  active_sources INTEGER,
  healthy_sources INTEGER,
  degraded_sources INTEGER,
  failed_sources INTEGER,
  pipeline_health_score INTEGER,
  freshness_score INTEGER,
  coverage_score INTEGER,
  overall_health_score INTEGER
);

CREATE INDEX IF NOT EXISTS idx_health_time ON ocean_health_snapshots(snapshot_at DESC);

-- Derivation tracking
CREATE TABLE IF NOT EXISTS derivation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  status TEXT DEFAULT 'running',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  error TEXT,
  details JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS relationship_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_directional BOOLEAN DEFAULT true,
  default_strength DECIMAL(3,2) DEFAULT 0.5
);

INSERT INTO relationship_types (id, name, description, is_directional) VALUES
('competes_with', 'Competes With', 'Same NAICS, same agencies', false),
('teams_with', 'Teams With', 'Joint venture or teaming', false),
('co_located', 'Co-located', 'Same city/state', false),
('same_industry', 'Same Industry', 'Same NAICS codes', false),
('shares_customer', 'Shares Customer', 'Same agency customer', false),
('subsidiary_of', 'Subsidiary Of', 'Corporate ownership', true),
('supplies_to', 'Supplies To', 'Supply chain', true)
ON CONFLICT (id) DO NOTHING;

-- Insights table
CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  entity_ids UUID[],
  evidence JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insights_type ON insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_insights_created ON insights(created_at DESC);

-- Grant permissions on tables
GRANT ALL ON entity_aliases TO anon, authenticated, service_role;
GRANT ALL ON entity_identifiers TO anon, authenticated, service_role;
GRANT ALL ON entity_merge_candidates TO anon, authenticated, service_role;
GRANT ALL ON entity_merges TO anon, authenticated, service_role;
GRANT ALL ON ocean_health_snapshots TO anon, authenticated, service_role;
GRANT ALL ON derivation_runs TO anon, authenticated, service_role;
GRANT ALL ON relationship_types TO anon, authenticated, service_role;
GRANT ALL ON insights TO anon, authenticated, service_role;