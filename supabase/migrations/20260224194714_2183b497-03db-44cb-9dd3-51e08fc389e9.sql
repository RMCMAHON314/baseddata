
-- Fix the flywheel_discovery_queue constraint that the trigger depends on
CREATE UNIQUE INDEX IF NOT EXISTS uq_flywheel_discovery_queue_type_value
ON flywheel_discovery_queue (target_type, target_value);
