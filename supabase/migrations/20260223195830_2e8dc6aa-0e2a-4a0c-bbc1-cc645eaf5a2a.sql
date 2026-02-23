
-- Create gsa_labor_rates table
CREATE TABLE IF NOT EXISTS gsa_labor_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  labor_category TEXT NOT NULL,
  vendor_name TEXT,
  idv_piid TEXT,
  current_price DECIMAL(10,2),
  second_year_price DECIMAL(10,2),
  next_year_price DECIMAL(10,2),
  min_years_experience INT,
  education_level TEXT,
  business_size TEXT,
  security_clearance TEXT,
  site TEXT,
  schedule TEXT,
  sin TEXT,
  source TEXT DEFAULT 'gsa_calc',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_name, idv_piid, labor_category)
);
CREATE INDEX IF NOT EXISTS idx_gsa_labor_category ON gsa_labor_rates(labor_category);
CREATE INDEX IF NOT EXISTS idx_gsa_vendor ON gsa_labor_rates(vendor_name);
CREATE INDEX IF NOT EXISTS idx_gsa_price ON gsa_labor_rates(current_price DESC);
ALTER TABLE gsa_labor_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read gsa" ON gsa_labor_rates FOR SELECT USING (true);
CREATE POLICY "Service write gsa" ON gsa_labor_rates FOR ALL USING (true) WITH CHECK (true);

-- Now recreate get_platform_stats with safety
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS TABLE(
  total_contracts BIGINT, total_contract_value NUMERIC,
  total_idvs BIGINT, total_idv_value NUMERIC,
  total_grants BIGINT, total_grant_value NUMERIC,
  total_opportunities BIGINT,
  total_sbir BIGINT,
  total_sam_entities BIGINT,
  total_exclusions BIGINT,
  total_nsf BIGINT,
  total_fpds BIGINT,
  total_subawards BIGINT,
  total_labor_rates BIGINT,
  total_entities BIGINT,
  total_relationships BIGINT,
  total_records BIGINT,
  data_sources INT,
  distinct_agencies BIGINT,
  distinct_states BIGINT,
  last_vacuum_at TIMESTAMPTZ,
  last_vacuum_loaded INT
)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_c BIGINT; v_cv NUMERIC; v_i BIGINT; v_iv NUMERIC;
  v_g BIGINT; v_gv NUMERIC; v_o BIGINT; v_s BIGINT;
  v_se BIGINT; v_ex BIGINT; v_n BIGINT; v_f BIGINT;
  v_sub BIGINT; v_lr BIGINT; v_ent BIGINT; v_rel BIGINT;
  v_agencies BIGINT; v_states BIGINT;
  v_last_at TIMESTAMPTZ; v_last_loaded INT;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(award_amount),0) INTO v_c, v_cv FROM contracts WHERE contract_category = 'contract' OR contract_category IS NULL;
  SELECT COUNT(*), COALESCE(SUM(award_amount),0) INTO v_i, v_iv FROM contracts WHERE contract_category = 'idv';
  SELECT COUNT(*), COALESCE(SUM(award_amount),0) INTO v_g, v_gv FROM grants;
  SELECT COUNT(*) INTO v_o FROM opportunities;
  SELECT COUNT(*) INTO v_s FROM sbir_awards;
  SELECT COUNT(*) INTO v_se FROM sam_entities;
  SELECT COUNT(*) INTO v_ex FROM sam_exclusions;
  SELECT COUNT(*) INTO v_n FROM nsf_awards;
  SELECT COUNT(*) INTO v_f FROM fpds_awards;
  SELECT COUNT(*) INTO v_sub FROM subawards;
  SELECT COUNT(*) INTO v_lr FROM gsa_labor_rates;
  SELECT COUNT(*) INTO v_ent FROM core_entities;
  SELECT COUNT(*) INTO v_rel FROM core_relationships;
  SELECT COUNT(DISTINCT awarding_agency) INTO v_agencies FROM contracts WHERE awarding_agency IS NOT NULL;
  SELECT COUNT(DISTINCT pop_state) INTO v_states FROM contracts WHERE pop_state IS NOT NULL;
  SELECT completed_at, total_loaded INTO v_last_at, v_last_loaded FROM vacuum_runs
    WHERE status IN ('completed', 'completed_with_errors') ORDER BY completed_at DESC LIMIT 1;

  RETURN QUERY SELECT v_c, v_cv, v_i, v_iv, v_g, v_gv, v_o, v_s, v_se, v_ex, v_n, v_f, v_sub, v_lr, v_ent, v_rel,
    (v_c + v_i + v_g + v_o + v_s + v_se + v_ex + v_n + v_f + v_sub + v_lr),
    10, v_agencies, v_states, v_last_at, v_last_loaded;
END; $$;
