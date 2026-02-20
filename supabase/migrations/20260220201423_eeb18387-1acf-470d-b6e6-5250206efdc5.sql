
-- =====================================================
-- FIX 1: Patch trigger_entity_expansion (source -> target_source)
-- =====================================================
CREATE OR REPLACE FUNCTION public.trigger_entity_expansion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.flywheel_discovery_queue (target_type, target_value, target_source, priority, status)
  VALUES 
    ('name_variation', NEW.canonical_name || ' Inc', 'auto_expansion', 2, 'pending'),
    ('name_variation', NEW.canonical_name || ' LLC', 'auto_expansion', 2, 'pending'),
    ('industry_peer', NEW.entity_type || ' companies', 'auto_expansion', 3, 'pending'),
    ('competitor', NEW.canonical_name || ' competitors', 'auto_expansion', 2, 'pending')
  ON CONFLICT (target_type, target_value) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- =====================================================
-- FIX 2: Enable RLS on 8 unprotected tables
-- =====================================================
ALTER TABLE public.derivation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_merge_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_merges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocean_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_types ENABLE ROW LEVEL SECURITY;

-- Public read for system/reference tables
CREATE POLICY "Public read entity_aliases" ON public.entity_aliases FOR SELECT USING (true);
CREATE POLICY "Public read entity_identifiers" ON public.entity_identifiers FOR SELECT USING (true);
CREATE POLICY "Public read entity_merge_candidates" ON public.entity_merge_candidates FOR SELECT USING (true);
CREATE POLICY "Public read entity_merges" ON public.entity_merges FOR SELECT USING (true);
CREATE POLICY "Public read insights" ON public.insights FOR SELECT USING (true);
CREATE POLICY "Public read ocean_health_snapshots" ON public.ocean_health_snapshots FOR SELECT USING (true);
CREATE POLICY "Public read relationship_types" ON public.relationship_types FOR SELECT USING (true);
CREATE POLICY "Public read derivation_runs" ON public.derivation_runs FOR SELECT USING (true);

-- Service-role write for system tables
CREATE POLICY "Service write entity_aliases" ON public.entity_aliases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write entity_identifiers" ON public.entity_identifiers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write entity_merge_candidates" ON public.entity_merge_candidates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write entity_merges" ON public.entity_merges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write insights" ON public.insights FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write ocean_health_snapshots" ON public.ocean_health_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write relationship_types" ON public.relationship_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write derivation_runs" ON public.derivation_runs FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- FIX 3: Harden key functions with search_path
-- =====================================================
CREATE OR REPLACE FUNCTION public.trigger_relationship_cascade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE core_entities SET source_count = COALESCE(source_count, 0) + 1
  WHERE id = NEW.from_entity_id OR id = NEW.to_entity_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_entity_search_text()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_text := LOWER(COALESCE(NEW.canonical_name, '') || ' ' || 
    COALESCE(NEW.city, '') || ' ' || COALESCE(NEW.state, '') || ' ' ||
    COALESCE(NEW.entity_type, '') || ' ' || COALESCE(NEW.description, '') || ' ' ||
    COALESCE(array_to_string(NEW.alternate_names, ' '), '') || ' ' ||
    COALESCE(NEW.uei, '') || ' ' || COALESCE(NEW.duns, '') || ' ' ||
    COALESCE(NEW.cage_code, '') || ' ' || COALESCE(NEW.ein, ''));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_contract_search_text()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_text := LOWER(COALESCE(NEW.recipient_name, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.awarding_agency, '') || ' ' ||
    COALESCE(NEW.naics_code, '') || ' ' || COALESCE(NEW.naics_description, '') || ' ' ||
    COALESCE(NEW.psc_code, '') || ' ' || COALESCE(NEW.psc_description, '') || ' ' ||
    COALESCE(NEW.pop_state, '') || ' ' || COALESCE(NEW.pop_city, ''));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at)
  VALUES (NEW.id, NEW.email, NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_all_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_contractors;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_agency_spending;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_state_spending;
END;
$$;

-- Drop and recreate sync_all_entity_stats (return type changed)
DROP FUNCTION IF EXISTS public.sync_all_entity_stats();
CREATE FUNCTION public.sync_all_entity_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE core_entities ce SET
    contract_count = COALESCE(sub.cnt, 0),
    total_contract_value = COALESCE(sub.total_val, 0)
  FROM (
    SELECT recipient_entity_id, COUNT(*) as cnt, SUM(COALESCE(award_amount, 0)) as total_val
    FROM contracts
    WHERE recipient_entity_id IS NOT NULL
    GROUP BY recipient_entity_id
  ) sub
  WHERE ce.id = sub.recipient_entity_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.discover_relationships()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_count integer := 0;
BEGIN
  INSERT INTO core_relationships (from_entity_id, to_entity_id, relationship_type, strength, confidence, evidence)
  SELECT DISTINCT
    c1.recipient_entity_id,
    c2.recipient_entity_id,
    'co_agency',
    0.6,
    0.8,
    jsonb_build_array(jsonb_build_object('source', 'contract_analysis', 'agency', c1.awarding_agency))
  FROM contracts c1
  JOIN contracts c2 ON c1.awarding_agency = c2.awarding_agency 
    AND c1.recipient_entity_id < c2.recipient_entity_id
    AND c1.recipient_entity_id IS NOT NULL 
    AND c2.recipient_entity_id IS NOT NULL
  ON CONFLICT (from_entity_id, to_entity_id, relationship_type) DO NOTHING;
  
  GET DIAGNOSTICS found_count = ROW_COUNT;
  RETURN found_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_insights()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  insight_count integer := 0;
BEGIN
  INSERT INTO core_derived_insights (insight_type, scope_type, title, description, supporting_data, confidence)
  SELECT 
    'top_contractor', 'global',
    canonical_name || ' is a top contractor',
    canonical_name || ' has ' || contract_count || ' contracts worth $' || ROUND(COALESCE(total_contract_value,0)/1e6, 1) || 'M',
    jsonb_build_object('entity_id', id, 'contracts', contract_count, 'value', total_contract_value),
    0.95
  FROM core_entities
  WHERE contract_count > 5 AND is_canonical = true
  ORDER BY total_contract_value DESC NULLS LAST
  LIMIT 20
  ON CONFLICT DO NOTHING;
  
  GET DIAGNOSTICS insight_count = ROW_COUNT;
  RETURN insight_count;
END;
$$;
