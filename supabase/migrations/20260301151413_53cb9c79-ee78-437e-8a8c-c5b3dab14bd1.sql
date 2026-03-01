
-- ============================================================
-- SECURITY HARDENING — Target 90/100
-- ============================================================

-- 1. Force RLS on user_profiles and profiles (prevents table owner bypass)
ALTER TABLE public.user_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- 2. Revoke direct access from anon on sensitive tables
REVOKE ALL ON public.user_profiles FROM anon;
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.admin_audit_log FROM anon;
REVOKE ALL ON public.credit_transactions FROM anon;

-- 3. Tighten core_feedback — restrict INSERT to authenticated users only
DROP POLICY IF EXISTS "core_feedback_insert" ON public.core_feedback;
CREATE POLICY "core_feedback_insert" ON public.core_feedback
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 4. Drop overly permissive "Service role write" ALL policies (USING true)
-- Edge functions use service_role key which bypasses RLS entirely,
-- so these policies only opened write access to regular users unnecessarily.
DROP POLICY IF EXISTS "Service role write access for contracts" ON public.contracts;
DROP POLICY IF EXISTS "Service role write access for analytics_daily" ON public.analytics_daily;
DROP POLICY IF EXISTS "Service write data_quality_logs" ON public.data_quality_logs;
DROP POLICY IF EXISTS "Service write derivation_runs" ON public.derivation_runs;
DROP POLICY IF EXISTS "Service write entity_aliases" ON public.entity_aliases;
DROP POLICY IF EXISTS "Service write entity_identifiers" ON public.entity_identifiers;
DROP POLICY IF EXISTS "Service write entity_merge_candidates" ON public.entity_merge_candidates;
DROP POLICY IF EXISTS "Service write entity_merges" ON public.entity_merges;
DROP POLICY IF EXISTS "Service role write for health_scores" ON public.entity_health_scores;
DROP POLICY IF EXISTS "Service role write for classifications" ON public.contract_classifications;
DROP POLICY IF EXISTS "Service role full access to circuit_breakers" ON public.api_circuit_breakers;
DROP POLICY IF EXISTS "Service role full access to dead_letter" ON public.discovery_dead_letter;
DROP POLICY IF EXISTS "Service role full access" ON public.flywheel_discovery_queue;

-- 5. Drop overly broad anonymous queries policy
DROP POLICY IF EXISTS "Allow anonymous queries" ON public.queries;

-- 6. Drop duplicate saved_searches policy
DROP POLICY IF EXISTS "Users can manage own searches" ON public.saved_searches;
