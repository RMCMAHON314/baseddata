-- Fix search_path for the queue_ingestion_jobs function
CREATE OR REPLACE FUNCTION public.queue_ingestion_jobs()
RETURNS INTEGER AS $$
DECLARE
  queued_count INTEGER := 0;
BEGIN
  INSERT INTO public.ingestion_queue (source_slug, priority, scheduled_for)
  SELECT s.slug, s.priority, NOW()
  FROM public.ingestion_sources s
  WHERE s.is_active = TRUE
    AND (s.last_fetched_at IS NULL OR s.last_fetched_at < NOW() - (s.fetch_interval_hours || ' hours')::INTERVAL)
    AND NOT EXISTS (
      SELECT 1 FROM public.ingestion_queue q 
      WHERE q.source_slug = s.slug AND q.status IN ('pending', 'processing')
    )
  ORDER BY s.priority DESC
  LIMIT 10;
  
  GET DIAGNOSTICS queued_count = ROW_COUNT;
  RETURN queued_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;