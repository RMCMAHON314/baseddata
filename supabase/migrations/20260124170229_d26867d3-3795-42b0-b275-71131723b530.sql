-- ============================================
-- 🌊 DATA OCEAN FUNCTIONS 🌊
-- ============================================

-- Smart entity resolution function
CREATE OR REPLACE FUNCTION smart_resolve_entity(
  p_name TEXT,
  p_type TEXT DEFAULT 'organization',
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_uei TEXT DEFAULT NULL,
  p_duns TEXT DEFAULT NULL,
  p_cage_code TEXT DEFAULT NULL,
  p_ein TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'api'
)
RETURNS UUID AS $$
DECLARE
  v_entity_id UUID;
  v_match_id UUID;
  v_confidence DECIMAL;
  v_normalized_name TEXT;
BEGIN
  v_normalized_name := UPPER(TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(p_name, '\s+(INC|LLC|CORP|CORPORATION|COMPANY|CO|LTD|LIMITED|LP|LLP|PC|PLLC)\.?$', '', 'gi'),
        '\s+', ' ', 'g'
      ),
      '[^A-Z0-9 ]', '', 'g'
    )
  ));

  -- Match by UEI
  IF p_uei IS NOT NULL AND LENGTH(p_uei) > 5 THEN
    SELECT entity_id INTO v_match_id FROM public.entity_identifiers 
    WHERE identifier_type = 'uei' AND identifier_value = p_uei LIMIT 1;
    
    IF v_match_id IS NULL THEN
      SELECT id INTO v_match_id FROM public.core_entities WHERE uei = p_uei AND is_canonical = true LIMIT 1;
    END IF;
    
    IF v_match_id IS NOT NULL THEN
      UPDATE public.core_entities SET
        cage_code = COALESCE(cage_code, p_cage_code),
        city = COALESCE(city, p_city),
        state = COALESCE(state, p_state),
        source_count = COALESCE(source_count, 0) + 1,
        updated_at = NOW()
      WHERE id = v_match_id;
      RETURN v_match_id;
    END IF;
  END IF;

  -- Match by CAGE code
  IF p_cage_code IS NOT NULL AND LENGTH(p_cage_code) >= 4 THEN
    SELECT id INTO v_match_id FROM public.core_entities WHERE cage_code = p_cage_code AND is_canonical = true LIMIT 1;
    IF v_match_id IS NOT NULL THEN
      UPDATE public.core_entities SET
        uei = COALESCE(uei, p_uei),
        source_count = COALESCE(source_count, 0) + 1,
        updated_at = NOW()
      WHERE id = v_match_id;
      RETURN v_match_id;
    END IF;
  END IF;

  -- Match by DUNS
  IF p_duns IS NOT NULL AND LENGTH(p_duns) >= 9 THEN
    SELECT id INTO v_match_id FROM public.core_entities WHERE duns = p_duns AND is_canonical = true LIMIT 1;
    IF v_match_id IS NOT NULL THEN
      UPDATE public.core_entities SET source_count = COALESCE(source_count, 0) + 1, updated_at = NOW() WHERE id = v_match_id;
      RETURN v_match_id;
    END IF;
  END IF;

  -- Exact alias match
  SELECT entity_id INTO v_match_id FROM public.entity_aliases WHERE LOWER(alias) = LOWER(p_name) LIMIT 1;
  IF v_match_id IS NOT NULL THEN
    UPDATE public.core_entities SET source_count = COALESCE(source_count, 0) + 1, updated_at = NOW() WHERE id = v_match_id;
    RETURN v_match_id;
  END IF;

  -- Fuzzy name match
  SELECT e.id, similarity(UPPER(e.canonical_name), v_normalized_name) as sim
  INTO v_match_id, v_confidence
  FROM public.core_entities e
  WHERE e.is_canonical = true AND similarity(UPPER(e.canonical_name), v_normalized_name) > 0.88
  ORDER BY sim DESC LIMIT 1;

  IF v_match_id IS NOT NULL THEN
    INSERT INTO public.entity_aliases (entity_id, alias, alias_type, confidence, source)
    VALUES (v_match_id, p_name, 'fuzzy_match', v_confidence, p_source) ON CONFLICT DO NOTHING;
    UPDATE public.core_entities SET source_count = COALESCE(source_count, 0) + 1, updated_at = NOW() WHERE id = v_match_id;
    RETURN v_match_id;
  END IF;

  -- Create new entity
  INSERT INTO public.core_entities (
    canonical_name, entity_type, city, state, country, uei, duns, cage_code, ein, source_count, data_quality_score, is_canonical
  ) VALUES (
    p_name, p_type, p_city, p_state, 'USA', p_uei, p_duns, p_cage_code, p_ein, 1,
    CASE WHEN p_uei IS NOT NULL THEN 90 WHEN p_cage_code IS NOT NULL THEN 85 WHEN p_duns IS NOT NULL THEN 80 ELSE 70 END, true
  ) RETURNING id INTO v_entity_id;

  INSERT INTO public.entity_aliases (entity_id, alias, alias_type, source) VALUES (v_entity_id, p_name, 'primary_name', p_source);
  IF p_uei IS NOT NULL THEN INSERT INTO public.entity_identifiers (entity_id, identifier_type, identifier_value, is_primary, source) VALUES (v_entity_id, 'uei', p_uei, true, p_source) ON CONFLICT DO NOTHING; END IF;
  IF p_duns IS NOT NULL THEN INSERT INTO public.entity_identifiers (entity_id, identifier_type, identifier_value, source) VALUES (v_entity_id, 'duns', p_duns, p_source) ON CONFLICT DO NOTHING; END IF;
  IF p_cage_code IS NOT NULL THEN INSERT INTO public.entity_identifiers (entity_id, identifier_type, identifier_value, source) VALUES (v_entity_id, 'cage', p_cage_code, p_source) ON CONFLICT DO NOTHING; END IF;

  RETURN v_entity_id;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Discover competitors
CREATE OR REPLACE FUNCTION discover_competitors()
RETURNS INTEGER AS $$
DECLARE
  discovered INTEGER := 0;
BEGIN
  INSERT INTO public.core_relationships (from_entity_id, to_entity_id, relationship_type, strength, evidence)
  SELECT DISTINCT c1.recipient_entity_id, c2.recipient_entity_id, 'competes_with', LEAST(1.0, 0.3 + (COUNT(*) * 0.05)),
    jsonb_build_object('shared_agencies', COUNT(DISTINCT c1.awarding_agency), 'source', 'auto_discovery')
  FROM public.contracts c1
  JOIN public.contracts c2 ON c1.awarding_agency = c2.awarding_agency AND c1.naics_code = c2.naics_code
    AND c1.recipient_entity_id != c2.recipient_entity_id AND c1.recipient_entity_id IS NOT NULL
    AND c2.recipient_entity_id IS NOT NULL AND c1.recipient_entity_id < c2.recipient_entity_id
  WHERE NOT EXISTS (SELECT 1 FROM public.core_relationships r
    WHERE ((r.from_entity_id = c1.recipient_entity_id AND r.to_entity_id = c2.recipient_entity_id)
       OR (r.from_entity_id = c2.recipient_entity_id AND r.to_entity_id = c1.recipient_entity_id)) AND r.relationship_type = 'competes_with')
  GROUP BY c1.recipient_entity_id, c2.recipient_entity_id HAVING COUNT(*) >= 2 LIMIT 5000;
  GET DIAGNOSTICS discovered = ROW_COUNT;
  RETURN discovered;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Discover geographic clusters
CREATE OR REPLACE FUNCTION discover_geographic_clusters()
RETURNS INTEGER AS $$
DECLARE discovered INTEGER := 0;
BEGIN
  INSERT INTO public.core_relationships (from_entity_id, to_entity_id, relationship_type, strength, evidence)
  SELECT DISTINCT e1.id, e2.id, 'co_located', 0.4, jsonb_build_object('city', e1.city, 'state', e1.state, 'source', 'auto_discovery')
  FROM public.core_entities e1
  JOIN public.core_entities e2 ON e1.city = e2.city AND e1.state = e2.state AND e1.entity_type = e2.entity_type
    AND e1.id < e2.id AND e1.is_canonical = true AND e2.is_canonical = true
  WHERE e1.city IS NOT NULL AND COALESCE(e1.total_contract_value, 0) > 100000 AND COALESCE(e2.total_contract_value, 0) > 100000
    AND NOT EXISTS (SELECT 1 FROM public.core_relationships r WHERE (r.from_entity_id = e1.id AND r.to_entity_id = e2.id) OR (r.from_entity_id = e2.id AND r.to_entity_id = e1.id))
  LIMIT 2000;
  GET DIAGNOSTICS discovered = ROW_COUNT;
  RETURN discovered;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Discover industry clusters
CREATE OR REPLACE FUNCTION discover_industry_clusters()
RETURNS INTEGER AS $$
DECLARE discovered INTEGER := 0;
BEGIN
  INSERT INTO public.core_relationships (from_entity_id, to_entity_id, relationship_type, strength, evidence)
  SELECT DISTINCT e1.id, e2.id, 'same_industry', 0.35, jsonb_build_object('source', 'auto_discovery')
  FROM public.core_entities e1
  JOIN public.core_entities e2 ON e1.naics_codes && e2.naics_codes AND e1.id < e2.id AND e1.is_canonical = true AND e2.is_canonical = true
  WHERE array_length(e1.naics_codes, 1) > 0 AND COALESCE(e1.total_contract_value, 0) > 500000 AND COALESCE(e2.total_contract_value, 0) > 500000
    AND NOT EXISTS (SELECT 1 FROM public.core_relationships r WHERE (r.from_entity_id = e1.id AND r.to_entity_id = e2.id) OR (r.from_entity_id = e2.id AND r.to_entity_id = e1.id))
  LIMIT 2000;
  GET DIAGNOSTICS discovered = ROW_COUNT;
  RETURN discovered;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Run all discovery
CREATE OR REPLACE FUNCTION run_all_discovery()
RETURNS JSONB AS $$
DECLARE result JSONB; competitors INTEGER; geographic INTEGER; industry INTEGER; start_time TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO public.derivation_runs (job_type, status) VALUES ('discovery', 'running');
  SELECT discover_competitors() INTO competitors;
  SELECT discover_geographic_clusters() INTO geographic;
  SELECT discover_industry_clusters() INTO industry;
  result := jsonb_build_object('competitors', competitors, 'geographic', geographic, 'industry', industry, 'total', competitors + geographic + industry, 'duration_ms', EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000);
  UPDATE public.derivation_runs SET status = 'completed', completed_at = NOW(), records_created = competitors + geographic + industry, details = result
  WHERE id = (SELECT id FROM public.derivation_runs WHERE job_type = 'discovery' AND status = 'running' ORDER BY started_at DESC LIMIT 1);
  INSERT INTO public.system_logs (level, component, message, details) VALUES ('INFO', 'discovery', 'Relationship discovery complete', result);
  RETURN result;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Generate insights
CREATE OR REPLACE FUNCTION generate_all_insights()
RETURNS JSONB AS $$
DECLARE result JSONB; high_value INTEGER := 0; trending INTEGER := 0;
BEGIN
  INSERT INTO public.derivation_runs (job_type, status) VALUES ('insights', 'running');
  
  INSERT INTO public.insights (insight_type, severity, title, description, entity_ids, evidence)
  SELECT 'high_value_contract', 'high', '🏆 Major Contract: ' || c.recipient_name,
    c.recipient_name || ' awarded $' || TO_CHAR(c.award_amount/1000000, 'FM999,999.99') || 'M by ' || c.awarding_agency,
    ARRAY[c.recipient_entity_id], jsonb_build_object('award_id', c.award_id, 'amount', c.award_amount, 'agency', c.awarding_agency)
  FROM public.contracts c
  WHERE c.award_amount > 10000000 AND c.created_at > NOW() - INTERVAL '7 days' AND c.recipient_entity_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.insights i WHERE i.evidence->>'award_id' = c.award_id) LIMIT 50;
  GET DIAGNOSTICS high_value = ROW_COUNT;

  INSERT INTO public.insights (insight_type, severity, title, description, entity_ids, evidence)
  SELECT 'trending_entity', 'medium', '📈 Trending: ' || e.canonical_name,
    e.canonical_name || ' has ' || e.contract_count || ' contracts totaling $' || TO_CHAR(e.total_contract_value/1000000, 'FM999.99') || 'M',
    ARRAY[e.id], jsonb_build_object('contracts', e.contract_count, 'value', e.total_contract_value)
  FROM public.core_entities e
  WHERE e.contract_count >= 5 AND e.total_contract_value > 5000000 AND e.updated_at > NOW() - INTERVAL '7 days' AND e.is_canonical = true
    AND NOT EXISTS (SELECT 1 FROM public.insights i WHERE i.entity_ids @> ARRAY[e.id] AND i.insight_type = 'trending_entity' AND i.created_at > NOW() - INTERVAL '7 days')
  ORDER BY e.total_contract_value DESC LIMIT 30;
  GET DIAGNOSTICS trending = ROW_COUNT;

  result := jsonb_build_object('high_value', high_value, 'trending', trending, 'total', high_value + trending);
  UPDATE public.derivation_runs SET status = 'completed', completed_at = NOW(), records_created = high_value + trending, details = result
  WHERE id = (SELECT id FROM public.derivation_runs WHERE job_type = 'insights' AND status = 'running' ORDER BY started_at DESC LIMIT 1);
  RETURN result;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Score all entities
CREATE OR REPLACE FUNCTION score_all_entities()
RETURNS INTEGER AS $$
DECLARE scored INTEGER := 0;
BEGIN
  UPDATE public.core_entities SET 
    opportunity_score = LEAST(100, GREATEST(0, (35 + LEAST(25, COALESCE(total_contract_value, 0) / 10000000) + LEAST(15, COALESCE(contract_count, 0) * 1.5) + LEAST(10, COALESCE(grant_count, 0) * 2) + CASE WHEN uei IS NOT NULL THEN 5 ELSE 0 END)))::INTEGER,
    data_quality_score = LEAST(100, GREATEST(0, (40 + CASE WHEN uei IS NOT NULL THEN 15 ELSE 0 END + CASE WHEN cage_code IS NOT NULL THEN 10 ELSE 0 END + CASE WHEN city IS NOT NULL THEN 5 ELSE 0 END + CASE WHEN state IS NOT NULL THEN 5 ELSE 0 END + CASE WHEN description IS NOT NULL THEN 10 ELSE 0 END)))::INTEGER,
    updated_at = NOW()
  WHERE is_canonical = true;
  GET DIAGNOSTICS scored = ROW_COUNT;
  RETURN scored;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Capture ocean health
CREATE OR REPLACE FUNCTION capture_ocean_health()
RETURNS UUID AS $$
DECLARE
  snapshot_id UUID;
  v_entities INTEGER; v_contracts INTEGER; v_grants INTEGER; v_opportunities INTEGER;
  v_facts INTEGER; v_relationships INTEGER; v_insights INTEGER; v_value DECIMAL;
  v_entities_hr INTEGER; v_contracts_hr INTEGER; v_quality DECIMAL;
  v_with_uei INTEGER; v_with_cage INTEGER;
  v_active INTEGER; v_healthy INTEGER; v_degraded INTEGER; v_failed INTEGER;
  v_pipeline INTEGER; v_fresh INTEGER; v_coverage INTEGER; v_overall INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_entities FROM public.core_entities WHERE is_canonical = true;
  SELECT COUNT(*), COALESCE(SUM(award_amount), 0) INTO v_contracts, v_value FROM public.contracts;
  SELECT COUNT(*) INTO v_grants FROM public.grants;
  SELECT COUNT(*) INTO v_opportunities FROM public.opportunities WHERE is_active = true;
  SELECT COUNT(*) INTO v_facts FROM public.core_facts;
  SELECT COUNT(*) INTO v_relationships FROM public.core_relationships;
  SELECT COUNT(*) INTO v_insights FROM public.insights WHERE created_at > NOW() - INTERVAL '7 days';
  SELECT COUNT(*) INTO v_entities_hr FROM public.core_entities WHERE created_at > NOW() - INTERVAL '1 hour';
  SELECT COUNT(*) INTO v_contracts_hr FROM public.contracts WHERE created_at > NOW() - INTERVAL '1 hour';
  SELECT AVG(data_quality_score) INTO v_quality FROM public.core_entities WHERE is_canonical AND data_quality_score IS NOT NULL;
  SELECT COUNT(*) INTO v_with_uei FROM public.core_entities WHERE uei IS NOT NULL AND is_canonical;
  SELECT COUNT(*) INTO v_with_cage FROM public.core_entities WHERE cage_code IS NOT NULL AND is_canonical;
  SELECT COUNT(*) INTO v_active FROM public.ingestion_sources WHERE is_active = true;
  SELECT COUNT(*) INTO v_healthy FROM public.ingestion_sources WHERE is_active AND COALESCE(consecutive_failures, 0) = 0;
  SELECT COUNT(*) INTO v_degraded FROM public.ingestion_sources WHERE is_active AND COALESCE(consecutive_failures, 0) BETWEEN 1 AND 4;
  SELECT COUNT(*) INTO v_failed FROM public.ingestion_sources WHERE is_active AND COALESCE(consecutive_failures, 0) >= 5;
  
  v_pipeline := LEAST(100, GREATEST(30, (COALESCE(v_healthy::DECIMAL / NULLIF(v_active, 0), 0.5) * 50) + CASE WHEN v_entities_hr + v_contracts_hr > 100 THEN 30 WHEN v_entities_hr + v_contracts_hr > 10 THEN 20 ELSE 10 END + CASE WHEN v_failed = 0 THEN 20 ELSE GREATEST(0, 20 - (v_failed * 4)) END))::INTEGER;
  v_fresh := LEAST(100, GREATEST(30, CASE WHEN v_contracts_hr > 50 THEN 50 WHEN v_contracts_hr > 10 THEN 35 WHEN v_contracts_hr > 0 THEN 20 ELSE 10 END + COALESCE(v_quality * 0.5, 25)))::INTEGER;
  v_coverage := LEAST(100, GREATEST(30, 30 + (SELECT COALESCE(COUNT(DISTINCT state), 0) FROM public.core_entities WHERE state IS NOT NULL) + LEAST(20, (SELECT COALESCE(COUNT(DISTINCT awarding_agency), 0) FROM public.contracts WHERE awarding_agency IS NOT NULL) / 5) + (COALESCE(v_with_uei::DECIMAL / NULLIF(v_entities, 0), 0) * 30)))::INTEGER;
  v_overall := ((v_pipeline + v_fresh + v_coverage) / 3)::INTEGER;

  INSERT INTO public.ocean_health_snapshots (
    total_entities, total_contracts, total_grants, total_opportunities, total_facts, total_relationships, total_insights,
    total_contract_value, entities_last_hour, contracts_last_hour, records_last_hour, avg_entity_quality, entities_with_uei, entities_with_cage,
    active_sources, healthy_sources, degraded_sources, failed_sources, pipeline_health_score, freshness_score, coverage_score, overall_health_score
  ) VALUES (
    v_entities, v_contracts, v_grants, v_opportunities, v_facts, v_relationships, v_insights,
    v_value, v_entities_hr, v_contracts_hr, v_entities_hr + v_contracts_hr, v_quality, v_with_uei, v_with_cage,
    v_active, v_healthy, v_degraded, v_failed, v_pipeline, v_fresh, v_coverage, v_overall
  ) RETURNING id INTO snapshot_id;
  
  RETURN snapshot_id;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Full ocean cycle
CREATE OR REPLACE FUNCTION run_full_ocean_cycle()
RETURNS JSONB AS $$
DECLARE result JSONB; discovery_result JSONB; insights_result JSONB; entities_scored INTEGER; health_id UUID;
BEGIN
  SELECT run_all_discovery() INTO discovery_result;
  SELECT generate_all_insights() INTO insights_result;
  SELECT score_all_entities() INTO entities_scored;
  SELECT capture_ocean_health() INTO health_id;
  result := jsonb_build_object('discovery', discovery_result, 'insights', insights_result, 'entities_scored', entities_scored, 'health_snapshot_id', health_id, 'timestamp', NOW());
  INSERT INTO public.system_logs (level, component, message, details) VALUES ('INFO', 'ocean_cycle', 'Full ocean cycle complete', result);
  RETURN result;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Current health view
CREATE OR REPLACE VIEW ocean_health_current AS SELECT * FROM public.ocean_health_snapshots ORDER BY snapshot_at DESC LIMIT 1;

-- Grant permissions
GRANT EXECUTE ON FUNCTION smart_resolve_entity TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION discover_competitors TO service_role;
GRANT EXECUTE ON FUNCTION discover_geographic_clusters TO service_role;
GRANT EXECUTE ON FUNCTION discover_industry_clusters TO service_role;
GRANT EXECUTE ON FUNCTION run_all_discovery TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION generate_all_insights TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION score_all_entities TO service_role;
GRANT EXECUTE ON FUNCTION capture_ocean_health TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION run_full_ocean_cycle TO anon, authenticated, service_role;
GRANT SELECT ON ocean_health_current TO anon, authenticated;