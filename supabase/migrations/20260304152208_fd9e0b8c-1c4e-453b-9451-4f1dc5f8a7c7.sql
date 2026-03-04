-- BATCH 3: saved_searches, search_history, webhooks, shared_links, referrals, data_exports

ALTER TABLE IF EXISTS public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.saved_searches FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own saved searches" ON public.saved_searches;
DROP POLICY IF EXISTS "Users manage own saved_searches" ON public.saved_searches;
CREATE POLICY "Users manage own saved_searches" ON public.saved_searches FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE IF EXISTS public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.search_history FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own search history" ON public.search_history;
DROP POLICY IF EXISTS "Users manage own search_history" ON public.search_history;
CREATE POLICY "Users manage own search_history" ON public.search_history FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE IF EXISTS public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.webhooks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own webhooks" ON public.webhooks;
DROP POLICY IF EXISTS "Users manage own webhooks" ON public.webhooks;
CREATE POLICY "Users manage own webhooks" ON public.webhooks FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE IF EXISTS public.shared_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shared_links FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own shared links" ON public.shared_links;
DROP POLICY IF EXISTS "Users manage own shared_links" ON public.shared_links;
CREATE POLICY "Users manage own shared_links" ON public.shared_links FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE IF EXISTS public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referrals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users view own referrals" ON public.referrals;
CREATE POLICY "Users view own referrals" ON public.referrals FOR SELECT TO authenticated USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());

ALTER TABLE IF EXISTS public.data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.data_exports FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own exports" ON public.data_exports;
DROP POLICY IF EXISTS "Users manage own data_exports" ON public.data_exports;
CREATE POLICY "Users manage own data_exports" ON public.data_exports FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());