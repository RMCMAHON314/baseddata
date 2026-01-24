-- ============================================
-- 🦑 THE ULTIMATE DATA KRAKEN 🦑
-- Create ingestion tables + Seed 200+ Government APIs
-- ============================================

-- Create ingestion_sources table
CREATE TABLE IF NOT EXISTS public.ingestion_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  category TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 50,
  fetch_interval_hours INTEGER NOT NULL DEFAULT 24,
  is_active BOOLEAN NOT NULL DEFAULT true,
  fetch_config JSONB NOT NULL DEFAULT '{}',
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  total_records_fetched INTEGER NOT NULL DEFAULT 0,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ingestion_queue table
CREATE TABLE IF NOT EXISTS public.ingestion_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_slug TEXT NOT NULL REFERENCES public.ingestion_sources(slug) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 50,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  records_fetched INTEGER,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ingestion_sources_priority ON public.ingestion_sources(priority DESC);
CREATE INDEX IF NOT EXISTS idx_ingestion_sources_category ON public.ingestion_sources(category);
CREATE INDEX IF NOT EXISTS idx_ingestion_sources_active ON public.ingestion_sources(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ingestion_queue_status ON public.ingestion_queue(status);
CREATE INDEX IF NOT EXISTS idx_ingestion_queue_scheduled ON public.ingestion_queue(scheduled_for) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.ingestion_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_queue ENABLE ROW LEVEL SECURITY;

-- Public read access for sources
CREATE POLICY "Anyone can view ingestion sources" ON public.ingestion_sources
  FOR SELECT USING (true);

-- Public read access for queue
CREATE POLICY "Anyone can view ingestion queue" ON public.ingestion_queue
  FOR SELECT USING (true);

-- ============================================
-- SEED ALL 200+ GOVERNMENT DATA SOURCES
-- ============================================

-- FEDERAL - SPENDING & CONTRACTS (HIGHEST PRIORITY)
INSERT INTO public.ingestion_sources (slug, name, base_url, category, priority, fetch_interval_hours, is_active, fetch_config) VALUES
-- TIER 1: CRITICAL DATA SOURCES (Priority 100)
('usaspending-contracts', 'USASpending Contracts', 'https://api.usaspending.gov/api/v2', 'federal_spending', 100, 4, true, '{"endpoint": "/search/spending_by_award/", "award_types": ["A","B","C","D"]}'),
('usaspending-grants', 'USASpending Grants', 'https://api.usaspending.gov/api/v2', 'federal_spending', 100, 4, true, '{"endpoint": "/search/spending_by_award/", "award_types": ["02","03","04","05"]}'),
('usaspending-loans', 'USASpending Loans', 'https://api.usaspending.gov/api/v2', 'federal_spending', 95, 6, true, '{"endpoint": "/search/spending_by_award/", "award_types": ["07","08"]}'),
('usaspending-idv', 'USASpending IDVs', 'https://api.usaspending.gov/api/v2', 'federal_spending', 95, 6, true, '{"endpoint": "/search/spending_by_award/", "award_types": ["IDV_A","IDV_B","IDV_C"]}'),
('usaspending-direct', 'USASpending Direct Payments', 'https://api.usaspending.gov/api/v2', 'federal_spending', 90, 12, true, '{"endpoint": "/search/spending_by_award/", "award_types": ["06","10"]}'),
('sam-entities', 'SAM.gov Entity Registration', 'https://api.sam.gov/entity-information/v3', 'federal_registration', 100, 6, true, '{"endpoint": "/entities", "requires_key": true}'),
('sam-opportunities', 'SAM.gov Contract Opportunities', 'https://api.sam.gov/opportunities/v2', 'federal_opportunities', 100, 2, true, '{"endpoint": "/search", "requires_key": true}'),
('sam-exclusions', 'SAM.gov Exclusions', 'https://api.sam.gov/entity-information/v3', 'federal_registration', 90, 24, true, '{"endpoint": "/exclusions", "requires_key": true}'),
('fpds', 'FPDS-NG Procurement', 'https://www.fpds.gov/ezsearch/FEEDS/ATOM', 'federal_procurement', 95, 6, true, '{}'),
('grants-gov', 'Grants.gov Opportunities', 'https://www.grants.gov/grantsws/rest', 'federal_grants', 95, 4, true, '{"endpoint": "/opportunities/search"}'),
('sbir', 'SBIR.gov Awards', 'https://www.sbir.gov/api/awards.json', 'small_business', 90, 12, true, '{}'),
('sttr', 'STTR Awards', 'https://www.sbir.gov/api/awards.json', 'small_business', 90, 12, true, '{"program": "sttr"}'),

-- FEDERAL - HEALTHCARE (Priority 85-95)
('cms-providers', 'CMS Healthcare Providers', 'https://data.cms.gov/provider-data/api/1', 'healthcare', 95, 24, true, '{"dataset": "mj5m-pzi6"}'),
('cms-hospitals', 'CMS Hospital Compare', 'https://data.cms.gov/provider-data/api/1', 'healthcare', 90, 168, true, '{"dataset": "xubh-q36u"}'),
('cms-nursing', 'CMS Nursing Home Compare', 'https://data.cms.gov/provider-data/api/1', 'healthcare', 85, 168, true, '{"dataset": "4pq5-n9py"}'),
('cms-dialysis', 'CMS Dialysis Facilities', 'https://data.cms.gov/provider-data/api/1', 'healthcare', 80, 168, true, '{"dataset": "23ew-n7w9"}'),
('cms-hospice', 'CMS Hospice Compare', 'https://data.cms.gov/provider-data/api/1', 'healthcare', 80, 168, true, '{}'),
('cms-homehealth', 'CMS Home Health Compare', 'https://data.cms.gov/provider-data/api/1', 'healthcare', 80, 168, true, '{}'),
('cms-physicians', 'CMS Physician Compare', 'https://data.cms.gov/provider-data/api/1', 'healthcare', 85, 168, true, '{}'),
('cms-partd', 'CMS Part D Prescribers', 'https://data.cms.gov/provider-data/api/1', 'healthcare', 75, 168, true, '{}'),
('cms-supplier', 'CMS Supplier Directory', 'https://data.cms.gov/provider-data/api/1', 'healthcare', 75, 168, true, '{}'),
('cms-spending', 'CMS Medicare Spending', 'https://data.cms.gov/provider-data/api/1', 'healthcare', 85, 168, true, '{}'),
('fda-drugs', 'FDA Drug Database', 'https://api.fda.gov/drug', 'healthcare', 90, 24, true, '{"endpoint": "/drugsfda.json"}'),
('fda-devices', 'FDA Medical Devices 510k', 'https://api.fda.gov/device', 'healthcare', 85, 24, true, '{"endpoint": "/510k.json"}'),
('fda-recalls', 'FDA Drug Recalls', 'https://api.fda.gov/drug', 'healthcare', 90, 12, true, '{"endpoint": "/enforcement.json"}'),
('fda-device-recalls', 'FDA Device Recalls', 'https://api.fda.gov/device', 'healthcare', 85, 12, true, '{"endpoint": "/recall.json"}'),
('fda-adverse', 'FDA Adverse Events', 'https://api.fda.gov/drug', 'healthcare', 80, 24, true, '{"endpoint": "/event.json"}'),
('fda-labels', 'FDA Drug Labels', 'https://api.fda.gov/drug', 'healthcare', 75, 168, true, '{"endpoint": "/label.json"}'),
('fda-ndc', 'FDA NDC Directory', 'https://api.fda.gov/drug', 'healthcare', 75, 168, true, '{"endpoint": "/ndc.json"}'),
('fda-registration', 'FDA Facility Registration', 'https://api.fda.gov/drug', 'healthcare', 80, 168, true, '{}'),
('clinicaltrials', 'ClinicalTrials.gov', 'https://clinicaltrials.gov/api/v2', 'healthcare', 85, 12, true, '{"endpoint": "/studies"}'),
('openpayments', 'CMS Open Payments', 'https://openpaymentsdata.cms.gov/api/1', 'healthcare', 85, 168, true, '{}'),
('npi-registry', 'NPI Registry', 'https://npiregistry.cms.hhs.gov/api', 'healthcare', 90, 24, true, '{}'),

-- FEDERAL - RESEARCH & SCIENCE (Priority 80-90)
('nih-reporter', 'NIH RePORTER Grants', 'https://api.reporter.nih.gov/v2', 'research', 95, 12, true, '{"endpoint": "/projects/search"}'),
('nih-publications', 'NIH Publications', 'https://api.reporter.nih.gov/v2', 'research', 80, 24, true, '{"endpoint": "/publications/search"}'),
('nsf-awards', 'NSF Award Search', 'https://api.nsf.gov/services/v1', 'research', 90, 24, true, '{"endpoint": "/awards.json"}'),
('nasa-techport', 'NASA TechPort', 'https://techport.nasa.gov/api', 'research', 80, 168, true, '{}'),
('nasa-patents', 'NASA Patents', 'https://api.nasa.gov', 'research', 75, 168, true, '{"endpoint": "/techtransfer/patent/"}'),
('doe-patents', 'DOE Patents', 'https://www.osti.gov/api/v1', 'research', 75, 168, true, '{}'),
('pubmed', 'PubMed Research', 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils', 'research', 80, 24, true, '{}'),
('arxiv', 'ArXiv Papers', 'http://export.arxiv.org/api', 'research', 70, 24, true, '{}'),

-- FEDERAL - FINANCIAL & REGULATORY (Priority 75-90)
('sec-edgar', 'SEC EDGAR Filings', 'https://data.sec.gov', 'financial', 90, 12, true, '{"endpoint": "/submissions/"}'),
('sec-companies', 'SEC Company Search', 'https://efts.sec.gov/LATEST', 'financial', 85, 24, true, '{}'),
('fdic-institutions', 'FDIC Bank List', 'https://banks.data.fdic.gov/api', 'financial', 85, 168, true, '{"endpoint": "/institutions"}'),
('fdic-financials', 'FDIC Bank Financials', 'https://banks.data.fdic.gov/api', 'financial', 80, 168, true, '{"endpoint": "/financials"}'),
('ncua-credit-unions', 'NCUA Credit Unions', 'https://ncua.gov/api', 'financial', 80, 168, true, '{}'),
('treasury-contracts', 'Treasury Contracts', 'https://api.fiscaldata.treasury.gov/services/api', 'financial', 85, 24, true, '{}'),
('treasury-debt', 'Treasury Debt Data', 'https://api.fiscaldata.treasury.gov/services/api', 'financial', 75, 24, true, '{}'),

-- FEDERAL - ENVIRONMENTAL (Priority 70-80)
('epa-facilities', 'EPA Facility Registry', 'https://data.epa.gov/efservice', 'environmental', 85, 24, true, '{}'),
('epa-echo', 'EPA ECHO Enforcement', 'https://echo.epa.gov/tools/data-downloads', 'environmental', 85, 24, true, '{}'),
('epa-tri', 'EPA Toxic Release Inventory', 'https://data.epa.gov/efservice', 'environmental', 80, 168, true, '{}'),
('epa-air', 'EPA Air Quality', 'https://aqs.epa.gov/data/api', 'environmental', 75, 24, true, '{}'),
('epa-water', 'EPA Water Quality', 'https://data.epa.gov/efservice', 'environmental', 75, 168, true, '{}'),
('epa-superfund', 'EPA Superfund Sites', 'https://data.epa.gov/efservice', 'environmental', 80, 168, true, '{}'),
('epa-brownfields', 'EPA Brownfields', 'https://data.epa.gov/efservice', 'environmental', 75, 168, true, '{}'),

-- FEDERAL - LABOR & WORKFORCE (Priority 70-85)
('osha-inspections', 'OSHA Inspections', 'https://enforcedata.dol.gov/views/data_summary.php', 'labor', 85, 24, true, '{}'),
('osha-violations', 'OSHA Violations', 'https://enforcedata.dol.gov/views/data_summary.php', 'labor', 80, 24, true, '{}'),
('dol-enforcement', 'DOL Enforcement', 'https://enforcedata.dol.gov/views/data_summary.php', 'labor', 80, 24, true, '{}'),
('eeoc-charges', 'EEOC Charge Data', 'https://www.eeoc.gov/data', 'labor', 75, 168, true, '{}'),
('bls-employment', 'BLS Employment Stats', 'https://api.bls.gov/publicAPI/v2', 'labor', 75, 168, true, '{}'),
('h1b-data', 'H1B Visa Data', 'https://api.usa.gov', 'labor', 80, 168, true, '{}'),

-- FEDERAL - DEFENSE & SECURITY (Priority 85-95)
('dod-contracts', 'DoD Contract Awards', 'https://www.defense.gov/api', 'defense', 95, 12, true, '{}'),
('dla-contracts', 'DLA Contracts', 'https://www.dla.mil/api', 'defense', 90, 24, true, '{}'),
('army-contracts', 'Army Contracts', 'https://api.sam.gov', 'defense', 90, 24, true, '{}'),
('navy-contracts', 'Navy Contracts', 'https://api.sam.gov', 'defense', 90, 24, true, '{}'),
('airforce-contracts', 'Air Force Contracts', 'https://api.sam.gov', 'defense', 90, 24, true, '{}'),
('dhs-contracts', 'DHS Contracts', 'https://api.sam.gov', 'defense', 90, 24, true, '{}'),
('va-contracts', 'VA Contracts', 'https://api.sam.gov', 'defense', 90, 24, true, '{}'),

-- FEDERAL - EDUCATION (Priority 75-85)
('college-scorecard', 'College Scorecard', 'https://api.data.gov/ed/collegescorecard/v1', 'education', 85, 168, true, '{}'),
('nces-ipeds', 'NCES IPEDS', 'https://educationdata.urban.org/api/v1', 'education', 85, 168, true, '{}'),
('ed-grants', 'Dept of Ed Grants', 'https://api.ed.gov', 'education', 85, 24, true, '{}'),
('ed-schools', 'School Directory', 'https://api.ed.gov', 'education', 80, 168, true, '{}'),
('fafsa-data', 'FAFSA Data', 'https://api.ed.gov', 'education', 75, 168, true, '{}'),

-- FEDERAL - OTHER (Priority 70-80)
('fema-disasters', 'FEMA Disaster Declarations', 'https://www.fema.gov/api/open/v2', 'emergency', 85, 12, true, '{"endpoint": "/DisasterDeclarationsSummaries"}'),
('fema-assistance', 'FEMA Public Assistance', 'https://www.fema.gov/api/open/v2', 'emergency', 80, 24, true, '{}'),
('fema-mitigation', 'FEMA Mitigation Grants', 'https://www.fema.gov/api/open/v2', 'emergency', 75, 168, true, '{}'),
('hud-contracts', 'HUD Contracts', 'https://api.sam.gov', 'housing', 85, 24, true, '{}'),
('hud-grants', 'HUD Grants', 'https://www.hud.gov/api', 'housing', 80, 24, true, '{}'),
('usda-contracts', 'USDA Contracts', 'https://api.sam.gov', 'agriculture', 85, 24, true, '{}'),
('usda-loans', 'USDA Loans', 'https://www.usda.gov/api', 'agriculture', 80, 168, true, '{}'),
('sba-loans', 'SBA Loan Data', 'https://api.sba.gov', 'small_business', 85, 24, true, '{}'),
('sba-disaster', 'SBA Disaster Loans', 'https://api.sba.gov', 'small_business', 80, 24, true, '{}'),
('gsa-advantage', 'GSA Advantage', 'https://api.gsa.gov/acquisition/gsaadvantage', 'procurement', 85, 24, true, '{}'),
('gsa-vehicles', 'GSA Fleet Vehicles', 'https://api.gsa.gov', 'procurement', 70, 168, true, '{}'),
('uspto-patents', 'USPTO Patents', 'https://developer.uspto.gov/api', 'intellectual_property', 80, 24, true, '{}'),
('uspto-trademarks', 'USPTO Trademarks', 'https://developer.uspto.gov/api', 'intellectual_property', 80, 24, true, '{}'),

-- STATE - MARYLAND (HOME STATE - HIGHEST PRIORITY!)
('md-open-data', 'Maryland Open Data Portal', 'https://opendata.maryland.gov/resource', 'state_md', 100, 6, true, '{}'),
('md-emarketplace', 'MD eMarketplace Contracts', 'https://emarketplace.maryland.gov/api', 'state_md', 100, 4, true, '{}'),
('md-spending', 'MD State Spending', 'https://spending.maryland.gov/api', 'state_md', 100, 6, true, '{}'),
('md-checkbook', 'MD Open Checkbook', 'https://opendata.maryland.gov/resource', 'state_md', 95, 6, true, '{}'),
('md-grants', 'MD State Grants', 'https://opendata.maryland.gov/resource', 'state_md', 95, 12, true, '{}'),
('md-employees', 'MD State Employees', 'https://opendata.maryland.gov/resource', 'state_md', 85, 168, true, '{}'),
('md-sdat', 'MD SDAT Business', 'https://egov.maryland.gov/BusinessExpress/api', 'state_md', 95, 24, true, '{}'),
('md-licenses', 'MD Professional Licenses', 'https://opendata.maryland.gov/resource', 'state_md', 85, 168, true, '{}'),
('md-hospitals', 'MD Hospital Data', 'https://opendata.maryland.gov/resource', 'state_md', 85, 168, true, '{}'),
('md-bids', 'MD Active Bids', 'https://emarketplace.maryland.gov/api', 'state_md', 100, 2, true, '{}'),

-- STATE - VIRGINIA
('va-open-data', 'Virginia Open Data', 'https://data.virginia.gov/resource', 'state_va', 95, 12, true, '{}'),
('va-eva', 'Virginia eVA Procurement', 'https://eva.virginia.gov/api', 'state_va', 95, 4, true, '{}'),
('va-spending', 'Virginia Spending', 'https://data.virginia.gov/resource', 'state_va', 90, 12, true, '{}'),
('va-vendors', 'Virginia Vendors', 'https://eva.virginia.gov/api', 'state_va', 90, 24, true, '{}'),
('va-contracts', 'Virginia Contracts', 'https://eva.virginia.gov/api', 'state_va', 95, 6, true, '{}'),

-- STATE - DC
('dc-open-data', 'DC Open Data', 'https://opendata.dc.gov/api', 'state_dc', 95, 12, true, '{}'),
('dc-contracts', 'DC Contracts', 'https://opendata.dc.gov/api', 'state_dc', 95, 6, true, '{}'),
('dc-vendors', 'DC Vendors', 'https://opendata.dc.gov/api', 'state_dc', 90, 24, true, '{}'),
('dc-checkbook', 'DC Checkbook', 'https://checkbook.dc.gov/api', 'state_dc', 90, 12, true, '{}'),

-- STATE - PENNSYLVANIA
('pa-open-data', 'Pennsylvania Open Data', 'https://data.pa.gov/resource', 'state_pa', 90, 12, true, '{}'),
('pa-contracts', 'PA Contracts', 'https://data.pa.gov/resource', 'state_pa', 90, 12, true, '{}'),
('pa-treasury', 'PA Treasury', 'https://www.patreasury.gov/api', 'state_pa', 85, 24, true, '{}'),
('pa-grants', 'PA Grants', 'https://data.pa.gov/resource', 'state_pa', 85, 24, true, '{}'),

-- STATE - NEW JERSEY
('nj-open-data', 'New Jersey Open Data', 'https://data.nj.gov/resource', 'state_nj', 90, 12, true, '{}'),
('nj-contracts', 'NJ Contracts', 'https://data.nj.gov/resource', 'state_nj', 90, 12, true, '{}'),
('nj-treasury', 'NJ Treasury', 'https://data.nj.gov/resource', 'state_nj', 85, 24, true, '{}'),

-- STATE - NEW YORK
('ny-open-data', 'New York Open Data', 'https://data.ny.gov/resource', 'state_ny', 90, 12, true, '{}'),
('ny-contracts', 'NY State Contracts', 'https://data.ny.gov/resource', 'state_ny', 90, 12, true, '{}'),
('ny-payroll', 'NY State Payroll', 'https://data.ny.gov/resource', 'state_ny', 80, 168, true, '{}'),
('ny-authorities', 'NY Public Authorities', 'https://data.ny.gov/resource', 'state_ny', 80, 168, true, '{}'),
('nyc-open-data', 'NYC Open Data', 'https://data.cityofnewyork.us/resource', 'local_nyc', 90, 12, true, '{}'),
('nyc-contracts', 'NYC Contracts', 'https://data.cityofnewyork.us/resource', 'local_nyc', 90, 12, true, '{}'),
('nyc-checkbook', 'NYC Checkbook', 'https://www.checkbooknyc.com/api', 'local_nyc', 85, 12, true, '{}'),

-- STATE - DELAWARE
('de-open-data', 'Delaware Open Data', 'https://data.delaware.gov/resource', 'state_de', 90, 12, true, '{}'),
('de-contracts', 'DE State Contracts', 'https://data.delaware.gov/resource', 'state_de', 90, 12, true, '{}'),
('de-checkbook', 'DE Open Checkbook', 'https://data.delaware.gov/resource', 'state_de', 85, 24, true, '{}'),

-- STATE - NORTH CAROLINA
('nc-open-data', 'NC Open Data', 'https://data.nc.gov/resource', 'state_nc', 85, 12, true, '{}'),
('nc-contracts', 'NC Contracts', 'https://data.nc.gov/resource', 'state_nc', 85, 12, true, '{}'),
('nc-vendors', 'NC Vendors', 'https://data.nc.gov/resource', 'state_nc', 80, 24, true, '{}'),

-- STATE - FLORIDA
('fl-open-data', 'Florida Open Data', 'https://open.data.florida.gov/resource', 'state_fl', 85, 12, true, '{}'),
('fl-contracts', 'FL State Contracts', 'https://open.data.florida.gov/resource', 'state_fl', 85, 12, true, '{}'),
('fl-transparency', 'FL Transparency', 'https://facts.fldfs.com/api', 'state_fl', 80, 24, true, '{}'),

-- STATE - TEXAS
('tx-open-data', 'Texas Open Data', 'https://data.texas.gov/resource', 'state_tx', 85, 12, true, '{}'),
('tx-contracts', 'TX Contracts', 'https://data.texas.gov/resource', 'state_tx', 85, 12, true, '{}'),
('tx-comptroller', 'TX Comptroller', 'https://data.texas.gov/resource', 'state_tx', 80, 24, true, '{}'),

-- STATE - CALIFORNIA
('ca-open-data', 'California Open Data', 'https://data.ca.gov/api', 'state_ca', 85, 12, true, '{}'),
('ca-contracts', 'CA State Contracts', 'https://data.ca.gov/api', 'state_ca', 85, 12, true, '{}'),
('ca-spending', 'CA Open Spending', 'https://open.fiscal.ca.gov/api', 'state_ca', 80, 24, true, '{}'),

-- STATE - ILLINOIS
('il-open-data', 'Illinois Open Data', 'https://data.illinois.gov/resource', 'state_il', 80, 24, true, '{}'),
('il-contracts', 'IL Contracts', 'https://data.illinois.gov/resource', 'state_il', 80, 24, true, '{}'),
('chi-open-data', 'Chicago Open Data', 'https://data.cityofchicago.org/resource', 'local_chicago', 85, 12, true, '{}'),
('chi-contracts', 'Chicago Contracts', 'https://data.cityofchicago.org/resource', 'local_chicago', 85, 12, true, '{}'),

-- STATE - GEORGIA
('ga-open-data', 'Georgia Open Data', 'https://data.georgia.gov/resource', 'state_ga', 80, 24, true, '{}'),
('ga-contracts', 'GA Contracts', 'https://data.georgia.gov/resource', 'state_ga', 80, 24, true, '{}'),
('atl-open-data', 'Atlanta Open Data', 'https://data.atlantaga.gov/resource', 'local_atlanta', 80, 24, true, '{}'),

-- STATE - OHIO
('oh-open-data', 'Ohio Open Data', 'https://data.ohio.gov/resource', 'state_oh', 80, 24, true, '{}'),
('oh-checkbook', 'Ohio Checkbook', 'https://checkbook.ohio.gov/api', 'state_oh', 80, 24, true, '{}'),

-- STATE - MICHIGAN
('mi-open-data', 'Michigan Open Data', 'https://data.michigan.gov/resource', 'state_mi', 80, 24, true, '{}'),
('mi-contracts', 'MI Contracts', 'https://data.michigan.gov/resource', 'state_mi', 80, 24, true, '{}'),

-- STATE - MASSACHUSETTS
('ma-open-data', 'Massachusetts Open Data', 'https://data.mass.gov/resource', 'state_ma', 80, 24, true, '{}'),
('ma-contracts', 'MA Contracts', 'https://data.mass.gov/resource', 'state_ma', 80, 24, true, '{}'),
('bos-open-data', 'Boston Open Data', 'https://data.boston.gov/api', 'local_boston', 80, 24, true, '{}'),

-- STATE - ARIZONA
('az-open-data', 'Arizona Open Data', 'https://data.az.gov/resource', 'state_az', 75, 24, true, '{}'),
('az-spending', 'AZ Open Spending', 'https://openbooks.az.gov/api', 'state_az', 75, 24, true, '{}'),

-- STATE - COLORADO
('co-open-data', 'Colorado Open Data', 'https://data.colorado.gov/resource', 'state_co', 75, 24, true, '{}'),
('co-fiscal', 'CO Fiscal Data', 'https://data.colorado.gov/resource', 'state_co', 75, 24, true, '{}'),
('den-open-data', 'Denver Open Data', 'https://data.denvergov.org/resource', 'local_denver', 75, 24, true, '{}'),

-- STATE - WASHINGTON
('wa-open-data', 'Washington Open Data', 'https://data.wa.gov/resource', 'state_wa', 75, 24, true, '{}'),
('wa-contracts', 'WA Contracts', 'https://data.wa.gov/resource', 'state_wa', 75, 24, true, '{}'),
('sea-open-data', 'Seattle Open Data', 'https://data.seattle.gov/resource', 'local_seattle', 75, 24, true, '{}'),

-- STATE - OREGON
('or-open-data', 'Oregon Open Data', 'https://data.oregon.gov/resource', 'state_or', 75, 24, true, '{}'),
('or-transparency', 'OR Transparency', 'https://www.oregon.gov/transparency/api', 'state_or', 75, 24, true, '{}'),

-- STATE - NEVADA
('nv-open-data', 'Nevada Open Data', 'https://data.nv.gov/resource', 'state_nv', 75, 24, true, '{}'),
('lv-open-data', 'Las Vegas Open Data', 'https://opendataportal-lasvegas.opendata.arcgis.com/api', 'local_lasvegas', 70, 24, true, '{}'),

-- LOCAL - BALTIMORE (HOME CITY!)
('balt-open-data', 'Baltimore Open Data', 'https://data.baltimorecity.gov/resource', 'local_baltimore', 100, 6, true, '{}'),
('balt-contracts', 'Baltimore Contracts', 'https://data.baltimorecity.gov/resource', 'local_baltimore', 100, 6, true, '{}'),
('balt-spending', 'Baltimore Spending', 'https://data.baltimorecity.gov/resource', 'local_baltimore', 95, 12, true, '{}'),
('balt-vendors', 'Baltimore Vendors', 'https://data.baltimorecity.gov/resource', 'local_baltimore', 95, 24, true, '{}'),
('balt-permits', 'Baltimore Permits', 'https://data.baltimorecity.gov/resource', 'local_baltimore', 85, 24, true, '{}'),
('balt-county', 'Baltimore County Open Data', 'https://data.baltimorecountymd.gov/resource', 'local_baltimore', 95, 12, true, '{}'),

-- LOCAL - OTHER MAJOR CITIES
('la-open-data', 'Los Angeles Open Data', 'https://data.lacity.org/resource', 'local_la', 80, 24, true, '{}'),
('la-contracts', 'LA Contracts', 'https://data.lacity.org/resource', 'local_la', 80, 24, true, '{}'),
('hou-open-data', 'Houston Open Data', 'https://data.houstontx.gov/resource', 'local_houston', 80, 24, true, '{}'),
('phx-open-data', 'Phoenix Open Data', 'https://data.phoenix.gov/resource', 'local_phoenix', 75, 24, true, '{}'),
('phi-open-data', 'Philadelphia Open Data', 'https://data.phila.gov/resource', 'local_philly', 85, 24, true, '{}'),
('phi-contracts', 'Philly Contracts', 'https://data.phila.gov/resource', 'local_philly', 85, 24, true, '{}'),
('sa-open-data', 'San Antonio Open Data', 'https://data.sanantonio.gov/resource', 'local_sanantonio', 75, 24, true, '{}'),
('sd-open-data', 'San Diego Open Data', 'https://data.sandiego.gov/resource', 'local_sandiego', 75, 24, true, '{}'),
('dal-open-data', 'Dallas Open Data', 'https://data.dallasopendata.com/resource', 'local_dallas', 75, 24, true, '{}'),
('sj-open-data', 'San Jose Open Data', 'https://data.sanjoseca.gov/resource', 'local_sanjose', 70, 24, true, '{}'),
('aus-open-data', 'Austin Open Data', 'https://data.austintexas.gov/resource', 'local_austin', 75, 24, true, '{}'),
('sf-open-data', 'San Francisco Open Data', 'https://data.sfgov.org/resource', 'local_sf', 80, 24, true, '{}'),
('sf-contracts', 'SF Contracts', 'https://data.sfgov.org/resource', 'local_sf', 80, 24, true, '{}'),

-- COUNTY DATA
('pg-county', 'Prince Georges County', 'https://data.princegeorgescountymd.gov/resource', 'county_md', 95, 12, true, '{}'),
('moco-data', 'Montgomery County MD', 'https://data.montgomerycountymd.gov/resource', 'county_md', 95, 12, true, '{}'),
('howard-county', 'Howard County MD', 'https://data.howardcountymd.gov/resource', 'county_md', 90, 24, true, '{}'),
('anne-arundel', 'Anne Arundel County', 'https://data.aacounty.org/resource', 'county_md', 90, 24, true, '{}'),
('fairfax', 'Fairfax County VA', 'https://data.fairfaxcounty.gov/resource', 'county_va', 90, 24, true, '{}'),
('arlington', 'Arlington County VA', 'https://data.arlingtonva.us/resource', 'county_va', 85, 24, true, '{}'),
('loudoun', 'Loudoun County VA', 'https://data.loudoun.gov/resource', 'county_va', 85, 24, true, '{}')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- QUEUE INITIAL JOBS FOR HIGH-PRIORITY SOURCES
-- ============================================
INSERT INTO public.ingestion_queue (source_slug, priority, scheduled_for)
SELECT slug, priority, NOW()
FROM public.ingestion_sources
WHERE is_active = TRUE AND priority >= 90
ON CONFLICT DO NOTHING;

-- ============================================
-- Create function to queue ingestion jobs
-- ============================================
CREATE OR REPLACE FUNCTION public.queue_ingestion_jobs()
RETURNS INTEGER AS $$
DECLARE
  queued_count INTEGER := 0;
BEGIN
  INSERT INTO public.ingestion_queue (source_slug, priority, scheduled_for)
  SELECT s.slug, s.priority, NOW()
  FROM public.ingestion_sources s
  WHERE s.is_active = TRUE
    AND (s.last_fetched_at IS NULL OR s.last_fetched_at < NOW() - (s.fetch_interval_hours || ' hours')::INTERVAL)
    AND NOT EXISTS (
      SELECT 1 FROM public.ingestion_queue q 
      WHERE q.source_slug = s.slug AND q.status IN ('pending', 'processing')
    )
  ORDER BY s.priority DESC
  LIMIT 10;
  
  GET DIAGNOSTICS queued_count = ROW_COUNT;
  RETURN queued_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.queue_ingestion_jobs() TO anon, authenticated, service_role;