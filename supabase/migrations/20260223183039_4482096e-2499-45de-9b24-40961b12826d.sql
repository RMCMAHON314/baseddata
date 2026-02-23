
-- ============================================================
-- MARKET CONCENTRATION INDEX (HHI)
-- ============================================================
CREATE OR REPLACE FUNCTION compute_market_concentration(
  p_naics TEXT DEFAULT NULL,
  p_agency TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL
)
RETURNS TABLE(
  market_label TEXT,
  total_value DECIMAL,
  contractor_count BIGINT,
  contract_count BIGINT,
  hhi_score DECIMAL,
  concentration_level TEXT,
  top_contractors JSONB
) LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH market_contracts AS (
    SELECT * FROM contracts c
    WHERE (p_naics IS NULL OR c.naics_code = p_naics)
      AND (p_agency IS NULL OR c.awarding_agency ILIKE '%' || p_agency || '%')
      AND (p_state IS NULL OR c.pop_state = p_state)
      AND c.award_amount > 0
  ),
  contractor_shares AS (
    SELECT 
      mc.recipient_name,
      SUM(mc.award_amount) as total,
      COUNT(*) as cnt,
      SUM(mc.award_amount) / NULLIF(SUM(SUM(mc.award_amount)) OVER(), 0) * 100 as market_share_pct
    FROM market_contracts mc
    GROUP BY mc.recipient_name
  ),
  hhi AS (
    SELECT SUM(cs.market_share_pct * cs.market_share_pct) as hhi_val FROM contractor_shares cs
  )
  SELECT
    COALESCE(p_naics, 'All NAICS') || ' / ' || COALESCE(p_agency, 'All Agencies') || ' / ' || COALESCE(p_state, 'All States'),
    (SELECT SUM(cs2.total) FROM contractor_shares cs2),
    (SELECT COUNT(*) FROM contractor_shares),
    (SELECT SUM(cs3.cnt) FROM contractor_shares cs3),
    ROUND(COALESCE((SELECT h.hhi_val FROM hhi h), 0), 2),
    CASE 
      WHEN (SELECT h.hhi_val FROM hhi h) > 2500 THEN 'Highly Concentrated (Monopolistic)'
      WHEN (SELECT h.hhi_val FROM hhi h) > 1500 THEN 'Moderately Concentrated'
      ELSE 'Competitive'
    END,
    (SELECT jsonb_agg(jsonb_build_object(
      'name', t.recipient_name, 'value', t.total, 'contracts', t.cnt, 'share_pct', ROUND(t.market_share_pct, 1)
    ) ORDER BY t.total DESC)
    FROM (SELECT * FROM contractor_shares ORDER BY total DESC LIMIT 10) t);
END;
$$;

-- ============================================================
-- RECOMPETE RADAR
-- ============================================================
CREATE OR REPLACE FUNCTION get_recompete_pipeline(
  p_months_ahead INTEGER DEFAULT 12,
  p_state TEXT DEFAULT NULL,
  p_min_value DECIMAL DEFAULT 0
)
RETURNS TABLE(
  contract_id UUID,
  award_id TEXT,
  recipient_name TEXT,
  awarding_agency TEXT,
  award_amount DECIMAL,
  naics_code TEXT,
  end_date DATE,
  days_until_expiry INTEGER,
  urgency TEXT,
  pop_state TEXT
) LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id, c.award_id, c.recipient_name, c.awarding_agency, c.award_amount,
    c.naics_code, c.end_date,
    (c.end_date - CURRENT_DATE)::INTEGER,
    CASE
      WHEN c.end_date - CURRENT_DATE <= 90 THEN 'CRITICAL'
      WHEN c.end_date - CURRENT_DATE <= 180 THEN 'HIGH'
      WHEN c.end_date - CURRENT_DATE <= 365 THEN 'MEDIUM'
      ELSE 'LOW'
    END,
    c.pop_state
  FROM contracts c
  WHERE c.end_date IS NOT NULL
    AND c.end_date > CURRENT_DATE
    AND c.end_date <= CURRENT_DATE + (p_months_ahead || ' months')::INTERVAL
    AND c.award_amount >= p_min_value
    AND (p_state IS NULL OR c.pop_state = p_state)
  ORDER BY c.end_date ASC;
END;
$$;

-- ============================================================
-- AGENCY BUYING PATTERNS
-- ============================================================
CREATE OR REPLACE FUNCTION get_agency_buying_patterns(
  p_agency TEXT DEFAULT NULL,
  p_naics TEXT DEFAULT NULL
)
RETURNS TABLE(
  agency TEXT,
  fiscal_quarter TEXT,
  quarter_label TEXT,
  contract_count BIGINT,
  total_value DECIMAL,
  pct_of_annual DECIMAL,
  is_peak BOOLEAN
) LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH quarterly AS (
    SELECT 
      c.awarding_agency as ag,
      CASE 
        WHEN EXTRACT(MONTH FROM c.award_date) IN (10,11,12) THEN 'Q1'
        WHEN EXTRACT(MONTH FROM c.award_date) IN (1,2,3) THEN 'Q2'
        WHEN EXTRACT(MONTH FROM c.award_date) IN (4,5,6) THEN 'Q3'
        WHEN EXTRACT(MONTH FROM c.award_date) IN (7,8,9) THEN 'Q4'
      END as fq,
      c.award_amount
    FROM contracts c
    WHERE c.award_date IS NOT NULL AND c.award_amount > 0
      AND (p_agency IS NULL OR c.awarding_agency ILIKE '%' || p_agency || '%')
      AND (p_naics IS NULL OR c.naics_code = p_naics)
  ),
  agg AS (
    SELECT 
      q.ag, q.fq, COUNT(*) as cnt, SUM(q.award_amount) as total,
      SUM(q.award_amount) / NULLIF(SUM(SUM(q.award_amount)) OVER(PARTITION BY q.ag), 0) * 100 as pct
    FROM quarterly q WHERE q.fq IS NOT NULL GROUP BY q.ag, q.fq
  )
  SELECT a.ag, a.fq,
    CASE a.fq WHEN 'Q1' THEN 'Oct-Dec' WHEN 'Q2' THEN 'Jan-Mar' WHEN 'Q3' THEN 'Apr-Jun' WHEN 'Q4' THEN 'Jul-Sep (Budget Season)' END,
    a.cnt, a.total, ROUND(a.pct, 1),
    a.pct = MAX(a.pct) OVER(PARTITION BY a.ag)
  FROM agg a ORDER BY a.ag, a.fq;
END;
$$;

-- ============================================================
-- CONTRACT VELOCITY SIGNALS
-- ============================================================
CREATE OR REPLACE FUNCTION get_velocity_signals(
  p_months INTEGER DEFAULT 6,
  p_state TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  entity_name TEXT,
  recent_contracts BIGINT,
  recent_value DECIMAL,
  prior_contracts BIGINT,
  prior_value DECIMAL,
  contract_growth_pct DECIMAL,
  value_growth_pct DECIMAL,
  signal TEXT
) LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH recent AS (
    SELECT c.recipient_name, COUNT(*) as cnt, SUM(c.award_amount) as val
    FROM contracts c
    WHERE c.award_date >= CURRENT_DATE - (p_months || ' months')::INTERVAL
      AND c.award_amount > 0 AND (p_state IS NULL OR c.pop_state = p_state)
    GROUP BY c.recipient_name
  ),
  prior AS (
    SELECT c.recipient_name, COUNT(*) as cnt, SUM(c.award_amount) as val
    FROM contracts c
    WHERE c.award_date >= CURRENT_DATE - (p_months * 2 || ' months')::INTERVAL
      AND c.award_date < CURRENT_DATE - (p_months || ' months')::INTERVAL
      AND c.award_amount > 0 AND (p_state IS NULL OR c.pop_state = p_state)
    GROUP BY c.recipient_name
  )
  SELECT 
    r.recipient_name, r.cnt, r.val, COALESCE(p.cnt, 0), COALESCE(p.val, 0),
    CASE WHEN COALESCE(p.cnt, 0) > 0 THEN ROUND((r.cnt::DECIMAL - p.cnt) / p.cnt * 100, 1) ELSE 999 END,
    CASE WHEN COALESCE(p.val, 0) > 0 THEN ROUND((r.val - p.val) / p.val * 100, 1) ELSE 999 END,
    CASE 
      WHEN COALESCE(p.cnt, 0) = 0 THEN 'New Entrant'
      WHEN r.cnt > p.cnt * 2 THEN 'Hypergrowth'
      WHEN r.cnt > p.cnt THEN 'Growing'
      WHEN r.cnt = p.cnt THEN 'Steady'
      ELSE 'Declining'
    END
  FROM recent r LEFT JOIN prior p ON r.recipient_name = p.recipient_name
  ORDER BY r.val DESC LIMIT p_limit;
END;
$$;

-- ============================================================
-- SET-ASIDE MARKET ANALYSIS
-- ============================================================
CREATE OR REPLACE FUNCTION get_set_aside_analysis(
  p_set_aside TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_naics TEXT DEFAULT NULL
)
RETURNS TABLE(
  set_aside TEXT,
  total_value DECIMAL,
  contract_count BIGINT,
  contractor_count BIGINT,
  avg_contract_value DECIMAL,
  top_contractors JSONB
) LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT * FROM contracts c
    WHERE c.set_aside_type IS NOT NULL AND c.set_aside_type != '' AND c.award_amount > 0
      AND (p_set_aside IS NULL OR c.set_aside_type ILIKE '%' || p_set_aside || '%')
      AND (p_state IS NULL OR c.pop_state = p_state)
      AND (p_naics IS NULL OR c.naics_code = p_naics)
  )
  SELECT 
    f.set_aside_type, SUM(f.award_amount), COUNT(*), COUNT(DISTINCT f.recipient_name),
    ROUND(AVG(f.award_amount), 2),
    (SELECT jsonb_agg(jsonb_build_object('name', sub.recipient_name, 'value', sub.total, 'contracts', sub.cnt) ORDER BY sub.total DESC)
     FROM (SELECT ff.recipient_name, SUM(ff.award_amount) as total, COUNT(*) as cnt
           FROM filtered ff WHERE ff.set_aside_type = f.set_aside_type
           GROUP BY ff.recipient_name ORDER BY total DESC LIMIT 5) sub)
  FROM filtered f GROUP BY f.set_aside_type ORDER BY SUM(f.award_amount) DESC;
END;
$$;
