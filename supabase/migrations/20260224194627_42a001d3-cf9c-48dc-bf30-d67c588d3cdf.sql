
-- ============================================
-- THE ENTITY LINKER: Backfill + Ongoing Linking
-- ============================================

-- Create a fast entity linking function
CREATE OR REPLACE FUNCTION link_transactions_to_entities()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  contracts_linked INTEGER := 0;
  grants_linked INTEGER := 0;
  entities_created INTEGER := 0;
  v_entity_id UUID;
  v_rec RECORD;
  v_count INTEGER;
BEGIN
  -- PASS 1: Link contracts by exact name match
  UPDATE contracts c
  SET recipient_entity_id = ce.id
  FROM core_entities ce
  WHERE c.recipient_entity_id IS NULL
    AND c.recipient_name IS NOT NULL
    AND lower(trim(c.recipient_name)) = lower(trim(ce.canonical_name));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  contracts_linked := contracts_linked + v_count;

  -- PASS 2: Link contracts by UEI match
  UPDATE contracts c
  SET recipient_entity_id = ce.id
  FROM core_entities ce
  WHERE c.recipient_entity_id IS NULL
    AND c.recipient_uei IS NOT NULL
    AND c.recipient_uei = ce.uei;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  contracts_linked := contracts_linked + v_count;

  -- PASS 3: Create entities for unlinked contracts
  FOR v_rec IN
    SELECT DISTINCT ON (lower(trim(recipient_name)))
      recipient_name, pop_state, pop_city, recipient_uei, naics_code
    FROM contracts
    WHERE recipient_entity_id IS NULL
      AND recipient_name IS NOT NULL
      AND length(trim(recipient_name)) > 2
    ORDER BY lower(trim(recipient_name)), award_amount DESC NULLS LAST
    LIMIT 500
  LOOP
    SELECT id INTO v_entity_id FROM core_entities
    WHERE lower(trim(canonical_name)) = lower(trim(v_rec.recipient_name))
    LIMIT 1;

    IF v_entity_id IS NULL THEN
      INSERT INTO core_entities (canonical_name, entity_type, state, city, uei, naics_codes, identifiers, merged_data, source_records)
      VALUES (
        trim(v_rec.recipient_name),
        CASE
          WHEN v_rec.recipient_name ILIKE '%university%' OR v_rec.recipient_name ILIKE '%college%' THEN 'university'
          WHEN v_rec.recipient_name ILIKE '%department%' OR v_rec.recipient_name ILIKE '%agency%' THEN 'agency'
          WHEN v_rec.recipient_name ILIKE '%school%' OR v_rec.recipient_name ILIKE '%board of education%' THEN 'school_district'
          WHEN v_rec.recipient_name ILIKE '%city of%' OR v_rec.recipient_name ILIKE '%county%' OR v_rec.recipient_name ILIKE '%town of%' THEN 'municipality'
          WHEN v_rec.recipient_name ILIKE '%foundation%' OR v_rec.recipient_name ILIKE '%institute%' THEN 'nonprofit'
          WHEN v_rec.recipient_name ILIKE '%inc%' OR v_rec.recipient_name ILIKE '%llc%' OR v_rec.recipient_name ILIKE '%corp%' THEN 'contractor'
          ELSE 'contractor'
        END,
        v_rec.pop_state,
        v_rec.pop_city,
        v_rec.recipient_uei,
        CASE WHEN v_rec.naics_code IS NOT NULL THEN ARRAY[v_rec.naics_code] ELSE '{}'::text[] END,
        '{}'::jsonb, '{}'::jsonb, '{"source":"auto_linker"}'::jsonb
      )
      RETURNING id INTO v_entity_id;
      entities_created := entities_created + 1;
    END IF;

    UPDATE contracts
    SET recipient_entity_id = v_entity_id
    WHERE recipient_entity_id IS NULL
      AND lower(trim(recipient_name)) = lower(trim(v_rec.recipient_name));
    GET DIAGNOSTICS v_count = ROW_COUNT;
    contracts_linked := contracts_linked + v_count;
  END LOOP;

  -- PASS 4: Link grants by exact name match
  UPDATE grants g
  SET recipient_entity_id = ce.id
  FROM core_entities ce
  WHERE g.recipient_entity_id IS NULL
    AND g.recipient_name IS NOT NULL
    AND lower(trim(g.recipient_name)) = lower(trim(ce.canonical_name));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  grants_linked := grants_linked + v_count;

  -- PASS 5: Link grants by UEI match
  UPDATE grants g
  SET recipient_entity_id = ce.id
  FROM core_entities ce
  WHERE g.recipient_entity_id IS NULL
    AND g.recipient_uei IS NOT NULL
    AND g.recipient_uei = ce.uei;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  grants_linked := grants_linked + v_count;

  -- PASS 6: Create entities for unlinked grants
  FOR v_rec IN
    SELECT DISTINCT ON (lower(trim(recipient_name)))
      recipient_name, recipient_state, recipient_city, recipient_uei
    FROM grants
    WHERE recipient_entity_id IS NULL
      AND recipient_name IS NOT NULL
      AND length(trim(recipient_name)) > 2
    ORDER BY lower(trim(recipient_name)), award_amount DESC NULLS LAST
    LIMIT 500
  LOOP
    SELECT id INTO v_entity_id FROM core_entities
    WHERE lower(trim(canonical_name)) = lower(trim(v_rec.recipient_name))
    LIMIT 1;

    IF v_entity_id IS NULL THEN
      INSERT INTO core_entities (canonical_name, entity_type, state, city, uei, identifiers, merged_data, source_records)
      VALUES (
        trim(v_rec.recipient_name),
        CASE
          WHEN v_rec.recipient_name ILIKE '%university%' OR v_rec.recipient_name ILIKE '%college%' THEN 'university'
          WHEN v_rec.recipient_name ILIKE '%department%' OR v_rec.recipient_name ILIKE '%agency%' THEN 'agency'
          WHEN v_rec.recipient_name ILIKE '%school%' THEN 'school_district'
          WHEN v_rec.recipient_name ILIKE '%city of%' OR v_rec.recipient_name ILIKE '%county%' THEN 'municipality'
          WHEN v_rec.recipient_name ILIKE '%foundation%' OR v_rec.recipient_name ILIKE '%institute%' THEN 'nonprofit'
          WHEN v_rec.recipient_name ILIKE '%inc%' OR v_rec.recipient_name ILIKE '%llc%' OR v_rec.recipient_name ILIKE '%corp%' THEN 'contractor'
          ELSE 'organization'
        END,
        v_rec.recipient_state,
        v_rec.recipient_city,
        v_rec.recipient_uei,
        '{}'::jsonb, '{}'::jsonb, '{"source":"auto_linker"}'::jsonb
      )
      RETURNING id INTO v_entity_id;
      entities_created := entities_created + 1;
    END IF;

    UPDATE grants
    SET recipient_entity_id = v_entity_id
    WHERE recipient_entity_id IS NULL
      AND lower(trim(recipient_name)) = lower(trim(v_rec.recipient_name));
    GET DIAGNOSTICS v_count = ROW_COUNT;
    grants_linked := grants_linked + v_count;
  END LOOP;

  -- PASS 7: Refresh entity stats
  UPDATE core_entities ce
  SET
    total_contract_value = COALESCE((SELECT SUM(award_amount) FROM contracts WHERE recipient_entity_id = ce.id), 0),
    contract_count = COALESCE((SELECT COUNT(*) FROM contracts WHERE recipient_entity_id = ce.id), 0),
    grant_count = COALESCE((SELECT COUNT(*) FROM grants WHERE recipient_entity_id = ce.id), 0),
    naics_codes = COALESCE((
      SELECT array_agg(DISTINCT c.naics_code)
      FROM contracts c
      WHERE c.recipient_entity_id = ce.id AND c.naics_code IS NOT NULL AND c.naics_code != ''
    ), ce.naics_codes),
    updated_at = NOW()
  WHERE ce.id IN (
    SELECT DISTINCT recipient_entity_id FROM contracts WHERE recipient_entity_id IS NOT NULL
    UNION
    SELECT DISTINCT recipient_entity_id FROM grants WHERE recipient_entity_id IS NOT NULL
  );

  -- PASS 8: Rebuild search vectors
  UPDATE core_entities
  SET search_vector = to_tsvector('english',
    COALESCE(canonical_name, '') || ' ' ||
    COALESCE(entity_type, '') || ' ' ||
    COALESCE(state, '') || ' ' ||
    COALESCE(city, '') || ' ' ||
    COALESCE(array_to_string(naics_codes, ' '), '')
  )
  WHERE search_vector IS NULL OR updated_at > NOW() - INTERVAL '1 hour';

  RETURN jsonb_build_object(
    'contracts_linked', contracts_linked,
    'grants_linked', grants_linked,
    'entities_created', entities_created,
    'total_entities', (SELECT COUNT(*) FROM core_entities),
    'linked_entities', (SELECT COUNT(DISTINCT recipient_entity_id) FROM contracts WHERE recipient_entity_id IS NOT NULL)
      + (SELECT COUNT(DISTINCT recipient_entity_id) FROM grants WHERE recipient_entity_id IS NOT NULL),
    'unlinked_contracts', (SELECT COUNT(*) FROM contracts WHERE recipient_entity_id IS NULL),
    'unlinked_grants', (SELECT COUNT(*) FROM grants WHERE recipient_entity_id IS NULL)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION link_transactions_to_entities() TO anon, authenticated, service_role;
