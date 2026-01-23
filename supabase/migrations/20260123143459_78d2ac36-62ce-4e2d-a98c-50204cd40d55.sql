-- ============================================
-- ADD HISTORY PERSISTENCE COLUMNS TO QUERIES
-- ============================================

-- Add session tracking and history columns
ALTER TABLE public.queries 
  ADD COLUMN IF NOT EXISTS session_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS title VARCHAR(200),
  ADD COLUMN IF NOT EXISTS snapshot JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_saved BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 1;

-- Add quality metrics columns
ALTER TABLE public.queries 
  ADD COLUMN IF NOT EXISTS avg_relevance_score DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS high_relevance_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_relevance_filtered INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_records_raw INTEGER DEFAULT 0;

-- Create indexes for history queries
CREATE INDEX IF NOT EXISTS idx_queries_session_id ON public.queries(session_id);
CREATE INDEX IF NOT EXISTS idx_queries_session_created ON public.queries(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queries_is_saved ON public.queries(is_saved) WHERE is_saved = true;

-- Function to increment access count
CREATE OR REPLACE FUNCTION public.increment_query_access_count(query_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.queries 
  SET access_count = access_count + 1,
      last_accessed_at = NOW()
  WHERE id = query_uuid
  RETURNING access_count INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate title from prompt
CREATE OR REPLACE FUNCTION public.generate_query_title()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.title IS NULL OR NEW.title = '' THEN
    NEW.title = LEFT(TRIM(REGEXP_REPLACE(NEW.prompt, '\s+', ' ', 'g')), 100);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate title
DROP TRIGGER IF EXISTS queries_auto_title ON public.queries;
CREATE TRIGGER queries_auto_title
  BEFORE INSERT ON public.queries
  FOR EACH ROW EXECUTE FUNCTION public.generate_query_title();