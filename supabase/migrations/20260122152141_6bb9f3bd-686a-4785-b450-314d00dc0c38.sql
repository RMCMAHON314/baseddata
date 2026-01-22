-- ============================================================================
-- BASED DATA v7.0 - STREAMLINED SCHEMA
-- Consolidate queries table as unified input layer
-- ============================================================================

-- 1. Enhance profiles table to be the unified user record
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'pro', 'team', 'enterprise', 'api')),
ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS default_location JSONB,
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_query_at TIMESTAMPTZ;

-- 2. Create unified queries table (single input layer)
CREATE TABLE IF NOT EXISTS public.queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  
  -- Input
  prompt TEXT NOT NULL,
  input_type TEXT NOT NULL DEFAULT 'natural_language' CHECK (input_type IN ('natural_language', 'api', 'scheduled', 'nl_query')),
  parsed_intent JSONB,
  
  -- Execution
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'complete', 'failed', 'cached')),
  engine_version TEXT DEFAULT 'baseddata-v7.0',
  
  -- Results
  result_count INTEGER DEFAULT 0,
  sources_queried TEXT[] DEFAULT '{}',
  categories_matched TEXT[] DEFAULT '{}',
  features JSONB,  -- GeoJSON FeatureCollection
  insights JSONB,
  
  -- Metrics
  processing_time_ms INTEGER,
  credits_used INTEGER DEFAULT 0,
  cache_hit BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexes for queries table
CREATE INDEX IF NOT EXISTS idx_queries_user_id ON public.queries(user_id);
CREATE INDEX IF NOT EXISTS idx_queries_status ON public.queries(status);
CREATE INDEX IF NOT EXISTS idx_queries_created_at ON public.queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queries_input_type ON public.queries(input_type);

-- RLS for queries
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own queries"
ON public.queries FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create queries"
ON public.queries FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 3. Create function to log query and return ID
CREATE OR REPLACE FUNCTION public.log_query(
  p_user_id UUID,
  p_prompt TEXT,
  p_input_type TEXT DEFAULT 'natural_language',
  p_api_key_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_query_id UUID;
BEGIN
  INSERT INTO public.queries (user_id, prompt, input_type, api_key_id, status)
  VALUES (p_user_id, p_prompt, p_input_type, p_api_key_id, 'running')
  RETURNING id INTO v_query_id;
  
  -- Update user's last_query_at
  IF p_user_id IS NOT NULL THEN
    UPDATE public.profiles SET last_query_at = now() WHERE user_id = p_user_id;
  END IF;
  
  RETURN v_query_id;
END;
$$;

-- 4. Create function to complete query with results
CREATE OR REPLACE FUNCTION public.complete_query(
  p_query_id UUID,
  p_result_count INTEGER,
  p_sources_queried TEXT[],
  p_categories_matched TEXT[],
  p_features JSONB,
  p_insights JSONB,
  p_processing_time_ms INTEGER,
  p_credits_used INTEGER DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.queries SET
    status = 'complete',
    result_count = p_result_count,
    sources_queried = p_sources_queried,
    categories_matched = p_categories_matched,
    features = p_features,
    insights = p_insights,
    processing_time_ms = p_processing_time_ms,
    credits_used = p_credits_used,
    completed_at = now()
  WHERE id = p_query_id;
  
  -- Deduct credits from user if applicable
  IF p_credits_used > 0 THEN
    UPDATE public.profiles SET 
      credits_balance = credits_balance - p_credits_used,
      credits_used = credits_used + p_credits_used
    WHERE user_id = (SELECT user_id FROM public.queries WHERE id = p_query_id);
  END IF;
END;
$$;

-- 5. Add spatial index for records (if postgis available)
CREATE INDEX IF NOT EXISTS idx_records_category ON public.records(category);
CREATE INDEX IF NOT EXISTS idx_records_source ON public.records(source_id);
CREATE INDEX IF NOT EXISTS idx_records_collected ON public.records(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_quality ON public.records(quality_score DESC) WHERE quality_score > 0.7;