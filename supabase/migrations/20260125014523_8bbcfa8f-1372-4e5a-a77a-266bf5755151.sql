-- ============================================================
-- 🔧 FULL AUDIT FIX: Database Schema & Security Hardening
-- ============================================================

-- 1. FIX: trigger_fact_enrichment uses wrong columns
-- Drop and recreate with correct column names
DROP TRIGGER IF EXISTS fact_enrichment_trigger ON public.core_facts;

CREATE OR REPLACE FUNCTION public.trigger_fact_enrichment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.fact_value->>'amount')::NUMERIC > 100000 THEN
    INSERT INTO public.flywheel_discovery_queue (
      discovery_type, 
      target_source, 
      target_query, 
      priority, 
      status, 
      context
    )
    SELECT 
      'related_facts',
      'fact_enrichment',
      jsonb_build_object(
        'search', e.canonical_name || ' ' || 
          CASE NEW.fact_type 
            WHEN 'contract_awarded' THEN 'other contracts'
            WHEN 'grant_received' THEN 'other grants'
            WHEN 'payment_received' THEN 'other payments'
            ELSE 'related data'
          END
      ),
      80,
      'pending',
      jsonb_build_object('source_fact_id', NEW.id, 'entity_id', NEW.entity_id)
    FROM public.core_entities e
    WHERE e.id = NEW.entity_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER fact_enrichment_trigger
  AFTER INSERT ON public.core_facts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_fact_enrichment();

-- 2. FIX: profiles table RLS - already has RLS but needs stricter policies
-- First check current policies and add proper ones
DO $$
BEGIN
  -- Drop existing overly permissive policies if any
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
  DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
END $$;

-- Create strict policies - users can only access their own data
CREATE POLICY "Users can view own profile only"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile only"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile only"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. FIX: record_feedback table - tighten SELECT access
DROP POLICY IF EXISTS "Anyone can read feedback" ON public.record_feedback;
DROP POLICY IF EXISTS "Users can read all feedback" ON public.record_feedback;

CREATE POLICY "Users can view own feedback"
  ON public.record_feedback FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 4. FIX: Functions missing search_path (sample of critical ones)
CREATE OR REPLACE FUNCTION public.sync_entity_contract_stats(p_entity_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE core_entities
  SET 
    total_contract_value = COALESCE((
      SELECT SUM(award_amount)
      FROM contracts
      WHERE recipient_entity_id = p_entity_id
    ), 0),
    contract_count = COALESCE((
      SELECT COUNT(*)
      FROM contracts
      WHERE recipient_entity_id = p_entity_id
    ), 0),
    updated_at = NOW()
  WHERE id = p_entity_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mega_search(
  p_query text, 
  p_entity_types text[] DEFAULT NULL::text[], 
  p_states text[] DEFAULT NULL::text[], 
  p_min_amount numeric DEFAULT NULL::numeric, 
  p_max_amount numeric DEFAULT NULL::numeric, 
  p_limit integer DEFAULT 100
)
RETURNS TABLE(id uuid, name text, result_type text, entity_type text, state text, total_value numeric, opportunity_score integer, description text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Search entities
  SELECT 
    e.id,
    e.canonical_name as name,
    'entity'::TEXT as result_type,
    e.entity_type::TEXT,
    e.state::TEXT,
    e.total_contract_value as total_value,
    e.opportunity_score,
    e.description
  FROM core_entities e
  WHERE 
    (e.canonical_name ILIKE '%' || p_query || '%' OR e.description ILIKE '%' || p_query || '%')
    AND (p_entity_types IS NULL OR e.entity_type = ANY(p_entity_types))
    AND (p_states IS NULL OR e.state = ANY(p_states))
    AND (p_min_amount IS NULL OR e.total_contract_value >= p_min_amount)
    AND (p_max_amount IS NULL OR e.total_contract_value <= p_max_amount)
  
  UNION ALL
  
  -- Search contracts
  SELECT 
    c.id,
    c.recipient_name as name,
    'contract'::TEXT as result_type,
    'contract'::TEXT as entity_type,
    c.pop_state as state,
    c.award_amount as total_value,
    NULL::INTEGER as opportunity_score,
    c.description
  FROM contracts c
  WHERE 
    (c.recipient_name ILIKE '%' || p_query || '%' OR c.description ILIKE '%' || p_query || '%')
    AND (p_states IS NULL OR c.pop_state = ANY(p_states))
    AND (p_min_amount IS NULL OR c.award_amount >= p_min_amount)
    AND (p_max_amount IS NULL OR c.award_amount <= p_max_amount)
  
  ORDER BY total_value DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_entity_360(p_entity_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'entity', (SELECT row_to_json(e.*) FROM core_entities e WHERE e.id = p_entity_id),
    'contracts', (
      SELECT COALESCE(jsonb_agg(row_to_json(c.*) ORDER BY c.award_amount DESC), '[]'::jsonb)
      FROM (SELECT * FROM contracts WHERE recipient_entity_id = p_entity_id LIMIT 100) c
    ),
    'grants', (
      SELECT COALESCE(jsonb_agg(row_to_json(g.*) ORDER BY g.award_amount DESC), '[]'::jsonb)
      FROM (SELECT * FROM grants WHERE recipient_entity_id = p_entity_id LIMIT 100) g
    ),
    'facts', (
      SELECT COALESCE(jsonb_agg(row_to_json(f.*) ORDER BY f.created_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM core_facts WHERE entity_id = p_entity_id LIMIT 100) f
    ),
    'relationships', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'type', r.relationship_type,
        'strength', r.strength,
        'direction', CASE WHEN r.from_entity_id = p_entity_id THEN 'outgoing' ELSE 'incoming' END,
        'related_entity', (
          SELECT jsonb_build_object('id', re.id, 'name', re.canonical_name, 'type', re.entity_type)
          FROM core_entities re
          WHERE re.id = CASE WHEN r.from_entity_id = p_entity_id THEN r.to_entity_id ELSE r.from_entity_id END
        )
      )), '[]'::jsonb)
      FROM core_relationships r
      WHERE r.from_entity_id = p_entity_id OR r.to_entity_id = p_entity_id
      LIMIT 50
    ),
    'stats', jsonb_build_object(
      'total_contract_value', (SELECT total_contract_value FROM core_entities WHERE id = p_entity_id),
      'contract_count', (SELECT contract_count FROM core_entities WHERE id = p_entity_id),
      'total_grant_value', (SELECT total_grant_value FROM core_entities WHERE id = p_entity_id),
      'grant_count', (SELECT grant_count FROM core_entities WHERE id = p_entity_id),
      'fact_count', (SELECT COUNT(*) FROM core_facts WHERE entity_id = p_entity_id),
      'relationship_count', (SELECT COUNT(*) FROM core_relationships WHERE from_entity_id = p_entity_id OR to_entity_id = p_entity_id)
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 5. Add missing metadata column to flywheel_discovery_queue for backwards compatibility
ALTER TABLE public.flywheel_discovery_queue 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 6. Create unique constraint that the trigger expects
CREATE UNIQUE INDEX IF NOT EXISTS idx_flywheel_discovery_unique 
ON public.flywheel_discovery_queue(discovery_type, target_source, (target_query->>'search'))
WHERE target_query->>'search' IS NOT NULL;