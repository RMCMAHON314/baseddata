-- 1A: Contract category for IDV separation
DO $$ BEGIN
  ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_category TEXT DEFAULT 'contract';
EXCEPTION WHEN others THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_contracts_category ON contracts(contract_category);

-- 1B: Grants upsert support
DO $$ BEGIN
  ALTER TABLE grants ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'usaspending';
  ALTER TABLE grants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE grants ADD COLUMN IF NOT EXISTS grant_category TEXT DEFAULT 'grant';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grants_award_id_key') THEN
    DELETE FROM grants a USING grants b WHERE a.ctid < b.ctid AND a.award_id = b.award_id AND a.award_id IS NOT NULL;
    ALTER TABLE grants ADD CONSTRAINT grants_award_id_key UNIQUE (award_id);
  END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- 1C: Ensure gsa_labor_rates has all columns vacuum-all references
DO $$ BEGIN
  ALTER TABLE gsa_labor_rates ADD COLUMN IF NOT EXISTS second_year_price DECIMAL(10,2);
  ALTER TABLE gsa_labor_rates ADD COLUMN IF NOT EXISTS next_year_price DECIMAL(10,2);
EXCEPTION WHEN others THEN NULL; END $$;

-- 2: THE ONE STATS FUNCTION (with last_vacuum_status)
DROP FUNCTION IF EXISTS get_platform_stats();
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
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
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
  SELECT COUNT(DISTINCT pop_state) INTO v_st FROM contracts WHERE pop_state IS NOT NULL;
  BEGIN SELECT completed_at,status,total_loaded INTO v_la,v_ls,v_ll FROM vacuum_runs WHERE status IN ('completed','completed_with_errors') ORDER BY completed_at DESC LIMIT 1; EXCEPTION WHEN others THEN NULL; END;
  RETURN QUERY SELECT v_c,v_cv,v_i,v_iv,v_g,v_gv,v_o,v_s,v_se,v_ex,v_n,v_f,v_sub,v_lr,v_ent,v_rel,
    (v_c+v_i+v_g+v_o+v_s+v_se+v_ex+v_n+v_f+v_sub+v_lr),10::INT,v_ag,v_st,v_la,v_ls,v_ll;
END; $$;

-- 3: Labor rate stats
DROP FUNCTION IF EXISTS get_labor_rate_stats(TEXT);
CREATE OR REPLACE FUNCTION get_labor_rate_stats(p_keyword TEXT)
RETURNS TABLE(
  category_keyword TEXT, total_rates BIGINT,
  avg_rate DECIMAL, min_rate DECIMAL, max_rate DECIMAL, median_rate DECIMAL,
  small_biz_avg DECIMAL, large_biz_avg DECIMAL,
  vendors_count BIGINT, education_breakdown JSONB
)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  RETURN QUERY SELECT p_keyword, COUNT(*),
    ROUND(AVG(current_price)::NUMERIC,2), MIN(current_price), MAX(current_price),
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY current_price)::NUMERIC,2),
    ROUND(AVG(current_price) FILTER (WHERE business_size='S')::NUMERIC,2),
    ROUND(AVG(current_price) FILTER (WHERE business_size!='S' OR business_size IS NULL)::NUMERIC,2),
    COUNT(DISTINCT vendor_name),
    jsonb_build_object('HS',ROUND(AVG(current_price) FILTER (WHERE education_level='HS')::NUMERIC,2),
      'AA',ROUND(AVG(current_price) FILTER (WHERE education_level='AA')::NUMERIC,2),
      'BA',ROUND(AVG(current_price) FILTER (WHERE education_level='BA')::NUMERIC,2),
      'MA',ROUND(AVG(current_price) FILTER (WHERE education_level='MA')::NUMERIC,2),
      'PHD',ROUND(AVG(current_price) FILTER (WHERE education_level='PHD')::NUMERIC,2))
  FROM gsa_labor_rates WHERE labor_category ILIKE '%'||p_keyword||'%' AND current_price IS NOT NULL;
END; $$;

-- 4: Labor rate search
DROP FUNCTION IF EXISTS get_labor_rates(TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION get_labor_rates(p_keyword TEXT, p_education TEXT DEFAULT NULL, p_size TEXT DEFAULT NULL)
RETURNS TABLE(
  labor_category TEXT, vendor_name TEXT, contract_number TEXT,
  hourly_rate DECIMAL, education TEXT, min_experience INT,
  business_size TEXT, clearance TEXT
)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT g.labor_category, g.vendor_name, g.idv_piid,
    g.current_price, g.education_level, g.min_years_experience,
    g.business_size, g.security_clearance
  FROM gsa_labor_rates g
  WHERE g.labor_category ILIKE '%' || p_keyword || '%'
    AND (p_education IS NULL OR g.education_level = p_education)
    AND (p_size IS NULL OR g.business_size = p_size)
  ORDER BY g.current_price DESC;
END; $$;