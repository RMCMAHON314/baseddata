-- ═══════════════════════════════════════════════════════════════════════════
-- THE INFINITE ALGORITHM - SQL FOUNDATION v1.0
-- A self-perpetuating, ever-expanding data intelligence system
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. METRICS TABLE FOR SELF-MONITORING
CREATE TABLE IF NOT EXISTS public.algorithm_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_timestamp TIMESTAMPTZ DEFAULT NOW(),
  duration_ms INTEGER,
  entities_expanded INTEGER DEFAULT 0,
  facts_enriched INTEGER DEFAULT 0,
  relationships_discovered INTEGER DEFAULT 0,
  insights_generated INTEGER DEFAULT 0,
  sources_discovered INTEGER DEFAULT 0,
  queue_additions INTEGER DEFAULT 0,
  queue_processed INTEGER DEFAULT 0,
  total_entities INTEGER,
  total_facts INTEGER,
  total_relationships INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.algorithm_metrics ENABLE ROW LEVEL SECURITY;

-- Allow public read access for dashboard
CREATE POLICY "Algorithm metrics are publicly readable"
  ON public.algorithm_metrics FOR SELECT
  USING (true);

-- 2. FLYWHEEL DISCOVERY QUEUE (if not exists)
CREATE TABLE IF NOT EXISTS public.flywheel_discovery_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL,
  target_value TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  priority INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  result_count INTEGER,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(target_type, target_value)
);

-- Enable RLS
ALTER TABLE public.flywheel_discovery_queue ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Discovery queue is publicly readable"
  ON public.flywheel_discovery_queue FOR SELECT
  USING (true);

-- 3. GET UNDER-EXPLORED ENTITIES
CREATE OR REPLACE FUNCTION public.get_under_explored_entities(
  min_relationships INTEGER DEFAULT 5,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  canonical_name TEXT,
  entity_type TEXT,
  opportunity_score INTEGER,
  relationship_count BIGINT,
  fact_count BIGINT,
  state TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.canonical_name,
    e.entity_type,
    COALESCE(e.opportunity_score, 50)::INTEGER as opportunity_score,
    COALESCE(rel.cnt, 0)::BIGINT as relationship_count,
    COALESCE(fct.cnt, 0)::BIGINT as fact_count,
    COALESCE(e.state, 'Unknown') as state
  FROM public.core_entities e
  LEFT JOIN (
    SELECT from_entity_id, COUNT(*) as cnt 
    FROM public.core_relationships 
    GROUP BY from_entity_id
  ) rel ON e.id = rel.from_entity_id
  LEFT JOIN (
    SELECT entity_id, COUNT(*) as cnt 
    FROM public.core_facts 
    GROUP BY entity_id
  ) fct ON e.id = fct.entity_id
  WHERE COALESCE(rel.cnt, 0) < min_relationships
  ORDER BY COALESCE(e.opportunity_score, 50) DESC, COALESCE(rel.cnt, 0) ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. GET FACT-POOR ENTITIES
CREATE OR REPLACE FUNCTION public.get_fact_poor_entities(
  min_facts INTEGER DEFAULT 3,
  min_opportunity_score INTEGER DEFAULT 50,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  canonical_name TEXT,
  entity_type TEXT,
  opportunity_score INTEGER,
  fact_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.canonical_name,
    e.entity_type,
    COALESCE(e.opportunity_score, 50)::INTEGER as opportunity_score,
    COALESCE(fct.cnt, 0)::BIGINT as fact_count
  FROM public.core_entities e
  LEFT JOIN (
    SELECT entity_id, COUNT(*) as cnt 
    FROM public.core_facts 
    GROUP BY entity_id
  ) fct ON e.id = fct.entity_id
  WHERE COALESCE(fct.cnt, 0) < min_facts
  AND COALESCE(e.opportunity_score, 50) >= min_opportunity_score
  ORDER BY COALESCE(e.opportunity_score, 50) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. DISCOVER TRANSITIVE RELATIONSHIPS (A→B, B→C implies A→C)
CREATE OR REPLACE FUNCTION public.discover_transitive_relationships(
  min_strength DECIMAL DEFAULT 0.5,
  limit_count INTEGER DEFAULT 100
)
RETURNS TABLE(
  from_entity_id UUID,
  to_entity_id UUID,
  via_entity_id UUID,
  via_type TEXT,
  inferred_strength DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    r1.from_entity_id,
    r2.to_entity_id,
    r1.to_entity_id as via_entity_id,
    r1.relationship_type as via_type,
    (COALESCE(r1.strength, 0.5) * COALESCE(r2.strength, 0.5) * 0.7)::DECIMAL as inferred_strength
  FROM public.core_relationships r1
  JOIN public.core_relationships r2 ON r1.to_entity_id = r2.from_entity_id
  WHERE r1.from_entity_id != r2.to_entity_id
  AND COALESCE(r1.strength, 0.5) >= min_strength
  AND COALESCE(r2.strength, 0.5) >= min_strength
  AND NOT EXISTS (
    SELECT 1 FROM public.core_relationships existing
    WHERE existing.from_entity_id = r1.from_entity_id
    AND existing.to_entity_id = r2.to_entity_id
  )
  ORDER BY (COALESCE(r1.strength, 0.5) * COALESCE(r2.strength, 0.5)) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. DETECT ANOMALIES
CREATE OR REPLACE FUNCTION public.detect_anomalies(
  lookback_days INTEGER DEFAULT 7,
  threshold_multiplier DECIMAL DEFAULT 2.0
)
RETURNS TABLE(
  entity_id UUID,
  entity_name TEXT,
  anomaly_type TEXT,
  description TEXT,
  confidence DECIMAL,
  details JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as entity_id,
    e.canonical_name as entity_name,
    'activity_spike'::TEXT as anomaly_type,
    format('Unusual %s%% increase in data points for %s', 
           ROUND(((new_facts.new_cnt::DECIMAL / NULLIF(old_facts.old_cnt, 0)) - 1) * 100),
           e.canonical_name
    ) as description,
    0.8::DECIMAL as confidence,
    jsonb_build_object(
      'new_count', new_facts.new_cnt,
      'old_count', old_facts.old_cnt,
      'increase_pct', ROUND(((new_facts.new_cnt::DECIMAL / NULLIF(old_facts.old_cnt, 0)) - 1) * 100)
    ) as details
  FROM public.core_entities e
  JOIN (
    SELECT f.entity_id, COUNT(*) as new_cnt 
    FROM public.core_facts f 
    WHERE f.created_at > NOW() - (lookback_days || ' days')::INTERVAL
    GROUP BY f.entity_id
  ) new_facts ON e.id = new_facts.entity_id
  LEFT JOIN (
    SELECT f.entity_id, COUNT(*) as old_cnt 
    FROM public.core_facts f 
    WHERE f.created_at BETWEEN NOW() - (lookback_days * 2 || ' days')::INTERVAL 
                         AND NOW() - (lookback_days || ' days')::INTERVAL
    GROUP BY f.entity_id
  ) old_facts ON e.id = old_facts.entity_id
  WHERE COALESCE(old_facts.old_cnt, 1) > 0
  AND new_facts.new_cnt > COALESCE(old_facts.old_cnt, 1) * threshold_multiplier
  ORDER BY (new_facts.new_cnt::DECIMAL / NULLIF(old_facts.old_cnt, 1)) DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. GENERATE MARKET INSIGHTS
CREATE OR REPLACE FUNCTION public.generate_market_insights()
RETURNS TABLE(
  market_category TEXT,
  market_state TEXT,
  description TEXT,
  data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.category as market_category,
    COALESCE(r.properties->>'state', 'Unknown') as market_state,
    format('%s market in %s: %s entities, $%sM total value',
           r.category,
           COALESCE(r.properties->>'state', 'Unknown'),
           COUNT(DISTINCT r.entity_id),
           ROUND(SUM(COALESCE((r.properties->>'award_amount')::NUMERIC, 0)) / 1000000, 1)
    ) as description,
    jsonb_build_object(
      'entity_count', COUNT(DISTINCT r.entity_id),
      'record_count', COUNT(*),
      'total_value', SUM(COALESCE((r.properties->>'award_amount')::NUMERIC, 0)),
      'avg_value', AVG(COALESCE((r.properties->>'award_amount')::NUMERIC, 0))
    ) as data
  FROM public.records r
  WHERE r.collected_at > NOW() - INTERVAL '30 days'
  AND r.category IS NOT NULL
  GROUP BY r.category, r.properties->>'state'
  HAVING COUNT(DISTINCT r.entity_id) >= 3
  ORDER BY SUM(COALESCE((r.properties->>'award_amount')::NUMERIC, 0)) DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RECALCULATE OPPORTUNITY SCORES
CREATE OR REPLACE FUNCTION public.recalculate_opportunity_scores(
  lookback_days INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.core_entities e
  SET 
    opportunity_score = LEAST(100, GREATEST(0,
      COALESCE(e.opportunity_score, 50) * 0.6 +
      (
        SELECT COALESCE(
          LEAST(30, COUNT(DISTINCT f.id) * 2) +
          LEAST(20, (SELECT COUNT(*) FROM public.core_relationships WHERE from_entity_id = e.id) * 1.5) +
          CASE WHEN COUNT(DISTINCT f.source_name) > 2 THEN 10 ELSE 0 END +
          CASE WHEN MAX(f.created_at) > NOW() - INTERVAL '7 days' THEN 10 ELSE 0 END,
          0
        )
        FROM public.core_facts f
        WHERE f.entity_id = e.id
      )::INTEGER * 0.4
    ))::INTEGER,
    updated_at = NOW()
  WHERE e.id IN (
    SELECT DISTINCT entity_id 
    FROM public.core_facts 
    WHERE created_at > NOW() - (lookback_days || ' days')::INTERVAL
  );
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. ENTITY EXPANSION TRIGGER
CREATE OR REPLACE FUNCTION public.trigger_entity_expansion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.flywheel_discovery_queue (target_type, target_value, source, priority, status)
  VALUES 
    ('name_variation', NEW.canonical_name || ' Inc', 'auto_expansion', 2, 'pending'),
    ('name_variation', NEW.canonical_name || ' LLC', 'auto_expansion', 2, 'pending'),
    ('industry_peer', NEW.entity_type || ' companies', 'auto_expansion', 3, 'pending'),
    ('competitor', NEW.canonical_name || ' competitors', 'auto_expansion', 2, 'pending')
  ON CONFLICT (target_type, target_value) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS entity_expansion_trigger ON public.core_entities;
CREATE TRIGGER entity_expansion_trigger
  AFTER INSERT ON public.core_entities
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_entity_expansion();

-- 10. FACT TRIGGERS ENRICHMENT
CREATE OR REPLACE FUNCTION public.trigger_fact_enrichment()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.fact_value->>'amount')::NUMERIC > 100000 THEN
    INSERT INTO public.flywheel_discovery_queue (target_type, target_value, source, priority, status, metadata)
    SELECT 
      'related_facts',
      e.canonical_name || ' ' || 
        CASE NEW.fact_type 
          WHEN 'contract_awarded' THEN 'other contracts'
          WHEN 'grant_received' THEN 'other grants'
          WHEN 'payment_received' THEN 'other payments'
          ELSE 'related data'
        END,
      'fact_enrichment',
      1,
      'pending',
      jsonb_build_object('source_fact_id', NEW.id, 'entity_id', NEW.entity_id)
    FROM public.core_entities e
    WHERE e.id = NEW.entity_id
    ON CONFLICT (target_type, target_value) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS fact_enrichment_trigger ON public.core_facts;
CREATE TRIGGER fact_enrichment_trigger
  AFTER INSERT ON public.core_facts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_fact_enrichment();

-- 11. RELATIONSHIP DISCOVERY CASCADE
CREATE OR REPLACE FUNCTION public.trigger_relationship_cascade()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(NEW.strength, 0.5) >= 0.6 THEN
    INSERT INTO public.flywheel_discovery_queue (target_type, target_value, source, priority, status, metadata)
    SELECT 
      'transitive_relationship',
      e.canonical_name || ' connections',
      'relationship_cascade',
      2,
      'pending',
      jsonb_build_object('via_entity_id', NEW.to_entity_id, 'source_relationship_id', NEW.id)
    FROM public.core_entities e
    WHERE e.id = NEW.from_entity_id
    ON CONFLICT (target_type, target_value) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS relationship_cascade_trigger ON public.core_relationships;
CREATE TRIGGER relationship_cascade_trigger
  AFTER INSERT ON public.core_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_relationship_cascade();

-- 12. INFINITE ALGORITHM STATUS VIEW
CREATE OR REPLACE VIEW public.infinite_algorithm_status AS
SELECT 
  (SELECT COUNT(*) FROM public.core_entities) as total_entities,
  (SELECT COUNT(*) FROM public.core_facts) as total_facts,
  (SELECT COUNT(*) FROM public.core_relationships) as total_relationships,
  (SELECT COUNT(*) FROM public.core_derived_insights) as total_insights,
  (SELECT COUNT(*) FROM public.flywheel_discovery_queue WHERE status = 'pending') as queue_pending,
  (SELECT COUNT(*) FROM public.flywheel_discovery_queue WHERE status = 'processing') as queue_processing,
  (SELECT COUNT(*) FROM public.flywheel_discovery_queue WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '24 hours') as completed_24h,
  (SELECT ROUND(AVG(opportunity_score)::numeric, 1) FROM public.core_entities WHERE opportunity_score IS NOT NULL) as avg_opportunity_score,
  (SELECT MAX(cycle_timestamp) FROM public.algorithm_metrics) as last_cycle,
  (SELECT duration_ms FROM public.algorithm_metrics ORDER BY cycle_timestamp DESC LIMIT 1) as last_cycle_duration,
  (SELECT COALESCE(SUM(entities_expanded), 0) FROM public.algorithm_metrics WHERE cycle_timestamp > NOW() - INTERVAL '24 hours') as entities_expanded_24h,
  (SELECT COALESCE(SUM(facts_enriched), 0) FROM public.algorithm_metrics WHERE cycle_timestamp > NOW() - INTERVAL '24 hours') as facts_enriched_24h,
  (SELECT COALESCE(SUM(relationships_discovered), 0) FROM public.algorithm_metrics WHERE cycle_timestamp > NOW() - INTERVAL '24 hours') as relationships_discovered_24h,
  (SELECT COALESCE(SUM(insights_generated), 0) FROM public.algorithm_metrics WHERE cycle_timestamp > NOW() - INTERVAL '24 hours') as insights_generated_24h;

-- Grant access to the status view
GRANT SELECT ON public.infinite_algorithm_status TO anon, authenticated;