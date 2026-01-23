-- ============================================================
-- PRODUCTION-GRADE DATAVERSE: Enhanced Schema
-- ============================================================

-- Enable pg_trgm extension for text search (uuid-ossp already exists)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENHANCED SOURCES TABLE
-- ============================================================

-- Add missing columns to existing api_sources table
ALTER TABLE public.api_sources 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS rate_limit_per_minute INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS rate_limit_per_day INTEGER DEFAULT 10000,
ADD COLUMN IF NOT EXISTS health_status VARCHAR(50) DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_successful_query TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_response_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add check constraints
ALTER TABLE public.api_sources DROP CONSTRAINT IF EXISTS api_sources_health_status_check;
ALTER TABLE public.api_sources ADD CONSTRAINT api_sources_health_status_check 
  CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown'));

-- ============================================================
-- QUERY SOURCES JUNCTION TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.query_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.api_sources(id) ON DELETE SET NULL,
  source_slug VARCHAR(100) NOT NULL,
  
  -- Execution Status
  status VARCHAR(50) DEFAULT 'pending',
  
  -- Results
  records_returned INTEGER DEFAULT 0,
  records_after_filter INTEGER DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  execution_time_ms INTEGER,
  
  -- Error Handling
  error_message TEXT,
  error_code VARCHAR(50),
  retry_count INTEGER DEFAULT 0,
  
  -- API Response
  http_status INTEGER,
  response_size_bytes INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(query_id, source_slug)
);

-- Add constraint for status
ALTER TABLE public.query_sources ADD CONSTRAINT query_sources_status_check 
  CHECK (status IN ('pending', 'executing', 'completed', 'failed', 'skipped', 'timeout'));

-- ============================================================
-- HEALTH CHECKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.api_sources(id) ON DELETE CASCADE,
  source_slug VARCHAR(100),
  
  -- Results
  status VARCHAR(50) NOT NULL,
  response_time_ms INTEGER,
  http_status INTEGER,
  
  -- Details
  test_endpoint TEXT,
  records_returned INTEGER,
  error_message TEXT,
  
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraint for health check status
ALTER TABLE public.health_checks ADD CONSTRAINT health_checks_status_check 
  CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'timeout', 'error'));

-- ============================================================
-- SYSTEM LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Log Details
  level VARCHAR(20) NOT NULL,
  component VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  
  -- Context
  query_id UUID REFERENCES public.queries(id) ON DELETE SET NULL,
  source_id UUID REFERENCES public.api_sources(id) ON DELETE SET NULL,
  
  -- Details
  details JSONB DEFAULT '{}',
  stack_trace TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraint for log level
ALTER TABLE public.system_logs ADD CONSTRAINT system_logs_level_check 
  CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'));

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- API Sources
CREATE INDEX IF NOT EXISTS idx_api_sources_status ON public.api_sources(status);
CREATE INDEX IF NOT EXISTS idx_api_sources_health ON public.api_sources(health_status);
CREATE INDEX IF NOT EXISTS idx_api_sources_priority ON public.api_sources(priority DESC);

-- Query Sources
CREATE INDEX IF NOT EXISTS idx_query_sources_query ON public.query_sources(query_id);
CREATE INDEX IF NOT EXISTS idx_query_sources_status ON public.query_sources(status);
CREATE INDEX IF NOT EXISTS idx_query_sources_source ON public.query_sources(source_slug);

-- Health Checks
CREATE INDEX IF NOT EXISTS idx_health_checks_source ON public.health_checks(source_id);
CREATE INDEX IF NOT EXISTS idx_health_checks_time ON public.health_checks(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON public.health_checks(status);

-- System Logs
CREATE INDEX IF NOT EXISTS idx_logs_level ON public.system_logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_component ON public.system_logs(component);
CREATE INDEX IF NOT EXISTS idx_logs_time ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_query ON public.system_logs(query_id);

-- ============================================================
-- DATABASE FUNCTIONS
-- ============================================================

-- Log event function
CREATE OR REPLACE FUNCTION public.log_system_event(
  p_level VARCHAR,
  p_component VARCHAR,
  p_message TEXT,
  p_query_id UUID DEFAULT NULL,
  p_source_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.system_logs (level, component, message, query_id, source_id, details)
  VALUES (p_level, p_component, p_message, p_query_id, p_source_id, p_details)
  RETURNING id INTO log_id;
  RETURN log_id;
END;
$$;

-- Get sources for a query (keyword matching)
CREATE OR REPLACE FUNCTION public.get_matched_sources(p_query TEXT)
RETURNS TABLE (
  id UUID,
  slug VARCHAR,
  name VARCHAR,
  base_url VARCHAR,
  priority INTEGER,
  categories TEXT[],
  keywords TEXT[],
  match_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.slug,
    s.name,
    s.base_url,
    s.priority,
    s.categories,
    s.keywords,
    (
      SELECT COUNT(*)::INTEGER 
      FROM unnest(s.keywords) k 
      WHERE LOWER(p_query) LIKE '%' || LOWER(k) || '%'
    ) as match_score
  FROM public.api_sources s
  WHERE s.status = 'active'
    AND (s.health_status IS NULL OR s.health_status != 'unhealthy')
    AND (s.consecutive_failures < 5 OR s.last_successful_query > NOW() - INTERVAL '1 hour')
    AND EXISTS (
      SELECT 1 FROM unnest(s.keywords) k 
      WHERE LOWER(p_query) LIKE '%' || LOWER(k) || '%'
    )
  ORDER BY match_score DESC, s.priority DESC;
END;
$$;

-- Update query stats from query_sources
CREATE OR REPLACE FUNCTION public.update_query_from_sources()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.queries SET
    sources_queried = (
      SELECT array_agg(source_slug) 
      FROM public.query_sources 
      WHERE query_id = NEW.query_id
    )
  WHERE id = NEW.query_id;
  RETURN NEW;
END;
$$;

-- Trigger to auto-update query stats
DROP TRIGGER IF EXISTS query_sources_update_trigger ON public.query_sources;
CREATE TRIGGER query_sources_update_trigger
  AFTER INSERT OR UPDATE ON public.query_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_query_from_sources();

-- ============================================================
-- ENHANCED SOURCES SEED (Upsert existing + add new)
-- ============================================================

-- Update existing sources with production config
INSERT INTO public.api_sources (slug, name, description, base_url, api_type, auth_type, categories, keywords, priority, rate_limit_per_minute, status, health_status)
VALUES
-- TIER 1: Core Infrastructure
('openstreetmap', 'OpenStreetMap', 'Global POI and location data via Overpass API', 'https://overpass-api.de/api/interpreter', 'rest', 'none',
 ARRAY['geospatial', 'poi', 'locations'],
 ARRAY['location', 'place', 'where', 'near', 'address', 'map', 'find', 'hospital', 'school', 'restaurant', 'bank', 'park'],
 100, 10, 'active', 'unknown'),

-- TIER 2: Healthcare
('cms-open-payments', 'CMS Open Payments', 'Pharma payments to physicians (Sunshine Act)', 'https://openpaymentsdata.cms.gov/api/1/datastore/query', 'rest', 'none',
 ARRAY['healthcare', 'pharmaceutical', 'doctors'],
 ARRAY['doctor', 'physician', 'drug', 'pharma', 'prescribe', 'payment', 'medical', 'healthcare', 'medicine', 'sunshine'],
 90, 60, 'active', 'unknown'),

('npi-registry', 'NPI Registry', 'National Provider Identifier database', 'https://npiregistry.cms.hhs.gov/api', 'rest', 'none',
 ARRAY['healthcare', 'providers'],
 ARRAY['npi', 'provider', 'doctor', 'nurse', 'dentist', 'therapist', 'healthcare provider', 'physician'],
 85, 60, 'active', 'unknown'),

('hospital-compare', 'Hospital Compare', 'Medicare hospital quality ratings', 'https://data.cms.gov/provider-data/api/1/datastore/query', 'rest', 'none',
 ARRAY['healthcare', 'hospitals', 'quality'],
 ARRAY['hospital', 'quality', 'rating', 'mortality', 'readmission', 'medicare'],
 85, 60, 'active', 'unknown'),

('fda-drugs', 'FDA Drug Database', 'FDA approved drugs and labels', 'https://api.fda.gov/drug', 'rest', 'none',
 ARRAY['healthcare', 'pharmaceutical', 'drugs'],
 ARRAY['drug', 'medication', 'fda', 'prescription', 'medicine', 'pharmaceutical', 'label'],
 80, 240, 'active', 'unknown'),

('clinical-trials', 'ClinicalTrials.gov', 'Clinical research studies', 'https://clinicaltrials.gov/api/v2/studies', 'rest', 'none',
 ARRAY['healthcare', 'research'],
 ARRAY['clinical trial', 'study', 'research', 'experimental', 'treatment', 'trial'],
 80, 60, 'active', 'unknown'),

-- TIER 3: Federal Spending
('usaspending', 'USASpending.gov', 'Federal contracts and grants', 'https://api.usaspending.gov/api/v2', 'rest', 'none',
 ARRAY['spending', 'contracts', 'grants', 'government'],
 ARRAY['contract', 'grant', 'federal', 'government', 'spending', 'tax', 'award', 'procurement', 'funding'],
 90, 60, 'active', 'unknown'),

('sam-entities', 'SAM.gov Entities', 'Federal contractor registry', 'https://api.sam.gov/entity-information/v3/entities', 'rest', 'api_key',
 ARRAY['contractors', 'business', 'government'],
 ARRAY['contractor', 'vendor', 'sam', 'cage', 'uei', 'government contractor'],
 85, 60, 'active', 'unknown'),

-- TIER 4: Environmental
('epa-echo', 'EPA ECHO', 'Environmental compliance and violations', 'https://echo.epa.gov/tools/web-services', 'rest', 'none',
 ARRAY['environmental', 'compliance', 'violations'],
 ARRAY['epa', 'pollution', 'violation', 'environmental', 'permit', 'emission', 'discharge', 'toxic'],
 85, 60, 'active', 'unknown'),

('epa-tri', 'EPA Toxics Release', 'Toxic chemical releases', 'https://enviro.epa.gov/triexplorer', 'rest', 'none',
 ARRAY['environmental', 'toxic', 'chemicals'],
 ARRAY['toxic', 'chemical', 'release', 'hazardous', 'pollution'],
 80, 30, 'active', 'unknown'),

-- TIER 5: Education
('college-scorecard', 'College Scorecard', 'College costs and outcomes', 'https://api.data.gov/ed/collegescorecard/v1/schools', 'rest', 'api_key',
 ARRAY['education', 'colleges'],
 ARRAY['college', 'university', 'school', 'tuition', 'education', 'degree', 'campus'],
 85, 60, 'active', 'unknown'),

-- TIER 6: Demographics & Economics
('census-acs', 'Census ACS', 'American Community Survey demographics', 'https://api.census.gov/data', 'rest', 'api_key',
 ARRAY['demographics', 'population', 'economic'],
 ARRAY['population', 'income', 'demographic', 'census', 'poverty', 'household'],
 85, 60, 'active', 'unknown'),

('bls-employment', 'BLS Employment', 'Employment and wage statistics', 'https://api.bls.gov/publicAPI/v2', 'rest', 'api_key',
 ARRAY['economic', 'employment'],
 ARRAY['employment', 'jobs', 'wages', 'unemployment', 'labor', 'salary'],
 80, 60, 'active', 'unknown'),

-- TIER 7: Corporate & Business
('sec-edgar', 'SEC EDGAR', 'Public company filings', 'https://data.sec.gov', 'rest', 'none',
 ARRAY['corporate', 'financial', 'securities'],
 ARRAY['sec', 'filing', '10-k', '10-q', 'stock', 'company', 'corporation', 'investor'],
 80, 60, 'active', 'unknown'),

('fdic-banks', 'FDIC Banks', 'Bank financial data', 'https://banks.data.fdic.gov/api', 'rest', 'none',
 ARRAY['financial', 'banking'],
 ARRAY['bank', 'fdic', 'branch', 'deposit', 'financial institution'],
 80, 60, 'active', 'unknown'),

('osha', 'OSHA Inspections', 'Workplace safety inspections', 'https://enforcedata.dol.gov/api', 'rest', 'none',
 ARRAY['safety', 'workplace', 'compliance'],
 ARRAY['osha', 'workplace', 'safety', 'violation', 'inspection', 'injury'],
 80, 60, 'active', 'unknown'),

-- TIER 8: Public Safety
('nhtsa-recalls', 'NHTSA Recalls', 'Vehicle safety recalls', 'https://api.nhtsa.gov/recalls', 'rest', 'none',
 ARRAY['safety', 'vehicles'],
 ARRAY['recall', 'vehicle', 'car', 'auto', 'safety', 'defect'],
 75, 60, 'active', 'unknown'),

-- TIER 9: Infrastructure
('ev-charging', 'OpenChargeMap', 'EV charging stations', 'https://api.openchargemap.io/v3/poi', 'rest', 'none',
 ARRAY['infrastructure', 'ev', 'transportation'],
 ARRAY['ev', 'charging', 'electric vehicle', 'charger', 'tesla'],
 75, 60, 'active', 'unknown')

ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  base_url = EXCLUDED.base_url,
  categories = EXCLUDED.categories,
  keywords = EXCLUDED.keywords,
  priority = EXCLUDED.priority,
  rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
  status = 'active',
  updated_at = NOW();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE public.query_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Query sources are readable by everyone (public data)
CREATE POLICY "Query sources are publicly readable" ON public.query_sources
  FOR SELECT USING (true);

-- Health checks are publicly readable
CREATE POLICY "Health checks are publicly readable" ON public.health_checks
  FOR SELECT USING (true);

-- System logs are publicly readable  
CREATE POLICY "System logs are publicly readable" ON public.system_logs
  FOR SELECT USING (true);

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role full access query_sources" ON public.query_sources
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access health_checks" ON public.health_checks
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access system_logs" ON public.system_logs
  FOR ALL USING (true) WITH CHECK (true);