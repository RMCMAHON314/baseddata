
-- Link orphan contracts to entities via fuzzy name matching
WITH orphans AS (
  SELECT c.id, c.recipient_name 
  FROM contracts c 
  WHERE c.recipient_entity_id IS NULL 
  AND c.recipient_name IS NOT NULL
  AND c.recipient_name != 'Unknown'
  LIMIT 500
),
matched AS (
  SELECT DISTINCT ON (o.id) o.id as contract_id, e.id as entity_id
  FROM orphans o
  JOIN core_entities e ON similarity(upper(o.recipient_name), upper(e.canonical_name)) > 0.5
  ORDER BY o.id, similarity(upper(o.recipient_name), upper(e.canonical_name)) DESC
)
UPDATE contracts c
SET recipient_entity_id = m.entity_id
FROM matched m
WHERE c.id = m.contract_id;
