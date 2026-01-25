-- Fix find_underexplored_areas function - records table has no 'state' column
-- The state is likely in properties->>'state'

CREATE OR REPLACE FUNCTION public.find_underexplored_areas()
RETURNS TABLE(name text, query_count bigint, entity_count bigint, missing_categories text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH category_coverage AS (
    SELECT 
      COALESCE(r.properties->>'state', 'Unknown') as area,
      array_agg(DISTINCT r.category) as categories
    FROM records r
    WHERE r.properties->>'state' IS NOT NULL
    GROUP BY r.properties->>'state'
  ),
  all_categories AS (
    SELECT unnest(ARRAY['Healthcare', 'Government', 'Education', 'Financial', 'Transportation', 'Recreation']) as category
  )
  SELECT 
    cc.area::text as name,
    (SELECT COUNT(*) FROM nl_queries WHERE LOWER(natural_query) LIKE '%' || LOWER(cc.area) || '%')::bigint as query_count,
    (SELECT COUNT(*) FROM core_entities WHERE LOWER(state) = LOWER(cc.area))::bigint as entity_count,
    (SELECT array_agg(ac.category) FROM all_categories ac WHERE ac.category != ALL(cc.categories))::text[] as missing_categories
  FROM category_coverage cc
  WHERE array_length(cc.categories, 1) < 6
  ORDER BY query_count DESC
  LIMIT 10;
END;
$$;