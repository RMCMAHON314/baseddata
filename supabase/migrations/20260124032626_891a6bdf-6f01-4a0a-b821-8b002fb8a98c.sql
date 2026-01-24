-- ═══════════════════════════════════════════════════════════════
-- GAP FIXER SQL HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Helper function to find unconnected entities in same city
CREATE OR REPLACE FUNCTION find_unconnected_same_city_entities(limit_count INTEGER DEFAULT 100)
RETURNS TABLE(
  entity1_id UUID,
  entity2_id UUID,
  city TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    e1.id as entity1_id,
    e2.id as entity2_id,
    r1.properties->>'city' as city
  FROM core_entities e1
  JOIN records r1 ON e1.id = r1.entity_id
  JOIN records r2 ON r1.properties->>'city' = r2.properties->>'city'
                 AND r1.properties->>'state' = r2.properties->>'state'
  JOIN core_entities e2 ON r2.entity_id = e2.id
  WHERE e1.id < e2.id
  AND r1.properties->>'city' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM core_relationships rel
    WHERE (rel.from_entity_id = e1.id AND rel.to_entity_id = e2.id)
       OR (rel.from_entity_id = e2.id AND rel.to_entity_id = e1.id)
  )
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Helper function to find unconnected entities of same type in same state
CREATE OR REPLACE FUNCTION find_unconnected_same_type_state(limit_count INTEGER DEFAULT 100)
RETURNS TABLE(
  entity1_id UUID,
  entity2_id UUID,
  entity_type TEXT,
  state TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    e1.id as entity1_id,
    e2.id as entity2_id,
    e1.entity_type,
    r1.properties->>'state' as state
  FROM core_entities e1
  JOIN records r1 ON e1.id = r1.entity_id
  JOIN core_entities e2 ON e1.entity_type = e2.entity_type AND e1.id < e2.id
  JOIN records r2 ON e2.id = r2.entity_id
  WHERE r1.properties->>'state' = r2.properties->>'state'
  AND r1.properties->>'state' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM core_relationships rel
    WHERE (rel.from_entity_id = e1.id AND rel.to_entity_id = e2.id)
       OR (rel.from_entity_id = e2.id AND rel.to_entity_id = e1.id)
  )
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Helper function to calculate state market concentration
CREATE OR REPLACE FUNCTION calculate_state_market_concentration()
RETURNS TABLE(
  state TEXT,
  category TEXT,
  entity_count BIGINT,
  total_value NUMERIC,
  hhi INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.properties->>'state' as state,
    r.category,
    COUNT(DISTINCT r.entity_id) as entity_count,
    SUM(COALESCE((r.properties->>'award_amount')::NUMERIC, 0)) as total_value,
    ROUND(SUM(POWER(
      COALESCE((r.properties->>'award_amount')::NUMERIC, 0) / 
      NULLIF(SUM(COALESCE((r.properties->>'award_amount')::NUMERIC, 0)) OVER (PARTITION BY r.properties->>'state', r.category), 0)
      * 100, 2
    )))::INTEGER as hhi
  FROM records r
  WHERE r.properties->>'state' IS NOT NULL
  AND r.category IS NOT NULL
  GROUP BY r.properties->>'state', r.category
  HAVING COUNT(DISTINCT r.entity_id) >= 3
  ORDER BY entity_count DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Get comprehensive system stats
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS TABLE(
  total_entities BIGINT,
  total_facts BIGINT,
  total_relationships BIGINT,
  total_insights BIGINT,
  total_records BIGINT,
  active_sources BIGINT,
  pending_queue BIGINT,
  entities_with_facts BIGINT,
  resolution_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM core_entities),
    (SELECT COUNT(*) FROM core_facts),
    (SELECT COUNT(*) FROM core_relationships),
    (SELECT COUNT(*) FROM core_derived_insights),
    (SELECT COUNT(*) FROM records),
    (SELECT COUNT(*) FROM api_sources WHERE status = 'active'),
    (SELECT COUNT(*) FROM flywheel_discovery_queue WHERE status = 'pending'),
    (SELECT COUNT(DISTINCT entity_id) FROM core_facts),
    ROUND((SELECT COUNT(*) FROM records WHERE entity_id IS NOT NULL)::NUMERIC / 
          NULLIF((SELECT COUNT(*) FROM records), 0) * 100, 1);
END;
$$ LANGUAGE plpgsql;