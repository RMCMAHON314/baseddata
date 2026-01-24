-- ============================================================
-- 🧠 UNIFIED INTELLIGENCE SYSTEM - PHASE 1-5
-- EVERYTHING CONNECTED. AI-POWERED. FUTURE-TECH.
-- ============================================================

-- ======= PHASE 1: THE UNIFIED CONTEXT ENGINE =======

-- The MASTER context builder - creates full awareness for any query
CREATE OR REPLACE FUNCTION build_unified_context(p_query TEXT)
RETURNS JSONB AS $$
DECLARE
  context JSONB;
  intent JSONB;
  mentioned_entities UUID[];
  relevant_facts JSONB;
  relevant_relationships JSONB;
  market_context JSONB;
  temporal_context JSONB;
  opportunity_context JSONB;
BEGIN
  -- 1. SEMANTIC UNDERSTANDING
  intent := analyze_query_intent(p_query);
  
  -- 2. FIND MENTIONED ENTITIES (fuzzy match)
  SELECT array_agg(DISTINCT e.id) INTO mentioned_entities
  FROM core_entities e
  WHERE 
    p_query ILIKE '%' || e.canonical_name || '%'
    OR similarity(lower(e.canonical_name), lower(p_query)) > 0.3;
  
  -- 3. GATHER RELEVANT FACTS
  SELECT jsonb_agg(jsonb_build_object(
    'entity', e.canonical_name,
    'fact_type', f.fact_type,
    'value', f.fact_value,
    'confidence', f.confidence
  ) ORDER BY f.confidence DESC)
  INTO relevant_facts
  FROM core_facts f
  JOIN core_entities e ON f.entity_id = e.id
  WHERE f.entity_id = ANY(mentioned_entities)
  OR f.fact_type IN (
    SELECT unnest(CASE 
      WHEN intent->>'subject' = 'contracts' THEN ARRAY['contract_awarded', 'contract_tier', 'federal_relationship']
      WHEN intent->>'subject' = 'payments' THEN ARRAY['payment_received', 'payment_tier', 'pharma_relationship']
      WHEN intent->>'subject' = 'hospitals' THEN ARRAY['facility_type', 'geographic_presence']
      ELSE ARRAY['geographic_presence', 'facility_type']
    END)
  )
  LIMIT 50;
  
  -- 4. GATHER RELATIONSHIP CONTEXT
  SELECT jsonb_agg(jsonb_build_object(
    'from', fe.canonical_name,
    'to', te.canonical_name,
    'type', cr.relationship_type,
    'strength', cr.strength
  ) ORDER BY cr.strength DESC)
  INTO relevant_relationships
  FROM core_relationships cr
  JOIN core_entities fe ON cr.from_entity_id = fe.id
  JOIN core_entities te ON cr.to_entity_id = te.id
  WHERE cr.from_entity_id = ANY(mentioned_entities)
  OR cr.to_entity_id = ANY(mentioned_entities)
  LIMIT 30;
  
  -- 5. MARKET CONTEXT
  SELECT jsonb_build_object(
    'total_entities', (SELECT COUNT(*) FROM core_entities),
    'total_facts', (SELECT COUNT(*) FROM core_facts),
    'total_relationships', (SELECT COUNT(*) FROM core_relationships),
    'active_sources', (SELECT COUNT(*) FROM api_sources WHERE status = 'active'),
    'top_categories', (
      SELECT jsonb_agg(jsonb_build_object('category', category, 'count', cnt))
      FROM (
        SELECT category, COUNT(*) as cnt 
        FROM records 
        WHERE category IS NOT NULL 
        GROUP BY category 
        ORDER BY cnt DESC 
        LIMIT 5
      ) cats
    ),
    'geographic_focus', (
      SELECT jsonb_agg(jsonb_build_object('state', state, 'count', cnt))
      FROM (
        SELECT state, COUNT(*) as cnt 
        FROM records 
        WHERE state IS NOT NULL 
        GROUP BY state 
        ORDER BY cnt DESC 
        LIMIT 5
      ) states
    )
  ) INTO market_context;
  
  -- 6. TEMPORAL CONTEXT
  SELECT jsonb_build_object(
    'recent_high_value_contracts', (
      SELECT jsonb_agg(sub)
      FROM (
        SELECT jsonb_build_object(
          'entity', name,
          'amount', (properties->>'award_amount')::numeric,
          'agency', properties->>'awarding_agency'
        ) as sub
        FROM records
        WHERE source_id = 'USASpending'
        AND (properties->>'award_amount')::numeric >= 1000000
        ORDER BY collected_at DESC
        LIMIT 5
      ) x
    ),
    'recent_payments', (
      SELECT jsonb_agg(sub)
      FROM (
        SELECT jsonb_build_object(
          'entity', name,
          'amount', (properties->>'payment_amount')::numeric,
          'payer', properties->>'payer'
        ) as sub
        FROM records
        WHERE source_id = 'CMS_Open_Payments'
        AND (properties->>'payment_amount')::numeric >= 10000
        ORDER BY collected_at DESC
        LIMIT 5
      ) y
    )
  ) INTO temporal_context;
  
  -- 7. OPPORTUNITY CONTEXT
  SELECT jsonb_build_object(
    'hot_opportunities', (
      SELECT jsonb_agg(jsonb_build_object(
        'entity', canonical_name,
        'score', opportunity_score,
        'type', entity_type
      ))
      FROM core_entities
      WHERE opportunity_score >= 70
      ORDER BY opportunity_score DESC
      LIMIT 10
    )
  ) INTO opportunity_context;
  
  -- BUILD UNIFIED CONTEXT
  context := jsonb_build_object(
    'query', p_query,
    'intent', intent,
    'mentioned_entities', mentioned_entities,
    'relevant_facts', COALESCE(relevant_facts, '[]'::jsonb),
    'relevant_relationships', COALESCE(relevant_relationships, '[]'::jsonb),
    'market_context', market_context,
    'temporal_context', temporal_context,
    'opportunity_context', opportunity_context,
    'awareness_level', 'FULL',
    'context_built_at', NOW()
  );
  
  RETURN context;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ======= PHASE 2: AI NARRATIVE GENERATION =======

-- Create narrative templates table
CREATE TABLE IF NOT EXISTS narrative_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type VARCHAR(100) NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  template_body TEXT NOT NULL,
  variables JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert intelligent narrative templates
INSERT INTO narrative_templates (template_type, template_name, template_body, variables) VALUES

-- Entity briefing
('entity_briefing', 'Complete Entity Intelligence Briefing', 
'## Intelligence Briefing: {{entity_name}}

### Executive Summary
{{entity_name}} is a {{entity_type}} based in {{primary_city}}, {{primary_state}}.

### Data Coverage
- **Sources:** {{source_count}} verified data sources
- **Facts:** {{fact_count}} documented facts
- **Connections:** {{relationship_count}} known relationships
- **Data Quality:** {{data_quality_score}}/100

### Intelligence Assessment
- **Opportunity Score:** {{opportunity_score}}/100
- **Health Score:** {{health_score}}/100
', 
'{"required": ["entity_name", "entity_type", "primary_city", "primary_state"]}'::jsonb),

-- Market analysis
('market_analysis', 'Market Intelligence Report',
'## Market Intelligence: {{category}} in {{location}}

### Market Overview
The {{category}} market in {{location}} contains **{{entity_count}} tracked entities** across **{{source_count}} data sources**.

### Financial Activity
- **Total Contract Value:** ${{total_contracts}}
- **Total Payment Volume:** ${{total_payments}}
- **Average Entity Value:** ${{avg_entity_value}}

### Intelligence Assessment
{{market_assessment}}
',
'{"required": ["category", "location", "entity_count"]}'::jsonb),

-- Query response
('query_response', 'Intelligent Query Response',
'## Query Analysis: "{{raw_query}}"

### Understanding
I interpreted your query as a **{{intent}}** request for **{{subject}}**.

### Key Findings
Found **{{result_count}} results** from **{{source_count}} sources**.

### Intelligence Summary
- Total Value: ${{total_value}}
- Geographic Distribution: {{geo_summary}}
',
'{"required": ["raw_query", "intent", "subject"]}'::jsonb);

-- Generate AI narrative from template and context
CREATE OR REPLACE FUNCTION generate_ai_narrative(
  p_template_type VARCHAR(100),
  p_context JSONB
)
RETURNS TEXT AS $$
DECLARE
  template_body TEXT;
  narrative TEXT;
  var_name TEXT;
  var_value TEXT;
BEGIN
  -- Get template
  SELECT nt.template_body INTO template_body
  FROM narrative_templates nt
  WHERE nt.template_type = p_template_type
  LIMIT 1;
  
  IF template_body IS NULL THEN
    RETURN 'Template not found: ' || p_template_type;
  END IF;
  
  narrative := template_body;
  
  -- Simple variable substitution ({{variable}})
  FOR var_name, var_value IN 
    SELECT key, value::text 
    FROM jsonb_each_text(p_context)
  LOOP
    narrative := replace(narrative, '{{' || var_name || '}}', COALESCE(var_value, 'N/A'));
  END LOOP;
  
  RETURN narrative;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Generate entity briefing
CREATE OR REPLACE FUNCTION generate_entity_briefing(p_entity_id UUID)
RETURNS TEXT AS $$
DECLARE
  entity_context JSONB;
  profile RECORD;
BEGIN
  -- Get entity from core_entities
  SELECT * INTO profile
  FROM core_entities
  WHERE id = p_entity_id;
  
  IF profile IS NULL THEN
    RETURN 'Entity not found';
  END IF;
  
  -- Build context for template
  entity_context := jsonb_build_object(
    'entity_name', profile.canonical_name,
    'entity_type', profile.entity_type,
    'primary_city', COALESCE(profile.city, profile.merged_data->>'city', 'Unknown'),
    'primary_state', COALESCE(profile.state, profile.merged_data->>'state', 'Unknown'),
    'source_count', COALESCE(profile.source_count, 1),
    'fact_count', (SELECT COUNT(*) FROM core_facts WHERE entity_id = p_entity_id),
    'relationship_count', (SELECT COUNT(*) FROM core_relationships WHERE from_entity_id = p_entity_id OR to_entity_id = p_entity_id),
    'data_quality_score', COALESCE(profile.data_quality_score, 50),
    'opportunity_score', COALESCE(profile.opportunity_score, 50),
    'health_score', COALESCE(profile.health_score, 50)
  );
  
  RETURN generate_ai_narrative('entity_briefing', entity_context);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ======= PHASE 3: NETWORK INTELLIGENCE =======

-- Get entity network with depth
CREATE OR REPLACE FUNCTION get_entity_network(
  p_entity_id UUID,
  p_depth INTEGER DEFAULT 2,
  p_min_strength DECIMAL DEFAULT 0.3
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  nodes JSONB;
  edges JSONB;
BEGIN
  -- Get nodes (connected entities)
  WITH RECURSIVE network AS (
    -- Start with the root entity
    SELECT 
      e.id,
      e.canonical_name,
      e.entity_type,
      e.opportunity_score,
      0 as depth
    FROM core_entities e
    WHERE e.id = p_entity_id
    
    UNION
    
    -- Get connected entities
    SELECT 
      e.id,
      e.canonical_name,
      e.entity_type,
      e.opportunity_score,
      n.depth + 1
    FROM network n
    JOIN core_relationships cr ON cr.from_entity_id = n.id OR cr.to_entity_id = n.id
    JOIN core_entities e ON e.id = CASE 
      WHEN cr.from_entity_id = n.id THEN cr.to_entity_id 
      ELSE cr.from_entity_id 
    END
    WHERE n.depth < p_depth
    AND cr.strength >= p_min_strength
  )
  SELECT jsonb_agg(DISTINCT jsonb_build_object(
    'id', id,
    'name', canonical_name,
    'type', entity_type,
    'opportunity_score', opportunity_score,
    'depth', depth
  ))
  INTO nodes
  FROM network;
  
  -- Get edges
  SELECT jsonb_agg(jsonb_build_object(
    'from', cr.from_entity_id,
    'to', cr.to_entity_id,
    'type', cr.relationship_type,
    'strength', cr.strength
  ))
  INTO edges
  FROM core_relationships cr
  WHERE (cr.from_entity_id = p_entity_id OR cr.to_entity_id = p_entity_id)
  AND cr.strength >= p_min_strength;
  
  result := jsonb_build_object(
    'root_entity_id', p_entity_id,
    'nodes', COALESCE(nodes, '[]'::jsonb),
    'edges', COALESCE(edges, '[]'::jsonb),
    'depth', p_depth
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Find competitors
CREATE OR REPLACE FUNCTION find_competitors(
  p_entity_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  competitor_id UUID,
  competitor_name VARCHAR,
  entity_type VARCHAR,
  similarity_score DECIMAL,
  opportunity_score INTEGER,
  shared_categories INTEGER
) AS $$
DECLARE
  v_entity RECORD;
BEGIN
  -- Get source entity
  SELECT * INTO v_entity FROM core_entities WHERE id = p_entity_id;
  
  IF v_entity IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    e.id as competitor_id,
    e.canonical_name as competitor_name,
    e.entity_type,
    similarity(e.canonical_name, v_entity.canonical_name)::DECIMAL as similarity_score,
    COALESCE(e.opportunity_score, 50)::INTEGER as opportunity_score,
    1 as shared_categories
  FROM core_entities e
  WHERE e.id != p_entity_id
  AND e.entity_type = v_entity.entity_type
  AND (e.state = v_entity.state OR e.merged_data->>'state' = v_entity.merged_data->>'state')
  ORDER BY opportunity_score DESC, similarity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Calculate network influence
CREATE OR REPLACE FUNCTION calculate_network_influence()
RETURNS void AS $$
BEGIN
  -- Update health scores based on network connections
  UPDATE core_entities e SET
    health_score = LEAST(100, COALESCE(health_score, 50) + 
      (SELECT LEAST(20, COUNT(*) * 2) FROM core_relationships cr 
       WHERE cr.from_entity_id = e.id OR cr.to_entity_id = e.id)),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ======= PHASE 5: INTELLIGENCE TRIGGERS =======

-- Trigger: New record → Extract facts → Generate insights → Alert if significant
CREATE OR REPLACE FUNCTION trigger_intelligence_cascade()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Queue for entity resolution via notification
  PERFORM pg_notify('entity_resolution', json_build_object(
    'record_id', NEW.id,
    'source', NEW.source_id
  )::text);
  
  -- 2. If entity already linked, queue fact extraction
  IF NEW.entity_id IS NOT NULL THEN
    INSERT INTO flywheel_discovery_queue (discovery_type, target_source, target_query, priority, context)
    VALUES (
      'fact_extraction',
      'internal',
      jsonb_build_object('record_id', NEW.id),
      80,
      jsonb_build_object('entity_id', NEW.entity_id)
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- 3. If high-value, generate alert
  IF (NEW.properties->>'award_amount')::numeric >= 1000000 OR
     (NEW.properties->>'payment_amount')::numeric >= 50000 THEN
    INSERT INTO intelligence_alerts (alert_type, severity, entity_id, title, description, data)
    VALUES (
      'high_value_activity',
      'critical',
      NEW.entity_id,
      'High-value activity detected: ' || COALESCE(NEW.name, 'Unknown'),
      COALESCE(NEW.description, 'New high-value record from ' || NEW.source_id),
      jsonb_build_object(
        'record_id', NEW.id,
        'amount', COALESCE(
          (NEW.properties->>'award_amount')::numeric,
          (NEW.properties->>'payment_amount')::numeric
        )
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS record_intelligence_cascade ON records;
CREATE TRIGGER record_intelligence_cascade
AFTER INSERT ON records
FOR EACH ROW EXECUTE FUNCTION trigger_intelligence_cascade();

-- Trigger: New entity → Find relationships → Calculate scores
CREATE OR REPLACE FUNCTION trigger_entity_intelligence()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Find same_location relationships to existing entities
  INSERT INTO core_relationships (from_entity_id, to_entity_id, relationship_type, strength, confidence, evidence)
  SELECT 
    NEW.id,
    e.id,
    'same_location',
    0.5,
    0.7,
    jsonb_build_array(jsonb_build_object(
      'type', 'geographic_match',
      'city', COALESCE(NEW.city, NEW.merged_data->>'city'),
      'state', COALESCE(NEW.state, NEW.merged_data->>'state')
    ))
  FROM core_entities e
  WHERE e.id != NEW.id
  AND COALESCE(e.city, e.merged_data->>'city') = COALESCE(NEW.city, NEW.merged_data->>'city')
  AND COALESCE(e.state, e.merged_data->>'state') = COALESCE(NEW.state, NEW.merged_data->>'state')
  AND COALESCE(NEW.city, NEW.merged_data->>'city') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM core_relationships cr 
    WHERE (cr.from_entity_id = NEW.id AND cr.to_entity_id = e.id)
    OR (cr.from_entity_id = e.id AND cr.to_entity_id = NEW.id)
  )
  LIMIT 50
  ON CONFLICT DO NOTHING;
  
  -- 2. Initialize scores if null
  IF NEW.health_score IS NULL THEN
    NEW.health_score := 50;
    NEW.opportunity_score := 50;
    NEW.data_quality_score := 50;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS entity_intelligence_cascade ON core_entities;
CREATE TRIGGER entity_intelligence_cascade
BEFORE INSERT ON core_entities
FOR EACH ROW EXECUTE FUNCTION trigger_entity_intelligence();

-- Trigger: New fact → Update entity scores
CREATE OR REPLACE FUNCTION trigger_fact_intelligence()
RETURNS TRIGGER AS $$
BEGIN
  -- Update entity data quality score
  UPDATE core_entities SET
    data_quality_score = LEAST(100, COALESCE(data_quality_score, 50) + 2),
    updated_at = NOW()
  WHERE id = NEW.entity_id;
  
  -- If financial fact, update opportunity score
  IF NEW.fact_type IN ('payment_received', 'contract_awarded') THEN
    UPDATE core_entities SET
      opportunity_score = LEAST(100, COALESCE(opportunity_score, 50) + 5),
      updated_at = NOW()
    WHERE id = NEW.entity_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS fact_intelligence_cascade ON core_facts;
CREATE TRIGGER fact_intelligence_cascade
AFTER INSERT ON core_facts
FOR EACH ROW EXECUTE FUNCTION trigger_fact_intelligence();

-- Trigger: New relationship → Update influence scores
CREATE OR REPLACE FUNCTION trigger_relationship_intelligence()
RETURNS TRIGGER AS $$
BEGIN
  -- Update influence for both entities
  UPDATE core_entities SET
    health_score = LEAST(100, COALESCE(health_score, 50) + 1),
    updated_at = NOW()
  WHERE id IN (NEW.from_entity_id, NEW.to_entity_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS relationship_intelligence_cascade ON core_relationships;
CREATE TRIGGER relationship_intelligence_cascade
AFTER INSERT ON core_relationships
FOR EACH ROW EXECUTE FUNCTION trigger_relationship_intelligence();

-- Enable RLS on narrative_templates
ALTER TABLE narrative_templates ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to narrative_templates" ON narrative_templates
  FOR ALL USING (true) WITH CHECK (true);

-- Allow authenticated users to read templates
CREATE POLICY "Authenticated users can read narrative_templates" ON narrative_templates
  FOR SELECT TO authenticated USING (true);