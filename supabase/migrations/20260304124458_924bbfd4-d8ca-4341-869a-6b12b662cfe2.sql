
-- FDA 510(k) clearances and warning letters
CREATE TABLE IF NOT EXISTS public.fda_510k (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  k_number text UNIQUE NOT NULL,
  applicant text,
  contact text,
  decision_date date,
  decision_description text,
  device_name text,
  product_code text,
  statement_or_summary text,
  review_advisory_committee text,
  third_party_flag text,
  expedited_review_flag text,
  linked_entity_id uuid REFERENCES core_entities(id),
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fda_warning_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text,
  company_name text NOT NULL,
  subject text,
  issuing_office text,
  issue_date date,
  letter_url text,
  close_out_date date,
  response_letter_url text,
  linked_entity_id uuid REFERENCES core_entities(id),
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.federal_audit_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_year integer NOT NULL,
  dbkey text,
  auditee_name text NOT NULL,
  auditee_ein text,
  auditee_uei text,
  auditee_state text,
  auditee_city text,
  cognizant_agency text,
  type_of_entity text,
  total_federal_expenditures numeric,
  finding_ref_number text,
  finding_text text,
  type_requirement text,
  modified_opinion text,
  other_matters text,
  material_weakness text,
  significant_deficiency text,
  questioned_costs numeric,
  cfda_number text,
  federal_program_name text,
  linked_entity_id uuid REFERENCES core_entities(id),
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fda_510k_applicant ON fda_510k(applicant);
CREATE INDEX IF NOT EXISTS idx_fda_510k_linked ON fda_510k(linked_entity_id);
CREATE INDEX IF NOT EXISTS idx_fda_warnings_company ON fda_warning_letters(company_name);
CREATE INDEX IF NOT EXISTS idx_fda_warnings_linked ON fda_warning_letters(linked_entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_findings_name ON federal_audit_findings(auditee_name);
CREATE INDEX IF NOT EXISTS idx_audit_findings_uei ON federal_audit_findings(auditee_uei);
CREATE INDEX IF NOT EXISTS idx_audit_findings_linked ON federal_audit_findings(linked_entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_findings_year ON federal_audit_findings(audit_year);

ALTER TABLE fda_510k ENABLE ROW LEVEL SECURITY;
ALTER TABLE fda_warning_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE federal_audit_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read fda_510k" ON fda_510k FOR SELECT USING (true);
CREATE POLICY "Public read fda_warning_letters" ON fda_warning_letters FOR SELECT USING (true);
CREATE POLICY "Public read federal_audit_findings" ON federal_audit_findings FOR SELECT USING (true);
CREATE POLICY "Service insert fda_510k" ON fda_510k FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert fda_warning_letters" ON fda_warning_letters FOR INSERT WITH CHECK (true);
CREATE POLICY "Service insert federal_audit_findings" ON federal_audit_findings FOR INSERT WITH CHECK (true);
