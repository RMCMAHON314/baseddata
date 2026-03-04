-- Seed websites for top contractors so web-enrich can scrape them
UPDATE core_entities SET website = CASE 
  WHEN canonical_name ILIKE '%lockheed martin%' THEN 'https://www.lockheedmartin.com'
  WHEN canonical_name ILIKE '%boeing%' THEN 'https://www.boeing.com'
  WHEN canonical_name ILIKE '%raytheon%' THEN 'https://www.rtx.com'
  WHEN canonical_name ILIKE '%northrop grumman%' THEN 'https://www.northropgrumman.com'
  WHEN canonical_name ILIKE '%general dynamics%' THEN 'https://www.gd.com'
  WHEN canonical_name ILIKE '%leidos%' THEN 'https://www.leidos.com'
  WHEN canonical_name ILIKE '%booz allen%' THEN 'https://www.boozallen.com'
  WHEN canonical_name ILIKE '%saic%' THEN 'https://www.saic.com'
  WHEN canonical_name ILIKE '%l3harris%' OR canonical_name ILIKE '%harris corporation%' THEN 'https://www.l3harris.com'
  WHEN canonical_name ILIKE '%bae systems%' THEN 'https://www.baesystems.com'
  WHEN canonical_name ILIKE '%caci%' THEN 'https://www.caci.com'
  WHEN canonical_name ILIKE '%perspecta%' OR canonical_name ILIKE '%peraton%' THEN 'https://www.peraton.com'
  WHEN canonical_name ILIKE '%mantech%' THEN 'https://www.mantech.com'
  WHEN canonical_name ILIKE '%deloitte%' THEN 'https://www.deloitte.com'
  WHEN canonical_name ILIKE '%accenture federal%' OR canonical_name ILIKE '%accenture%' THEN 'https://www.accenture.com'
  WHEN canonical_name ILIKE '%ibm%' THEN 'https://www.ibm.com'
  WHEN canonical_name ILIKE '%microsoft%' THEN 'https://www.microsoft.com'
  WHEN canonical_name ILIKE '%amazon%' THEN 'https://www.amazon.com'
  WHEN canonical_name ILIKE '%pfizer%' THEN 'https://www.pfizer.com'
  WHEN canonical_name ILIKE '%huntington ingalls%' THEN 'https://www.huntingtoningalls.com'
  ELSE website
END,
updated_at = now()
WHERE canonical_name ILIKE ANY(ARRAY[
  '%lockheed martin%','%boeing%','%raytheon%','%northrop grumman%','%general dynamics%',
  '%leidos%','%booz allen%','%saic%','%l3harris%','%harris corporation%','%bae systems%',
  '%caci%','%perspecta%','%peraton%','%mantech%','%deloitte%','%accenture%',
  '%ibm%','%microsoft%','%amazon%','%pfizer%','%huntington ingalls%'
]) AND website IS NULL;