-- ============================================================================
-- BASED DATA v7.0 - CONTINUOUS DISCOVERY ENGINE SCHEMA
-- The Discovery Flywheel: User queries → Gap detection → AI Genesis → Growth
-- ============================================================================

-- ============================================================================
-- SOURCE DISCOVERIES TABLE - The Discovery Queue
-- Unified queue for all discovery triggers (user queries, AI analysis, crawlers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.source_discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Discovery trigger context
  trigger_type TEXT NOT NULL DEFAULT 'user_query', -- 'user_query', 'gap_analysis', 'crawler', 'ai_suggestion', 'manual'
  trigger_id UUID, -- Reference to triggering query, crawler run, etc.
  trigger_prompt TEXT, -- Original prompt that triggered discovery
  
  -- Discovery target
  target_api_url TEXT,
  target_api_name TEXT NOT NULL,
  target_description TEXT,
  target_documentation_url TEXT,
  
  -- AI-inferred metadata
  inferred_categories TEXT[] NOT NULL DEFAULT '{}',
  inferred_keywords TEXT[] NOT NULL DEFAULT '{}',
  confidence_score DOUBLE PRECISION DEFAULT 0.5,
  
  -- Priority and scheduling
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  estimated_value_score DOUBLE PRECISION DEFAULT 0.5, -- Based on query frequency, data gap, etc.
  
  -- Processing status
  status TEXT DEFAULT 'pending', -- 'pending', 'validating', 'generating', 'testing', 'approved', 'rejected', 'failed'
  validation_result JSONB DEFAULT '{}',
  
  -- Generated collector (if successful)
  generated_collector_id UUID REFERENCES public.dynamic_collectors(id),
  generation_attempts INTEGER DEFAULT 0,
  last_generation_at TIMESTAMPTZ,
  
  -- Lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  
  -- Error tracking
  error_message TEXT,
  error_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.source_discoveries ENABLE ROW LEVEL SECURITY;

-- Anyone can read discoveries (transparency)
CREATE POLICY "Anyone can read source discoveries" 
ON public.source_discoveries 
FOR SELECT 
USING (true);

-- ============================================================================
-- DISCOVERY METRICS TABLE - Track Discovery Engine Performance
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.discovery_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Discovery funnel metrics
  discoveries_queued INTEGER DEFAULT 0,
  discoveries_validated INTEGER DEFAULT 0,
  collectors_generated INTEGER DEFAULT 0,
  collectors_approved INTEGER DEFAULT 0,
  collectors_failed INTEGER DEFAULT 0,
  
  -- Quality metrics
  avg_confidence_score DOUBLE PRECISION DEFAULT 0.0,
  avg_generation_time_ms INTEGER DEFAULT 0,
  
  -- Source expansion
  new_sources_added INTEGER DEFAULT 0,
  records_from_new_sources BIGINT DEFAULT 0,
  
  -- Gap analysis
  gaps_identified INTEGER DEFAULT 0,
  gaps_filled INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(date)
);

ALTER TABLE public.discovery_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read discovery metrics" ON public.discovery_metrics FOR SELECT USING (true);

-- ============================================================================
-- GAP ANALYSIS RESULTS TABLE - Track What's Missing
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gap_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Gap identification
  gap_type TEXT NOT NULL, -- 'categorical', 'geographic', 'temporal', 'semantic'
  gap_description TEXT NOT NULL,
  
  -- Gap severity and priority
  severity DOUBLE PRECISION DEFAULT 0.5, -- 0-1, higher = more critical
  query_frequency INTEGER DEFAULT 0, -- How often users ask for this
  
  -- Gap context
  target_category TEXT,
  target_region TEXT,
  target_keywords TEXT[] DEFAULT '{}',
  
  -- Resolution status
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'wont_fix'
  resolution_discovery_id UUID REFERENCES public.source_discoveries(id),
  
  -- Lifecycle
  identified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  
  -- Evidence
  sample_queries JSONB DEFAULT '[]', -- Queries that revealed this gap
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gap_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read gap analysis" ON public.gap_analysis FOR SELECT USING (true);

-- ============================================================================
-- DISCOVERY PIPELINE FUNCTIONS
-- ============================================================================

-- Function to queue a new discovery from any trigger
CREATE OR REPLACE FUNCTION public.queue_discovery(
  p_trigger_type TEXT,
  p_trigger_id UUID DEFAULT NULL,
  p_trigger_prompt TEXT DEFAULT NULL,
  p_target_api_name TEXT DEFAULT 'Unknown API',
  p_target_api_url TEXT DEFAULT NULL,
  p_target_description TEXT DEFAULT NULL,
  p_inferred_categories TEXT[] DEFAULT '{}',
  p_inferred_keywords TEXT[] DEFAULT '{}',
  p_priority INTEGER DEFAULT 5,
  p_confidence DOUBLE PRECISION DEFAULT 0.5
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_discovery_id UUID;
BEGIN
  INSERT INTO source_discoveries (
    trigger_type, trigger_id, trigger_prompt,
    target_api_name, target_api_url, target_description,
    inferred_categories, inferred_keywords,
    priority, confidence_score
  ) VALUES (
    p_trigger_type, p_trigger_id, p_trigger_prompt,
    p_target_api_name, p_target_api_url, p_target_description,
    p_inferred_categories, p_inferred_keywords,
    p_priority, p_confidence
  )
  RETURNING id INTO v_discovery_id;
  
  RETURN v_discovery_id;
END;
$$;

-- Function to analyze gaps in current data coverage
CREATE OR REPLACE FUNCTION public.analyze_data_gaps()
RETURNS TABLE(
  gap_type TEXT,
  gap_description TEXT,
  severity DOUBLE PRECISION,
  target_category TEXT,
  target_keywords TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_all_categories TEXT[] := ARRAY['WILDLIFE', 'WEATHER', 'MARINE', 'GEOSPATIAL', 'GOVERNMENT', 'REGULATIONS', 'ECONOMIC', 'DEMOGRAPHICS', 'TRANSPORTATION', 'HEALTH', 'ENERGY', 'RECREATION', 'RESEARCH', 'IMAGERY'];
  v_stats RECORD;
  v_total_records BIGINT;
  v_category TEXT;
  v_category_count BIGINT;
  v_threshold DOUBLE PRECISION := 0.03; -- Categories below 3% are gaps
BEGIN
  -- Get latest stats
  SELECT * INTO v_stats FROM master_dataset_stats ORDER BY recorded_at DESC LIMIT 1;
  v_total_records := COALESCE(v_stats.total_records, 0);
  
  IF v_total_records = 0 THEN
    v_total_records := 1; -- Prevent division by zero
  END IF;
  
  -- Check for underrepresented categories
  FOREACH v_category IN ARRAY v_all_categories
  LOOP
    v_category_count := COALESCE((v_stats.records_by_category::jsonb ->> v_category)::bigint, 0);
    
    IF v_category_count::DOUBLE PRECISION / v_total_records < v_threshold THEN
      gap_type := 'categorical';
      gap_description := format('Category %s has only %s records (%s%% of total)', 
        v_category, v_category_count, ROUND((v_category_count::DOUBLE PRECISION / v_total_records * 100)::numeric, 2));
      severity := 1.0 - (v_category_count::DOUBLE PRECISION / v_total_records / v_threshold);
      target_category := v_category;
      target_keywords := ARRAY[LOWER(v_category)];
      RETURN NEXT;
    END IF;
  END LOOP;
  
  -- Check for frequently failing sources
  FOR v_stats IN 
    SELECT source_name, reliability_score, failed_requests, total_requests
    FROM source_performance
    WHERE reliability_score < 0.5 AND total_requests > 10
    ORDER BY total_requests DESC
    LIMIT 5
  LOOP
    gap_type := 'reliability';
    gap_description := format('Source %s has low reliability (%s%%) - may need replacement', 
      v_stats.source_name, ROUND((v_stats.reliability_score * 100)::numeric, 1));
    severity := 1.0 - v_stats.reliability_score;
    target_category := NULL;
    target_keywords := ARRAY[v_stats.source_name];
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$;

-- Function to update discovery status and metrics
CREATE OR REPLACE FUNCTION public.update_discovery_status(
  p_discovery_id UUID,
  p_status TEXT,
  p_validation_result JSONB DEFAULT NULL,
  p_generated_collector_id UUID DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE source_discoveries
  SET 
    status = p_status,
    validation_result = COALESCE(p_validation_result, validation_result),
    generated_collector_id = COALESCE(p_generated_collector_id, generated_collector_id),
    error_message = p_error_message,
    error_count = CASE WHEN p_error_message IS NOT NULL THEN error_count + 1 ELSE error_count END,
    generation_attempts = CASE WHEN p_status = 'generating' THEN generation_attempts + 1 ELSE generation_attempts END,
    last_generation_at = CASE WHEN p_status = 'generating' THEN now() ELSE last_generation_at END,
    processed_at = CASE WHEN p_status IN ('approved', 'rejected', 'failed') THEN now() ELSE processed_at END,
    updated_at = now()
  WHERE id = p_discovery_id;
  
  -- Update daily metrics
  INSERT INTO discovery_metrics (date, discoveries_validated, collectors_generated, collectors_approved, collectors_failed)
  VALUES (CURRENT_DATE, 
    CASE WHEN p_status = 'validating' THEN 1 ELSE 0 END,
    CASE WHEN p_status = 'generating' THEN 1 ELSE 0 END,
    CASE WHEN p_status = 'approved' THEN 1 ELSE 0 END,
    CASE WHEN p_status = 'failed' THEN 1 ELSE 0 END
  )
  ON CONFLICT (date) DO UPDATE SET
    discoveries_validated = discovery_metrics.discoveries_validated + EXCLUDED.discoveries_validated,
    collectors_generated = discovery_metrics.collectors_generated + EXCLUDED.collectors_generated,
    collectors_approved = discovery_metrics.collectors_approved + EXCLUDED.collectors_approved,
    collectors_failed = discovery_metrics.collectors_failed + EXCLUDED.collectors_failed;
  
  RETURN TRUE;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_source_discoveries_status ON public.source_discoveries(status);
CREATE INDEX IF NOT EXISTS idx_source_discoveries_priority ON public.source_discoveries(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_source_discoveries_trigger ON public.source_discoveries(trigger_type, trigger_id);
CREATE INDEX IF NOT EXISTS idx_gap_analysis_status ON public.gap_analysis(status);
CREATE INDEX IF NOT EXISTS idx_gap_analysis_severity ON public.gap_analysis(severity DESC);

-- Add trigger for updated_at
CREATE OR REPLACE TRIGGER update_source_discoveries_updated_at
  BEFORE UPDATE ON public.source_discoveries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_gap_analysis_updated_at
  BEFORE UPDATE ON public.gap_analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();