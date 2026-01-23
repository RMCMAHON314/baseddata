-- ============================================================
-- 🧠 THE CORE: UNIFIED ENTITY SYSTEM
-- The Brain of Based Data - Living Data Organism
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- CORE ENTITIES (THE BRAIN)
-- ============================================================
CREATE TABLE public.core_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name VARCHAR(500) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  identifiers JSONB NOT NULL DEFAULT '{}',
  merged_data JSONB NOT NULL DEFAULT '{}',
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  city VARCHAR(255),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'USA',
  health_score INTEGER CHECK (health_score BETWEEN 0 AND 100),
  risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
  opportunity_score INTEGER CHECK (opportunity_score BETWEEN 0 AND 100),
  data_quality_score INTEGER CHECK (data_quality_score BETWEEN 0 AND 100),
  source_records JSONB NOT NULL DEFAULT '[]',
  source_count INTEGER DEFAULT 0,
  last_source_update TIMESTAMPTZ,
  clusters TEXT[],
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ
);

-- ============================================================
-- CORE RELATIONSHIPS (THE NERVOUS SYSTEM)
-- ============================================================
CREATE TABLE public.core_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entity_id UUID REFERENCES core_entities(id) ON DELETE CASCADE,
  to_entity_id UUID REFERENCES core_entities(id) ON DELETE CASCADE,
  relationship_type VARCHAR(100) NOT NULL,
  strength DECIMAL(3,2) CHECK (strength BETWEEN 0 AND 1),
  confidence DECIMAL(3,2) CHECK (confidence BETWEEN 0 AND 1),
  evidence JSONB NOT NULL DEFAULT '[]',
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_entity_id, to_entity_id, relationship_type)
);

-- ============================================================
-- CORE FACTS (THE MEMORY)
-- ============================================================
CREATE TABLE public.core_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES core_entities(id) ON DELETE CASCADE,
  fact_type VARCHAR(100) NOT NULL,
  fact_value JSONB NOT NULL,
  fact_date DATE,
  fact_period VARCHAR(50),
  source_name VARCHAR(100),
  source_record_id VARCHAR(255),
  confidence DECIMAL(3,2) CHECK (confidence BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CORE QUERY PATTERNS (THE LEARNING ENGINE)
-- ============================================================
CREATE TABLE public.core_query_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_signature VARCHAR(500) NOT NULL UNIQUE,
  query_count INTEGER DEFAULT 1,
  unique_users INTEGER DEFAULT 1,
  last_queried_at TIMESTAMPTZ DEFAULT NOW(),
  successful_sources TEXT[],
  avg_result_count DECIMAL(10,2),
  avg_satisfaction_score DECIMAL(3,2) CHECK (avg_satisfaction_score BETWEEN 0 AND 1),
  recommended_sources TEXT[],
  recommended_correlations TEXT[],
  cached_insights JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CORE FEEDBACK (THE CORRECTION SYSTEM)
-- ============================================================
CREATE TABLE public.core_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES core_entities(id) ON DELETE SET NULL,
  record_id UUID REFERENCES records(id) ON DELETE SET NULL,
  query_id UUID REFERENCES queries(id) ON DELETE SET NULL,
  feedback_type VARCHAR(50) NOT NULL,
  feedback_data JSONB NOT NULL,
  user_id UUID,
  user_trust_score DECIMAL(3,2) DEFAULT 0.5 CHECK (user_trust_score BETWEEN 0 AND 1),
  status VARCHAR(50) DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CORE DERIVED INSIGHTS
-- ============================================================
CREATE TABLE public.core_derived_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type VARCHAR(50) NOT NULL,
  scope_value VARCHAR(255),
  insight_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) DEFAULT 'notable',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  supporting_data JSONB NOT NULL DEFAULT '{}',
  related_entities UUID[],
  confidence DECIMAL(3,2) CHECK (confidence BETWEEN 0 AND 1),
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  action_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CORE ENTITY HISTORY
-- ============================================================
CREATE TABLE public.core_entity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES core_entities(id) ON DELETE CASCADE,
  change_type VARCHAR(50) NOT NULL,
  changed_fields TEXT[],
  old_values JSONB,
  new_values JSONB,
  change_source VARCHAR(100),
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CORE INTELLIGENCE METRICS
-- ============================================================
CREATE TABLE public.core_intelligence_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL UNIQUE,
  total_entities BIGINT DEFAULT 0,
  total_relationships BIGINT DEFAULT 0,
  total_facts BIGINT DEFAULT 0,
  new_entities_today INTEGER DEFAULT 0,
  new_relationships_today INTEGER DEFAULT 0,
  avg_entity_completeness DECIMAL(5,2),
  avg_data_freshness_days DECIMAL(10,2),
  entities_verified_today INTEGER DEFAULT 0,
  queries_processed_today INTEGER DEFAULT 0,
  patterns_learned_today INTEGER DEFAULT 0,
  feedback_processed_today INTEGER DEFAULT 0,
  insights_generated_today INTEGER DEFAULT 0,
  avg_query_time_ms DECIMAL(10,2),
  cache_hit_rate DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_core_entities_type ON core_entities(entity_type);
CREATE INDEX idx_core_entities_name ON core_entities USING gin(canonical_name gin_trgm_ops);
CREATE INDEX idx_core_entities_identifiers ON core_entities USING gin(identifiers);
CREATE INDEX idx_core_entities_scores ON core_entities(health_score, risk_score, opportunity_score);
CREATE INDEX idx_core_entities_location ON core_entities(state, city);
CREATE INDEX idx_core_entities_geo ON core_entities(latitude, longitude);
CREATE INDEX idx_core_relationships_from ON core_relationships(from_entity_id);
CREATE INDEX idx_core_relationships_to ON core_relationships(to_entity_id);
CREATE INDEX idx_core_relationships_type ON core_relationships(relationship_type);
CREATE INDEX idx_core_relationships_active ON core_relationships(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_core_facts_entity ON core_facts(entity_id);
CREATE INDEX idx_core_facts_type_date ON core_facts(fact_type, fact_date);
CREATE INDEX idx_core_facts_source ON core_facts(source_name);
CREATE INDEX idx_core_patterns_signature ON core_query_patterns(pattern_signature);
CREATE INDEX idx_core_patterns_count ON core_query_patterns(query_count DESC);
CREATE INDEX idx_core_feedback_status ON core_feedback(status) WHERE status = 'pending';
CREATE INDEX idx_core_feedback_entity ON core_feedback(entity_id);
CREATE INDEX idx_core_insights_active ON core_derived_insights(is_active, scope_type);
CREATE INDEX idx_core_insights_type ON core_derived_insights(insight_type);
CREATE INDEX idx_core_history_entity ON core_entity_history(entity_id);
CREATE INDEX idx_core_history_date ON core_entity_history(created_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.core_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_query_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_derived_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_entity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_intelligence_metrics ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "core_entities_select" ON public.core_entities FOR SELECT USING (true);
CREATE POLICY "core_relationships_select" ON public.core_relationships FOR SELECT USING (true);
CREATE POLICY "core_facts_select" ON public.core_facts FOR SELECT USING (true);
CREATE POLICY "core_query_patterns_select" ON public.core_query_patterns FOR SELECT USING (true);
CREATE POLICY "core_derived_insights_select" ON public.core_derived_insights FOR SELECT USING (true);
CREATE POLICY "core_intelligence_metrics_select" ON public.core_intelligence_metrics FOR SELECT USING (true);
CREATE POLICY "core_feedback_insert" ON public.core_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "core_feedback_select" ON public.core_feedback FOR SELECT USING (true);
CREATE POLICY "core_entity_history_select" ON public.core_entity_history FOR SELECT USING (true);

-- ============================================================
-- FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION update_core_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_core_entities_updated_at
  BEFORE UPDATE ON core_entities
  FOR EACH ROW EXECUTE FUNCTION update_core_updated_at();

CREATE TRIGGER trigger_core_relationships_updated_at
  BEFORE UPDATE ON core_relationships
  FOR EACH ROW EXECUTE FUNCTION update_core_updated_at();

CREATE TRIGGER trigger_core_query_patterns_updated_at
  BEFORE UPDATE ON core_query_patterns
  FOR EACH ROW EXECUTE FUNCTION update_core_updated_at();

-- Function to find similar entities
CREATE OR REPLACE FUNCTION find_similar_entities(
  search_name TEXT,
  search_type TEXT DEFAULT NULL,
  similarity_threshold DECIMAL DEFAULT 0.6
)
RETURNS TABLE (
  entity_id UUID,
  canonical_name VARCHAR(500),
  entity_type VARCHAR(100),
  similarity DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.canonical_name,
    e.entity_type,
    similarity(e.canonical_name, search_name)::DECIMAL as sim
  FROM core_entities e
  WHERE similarity(e.canonical_name, search_name) > similarity_threshold
    AND (search_type IS NULL OR e.entity_type = search_type)
  ORDER BY sim DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update daily intelligence metrics
CREATE OR REPLACE FUNCTION update_intelligence_metrics()
RETURNS void AS $$
DECLARE
  today DATE := CURRENT_DATE;
BEGIN
  INSERT INTO core_intelligence_metrics (
    metric_date,
    total_entities,
    total_relationships,
    total_facts,
    new_entities_today,
    new_relationships_today
  )
  SELECT
    today,
    (SELECT COUNT(*) FROM core_entities),
    (SELECT COUNT(*) FROM core_relationships),
    (SELECT COUNT(*) FROM core_facts),
    (SELECT COUNT(*) FROM core_entities WHERE created_at::date = today),
    (SELECT COUNT(*) FROM core_relationships WHERE created_at::date = today)
  ON CONFLICT (metric_date) DO UPDATE SET
    total_entities = EXCLUDED.total_entities,
    total_relationships = EXCLUDED.total_relationships,
    total_facts = EXCLUDED.total_facts,
    new_entities_today = EXCLUDED.new_entities_today,
    new_relationships_today = EXCLUDED.new_relationships_today;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;