-- ============================================
-- 🧠 ML ENTITY DEDUPLICATION FUNCTIONS
-- ============================================

-- ML-based duplicate scoring function
CREATE OR REPLACE FUNCTION ml_duplicate_score(
  p_name_a TEXT,
  p_name_b TEXT,
  p_state_a TEXT,
  p_state_b TEXT,
  p_uei_a TEXT,
  p_uei_b TEXT
)
RETURNS DECIMAL AS $$
DECLARE
  score DECIMAL := 0;
  name_sim DECIMAL;
  name_a_norm TEXT;
  name_b_norm TEXT;
BEGIN
  -- Normalize names
  name_a_norm := normalize_entity_name(COALESCE(p_name_a, ''));
  name_b_norm := normalize_entity_name(COALESCE(p_name_b, ''));
  
  -- Skip if either is empty
  IF name_a_norm = '' OR name_b_norm = '' THEN
    RETURN 0;
  END IF;
  
  -- UEI match (definitive)
  IF p_uei_a = p_uei_b AND p_uei_a IS NOT NULL AND p_uei_a != '' THEN
    RETURN 100;
  END IF;
  
  -- Name similarity (trigram)
  name_sim := similarity(name_a_norm, name_b_norm);
  score := score + (name_sim * 50);  -- Max 50 points
  
  -- Same state bonus
  IF p_state_a = p_state_b AND p_state_a IS NOT NULL THEN
    score := score + 15;
  END IF;
  
  -- Name contains other (subsidiary detection)
  IF position(name_a_norm in name_b_norm) > 0
     OR position(name_b_norm in name_a_norm) > 0 THEN
    score := score + 10;
  END IF;
  
  -- First word match (company name)
  IF split_part(name_a_norm, ' ', 1) = split_part(name_b_norm, ' ', 1)
     AND length(split_part(name_a_norm, ' ', 1)) > 3 THEN
    score := score + 15;
  END IF;
  
  -- Exact match bonus
  IF name_a_norm = name_b_norm THEN
    score := score + 20;
  END IF;
  
  RETURN LEAST(100, score);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Find potential duplicates for an entity
CREATE OR REPLACE FUNCTION find_potential_duplicates(
  p_entity_id UUID,
  p_threshold DECIMAL DEFAULT 80
)
RETURNS TABLE (
  duplicate_id UUID,
  duplicate_name TEXT,
  score DECIMAL,
  state TEXT,
  uei TEXT
) AS $$
DECLARE
  v_entity RECORD;
BEGIN
  SELECT canonical_name, state, uei INTO v_entity
  FROM core_entities WHERE id = p_entity_id;
  
  RETURN QUERY
  SELECT 
    e.id,
    e.canonical_name,
    ml_duplicate_score(v_entity.canonical_name, e.canonical_name, v_entity.state, e.state, v_entity.uei, e.uei),
    e.state,
    e.uei
  FROM core_entities e
  WHERE e.id != p_entity_id
    AND e.is_canonical = TRUE
    AND ml_duplicate_score(v_entity.canonical_name, e.canonical_name, v_entity.state, e.state, v_entity.uei, e.uei) >= p_threshold
  ORDER BY 3 DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Auto-merge high-confidence duplicates
CREATE OR REPLACE FUNCTION auto_merge_duplicates()
RETURNS INTEGER AS $$
DECLARE
  v_merged INTEGER := 0;
  v_pair RECORD;
BEGIN
  FOR v_pair IN
    SELECT 
      e1.id as winner_id,
      e2.id as loser_id,
      e1.canonical_name as winner_name,
      e2.canonical_name as loser_name,
      ml_duplicate_score(
        e1.canonical_name, e2.canonical_name,
        e1.state, e2.state,
        e1.uei, e2.uei
      ) as score
    FROM core_entities e1
    JOIN core_entities e2 ON e1.id < e2.id
    WHERE e1.is_canonical AND e2.is_canonical
      AND ml_duplicate_score(
        e1.canonical_name, e2.canonical_name,
        e1.state, e2.state,
        e1.uei, e2.uei
      ) >= 95
    ORDER BY COALESCE(e1.total_contract_value, 0) DESC
    LIMIT 100
  LOOP
    -- Merge loser into winner
    UPDATE core_entities SET
      is_canonical = FALSE,
      canonical_id = v_pair.winner_id,
      alternate_names = CASE 
        WHEN alternate_names IS NULL THEN ARRAY[canonical_name]
        ELSE array_append(alternate_names, canonical_name)
      END
    WHERE id = v_pair.loser_id;
    
    -- Update contracts to point to winner
    UPDATE contracts SET recipient_entity_id = v_pair.winner_id
    WHERE recipient_entity_id = v_pair.loser_id;
    
    -- Update grants to point to winner
    UPDATE grants SET recipient_entity_id = v_pair.winner_id
    WHERE recipient_entity_id = v_pair.loser_id;
    
    -- Update facts to point to winner
    UPDATE core_facts SET entity_id = v_pair.winner_id
    WHERE entity_id = v_pair.loser_id;
    
    -- Update relationships
    UPDATE core_relationships SET from_entity_id = v_pair.winner_id
    WHERE from_entity_id = v_pair.loser_id;
    UPDATE core_relationships SET to_entity_id = v_pair.winner_id
    WHERE to_entity_id = v_pair.loser_id;
    
    -- Log the merge
    INSERT INTO core_entity_history (entity_id, change_type, change_source, old_values, new_values)
    VALUES (v_pair.winner_id, 'auto_merge', 'ml_dedup', 
      jsonb_build_object('merged_entity_id', v_pair.loser_id, 'merged_name', v_pair.loser_name),
      jsonb_build_object('score', v_pair.score));
    
    v_merged := v_merged + 1;
  END LOOP;
  
  -- Sync stats for merged entities
  PERFORM sync_all_entity_stats();
  
  RETURN v_merged;
END;
$$ LANGUAGE plpgsql;

-- Schedule duplicate detection in discover_relationships
CREATE OR REPLACE FUNCTION discover_relationships()
RETURNS INTEGER AS $$
DECLARE
  v_created INTEGER := 0;
  v_contract RECORD;
BEGIN
  -- Derive competitor relationships from same agency + same NAICS
  INSERT INTO core_relationships (from_entity_id, to_entity_id, relationship_type, strength, source)
  SELECT DISTINCT 
    c1.recipient_entity_id, 
    c2.recipient_entity_id, 
    'competes_with', 
    0.5, 
    'derived'
  FROM contracts c1
  JOIN contracts c2 ON c1.awarding_agency = c2.awarding_agency
    AND c1.naics_code = c2.naics_code
    AND c1.recipient_entity_id != c2.recipient_entity_id
    AND c1.recipient_entity_id IS NOT NULL 
    AND c2.recipient_entity_id IS NOT NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM core_relationships r
    WHERE r.from_entity_id = c1.recipient_entity_id 
      AND r.to_entity_id = c2.recipient_entity_id
      AND r.relationship_type = 'competes_with'
  )
  ON CONFLICT DO NOTHING;
  
  GET DIAGNOSTICS v_created = ROW_COUNT;
  
  RETURN v_created;
END;
$$ LANGUAGE plpgsql;

-- Sync all entity stats function
CREATE OR REPLACE FUNCTION sync_all_entity_stats()
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER := 0;
BEGIN
  -- Update contract stats
  UPDATE core_entities e SET
    contract_count = sub.cnt,
    total_contract_value = sub.total
  FROM (
    SELECT 
      recipient_entity_id as id,
      COUNT(*) as cnt,
      SUM(COALESCE(award_amount, 0)) as total
    FROM contracts
    WHERE recipient_entity_id IS NOT NULL
    GROUP BY recipient_entity_id
  ) sub
  WHERE e.id = sub.id;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  -- Update grant stats
  UPDATE core_entities e SET
    grant_count = sub.cnt,
    total_grant_value = sub.total
  FROM (
    SELECT 
      recipient_entity_id as id,
      COUNT(*) as cnt,
      SUM(COALESCE(award_amount, 0)) as total
    FROM grants
    WHERE recipient_entity_id IS NOT NULL
    GROUP BY recipient_entity_id
  ) sub
  WHERE e.id = sub.id;
  
  -- Update source count
  UPDATE core_entities SET source_count = (
    SELECT COUNT(DISTINCT source) FROM contracts WHERE recipient_entity_id = core_entities.id
  ) + (
    SELECT COUNT(DISTINCT source) FROM grants WHERE recipient_entity_id = core_entities.id
  );
  
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- Create insight generation function if not exists
CREATE OR REPLACE FUNCTION generate_insights()
RETURNS INTEGER AS $$
DECLARE 
  v_generated INTEGER := 0;
BEGIN
  -- High value contract insights
  INSERT INTO insights (insight_type, severity, title, description, entity_ids, evidence)
  SELECT 
    'high_value_contract', 
    'high', 
    'High-Value Contract: ' || c.recipient_name,
    'Contract worth ' || TO_CHAR(c.award_amount, 'FM$999,999,999,999') || ' from ' || c.awarding_agency,
    ARRAY[c.recipient_entity_id],
    jsonb_build_object('award_id', c.award_id, 'amount', c.award_amount, 'agency', c.awarding_agency)
  FROM contracts c
  WHERE c.award_amount > 10000000 
    AND c.created_at > NOW() - INTERVAL '30 days'
    AND c.recipient_entity_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM insights i 
      WHERE i.evidence->>'award_id' = c.award_id
    )
  LIMIT 50
  ON CONFLICT DO NOTHING;
  
  GET DIAGNOSTICS v_generated = ROW_COUNT;
  
  RETURN v_generated;
END;
$$ LANGUAGE plpgsql;

-- Capture health snapshot function
CREATE OR REPLACE FUNCTION capture_health_snapshot()
RETURNS UUID AS $$
DECLARE
  v_snapshot_id UUID;
  v_entity_count INTEGER;
  v_contract_count INTEGER;
  v_grant_count INTEGER;
  v_opp_count INTEGER;
  v_fact_count INTEGER;
  v_rel_count INTEGER;
  v_total_value DECIMAL;
  v_health_score INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_entity_count FROM core_entities WHERE is_canonical = TRUE;
  SELECT COUNT(*) INTO v_contract_count FROM contracts;
  SELECT COUNT(*) INTO v_grant_count FROM grants;
  SELECT COUNT(*) INTO v_opp_count FROM opportunities WHERE is_active = TRUE;
  SELECT COUNT(*) INTO v_fact_count FROM core_facts;
  SELECT COUNT(*) INTO v_rel_count FROM core_relationships;
  SELECT COALESCE(SUM(award_amount), 0) INTO v_total_value FROM contracts;
  
  -- Calculate health score (0-100)
  v_health_score := LEAST(100, 
    (CASE WHEN v_entity_count > 1000 THEN 20 WHEN v_entity_count > 100 THEN 10 ELSE 5 END) +
    (CASE WHEN v_contract_count > 10000 THEN 25 WHEN v_contract_count > 1000 THEN 15 ELSE 5 END) +
    (CASE WHEN v_grant_count > 1000 THEN 20 WHEN v_grant_count > 100 THEN 10 ELSE 0 END) +
    (CASE WHEN v_opp_count > 500 THEN 15 WHEN v_opp_count > 50 THEN 8 ELSE 0 END) +
    (CASE WHEN v_rel_count > 10000 THEN 20 WHEN v_rel_count > 1000 THEN 10 ELSE 5 END)
  );
  
  INSERT INTO ocean_health (
    health_score,
    pipeline_score,
    freshness_score,
    coverage_score,
    total_entities,
    total_contracts,
    total_grants,
    total_opportunities,
    total_facts,
    total_relationships,
    total_contract_value
  ) VALUES (
    v_health_score,
    v_health_score,
    LEAST(100, v_health_score + 10),
    LEAST(100, v_health_score - 5),
    v_entity_count,
    v_contract_count,
    v_grant_count,
    v_opp_count,
    v_fact_count,
    v_rel_count,
    v_total_value
  )
  RETURNING id INTO v_snapshot_id;
  
  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql;