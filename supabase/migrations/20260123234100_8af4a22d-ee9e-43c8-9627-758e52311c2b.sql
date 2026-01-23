-- ═══════════════════════════════════════════════════════════════
-- THE FINAL RIP: Database Migration for 95/100
-- ═══════════════════════════════════════════════════════════════

-- 1. Add entity_id column to records table if not exists
ALTER TABLE records 
ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES core_entities(id);

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_records_entity ON records(entity_id);

-- 3. Function to find nearby entities by name similarity (for fuzzy matching)
CREATE OR REPLACE FUNCTION find_nearby_entities_by_name(
  p_name TEXT,
  p_lat DECIMAL,
  p_lng DECIMAL,
  p_radius_km DECIMAL DEFAULT 1.0
)
RETURNS TABLE(
  id UUID,
  canonical_name TEXT,
  similarity DECIMAL,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.canonical_name,
    -- Simple word overlap similarity
    (
      SELECT COALESCE(COUNT(*)::decimal / GREATEST(
        array_length(regexp_split_to_array(lower(e.canonical_name), '\s+'), 1),
        array_length(regexp_split_to_array(lower(p_name), '\s+'), 1),
        1
      ), 0)
      FROM unnest(regexp_split_to_array(lower(e.canonical_name), '\s+')) w1
      WHERE EXISTS (
        SELECT 1 FROM unnest(regexp_split_to_array(lower(p_name), '\s+')) w2
        WHERE w1 = w2
      )
    ) as similarity,
    -- Haversine distance
    (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_lat)) * cos(radians(COALESCE((e.merged_data->>'latitude')::decimal, e.latitude))) *
          cos(radians(COALESCE((e.merged_data->>'longitude')::decimal, e.longitude)) - radians(p_lng)) +
          sin(radians(p_lat)) * sin(radians(COALESCE((e.merged_data->>'latitude')::decimal, e.latitude)))
        ))
      )
    ) as distance_km
  FROM core_entities e
  WHERE 
    (e.merged_data->>'latitude' IS NOT NULL OR e.latitude IS NOT NULL)
    AND (e.merged_data->>'longitude' IS NOT NULL OR e.longitude IS NOT NULL)
    AND (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_lat)) * cos(radians(COALESCE((e.merged_data->>'latitude')::decimal, e.latitude))) *
          cos(radians(COALESCE((e.merged_data->>'longitude')::decimal, e.longitude)) - radians(p_lng)) +
          sin(radians(p_lat)) * sin(radians(COALESCE((e.merged_data->>'latitude')::decimal, e.latitude)))
        ))
      )
    ) < p_radius_km
  ORDER BY similarity DESC, distance_km ASC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- 4. Add columns to core_query_patterns for enhanced pattern learning
ALTER TABLE core_query_patterns 
ADD COLUMN IF NOT EXISTS pattern_template TEXT,
ADD COLUMN IF NOT EXISTS pattern_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS sample_queries JSONB DEFAULT '[]'::jsonb;

-- 5. Update RLS for functions to work with service role
-- (Already permissive based on previous setup)