
-- Fix trigger_entity_intelligence to handle FK violations gracefully
CREATE OR REPLACE FUNCTION trigger_entity_intelligence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Auto-discover same-location relationships
  BEGIN
    INSERT INTO core_relationships (from_entity_id, to_entity_id, relationship_type, strength, confidence, evidence)
    SELECT 
      NEW.id, e.id, 'same_location', 0.5, 0.7,
      jsonb_build_array(jsonb_build_object(
        'type', 'geographic_match',
        'city', COALESCE(NEW.city, NEW.merged_data->>'city'),
        'state', COALESCE(NEW.state, NEW.merged_data->>'state')
      ))
    FROM core_entities e
    WHERE e.id != NEW.id
      AND e.is_canonical IS NOT FALSE
      AND COALESCE(e.city, e.merged_data->>'city') = COALESCE(NEW.city, NEW.merged_data->>'city')
      AND COALESCE(e.state, e.merged_data->>'state') = COALESCE(NEW.state, NEW.merged_data->>'state')
      AND COALESCE(NEW.city, NEW.merged_data->>'city') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM core_relationships cr 
        WHERE (cr.from_entity_id = NEW.id AND cr.to_entity_id = e.id)
        OR (cr.from_entity_id = e.id AND cr.to_entity_id = NEW.id)
      )
    LIMIT 10
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Silently skip relationship creation on any error
    NULL;
  END;
  
  RETURN NEW;
END;
$$;
