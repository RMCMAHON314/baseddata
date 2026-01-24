-- Add missing analyze_query_intent function for unified context
CREATE OR REPLACE FUNCTION analyze_query_intent(p_query TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  query_lower TEXT;
BEGIN
  query_lower := lower(p_query);
  
  result := jsonb_build_object(
    'intent', CASE 
      WHEN query_lower LIKE '%compare%' OR query_lower LIKE '%vs%' THEN 'compare'
      WHEN query_lower LIKE '%trend%' OR query_lower LIKE '%over time%' THEN 'trend'
      WHEN query_lower LIKE '%top%' OR query_lower LIKE '%largest%' OR query_lower LIKE '%biggest%' THEN 'ranking'
      ELSE 'search'
    END,
    'subject', CASE 
      WHEN query_lower LIKE '%hospital%' THEN 'hospitals'
      WHEN query_lower LIKE '%contract%' THEN 'contracts'
      WHEN query_lower LIKE '%payment%' THEN 'payments'
      WHEN query_lower LIKE '%provider%' OR query_lower LIKE '%doctor%' THEN 'providers'
      WHEN query_lower LIKE '%school%' THEN 'schools'
      ELSE 'entities'
    END,
    'location', regexp_replace(p_query, '.*\s+in\s+([A-Za-z\s]+).*', '\1', 'i'),
    'raw_query', p_query
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add generate_intelligence_alerts function
CREATE OR REPLACE FUNCTION generate_intelligence_alerts()
RETURNS INTEGER AS $$
DECLARE
  alert_count INTEGER := 0;
BEGIN
  -- Generate alerts for high-opportunity entities without recent alerts
  INSERT INTO intelligence_alerts (alert_type, severity, entity_id, title, description)
  SELECT 
    'high_opportunity',
    'info',
    e.id,
    'High opportunity: ' || e.canonical_name,
    'Entity has opportunity score of ' || e.opportunity_score
  FROM core_entities e
  WHERE e.opportunity_score >= 70
  AND NOT EXISTS (
    SELECT 1 FROM intelligence_alerts ia 
    WHERE ia.entity_id = e.id 
    AND ia.created_at > NOW() - INTERVAL '24 hours'
  )
  LIMIT 10;
  
  GET DIAGNOSTICS alert_count = ROW_COUNT;
  RETURN alert_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;