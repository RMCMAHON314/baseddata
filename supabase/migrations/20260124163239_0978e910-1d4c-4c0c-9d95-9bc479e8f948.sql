-- ============================================
-- 🔮 SEMANTX - SEMANTIC SEARCH INFRASTRUCTURE 🔮
-- ============================================

-- Add search columns to entities
ALTER TABLE core_entities ADD COLUMN IF NOT EXISTS search_text TEXT;
ALTER TABLE core_entities ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add search columns to contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS search_text TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add search columns to opportunities
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS search_text TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create full-text search indexes
CREATE INDEX IF NOT EXISTS idx_entities_search_vector ON core_entities USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_contracts_search_vector ON contracts USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_opportunities_search_vector ON opportunities USING gin(search_vector);

-- Function to update entity search text
CREATE OR REPLACE FUNCTION update_entity_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text := COALESCE(NEW.canonical_name, '') || ' ' || 
                     COALESCE(NEW.entity_type, '') || ' ' ||
                     COALESCE(NEW.city, '') || ' ' ||
                     COALESCE(NEW.state, '') || ' ' ||
                     COALESCE(NEW.description, '') || ' ' ||
                     COALESCE(NEW.uei, '') || ' ' ||
                     COALESCE(array_to_string(NEW.naics_codes, ' '), '');
  NEW.search_vector := to_tsvector('english', NEW.search_text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_entity_search_text ON core_entities;
CREATE TRIGGER trigger_entity_search_text
  BEFORE INSERT OR UPDATE ON core_entities
  FOR EACH ROW EXECUTE FUNCTION update_entity_search_text();

-- Function to update contract search text
CREATE OR REPLACE FUNCTION update_contract_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text := COALESCE(NEW.recipient_name, '') || ' ' || 
                     COALESCE(NEW.description, '') || ' ' ||
                     COALESCE(NEW.awarding_agency, '') || ' ' ||
                     COALESCE(NEW.pop_city, '') || ' ' ||
                     COALESCE(NEW.pop_state, '') || ' ' ||
                     COALESCE(NEW.naics_code, '');
  NEW.search_vector := to_tsvector('english', NEW.search_text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_contract_search_text ON contracts;
CREATE TRIGGER trigger_contract_search_text
  BEFORE INSERT OR UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_contract_search_text();

-- Function to update opportunity search text
CREATE OR REPLACE FUNCTION update_opportunity_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text := COALESCE(NEW.title, '') || ' ' || 
                     COALESCE(NEW.description, '') || ' ' ||
                     COALESCE(NEW.department, '') || ' ' ||
                     COALESCE(NEW.naics_code, '') || ' ' ||
                     COALESCE(NEW.set_aside, '');
  NEW.search_vector := to_tsvector('english', NEW.search_text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_opportunity_search_text ON opportunities;
CREATE TRIGGER trigger_opportunity_search_text
  BEFORE INSERT OR UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_opportunity_search_text();

-- SEMANTX SEARCH FUNCTION
CREATE OR REPLACE FUNCTION semantx_search(
  p_query TEXT,
  p_types TEXT[] DEFAULT NULL,
  p_states TEXT[] DEFAULT NULL,
  p_min_value DECIMAL DEFAULT NULL,
  p_max_value DECIMAL DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  result_type TEXT,
  name TEXT,
  entity_type TEXT,
  state TEXT,
  city TEXT,
  value DECIMAL,
  score INTEGER,
  description TEXT,
  relevance REAL
) AS $$
DECLARE
  search_tsquery tsquery;
BEGIN
  search_tsquery := plainto_tsquery('english', p_query);
  
  RETURN QUERY
  
  SELECT e.id, 'entity'::TEXT, e.canonical_name, e.entity_type, e.state, e.city,
    e.total_contract_value, e.opportunity_score, e.description,
    ts_rank(e.search_vector, search_tsquery) * 1.5 as relevance
  FROM core_entities e
  WHERE (e.search_vector @@ search_tsquery OR e.canonical_name ILIKE '%' || p_query || '%')
    AND (p_types IS NULL OR e.entity_type = ANY(p_types))
    AND (p_states IS NULL OR e.state = ANY(p_states))
    AND (p_min_value IS NULL OR e.total_contract_value >= p_min_value)
  
  UNION ALL
  
  SELECT c.id, 'contract'::TEXT, c.recipient_name, 'contract'::TEXT, c.pop_state, c.pop_city,
    c.award_amount, NULL::INTEGER, c.description,
    ts_rank(c.search_vector, search_tsquery) as relevance
  FROM contracts c
  WHERE (c.search_vector @@ search_tsquery OR c.recipient_name ILIKE '%' || p_query || '%')
    AND (p_states IS NULL OR c.pop_state = ANY(p_states))
    AND (p_min_value IS NULL OR c.award_amount >= p_min_value)
  
  UNION ALL
  
  SELECT o.id, 'opportunity'::TEXT, o.title, 'opportunity'::TEXT, o.pop_state, o.pop_city,
    o.award_ceiling, NULL::INTEGER, o.description,
    ts_rank(o.search_vector, search_tsquery) * 1.2 as relevance
  FROM opportunities o
  WHERE (o.search_vector @@ search_tsquery OR o.title ILIKE '%' || p_query || '%')
    AND o.is_active = TRUE
    AND (p_states IS NULL OR o.pop_state = ANY(p_states))
  
  ORDER BY relevance DESC, value DESC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Derive relationships from contracts
CREATE OR REPLACE FUNCTION derive_relationships()
RETURNS INTEGER AS $$
DECLARE created INTEGER := 0;
BEGIN
  INSERT INTO core_relationships (from_entity_id, to_entity_id, relationship_type, strength, source)
  SELECT DISTINCT c1.recipient_entity_id, c2.recipient_entity_id, 'competes_with', 0.5, 'derived'
  FROM contracts c1
  JOIN contracts c2 ON c1.awarding_agency = c2.awarding_agency
    AND c1.naics_code = c2.naics_code
    AND c1.recipient_entity_id != c2.recipient_entity_id
    AND c1.recipient_entity_id IS NOT NULL AND c2.recipient_entity_id IS NOT NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM core_relationships r
    WHERE r.from_entity_id = c1.recipient_entity_id AND r.to_entity_id = c2.recipient_entity_id
  )
  LIMIT 1000;
  GET DIAGNOSTICS created = ROW_COUNT;
  RETURN created;
END;
$$ LANGUAGE plpgsql;

-- Generate insights
CREATE OR REPLACE FUNCTION generate_insights()
RETURNS INTEGER AS $$
DECLARE generated INTEGER := 0;
BEGIN
  INSERT INTO insights (insight_type, severity, title, description, entity_ids, evidence)
  SELECT 'high_value', 'high', 'High-Value: ' || c.recipient_name,
    'Contract worth ' || TO_CHAR(c.award_amount, 'FM$999,999,999,999') || ' from ' || c.awarding_agency,
    ARRAY[c.recipient_entity_id],
    jsonb_build_object('award_id', c.award_id, 'amount', c.award_amount)
  FROM contracts c
  WHERE c.award_amount > 10000000 AND c.created_at > NOW() - INTERVAL '7 days'
    AND c.recipient_entity_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM insights i WHERE i.evidence->>'award_id' = c.award_id)
  LIMIT 50;
  GET DIAGNOSTICS generated = ROW_COUNT;
  RETURN generated;
END;
$$ LANGUAGE plpgsql;

-- Update existing records to trigger search vector generation
UPDATE core_entities SET search_text = canonical_name WHERE search_vector IS NULL;
UPDATE contracts SET search_text = recipient_name WHERE search_vector IS NULL;
UPDATE opportunities SET search_text = title WHERE search_vector IS NULL;