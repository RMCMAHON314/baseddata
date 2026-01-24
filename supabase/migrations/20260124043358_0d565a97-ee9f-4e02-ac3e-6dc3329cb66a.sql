-- =====================================================
-- 360° FIX: Data recovery and index creation
-- =====================================================

-- Reset failed items in queue for retry
UPDATE flywheel_discovery_queue
SET status = 'pending', 
    error_message = NULL,
    started_at = NULL,
    completed_at = NULL
WHERE status = 'failed';

-- Update degraded sources to unknown (triggers re-check)
UPDATE api_sources 
SET health_status = 'unknown',
    last_health_check = NULL
WHERE health_status = 'degraded'
AND consecutive_failures < 5;

-- Reset open circuit breakers
UPDATE api_circuit_breakers
SET state = 'half_open',
    half_open_at = NOW()
WHERE state = 'open';

-- Create performance indexes if missing
CREATE INDEX IF NOT EXISTS idx_records_entity_id ON records(entity_id);
CREATE INDEX IF NOT EXISTS idx_core_facts_entity_id ON core_facts(entity_id);
CREATE INDEX IF NOT EXISTS idx_core_relationships_from ON core_relationships(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_core_relationships_to ON core_relationships(to_entity_id);
CREATE INDEX IF NOT EXISTS idx_flywheel_queue_status ON flywheel_discovery_queue(status);
CREATE INDEX IF NOT EXISTS idx_api_sources_health ON api_sources(health_status, status);