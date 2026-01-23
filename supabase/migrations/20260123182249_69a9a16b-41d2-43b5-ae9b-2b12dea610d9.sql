-- THE DATAVERSE: API SOURCE REGISTRY
-- Drop and recreate for clean slate
DROP TABLE IF EXISTS api_sources CASCADE;

CREATE TABLE api_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_url VARCHAR(500) NOT NULL,
  api_type VARCHAR(50) DEFAULT 'rest',
  auth_type VARCHAR(50) DEFAULT 'none',
  categories TEXT[] NOT NULL,
  keywords TEXT[],
  geographic_coverage VARCHAR(50) DEFAULT 'usa',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE api_sources ENABLE ROW LEVEL SECURITY;

-- Public read policy (reference data)
CREATE POLICY "API sources are publicly readable" 
  ON api_sources 
  FOR SELECT 
  USING (true);

-- Create index for keyword matching
CREATE INDEX idx_api_sources_keywords ON api_sources USING GIN (keywords);
CREATE INDEX idx_api_sources_categories ON api_sources USING GIN (categories);
CREATE INDEX idx_api_sources_status ON api_sources (status);

-- SEED ALL 50+ SOURCES
INSERT INTO api_sources (slug, name, base_url, categories, keywords) VALUES

-- FEDERAL SPENDING
('usaspending', 'USASpending.gov', 'https://api.usaspending.gov/api/v2', 
 ARRAY['spending', 'contracts', 'grants'], 
 ARRAY['contract', 'grant', 'federal', 'tax funded', 'government spending', 'award', 'procurement']),

('sam-entities', 'SAM.gov Entities', 'https://api.sam.gov/entity-information/v3/entities',
 ARRAY['contractors', 'business'],
 ARRAY['contractor', 'vendor', 'sam', 'cage', 'uei', 'registered']),

('sam-opportunities', 'SAM.gov Opportunities', 'https://api.sam.gov/opportunities/v2/search',
 ARRAY['opportunities', 'rfp'],
 ARRAY['opportunity', 'rfp', 'solicitation', 'bid']),

('grants-gov', 'Grants.gov', 'https://www.grants.gov/grantsws/rest/opportunities/search',
 ARRAY['grants', 'funding'],
 ARRAY['grant opportunity', 'funding opportunity', 'federal grant']),

('sbir', 'SBIR/STTR Awards', 'https://www.sbir.gov/api/awards.json',
 ARRAY['research', 'small business', 'innovation'],
 ARRAY['sbir', 'sttr', 'small business', 'innovation', 'research']),

-- HEALTHCARE
('cms-open-payments', 'CMS Open Payments', 'https://openpaymentsdata.cms.gov/api/1/datastore/query',
 ARRAY['healthcare', 'pharmaceutical'],
 ARRAY['doctor', 'physician', 'drug', 'pharma', 'prescribe', 'payment', 'sunshine act']),

('npi-registry', 'NPI Registry', 'https://npiregistry.cms.hhs.gov/api',
 ARRAY['healthcare', 'providers'],
 ARRAY['npi', 'provider', 'doctor', 'nurse', 'healthcare provider', 'physician']),

('hospital-compare', 'Hospital Compare', 'https://data.cms.gov/provider-data/api/1/datastore/query',
 ARRAY['healthcare', 'hospitals'],
 ARRAY['hospital', 'quality', 'mortality', 'readmission', 'rating']),

('medicare-providers', 'Medicare Provider Data', 'https://data.cms.gov/provider-data/api/1/datastore/query',
 ARRAY['healthcare', 'medicare'],
 ARRAY['medicare', 'provider', 'payment', 'utilization']),

('fda-drugs', 'FDA Drug Database', 'https://api.fda.gov/drug',
 ARRAY['healthcare', 'drugs'],
 ARRAY['drug', 'medication', 'fda', 'approved', 'label']),

('fda-recalls', 'FDA Recalls', 'https://api.fda.gov/drug/enforcement.json',
 ARRAY['healthcare', 'safety'],
 ARRAY['recall', 'fda recall', 'drug recall', 'food recall']),

('fda-adverse', 'FDA Adverse Events', 'https://api.fda.gov/drug/event.json',
 ARRAY['healthcare', 'safety'],
 ARRAY['adverse event', 'side effect', 'drug reaction']),

('clinical-trials', 'ClinicalTrials.gov', 'https://clinicaltrials.gov/api/v2/studies',
 ARRAY['healthcare', 'research'],
 ARRAY['clinical trial', 'study', 'research', 'experimental']),

('nursing-homes', 'Nursing Home Compare', 'https://data.cms.gov/provider-data/api/1/datastore/query',
 ARRAY['healthcare', 'nursing'],
 ARRAY['nursing home', 'long term care', 'elder care']),

-- EDUCATION
('college-scorecard', 'College Scorecard', 'https://api.data.gov/ed/collegescorecard/v1/schools',
 ARRAY['education', 'colleges'],
 ARRAY['college', 'university', 'tuition', 'graduation rate', 'earnings']),

('nces-schools', 'NCES School Data', 'https://educationdata.urban.org/api/v1',
 ARRAY['education', 'k12'],
 ARRAY['school', 'k-12', 'elementary', 'high school', 'district']),

-- ENVIRONMENTAL
('epa-echo', 'EPA ECHO', 'https://echo.epa.gov/tools/web-services/facility-search',
 ARRAY['environmental', 'compliance'],
 ARRAY['pollution', 'violation', 'permit', 'environmental', 'discharge', 'epa']),

('epa-tri', 'EPA Toxics Release', 'https://enviro.epa.gov/triexplorer',
 ARRAY['environmental', 'toxic'],
 ARRAY['toxic', 'chemical', 'release', 'hazardous', 'tri']),

('epa-air', 'EPA Air Quality', 'https://aqs.epa.gov/data/api',
 ARRAY['environmental', 'air'],
 ARRAY['air quality', 'aqi', 'pollution', 'smog', 'ozone']),

('epa-superfund', 'EPA Superfund', 'https://enviro.epa.gov/enviro/efservice',
 ARRAY['environmental', 'contamination'],
 ARRAY['superfund', 'contaminated', 'cleanup', 'hazardous waste']),

('usgs-water', 'USGS Water Data', 'https://waterservices.usgs.gov/nwis',
 ARRAY['environmental', 'water'],
 ARRAY['water quality', 'stream', 'groundwater', 'river']),

('usgs-earthquake', 'USGS Earthquakes', 'https://earthquake.usgs.gov/fdsnws/event/1',
 ARRAY['environmental', 'hazards'],
 ARRAY['earthquake', 'seismic', 'quake']),

('noaa-weather', 'NOAA Weather', 'https://www.ncdc.noaa.gov/cdo-web/api/v2',
 ARRAY['environmental', 'weather'],
 ARRAY['weather', 'climate', 'temperature', 'precipitation', 'storm']),

('fema-flood', 'FEMA Flood Maps', 'https://hazards.fema.gov/gis/nfhl/rest/services',
 ARRAY['environmental', 'hazards'],
 ARRAY['flood', 'flood zone', 'fema', 'floodplain']),

('wildfire-risk', 'USFS Wildfire Risk', 'https://apps.fs.usda.gov/arcx/rest/services',
 ARRAY['environmental', 'hazards'],
 ARRAY['wildfire', 'fire risk', 'burn']),

-- CORPORATE
('sec-edgar', 'SEC EDGAR', 'https://data.sec.gov',
 ARRAY['corporate', 'financial'],
 ARRAY['sec', 'filing', '10-k', '10-q', 'annual report', 'stock', 'public company']),

('opencorporates', 'OpenCorporates', 'https://api.opencorporates.com/v0.4',
 ARRAY['corporate', 'business'],
 ARRAY['company', 'corporation', 'business', 'incorporation']),

('fdic-banks', 'FDIC Banks', 'https://banks.data.fdic.gov/api',
 ARRAY['financial', 'banking'],
 ARRAY['bank', 'fdic', 'branch', 'deposit']),

('nonprofits', 'IRS Exempt Organizations', 'https://www.irs.gov/charities-non-profits',
 ARRAY['nonprofit', 'charity'],
 ARRAY['nonprofit', '501c3', 'charity', 'tax exempt']),

('propublica-nonprofits', 'ProPublica Nonprofits', 'https://projects.propublica.org/nonprofits/api/v2',
 ARRAY['nonprofit'],
 ARRAY['nonprofit', '990', 'charity', 'foundation']),

('osha', 'OSHA Inspections', 'https://enforcedata.dol.gov/api',
 ARRAY['safety', 'workplace'],
 ARRAY['osha', 'workplace', 'safety', 'violation', 'inspection']),

('patents', 'USPTO Patents', 'https://developer.uspto.gov/api-catalog',
 ARRAY['intellectual property'],
 ARRAY['patent', 'trademark', 'invention', 'ip']),

-- PUBLIC SAFETY
('fbi-crime', 'FBI Crime Data', 'https://api.usa.gov/crime/fbi/cde',
 ARRAY['safety', 'crime'],
 ARRAY['crime', 'criminal', 'murder', 'robbery', 'assault', 'theft']),

('nhtsa-complaints', 'NHTSA Complaints', 'https://api.nhtsa.gov/complaints',
 ARRAY['safety', 'vehicles'],
 ARRAY['vehicle', 'car', 'complaint', 'defect']),

('nhtsa-recalls', 'NHTSA Recalls', 'https://api.nhtsa.gov/recalls',
 ARRAY['safety', 'vehicles'],
 ARRAY['recall', 'vehicle recall', 'car recall']),

('faa-incidents', 'FAA Incidents', 'https://data.transportation.gov/api',
 ARRAY['safety', 'aviation'],
 ARRAY['aviation', 'flight', 'airplane', 'incident', 'accident']),

-- INFRASTRUCTURE
('hifld', 'HIFLD Infrastructure', 'https://hifld-geoplatform.opendata.arcgis.com/api',
 ARRAY['infrastructure'],
 ARRAY['hospital', 'school', 'fire station', 'police', 'infrastructure']),

('bridges', 'National Bridge Inventory', 'https://geo.dot.gov/server/rest/services',
 ARRAY['infrastructure', 'transportation'],
 ARRAY['bridge', 'infrastructure', 'condition']),

('faa-airports', 'FAA Airports', 'https://services.arcgis.com/P3ePLMYs2RVChkJx',
 ARRAY['infrastructure', 'aviation'],
 ARRAY['airport', 'aviation', 'runway']),

('fcc-broadband', 'FCC Broadband Map', 'https://broadbandmap.fcc.gov/api',
 ARRAY['infrastructure', 'telecom'],
 ARRAY['broadband', 'internet', 'connectivity', 'isp']),

('eia-power', 'EIA Power Plants', 'https://api.eia.gov/v2',
 ARRAY['infrastructure', 'energy'],
 ARRAY['power plant', 'electricity', 'energy', 'generator']),

('ev-charging', 'OpenChargeMap', 'https://api.openchargemap.io/v3/poi',
 ARRAY['infrastructure', 'ev'],
 ARRAY['ev', 'charging', 'electric vehicle', 'charger']),

('transit', 'National Transit Database', 'https://data.transportation.gov/api',
 ARRAY['infrastructure', 'transit'],
 ARRAY['transit', 'bus', 'subway', 'public transportation']),

-- ECONOMIC & DEMOGRAPHICS
('census-acs', 'Census ACS', 'https://api.census.gov/data/2022/acs/acs5',
 ARRAY['demographics', 'economic'],
 ARRAY['population', 'income', 'poverty', 'demographic', 'census', 'household']),

('census-business', 'Census Business Patterns', 'https://api.census.gov/data/2021/cbp',
 ARRAY['economic', 'business'],
 ARRAY['business', 'establishment', 'employment', 'industry']),

('bls-employment', 'BLS Employment', 'https://api.bls.gov/publicAPI/v2',
 ARRAY['economic', 'employment'],
 ARRAY['employment', 'jobs', 'wages', 'unemployment', 'labor']),

('fred', 'FRED Economic Data', 'https://api.stlouisfed.org/fred',
 ARRAY['economic'],
 ARRAY['gdp', 'inflation', 'interest rate', 'economic indicator']),

('bea-gdp', 'BEA GDP', 'https://apps.bea.gov/api',
 ARRAY['economic'],
 ARRAY['gdp', 'economic output', 'regional economy']),

('hud-fmr', 'HUD Fair Market Rent', 'https://www.huduser.gov/hudapi/public',
 ARRAY['housing', 'economic'],
 ARRAY['rent', 'fair market rent', 'housing cost']),

('hud-income', 'HUD Income Limits', 'https://www.huduser.gov/hudapi/public',
 ARRAY['housing', 'economic'],
 ARRAY['income limit', 'ami', 'affordable']),

('usda-snap', 'USDA SNAP Retailers', 'https://api.ams.usda.gov/services/v1.2/snap',
 ARRAY['food', 'assistance'],
 ARRAY['snap', 'food stamps', 'ebt']),

-- POLITICAL
('openfec', 'OpenFEC', 'https://api.open.fec.gov/v1',
 ARRAY['political', 'campaign'],
 ARRAY['campaign', 'donation', 'political', 'pac', 'election']),

('congress', 'Congress.gov', 'https://api.congress.gov/v3',
 ARRAY['political', 'legislation'],
 ARRAY['congress', 'bill', 'legislation', 'senator', 'representative']),

('propublica-congress', 'ProPublica Congress', 'https://api.propublica.org/congress/v1',
 ARRAY['political'],
 ARRAY['congress', 'vote', 'bill', 'member']),

('regulations', 'Regulations.gov', 'https://api.regulations.gov/v4',
 ARRAY['political', 'regulatory'],
 ARRAY['regulation', 'rule', 'comment', 'federal register']),

-- GEOSPATIAL
('openstreetmap', 'OpenStreetMap', 'https://overpass-api.de/api/interpreter',
 ARRAY['geospatial', 'poi'],
 ARRAY['location', 'place', 'map', 'near', 'where']),

('census-geocoder', 'Census Geocoder', 'https://geocoding.geo.census.gov/geocoder',
 ARRAY['geospatial'],
 ARRAY['geocode', 'address', 'coordinates']),

-- RESEARCH
('pubmed', 'PubMed', 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
 ARRAY['research', 'medical'],
 ARRAY['research', 'study', 'paper', 'medical research', 'pubmed']),

('nsf-awards', 'NSF Awards', 'https://api.nsf.gov/services/v1/awards.json',
 ARRAY['research', 'funding'],
 ARRAY['nsf', 'research grant', 'science funding']),

('nih-reporter', 'NIH Reporter', 'https://api.reporter.nih.gov/v2',
 ARRAY['research', 'medical'],
 ARRAY['nih', 'medical research', 'health research']),

-- INTERNATIONAL
('world-bank', 'World Bank', 'https://api.worldbank.org/v2',
 ARRAY['international', 'economic'],
 ARRAY['world bank', 'development', 'global', 'country']),

('un-data', 'UN Data', 'https://data.un.org/ws/rest',
 ARRAY['international'],
 ARRAY['united nations', 'global', 'international'])

ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  categories = EXCLUDED.categories,
  keywords = EXCLUDED.keywords;