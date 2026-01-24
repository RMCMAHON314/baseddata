-- Fix get_system_health to use correct column name
DROP FUNCTION IF EXISTS public.get_system_health();

CREATE OR REPLACE FUNCTION public.get_system_health()
RETURNS TABLE(
  health_score INT, system_status TEXT, entities BIGINT, facts BIGINT,
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
  SELECT COUNT(*) INTO v_queue_depth FROM flywheel_discovery_queue fdq WHERE fdq.status = 'pending';
  SELECT COUNT(*) INTO v_records FROM records;
  -- Use entity_id instead of resolved_entity_id (based on actual schema)
  SELECT COUNT(*) INTO v_resolved FROM records WHERE entity_id IS NOT NULL;
  
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