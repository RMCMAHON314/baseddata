-- Step 1: Create unique index on uei for conflict resolution
CREATE UNIQUE INDEX IF NOT EXISTS idx_core_entities_uei_unique ON core_entities(uei) WHERE uei IS NOT NULL;