
-- Revoke anon access from api_keys (was missed in phase 1)
REVOKE ALL ON public.api_keys FROM anon;

-- Force RLS on api_keys and credit_transactions too
ALTER TABLE public.api_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions FORCE ROW LEVEL SECURITY;

-- Also restrict api_keys policy to authenticated only (currently uses {public} role)
DROP POLICY IF EXISTS "Users can manage their own API keys" ON public.api_keys;
CREATE POLICY "Users can manage their own API keys" ON public.api_keys
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
