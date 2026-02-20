
-- Create core_facts_summary table for fast entity timeline queries
CREATE TABLE IF NOT EXISTS core_facts_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID REFERENCES core_entities(id),
  fact_type TEXT NOT NULL,
  fact_count INTEGER DEFAULT 0,
  latest_value TEXT,
  latest_date TIMESTAMPTZ,
  earliest_date TIMESTAMPTZ,
  sample_values JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_facts_summary_entity ON core_facts_summary(entity_id);
CREATE INDEX IF NOT EXISTS idx_facts_summary_type ON core_facts_summary(fact_type);

-- Enable RLS
ALTER TABLE core_facts_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access on core_facts_summary" ON core_facts_summary FOR SELECT USING (true);

-- Add critical missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_contracts_recipient ON contracts(recipient_entity_id);
CREATE INDEX IF NOT EXISTS idx_contracts_agency ON contracts(awarding_agency);
CREATE INDEX IF NOT EXISTS idx_contracts_naics ON contracts(naics_code);
CREATE INDEX IF NOT EXISTS idx_contracts_date ON contracts(award_date DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_value ON contracts(base_and_all_options DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_grants_recipient ON grants(recipient_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_source ON core_relationships(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON core_relationships(to_entity_id);
CREATE INDEX IF NOT EXISTS idx_insights_entity ON insights USING GIN (entity_ids);
CREATE INDEX IF NOT EXISTS idx_health_scores_entity ON entity_health_scores(entity_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
