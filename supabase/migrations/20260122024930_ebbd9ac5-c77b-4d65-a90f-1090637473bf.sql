-- ============================================
-- OMNISCIENT SUPREMACY DATABASE SCHEMA
-- Scheduled Pipelines + Developer API + NL SQL
-- ============================================

-- API Keys for Developer Access
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL, -- First 8 chars for identification
  scopes TEXT[] DEFAULT ARRAY['read']::TEXT[],
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_day INTEGER DEFAULT 10000,
  requests_today INTEGER DEFAULT 0,
  requests_this_minute INTEGER DEFAULT 0,
  last_request_at TIMESTAMPTZ,
  last_reset_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- API Usage Logs
CREATE TABLE public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  request_body JSONB,
  response_size_bytes INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scheduled Pipelines
CREATE TABLE public.scheduled_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  cron_expression TEXT NOT NULL, -- e.g., '0 */6 * * *' for every 6 hours
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}'::JSONB, -- Dataset size, freshness, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pipeline Run History
CREATE TABLE public.pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES public.scheduled_pipelines(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, running, complete, failed
  records_collected INTEGER DEFAULT 0,
  sources_queried TEXT[],
  insights JSONB,
  error_message TEXT,
  processing_time_ms INTEGER,
  credits_used INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Natural Language Query History
CREATE TABLE public.nl_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  natural_query TEXT NOT NULL,
  generated_sql TEXT,
  explanation TEXT,
  result_count INTEGER,
  execution_time_ms INTEGER,
  was_successful BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nl_queries ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data
CREATE POLICY "Users can manage their own API keys"
ON public.api_keys FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can view logs for their API keys"
ON public.api_usage_logs FOR SELECT
USING (api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their own scheduled pipelines"
ON public.scheduled_pipelines FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their pipeline runs"
ON public.pipeline_runs FOR SELECT
USING (pipeline_id IN (SELECT id FROM public.scheduled_pipelines WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their NL queries"
ON public.nl_queries FOR ALL
USING (auth.uid() = user_id OR api_key_id IN (SELECT id FROM public.api_keys WHERE user_id = auth.uid()));

-- Indexes for performance
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_user ON public.api_keys(user_id);
CREATE INDEX idx_api_usage_logs_key ON public.api_usage_logs(api_key_id);
CREATE INDEX idx_api_usage_logs_created ON public.api_usage_logs(created_at);
CREATE INDEX idx_scheduled_pipelines_user ON public.scheduled_pipelines(user_id);
CREATE INDEX idx_scheduled_pipelines_next_run ON public.scheduled_pipelines(next_run_at) WHERE is_active = true;
CREATE INDEX idx_pipeline_runs_pipeline ON public.pipeline_runs(pipeline_id);
CREATE INDEX idx_nl_queries_user ON public.nl_queries(user_id);

-- Triggers for updated_at
CREATE TRIGGER update_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_pipelines_updated_at
BEFORE UPDATE ON public.scheduled_pipelines
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to validate and log API key usage
CREATE OR REPLACE FUNCTION public.validate_api_key(p_key_hash TEXT)
RETURNS TABLE(
  key_id UUID,
  owner_id UUID,
  scopes TEXT[],
  is_valid BOOLEAN,
  rate_limited BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key RECORD;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO v_key FROM public.api_keys 
  WHERE key_hash = p_key_hash AND is_active = true 
  AND (expires_at IS NULL OR expires_at > v_now);
  
  IF v_key IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, ARRAY[]::TEXT[], false, false;
    RETURN;
  END IF;
  
  -- Reset counters if needed
  IF v_key.last_reset_at < date_trunc('day', v_now) THEN
    UPDATE public.api_keys SET requests_today = 0, last_reset_at = v_now WHERE id = v_key.id;
    v_key.requests_today := 0;
  END IF;
  
  IF v_key.last_request_at < v_now - INTERVAL '1 minute' THEN
    UPDATE public.api_keys SET requests_this_minute = 0 WHERE id = v_key.id;
    v_key.requests_this_minute := 0;
  END IF;
  
  -- Check rate limits
  IF v_key.requests_today >= v_key.rate_limit_per_day OR 
     v_key.requests_this_minute >= v_key.rate_limit_per_minute THEN
    RETURN QUERY SELECT v_key.id, v_key.user_id, v_key.scopes, true, true;
    RETURN;
  END IF;
  
  -- Increment counters
  UPDATE public.api_keys SET 
    requests_today = requests_today + 1,
    requests_this_minute = requests_this_minute + 1,
    last_request_at = v_now
  WHERE id = v_key.id;
  
  RETURN QUERY SELECT v_key.id, v_key.user_id, v_key.scopes, true, false;
END;
$$;

-- Function to calculate next run time from cron expression
CREATE OR REPLACE FUNCTION public.calculate_next_run(p_cron TEXT, p_from TIMESTAMPTZ DEFAULT now())
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parts TEXT[];
  v_minute INT;
  v_hour INT;
  v_next TIMESTAMPTZ;
BEGIN
  -- Simple cron parser for common patterns
  v_parts := string_to_array(p_cron, ' ');
  
  -- Handle common patterns
  IF p_cron = '* * * * *' THEN
    RETURN date_trunc('minute', p_from) + INTERVAL '1 minute';
  ELSIF p_cron LIKE '0 * * * *' THEN
    RETURN date_trunc('hour', p_from) + INTERVAL '1 hour';
  ELSIF p_cron LIKE '0 */% * * *' THEN
    v_hour := NULLIF(regexp_replace(v_parts[2], '[^0-9]', '', 'g'), '')::INT;
    IF v_hour IS NULL THEN v_hour := 1; END IF;
    RETURN date_trunc('hour', p_from) + (v_hour * INTERVAL '1 hour');
  ELSIF p_cron LIKE '0 0 * * *' THEN
    RETURN date_trunc('day', p_from) + INTERVAL '1 day';
  ELSE
    -- Default: next hour
    RETURN date_trunc('hour', p_from) + INTERVAL '1 hour';
  END IF;
END;
$$;