
-- Link remaining orphan contracts via exact name match (case-insensitive)
UPDATE contracts c
SET recipient_entity_id = e.id
FROM core_entities e
WHERE c.recipient_entity_id IS NULL
AND c.recipient_name IS NOT NULL
AND upper(trim(c.recipient_name)) = upper(trim(e.canonical_name));
