
-- ============================================================
-- SECURITY HARDENING PHASE 4 — Lock down ALL user-owned tables
-- Change all policies from {public} to {authenticated} and revoke anon
-- ============================================================

-- 1. Revoke anon from all user-data tables
REVOKE ALL ON public.api_usage_logs FROM anon;
REVOKE ALL ON public.opportunity_pipeline FROM anon;
REVOKE ALL ON public.entity_watchlist FROM anon;
REVOKE ALL ON public.search_history FROM anon;
REVOKE ALL ON public.scheduled_pipelines FROM anon;
REVOKE ALL ON public.data_exports FROM anon;
REVOKE ALL ON public.embed_widgets FROM anon;
REVOKE ALL ON public.referrals FROM anon;
REVOKE ALL ON public.user_feedback FROM anon;
REVOKE ALL ON public.ai_conversations FROM anon;
REVOKE ALL ON public.saved_searches FROM anon;
REVOKE ALL ON public.portfolios FROM anon;
REVOKE ALL ON public.webhooks FROM anon;
REVOKE ALL ON public.shared_links FROM anon;
REVOKE ALL ON public.queries FROM anon;
REVOKE ALL ON public.datasets FROM anon;

-- 2. Force RLS on all user-data tables
ALTER TABLE public.api_usage_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_pipeline FORCE ROW LEVEL SECURITY;
ALTER TABLE public.entity_watchlist FORCE ROW LEVEL SECURITY;
ALTER TABLE public.search_history FORCE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_pipelines FORCE ROW LEVEL SECURITY;
ALTER TABLE public.data_exports FORCE ROW LEVEL SECURITY;
ALTER TABLE public.embed_widgets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.referrals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches FORCE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios FORCE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.shared_links FORCE ROW LEVEL SECURITY;
ALTER TABLE public.queries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.datasets FORCE ROW LEVEL SECURITY;

-- 3. Recreate policies with authenticated-only access

-- api_usage_logs
DROP POLICY IF EXISTS "Users can view logs for their API keys" ON public.api_usage_logs;
CREATE POLICY "Users can view logs for their API keys" ON public.api_usage_logs
  FOR SELECT TO authenticated
  USING (api_key_id IN (SELECT id FROM api_keys WHERE user_id = auth.uid()));

-- opportunity_pipeline
DROP POLICY IF EXISTS "Users can manage own pipeline" ON public.opportunity_pipeline;
CREATE POLICY "Users can manage own pipeline" ON public.opportunity_pipeline
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- entity_watchlist
DROP POLICY IF EXISTS "Users can manage own watchlist" ON public.entity_watchlist;
CREATE POLICY "Users can manage own watchlist" ON public.entity_watchlist
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- search_history
DROP POLICY IF EXISTS "Users can manage own history" ON public.search_history;
CREATE POLICY "Users can manage own history" ON public.search_history
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- scheduled_pipelines
DROP POLICY IF EXISTS "Users can manage their own scheduled pipelines" ON public.scheduled_pipelines;
CREATE POLICY "Users can manage their own scheduled pipelines" ON public.scheduled_pipelines
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- data_exports
DROP POLICY IF EXISTS "Users own exports" ON public.data_exports;
CREATE POLICY "Users own exports" ON public.data_exports
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- embed_widgets
DROP POLICY IF EXISTS "Users own widgets" ON public.embed_widgets;
CREATE POLICY "Users own widgets" ON public.embed_widgets
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- referrals
DROP POLICY IF EXISTS "Users own referrals" ON public.referrals;
CREATE POLICY "Users own referrals" ON public.referrals
  FOR ALL TO authenticated
  USING (auth.uid() = referrer_id) WITH CHECK (auth.uid() = referrer_id);

-- user_feedback
DROP POLICY IF EXISTS "Users own feedback" ON public.user_feedback;
CREATE POLICY "Users own feedback" ON public.user_feedback
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Admin can also view all feedback
CREATE POLICY "Admin view all feedback" ON public.user_feedback
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ai_conversations
DROP POLICY IF EXISTS "Users own conversations" ON public.ai_conversations;
CREATE POLICY "Users own conversations" ON public.ai_conversations
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- saved_searches
DROP POLICY IF EXISTS "Users manage own saved searches" ON public.saved_searches;
CREATE POLICY "Users manage own saved searches" ON public.saved_searches
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- portfolios
DROP POLICY IF EXISTS "Users manage own portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Public portfolios are viewable" ON public.portfolios;
CREATE POLICY "Users manage own portfolios" ON public.portfolios
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public portfolios are viewable" ON public.portfolios
  FOR SELECT TO authenticated
  USING (is_public = true);

-- webhooks
DROP POLICY IF EXISTS "Users own webhooks" ON public.webhooks;
CREATE POLICY "Users own webhooks" ON public.webhooks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- shared_links
DROP POLICY IF EXISTS "Users own shared links" ON public.shared_links;
DROP POLICY IF EXISTS "Public links viewable" ON public.shared_links;
CREATE POLICY "Users own shared links" ON public.shared_links
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public links viewable" ON public.shared_links
  FOR SELECT TO authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- queries — restrict to authenticated only
DROP POLICY IF EXISTS "Users can create queries" ON public.queries;
DROP POLICY IF EXISTS "Users can view their own queries" ON public.queries;
CREATE POLICY "Users can create queries" ON public.queries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can view own queries" ON public.queries
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

-- datasets — already good but change to authenticated
DROP POLICY IF EXISTS "Users can create own datasets" ON public.datasets;
DROP POLICY IF EXISTS "Users can view own datasets" ON public.datasets;
DROP POLICY IF EXISTS "Users can update own datasets" ON public.datasets;
DROP POLICY IF EXISTS "Users can delete own datasets" ON public.datasets;
DROP POLICY IF EXISTS "Users can view public datasets" ON public.datasets;
CREATE POLICY "Users manage own datasets" ON public.datasets
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view public datasets" ON public.datasets
  FOR SELECT TO authenticated
  USING (is_public = true);
