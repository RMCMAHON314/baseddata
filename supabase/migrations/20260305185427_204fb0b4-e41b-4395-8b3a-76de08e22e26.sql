-- Aggregated analytics RPC to avoid fetching all rows client-side
CREATE OR REPLACE FUNCTION public.get_analytics_aggregations()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'agency_spending', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT awarding_agency AS name, SUM(award_amount) AS value
        FROM contracts
        WHERE awarding_agency IS NOT NULL AND award_amount IS NOT NULL
        GROUP BY awarding_agency
        ORDER BY SUM(award_amount) DESC
        LIMIT 20
      ) t
    ),
    'top_contractors', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT id, canonical_name AS name, total_contract_value AS value
        FROM core_entities
        WHERE total_contract_value IS NOT NULL
        ORDER BY total_contract_value DESC
        LIMIT 20
      ) t
    ),
    'geo_distribution', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT pop_state AS state, SUM(award_amount) AS value, COUNT(*) AS count
        FROM contracts
        WHERE pop_state IS NOT NULL
        GROUP BY pop_state
        ORDER BY SUM(award_amount) DESC
        LIMIT 20
      ) t
    ),
    'naics_sectors', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT LEFT(naics_code, 2) AS code, SUM(award_amount) AS value
        FROM contracts
        WHERE naics_code IS NOT NULL
        GROUP BY LEFT(naics_code, 2)
        ORDER BY SUM(award_amount) DESC
        LIMIT 12
      ) t
    ),
    'set_aside', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT set_aside_type AS type, SUM(award_amount) AS value
        FROM contracts
        WHERE set_aside_type IS NOT NULL
        GROUP BY set_aside_type
        ORDER BY SUM(award_amount) DESC
        LIMIT 10
      ) t
    ),
    'contract_types', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT contract_type AS type, SUM(award_amount) AS value
        FROM contracts
        WHERE contract_type IS NOT NULL
        GROUP BY contract_type
        ORDER BY SUM(award_amount) DESC
        LIMIT 8
      ) t
    ),
    'grants_by_agency', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT awarding_agency AS name, SUM(award_amount) AS value
        FROM grants
        WHERE awarding_agency IS NOT NULL
        GROUP BY awarding_agency
        ORDER BY SUM(award_amount) DESC
        LIMIT 10
      ) t
    ),
    'labor_rates', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT labor_category AS category,
               ROUND(AVG(current_price)) AS avg,
               ROUND(MIN(current_price)) AS min,
               ROUND(MAX(current_price)) AS max
        FROM gsa_labor_rates
        WHERE current_price IS NOT NULL
        GROUP BY labor_category
        ORDER BY AVG(current_price) DESC
        LIMIT 15
      ) t
    ),
    'spending_timeline', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT quarter, COALESCE(SUM(contracts), 0) AS contracts, COALESCE(SUM(grants), 0) AS grants
        FROM (
          SELECT EXTRACT(YEAR FROM award_date)::int || ' Q' || CEIL(EXTRACT(MONTH FROM award_date) / 3.0)::int AS quarter,
                 award_amount AS contracts, 0 AS grants
          FROM contracts WHERE award_date IS NOT NULL
          UNION ALL
          SELECT EXTRACT(YEAR FROM start_date)::int || ' Q' || CEIL(EXTRACT(MONTH FROM start_date) / 3.0)::int AS quarter,
                 0 AS contracts, award_amount AS grants
          FROM grants WHERE start_date IS NOT NULL
        ) combined
        GROUP BY quarter
        ORDER BY quarter
      ) t
    )
  );
$$;