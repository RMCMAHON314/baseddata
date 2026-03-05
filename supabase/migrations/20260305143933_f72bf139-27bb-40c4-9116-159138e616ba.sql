CREATE OR REPLACE FUNCTION public.compute_market_concentration(p_naics text DEFAULT NULL::text, p_agency text DEFAULT NULL::text, p_state text DEFAULT NULL::text)
 RETURNS TABLE(market_label text, total_value numeric, contractor_count bigint, contract_count bigint, hhi_score numeric, concentration_level text, top_contractors jsonb)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
    (SELECT COUNT(*)::bigint FROM contractor_shares),
    (SELECT SUM(cs3.cnt)::bigint FROM contractor_shares cs3),
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
$function$;