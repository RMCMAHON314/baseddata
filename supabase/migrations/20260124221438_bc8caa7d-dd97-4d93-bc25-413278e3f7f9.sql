-- Fix flywheel_discovery_queue missing column
ALTER TABLE flywheel_discovery_queue ADD COLUMN IF NOT EXISTS target_type TEXT;
CREATE INDEX IF NOT EXISTS idx_flywheel_target_type ON flywheel_discovery_queue(target_type);

-- Add state column to core_relationships if missing
ALTER TABLE core_relationships ADD COLUMN IF NOT EXISTS state TEXT;

-- Contract Classifications table
CREATE TABLE IF NOT EXISTS public.contract_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  primary_category TEXT NOT NULL,
  secondary_categories TEXT[] DEFAULT '{}',
  capabilities TEXT[] DEFAULT '{}',
  confidence DECIMAL(3,2) DEFAULT 0.5,
  classified_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id)
);
CREATE INDEX IF NOT EXISTS idx_classifications_contract ON public.contract_classifications(contract_id);
CREATE INDEX IF NOT EXISTS idx_classifications_category ON public.contract_classifications(primary_category);

-- Entity Health Scores table
CREATE TABLE IF NOT EXISTS public.entity_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.core_entities(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL,
  contract_velocity DECIMAL(5,2) DEFAULT 0,
  grant_success DECIMAL(5,2) DEFAULT 0,
  relationship_density DECIMAL(5,2) DEFAULT 0,
  market_diversification DECIMAL(5,2) DEFAULT 0,
  trend_direction TEXT CHECK (trend_direction IN ('up', 'down', 'stable')),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_id)
);
CREATE INDEX IF NOT EXISTS idx_health_scores_entity ON public.entity_health_scores(entity_id);
CREATE INDEX IF NOT EXISTS idx_health_scores_overall ON public.entity_health_scores(overall_score DESC);

-- Saved Searches table
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  alert_enabled BOOLEAN DEFAULT FALSE,
  alert_frequency TEXT DEFAULT 'daily',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON public.saved_searches(user_id);

-- Portfolios table
CREATE TABLE IF NOT EXISTS public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portfolios_user ON public.portfolios(user_id);

-- Portfolio Members table
CREATE TABLE IF NOT EXISTS public.portfolio_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.core_entities(id) ON DELETE CASCADE,
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(portfolio_id, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_portfolio_members_portfolio ON public.portfolio_members(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_members_entity ON public.portfolio_members(entity_id);

-- Enable RLS on all new tables
ALTER TABLE public.contract_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contract_classifications (public read)
CREATE POLICY "Public read for classifications" ON public.contract_classifications
  FOR SELECT USING (true);

CREATE POLICY "Service role write for classifications" ON public.contract_classifications
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for entity_health_scores (public read)
CREATE POLICY "Public read for health_scores" ON public.entity_health_scores
  FOR SELECT USING (true);

CREATE POLICY "Service role write for health_scores" ON public.entity_health_scores
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for saved_searches (user owns their searches)
CREATE POLICY "Users manage own saved searches" ON public.saved_searches
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for portfolios
CREATE POLICY "Users manage own portfolios" ON public.portfolios
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public portfolios are viewable" ON public.portfolios
  FOR SELECT USING (is_public = true);

-- RLS Policies for portfolio_members
CREATE POLICY "Users manage own portfolio members" ON public.portfolio_members
  FOR ALL USING (
    portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid())
  ) WITH CHECK (
    portfolio_id IN (SELECT id FROM public.portfolios WHERE user_id = auth.uid())
  );

CREATE POLICY "Public portfolio members viewable" ON public.portfolio_members
  FOR SELECT USING (
    portfolio_id IN (SELECT id FROM public.portfolios WHERE is_public = true)
  );