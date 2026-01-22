-- ============================================
-- ULTIMATE DATA TAP: Persistent Record Layer
-- ============================================

-- 1. Master records table - every unique data point ever collected
CREATE TABLE public.records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  geometry JSONB NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}',
  collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  seen_count INTEGER NOT NULL DEFAULT 1,
  quality_score DOUBLE PRECISION DEFAULT 0.5,
  user_validations JSONB DEFAULT '{"upvotes": 0, "downvotes": 0, "flags": []}',
  UNIQUE(source_id, source_record_id)
);

-- 2. Query patterns - learn from every search
CREATE TABLE public.query_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_hash TEXT NOT NULL UNIQUE,
  prompt_template TEXT NOT NULL,
  categories TEXT[] NOT NULL,
  sources_used TEXT[] NOT NULL,
  avg_record_count INTEGER DEFAULT 0,
  success_rate DOUBLE PRECISION DEFAULT 1.0,
  execution_count INTEGER DEFAULT 1,
  avg_processing_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Location cache - instant geo-lookup
CREATE TABLE public.location_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  center JSONB NOT NULL,
  bbox JSONB,
  admin_level TEXT,
  country TEXT,
  state TEXT,
  county TEXT,
  city TEXT,
  hit_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name_normalized)
);

-- 4. Source performance - real-time reliability tracking  
CREATE TABLE public.source_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id TEXT NOT NULL UNIQUE,
  source_name TEXT NOT NULL,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  total_records_collected BIGINT DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_failure_at TIMESTAMP WITH TIME ZONE,
  last_error_message TEXT,
  reliability_score DOUBLE PRECISION GENERATED ALWAYS AS (
    CASE WHEN total_requests > 0 
    THEN successful_requests::DOUBLE PRECISION / total_requests 
    ELSE 0.5 END
  ) STORED,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. User feedback - ground truth layer
CREATE TABLE public.record_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id UUID NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('upvote', 'downvote', 'flag', 'correction')),
  correction_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(record_id, user_id, feedback_type)
);

-- ============================================
-- INDEXES FOR BLAZING FAST LOOKUPS
-- ============================================

CREATE INDEX idx_records_source ON public.records(source_id);
CREATE INDEX idx_records_category ON public.records(category);
CREATE INDEX idx_records_collected ON public.records(collected_at DESC);
CREATE INDEX idx_records_quality ON public.records(quality_score DESC);
CREATE INDEX idx_records_geometry ON public.records USING GIN(geometry);
CREATE INDEX idx_records_properties ON public.records USING GIN(properties);

CREATE INDEX idx_location_name ON public.location_cache(name_normalized);
CREATE INDEX idx_location_hits ON public.location_cache(hit_count DESC);

CREATE INDEX idx_query_patterns_hash ON public.query_patterns(pattern_hash);
CREATE INDEX idx_query_patterns_categories ON public.query_patterns USING GIN(categories);

CREATE INDEX idx_source_perf_reliability ON public.source_performance(reliability_score DESC);
CREATE INDEX idx_source_perf_active ON public.source_performance(is_active) WHERE is_active = true;

CREATE INDEX idx_feedback_record ON public.record_feedback(record_id);
CREATE INDEX idx_feedback_user ON public.record_feedback(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_feedback ENABLE ROW LEVEL SECURITY;

-- Records: Public read, system write
CREATE POLICY "Anyone can read records" ON public.records FOR SELECT USING (true);

-- Query patterns: Public read
CREATE POLICY "Anyone can read query patterns" ON public.query_patterns FOR SELECT USING (true);

-- Location cache: Public read
CREATE POLICY "Anyone can read locations" ON public.location_cache FOR SELECT USING (true);

-- Source performance: Public read
CREATE POLICY "Anyone can read source performance" ON public.source_performance FOR SELECT USING (true);

-- Feedback: Users can manage their own
CREATE POLICY "Users can view all feedback" ON public.record_feedback FOR SELECT USING (true);
CREATE POLICY "Users can submit feedback" ON public.record_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own feedback" ON public.record_feedback FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own feedback" ON public.record_feedback FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS: Auto-update triggers
-- ============================================

-- Update source performance on each call
CREATE OR REPLACE FUNCTION public.update_source_performance(
  p_source_id TEXT,
  p_source_name TEXT,
  p_success BOOLEAN,
  p_records_collected INTEGER,
  p_response_time_ms INTEGER,
  p_error_message TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.source_performance (
    source_id, source_name, total_requests, successful_requests, failed_requests,
    total_records_collected, avg_response_time_ms, last_success_at, last_failure_at, last_error_message
  ) VALUES (
    p_source_id, p_source_name, 1,
    CASE WHEN p_success THEN 1 ELSE 0 END,
    CASE WHEN p_success THEN 0 ELSE 1 END,
    p_records_collected, p_response_time_ms,
    CASE WHEN p_success THEN now() ELSE NULL END,
    CASE WHEN p_success THEN NULL ELSE now() END,
    p_error_message
  )
  ON CONFLICT (source_id) DO UPDATE SET
    total_requests = source_performance.total_requests + 1,
    successful_requests = source_performance.successful_requests + CASE WHEN p_success THEN 1 ELSE 0 END,
    failed_requests = source_performance.failed_requests + CASE WHEN p_success THEN 0 ELSE 1 END,
    total_records_collected = source_performance.total_records_collected + p_records_collected,
    avg_response_time_ms = (source_performance.avg_response_time_ms * source_performance.total_requests + p_response_time_ms) / (source_performance.total_requests + 1),
    last_success_at = CASE WHEN p_success THEN now() ELSE source_performance.last_success_at END,
    last_failure_at = CASE WHEN p_success THEN source_performance.last_failure_at ELSE now() END,
    last_error_message = COALESCE(p_error_message, source_performance.last_error_message),
    updated_at = now();
END;
$$;

-- Upsert record with seen_count increment
CREATE OR REPLACE FUNCTION public.upsert_record(
  p_source_id TEXT,
  p_source_record_id TEXT,
  p_category TEXT,
  p_name TEXT,
  p_description TEXT,
  p_geometry JSONB,
  p_properties JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id UUID;
BEGIN
  INSERT INTO public.records (
    source_id, source_record_id, category, name, description, geometry, properties
  ) VALUES (
    p_source_id, p_source_record_id, p_category, p_name, p_description, p_geometry, p_properties
  )
  ON CONFLICT (source_id, source_record_id) DO UPDATE SET
    last_seen_at = now(),
    seen_count = records.seen_count + 1,
    properties = records.properties || p_properties
  RETURNING id INTO v_record_id;
  
  RETURN v_record_id;
END;
$$;

-- Cache location lookup
CREATE OR REPLACE FUNCTION public.cache_location(
  p_name TEXT,
  p_center JSONB,
  p_bbox JSONB DEFAULT NULL,
  p_admin_level TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_county TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location_id UUID;
  v_normalized TEXT;
BEGIN
  v_normalized := lower(trim(regexp_replace(p_name, '\s+', ' ', 'g')));
  
  INSERT INTO public.location_cache (
    name, name_normalized, center, bbox, admin_level, country, state, county, city
  ) VALUES (
    p_name, v_normalized, p_center, p_bbox, p_admin_level, p_country, p_state, p_county, p_city
  )
  ON CONFLICT (name_normalized) DO UPDATE SET
    hit_count = location_cache.hit_count + 1,
    last_used_at = now()
  RETURNING id INTO v_location_id;
  
  RETURN v_location_id;
END;
$$;

-- Update record quality based on feedback
CREATE OR REPLACE FUNCTION public.update_record_quality()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upvotes INTEGER;
  v_downvotes INTEGER;
  v_flags INTEGER;
  v_new_score DOUBLE PRECISION;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE feedback_type = 'upvote'),
    COUNT(*) FILTER (WHERE feedback_type = 'downvote'),
    COUNT(*) FILTER (WHERE feedback_type = 'flag')
  INTO v_upvotes, v_downvotes, v_flags
  FROM public.record_feedback
  WHERE record_id = COALESCE(NEW.record_id, OLD.record_id);
  
  -- Wilson score for quality (lower bound of confidence interval)
  IF v_upvotes + v_downvotes > 0 THEN
    v_new_score := (v_upvotes + 1.9208) / (v_upvotes + v_downvotes + 3.8416) 
      - 1.96 * SQRT((v_upvotes * v_downvotes) / (v_upvotes + v_downvotes) + 0.9604) 
      / (v_upvotes + v_downvotes + 3.8416);
    -- Penalize flagged records
    v_new_score := v_new_score - (v_flags * 0.1);
    v_new_score := GREATEST(0, LEAST(1, v_new_score));
  ELSE
    v_new_score := 0.5;
  END IF;
  
  UPDATE public.records 
  SET 
    quality_score = v_new_score,
    user_validations = jsonb_build_object(
      'upvotes', v_upvotes,
      'downvotes', v_downvotes,
      'flags', v_flags
    )
  WHERE id = COALESCE(NEW.record_id, OLD.record_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_record_quality
AFTER INSERT OR UPDATE OR DELETE ON public.record_feedback
FOR EACH ROW EXECUTE FUNCTION public.update_record_quality();