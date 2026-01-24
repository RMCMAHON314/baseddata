-- Clinical Trials Table
CREATE TABLE IF NOT EXISTS clinical_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nct_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  official_title TEXT,
  overall_status TEXT,
  phase TEXT,
  study_type TEXT,
  lead_sponsor_name TEXT,
  lead_sponsor_type TEXT,
  sponsor_entity_id UUID REFERENCES core_entities(id),
  intervention_type TEXT,
  intervention_names TEXT[],
  drug_names TEXT[],
  conditions TEXT[],
  keywords TEXT[],
  start_date DATE,
  completion_date DATE,
  enrollment INTEGER,
  enrollment_type TEXT,
  location_countries TEXT[],
  location_states TEXT[],
  url TEXT,
  source TEXT DEFAULT 'clinicaltrials_gov',
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FDA Drugs Table
CREATE TABLE IF NOT EXISTS fda_drugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number TEXT UNIQUE,
  brand_name TEXT,
  generic_name TEXT,
  active_ingredients TEXT[],
  dosage_form TEXT,
  route TEXT,
  sponsor_name TEXT,
  sponsor_entity_id UUID REFERENCES core_entities(id),
  application_type TEXT,
  approval_date DATE,
  market_status TEXT,
  therapeutic_class TEXT,
  source TEXT DEFAULT 'openfda',
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FDA Devices Table
CREATE TABLE IF NOT EXISTS fda_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  k_number TEXT UNIQUE,
  pma_number TEXT,
  device_name TEXT NOT NULL,
  device_class TEXT,
  product_code TEXT,
  applicant TEXT,
  applicant_entity_id UUID REFERENCES core_entities(id),
  decision TEXT,
  decision_date DATE,
  medical_specialty TEXT,
  source TEXT DEFAULT 'openfda',
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trials_nct ON clinical_trials(nct_id);
CREATE INDEX IF NOT EXISTS idx_trials_status ON clinical_trials(overall_status);
CREATE INDEX IF NOT EXISTS idx_trials_phase ON clinical_trials(phase);
CREATE INDEX IF NOT EXISTS idx_trials_sponsor ON clinical_trials(lead_sponsor_name);
CREATE INDEX IF NOT EXISTS idx_drugs_brand ON fda_drugs(brand_name);
CREATE INDEX IF NOT EXISTS idx_drugs_sponsor ON fda_drugs(sponsor_name);
CREATE INDEX IF NOT EXISTS idx_devices_applicant ON fda_devices(applicant);

-- Enable RLS
ALTER TABLE clinical_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE fda_drugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fda_devices ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Public read access for clinical_trials" ON clinical_trials FOR SELECT USING (true);
CREATE POLICY "Public read access for fda_drugs" ON fda_drugs FOR SELECT USING (true);
CREATE POLICY "Public read access for fda_devices" ON fda_devices FOR SELECT USING (true);

-- Sample Clinical Trials Data
INSERT INTO clinical_trials (nct_id, title, overall_status, phase, study_type, lead_sponsor_name, lead_sponsor_type, intervention_type, drug_names, conditions, enrollment, start_date, completion_date, location_states, url)
VALUES
  ('NCT05000001', 'Phase 3 Study of Novel mRNA Cancer Vaccine', 'Recruiting', 'Phase 3', 'Interventional', 'Moderna Inc', 'INDUSTRY', 'BIOLOGICAL', ARRAY['mRNA-4157'], ARRAY['Melanoma', 'Lung Cancer'], 1200, '2024-01-15', '2027-06-30', ARRAY['MA', 'NY', 'CA'], 'https://clinicaltrials.gov/study/NCT05000001'),
  ('NCT05000002', 'CAR-T Cell Therapy in B-Cell Lymphoma', 'Recruiting', 'Phase 2', 'Interventional', 'Bristol-Myers Squibb', 'INDUSTRY', 'BIOLOGICAL', ARRAY['Breyanzi'], ARRAY['B-Cell Lymphoma'], 450, '2024-03-01', '2026-12-31', ARRAY['NJ', 'PA', 'MD'], 'https://clinicaltrials.gov/study/NCT05000002'),
  ('NCT05000003', 'GLP-1 Agonist for Weight Management', 'Recruiting', 'Phase 3', 'Interventional', 'Eli Lilly', 'INDUSTRY', 'DRUG', ARRAY['Tirzepatide'], ARRAY['Obesity', 'Type 2 Diabetes'], 3500, '2024-02-01', '2026-08-31', ARRAY['IN', 'IL', 'OH'], 'https://clinicaltrials.gov/study/NCT05000003'),
  ('NCT05000004', 'Alzheimer Prevention Trial', 'Recruiting', 'Phase 3', 'Interventional', 'Biogen Inc', 'INDUSTRY', 'BIOLOGICAL', ARRAY['Lecanemab'], ARRAY['Alzheimer Disease'], 1800, '2024-04-15', '2029-12-31', ARRAY['MA', 'NY', 'FL'], 'https://clinicaltrials.gov/study/NCT05000004'),
  ('NCT05000005', 'Gene Therapy for Sickle Cell', 'Recruiting', 'Phase 1/2', 'Interventional', 'Vertex Pharmaceuticals', 'INDUSTRY', 'GENETIC', ARRAY['Casgevy'], ARRAY['Sickle Cell Disease'], 75, '2024-05-01', '2028-12-31', ARRAY['MA', 'MD', 'GA'], 'https://clinicaltrials.gov/study/NCT05000005'),
  ('NCT05000006', 'RSV Vaccine in Older Adults', 'Active, not recruiting', 'Phase 3', 'Interventional', 'Pfizer Inc', 'INDUSTRY', 'BIOLOGICAL', ARRAY['RSVpreF'], ARRAY['RSV'], 35000, '2023-09-01', '2025-06-30', ARRAY['NY', 'FL', 'TX', 'CA'], 'https://clinicaltrials.gov/study/NCT05000006'),
  ('NCT05000007', 'Maryland Biotech Oncology Trial', 'Recruiting', 'Phase 2', 'Interventional', 'Emergent BioSolutions', 'INDUSTRY', 'BIOLOGICAL', ARRAY['EB-101'], ARRAY['Solid Tumors'], 200, '2024-08-15', '2027-02-28', ARRAY['MD', 'VA', 'DC'], 'https://clinicaltrials.gov/study/NCT05000007'),
  ('NCT05000008', 'COVID-19 Variant Booster', 'Recruiting', 'Phase 2/3', 'Interventional', 'Novavax Inc', 'INDUSTRY', 'BIOLOGICAL', ARRAY['NVX-CoV2601'], ARRAY['COVID-19'], 4000, '2024-09-01', '2025-12-31', ARRAY['MD', 'VA', 'NC'], 'https://clinicaltrials.gov/study/NCT05000008')
ON CONFLICT (nct_id) DO NOTHING;

-- Sample FDA Drugs Data
INSERT INTO fda_drugs (application_number, brand_name, generic_name, active_ingredients, sponsor_name, application_type, market_status, therapeutic_class, approval_date)
VALUES
  ('NDA214096', 'Wegovy', 'semaglutide', ARRAY['semaglutide'], 'Novo Nordisk', 'NDA', 'Prescription', 'GLP-1 Receptor Agonist', '2021-06-04'),
  ('BLA761248', 'Leqembi', 'lecanemab', ARRAY['lecanemab'], 'Eisai Inc', 'BLA', 'Prescription', 'Amyloid Antibody', '2023-01-06'),
  ('NDA215256', 'Mounjaro', 'tirzepatide', ARRAY['tirzepatide'], 'Eli Lilly', 'NDA', 'Prescription', 'GIP/GLP-1 Agonist', '2022-05-13'),
  ('BLA761327', 'Casgevy', 'exagamglogene', ARRAY['exagamglogene'], 'Vertex Pharmaceuticals', 'BLA', 'Prescription', 'Gene Therapy', '2023-12-08'),
  ('NDA217806', 'Zepbound', 'tirzepatide', ARRAY['tirzepatide'], 'Eli Lilly', 'NDA', 'Prescription', 'GIP/GLP-1 Agonist', '2023-11-08'),
  ('BLA761278', 'Opdualag', 'nivolumab/relatlimab', ARRAY['nivolumab', 'relatlimab'], 'Bristol-Myers Squibb', 'BLA', 'Prescription', 'PD-1/LAG-3 Antibody', '2022-03-18'),
  ('NDA217932', 'Jaypirca', 'pirtobrutinib', ARRAY['pirtobrutinib'], 'Eli Lilly', 'NDA', 'Prescription', 'BTK Inhibitor', '2023-01-27')
ON CONFLICT (application_number) DO NOTHING;