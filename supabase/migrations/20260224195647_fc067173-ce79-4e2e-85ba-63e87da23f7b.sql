
-- Fix get_platform_stats to count states from ALL sources and fix freshness
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS TABLE(
  total_contracts BIGINT, total_contract_value NUMERIC,
  total_idvs BIGINT, total_idv_value NUMERIC,
  total_grants BIGINT, total_grant_value NUMERIC,
  total_opportunities BIGINT, total_sbir BIGINT,
  total_sam_entities BIGINT, total_exclusions BIGINT,
  total_nsf BIGINT, total_fpds BIGINT,
  total_subawards BIGINT, total_labor_rates BIGINT,
  total_entities BIGINT, total_relationships BIGINT,
  total_records BIGINT, data_sources INT,
  distinct_agencies BIGINT, distinct_states BIGINT,
  last_vacuum_at TIMESTAMPTZ, last_vacuum_status TEXT, last_vacuum_loaded INT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_c BIGINT:=0; v_cv NUMERIC:=0; v_i BIGINT:=0; v_iv NUMERIC:=0;
  v_g BIGINT:=0; v_gv NUMERIC:=0; v_o BIGINT:=0; v_s BIGINT:=0;
  v_se BIGINT:=0; v_ex BIGINT:=0; v_n BIGINT:=0; v_f BIGINT:=0;
  v_sub BIGINT:=0; v_lr BIGINT:=0; v_ent BIGINT:=0; v_rel BIGINT:=0;
  v_ag BIGINT:=0; v_st BIGINT:=0;
  v_la TIMESTAMPTZ; v_ls TEXT; v_ll INT:=0;
  has_cat BOOLEAN:=false;
BEGIN
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='contracts' AND column_name='contract_category') INTO has_cat;
  IF has_cat THEN
    SELECT COUNT(*),COALESCE(SUM(award_amount),0) INTO v_c,v_cv FROM contracts WHERE contract_category='contract' OR contract_category IS NULL;
    SELECT COUNT(*),COALESCE(SUM(award_amount),0) INTO v_i,v_iv FROM contracts WHERE contract_category='idv';
  ELSE
    SELECT COUNT(*),COALESCE(SUM(award_amount),0) INTO v_c,v_cv FROM contracts;
  END IF;
  BEGIN SELECT COUNT(*),COALESCE(SUM(award_amount),0) INTO v_g,v_gv FROM grants; EXCEPTION WHEN others THEN NULL; END;
  BEGIN SELECT COUNT(*) INTO v_o FROM opportunities; EXCEPTION WHEN others THEN NULL; END;
  BEGIN SELECT COUNT(*) INTO v_s FROM sbir_awards; EXCEPTION WHEN others THEN NULL; END;
  BEGIN SELECT COUNT(*) INTO v_se FROM sam_entities; EXCEPTION WHEN others THEN NULL; END;
  BEGIN SELECT COUNT(*) INTO v_ex FROM sam_exclusions; EXCEPTION WHEN others THEN NULL; END;
  BEGIN SELECT COUNT(*) INTO v_n FROM nsf_awards; EXCEPTION WHEN others THEN NULL; END;
  BEGIN SELECT COUNT(*) INTO v_f FROM fpds_awards; EXCEPTION WHEN others THEN NULL; END;
  BEGIN SELECT COUNT(*) INTO v_sub FROM subawards; EXCEPTION WHEN others THEN NULL; END;
  BEGIN SELECT COUNT(*) INTO v_lr FROM gsa_labor_rates; EXCEPTION WHEN others THEN NULL; END;
  BEGIN SELECT COUNT(*) INTO v_ent FROM core_entities; EXCEPTION WHEN others THEN NULL; END;
  BEGIN SELECT COUNT(*) INTO v_rel FROM core_relationships; EXCEPTION WHEN others THEN NULL; END;
  SELECT COUNT(DISTINCT awarding_agency) INTO v_ag FROM contracts WHERE awarding_agency IS NOT NULL;
  
  -- Count states from ALL sources
  SELECT COUNT(DISTINCT state_code) INTO v_st FROM (
    SELECT pop_state as state_code FROM contracts WHERE pop_state IS NOT NULL
    UNION
    SELECT state as state_code FROM core_entities WHERE state IS NOT NULL
    UNION
    SELECT recipient_state as state_code FROM grants WHERE recipient_state IS NOT NULL
  ) all_states;
  
  BEGIN SELECT completed_at,status,total_loaded INTO v_la,v_ls,v_ll FROM vacuum_runs WHERE status IN ('completed','completed_with_errors') ORDER BY completed_at DESC LIMIT 1; EXCEPTION WHEN others THEN NULL; END;
  
  -- If no vacuum run, use latest contract update as proxy
  IF v_la IS NULL THEN
    BEGIN SELECT MAX(updated_at) INTO v_la FROM contracts; EXCEPTION WHEN others THEN NULL; END;
    v_ls := 'synced';
    v_ll := 0;
  END IF;
  
  RETURN QUERY SELECT v_c,v_cv,v_i,v_iv,v_g,v_gv,v_o,v_s,v_se,v_ex,v_n,v_f,v_sub,v_lr,v_ent,v_rel,
    (v_c+v_i+v_g+v_o+v_s+v_se+v_ex+v_n+v_f+v_sub+v_lr),10::INT,v_ag,v_st,v_la,v_ls,v_ll;
END;
$$;
