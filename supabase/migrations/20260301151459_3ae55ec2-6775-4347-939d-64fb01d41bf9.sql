
-- Add read-only policies for tables that have RLS enabled but no policies
-- These are internal system tables — admin-only read access

CREATE POLICY "Admin read flywheel_collection_log" ON public.flywheel_collection_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin read flywheel_crawl_log" ON public.flywheel_crawl_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin read flywheel_dead_letter_queue" ON public.flywheel_dead_letter_queue
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin read flywheel_metrics" ON public.flywheel_metrics
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin read flywheel_source_health" ON public.flywheel_source_health
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin read search_logs" ON public.search_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
