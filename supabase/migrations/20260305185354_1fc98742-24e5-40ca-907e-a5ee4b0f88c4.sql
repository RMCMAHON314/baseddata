-- 1. Revoke direct API access to materialized views (security lint)
REVOKE ALL ON public.top_entities_mv FROM anon, authenticated;
REVOKE ALL ON public.mv_top_contractors FROM anon, authenticated;
REVOKE ALL ON public.mv_agency_spending FROM anon, authenticated;
REVOKE ALL ON public.mv_state_spending FROM anon, authenticated;

-- 2. Fix queries table: allow anonymous inserts for search history (public feature)
DROP POLICY IF EXISTS "Users can create queries" ON public.queries;
DROP POLICY IF EXISTS "Users insert own queries" ON public.queries;

CREATE POLICY "Anon and auth can insert queries"
  ON public.queries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anon to read queries by session_id (no user_id check for anonymous users)
DROP POLICY IF EXISTS "Users view own queries" ON public.queries;
CREATE POLICY "Users view own or session queries"
  ON public.queries FOR SELECT
  TO anon, authenticated
  USING (
    user_id = auth.uid() 
    OR (user_id IS NULL AND session_id IS NOT NULL)
  );