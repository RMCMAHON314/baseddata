-- ============================================================
-- 🚀 MOON SHOT: CORE INTELLIGENCE LAYER
-- ============================================================

-- PHASE 1: ENTITY 360° PROFILES (Simplified)
CREATE OR REPLACE VIEW entity_360_profiles AS
WITH 
entity_facts AS (
  SELECT 
    entity_id,
    jsonb_object_agg(fact_type, fact_data) as facts_by_type,
    COUNT(*) as total_facts,
    COUNT(DISTINCT fact_type) as fact_diversity
  FROM (
    SELECT entity_id, fact_type, jsonb_agg(fact_value ORDER BY created_at DESC) as fact_data
    FROM core_facts WHERE entity_id IS NOT NULL GROUP BY entity_id, fact_type
  ) grouped GROUP BY entity_id
),
entity_relationships AS (
  SELECT 
    entity_id, COUNT(*) as total_relationships, COUNT(DISTINCT relationship_type) as relationship_diversity,
    COUNT(*) FILTER (WHERE direction = 'outbound') as outbound_connections,
    COUNT(*) FILTER (WHERE direction = 'inbound') as inbound_connections
  FROM (
    SELECT from_entity_id as entity_id, relationship_type, 'outbound' as direction FROM core_relationships
    UNION ALL
    SELECT to_entity_id as entity_id, relationship_type, 'inbound' as direction FROM core_relationships
  ) all_rels GROUP BY entity_id
),
entity_financials AS (
  SELECT 
    entity_id,
    SUM(CASE WHEN fact_type = 'payment_received' THEN COALESCE((fact_value->>'amount')::numeric, 0) ELSE 0 END) as total_payments,
    SUM(CASE WHEN fact_type = 'contract_awarded' THEN COALESCE((fact_value->>'amount')::numeric, 0) ELSE 0 END) as total_contracts,
    COUNT(*) FILTER (WHERE fact_type = 'payment_received') as payment_count,
    COUNT(*) FILTER (WHERE fact_type = 'contract_awarded') as contract_count
  FROM core_facts WHERE fact_type IN ('payment_received', 'contract_awarded') GROUP BY entity_id
),
entity_sources AS (
  SELECT entity_id, COUNT(DISTINCT source_id) as source_count, COUNT(*) as record_count
  FROM records WHERE entity_id IS NOT NULL GROUP BY entity_id
)
SELECT 
  e.id, e.canonical_name, e.entity_type,
  LEAST(100, COALESCE(ef.total_facts, 0) * 2 + COALESCE(er.total_relationships, 0) / 10 + COALESCE(es.source_count, 0) * 10)::integer as profile_completeness,
  e.health_score, e.risk_score, e.opportunity_score, e.data_quality_score,
  LEAST(100, COALESCE(er.total_relationships, 0) / 50.0 * 100)::integer as influence_score,
  jsonb_build_object(
    'total_value', COALESCE(efin.total_payments, 0) + COALESCE(efin.total_contracts, 0),
    'total_payments', COALESCE(efin.total_payments, 0), 'total_contracts', COALESCE(efin.total_contracts, 0),
    'financial_tier', CASE 
      WHEN COALESCE(efin.total_payments, 0) + COALESCE(efin.total_contracts, 0) >= 10000000 THEN 'enterprise'
      WHEN COALESCE(efin.total_payments, 0) + COALESCE(efin.total_contracts, 0) >= 1000000 THEN 'major'
      WHEN COALESCE(efin.total_payments, 0) + COALESCE(efin.total_contracts, 0) >= 100000 THEN 'significant'
      ELSE 'unknown' END
  ) as financial_profile,
  jsonb_build_object('source_count', COALESCE(es.source_count, 0), 'record_count', COALESCE(es.record_count, 0),
    'fact_count', COALESCE(ef.total_facts, 0), 'relationship_count', COALESCE(er.total_relationships, 0)
  ) as data_coverage,
  jsonb_build_object('total', COALESCE(er.total_relationships, 0), 'inbound', COALESCE(er.inbound_connections, 0),
    'outbound', COALESCE(er.outbound_connections, 0)) as relationship_summary,
  COALESCE(ef.facts_by_type, '{}'::jsonb) as facts, e.identifiers, e.merged_data, e.created_at, e.updated_at
FROM core_entities e
LEFT JOIN entity_facts ef ON e.id = ef.entity_id
LEFT JOIN entity_relationships er ON e.id = er.entity_id
LEFT JOIN entity_financials efin ON e.id = efin.entity_id
LEFT JOIN entity_sources es ON e.id = es.entity_id;

-- PHASE 2-3: Key functions
CREATE OR REPLACE FUNCTION calculate_opportunity_scores() RETURNS void AS $$
BEGIN
  UPDATE core_entities e SET opportunity_score = LEAST(100, (
    COALESCE((SELECT CASE WHEN SUM(COALESCE((f.fact_value->>'amount')::numeric, 0)) >= 1000000 THEN 30 ELSE 10 END FROM core_facts f WHERE f.entity_id = e.id AND f.fact_type IN ('contract_awarded', 'payment_received')), 10) +
    COALESCE((SELECT LEAST(30, COUNT(*) / 10.0 * 30) FROM core_relationships cr WHERE cr.from_entity_id = e.id OR cr.to_entity_id = e.id), 0) +
    COALESCE((SELECT LEAST(20, COUNT(DISTINCT fact_type) * 2) FROM core_facts f WHERE f.entity_id = e.id), 0) +
    COALESCE((SELECT LEAST(10, COUNT(DISTINCT source_id) * 3) FROM records r WHERE r.entity_id = e.id), 0)
  )), updated_at = NOW();
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW high_value_opportunities AS
SELECT e.id, e.canonical_name, e.entity_type, e.opportunity_score,
  CASE WHEN e.opportunity_score >= 80 THEN '🔥 HOT' WHEN e.opportunity_score >= 60 THEN '⚡ WARM' ELSE '📊 MONITOR' END as opportunity_status
FROM core_entities e WHERE e.opportunity_score >= 40 ORDER BY e.opportunity_score DESC;

-- PHASE 5: Temporal tracking
CREATE TABLE IF NOT EXISTS entity_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), entity_id UUID REFERENCES core_entities(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL, event_data JSONB NOT NULL, previous_value JSONB, new_value JSONB,
  change_magnitude DECIMAL, recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_timeline_entity ON entity_timeline(entity_id);

-- PHASE 7: Intelligence alerts
CREATE TABLE IF NOT EXISTS intelligence_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), alert_type VARCHAR(100) NOT NULL, severity VARCHAR(50) DEFAULT 'info',
  entity_id UUID REFERENCES core_entities(id), title TEXT NOT NULL, description TEXT NOT NULL,
  data JSONB, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON intelligence_alerts(is_read) WHERE is_read = FALSE;

-- Query understanding
CREATE TABLE IF NOT EXISTS query_understanding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), raw_query TEXT NOT NULL, parsed_intent JSONB NOT NULL,
  suggested_sources TEXT[], confidence DECIMAL DEFAULT 0.8, created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Realtime dashboard
CREATE OR REPLACE VIEW realtime_dashboard AS
SELECT 'entities' as metric, COUNT(*)::text as value FROM core_entities
UNION ALL SELECT 'facts', COUNT(*)::text FROM core_facts
UNION ALL SELECT 'insights', COUNT(*)::text FROM core_derived_insights
UNION ALL SELECT 'relationships', COUNT(*)::text FROM core_relationships;

-- RLS
ALTER TABLE entity_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_understanding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_entity_timeline" ON entity_timeline;
DROP POLICY IF EXISTS "anon_read_intelligence_alerts" ON intelligence_alerts;
DROP POLICY IF EXISTS "anon_read_query_understanding" ON query_understanding;

CREATE POLICY "anon_read_entity_timeline" ON entity_timeline FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_intelligence_alerts" ON intelligence_alerts FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_query_understanding" ON query_understanding FOR SELECT TO anon USING (true);