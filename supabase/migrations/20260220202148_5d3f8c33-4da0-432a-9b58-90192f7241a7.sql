
-- Fix SECURITY DEFINER views by recreating them as SECURITY INVOKER
-- View: entity_360_profiles
CREATE OR REPLACE VIEW public.entity_360_profiles WITH (security_invoker = true) AS
SELECT id, canonical_name, entity_type, city, state, country, latitude, longitude,
  data_quality_score, opportunity_score, health_score, risk_score, source_count,
  (SELECT count(*) FROM core_facts f WHERE f.entity_id = e.id) AS fact_count,
  (SELECT count(*) FROM core_relationships r WHERE r.from_entity_id = e.id OR r.to_entity_id = e.id) AS relationship_count,
  created_at, updated_at
FROM core_entities e;

-- View: high_value_opportunities
CREATE OR REPLACE VIEW public.high_value_opportunities WITH (security_invoker = true) AS
SELECT id, canonical_name, entity_type, opportunity_score, data_quality_score, city, state
FROM core_entities e
WHERE opportunity_score >= 70
ORDER BY opportunity_score DESC;

-- View: realtime_dashboard
CREATE OR REPLACE VIEW public.realtime_dashboard WITH (security_invoker = true) AS
SELECT
  (SELECT count(*) FROM core_entities) AS total_entities,
  (SELECT count(*) FROM core_facts) AS total_facts,
  (SELECT count(*) FROM core_relationships) AS total_relationships,
  (SELECT count(*) FROM records) AS total_records,
  (SELECT count(*) FROM api_sources WHERE status = 'active') AS active_sources,
  (SELECT count(*) FROM flywheel_discovery_queue WHERE status = 'pending') AS queue_depth;

-- View: ocean_health_current
CREATE OR REPLACE VIEW public.ocean_health_current WITH (security_invoker = true) AS
SELECT * FROM ocean_health_snapshots ORDER BY snapshot_at DESC LIMIT 1;

-- View: infinite_algorithm_status
CREATE OR REPLACE VIEW public.infinite_algorithm_status WITH (security_invoker = true) AS
SELECT
  (SELECT count(*) FROM core_entities) AS total_entities,
  (SELECT count(*) FROM core_facts) AS total_facts,
  (SELECT count(*) FROM core_relationships) AS total_relationships,
  (SELECT count(*) FROM core_derived_insights) AS total_insights,
  (SELECT count(*) FROM flywheel_discovery_queue WHERE status = 'pending') AS queue_pending,
  (SELECT count(*) FROM flywheel_discovery_queue WHERE status = 'processing') AS queue_processing,
  (SELECT count(*) FROM flywheel_discovery_queue WHERE status = 'completed' AND completed_at > now() - interval '24 hours') AS completed_24h,
  (SELECT round(avg(opportunity_score), 1) FROM core_entities WHERE opportunity_score IS NOT NULL) AS avg_opportunity_score,
  (SELECT max(cycle_timestamp) FROM algorithm_metrics) AS last_cycle,
  (SELECT duration_ms FROM algorithm_metrics ORDER BY cycle_timestamp DESC LIMIT 1) AS last_cycle_duration,
  (SELECT COALESCE(sum(entities_expanded), 0) FROM algorithm_metrics WHERE cycle_timestamp > now() - interval '24 hours') AS entities_expanded_24h,
  (SELECT COALESCE(sum(facts_enriched), 0) FROM algorithm_metrics WHERE cycle_timestamp > now() - interval '24 hours') AS facts_enriched_24h,
  (SELECT COALESCE(sum(relationships_discovered), 0) FROM algorithm_metrics WHERE cycle_timestamp > now() - interval '24 hours') AS relationships_discovered_24h,
  (SELECT COALESCE(sum(insights_generated), 0) FROM algorithm_metrics WHERE cycle_timestamp > now() - interval '24 hours') AS insights_generated_24h;

-- Harden remaining functions with search_path
ALTER FUNCTION public.auto_merge_duplicates() SET search_path = public;
ALTER FUNCTION public.calculate_opportunity_scores() SET search_path = public;
ALTER FUNCTION public.calculate_retry_delay(integer, integer) SET search_path = public;
ALTER FUNCTION public.calculate_state_market_concentration() SET search_path = public;
