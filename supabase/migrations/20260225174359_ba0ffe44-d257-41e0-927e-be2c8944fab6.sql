DROP FUNCTION IF EXISTS public.get_platform_stats();

CREATE FUNCTION public.get_platform_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  contract_count bigint := 0;
  contract_value numeric := 0;
  grant_count bigint := 0;
  grant_value numeric := 0;
  idv_count bigint := 0;
  idv_value numeric := 0;
  entity_count bigint := 0;
  opp_count bigint := 0;
  sbir_count bigint := 0;
  sam_entity_count bigint := 0;
  exclusion_count bigint := 0;
  nsf_count bigint := 0;
  subaward_count bigint := 0;
  labor_rate_count bigint := 0;
  distinct_states bigint := 0;
  distinct_agencies bigint := 0;
  last_vacuum timestamp with time zone := null;
  total_records bigint := 0;
BEGIN
  BEGIN SELECT COUNT(*), COALESCE(SUM(award_amount),0) INTO contract_count, contract_value FROM contracts WHERE contract_category = 'contract' OR contract_category IS NULL; EXCEPTION WHEN others THEN NULL; END;
  BEGIN SELECT COUNT(*), COALESCE(SUM(award_amount),0) INTO grant_count, grant_value FROM grants; EXCEPTION WHEN others THEN NULL; END;
  BEGIN SELECT COUNT(*), COALESCE(SUM(award_amount),0) INTO idv_count, idv_value FROM contracts WHERE contract_category = 'idv'; EXCEPTION WHEN others THEN NULL; END;
  BEGIN SELECT COUNT(*) INTO entity_count FROM core_entities; EXCEPTION WHEN others THEN NULL; END;
  BEGIN SELECT COUNT(*) INTO opp_count FROM opportunities; EXCEPTION WHEN others THEN NULL; END;
  BEGIN SELECT COUNT(*) INTO sbir_count FROM sbir_awards; EXCEPTION WHEN others THEN NULL; END;
  BEGIN SELECT COUNT(*) INTO sam_entity_count FROM sam_entities; EXCEPTION WHEN others THEN NULL; END;
  BEGIN SELECT COUNT(*) INTO exclusion_count FROM sam_exclusions; EXCEPTION WHEN others THEN NULL; END;
  BEGIN SELECT COUNT(*) INTO nsf_count FROM nsf_awards; EXCEPTION WHEN others THEN NULL; END;
  BEGIN SELECT COUNT(*) INTO subaward_count FROM subawards; EXCEPTION WHEN others THEN NULL; END;
  BEGIN SELECT COUNT(*) INTO labor_rate_count FROM gsa_labor_rates; EXCEPTION WHEN others THEN NULL; END;

  -- Only count valid 2-letter state codes (filters out dirty multi-state strings)
  BEGIN
    distinct_states := (
      SELECT COUNT(DISTINCT state_code) FROM (
        SELECT pop_state as state_code FROM contracts WHERE pop_state IS NOT NULL AND LENGTH(TRIM(pop_state)) = 2
        UNION
        SELECT state as state_code FROM core_entities WHERE state IS NOT NULL AND LENGTH(TRIM(state)) = 2
        UNION
        SELECT recipient_state as state_code FROM grants WHERE recipient_state IS NOT NULL AND LENGTH(TRIM(recipient_state)) = 2
      ) all_states
    );
  EXCEPTION WHEN others THEN NULL;
  END;

  BEGIN SELECT COUNT(DISTINCT awarding_agency) INTO distinct_agencies FROM contracts WHERE awarding_agency IS NOT NULL; EXCEPTION WHEN others THEN NULL; END;

  BEGIN
    SELECT completed_at INTO last_vacuum FROM vacuum_runs WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 1;
    IF last_vacuum IS NULL THEN SELECT MAX(updated_at) INTO last_vacuum FROM contracts; END IF;
  EXCEPTION WHEN others THEN NULL;
  END;

  total_records := contract_count + grant_count + idv_count + opp_count + sbir_count + sam_entity_count + exclusion_count + nsf_count + subaward_count + labor_rate_count;

  result := jsonb_build_object(
    'total_records', total_records,
    'contract_count', contract_count, 'contract_value', contract_value,
    'grant_count', grant_count, 'grant_value', grant_value,
    'idv_count', idv_count, 'idv_value', idv_value,
    'entity_count', entity_count, 'opportunity_count', opp_count,
    'sbir_count', sbir_count, 'sam_entity_count', sam_entity_count,
    'exclusion_count', exclusion_count, 'nsf_count', nsf_count,
    'subaward_count', subaward_count, 'labor_rate_count', labor_rate_count,
    'distinct_states', distinct_states, 'distinct_agencies', distinct_agencies,
    'last_vacuum_at', last_vacuum
  );
  RETURN result;
END;
$$;