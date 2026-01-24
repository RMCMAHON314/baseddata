-- ============================================================================
-- 🛡️ ULTIMATE SECURITY & RESILIENCE HARDENING (15/10 Architecture)
-- ============================================================================

-- 1. FIX SECURITY DEFINER VIEWS
DROP VIEW IF EXISTS entity_360_profiles CASCADE;
DROP VIEW IF EXISTS high_value_opportunities CASCADE;
DROP VIEW IF EXISTS realtime_dashboard CASCADE;
DROP VIEW IF EXISTS intelligence_alerts_view CASCADE;

CREATE OR REPLACE VIEW entity_360_profiles AS
SELECT 
  e.id, e.canonical_name, e.entity_type, e.city, e.state,
  e.latitude, e.longitude, e.health_score, e.opportunity_score,
  e.risk_score, e.data_quality_score, e.source_count, e.created_at, e.updated_at,
  COALESCE((SELECT COUNT(*) FROM core_facts WHERE entity_id = e.id), 0) as fact_count,
  COALESCE((SELECT COUNT(*) FROM core_relationships WHERE from_entity_id = e.id OR to_entity_id = e.id), 0) as relationship_count
FROM core_entities e;

CREATE OR REPLACE VIEW high_value_opportunities AS
SELECT id, canonical_name, entity_type, city, state, opportunity_score, health_score, source_count, created_at
FROM core_entities WHERE opportunity_score >= 50 ORDER BY opportunity_score DESC;

CREATE OR REPLACE VIEW realtime_dashboard AS
SELECT
  (SELECT COUNT(*) FROM core_entities) as total_entities,
  (SELECT COUNT(*) FROM core_facts) as total_facts,
  (SELECT COUNT(*) FROM core_relationships) as total_relationships,
  (SELECT COUNT(*) FROM core_derived_insights WHERE is_active = true) as active_insights,
  (SELECT COUNT(*) FROM api_sources WHERE health_status = 'healthy') as healthy_sources,
  (SELECT AVG(data_quality_score) FROM core_entities WHERE data_quality_score IS NOT NULL) as avg_quality_score,
  (SELECT COUNT(*) FROM flywheel_discovery_queue WHERE status = 'pending') as queue_depth;

-- 2. ADD MISSING RLS POLICIES
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit log" ON admin_audit_log
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active announcements" ON announcements
  FOR SELECT USING (starts_at IS NULL OR starts_at <= now());

ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role api_usage select" ON api_usage FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Service role api_usage insert" ON api_usage FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role api_usage update" ON api_usage FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "Service role api_usage delete" ON api_usage FOR DELETE USING (auth.role() = 'service_role');

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read feature flags" ON feature_flags FOR SELECT USING (true);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view subscription plans" ON subscription_plans FOR SELECT USING (true);

-- 3. FIX FUNCTION SEARCH PATHS
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 4. CREATE RESILIENCE TRACKING TABLE
CREATE TABLE IF NOT EXISTS public.system_resilience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  component TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'healthy',
  latency_ms INT,
  error_count INT DEFAULT 0,
  recovery_attempts INT DEFAULT 0,
  last_error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);
ALTER TABLE system_resilience ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read system_resilience" ON system_resilience FOR SELECT USING (true);
CREATE POLICY "Service insert system_resilience" ON system_resilience FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- 5. CREATE ARCHITECTURE CONNECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.architecture_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_component TEXT NOT NULL,
  to_component TEXT NOT NULL,
  connection_type TEXT NOT NULL DEFAULT 'sync',
  is_active BOOLEAN DEFAULT true,
  latency_p50_ms INT,
  latency_p99_ms INT,
  success_rate FLOAT DEFAULT 1.0,
  last_verified TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE architecture_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read architecture" ON architecture_connections FOR SELECT USING (true);

INSERT INTO architecture_connections (from_component, to_component, connection_type) VALUES
  ('omniscient', 'entity-resolver', 'async'),
  ('omniscient', 'core-extract-facts', 'async'),
  ('omniscient', 'core-generate-insights', 'async'),
  ('omniscient', 'core-learning', 'async'),
  ('omniscient', 'kraken-hunters', 'async'),
  ('flywheel-ultimate', 'discovery-processor', 'sync'),
  ('flywheel-ultimate', 'entity-resolver', 'sync'),
  ('flywheel-ultimate', 'core-extract-facts', 'sync'),
  ('flywheel-ultimate', 'core-generate-insights', 'sync'),
  ('flywheel-ultimate', 'core-scorer', 'sync'),
  ('kraken', 'kraken-hunters', 'sync'),
  ('kraken', 'kraken-crawlers', 'sync'),
  ('infinite-algorithm', 'core-generate-insights', 'sync'),
  ('health-check', 'api_sources', 'sync'),
  ('ai-chat', 'core_entities', 'sync'),
  ('developer-api', 'records', 'sync')
ON CONFLICT DO NOTHING;

-- 6. CREATE MASTER HEALTH FUNCTION
CREATE OR REPLACE FUNCTION public.get_system_health()
RETURNS TABLE(
  health_score INT, status TEXT, entities BIGINT, facts BIGINT,
  relationships BIGINT, insights BIGINT, healthy_sources BIGINT,
  queue_depth BIGINT, fact_density FLOAT, resolution_rate FLOAT
) AS $$
DECLARE
  v_entities BIGINT; v_facts BIGINT; v_relationships BIGINT; v_insights BIGINT;
  v_healthy_sources BIGINT; v_queue_depth BIGINT; v_records BIGINT; v_resolved BIGINT; v_score INT;
BEGIN
  SELECT COUNT(*) INTO v_entities FROM core_entities;
  SELECT COUNT(*) INTO v_facts FROM core_facts;
  SELECT COUNT(*) INTO v_relationships FROM core_relationships;
  SELECT COUNT(*) INTO v_insights FROM core_derived_insights WHERE is_active = true;
  SELECT COUNT(*) INTO v_healthy_sources FROM api_sources WHERE health_status = 'healthy';
  SELECT COUNT(*) INTO v_queue_depth FROM flywheel_discovery_queue WHERE status = 'pending';
  SELECT COUNT(*) INTO v_records FROM records;
  SELECT COUNT(*) INTO v_resolved FROM records WHERE resolved_entity_id IS NOT NULL;
  
  v_score := LEAST(100, GREATEST(0,
    (CASE WHEN v_entities > 1000 THEN 25 ELSE (v_entities::FLOAT / 1000 * 25)::INT END) +
    (CASE WHEN v_facts > 50000 THEN 25 ELSE (v_facts::FLOAT / 50000 * 25)::INT END) +
    (CASE WHEN v_healthy_sources > 50 THEN 25 ELSE (v_healthy_sources::FLOAT / 50 * 25)::INT END) +
    (CASE WHEN v_resolved > 0 AND v_records > 0 THEN (v_resolved::FLOAT / v_records * 25)::INT ELSE 0 END)
  ));
  
  RETURN QUERY SELECT v_score,
    CASE WHEN v_score >= 90 THEN 'LEGENDARY' WHEN v_score >= 75 THEN 'POWERFUL' WHEN v_score >= 50 THEN 'GROWING' ELSE 'BUILDING' END,
    v_entities, v_facts, v_relationships, v_insights, v_healthy_sources, v_queue_depth,
    CASE WHEN v_entities > 0 THEN v_facts::FLOAT / v_entities ELSE 0 END,
    CASE WHEN v_records > 0 THEN v_resolved::FLOAT / v_records ELSE 0 END;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_system_health() TO anon, authenticated;