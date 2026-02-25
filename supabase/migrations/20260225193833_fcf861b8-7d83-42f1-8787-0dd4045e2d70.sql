
-- SEC EDGAR Corporate Filings
CREATE TABLE IF NOT EXISTS public.sec_filings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cik TEXT NOT NULL,
  company_name TEXT NOT NULL,
  filing_type TEXT NOT NULL, -- 10-K, 10-Q, 8-K, S-1, etc.
  filing_date DATE,
  accession_number TEXT UNIQUE,
  primary_document TEXT,
  filing_url TEXT,
  description TEXT,
  revenue NUMERIC,
  net_income NUMERIC,
  total_assets NUMERIC,
  employees INTEGER,
  sic_code TEXT,
  state_of_incorporation TEXT,
  business_address_state TEXT,
  entity_id UUID REFERENCES core_entities(id),
  raw_data JSONB DEFAULT '{}',
  source TEXT DEFAULT 'sec_edgar',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sec_filings_cik ON sec_filings(cik);
CREATE INDEX IF NOT EXISTS idx_sec_filings_type ON sec_filings(filing_type);
CREATE INDEX IF NOT EXISTS idx_sec_filings_date ON sec_filings(filing_date);
CREATE INDEX IF NOT EXISTS idx_sec_filings_entity ON sec_filings(entity_id);
ALTER TABLE public.sec_filings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sec_filings" ON public.sec_filings FOR SELECT USING (true);
CREATE POLICY "Service insert sec_filings" ON public.sec_filings FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update sec_filings" ON public.sec_filings FOR UPDATE USING (true);

-- USPTO Patents
CREATE TABLE IF NOT EXISTS public.uspto_patents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patent_number TEXT UNIQUE,
  application_number TEXT,
  title TEXT NOT NULL,
  abstract TEXT,
  patent_type TEXT, -- utility, design, plant
  filing_date DATE,
  grant_date DATE,
  assignee_name TEXT,
  assignee_state TEXT,
  assignee_country TEXT,
  inventors TEXT[],
  cpc_codes TEXT[], -- Cooperative Patent Classification
  uspc_codes TEXT[],
  citation_count INTEGER DEFAULT 0,
  entity_id UUID REFERENCES core_entities(id),
  raw_data JSONB DEFAULT '{}',
  source TEXT DEFAULT 'uspto',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_uspto_patents_assignee ON uspto_patents(assignee_name);
CREATE INDEX IF NOT EXISTS idx_uspto_patents_grant ON uspto_patents(grant_date);
CREATE INDEX IF NOT EXISTS idx_uspto_patents_entity ON uspto_patents(entity_id);
ALTER TABLE public.uspto_patents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read uspto_patents" ON public.uspto_patents FOR SELECT USING (true);
CREATE POLICY "Service insert uspto_patents" ON public.uspto_patents FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update uspto_patents" ON public.uspto_patents FOR UPDATE USING (true);

-- Federal Audit Clearinghouse (Single Audit)
CREATE TABLE IF NOT EXISTS public.federal_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_year INTEGER NOT NULL,
  dbkey TEXT,
  auditee_name TEXT NOT NULL,
  auditee_ein TEXT,
  auditee_uei TEXT,
  auditee_state TEXT,
  auditee_city TEXT,
  auditee_zip TEXT,
  auditor_name TEXT,
  audit_type TEXT,
  total_federal_expenditures NUMERIC,
  findings_count INTEGER DEFAULT 0,
  material_weakness BOOLEAN DEFAULT false,
  significant_deficiency BOOLEAN DEFAULT false,
  going_concern BOOLEAN DEFAULT false,
  questioned_costs NUMERIC DEFAULT 0,
  cfda_numbers TEXT[],
  cognizant_agency TEXT,
  entity_id UUID REFERENCES core_entities(id),
  raw_data JSONB DEFAULT '{}',
  source TEXT DEFAULT 'fac',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(audit_year, dbkey)
);
CREATE INDEX IF NOT EXISTS idx_federal_audits_ein ON federal_audits(auditee_ein);
CREATE INDEX IF NOT EXISTS idx_federal_audits_uei ON federal_audits(auditee_uei);
CREATE INDEX IF NOT EXISTS idx_federal_audits_year ON federal_audits(audit_year);
CREATE INDEX IF NOT EXISTS idx_federal_audits_entity ON federal_audits(entity_id);
ALTER TABLE public.federal_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read federal_audits" ON public.federal_audits FOR SELECT USING (true);
CREATE POLICY "Service insert federal_audits" ON public.federal_audits FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update federal_audits" ON public.federal_audits FOR UPDATE USING (true);

-- GSA Contract Vehicles (eLibrary)
CREATE TABLE IF NOT EXISTS public.gsa_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_number TEXT UNIQUE,
  schedule_number TEXT,
  schedule_title TEXT,
  contractor_name TEXT NOT NULL,
  contractor_uei TEXT,
  contractor_duns TEXT,
  contractor_state TEXT,
  contractor_city TEXT,
  contract_start_date DATE,
  contract_end_date DATE,
  sin_codes TEXT[], -- Special Item Numbers
  naics_codes TEXT[],
  small_business BOOLEAN DEFAULT false,
  socioeconomic_categories TEXT[],
  entity_id UUID REFERENCES core_entities(id),
  raw_data JSONB DEFAULT '{}',
  source TEXT DEFAULT 'gsa_elibrary',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gsa_contracts_contractor ON gsa_contracts(contractor_name);
CREATE INDEX IF NOT EXISTS idx_gsa_contracts_schedule ON gsa_contracts(schedule_number);
CREATE INDEX IF NOT EXISTS idx_gsa_contracts_entity ON gsa_contracts(entity_id);
ALTER TABLE public.gsa_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read gsa_contracts" ON public.gsa_contracts FOR SELECT USING (true);
CREATE POLICY "Service insert gsa_contracts" ON public.gsa_contracts FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update gsa_contracts" ON public.gsa_contracts FOR UPDATE USING (true);

-- Lobbying Disclosures
CREATE TABLE IF NOT EXISTS public.lobbying_disclosures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filing_id TEXT UNIQUE,
  registrant_name TEXT NOT NULL,
  registrant_id TEXT,
  client_name TEXT,
  filing_type TEXT,
  filing_year INTEGER,
  filing_period TEXT,
  amount NUMERIC,
  lobbyists TEXT[],
  government_entities TEXT[],
  issues TEXT[],
  specific_issues TEXT,
  entity_id UUID REFERENCES core_entities(id),
  raw_data JSONB DEFAULT '{}',
  source TEXT DEFAULT 'lda',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lobbying_registrant ON lobbying_disclosures(registrant_name);
CREATE INDEX IF NOT EXISTS idx_lobbying_client ON lobbying_disclosures(client_name);
CREATE INDEX IF NOT EXISTS idx_lobbying_year ON lobbying_disclosures(filing_year);
CREATE INDEX IF NOT EXISTS idx_lobbying_entity ON lobbying_disclosures(entity_id);
ALTER TABLE public.lobbying_disclosures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read lobbying" ON public.lobbying_disclosures FOR SELECT USING (true);
CREATE POLICY "Service insert lobbying" ON public.lobbying_disclosures FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update lobbying" ON public.lobbying_disclosures FOR UPDATE USING (true);
