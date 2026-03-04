-- BATCH 2: datasets, queries, ai_conversations (drop existing first)
DROP POLICY IF EXISTS "Users view own datasets" ON public.datasets;
DROP POLICY IF EXISTS "Users manage own datasets" ON public.datasets;
CREATE POLICY "Users view own datasets" ON public.datasets FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_public = true);
CREATE POLICY "Users manage own datasets" ON public.datasets FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE IF EXISTS public.queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.queries FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own queries" ON public.queries;
DROP POLICY IF EXISTS "Users view own queries" ON public.queries;
DROP POLICY IF EXISTS "Users insert own queries" ON public.queries;
CREATE POLICY "Users view own queries" ON public.queries FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own queries" ON public.queries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can manage own conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users view own ai_conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users manage own ai_conversations" ON public.ai_conversations;
CREATE POLICY "Users view own ai_conversations" ON public.ai_conversations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users manage own ai_conversations" ON public.ai_conversations FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());