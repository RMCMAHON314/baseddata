-- New tables for Phase 2 intelligence systems (avoiding existing 'insights' table)

-- Win rate predictions
CREATE TABLE IF NOT EXISTS public.win_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES core_entities(id) ON DELETE CASCADE,
  opportunity_id UUID,
  predicted_win_rate INTEGER,
  features JSONB,
  predicted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teaming partner relationships
CREATE TABLE IF NOT EXISTS public.teaming_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES core_entities(id) ON DELETE CASCADE,
  partner_entity_id UUID REFERENCES core_entities(id) ON DELETE CASCADE,
  strength_score DECIMAL(3,2),
  shared_agencies INTEGER DEFAULT 0,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_id, partner_entity_id)
);

-- Market shifts tracking
CREATE TABLE IF NOT EXISTS public.market_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES core_entities(id) ON DELETE CASCADE,
  shift_type TEXT NOT NULL,
  agencies TEXT[],
  velocity_change INTEGER,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data quality audit logs
CREATE TABLE IF NOT EXISTS public.data_quality_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_type TEXT NOT NULL,
  issues_found INTEGER DEFAULT 0,
  issues_fixed INTEGER DEFAULT 0,
  details JSONB,
  ran_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.win_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaming_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_quality_logs ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read win_predictions" ON public.win_predictions FOR SELECT USING (true);
CREATE POLICY "Public read teaming_partners" ON public.teaming_partners FOR SELECT USING (true);
CREATE POLICY "Public read market_shifts" ON public.market_shifts FOR SELECT USING (true);
CREATE POLICY "Public read data_quality_logs" ON public.data_quality_logs FOR SELECT USING (true);

-- Service role write policies
CREATE POLICY "Service write win_predictions" ON public.win_predictions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write teaming_partners" ON public.teaming_partners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write market_shifts" ON public.market_shifts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write data_quality_logs" ON public.data_quality_logs FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_win_predictions_entity ON public.win_predictions(entity_id);
CREATE INDEX IF NOT EXISTS idx_teaming_partners_entity ON public.teaming_partners(entity_id);
CREATE INDEX IF NOT EXISTS idx_market_shifts_entity ON public.market_shifts(entity_id);