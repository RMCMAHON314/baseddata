
-- Add missing columns to opportunities for SAM.gov data
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS base_type TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS set_aside_code TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS classification_code TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS award_date DATE;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS award_number TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS award_amount DECIMAL(18,2);
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS awardee_name TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS awardee_uei TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS awardee_city TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS awardee_state TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS primary_contact_email TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS primary_contact_name TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS primary_contact_phone TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'sam_gov';

-- Additional indexes for new columns
CREATE INDEX IF NOT EXISTS idx_opps_posted ON opportunities(posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_opps_department ON opportunities(department);
CREATE INDEX IF NOT EXISTS idx_opps_naics ON opportunities(naics_code);
CREATE INDEX IF NOT EXISTS idx_opps_set_aside ON opportunities(set_aside_code);
CREATE INDEX IF NOT EXISTS idx_opps_active ON opportunities(is_active);
CREATE INDEX IF NOT EXISTS idx_opps_deadline ON opportunities(response_deadline);
CREATE INDEX IF NOT EXISTS idx_opps_awardee ON opportunities(awardee_name);
CREATE INDEX IF NOT EXISTS idx_opps_state ON opportunities(awardee_state);

-- Ensure RLS is enabled with public read
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read opportunities" ON opportunities;
CREATE POLICY "Public read opportunities" ON opportunities FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service write opportunities" ON opportunities;
CREATE POLICY "Service write opportunities" ON opportunities FOR ALL USING (true) WITH CHECK (true);
