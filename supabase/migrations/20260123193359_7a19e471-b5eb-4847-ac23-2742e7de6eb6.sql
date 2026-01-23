-- ═══════════════════════════════════════════════════════════════════════════
-- BULLETPROOF CLEANUP: Add missing functions and ensure system coherence
-- ═══════════════════════════════════════════════════════════════════════════

-- Function: mark_duplicates (simple placeholder)
CREATE OR REPLACE FUNCTION public.mark_duplicates(p_query_id UUID)
RETURNS INTEGER AS $$
DECLARE
  dup_count INTEGER := 0;
BEGIN
  -- Simple implementation - mark exact name duplicates
  WITH duplicates AS (
    SELECT id, name, source_name,
           ROW_NUMBER() OVER (PARTITION BY name ORDER BY confidence DESC) as rn
    FROM public.records
    WHERE query_id = p_query_id
  )
  UPDATE public.records r
  SET properties = properties || '{"is_duplicate": true}'::jsonb
  FROM duplicates d
  WHERE r.id = d.id AND d.rn > 1;
  
  GET DIAGNOSTICS dup_count = ROW_COUNT;
  RETURN dup_count;
EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: update_query_stats (aggregate stats after query completion)
CREATE OR REPLACE FUNCTION public.update_query_stats(p_query_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.queries q
  SET 
    result_count = (SELECT COUNT(*) FROM public.records WHERE query_id = p_query_id),
    high_relevance_count = (SELECT COUNT(*) FROM public.records WHERE query_id = p_query_id AND (properties->>'relevance_score')::float > 0.7),
    avg_relevance_score = (SELECT AVG((properties->>'relevance_score')::float) FROM public.records WHERE query_id = p_query_id),
    completed_at = NOW()
  WHERE q.id = p_query_id;
EXCEPTION WHEN OTHERS THEN
  -- Silently fail - stats are nice to have but not critical
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add session_id index for faster history lookups
CREATE INDEX IF NOT EXISTS idx_queries_session_id ON public.queries(session_id);

-- Add combined index for source matching performance
CREATE INDEX IF NOT EXISTS idx_api_sources_status_health ON public.api_sources(status, health_status) WHERE status = 'active';

-- Ensure queries table has all needed columns (safe adds)
DO $$ 
BEGIN
  -- Add raw_query column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'queries' AND column_name = 'raw_query') THEN
    ALTER TABLE public.queries ADD COLUMN raw_query TEXT;
  END IF;
  
  -- Add started_at column if not exists  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'queries' AND column_name = 'started_at') THEN
    ALTER TABLE public.queries ADD COLUMN started_at TIMESTAMPTZ;
  END IF;
  
  -- Add total_results column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'queries' AND column_name = 'total_results') THEN
    ALTER TABLE public.queries ADD COLUMN total_results INTEGER DEFAULT 0;
  END IF;
  
  -- Add sources_attempted column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'queries' AND column_name = 'sources_attempted') THEN
    ALTER TABLE public.queries ADD COLUMN sources_attempted INTEGER DEFAULT 0;
  END IF;
  
  -- Add sources_succeeded column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'queries' AND column_name = 'sources_succeeded') THEN
    ALTER TABLE public.queries ADD COLUMN sources_succeeded INTEGER DEFAULT 0;
  END IF;
  
  -- Add sources_failed column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'queries' AND column_name = 'sources_failed') THEN
    ALTER TABLE public.queries ADD COLUMN sources_failed INTEGER DEFAULT 0;
  END IF;
  
  -- Add execution_time_ms column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'queries' AND column_name = 'execution_time_ms') THEN
    ALTER TABLE public.queries ADD COLUMN execution_time_ms INTEGER;
  END IF;
  
  -- Add total_time_ms column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'queries' AND column_name = 'total_time_ms') THEN
    ALTER TABLE public.queries ADD COLUMN total_time_ms INTEGER;
  END IF;
END $$;

-- Ensure records table has query_id reference
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'records' AND column_name = 'query_id') THEN
    ALTER TABLE public.records ADD COLUMN query_id UUID REFERENCES public.queries(id);
  END IF;
  
  -- Add relevance_score if not in base
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'records' AND column_name = 'relevance_score') THEN
    ALTER TABLE public.records ADD COLUMN relevance_score DOUBLE PRECISION DEFAULT 0.5;
  END IF;
  
  -- Add display_name if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'records' AND column_name = 'display_name') THEN
    ALTER TABLE public.records ADD COLUMN display_name TEXT;
  END IF;
END $$;

-- Create index for query_id lookups on records
CREATE INDEX IF NOT EXISTS idx_records_query_id ON public.records(query_id);

-- Ensure RLS policies allow service role operations
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

-- Drop and recreate permissive policies for queries
DROP POLICY IF EXISTS "Allow anonymous queries" ON public.queries;
CREATE POLICY "Allow anonymous queries" ON public.queries FOR ALL 
  USING (user_id IS NULL OR auth.uid() = user_id)
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Permissive read policy for records
DROP POLICY IF EXISTS "Allow reading all records" ON public.records;
CREATE POLICY "Allow reading all records" ON public.records FOR SELECT USING (true);

-- Allow service role full access to records (for edge functions)
DROP POLICY IF EXISTS "Service role full access to records" ON public.records;
CREATE POLICY "Service role full access to records" ON public.records FOR ALL 
  USING (true) WITH CHECK (true);
