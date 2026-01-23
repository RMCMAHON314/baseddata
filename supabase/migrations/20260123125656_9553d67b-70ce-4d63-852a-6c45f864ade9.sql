
-- ============================================================================
-- FLYWHEEL HARDENING v10.0 - Production-Grade Resilience
-- ============================================================================

-- 1. DEAD LETTER QUEUE for permanently failed discoveries
CREATE TABLE IF NOT EXISTS public.discovery_dead_letter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_discovery_id UUID REFERENCES source_discoveries(id) ON DELETE SET NULL,
  original_payload JSONB NOT NULL,
  failure_reason TEXT NOT NULL,
  failure_count INTEGER NOT NULL DEFAULT 1,
  first_failed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_failed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  can_retry BOOLEAN DEFAULT true,
  retry_after TIMESTAMPTZ,
  recovered_at TIMESTAMPTZ,
  recovered_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CIRCUIT BREAKER state tracking
CREATE TABLE IF NOT EXISTS public.api_circuit_breakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_domain TEXT UNIQUE NOT NULL,
  state TEXT NOT NULL DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half_open')),
  failure_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  half_open_at TIMESTAMPTZ,
  failure_threshold INTEGER NOT NULL DEFAULT 5,
  success_threshold INTEGER NOT NULL DEFAULT 3,
  timeout_seconds INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. FLYWHEEL METRICS for observability
CREATE TABLE IF NOT EXISTS public.flywheel_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  dimensions JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flywheel_metrics_type_time ON flywheel_metrics(metric_type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_flywheel_metrics_name ON flywheel_metrics(metric_name, recorded_at DESC);

-- 4. RETRY SCHEDULE tracking
ALTER TABLE source_discoveries 
  ADD COLUMN IF NOT EXISTS retry_after TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS backoff_multiplier INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS circuit_breaker_blocked BOOLEAN DEFAULT false;

-- 5. CRAWLER health tracking
ALTER TABLE auto_crawlers
  ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS circuit_state TEXT DEFAULT 'closed',
  ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE public.discovery_dead_letter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_circuit_breakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flywheel_metrics ENABLE ROW LEVEL SECURITY;

-- Service role access for edge functions
CREATE POLICY "Service role full access to dead_letter" ON public.discovery_dead_letter
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to circuit_breakers" ON public.api_circuit_breakers
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to flywheel_metrics" ON public.flywheel_metrics
  FOR ALL USING (true) WITH CHECK (true);

-- 6. CIRCUIT BREAKER FUNCTIONS
CREATE OR REPLACE FUNCTION public.check_circuit_breaker(p_domain TEXT)
RETURNS TABLE(is_open BOOLEAN, state TEXT, retry_after TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_breaker RECORD;
BEGIN
  SELECT * INTO v_breaker FROM api_circuit_breakers WHERE api_domain = p_domain;
  
  IF v_breaker IS NULL THEN
    -- No breaker exists, circuit is closed
    RETURN QUERY SELECT false, 'closed'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Check if timeout has passed for open circuit
  IF v_breaker.state = 'open' AND 
     v_breaker.opened_at + (v_breaker.timeout_seconds * INTERVAL '1 second') < now() THEN
    -- Transition to half-open
    UPDATE api_circuit_breakers 
    SET state = 'half_open', half_open_at = now(), updated_at = now()
    WHERE api_domain = p_domain;
    RETURN QUERY SELECT false, 'half_open'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 
    v_breaker.state = 'open',
    v_breaker.state,
    CASE WHEN v_breaker.state = 'open' 
      THEN v_breaker.opened_at + (v_breaker.timeout_seconds * INTERVAL '1 second')
      ELSE NULL 
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_circuit_result(p_domain TEXT, p_success BOOLEAN)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_breaker RECORD;
  v_new_state TEXT;
BEGIN
  -- Upsert breaker record
  INSERT INTO api_circuit_breakers (api_domain, state)
  VALUES (p_domain, 'closed')
  ON CONFLICT (api_domain) DO NOTHING;
  
  SELECT * INTO v_breaker FROM api_circuit_breakers WHERE api_domain = p_domain FOR UPDATE;
  
  IF p_success THEN
    -- Success
    IF v_breaker.state = 'half_open' THEN
      -- Increment success count
      IF v_breaker.success_count + 1 >= v_breaker.success_threshold THEN
        v_new_state := 'closed';
        UPDATE api_circuit_breakers SET
          state = 'closed', failure_count = 0, success_count = 0,
          last_success_at = now(), updated_at = now()
        WHERE api_domain = p_domain;
      ELSE
        v_new_state := 'half_open';
        UPDATE api_circuit_breakers SET
          success_count = success_count + 1, last_success_at = now(), updated_at = now()
        WHERE api_domain = p_domain;
      END IF;
    ELSE
      v_new_state := 'closed';
      UPDATE api_circuit_breakers SET
        failure_count = 0, last_success_at = now(), updated_at = now()
      WHERE api_domain = p_domain;
    END IF;
  ELSE
    -- Failure
    IF v_breaker.state = 'half_open' THEN
      -- Immediately open
      v_new_state := 'open';
      UPDATE api_circuit_breakers SET
        state = 'open', opened_at = now(), success_count = 0,
        failure_count = failure_count + 1, last_failure_at = now(), updated_at = now()
      WHERE api_domain = p_domain;
    ELSIF v_breaker.failure_count + 1 >= v_breaker.failure_threshold THEN
      -- Threshold reached, open circuit
      v_new_state := 'open';
      UPDATE api_circuit_breakers SET
        state = 'open', opened_at = now(), 
        failure_count = failure_count + 1, last_failure_at = now(), updated_at = now()
      WHERE api_domain = p_domain;
    ELSE
      v_new_state := 'closed';
      UPDATE api_circuit_breakers SET
        failure_count = failure_count + 1, last_failure_at = now(), updated_at = now()
      WHERE api_domain = p_domain;
    END IF;
  END IF;
  
  RETURN v_new_state;
END;
$$;

-- 7. EXPONENTIAL BACKOFF helper
CREATE OR REPLACE FUNCTION public.calculate_retry_delay(p_attempt INTEGER, p_base_delay INTEGER DEFAULT 60)
RETURNS INTERVAL
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_delay INTEGER;
  v_jitter INTEGER;
BEGIN
  -- Exponential backoff: base * 2^attempt, max 1 hour
  v_delay := LEAST(p_base_delay * POWER(2, p_attempt), 3600);
  -- Add jitter (0-25% of delay)
  v_jitter := FLOOR(RANDOM() * v_delay * 0.25);
  RETURN (v_delay + v_jitter) * INTERVAL '1 second';
END;
$$;

-- 8. MOVE TO DEAD LETTER function
CREATE OR REPLACE FUNCTION public.move_to_dead_letter(p_discovery_id UUID, p_reason TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_discovery RECORD;
  v_dlq_id UUID;
BEGIN
  SELECT * INTO v_discovery FROM source_discoveries WHERE id = p_discovery_id;
  
  IF v_discovery IS NULL THEN
    RETURN NULL;
  END IF;
  
  INSERT INTO discovery_dead_letter (
    original_discovery_id, original_payload, failure_reason, failure_count
  ) VALUES (
    p_discovery_id,
    to_jsonb(v_discovery),
    p_reason,
    v_discovery.error_count
  )
  RETURNING id INTO v_dlq_id;
  
  -- Mark original as permanently failed
  UPDATE source_discoveries SET status = 'dead_letter' WHERE id = p_discovery_id;
  
  RETURN v_dlq_id;
END;
$$;

-- 9. RECORD FLYWHEEL METRIC helper
CREATE OR REPLACE FUNCTION public.record_flywheel_metric(
  p_type TEXT, p_name TEXT, p_value DOUBLE PRECISION, p_dimensions JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO flywheel_metrics (metric_type, metric_name, metric_value, dimensions)
  VALUES (p_type, p_name, p_value, p_dimensions)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 10. GET FLYWHEEL HEALTH snapshot
CREATE OR REPLACE FUNCTION public.get_flywheel_health()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'queue_depth', (SELECT COUNT(*) FROM source_discoveries WHERE status = 'pending'),
    'processing', (SELECT COUNT(*) FROM source_discoveries WHERE status IN ('validating', 'generating', 'testing')),
    'approved_today', (SELECT COUNT(*) FROM source_discoveries WHERE status = 'approved' AND processed_at > CURRENT_DATE),
    'failed_today', (SELECT COUNT(*) FROM source_discoveries WHERE status = 'failed' AND processed_at > CURRENT_DATE),
    'dead_letter_count', (SELECT COUNT(*) FROM discovery_dead_letter WHERE recovered_at IS NULL),
    'open_circuits', (SELECT COUNT(*) FROM api_circuit_breakers WHERE state = 'open'),
    'active_collectors', (SELECT COUNT(*) FROM dynamic_collectors WHERE is_active = true),
    'active_crawlers', (SELECT COUNT(*) FROM auto_crawlers WHERE is_active = true),
    'total_records', (SELECT COUNT(*) FROM records),
    'records_today', (SELECT COUNT(*) FROM records WHERE collected_at > CURRENT_DATE)
  ) INTO v_result;
  RETURN v_result;
END;
$$;
