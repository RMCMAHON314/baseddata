-- Create a read-only function for executing natural language queries
-- This ensures only SELECT queries can be executed
CREATE OR REPLACE FUNCTION public.execute_nl_query(p_sql TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_normalized TEXT;
BEGIN
  -- Normalize and validate the query
  v_normalized := upper(trim(p_sql));
  
  -- Only allow SELECT or WITH queries
  IF NOT (v_normalized LIKE 'SELECT%' OR v_normalized LIKE 'WITH%') THEN
    RAISE EXCEPTION 'Only SELECT queries are allowed';
  END IF;
  
  -- Block dangerous keywords
  IF v_normalized ~ '\b(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE|EXEC|EXECUTE)\b' THEN
    RAISE EXCEPTION 'Query contains forbidden keywords';
  END IF;
  
  -- Execute the query and return results as JSON
  EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || p_sql || ') t'
  INTO v_result;
  
  RETURN v_result;
END;
$$;