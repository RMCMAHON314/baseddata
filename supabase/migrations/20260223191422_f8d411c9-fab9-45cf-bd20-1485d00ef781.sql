
-- Cross-source teaming network from subawards
CREATE OR REPLACE FUNCTION get_teaming_network(p_entity_name TEXT DEFAULT NULL, p_state TEXT DEFAULT NULL, p_limit INT DEFAULT 30)
RETURNS TABLE(prime_name TEXT, sub_name TEXT, total_sub_value NUMERIC, sub_count BIGINT, agencies TEXT[], relationship TEXT)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT s.prime_recipient_name, s.sub_awardee_name,
    SUM(s.subaward_amount), COUNT(*),
    array_agg(DISTINCT s.awarding_agency),
    'prime_to_sub'::TEXT
  FROM subawards s
  WHERE (p_entity_name IS NULL OR s.prime_recipient_name ILIKE '%'||p_entity_name||'%' OR s.sub_awardee_name ILIKE '%'||p_entity_name||'%')
    AND (p_state IS NULL OR s.sub_awardee_state = p_state)
  GROUP BY s.prime_recipient_name, s.sub_awardee_name
  ORDER BY SUM(s.subaward_amount) DESC
  LIMIT p_limit;
END; $$;

-- Cross-source entity 360 profile
CREATE OR REPLACE FUNCTION get_cross_source_profile(p_name TEXT)
RETURNS TABLE(
  entity_name TEXT, total_contract_value NUMERIC, contract_count BIGINT,
  sbir_count BIGINT, sbir_value NUMERIC, sbir_phases TEXT[],
  sam_status TEXT, sam_cage TEXT, sam_expiration DATE,
  is_excluded BOOLEAN, exclusion_detail TEXT,
  sub_prime_count BIGINT, sub_prime_value NUMERIC,
  sub_to_count BIGINT, sub_to_value NUMERIC,
  top_agencies JSONB, naics_codes TEXT[], states TEXT[],
  women_owned TEXT, hubzone TEXT, disadvantaged TEXT
)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    p_name,
    COALESCE((SELECT SUM(award_amount) FROM contracts WHERE recipient_name ILIKE '%'||p_name||'%'), 0),
    COALESCE((SELECT COUNT(*) FROM contracts WHERE recipient_name ILIKE '%'||p_name||'%'), 0),
    COALESCE((SELECT COUNT(*) FROM sbir_awards WHERE firm ILIKE '%'||p_name||'%'), 0),
    COALESCE((SELECT SUM(award_amount) FROM sbir_awards WHERE firm ILIKE '%'||p_name||'%'), 0),
    (SELECT array_agg(DISTINCT phase) FROM sbir_awards WHERE firm ILIKE '%'||p_name||'%'),
    (SELECT registration_status FROM sam_entities WHERE legal_business_name ILIKE '%'||p_name||'%' LIMIT 1),
    (SELECT cage_code FROM sam_entities WHERE legal_business_name ILIKE '%'||p_name||'%' LIMIT 1),
    (SELECT expiration_date FROM sam_entities WHERE legal_business_name ILIKE '%'||p_name||'%' LIMIT 1),
    EXISTS(SELECT 1 FROM sam_exclusions WHERE exclusion_name ILIKE '%'||p_name||'%' AND (termination_date IS NULL OR termination_date > CURRENT_DATE)),
    (SELECT description FROM sam_exclusions WHERE exclusion_name ILIKE '%'||p_name||'%' AND (termination_date IS NULL OR termination_date > CURRENT_DATE) LIMIT 1),
    COALESCE((SELECT COUNT(*) FROM subawards WHERE prime_recipient_name ILIKE '%'||p_name||'%'), 0),
    COALESCE((SELECT SUM(subaward_amount) FROM subawards WHERE prime_recipient_name ILIKE '%'||p_name||'%'), 0),
    COALESCE((SELECT COUNT(*) FROM subawards WHERE sub_awardee_name ILIKE '%'||p_name||'%'), 0),
    COALESCE((SELECT SUM(subaward_amount) FROM subawards WHERE sub_awardee_name ILIKE '%'||p_name||'%'), 0),
    (SELECT jsonb_agg(jsonb_build_object('agency', awarding_agency, 'value', t) ORDER BY t DESC) FROM (SELECT awarding_agency, SUM(award_amount) t FROM contracts WHERE recipient_name ILIKE '%'||p_name||'%' GROUP BY awarding_agency ORDER BY SUM(award_amount) DESC LIMIT 5) x),
    (SELECT array_agg(DISTINCT naics_code) FROM contracts WHERE recipient_name ILIKE '%'||p_name||'%' AND naics_code IS NOT NULL),
    (SELECT array_agg(DISTINCT pop_state) FROM contracts WHERE recipient_name ILIKE '%'||p_name||'%' AND pop_state IS NOT NULL),
    (SELECT MAX(women_owned) FROM sbir_awards WHERE firm ILIKE '%'||p_name||'%'),
    (SELECT MAX(hubzone_owned) FROM sbir_awards WHERE firm ILIKE '%'||p_name||'%'),
    (SELECT MAX(socially_disadvantaged) FROM sbir_awards WHERE firm ILIKE '%'||p_name||'%');
END; $$;

-- Market opportunity score
CREATE OR REPLACE FUNCTION compute_market_opportunity(p_naics TEXT DEFAULT NULL, p_state TEXT DEFAULT NULL)
RETURNS TABLE(
  total_contract_value NUMERIC, active_contractors BIGINT,
  active_opportunities BIGINT, opportunity_value NUMERIC,
  recompete_value NUMERIC, recompete_count BIGINT,
  sbir_awards_count BIGINT, sbir_value NUMERIC,
  hhi NUMERIC, concentration TEXT,
  opportunity_score INT
)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_val NUMERIC; v_cont BIGINT; v_opps BIGINT; v_opp_val NUMERIC; v_re NUMERIC; v_rec BIGINT; v_sb BIGINT; v_sbv NUMERIC; v_hhi NUMERIC; v_score INT := 0;
BEGIN
  SELECT COALESCE(SUM(award_amount),0), COUNT(DISTINCT recipient_name) INTO v_val, v_cont FROM contracts
    WHERE (p_naics IS NULL OR naics_code = p_naics) AND (p_state IS NULL OR pop_state = p_state) AND award_amount > 0;
  SELECT COUNT(*), COALESCE(SUM(CASE WHEN award_amount IS NOT NULL THEN award_amount ELSE 0 END), 0) INTO v_opps, v_opp_val FROM opportunities
    WHERE active = true AND (p_naics IS NULL OR naics_code = p_naics) AND response_deadline > CURRENT_DATE;
  SELECT COALESCE(SUM(award_amount),0), COUNT(*) INTO v_re, v_rec FROM contracts
    WHERE end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '12 months'
    AND (p_naics IS NULL OR naics_code = p_naics) AND (p_state IS NULL OR pop_state = p_state);
  SELECT COUNT(*), COALESCE(SUM(award_amount),0) INTO v_sb, v_sbv FROM sbir_awards
    WHERE (p_state IS NULL OR state = p_state);
  SELECT COALESCE(SUM(pct*pct),0) INTO v_hhi FROM (
    SELECT SUM(award_amount)/NULLIF(SUM(SUM(award_amount)) OVER(),0)*100 pct FROM contracts
    WHERE (p_naics IS NULL OR naics_code = p_naics) AND (p_state IS NULL OR pop_state = p_state) AND award_amount > 0
    GROUP BY recipient_name) x;
  IF v_val > 1000000000 THEN v_score := v_score + 25; ELSIF v_val > 100000000 THEN v_score := v_score + 15; ELSIF v_val > 10000000 THEN v_score := v_score + 10; END IF;
  IF v_opps > 10 THEN v_score := v_score + 25; ELSIF v_opps > 3 THEN v_score := v_score + 15; ELSIF v_opps > 0 THEN v_score := v_score + 10; END IF;
  IF v_re > 100000000 THEN v_score := v_score + 25; ELSIF v_re > 10000000 THEN v_score := v_score + 15; END IF;
  IF v_hhi < 1500 THEN v_score := v_score + 25; ELSIF v_hhi < 2500 THEN v_score := v_score + 15; END IF;
  RETURN QUERY SELECT v_val, v_cont, v_opps, v_opp_val, v_re, v_rec, v_sb, v_sbv,
    ROUND(v_hhi, 2), CASE WHEN v_hhi > 2500 THEN 'Highly Concentrated' WHEN v_hhi > 1500 THEN 'Moderately Concentrated' ELSE 'Competitive' END,
    v_score;
END; $$;
