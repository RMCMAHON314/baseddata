
-- Fix trigger_entity_expansion to include discovery_type column
CREATE OR REPLACE FUNCTION trigger_entity_expansion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  INSERT INTO flywheel_discovery_queue (target_type, target_value, target_source, priority, status, discovery_type)
  VALUES 
    ('name_variation', NEW.canonical_name || ' Inc', 'auto_expansion', 2, 'pending', 'name_variation'),
    ('name_variation', NEW.canonical_name || ' LLC', 'auto_expansion', 2, 'pending', 'name_variation'),
    ('industry_peer', NEW.entity_type || ' companies', 'auto_expansion', 3, 'pending', 'industry_peer'),
    ('competitor', NEW.canonical_name || ' competitors', 'auto_expansion', 2, 'pending', 'competitor')
  ON CONFLICT (target_type, target_value) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
