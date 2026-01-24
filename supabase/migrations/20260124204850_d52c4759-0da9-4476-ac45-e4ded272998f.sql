-- MEEC Contracts Table
CREATE TABLE IF NOT EXISTS meec_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number TEXT UNIQUE,
  contract_name TEXT NOT NULL,
  contract_type TEXT,
  start_date DATE,
  end_date DATE,
  categories TEXT[],
  eligible_members TEXT[],
  prime_contractors TEXT[],
  estimated_value DECIMAL,
  source TEXT DEFAULT 'meec',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Education Spending Table
CREATE TABLE IF NOT EXISTS md_education_spending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year INTEGER NOT NULL,
  county TEXT NOT NULL,
  payee_name TEXT NOT NULL,
  payee_entity_id UUID REFERENCES core_entities(id),
  total_payment DECIMAL NOT NULL,
  purpose TEXT,
  source TEXT DEFAULT 'md_open_data',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_edu_spending UNIQUE(fiscal_year, county, payee_name)
);

-- Education Institutions Table
CREATE TABLE IF NOT EXISTS md_education_institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_name TEXT NOT NULL,
  institution_type TEXT,
  county TEXT,
  city TEXT,
  meec_member BOOLEAN DEFAULT false,
  enrollment INTEGER,
  annual_budget DECIMAL,
  entity_id UUID REFERENCES core_entities(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meec_type ON meec_contracts(contract_type);
CREATE INDEX IF NOT EXISTS idx_edu_spending_year ON md_education_spending(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_edu_spending_county ON md_education_spending(county);
CREATE INDEX IF NOT EXISTS idx_edu_inst_type ON md_education_institutions(institution_type);

-- Enable RLS
ALTER TABLE meec_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_education_spending ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_education_institutions ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Public read access for meec_contracts" ON meec_contracts FOR SELECT USING (true);
CREATE POLICY "Public read access for md_education_spending" ON md_education_spending FOR SELECT USING (true);
CREATE POLICY "Public read access for md_education_institutions" ON md_education_institutions FOR SELECT USING (true);

-- MEEC Contracts Sample Data
INSERT INTO meec_contracts (contract_number, contract_name, contract_type, start_date, end_date, categories, prime_contractors, estimated_value)
VALUES
  ('TU-2501', 'IT Hardware', 'Hardware', '2025-03-01', '2028-02-29', ARRAY['Desktops', 'Laptops', 'Servers', 'Storage'], ARRAY['Dell', 'HP', 'Lenovo', 'CDW', 'SHI'], 100000000),
  ('54321', 'IT Professional Consulting', 'Services', '2022-11-01', '2025-10-31', ARRAY['ERP', 'Cloud Migration', 'Cybersecurity', 'Analytics'], ARRAY['Attain Partners', 'CGI', 'Deloitte', 'Carahsoft'], 50000000),
  ('MEEC-SW-2024', 'Enterprise Software', 'Software', '2024-01-01', '2026-12-31', ARRAY['Microsoft', 'Adobe', 'Google', 'Security'], ARRAY['Microsoft', 'Adobe', 'CDW', 'SHI'], 75000000),
  ('MEEC-SEC-2023', 'IT Security Services', 'Security', '2023-07-01', '2026-06-30', ARRAY['Penetration Testing', 'SOC', 'SIEM', 'Endpoint'], ARRAY['CrowdStrike', 'Palo Alto', 'Splunk'], 25000000),
  ('MEEC-LMS-2024', 'Learning Management Systems', 'Software', '2024-06-01', '2027-05-31', ARRAY['LMS', 'eLearning', 'SIS'], ARRAY['Canvas', 'Blackboard', 'Ellucian'], 30000000)
ON CONFLICT (contract_number) DO NOTHING;

-- Education Institutions Sample Data
INSERT INTO md_education_institutions (institution_name, institution_type, county, city, meec_member, enrollment, annual_budget)
VALUES
  ('Montgomery County Public Schools', 'K-12', 'Montgomery', 'Rockville', true, 160000, 2950000000),
  ('Prince George''s County Public Schools', 'K-12', 'Prince George''s', 'Upper Marlboro', true, 130000, 2210000000),
  ('Baltimore County Public Schools', 'K-12', 'Baltimore County', 'Towson', true, 110000, 1740000000),
  ('Baltimore City Public Schools', 'K-12', 'Baltimore City', 'Baltimore', true, 75000, 1580000000),
  ('Anne Arundel County Public Schools', 'K-12', 'Anne Arundel', 'Annapolis', true, 85000, 1420000000),
  ('Howard County Public Schools', 'K-12', 'Howard', 'Ellicott City', true, 60000, 1050000000),
  ('University of Maryland College Park', 'USM', 'Prince George''s', 'College Park', true, 41000, 2100000000),
  ('University of Maryland Baltimore County', 'USM', 'Baltimore County', 'Baltimore', true, 14000, 450000000),
  ('Towson University', 'USM', 'Baltimore County', 'Towson', true, 22000, 350000000),
  ('Montgomery College', 'Community College', 'Montgomery', 'Rockville', true, 50000, 350000000),
  ('Community College of Baltimore County', 'Community College', 'Baltimore County', 'Baltimore', true, 40000, 280000000),
  ('Johns Hopkins University', 'Private', 'Baltimore City', 'Baltimore', true, 27000, 6500000000)
ON CONFLICT DO NOTHING;

-- Education Spending Sample Data
INSERT INTO md_education_spending (fiscal_year, county, payee_name, total_payment, purpose)
VALUES
  (2024, 'Montgomery', 'Dell Technologies', 2500000, 'Technology'),
  (2024, 'Montgomery', 'CDW Government', 1800000, 'Technology'),
  (2024, 'Montgomery', 'Microsoft', 3200000, 'Software'),
  (2024, 'Prince George''s', 'Dell Technologies', 2100000, 'Technology'),
  (2024, 'Prince George''s', 'SHI International', 1500000, 'Technology'),
  (2024, 'Baltimore County', 'CDW Government', 1900000, 'Technology'),
  (2024, 'Baltimore County', 'Carahsoft', 950000, 'Technology'),
  (2024, 'Howard', 'Dell Technologies', 1200000, 'Technology'),
  (2024, 'Howard', 'Instructure', 450000, 'EdTech'),
  (2023, 'Montgomery', 'Dell Technologies', 2300000, 'Technology'),
  (2023, 'Montgomery', 'Microsoft', 2900000, 'Software'),
  (2023, 'Prince George''s', 'CDW Government', 1700000, 'Technology'),
  (2023, 'Baltimore County', 'SHI International', 1400000, 'Technology')
ON CONFLICT (fiscal_year, county, payee_name) DO NOTHING;