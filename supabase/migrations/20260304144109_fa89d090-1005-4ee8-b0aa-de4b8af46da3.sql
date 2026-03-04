-- Populate core_entities.website from sam_entities.entity_url
UPDATE core_entities ce
SET website = se.entity_url,
    updated_at = now()
FROM sam_entities se
WHERE ce.uei = se.uei
  AND se.entity_url IS NOT NULL
  AND se.entity_url != ''
  AND ce.website IS NULL;