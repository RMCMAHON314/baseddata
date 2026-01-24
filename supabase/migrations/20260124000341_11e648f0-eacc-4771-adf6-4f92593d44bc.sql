-- ============================================================
-- 🦑 THE KRAKEN FLYWHEEL TABLES
-- Database infrastructure for the unstoppable data growth engine
-- ============================================================

-- Discovery Queue (Hunters put targets here, Crawlers process them)
CREATE TABLE IF NOT EXISTS flywheel_discovery_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_type VARCHAR(100) NOT NULL,
  target_source VARCHAR(100) NOT NULL,
  target_query JSONB NOT NULL,
  priority INTEGER DEFAULT 50,
  context JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  records_collected INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discovery_queue_status_priority ON flywheel_discovery_queue(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_discovery_queue_source ON flywheel_discovery_queue(target_source);
CREATE INDEX IF NOT EXISTS idx_discovery_queue_created ON flywheel_discovery_queue(created_at DESC);

-- Crawl Log (Track what crawlers have done)
CREATE TABLE IF NOT EXISTS flywheel_crawl_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crawler_type VARCHAR(100) NOT NULL,
  records_collected INTEGER DEFAULT 0,
  entities_created INTEGER DEFAULT 0,
  facts_extracted INTEGER DEFAULT 0,
  relationships_created INTEGER DEFAULT 0,
  duration_ms INTEGER,
  errors JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  crawled_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crawl_log_type ON flywheel_crawl_log(crawler_type);
CREATE INDEX IF NOT EXISTS idx_crawl_log_time ON flywheel_crawl_log(crawled_at DESC);

-- Collection Log (Track what was collected from each source)
CREATE TABLE IF NOT EXISTS flywheel_collection_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name VARCHAR(100) NOT NULL,
  pattern_signature VARCHAR(255),
  query_params JSONB,
  records_collected INTEGER DEFAULT 0,
  new_entities INTEGER DEFAULT 0,
  merged_entities INTEGER DEFAULT 0,
  collected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collection_source ON flywheel_collection_log(source_name);
CREATE INDEX IF NOT EXISTS idx_collection_pattern ON flywheel_collection_log(pattern_signature);

-- Source Health (Track API health and rate limits)
CREATE TABLE IF NOT EXISTS flywheel_source_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'healthy', -- healthy, degraded, down
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  avg_response_ms INTEGER,
  rate_limit_remaining INTEGER,
  rate_limit_reset_at TIMESTAMPTZ,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE flywheel_discovery_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE flywheel_crawl_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE flywheel_collection_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE flywheel_source_health ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow service role full access, read-only for anon)
CREATE POLICY "Service role full access discovery_queue" ON flywheel_discovery_queue FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access crawl_log" ON flywheel_crawl_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access collection_log" ON flywheel_collection_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access source_health" ON flywheel_source_health FOR ALL USING (true) WITH CHECK (true);

-- Helper Functions
CREATE OR REPLACE FUNCTION count_unresolved_records()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::integer FROM records WHERE entity_id IS NULL;
$$ LANGUAGE sql STABLE;

-- Find underexplored areas with high query demand
CREATE OR REPLACE FUNCTION find_underexplored_areas()
RETURNS TABLE(
  name TEXT,
  query_count BIGINT,
  entity_count BIGINT,
  missing_categories TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH category_coverage AS (
    SELECT 
      COALESCE(r.state, 'Unknown') as area,
      array_agg(DISTINCT r.category) as categories
    FROM records r
    GROUP BY COALESCE(r.state, 'Unknown')
  ),
  all_categories AS (
    SELECT unnest(ARRAY['Healthcare', 'Government', 'Education', 'Financial', 'Transportation', 'Recreation']) as category
  )
  SELECT 
    cc.area::text as name,
    (SELECT COUNT(*) FROM nl_queries WHERE LOWER(natural_query) LIKE '%' || LOWER(cc.area) || '%')::bigint as query_count,
    (SELECT COUNT(*) FROM core_entities WHERE LOWER(state) = LOWER(cc.area))::bigint as entity_count,
    (SELECT array_agg(ac.category) FROM all_categories ac WHERE ac.category != ALL(cc.categories))::text[] as missing_categories
  FROM category_coverage cc
  WHERE array_length(cc.categories, 1) < 6
  ORDER BY query_count DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE;

-- Find low coverage areas (counties with few records)
CREATE OR REPLACE FUNCTION find_low_coverage_areas()
RETURNS TABLE(
  area_name TEXT,
  record_count BIGINT,
  categories TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(city, state, 'Unknown') as area_name,
    COUNT(*)::bigint as record_count,
    array_agg(DISTINCT category) as categories
  FROM records
  WHERE city IS NOT NULL OR state IS NOT NULL
  GROUP BY COALESCE(city, state, 'Unknown')
  HAVING COUNT(*) < 50
  ORDER BY record_count ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;

-- Queue a discovery from hunters
CREATE OR REPLACE FUNCTION queue_kraken_discovery(
  p_discovery_type TEXT,
  p_target_source TEXT,
  p_target_query JSONB,
  p_priority INTEGER DEFAULT 50,
  p_context JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Check for duplicates in last hour
  SELECT id INTO v_id
  FROM flywheel_discovery_queue
  WHERE target_source = p_target_source
    AND target_query = p_target_query
    AND created_at > NOW() - INTERVAL '1 hour'
  LIMIT 1;
  
  IF v_id IS NOT NULL THEN
    RETURN v_id; -- Already queued
  END IF;
  
  INSERT INTO flywheel_discovery_queue (discovery_type, target_source, target_query, priority, context)
  VALUES (p_discovery_type, p_target_source, p_target_query, p_priority, p_context)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Log a crawl result
CREATE OR REPLACE FUNCTION log_kraken_crawl(
  p_crawler_type TEXT,
  p_records INTEGER DEFAULT 0,
  p_entities INTEGER DEFAULT 0,
  p_facts INTEGER DEFAULT 0,
  p_relationships INTEGER DEFAULT 0,
  p_duration_ms INTEGER DEFAULT 0,
  p_errors JSONB DEFAULT '[]',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO flywheel_crawl_log (
    crawler_type, records_collected, entities_created, 
    facts_extracted, relationships_created, duration_ms, errors, metadata
  )
  VALUES (
    p_crawler_type, p_records, p_entities, 
    p_facts, p_relationships, p_duration_ms, p_errors, p_metadata
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Update source health
CREATE OR REPLACE FUNCTION update_source_health(
  p_source_name TEXT,
  p_success BOOLEAN,
  p_response_ms INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO flywheel_source_health (source_name, status, last_success_at, success_count, avg_response_ms)
  VALUES (
    p_source_name, 
    CASE WHEN p_success THEN 'healthy' ELSE 'degraded' END,
    CASE WHEN p_success THEN NOW() ELSE NULL END,
    CASE WHEN p_success THEN 1 ELSE 0 END,
    p_response_ms
  )
  ON CONFLICT (source_name) DO UPDATE SET
    status = CASE 
      WHEN p_success THEN 'healthy'
      WHEN flywheel_source_health.failure_count >= 5 THEN 'down'
      ELSE 'degraded'
    END,
    last_success_at = CASE WHEN p_success THEN NOW() ELSE flywheel_source_health.last_success_at END,
    last_failure_at = CASE WHEN NOT p_success THEN NOW() ELSE flywheel_source_health.last_failure_at END,
    success_count = CASE WHEN p_success THEN flywheel_source_health.success_count + 1 ELSE flywheel_source_health.success_count END,
    failure_count = CASE WHEN NOT p_success THEN flywheel_source_health.failure_count + 1 ELSE 0 END,
    avg_response_ms = COALESCE(
      (flywheel_source_health.avg_response_ms * flywheel_source_health.success_count + COALESCE(p_response_ms, 0)) / (flywheel_source_health.success_count + 1),
      p_response_ms
    ),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;