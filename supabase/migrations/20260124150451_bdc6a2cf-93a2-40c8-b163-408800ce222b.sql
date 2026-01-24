-- ============================================
-- BASED DATA MEGA SCHEMA v2.0
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- CONTRACTS TABLE (Denormalized for Speed)
-- ============================================
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Award identifiers
  award_id TEXT UNIQUE,
  piid TEXT,
  modification_number TEXT,
  parent_award_id TEXT,
  -- Recipient
  recipient_entity_id UUID REFERENCES core_entities(id),
  recipient_name TEXT NOT NULL,
  recipient_uei TEXT,
  recipient_duns TEXT,
  -- Awarding agency
  awarding_agency TEXT,
  awarding_sub_agency TEXT,
  funding_agency TEXT,
  -- Financial
  award_amount DECIMAL(18, 2),
  total_obligation DECIMAL(18, 2),
  base_and_all_options DECIMAL(18, 2),
  -- Description
  description TEXT,
  naics_code TEXT,
  naics_description TEXT,
  psc_code TEXT,
  psc_description TEXT,
  -- Dates
  award_date DATE,
  start_date DATE,
  end_date DATE,
  last_modified DATE,
  -- Location
  pop_city TEXT,
  pop_state TEXT,
  pop_zip TEXT,
  pop_country TEXT DEFAULT 'USA',
  pop_congressional_district TEXT,
  -- Classification
  contract_type TEXT,
  award_type TEXT,
  set_aside_type TEXT,
  competition_type TEXT,
  -- Flags
  is_small_business BOOLEAN DEFAULT FALSE,
  is_women_owned BOOLEAN DEFAULT FALSE,
  is_veteran_owned BOOLEAN DEFAULT FALSE,
  is_minority_owned BOOLEAN DEFAULT FALSE,
  -- Source
  source TEXT DEFAULT 'usaspending',
  source_url TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contracts indexes
CREATE INDEX IF NOT EXISTS idx_contracts_recipient ON contracts(recipient_entity_id);
CREATE INDEX IF NOT EXISTS idx_contracts_recipient_name ON contracts USING gin(recipient_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contracts_amount ON contracts(award_amount DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_contracts_agency ON contracts(awarding_agency);
CREATE INDEX IF NOT EXISTS idx_contracts_state ON contracts(pop_state);
CREATE INDEX IF NOT EXISTS idx_contracts_naics ON contracts(naics_code);
CREATE INDEX IF NOT EXISTS idx_contracts_dates ON contracts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_set_aside ON contracts(set_aside_type) WHERE set_aside_type IS NOT NULL;

-- ============================================
-- GRANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id TEXT UNIQUE,
  fain TEXT,
  recipient_entity_id UUID REFERENCES core_entities(id),
  recipient_name TEXT NOT NULL,
  recipient_uei TEXT,
  awarding_agency TEXT,
  funding_agency TEXT,
  award_amount DECIMAL(18, 2),
  total_funding DECIMAL(18, 2),
  project_title TEXT,
  description TEXT,
  cfda_number TEXT,
  cfda_title TEXT,
  award_date DATE,
  start_date DATE,
  end_date DATE,
  recipient_city TEXT,
  recipient_state TEXT,
  recipient_zip TEXT,
  grant_type TEXT,
  assistance_type TEXT,
  source TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grants_recipient ON grants(recipient_entity_id);
CREATE INDEX IF NOT EXISTS idx_grants_amount ON grants(award_amount DESC);
CREATE INDEX IF NOT EXISTS idx_grants_agency ON grants(awarding_agency);
CREATE INDEX IF NOT EXISTS idx_grants_state ON grants(recipient_state);

-- ============================================
-- OPPORTUNITIES TABLE (Active Solicitations)
-- ============================================
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id TEXT UNIQUE,
  solicitation_number TEXT,
  title TEXT NOT NULL,
  description TEXT,
  notice_type TEXT,
  set_aside TEXT,
  naics_code TEXT,
  psc_code TEXT,
  department TEXT,
  sub_tier TEXT,
  office TEXT,
  posted_date DATE,
  response_deadline TIMESTAMPTZ,
  archive_date DATE,
  pop_state TEXT,
  pop_city TEXT,
  pop_zip TEXT,
  ui_link TEXT,
  resource_links JSONB,
  point_of_contact JSONB,
  award_ceiling DECIMAL(18, 2),
  award_floor DECIMAL(18, 2),
  status TEXT DEFAULT 'active',
  is_active BOOLEAN DEFAULT TRUE,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON opportunities(response_deadline) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_opportunities_naics ON opportunities(naics_code);
CREATE INDEX IF NOT EXISTS idx_opportunities_state ON opportunities(pop_state);

-- ============================================
-- ENHANCE CORE_ENTITIES
-- ============================================
ALTER TABLE core_entities ADD COLUMN IF NOT EXISTS uei TEXT;
ALTER TABLE core_entities ADD COLUMN IF NOT EXISTS duns TEXT;
ALTER TABLE core_entities ADD COLUMN IF NOT EXISTS cage_code TEXT;
ALTER TABLE core_entities ADD COLUMN IF NOT EXISTS ein TEXT;
ALTER TABLE core_entities ADD COLUMN IF NOT EXISTS naics_codes TEXT[];
ALTER TABLE core_entities ADD COLUMN IF NOT EXISTS psc_codes TEXT[];
ALTER TABLE core_entities ADD COLUMN IF NOT EXISTS business_types TEXT[];
ALTER TABLE core_entities ADD COLUMN IF NOT EXISTS total_contract_value DECIMAL(18, 2) DEFAULT 0;
ALTER TABLE core_entities ADD COLUMN IF NOT EXISTS total_grant_value DECIMAL(18, 2) DEFAULT 0;
ALTER TABLE core_entities ADD COLUMN IF NOT EXISTS contract_count INTEGER DEFAULT 0;
ALTER TABLE core_entities ADD COLUMN IF NOT EXISTS grant_count INTEGER DEFAULT 0;
ALTER TABLE core_entities ADD COLUMN IF NOT EXISTS annual_revenue DECIMAL(18, 2);
ALTER TABLE core_entities ADD COLUMN IF NOT EXISTS employee_count INTEGER;
ALTER TABLE core_entities ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE core_entities ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE core_entities ADD COLUMN IF NOT EXISTS description TEXT;

-- Create unique index on UEI
CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_uei ON core_entities(uei) WHERE uei IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entities_contract_value ON core_entities(total_contract_value DESC);
CREATE INDEX IF NOT EXISTS idx_entities_name_trgm ON core_entities USING gin(canonical_name gin_trgm_ops);

-- ============================================
-- ANALYTICS TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_daily (
  date DATE PRIMARY KEY,
  total_entities INTEGER,
  new_entities INTEGER,
  entities_by_type JSONB,
  entities_by_state JSONB,
  total_facts INTEGER,
  new_facts INTEGER,
  total_contracts INTEGER,
  new_contracts INTEGER,
  total_contract_value DECIMAL(18, 2),
  new_contract_value DECIMAL(18, 2),
  contracts_by_agency JSONB,
  contracts_by_state JSONB,
  total_grants INTEGER,
  new_grants INTEGER,
  total_grant_value DECIMAL(18, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SEARCH LOG for analytics
-- ============================================
CREATE TABLE IF NOT EXISTS search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  query TEXT,
  filters JSONB,
  result_count INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MATERIALIZED VIEWS
-- ============================================

-- Top contractors by value
DROP MATERIALIZED VIEW IF EXISTS mv_top_contractors;
CREATE MATERIALIZED VIEW mv_top_contractors AS
SELECT 
  e.id,
  e.canonical_name,
  e.entity_type,
  e.state,
  e.city,
  e.opportunity_score,
  COALESCE(e.total_contract_value, 0) as total_value,
  COALESCE(e.contract_count, 0) as contract_count,
  CASE WHEN e.contract_count > 0 
    THEN e.total_contract_value / e.contract_count 
    ELSE 0 
  END as avg_contract_value
FROM core_entities e
WHERE COALESCE(e.total_contract_value, 0) > 0
ORDER BY e.total_contract_value DESC NULLS LAST
LIMIT 10000;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_top_contractors ON mv_top_contractors(id);

-- Agency spending summary
DROP MATERIALIZED VIEW IF EXISTS mv_agency_spending;
CREATE MATERIALIZED VIEW mv_agency_spending AS
SELECT 
  awarding_agency,
  COUNT(*) as contract_count,
  SUM(award_amount) as total_value,
  AVG(award_amount) as avg_value,
  COUNT(DISTINCT recipient_entity_id) as unique_vendors,
  array_agg(DISTINCT pop_state) FILTER (WHERE pop_state IS NOT NULL) as states
FROM contracts
WHERE awarding_agency IS NOT NULL
GROUP BY awarding_agency
ORDER BY SUM(award_amount) DESC NULLS LAST;

-- State spending summary
DROP MATERIALIZED VIEW IF EXISTS mv_state_spending;
CREATE MATERIALIZED VIEW mv_state_spending AS
SELECT 
  pop_state as state,
  COUNT(*) as contract_count,
  SUM(award_amount) as total_value,
  AVG(award_amount) as avg_value,
  COUNT(DISTINCT recipient_entity_id) as unique_vendors,
  COUNT(DISTINCT awarding_agency) as agencies
FROM contracts
WHERE pop_state IS NOT NULL
GROUP BY pop_state
ORDER BY SUM(award_amount) DESC NULLS LAST;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_contractors;
  REFRESH MATERIALIZED VIEW mv_agency_spending;
  REFRESH MATERIALIZED VIEW mv_state_spending;
END;
$$ LANGUAGE plpgsql;

-- Update entity stats from contracts
CREATE OR REPLACE FUNCTION sync_entity_contract_stats(p_entity_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE core_entities
  SET 
    total_contract_value = COALESCE((
      SELECT SUM(award_amount)
      FROM contracts
      WHERE recipient_entity_id = p_entity_id
    ), 0),
    contract_count = COALESCE((
      SELECT COUNT(*)
      FROM contracts
      WHERE recipient_entity_id = p_entity_id
    ), 0),
    updated_at = NOW()
  WHERE id = p_entity_id;
END;
$$ LANGUAGE plpgsql;

-- Mega search function
CREATE OR REPLACE FUNCTION mega_search(
  p_query TEXT,
  p_entity_types TEXT[] DEFAULT NULL,
  p_states TEXT[] DEFAULT NULL,
  p_min_amount DECIMAL DEFAULT NULL,
  p_max_amount DECIMAL DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  result_type TEXT,
  entity_type TEXT,
  state TEXT,
  total_value DECIMAL,
  opportunity_score INTEGER,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Search entities
  SELECT 
    e.id,
    e.canonical_name as name,
    'entity'::TEXT as result_type,
    e.entity_type,
    e.state,
    e.total_contract_value as total_value,
    e.opportunity_score,
    e.description
  FROM core_entities e
  WHERE 
    (e.canonical_name ILIKE '%' || p_query || '%' OR e.description ILIKE '%' || p_query || '%')
    AND (p_entity_types IS NULL OR e.entity_type = ANY(p_entity_types))
    AND (p_states IS NULL OR e.state = ANY(p_states))
    AND (p_min_amount IS NULL OR e.total_contract_value >= p_min_amount)
    AND (p_max_amount IS NULL OR e.total_contract_value <= p_max_amount)
  
  UNION ALL
  
  -- Search contracts
  SELECT 
    c.id,
    c.recipient_name as name,
    'contract'::TEXT as result_type,
    'contract'::TEXT as entity_type,
    c.pop_state as state,
    c.award_amount as total_value,
    NULL::INTEGER as opportunity_score,
    c.description
  FROM contracts c
  WHERE 
    (c.recipient_name ILIKE '%' || p_query || '%' OR c.description ILIKE '%' || p_query || '%')
    AND (p_states IS NULL OR c.pop_state = ANY(p_states))
    AND (p_min_amount IS NULL OR c.award_amount >= p_min_amount)
    AND (p_max_amount IS NULL OR c.award_amount <= p_max_amount)
  
  ORDER BY total_value DESC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Entity 360 view
CREATE OR REPLACE FUNCTION get_entity_360(p_entity_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'entity', (SELECT row_to_json(e.*) FROM core_entities e WHERE e.id = p_entity_id),
    'contracts', (
      SELECT COALESCE(jsonb_agg(row_to_json(c.*) ORDER BY c.award_amount DESC), '[]'::jsonb)
      FROM (SELECT * FROM contracts WHERE recipient_entity_id = p_entity_id LIMIT 100) c
    ),
    'grants', (
      SELECT COALESCE(jsonb_agg(row_to_json(g.*) ORDER BY g.award_amount DESC), '[]'::jsonb)
      FROM (SELECT * FROM grants WHERE recipient_entity_id = p_entity_id LIMIT 100) g
    ),
    'facts', (
      SELECT COALESCE(jsonb_agg(row_to_json(f.*) ORDER BY f.created_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM core_facts WHERE entity_id = p_entity_id LIMIT 100) f
    ),
    'relationships', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'type', r.relationship_type,
        'strength', r.strength,
        'direction', CASE WHEN r.from_entity_id = p_entity_id THEN 'outgoing' ELSE 'incoming' END,
        'related_entity', (
          SELECT jsonb_build_object('id', re.id, 'name', re.canonical_name, 'type', re.entity_type)
          FROM core_entities re
          WHERE re.id = CASE WHEN r.from_entity_id = p_entity_id THEN r.to_entity_id ELSE r.from_entity_id END
        )
      )), '[]'::jsonb)
      FROM core_relationships r
      WHERE r.from_entity_id = p_entity_id OR r.to_entity_id = p_entity_id
      LIMIT 50
    ),
    'stats', jsonb_build_object(
      'total_contract_value', (SELECT total_contract_value FROM core_entities WHERE id = p_entity_id),
      'contract_count', (SELECT contract_count FROM core_entities WHERE id = p_entity_id),
      'total_grant_value', (SELECT total_grant_value FROM core_entities WHERE id = p_entity_id),
      'grant_count', (SELECT grant_count FROM core_entities WHERE id = p_entity_id),
      'fact_count', (SELECT COUNT(*) FROM core_facts WHERE entity_id = p_entity_id),
      'relationship_count', (SELECT COUNT(*) FROM core_relationships WHERE from_entity_id = p_entity_id OR to_entity_id = p_entity_id)
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on new tables
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for data tables (these are public government data)
CREATE POLICY "Public read access for contracts" ON contracts FOR SELECT USING (true);
CREATE POLICY "Public read access for grants" ON grants FOR SELECT USING (true);
CREATE POLICY "Public read access for opportunities" ON opportunities FOR SELECT USING (true);
CREATE POLICY "Public read access for analytics_daily" ON analytics_daily FOR SELECT USING (true);

-- Service role write access
CREATE POLICY "Service role write access for contracts" ON contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role write access for grants" ON grants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role write access for opportunities" ON opportunities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role write access for analytics_daily" ON analytics_daily FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role write access for search_logs" ON search_logs FOR ALL USING (true) WITH CHECK (true);