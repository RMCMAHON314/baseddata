
-- Teaming Pair Detection
CREATE OR REPLACE FUNCTION detect_teaming_pairs(
  p_agency TEXT DEFAULT NULL,
  p_naics TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE(
  entity_a TEXT,
  entity_b TEXT,
  shared_agencies TEXT[],
  shared_agency_count BIGINT,
  combined_value NUMERIC,
  co_occurrence_score NUMERIC
)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT recipient_name, awarding_agency, naics_code, award_amount
    FROM contracts
    WHERE award_amount > 0
      AND (p_agency IS NULL OR awarding_agency ILIKE '%' || p_agency || '%')
      AND (p_naics IS NULL OR naics_code = p_naics)
  ),
  entity_agencies AS (
    SELECT recipient_name, awarding_agency
    FROM filtered
    GROUP BY 1, 2
  ),
  pairs AS (
    SELECT
      a.recipient_name ea,
      b.recipient_name eb,
      array_agg(DISTINCT a.awarding_agency) sa,
      COUNT(DISTINCT a.awarding_agency) sc
    FROM entity_agencies a
    JOIN entity_agencies b ON a.awarding_agency = b.awarding_agency
      AND a.recipient_name < b.recipient_name
    GROUP BY a.recipient_name, b.recipient_name
    HAVING COUNT(DISTINCT a.awarding_agency) >= 2
  )
  SELECT
    p.ea, p.eb, p.sa, p.sc,
    (SELECT SUM(f.award_amount) FROM filtered f WHERE f.recipient_name IN (p.ea, p.eb)),
    ROUND(p.sc::NUMERIC / GREATEST(
      (SELECT COUNT(DISTINCT f2.awarding_agency) FROM filtered f2 WHERE f2.recipient_name = p.ea), 1
    ) * 100, 1)
  FROM pairs p
  ORDER BY p.sc DESC
  LIMIT p_limit;
END; $$;

-- SBIR Innovation Landscape
CREATE OR REPLACE FUNCTION get_sbir_landscape(
  p_state TEXT DEFAULT NULL,
  p_agency TEXT DEFAULT NULL
)
RETURNS TABLE(
  total_awards BIGINT,
  total_value NUMERIC,
  top_firms JSONB,
  phase_breakdown JSONB,
  agency_breakdown JSONB,
  diversity_stats JSONB
)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT * FROM sbir_awards
    WHERE (p_state IS NULL OR state = p_state)
      AND (p_agency IS NULL OR agency ILIKE '%' || p_agency || '%')
  )
  SELECT
    COUNT(*)::BIGINT,
    COALESCE(SUM(f.award_amount), 0),
    (SELECT jsonb_agg(r ORDER BY (r->>'value')::NUMERIC DESC) FROM (
      SELECT jsonb_build_object(
        'firm', f2.firm, 'value', SUM(f2.award_amount), 'count', COUNT(*),
        'women', MAX(f2.women_owned), 'hubzone', MAX(f2.hubzone_owned),
        'disadvantaged', MAX(f2.socially_disadvantaged)
      ) r FROM filtered f2 GROUP BY f2.firm ORDER BY SUM(f2.award_amount) DESC LIMIT 10
    ) x),
    (SELECT jsonb_object_agg(f3.phase, cnt) FROM (
      SELECT phase, COUNT(*) cnt FROM filtered WHERE phase IS NOT NULL GROUP BY phase
    ) f3),
    (SELECT jsonb_object_agg(f4.agency, cnt) FROM (
      SELECT agency, COUNT(*) cnt FROM filtered WHERE agency IS NOT NULL GROUP BY agency ORDER BY COUNT(*) DESC LIMIT 10
    ) f4),
    (SELECT jsonb_build_object(
      'women_owned_pct', ROUND(COUNT(*) FILTER (WHERE women_owned = 'Y')::NUMERIC / GREATEST(COUNT(*), 1) * 100, 1),
      'hubzone_pct', ROUND(COUNT(*) FILTER (WHERE hubzone_owned = 'Y')::NUMERIC / GREATEST(COUNT(*), 1) * 100, 1),
      'disadvantaged_pct', ROUND(COUNT(*) FILTER (WHERE socially_disadvantaged = 'Y')::NUMERIC / GREATEST(COUNT(*), 1) * 100, 1)
    ) FROM filtered)
  FROM filtered f;
END; $$;

-- Entity Risk Score
CREATE OR REPLACE FUNCTION compute_entity_risk(p_entity_name TEXT)
RETURNS TABLE(
  risk_level TEXT,
  risk_score INT,
  exclusion_status TEXT,
  registration_status TEXT,
  concentration_risk NUMERIC,
  top_agency_pct NUMERIC,
  recompete_exposure NUMERIC
)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_score INT := 0;
  v_excluded BOOLEAN := false;
  v_reg TEXT := 'Unknown';
  v_top_pct NUMERIC := 0;
  v_recomp NUMERIC := 0;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM sam_exclusions
    WHERE exclusion_name ILIKE '%' || p_entity_name || '%'
      AND (termination_date IS NULL OR termination_date > CURRENT_DATE)
  ) INTO v_excluded;
  IF v_excluded THEN v_score := v_score + 50; END IF;

  SELECT se.registration_status INTO v_reg
  FROM sam_entities se
  WHERE se.legal_business_name ILIKE '%' || p_entity_name || '%'
  LIMIT 1;
  IF v_reg IS NULL OR v_reg != 'Active' THEN v_score := v_score + 20; END IF;

  SELECT COALESCE(MAX(pct), 0) INTO v_top_pct FROM (
    SELECT awarding_agency,
      SUM(award_amount) / NULLIF(SUM(SUM(award_amount)) OVER(), 0) * 100 pct
    FROM contracts
    WHERE recipient_name ILIKE '%' || p_entity_name || '%'
    GROUP BY awarding_agency
  ) x;
  IF v_top_pct > 80 THEN v_score := v_score + 15;
  ELSIF v_top_pct > 60 THEN v_score := v_score + 10;
  END IF;

  SELECT COALESCE(SUM(award_amount), 0) INTO v_recomp
  FROM contracts
  WHERE recipient_name ILIKE '%' || p_entity_name || '%'
    AND end_date IS NOT NULL
    AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '12 months';

  RETURN QUERY SELECT
    CASE
      WHEN v_score >= 50 THEN 'HIGH'
      WHEN v_score >= 25 THEN 'MEDIUM'
      ELSE 'LOW'
    END,
    v_score,
    CASE WHEN v_excluded THEN 'EXCLUDED' ELSE 'CLEAR' END,
    COALESCE(v_reg, 'Not Found'),
    v_top_pct, v_top_pct, v_recomp;
END; $$;

-- Competition Intelligence from FPDS
CREATE OR REPLACE FUNCTION get_competition_intelligence(
  p_naics TEXT DEFAULT NULL,
  p_agency TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL
)
RETURNS TABLE(
  total_awards BIGINT,
  total_value NUMERIC,
  avg_offers NUMERIC,
  sole_source_pct NUMERIC,
  full_open_pct NUMERIC,
  competition_breakdown JSONB,
  offers_distribution JSONB
)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT * FROM fpds_awards
    WHERE dollars_obligated > 0
      AND (p_naics IS NULL OR naics_code = p_naics)
      AND (p_agency IS NULL OR contracting_department ILIKE '%' || p_agency || '%')
      AND (p_state IS NULL OR pop_state = p_state)
  )
  SELECT
    COUNT(*)::BIGINT,
    COALESCE(SUM(f.dollars_obligated), 0),
    ROUND(AVG(f.number_of_offers) FILTER (WHERE f.number_of_offers > 0), 1),
    ROUND(COUNT(*) FILTER (WHERE f.extent_competed ILIKE '%not%compete%' OR f.number_of_offers = 1)::NUMERIC / GREATEST(COUNT(*), 1) * 100, 1),
    ROUND(COUNT(*) FILTER (WHERE f.extent_competed ILIKE '%full%open%')::NUMERIC / GREATEST(COUNT(*), 1) * 100, 1),
    (SELECT jsonb_object_agg(COALESCE(f2.extent_competed, 'Unknown'), cnt) FROM (
      SELECT extent_competed, COUNT(*) cnt FROM filtered GROUP BY extent_competed ORDER BY COUNT(*) DESC LIMIT 8
    ) f2),
    (SELECT jsonb_object_agg(offers_bucket, cnt) FROM (
      SELECT
        CASE
          WHEN number_of_offers = 1 THEN '1 (Sole Source)'
          WHEN number_of_offers BETWEEN 2 AND 3 THEN '2-3'
          WHEN number_of_offers BETWEEN 4 AND 10 THEN '4-10'
          WHEN number_of_offers > 10 THEN '10+'
          ELSE 'Unknown'
        END offers_bucket,
        COUNT(*) cnt
      FROM filtered GROUP BY 1
    ) f3)
  FROM filtered f;
END; $$;
