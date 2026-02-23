
-- Replace get_entity_360 with expanded version
DROP FUNCTION IF EXISTS get_entity_360(TEXT);
DROP FUNCTION IF EXISTS get_cross_source_profile(TEXT);

CREATE OR REPLACE FUNCTION get_entity_360(p_name TEXT)
RETURNS TABLE(
  entity_name TEXT,
  contract_count BIGINT, contract_value NUMERIC, idv_count BIGINT, idv_value NUMERIC,
  grant_count BIGINT, grant_value NUMERIC,
  sbir_count BIGINT, sbir_value NUMERIC, sbir_phases TEXT[],
  women_owned TEXT, hubzone TEXT, disadvantaged TEXT,
  sam_status TEXT, sam_cage TEXT, sam_uei TEXT, sam_expiration DATE,
  sam_business_types JSONB, sam_entity_structure TEXT,
  is_excluded BOOLEAN, exclusion_detail TEXT,
  primes_to_count BIGINT, primes_to_value NUMERIC,
  subs_for_count BIGINT, subs_for_value NUMERIC,
  fpds_count BIGINT, avg_offers NUMERIC, sole_source_pct NUMERIC,
  top_agencies JSONB, naics_codes TEXT[], states TEXT[],
  top_agency_pct NUMERIC
)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_total_val NUMERIC; v_top_agency_val NUMERIC;
BEGIN
  SELECT COALESCE(SUM(award_amount), 0) INTO v_total_val FROM contracts WHERE recipient_name ILIKE '%' || p_name || '%' AND contract_category = 'contract';
  SELECT COALESCE(MAX(agency_val), 0) INTO v_top_agency_val FROM (SELECT SUM(award_amount) as agency_val FROM contracts WHERE recipient_name ILIKE '%' || p_name || '%' AND contract_category = 'contract' GROUP BY awarding_agency ORDER BY SUM(award_amount) DESC LIMIT 1) x;
  RETURN QUERY SELECT p_name,
    (SELECT COUNT(*) FROM contracts WHERE recipient_name ILIKE '%'||p_name||'%' AND contract_category = 'contract'),
    v_total_val,
    (SELECT COUNT(*) FROM contracts WHERE recipient_name ILIKE '%'||p_name||'%' AND contract_category = 'idv'),
    (SELECT COALESCE(SUM(award_amount),0) FROM contracts WHERE recipient_name ILIKE '%'||p_name||'%' AND contract_category = 'idv'),
    (SELECT COUNT(*) FROM grants WHERE recipient_name ILIKE '%'||p_name||'%'),
    (SELECT COALESCE(SUM(award_amount),0) FROM grants WHERE recipient_name ILIKE '%'||p_name||'%'),
    (SELECT COUNT(*) FROM sbir_awards WHERE firm ILIKE '%'||p_name||'%'),
    (SELECT COALESCE(SUM(award_amount),0) FROM sbir_awards WHERE firm ILIKE '%'||p_name||'%'),
    (SELECT array_agg(DISTINCT phase) FROM sbir_awards WHERE firm ILIKE '%'||p_name||'%'),
    (SELECT MAX(women_owned) FROM sbir_awards WHERE firm ILIKE '%'||p_name||'%'),
    (SELECT MAX(hubzone_owned) FROM sbir_awards WHERE firm ILIKE '%'||p_name||'%'),
    (SELECT MAX(socially_disadvantaged) FROM sbir_awards WHERE firm ILIKE '%'||p_name||'%'),
    (SELECT registration_status FROM sam_entities WHERE legal_business_name ILIKE '%'||p_name||'%' LIMIT 1),
    (SELECT cage_code FROM sam_entities WHERE legal_business_name ILIKE '%'||p_name||'%' LIMIT 1),
    (SELECT uei FROM sam_entities WHERE legal_business_name ILIKE '%'||p_name||'%' LIMIT 1),
    (SELECT expiration_date FROM sam_entities WHERE legal_business_name ILIKE '%'||p_name||'%' LIMIT 1),
    (SELECT business_types FROM sam_entities WHERE legal_business_name ILIKE '%'||p_name||'%' LIMIT 1),
    (SELECT entity_structure FROM sam_entities WHERE legal_business_name ILIKE '%'||p_name||'%' LIMIT 1),
    EXISTS(SELECT 1 FROM sam_exclusions WHERE exclusion_name ILIKE '%'||p_name||'%' AND (termination_date IS NULL OR termination_date > CURRENT_DATE)),
    (SELECT description FROM sam_exclusions WHERE exclusion_name ILIKE '%'||p_name||'%' AND (termination_date IS NULL OR termination_date > CURRENT_DATE) LIMIT 1),
    (SELECT COUNT(*) FROM subawards WHERE prime_recipient_name ILIKE '%'||p_name||'%'),
    (SELECT COALESCE(SUM(subaward_amount),0) FROM subawards WHERE prime_recipient_name ILIKE '%'||p_name||'%'),
    (SELECT COUNT(*) FROM subawards WHERE sub_awardee_name ILIKE '%'||p_name||'%'),
    (SELECT COALESCE(SUM(subaward_amount),0) FROM subawards WHERE sub_awardee_name ILIKE '%'||p_name||'%'),
    (SELECT COUNT(*) FROM fpds_awards WHERE vendor_name ILIKE '%'||p_name||'%'),
    (SELECT ROUND(AVG(number_of_offers)::NUMERIC, 1) FROM fpds_awards WHERE vendor_name ILIKE '%'||p_name||'%' AND number_of_offers IS NOT NULL),
    (SELECT ROUND(COUNT(*) FILTER (WHERE number_of_offers = 1)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE number_of_offers IS NOT NULL), 0) * 100, 1) FROM fpds_awards WHERE vendor_name ILIKE '%'||p_name||'%'),
    (SELECT jsonb_agg(jsonb_build_object('agency', awarding_agency, 'value', t) ORDER BY t DESC) FROM (SELECT awarding_agency, SUM(award_amount) t FROM contracts WHERE recipient_name ILIKE '%'||p_name||'%' AND contract_category = 'contract' GROUP BY awarding_agency ORDER BY SUM(award_amount) DESC LIMIT 5) x),
    (SELECT array_agg(DISTINCT naics_code) FROM contracts WHERE recipient_name ILIKE '%'||p_name||'%' AND naics_code IS NOT NULL),
    (SELECT array_agg(DISTINCT pop_state) FROM contracts WHERE recipient_name ILIKE '%'||p_name||'%' AND pop_state IS NOT NULL),
    CASE WHEN v_total_val > 0 THEN ROUND(v_top_agency_val / v_total_val * 100, 1) ELSE 0 END;
END; $$;

-- Platform stats RPC
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS TABLE(
  total_contracts BIGINT, total_contract_value NUMERIC,
  total_idvs BIGINT, total_idv_value NUMERIC,
  total_grants BIGINT, total_grant_value NUMERIC,
  total_opportunities BIGINT, total_sbir BIGINT,
  total_sam_entities BIGINT, total_exclusions BIGINT,
  total_nsf BIGINT, total_fpds BIGINT,
  total_subawards BIGINT, total_entities BIGINT,
  total_relationships BIGINT, total_records BIGINT,
  data_sources INT, last_vacuum_at TIMESTAMPTZ, last_vacuum_loaded INT
)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_c BIGINT; v_cv NUMERIC; v_i BIGINT; v_iv NUMERIC;
  v_g BIGINT; v_gv NUMERIC; v_o BIGINT; v_s BIGINT;
  v_se BIGINT; v_ex BIGINT; v_n BIGINT; v_f BIGINT;
  v_sub BIGINT; v_ent BIGINT; v_rel BIGINT;
  v_last_at TIMESTAMPTZ; v_last_loaded INT;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(award_amount),0) INTO v_c, v_cv FROM contracts WHERE contract_category = 'contract';
  SELECT COUNT(*), COALESCE(SUM(award_amount),0) INTO v_i, v_iv FROM contracts WHERE contract_category = 'idv';
  SELECT COUNT(*), COALESCE(SUM(award_amount),0) INTO v_g, v_gv FROM grants;
  SELECT COUNT(*) INTO v_o FROM opportunities;
  SELECT COUNT(*) INTO v_s FROM sbir_awards;
  SELECT COUNT(*) INTO v_se FROM sam_entities;
  SELECT COUNT(*) INTO v_ex FROM sam_exclusions;
  SELECT COUNT(*) INTO v_n FROM nsf_awards;
  SELECT COUNT(*) INTO v_f FROM fpds_awards;
  SELECT COUNT(*) INTO v_sub FROM subawards;
  SELECT COUNT(*) INTO v_ent FROM core_entities;
  SELECT COUNT(*) INTO v_rel FROM core_relationships;
  SELECT completed_at, total_loaded INTO v_last_at, v_last_loaded FROM vacuum_runs WHERE status IN ('completed','completed_with_errors') ORDER BY completed_at DESC LIMIT 1;
  RETURN QUERY SELECT v_c, v_cv, v_i, v_iv, v_g, v_gv, v_o, v_s, v_se, v_ex, v_n, v_f, v_sub, v_ent, v_rel,
    (v_c + v_i + v_g + v_o + v_s + v_se + v_ex + v_n + v_f + v_sub), 9, v_last_at, v_last_loaded;
END; $$;
