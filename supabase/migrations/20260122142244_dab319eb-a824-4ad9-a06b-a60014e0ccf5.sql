-- BASED DATA v6.0 - Auto-Crawler & Master Dataset Infrastructure
-- Self-growing, ever-evolving unified data platform

-- ==============================================================================
-- AUTO-CRAWLERS: Autonomous data discovery agents
-- ==============================================================================

CREATE TABLE public.auto_crawlers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Crawler configuration
  crawler_type TEXT NOT NULL DEFAULT 'pattern', -- 'pattern', 'similarity', 'expansion', 'firecrawl'
  target_patterns JSONB NOT NULL DEFAULT '[]'::jsonb, -- URL patterns, data patterns to look for
  similarity_config JSONB DEFAULT '{}'::jsonb, -- Config for similarity-based discovery
  
  -- Firecrawl integration
  firecrawl_config JSONB DEFAULT NULL, -- { mode: 'scrape'|'map'|'crawl', options: {} }
  
  -- Categories and keywords to expand
  target_categories TEXT[] NOT NULL DEFAULT '{}',
  expansion_keywords TEXT[] NOT NULL DEFAULT '{}',
  
  -- Scheduling
  schedule_cron TEXT NOT NULL DEFAULT '0 */6 * * *', -- Every 6 hours default
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  
  -- Performance tracking
  total_runs INTEGER NOT NULL DEFAULT 0,
  total_records_discovered BIGINT NOT NULL DEFAULT 0,
  total_sources_found INTEGER NOT NULL DEFAULT 0,
  success_rate DOUBLE PRECISION DEFAULT 1.0,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- CRAWLER RUNS: Track each crawler execution
-- ==============================================================================

CREATE TABLE public.crawler_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crawler_id UUID REFERENCES public.auto_crawlers(id) ON DELETE CASCADE,
  
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
  
  -- Results
  urls_discovered TEXT[] DEFAULT '{}',
  sources_discovered JSONB DEFAULT '[]'::jsonb, -- New API sources found
  records_collected INTEGER DEFAULT 0,
  new_collectors_created INTEGER DEFAULT 0,
  
  -- Metrics
  processing_time_ms INTEGER,
  error_message TEXT,
  
  -- Discovery details
  discovery_log JSONB DEFAULT '[]'::jsonb
);

-- ==============================================================================
-- DISCOVERED SOURCES: Sources found by crawlers for human review or auto-activation
-- ==============================================================================

CREATE TABLE public.discovered_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  discovered_by_crawler_id UUID REFERENCES public.auto_crawlers(id) ON DELETE SET NULL,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Source info
  name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  api_endpoint TEXT,
  documentation_url TEXT,
  
  -- Classification
  inferred_categories TEXT[] NOT NULL DEFAULT '{}',
  inferred_keywords TEXT[] NOT NULL DEFAULT '{}',
  data_type TEXT, -- 'api', 'dataset', 'webpage', 'pdf', 'csv'
  
  -- Quality indicators
  quality_score DOUBLE PRECISION DEFAULT 0.5,
  last_validated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  -- Auto-collector generation
  auto_collector_id UUID REFERENCES public.dynamic_collectors(id) ON DELETE SET NULL,
  collector_generated BOOLEAN DEFAULT false,
  
  -- Review status
  review_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'auto_approved'
  reviewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(url)
);

-- ==============================================================================
-- DATA EXPANSION RULES: Define how the master dataset should grow
-- ==============================================================================

CREATE TABLE public.expansion_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Rule type
  rule_type TEXT NOT NULL, -- 'category_gap', 'geographic_gap', 'temporal_gap', 'quality_improvement'
  
  -- Rule configuration
  trigger_condition JSONB NOT NULL, -- When to trigger expansion
  expansion_strategy JSONB NOT NULL, -- How to expand
  
  -- Targeting
  target_categories TEXT[],
  target_regions TEXT[],
  
  -- Priority and limits
  priority INTEGER DEFAULT 5,
  max_records_per_run INTEGER DEFAULT 1000,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  times_triggered INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- MASTER DATASET STATS: Track the growth of the unified dataset
-- ==============================================================================

CREATE TABLE public.master_dataset_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Counts
  total_records BIGINT NOT NULL DEFAULT 0,
  total_sources INTEGER NOT NULL DEFAULT 0,
  total_categories INTEGER NOT NULL DEFAULT 0,
  
  -- Category breakdown
  records_by_category JSONB DEFAULT '{}'::jsonb,
  
  -- Source breakdown
  records_by_source JSONB DEFAULT '{}'::jsonb,
  
  -- Quality metrics
  avg_quality_score DOUBLE PRECISION DEFAULT 0.5,
  records_with_high_quality BIGINT DEFAULT 0, -- quality > 0.8
  
  -- Geographic coverage
  bounding_box JSONB, -- Overall bbox
  geographic_coverage JSONB DEFAULT '{}'::jsonb, -- By region/country
  
  -- Temporal coverage
  oldest_record_at TIMESTAMPTZ,
  newest_record_at TIMESTAMPTZ,
  
  -- Growth metrics
  records_added_today INTEGER DEFAULT 0,
  records_added_this_week INTEGER DEFAULT 0,
  records_added_this_month INTEGER DEFAULT 0
);

-- ==============================================================================
-- USER QUERY PATTERNS: Learn from user queries to guide expansion
-- ==============================================================================

ALTER TABLE public.query_patterns 
ADD COLUMN IF NOT EXISTS expansion_priority INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS should_auto_expand BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_expansion_at TIMESTAMPTZ;

-- ==============================================================================
-- INDEXES
-- ==============================================================================

CREATE INDEX idx_auto_crawlers_active ON public.auto_crawlers(is_active) WHERE is_active = true;
CREATE INDEX idx_auto_crawlers_next_run ON public.auto_crawlers(next_run_at) WHERE is_active = true;
CREATE INDEX idx_crawler_runs_crawler ON public.crawler_runs(crawler_id);
CREATE INDEX idx_crawler_runs_status ON public.crawler_runs(status);
CREATE INDEX idx_discovered_sources_review ON public.discovered_sources(review_status);
CREATE INDEX idx_discovered_sources_categories ON public.discovered_sources USING GIN(inferred_categories);
CREATE INDEX idx_expansion_rules_active ON public.expansion_rules(is_active, priority);
CREATE INDEX idx_master_stats_time ON public.master_dataset_stats(recorded_at DESC);

-- ==============================================================================
-- RLS POLICIES
-- ==============================================================================

ALTER TABLE public.auto_crawlers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawler_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovered_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expansion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_dataset_stats ENABLE ROW LEVEL SECURITY;

-- Public read for all (data is shared)
CREATE POLICY "Anyone can read auto crawlers" ON public.auto_crawlers FOR SELECT USING (true);
CREATE POLICY "Anyone can read crawler runs" ON public.crawler_runs FOR SELECT USING (true);
CREATE POLICY "Anyone can read discovered sources" ON public.discovered_sources FOR SELECT USING (true);
CREATE POLICY "Anyone can read expansion rules" ON public.expansion_rules FOR SELECT USING (true);
CREATE POLICY "Anyone can read master stats" ON public.master_dataset_stats FOR SELECT USING (true);

-- ==============================================================================
-- FUNCTIONS
-- ==============================================================================

-- Function to record master dataset stats (called periodically)
CREATE OR REPLACE FUNCTION public.record_master_dataset_stats()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id UUID;
  v_total_records BIGINT;
  v_total_sources INTEGER;
  v_by_category JSONB;
  v_by_source JSONB;
  v_avg_quality DOUBLE PRECISION;
BEGIN
  -- Get total records
  SELECT COUNT(*) INTO v_total_records FROM public.records;
  
  -- Get unique sources
  SELECT COUNT(DISTINCT source_id) INTO v_total_sources FROM public.records;
  
  -- Records by category
  SELECT jsonb_object_agg(category, cnt) INTO v_by_category
  FROM (SELECT category, COUNT(*) as cnt FROM public.records GROUP BY category) t;
  
  -- Records by source
  SELECT jsonb_object_agg(source_id, cnt) INTO v_by_source
  FROM (SELECT source_id, COUNT(*) as cnt FROM public.records GROUP BY source_id LIMIT 100) t;
  
  -- Average quality
  SELECT AVG(quality_score) INTO v_avg_quality FROM public.records;
  
  INSERT INTO public.master_dataset_stats (
    total_records, total_sources, total_categories,
    records_by_category, records_by_source, avg_quality_score,
    records_with_high_quality,
    oldest_record_at, newest_record_at,
    records_added_today, records_added_this_week, records_added_this_month
  ) VALUES (
    v_total_records,
    v_total_sources,
    (SELECT COUNT(DISTINCT category) FROM public.records),
    COALESCE(v_by_category, '{}'::jsonb),
    COALESCE(v_by_source, '{}'::jsonb),
    COALESCE(v_avg_quality, 0.5),
    (SELECT COUNT(*) FROM public.records WHERE quality_score > 0.8),
    (SELECT MIN(collected_at) FROM public.records),
    (SELECT MAX(collected_at) FROM public.records),
    (SELECT COUNT(*) FROM public.records WHERE collected_at > CURRENT_DATE),
    (SELECT COUNT(*) FROM public.records WHERE collected_at > CURRENT_DATE - INTERVAL '7 days'),
    (SELECT COUNT(*) FROM public.records WHERE collected_at > CURRENT_DATE - INTERVAL '30 days')
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Function to calculate next crawler run time
CREATE OR REPLACE FUNCTION public.calculate_crawler_next_run(p_crawler_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cron TEXT;
  v_next TIMESTAMPTZ;
BEGIN
  SELECT schedule_cron INTO v_cron FROM public.auto_crawlers WHERE id = p_crawler_id;
  
  -- Use existing calculate_next_run function
  v_next := public.calculate_next_run(v_cron);
  
  UPDATE public.auto_crawlers SET next_run_at = v_next WHERE id = p_crawler_id;
  
  RETURN v_next;
END;
$$;

-- Trigger to update timestamps
CREATE TRIGGER update_auto_crawlers_updated_at
  BEFORE UPDATE ON public.auto_crawlers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discovered_sources_updated_at
  BEFORE UPDATE ON public.discovered_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expansion_rules_updated_at
  BEFORE UPDATE ON public.expansion_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();