
-- P0: Tighten user_profiles RLS (drop old permissive policies, recreate with authenticated role)
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update user profiles" ON public.user_profiles;

CREATE POLICY "Owner can view own profile" ON public.user_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Owner can update own profile" ON public.user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Owner can insert own profile" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Admin can view all user profiles" ON public.user_profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can update user profiles" ON public.user_profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- P0: Tighten profiles RLS
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Owner can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- P1: Harden all custom functions with search_path (exact signatures)
ALTER FUNCTION public.capture_health_snapshot() SET search_path = public;
ALTER FUNCTION public.count_unresolved_records() SET search_path = public;
ALTER FUNCTION public.create_shared_link(uuid, text, text, jsonb, integer) SET search_path = public;
ALTER FUNCTION public.derive_relationships() SET search_path = public;
ALTER FUNCTION public.detect_anomalies(integer, numeric) SET search_path = public;
ALTER FUNCTION public.discover_transitive_relationships(numeric, integer) SET search_path = public;
ALTER FUNCTION public.find_low_coverage_areas() SET search_path = public;
ALTER FUNCTION public.find_nearby_entities_by_name(text, numeric, numeric, numeric) SET search_path = public;
ALTER FUNCTION public.find_potential_duplicates(uuid, numeric) SET search_path = public;
ALTER FUNCTION public.find_unconnected_same_city_entities(integer) SET search_path = public;
ALTER FUNCTION public.find_unconnected_same_type_state(integer) SET search_path = public;
ALTER FUNCTION public.generate_entity_profile(uuid) SET search_path = public;
ALTER FUNCTION public.generate_market_insights() SET search_path = public;
ALTER FUNCTION public.get_admin_stats() SET search_path = public;
ALTER FUNCTION public.get_fact_poor_entities(integer, integer, integer) SET search_path = public;
ALTER FUNCTION public.get_system_stats() SET search_path = public;
ALTER FUNCTION public.get_under_explored_entities(integer, integer) SET search_path = public;
ALTER FUNCTION public.get_user_dashboard(uuid) SET search_path = public;
ALTER FUNCTION public.increment_search_count(uuid) SET search_path = public;
ALTER FUNCTION public.log_kraken_crawl(text, integer, integer, integer, integer, integer, jsonb, jsonb) SET search_path = public;
ALTER FUNCTION public.ml_duplicate_score(text, text, text, text, text, text) SET search_path = public;
ALTER FUNCTION public.queue_kraken_discovery(text, text, jsonb, integer, jsonb) SET search_path = public;
ALTER FUNCTION public.recalculate_opportunity_scores(integer) SET search_path = public;
ALTER FUNCTION public.reset_monthly_search_counts() SET search_path = public;
ALTER FUNCTION public.semantx_search(text, text[], text[], numeric, numeric, integer) SET search_path = public;
ALTER FUNCTION public.update_opportunity_search_text() SET search_path = public;
ALTER FUNCTION public.update_source_health(text, boolean, integer) SET search_path = public;
