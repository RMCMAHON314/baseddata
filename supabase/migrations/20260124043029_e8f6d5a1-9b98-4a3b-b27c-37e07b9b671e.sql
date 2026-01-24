
-- ============================================
-- COMPLETE CORE INFRASTRUCTURE FIX
-- All tables, views, functions in one migration
-- ============================================

-- 1. Create saved_queries table
CREATE TABLE IF NOT EXISTS public.saved_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  category TEXT,
  result_count INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.saved_queries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own saved queries" ON public.saved_queries;
CREATE POLICY "Users can manage own saved queries"
  ON public.saved_queries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Create dead letter queue
CREATE TABLE IF NOT EXISTS public.flywheel_dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID,
  source_table TEXT NOT NULL,
  error_message TEXT,
  error_count INTEGER DEFAULT 1,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_retry_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.flywheel_dead_letter_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages dead letter queue" ON public.flywheel_dead_letter_queue;
CREATE POLICY "Service role manages dead letter queue"
  ON public.flywheel_dead_letter_queue FOR ALL
  USING (true);

-- 3. Recreate views as SECURITY INVOKER
DROP VIEW IF EXISTS public.entity_360_profiles CASCADE;
CREATE VIEW public.entity_360_profiles 
WITH (security_invoker = true) AS
SELECT 
  e.id,
  e.canonical_name,
  e.entity_type,
  e.city,
  e.state,
  e.country,
  e.latitude,
  e.longitude,
  e.data_quality_score,
  e.opportunity_score,
  e.health_score,
  e.risk_score,
  e.source_count,
  (SELECT COUNT(*) FROM public.core_facts f WHERE f.entity_id = e.id) as fact_count,
  (SELECT COUNT(*) FROM public.core_relationships r WHERE r.from_entity_id = e.id OR r.to_entity_id = e.id) as relationship_count,
  e.created_at,
  e.updated_at
FROM public.core_entities e;

DROP VIEW IF EXISTS public.high_value_opportunities CASCADE;
CREATE VIEW public.high_value_opportunities
WITH (security_invoker = true) AS
SELECT 
  e.id,
  e.canonical_name,
  e.entity_type,
  e.opportunity_score,
  e.data_quality_score,
  e.city,
  e.state
FROM public.core_entities e
WHERE e.opportunity_score >= 70
ORDER BY e.opportunity_score DESC;

DROP VIEW IF EXISTS public.realtime_dashboard CASCADE;
CREATE VIEW public.realtime_dashboard
WITH (security_invoker = true) AS
SELECT 
  (SELECT COUNT(*) FROM public.core_entities) as total_entities,
  (SELECT COUNT(*) FROM public.core_facts) as total_facts,
  (SELECT COUNT(*) FROM public.core_relationships) as total_relationships,
  (SELECT COUNT(*) FROM public.records) as total_records,
  (SELECT COUNT(*) FROM public.api_sources WHERE status = 'active') as active_sources,
  (SELECT COUNT(*) FROM public.flywheel_discovery_queue WHERE status = 'pending') as queue_depth;

-- 4. Add triggers
DROP TRIGGER IF EXISTS update_saved_queries_updated_at ON public.saved_queries;
CREATE TRIGGER update_saved_queries_updated_at
  BEFORE UPDATE ON public.saved_queries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Performance indexes
CREATE INDEX IF NOT EXISTS idx_dead_letter_unresolved 
  ON public.flywheel_dead_letter_queue(resolved_at) 
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_saved_queries_user 
  ON public.saved_queries(user_id, is_favorite);

CREATE INDEX IF NOT EXISTS idx_saved_queries_favorite 
  ON public.saved_queries(user_id) WHERE is_favorite = true;
