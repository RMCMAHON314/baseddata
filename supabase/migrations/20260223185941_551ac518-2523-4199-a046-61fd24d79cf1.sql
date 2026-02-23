
-- TABLE 1: SBIR/STTR Awards
CREATE TABLE IF NOT EXISTS sbir_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm TEXT NOT NULL,
  award_title TEXT,
  agency TEXT,
  branch TEXT,
  phase TEXT,
  program TEXT,
  contract TEXT,
  award_year INT,
  award_amount DECIMAL(18,2),
  uei TEXT,
  hubzone_owned TEXT,
  socially_disadvantaged TEXT,
  women_owned TEXT,
  number_employees INT,
  company_url TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  poc_name TEXT,
  poc_email TEXT,
  poc_phone TEXT,
  pi_name TEXT,
  pi_email TEXT,
  abstract TEXT,
  award_link TEXT,
  source TEXT DEFAULT 'sbir_gov',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract, agency)
);
CREATE INDEX IF NOT EXISTS idx_sbir_agency ON sbir_awards(agency);
CREATE INDEX IF NOT EXISTS idx_sbir_state ON sbir_awards(state);
CREATE INDEX IF NOT EXISTS idx_sbir_firm ON sbir_awards(firm);
CREATE INDEX IF NOT EXISTS idx_sbir_year ON sbir_awards(award_year DESC);
CREATE INDEX IF NOT EXISTS idx_sbir_uei ON sbir_awards(uei);
ALTER TABLE sbir_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sbir" ON sbir_awards FOR SELECT USING (true);
CREATE POLICY "Service write sbir" ON sbir_awards FOR ALL USING (true) WITH CHECK (true);

-- TABLE 2: SAM.gov Entity Registrations
CREATE TABLE IF NOT EXISTS sam_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uei TEXT UNIQUE NOT NULL,
  cage_code TEXT,
  legal_business_name TEXT,
  dba_name TEXT,
  registration_status TEXT,
  purpose_of_registration TEXT,
  registration_date DATE,
  expiration_date DATE,
  physical_address_line1 TEXT,
  physical_city TEXT,
  physical_state TEXT,
  physical_zip TEXT,
  physical_country TEXT,
  entity_structure TEXT,
  entity_url TEXT,
  business_types JSONB DEFAULT '[]',
  congressional_district TEXT,
  linked_entity_id UUID,
  source TEXT DEFAULT 'sam_entity_api',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sam_ent_uei ON sam_entities(uei);
CREATE INDEX IF NOT EXISTS idx_sam_ent_state ON sam_entities(physical_state);
CREATE INDEX IF NOT EXISTS idx_sam_ent_status ON sam_entities(registration_status);
CREATE INDEX IF NOT EXISTS idx_sam_ent_name ON sam_entities(legal_business_name);
ALTER TABLE sam_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sam_entities" ON sam_entities FOR SELECT USING (true);
CREATE POLICY "Service write sam_entities" ON sam_entities FOR ALL USING (true) WITH CHECK (true);

-- TABLE 3: SAM.gov Exclusions
CREATE TABLE IF NOT EXISTS sam_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classification TEXT,
  exclusion_name TEXT,
  exclusion_type TEXT,
  exclusion_program TEXT,
  excluding_agency TEXT,
  uei TEXT,
  cage_code TEXT,
  active_date DATE,
  termination_date DATE,
  record_status TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  description TEXT,
  source TEXT DEFAULT 'sam_exclusions',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exclusion_name, active_date, excluding_agency)
);
CREATE INDEX IF NOT EXISTS idx_excl_name ON sam_exclusions(exclusion_name);
CREATE INDEX IF NOT EXISTS idx_excl_uei ON sam_exclusions(uei);
CREATE INDEX IF NOT EXISTS idx_excl_status ON sam_exclusions(record_status);
ALTER TABLE sam_exclusions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read exclusions" ON sam_exclusions FOR SELECT USING (true);
CREATE POLICY "Service write exclusions" ON sam_exclusions FOR ALL USING (true) WITH CHECK (true);

-- TABLE 4: FPDS Contract Awards
CREATE TABLE IF NOT EXISTS fpds_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  piid TEXT,
  modification_number TEXT DEFAULT '0',
  contracting_department TEXT,
  contracting_subtier TEXT,
  contracting_office TEXT,
  funding_department TEXT,
  vendor_name TEXT,
  vendor_uei TEXT,
  vendor_cage TEXT,
  vendor_city TEXT,
  vendor_state TEXT,
  vendor_zip TEXT,
  dollars_obligated DECIMAL(18,2),
  base_and_all_options DECIMAL(18,2),
  naics_code TEXT,
  psc_code TEXT,
  award_type TEXT,
  set_aside TEXT,
  extent_competed TEXT,
  number_of_offers INT,
  solicitation_id TEXT,
  effective_date DATE,
  completion_date DATE,
  last_modified DATE,
  description_of_requirement TEXT,
  pop_state TEXT,
  pop_city TEXT,
  raw_data JSONB,
  source TEXT DEFAULT 'fpds_sam_gov',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(piid, modification_number)
);
CREATE INDEX IF NOT EXISTS idx_fpds_vendor ON fpds_awards(vendor_name);
CREATE INDEX IF NOT EXISTS idx_fpds_uei ON fpds_awards(vendor_uei);
CREATE INDEX IF NOT EXISTS idx_fpds_dept ON fpds_awards(contracting_department);
CREATE INDEX IF NOT EXISTS idx_fpds_naics ON fpds_awards(naics_code);
CREATE INDEX IF NOT EXISTS idx_fpds_date ON fpds_awards(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_fpds_state ON fpds_awards(pop_state);
ALTER TABLE fpds_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read fpds" ON fpds_awards FOR SELECT USING (true);
CREATE POLICY "Service write fpds" ON fpds_awards FOR ALL USING (true) WITH CHECK (true);

-- TABLE 5: NSF Research Awards
CREATE TABLE IF NOT EXISTS nsf_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_number TEXT UNIQUE,
  title TEXT,
  abstract TEXT,
  agency TEXT DEFAULT 'NSF',
  award_amount DECIMAL(18,2),
  start_date DATE,
  exp_date DATE,
  pi_first_name TEXT,
  pi_last_name TEXT,
  institution_name TEXT,
  institution_city TEXT,
  institution_state TEXT,
  institution_zip TEXT,
  program_element TEXT,
  fund_agency TEXT,
  source TEXT DEFAULT 'nsf_api',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nsf_inst ON nsf_awards(institution_name);
CREATE INDEX IF NOT EXISTS idx_nsf_state ON nsf_awards(institution_state);
CREATE INDEX IF NOT EXISTS idx_nsf_date ON nsf_awards(start_date DESC);
ALTER TABLE nsf_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read nsf" ON nsf_awards FOR SELECT USING (true);
CREATE POLICY "Service write nsf" ON nsf_awards FOR ALL USING (true) WITH CHECK (true);
