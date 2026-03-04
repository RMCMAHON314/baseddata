-- BATCH 4: embed_widgets, portfolios, opportunity_pipeline, entity_watchlist, scheduled_pipelines, generated_reports, user_feedback

ALTER TABLE IF EXISTS public.embed_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.embed_widgets FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own embed_widgets" ON public.embed_widgets;
CREATE POLICY "Users manage own embed_widgets" ON public.embed_widgets FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE IF EXISTS public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.portfolios FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Users manage own portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Anyone can view public portfolios" ON public.portfolios;
CREATE POLICY "Users manage own portfolios" ON public.portfolios FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Anyone can view public portfolios" ON public.portfolios FOR SELECT TO anon, authenticated USING (is_public = true);

ALTER TABLE IF EXISTS public.opportunity_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.opportunity_pipeline FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own opportunity_pipeline" ON public.opportunity_pipeline;
CREATE POLICY "Users manage own opportunity_pipeline" ON public.opportunity_pipeline FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE IF EXISTS public.entity_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.entity_watchlist FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own entity_watchlist" ON public.entity_watchlist;
CREATE POLICY "Users manage own entity_watchlist" ON public.entity_watchlist FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE IF EXISTS public.scheduled_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.scheduled_pipelines FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own scheduled_pipelines" ON public.scheduled_pipelines;
CREATE POLICY "Users manage own scheduled_pipelines" ON public.scheduled_pipelines FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE IF EXISTS public.generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.generated_reports FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own generated_reports" ON public.generated_reports;
DROP POLICY IF EXISTS "Anyone can view public reports" ON public.generated_reports;
CREATE POLICY "Users manage own generated_reports" ON public.generated_reports FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Anyone can view public reports" ON public.generated_reports FOR SELECT TO anon, authenticated USING (is_public = true);

ALTER TABLE IF EXISTS public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_feedback FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own user_feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Admins view all feedback" ON public.user_feedback;
CREATE POLICY "Users manage own user_feedback" ON public.user_feedback FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins view all feedback" ON public.user_feedback FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));