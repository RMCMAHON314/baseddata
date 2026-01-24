-- Performance indexes for high-speed queries
CREATE INDEX IF NOT EXISTS idx_contracts_entity_amount 
  ON contracts(recipient_entity_id, award_amount DESC);

CREATE INDEX IF NOT EXISTS idx_facts_entity_type 
  ON core_facts(entity_id, fact_type);

CREATE INDEX IF NOT EXISTS idx_relationships_from_type 
  ON core_relationships(from_entity_id, relationship_type);

CREATE INDEX IF NOT EXISTS idx_relationships_to_type 
  ON core_relationships(to_entity_id, relationship_type);

-- Create top_entities_mv materialized view for fast dashboard queries
CREATE MATERIALIZED VIEW IF NOT EXISTS top_entities_mv AS
SELECT 
  e.id,
  e.canonical_name,
  e.state,
  e.entity_type,
  e.total_contract_value,
  e.contract_count,
  h.overall_score as health_score,
  h.trend_direction,
  h.contract_velocity,
  h.grant_success
FROM core_entities e
LEFT JOIN entity_health_scores h ON h.entity_id = e.id
WHERE e.is_canonical = true
ORDER BY COALESCE(h.overall_score, 0) DESC, COALESCE(e.total_contract_value, 0) DESC;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS top_entities_mv_id ON top_entities_mv(id);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_top_entities()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY top_entities_mv;
END;
$$;