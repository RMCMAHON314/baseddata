
-- ============================================================
-- OPPORTUNITY INTELLIGENCE LAYER
-- Adds scoring, enrichment, competitive analysis, and forecasting
-- ============================================================

-- 1. Enrich opportunities table with intelligence columns
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS opportunity_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS competition_level TEXT, -- low, medium, high, full_open
  ADD COLUMN IF NOT EXISTS predicted_award_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS predicted_bidder_count INTEGER,
  ADD COLUMN IF NOT EXISTS incumbent_entity_id UUID REFERENCES core_entities(id),
  ADD COLUMN IF NOT EXISTS incumbent_name TEXT,
  ADD COLUMN IF NOT EXISTS related_contract_ids TEXT[],
  ADD COLUMN IF NOT EXISTS related_entity_ids UUID[],
  ADD COLUMN IF NOT EXISTS capability_tags TEXT[],
  ADD COLUMN IF NOT EXISTS urgency_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS market_size NUMERIC,
  ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enrichment_version INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_opps_score ON opportunities(opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_opps_urgency ON opportunities(urgency_score DESC);
CREATE INDEX IF NOT EXISTS idx_opps_enriched ON opportunities(enriched_at);
CREATE INDEX IF NOT EXISTS idx_opps_incumbent ON opportunities(incumbent_entity_id);
CREATE INDEX IF NOT EXISTS idx_opps_capability ON opportunities USING GIN(capability_tags);
CREATE INDEX IF NOT EXISTS idx_opps_active_deadline ON opportunities(is_active, response_deadline);

-- 2. Opportunity-Entity match scores (which entities should bid on which opportunities)
CREATE TABLE IF NOT EXISTS public.opportunity_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES core_entities(id) ON DELETE CASCADE,
  match_score NUMERIC NOT NULL DEFAULT 0, -- 0-100
  match_reasons JSONB DEFAULT '{}',
  -- breakdown scores
  naics_match BOOLEAN DEFAULT false,
  geographic_match BOOLEAN DEFAULT false,
  set_aside_match BOOLEAN DEFAULT false,
  past_performance_match BOOLEAN DEFAULT false,
  capability_match BOOLEAN DEFAULT false,
  -- derived intelligence
  win_probability NUMERIC, -- 0-1
  price_to_win NUMERIC,
  competitive_advantage TEXT,
  recommended_teaming TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(opportunity_id, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_opp_matches_entity ON opportunity_matches(entity_id);
CREATE INDEX IF NOT EXISTS idx_opp_matches_score ON opportunity_matches(match_score DESC);
ALTER TABLE public.opportunity_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read opp_matches" ON public.opportunity_matches FOR SELECT USING (true);
CREATE POLICY "Service write opp_matches" ON public.opportunity_matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update opp_matches" ON public.opportunity_matches FOR UPDATE USING (true);

-- 3. Opportunity intelligence log (tracks enrichment cycles)
CREATE TABLE IF NOT EXISTS public.opportunity_intelligence_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_type TEXT NOT NULL, -- 'enrich', 'score', 'match', 'forecast', 'derive'
  opportunities_processed INTEGER DEFAULT 0,
  matches_created INTEGER DEFAULT 0,
  insights_generated INTEGER DEFAULT 0,
  duration_ms INTEGER,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.opportunity_intelligence_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read opp_intel_log" ON public.opportunity_intelligence_log FOR SELECT USING (true);
CREATE POLICY "Service write opp_intel_log" ON public.opportunity_intelligence_log FOR INSERT WITH CHECK (true);

-- 4. SQL function: Score and enrich opportunities
CREATE OR REPLACE FUNCTION public.enrich_opportunities()
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_enriched INTEGER := 0;
  v_matched INTEGER := 0;
  v_opp RECORD;
  v_entity RECORD;
  v_score NUMERIC;
  v_urgency NUMERIC;
  v_days_left INTEGER;
  v_incumbent TEXT;
  v_incumbent_id UUID;
  v_market_size NUMERIC;
  v_competition TEXT;
  v_predicted_amount NUMERIC;
  v_match_score NUMERIC;
BEGIN
  -- Process unenriched or stale opportunities (enriched > 24h ago)
  FOR v_opp IN
    SELECT * FROM opportunities
    WHERE is_active = true
      AND (enriched_at IS NULL OR enriched_at < now() - interval '24 hours')
    ORDER BY response_deadline ASC NULLS LAST
    LIMIT 200
  LOOP
    -- Calculate urgency (0-100 based on deadline proximity)
    v_days_left := EXTRACT(EPOCH FROM (v_opp.response_deadline - now())) / 86400;
    v_urgency := CASE
      WHEN v_days_left IS NULL THEN 30
      WHEN v_days_left <= 3 THEN 100
      WHEN v_days_left <= 7 THEN 90
      WHEN v_days_left <= 14 THEN 75
      WHEN v_days_left <= 30 THEN 60
      WHEN v_days_left <= 60 THEN 40
      ELSE 20
    END;

    -- Find incumbent from past contracts with same agency + NAICS
    SELECT ce.id, ce.canonical_name INTO v_incumbent_id, v_incumbent
    FROM contracts c
    JOIN core_entities ce ON ce.id = c.recipient_entity_id
    WHERE c.awarding_agency = v_opp.department
      AND (c.naics_code = v_opp.naics_code OR v_opp.naics_code IS NULL)
    ORDER BY c.award_amount DESC NULLS LAST
    LIMIT 1;

    -- Estimate market size from historical awards
    SELECT COALESCE(AVG(c.award_amount), 0), COUNT(DISTINCT c.recipient_entity_id)
    INTO v_market_size, v_score
    FROM contracts c
    WHERE c.awarding_agency = v_opp.department
      AND (c.naics_code = v_opp.naics_code OR v_opp.naics_code IS NULL);

    -- Determine competition level
    v_competition := CASE
      WHEN v_opp.set_aside IS NOT NULL AND v_opp.set_aside != '' THEN 'restricted'
      WHEN v_score <= 3 THEN 'low'
      WHEN v_score <= 10 THEN 'medium'
      WHEN v_score <= 25 THEN 'high'
      ELSE 'full_open'
    END;

    -- Predict award amount
    v_predicted_amount := COALESCE(v_opp.award_ceiling, v_market_size, 0);

    -- Calculate opportunity score (0-100)
    v_score := LEAST(100, GREATEST(0,
      (v_urgency * 0.25) +
      (CASE WHEN v_predicted_amount > 10000000 THEN 30
            WHEN v_predicted_amount > 1000000 THEN 25
            WHEN v_predicted_amount > 100000 THEN 15
            ELSE 5 END) +
      (CASE WHEN v_competition = 'restricted' THEN 25
            WHEN v_competition = 'low' THEN 20
            WHEN v_competition = 'medium' THEN 15
            WHEN v_competition = 'high' THEN 10
            ELSE 5 END) +
      (CASE WHEN v_opp.description IS NOT NULL AND LENGTH(v_opp.description) > 100 THEN 10 ELSE 0 END) +
      (CASE WHEN v_opp.naics_code IS NOT NULL THEN 10 ELSE 0 END)
    ));

    -- Update opportunity
    UPDATE opportunities SET
      opportunity_score = v_score,
      urgency_score = v_urgency,
      competition_level = v_competition,
      predicted_award_amount = v_predicted_amount,
      incumbent_entity_id = v_incumbent_id,
      incumbent_name = v_incumbent,
      market_size = v_market_size,
      enriched_at = now(),
      enrichment_version = COALESCE(enrichment_version, 0) + 1
    WHERE id = v_opp.id;

    v_enriched := v_enriched + 1;

    -- Generate entity matches for this opportunity
    FOR v_entity IN
      SELECT ce.id, ce.canonical_name, ce.naics_codes, ce.state, ce.business_types,
             ce.total_contract_value, ce.contract_count
      FROM core_entities ce
      WHERE ce.is_canonical = true
        AND (
          v_opp.naics_code = ANY(ce.naics_codes)
          OR v_opp.pop_state = ce.state
          OR ce.total_contract_value > 1000000
        )
      LIMIT 20
    LOOP
      v_match_score := 0;

      -- NAICS match (+30)
      IF v_opp.naics_code = ANY(v_entity.naics_codes) THEN
        v_match_score := v_match_score + 30;
      END IF;

      -- Geographic match (+20)
      IF v_opp.pop_state = v_entity.state THEN
        v_match_score := v_match_score + 20;
      END IF;

      -- Set-aside match (+25)
      IF v_opp.set_aside IS NOT NULL AND v_entity.business_types IS NOT NULL THEN
        IF v_opp.set_aside ILIKE '%small%' AND 'Small Business' = ANY(v_entity.business_types) THEN
          v_match_score := v_match_score + 25;
        END IF;
      END IF;

      -- Past performance with agency (+25)
      IF EXISTS (
        SELECT 1 FROM contracts c
        WHERE c.recipient_entity_id = v_entity.id
          AND c.awarding_agency = v_opp.department
        LIMIT 1
      ) THEN
        v_match_score := v_match_score + 25;
      END IF;

      IF v_match_score >= 20 THEN
        INSERT INTO opportunity_matches (opportunity_id, entity_id, match_score, naics_match, geographic_match, set_aside_match, past_performance_match,
          match_reasons, win_probability)
        VALUES (
          v_opp.id, v_entity.id, v_match_score,
          v_opp.naics_code = ANY(v_entity.naics_codes),
          v_opp.pop_state = v_entity.state,
          v_opp.set_aside IS NOT NULL,
          EXISTS (SELECT 1 FROM contracts c WHERE c.recipient_entity_id = v_entity.id AND c.awarding_agency = v_opp.department LIMIT 1),
          jsonb_build_object('entity', v_entity.canonical_name, 'score', v_match_score),
          v_match_score / 100.0
        )
        ON CONFLICT (opportunity_id, entity_id) DO UPDATE SET
          match_score = EXCLUDED.match_score,
          win_probability = EXCLUDED.win_probability,
          updated_at = now();

        v_matched := v_matched + 1;
      END IF;
    END LOOP;
  END LOOP;

  -- Log the run
  INSERT INTO opportunity_intelligence_log (run_type, opportunities_processed, matches_created, details)
  VALUES ('enrich', v_enriched, v_matched, jsonb_build_object('timestamp', now()));

  RETURN jsonb_build_object('enriched', v_enriched, 'matched', v_matched);
END;
$$;

-- 5. SQL function: Derive recompete opportunities from expiring contracts
CREATE OR REPLACE FUNCTION public.derive_recompete_opportunities()
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_created INTEGER := 0;
  v_contract RECORD;
BEGIN
  FOR v_contract IN
    SELECT c.award_id, c.recipient_name, c.recipient_entity_id,
           c.awarding_agency, c.awarding_sub_agency, c.description,
           c.award_amount, c.naics_code, c.psc_code,
           c.end_date, c.pop_state, c.pop_city
    FROM contracts c
    WHERE c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '18 months'
      AND c.award_amount > 50000
      AND NOT EXISTS (
        SELECT 1 FROM opportunities o
        WHERE o.notice_id = 'recompete-' || c.award_id
      )
    ORDER BY c.award_amount DESC
    LIMIT 500
  LOOP
    INSERT INTO opportunities (
      notice_id, title, description, department, sub_tier,
      naics_code, psc_code, award_ceiling,
      response_deadline, pop_state, pop_city,
      is_active, notice_type, source,
      incumbent_entity_id, incumbent_name,
      competition_level, opportunity_score, urgency_score
    ) VALUES (
      'recompete-' || v_contract.award_id,
      '[RECOMPETE] ' || COALESCE(LEFT(v_contract.description, 150), v_contract.recipient_name, 'Contract Expiring'),
      format('Expiring contract (%s) held by %s. Current value: $%s. Agency: %s. Expires: %s.',
        v_contract.award_id, v_contract.recipient_name,
        to_char(v_contract.award_amount, 'FM999,999,999,999'),
        v_contract.awarding_agency, v_contract.end_date),
      v_contract.awarding_agency,
      v_contract.awarding_sub_agency,
      v_contract.naics_code,
      v_contract.psc_code,
      v_contract.award_amount,
      v_contract.end_date,
      v_contract.pop_state,
      v_contract.pop_city,
      true,
      'recompete_forecast',
      'derived',
      v_contract.recipient_entity_id,
      v_contract.recipient_name,
      'anticipated',
      -- Score: higher for bigger contracts expiring sooner
      LEAST(100, GREATEST(0,
        (CASE WHEN v_contract.award_amount > 10000000 THEN 40
              WHEN v_contract.award_amount > 1000000 THEN 30
              WHEN v_contract.award_amount > 100000 THEN 20
              ELSE 10 END) +
        (CASE WHEN v_contract.end_date < CURRENT_DATE + interval '6 months' THEN 40
              WHEN v_contract.end_date < CURRENT_DATE + interval '12 months' THEN 25
              ELSE 15 END) +
        20 -- base recompete value
      )),
      -- Urgency based on time to expiry
      CASE WHEN v_contract.end_date < CURRENT_DATE + interval '3 months' THEN 95
           WHEN v_contract.end_date < CURRENT_DATE + interval '6 months' THEN 80
           WHEN v_contract.end_date < CURRENT_DATE + interval '12 months' THEN 60
           ELSE 30 END
    )
    ON CONFLICT (notice_id) DO NOTHING;

    v_created := v_created + 1;
  END LOOP;

  INSERT INTO opportunity_intelligence_log (run_type, opportunities_processed, details)
  VALUES ('derive_recompetes', v_created, jsonb_build_object('timestamp', now()));

  RETURN jsonb_build_object('recompetes_created', v_created);
END;
$$;

-- 6. SQL function: Generate opportunity insights
CREATE OR REPLACE FUNCTION public.generate_opportunity_insights()
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_insights INTEGER := 0;
  v_rec RECORD;
BEGIN
  -- Insight: High-value opportunities closing soon
  FOR v_rec IN
    SELECT department, COUNT(*) as cnt, SUM(COALESCE(award_ceiling, predicted_award_amount, 0)) as total_value
    FROM opportunities
    WHERE is_active = true
      AND response_deadline BETWEEN CURRENT_DATE AND CURRENT_DATE + interval '30 days'
    GROUP BY department
    HAVING COUNT(*) >= 2
  LOOP
    INSERT INTO core_derived_insights (insight_type, scope_type, scope_value, title, description, confidence, severity, supporting_data)
    VALUES (
      'opportunity', 'agency', v_rec.department,
      format('%s opportunities closing within 30 days at %s', v_rec.cnt, v_rec.department),
      format('%s active opportunities worth ~$%s are closing within 30 days from %s. Immediate action recommended.',
        v_rec.cnt, to_char(v_rec.total_value, 'FM999,999,999,999'), v_rec.department),
      0.9, 'high',
      jsonb_build_object('count', v_rec.cnt, 'total_value', v_rec.total_value, 'agency', v_rec.department)
    )
    ON CONFLICT DO NOTHING;
    v_insights := v_insights + 1;
  END LOOP;

  -- Insight: Market concentration per NAICS
  FOR v_rec IN
    SELECT naics_code, COUNT(*) as opp_count,
           COUNT(DISTINCT department) as agency_count,
           SUM(COALESCE(award_ceiling, 0)) as total_ceiling
    FROM opportunities
    WHERE is_active = true AND naics_code IS NOT NULL
    GROUP BY naics_code
    HAVING COUNT(*) >= 3
    ORDER BY COUNT(*) DESC
    LIMIT 10
  LOOP
    INSERT INTO core_derived_insights (insight_type, scope_type, scope_value, title, description, confidence, severity, supporting_data)
    VALUES (
      'trend', 'naics', v_rec.naics_code,
      format('Hot market: %s active opportunities in NAICS %s', v_rec.opp_count, v_rec.naics_code),
      format('NAICS %s has %s active opportunities across %s agencies with $%s total ceiling. This indicates strong federal demand.',
        v_rec.naics_code, v_rec.opp_count, v_rec.agency_count, to_char(v_rec.total_ceiling, 'FM999,999,999,999')),
      0.85, 'medium',
      jsonb_build_object('naics', v_rec.naics_code, 'count', v_rec.opp_count, 'agencies', v_rec.agency_count)
    )
    ON CONFLICT DO NOTHING;
    v_insights := v_insights + 1;
  END LOOP;

  -- Insight: Recompete pipeline value
  FOR v_rec IN
    SELECT COUNT(*) as cnt, SUM(COALESCE(award_ceiling, 0)) as pipeline_value
    FROM opportunities
    WHERE notice_type = 'recompete_forecast' AND is_active = true
  LOOP
    IF v_rec.cnt > 0 THEN
      INSERT INTO core_derived_insights (insight_type, scope_type, scope_value, title, description, confidence, severity, supporting_data)
      VALUES (
        'opportunity', 'market', 'recompetes',
        format('$%s recompete pipeline: %s contracts expiring', to_char(v_rec.pipeline_value, 'FM999,999,999,999'), v_rec.cnt),
        format('%s contracts worth $%s are expiring within 18 months and will need recompetition. Early positioning is critical.',
          v_rec.cnt, to_char(v_rec.pipeline_value, 'FM999,999,999,999')),
        0.8, 'high',
        jsonb_build_object('recompete_count', v_rec.cnt, 'pipeline_value', v_rec.pipeline_value)
      )
      ON CONFLICT DO NOTHING;
      v_insights := v_insights + 1;
    END IF;
  END LOOP;

  INSERT INTO opportunity_intelligence_log (run_type, insights_generated, details)
  VALUES ('insights', v_insights, jsonb_build_object('timestamp', now()));

  RETURN jsonb_build_object('insights_generated', v_insights);
END;
$$;

-- 7. Master orchestrator: runs all opportunity intelligence
CREATE OR REPLACE FUNCTION public.run_opportunity_intelligence()
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_recompetes JSONB;
  v_enriched JSONB;
  v_insights JSONB;
BEGIN
  -- Step 1: Derive recompetes from expiring contracts
  v_recompetes := derive_recompete_opportunities();
  -- Step 2: Enrich and score all opportunities + generate entity matches
  v_enriched := enrich_opportunities();
  -- Step 3: Generate market insights
  v_insights := generate_opportunity_insights();

  RETURN jsonb_build_object(
    'recompetes', v_recompetes,
    'enrichment', v_enriched,
    'insights', v_insights,
    'timestamp', now()
  );
END;
$$;
