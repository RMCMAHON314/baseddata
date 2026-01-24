// ============================================================================
// 🦑 THE KRAKEN HUNTERS
// Finds new data targets from every user query, entity, and relationship
// Feeds the discovery queue for crawlers to process
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// HUNTING CONFIGURATION
// ============================================================================

const HUNTING_CONFIG = {
  MAX_DISCOVERIES_PER_QUERY: 25,
  MAX_DISCOVERIES_PER_ENTITY: 15,
  MAX_DISCOVERIES_PER_RELATIONSHIP: 10,
  PRIORITY_BOOST_FOR_IDENTIFIER: 20,
  PRIORITY_BOOST_FOR_HEALTHCARE: 15,
  PRIORITY_BOOST_FOR_FEDERAL: 15,
};

// ============================================================================
// TYPES
// ============================================================================

interface Discovery {
  type: string;
  source: string;
  query: Record<string, unknown>;
  priority: number;
  context: Record<string, unknown>;
}

interface HuntResult {
  discoveries: number;
  targets_queued: number;
  trigger_type: string;
  trigger_id?: string;
}

// ============================================================================
// HELPER: Check if name looks like a company
// ============================================================================

function isLikelyCompany(name: string): boolean {
  const indicators = ['inc', 'llc', 'corp', 'corporation', 'company', 'co', 'ltd', 'group', 'partners', 'holdings', 'enterprises'];
  const lower = name.toLowerCase();
  return indicators.some(ind => lower.includes(ind));
}

// ============================================================================
// HELPER: Extract keywords from query
// ============================================================================

function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/\b(in|the|a|an|of|for|and|or|near|around|show|find|list|get)\b/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

// ============================================================================
// HELPER: Extract location from query
// ============================================================================

function extractLocation(query: string): string {
  const match = query.match(/\s+in\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

// ============================================================================
// HELPER: Get related categories
// ============================================================================

function getRelatedCategories(category: string): string[] {
  const related: Record<string, string[]> = {
    'Healthcare': ['Pharmacy', 'Medical Lab', 'Urgent Care', 'Nursing Home', 'Clinic'],
    'Education': ['Library', 'Daycare', 'Training Center', 'College'],
    'Government': ['Post Office', 'Court', 'DMV', 'Social Services', 'Military'],
    'Financial': ['ATM', 'Credit Union', 'Insurance', 'Bank'],
    'Transportation': ['Airport', 'Train Station', 'Bus Terminal', 'Port'],
    'Recreation': ['Park', 'Stadium', 'Museum', 'Zoo', 'Beach'],
  };
  return related[category] || [];
}

// ============================================================================
// HUNTING STRATEGY 1: Hunt from Query Results
// ============================================================================

async function huntFromQueryResults(queryId: string, supabase: any): Promise<Discovery[]> {
  const discoveries: Discovery[] = [];

  // Get query details
  const { data: query } = await supabase
    .from('nl_queries')
    .select('*')
    .eq('id', queryId)
    .single();

  if (!query) return discoveries;

  // Get records from this query
  const { data: records } = await supabase
    .from('records')
    .select('*')
    .eq('query_id', queryId)
    .limit(100);

  if (!records || records.length === 0) return discoveries;

  const rawQuery = query.natural_query || '';

  // STRATEGY 1: Hunt for company data if company-like names found
  const companyNames = records
    .filter((r: any) => r.name && isLikelyCompany(r.name))
    .slice(0, 5);

  for (const entity of companyNames) {
    discoveries.push({
      type: 'entity_enrichment',
      source: 'sec_edgar',
      query: { company_name: entity.name },
      priority: 70,
      context: { entity_name: entity.name, original_query: rawQuery }
    });
  }

  // STRATEGY 2: Hunt for NPI data for healthcare entities
  const healthcareEntities = records
    .filter((r: any) => r.category === 'Healthcare')
    .slice(0, 5);

  for (const entity of healthcareEntities) {
    discoveries.push({
      type: 'entity_enrichment',
      source: 'npi_registry',
      query: { 
        name: entity.name, 
        city: entity.city, 
        state: entity.state 
      },
      priority: 80 + HUNTING_CONFIG.PRIORITY_BOOST_FOR_HEALTHCARE,
      context: { entity_name: entity.name, category: 'Healthcare' }
    });
  }

  // STRATEGY 3: Hunt for EPA data near facilities with coordinates
  const geoEntities = records
    .filter((r: any) => r.geometry?.coordinates?.length >= 2)
    .slice(0, 3);

  for (const entity of geoEntities) {
    const [lng, lat] = entity.geometry.coordinates;
    discoveries.push({
      type: 'proximity_enrichment',
      source: 'epa_echo',
      query: { 
        latitude: lat, 
        longitude: lng,
        radius: 5
      },
      priority: 60,
      context: { near_entity: entity.name }
    });
  }

  // STRATEGY 4: Hunt for federal data if government entities found
  const hasGovernment = records.some((r: any) => r.category === 'Government');
  if (hasGovernment) {
    const location = extractLocation(rawQuery);
    discoveries.push({
      type: 'federal_enrichment',
      source: 'usaspending',
      query: { 
        location: location,
        keywords: extractKeywords(rawQuery)
      },
      priority: 75 + HUNTING_CONFIG.PRIORITY_BOOST_FOR_FEDERAL,
      context: { triggered_by: 'government_entities_found' }
    });

    discoveries.push({
      type: 'federal_enrichment',
      source: 'sam_entities',
      query: { location: location },
      priority: 70 + HUNTING_CONFIG.PRIORITY_BOOST_FOR_FEDERAL,
      context: { triggered_by: 'government_entities_found' }
    });
  }

  // STRATEGY 5: Hunt for related categories
  const categories = [...new Set(records.map((r: any) => r.category).filter(Boolean))];
  for (const category of categories.slice(0, 3)) {
    const relatedCategories = getRelatedCategories(category as string);
    for (const related of relatedCategories.slice(0, 2)) {
      discoveries.push({
        type: 'category_expansion',
        source: 'openstreetmap',
        query: {
          category: related,
          location: extractLocation(rawQuery)
        },
        priority: 40,
        context: { original_category: category, expanded_to: related }
      });
    }
  }

  // STRATEGY 6: Hunt for financial data if contracts/payments found
  const hasFinancial = records.some((r: any) => 
    r.properties?.payment_amount || r.properties?.award_amount
  );
  if (hasFinancial) {
    const financialEntities = records
      .filter((r: any) => r.properties?.payment_amount || r.properties?.award_amount)
      .map((r: any) => r.name)
      .slice(0, 5);

    for (const entityName of financialEntities) {
      discoveries.push({
        type: 'financial_enrichment',
        source: 'usaspending',
        query: { recipient_name: entityName },
        priority: 65,
        context: { entity_name: entityName }
      });
    }
  }

  return discoveries.slice(0, HUNTING_CONFIG.MAX_DISCOVERIES_PER_QUERY);
}

// ============================================================================
// HUNTING STRATEGY 2: Hunt for Entity Data
// ============================================================================

async function huntForEntityData(entityId: string, supabase: any): Promise<Discovery[]> {
  const discoveries: Discovery[] = [];

  const { data: entity } = await supabase
    .from('core_entities')
    .select('*')
    .eq('id', entityId)
    .single();

  if (!entity) return discoveries;

  const data = entity.merged_data || {};
  const identifiers = entity.identifiers || {};

  // Hunt based on identifiers
  if (identifiers.npi) {
    discoveries.push({
      type: 'identifier_lookup',
      source: 'cms_open_payments',
      query: { npi: identifiers.npi },
      priority: 90 + HUNTING_CONFIG.PRIORITY_BOOST_FOR_IDENTIFIER,
      context: { entity_id: entityId, identifier: 'npi' }
    });
  }

  if (identifiers.duns || identifiers.uei) {
    discoveries.push({
      type: 'identifier_lookup',
      source: 'usaspending',
      query: { duns: identifiers.duns, uei: identifiers.uei },
      priority: 85 + HUNTING_CONFIG.PRIORITY_BOOST_FOR_IDENTIFIER,
      context: { entity_id: entityId, identifier: 'duns/uei' }
    });

    discoveries.push({
      type: 'identifier_lookup',
      source: 'sam_entities',
      query: { duns: identifiers.duns, uei: identifiers.uei },
      priority: 85 + HUNTING_CONFIG.PRIORITY_BOOST_FOR_IDENTIFIER,
      context: { entity_id: entityId, identifier: 'duns/uei' }
    });
  }

  if (identifiers.ein) {
    discoveries.push({
      type: 'identifier_lookup',
      source: 'sec_edgar',
      query: { ein: identifiers.ein },
      priority: 80 + HUNTING_CONFIG.PRIORITY_BOOST_FOR_IDENTIFIER,
      context: { entity_id: entityId, identifier: 'ein' }
    });
  }

  // Hunt based on entity type
  if (entity.entity_type === 'facility' || entity.entity_type === 'healthcare_facility') {
    discoveries.push({
      type: 'entity_enrichment',
      source: 'hospital_compare',
      query: { name: entity.canonical_name, state: data.state },
      priority: 75,
      context: { entity_id: entityId, entity_type: entity.entity_type }
    });
  }

  if (entity.entity_type === 'educational_institution') {
    discoveries.push({
      type: 'entity_enrichment',
      source: 'college_scorecard',
      query: { name: entity.canonical_name, state: data.state },
      priority: 75,
      context: { entity_id: entityId, entity_type: entity.entity_type }
    });
  }

  // Hunt for compliance data if we have coordinates
  if (data.latitude && data.longitude) {
    discoveries.push({
      type: 'compliance_enrichment',
      source: 'epa_echo',
      query: { 
        latitude: data.latitude, 
        longitude: data.longitude,
        radius: 1
      },
      priority: 60,
      context: { entity_id: entityId }
    });

    discoveries.push({
      type: 'compliance_enrichment',
      source: 'osha',
      query: { 
        name: entity.canonical_name,
        state: data.state
      },
      priority: 55,
      context: { entity_id: entityId }
    });
  }

  return discoveries.slice(0, HUNTING_CONFIG.MAX_DISCOVERIES_PER_ENTITY);
}

// ============================================================================
// HUNTING STRATEGY 3: Hunt from Relationship
// ============================================================================

async function huntFromRelationship(relationshipId: string, supabase: any): Promise<Discovery[]> {
  const discoveries: Discovery[] = [];

  const { data: rel } = await supabase
    .from('core_relationships')
    .select('*')
    .eq('id', relationshipId)
    .single();

  if (!rel) return discoveries;

  // Hunt for more data about both entities
  if (rel.from_entity_id) {
    const entityDiscoveries = await huntForEntityData(rel.from_entity_id, supabase);
    discoveries.push(...entityDiscoveries);
  }

  if (rel.to_entity_id) {
    const entityDiscoveries = await huntForEntityData(rel.to_entity_id, supabase);
    discoveries.push(...entityDiscoveries);
  }

  // Hunt for similar relationships
  if (rel.relationship_type === 'contracted_with') {
    discoveries.push({
      type: 'relationship_expansion',
      source: 'usaspending',
      query: { 
        agency: rel.evidence?.[0]?.agency,
        relationship_type: 'contracted_with'
      },
      priority: 60,
      context: { relationship_id: relationshipId, expansion_type: 'same_agency' }
    });
  }

  return discoveries.slice(0, HUNTING_CONFIG.MAX_DISCOVERIES_PER_RELATIONSHIP);
}

// ============================================================================
// HUNTING STRATEGY 4: Hunt Trending Topics
// ============================================================================

async function huntTrendingTopics(supabase: any): Promise<Discovery[]> {
  const discoveries: Discovery[] = [];

  // Get most popular query patterns
  const { data: popularPatterns } = await supabase
    .from('core_query_patterns')
    .select('*')
    .order('query_count', { ascending: false })
    .limit(10);

  // Get underexplored areas
  const { data: underexplored } = await supabase.rpc('find_underexplored_areas');

  // Hunt for data in underexplored areas
  for (const area of underexplored || []) {
    if (area.missing_categories?.length > 0) {
      for (const category of area.missing_categories.slice(0, 3)) {
        discoveries.push({
          type: 'coverage_expansion',
          source: 'openstreetmap',
          query: { 
            location: area.name,
            category: category
          },
          priority: 55,
          context: { area: area.name, reason: 'underexplored', missing_category: category }
        });
      }
    }
  }

  // Hunt fresh data for popular patterns
  for (const pattern of popularPatterns || []) {
    // Check freshness
    const { data: recentCollection } = await supabase
      .from('flywheel_collection_log')
      .select('collected_at')
      .eq('pattern_signature', pattern.pattern_signature)
      .order('collected_at', { ascending: false })
      .limit(1)
      .single();

    const hoursSinceCollection = recentCollection 
      ? (Date.now() - new Date(recentCollection.collected_at).getTime()) / (1000 * 60 * 60)
      : 999;

    if (hoursSinceCollection > 24) {
      discoveries.push({
        type: 'refresh',
        source: pattern.successful_sources?.[0] || 'openstreetmap',
        query: { pattern: pattern.pattern_template || pattern.pattern_signature },
        priority: 45,
        context: { 
          pattern: pattern.pattern_signature, 
          hours_stale: Math.round(hoursSinceCollection),
          query_count: pattern.query_count
        }
      });
    }
  }

  return discoveries.slice(0, 20);
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { trigger_type = 'scheduled', data = {}, query_id, entity_id, batch_size } = body;
    
    // Support both nested data object and flat parameters
    const resolvedData = {
      query_id: data.query_id || query_id,
      entity_id: data.entity_id || entity_id,
      relationship_id: data.relationship_id,
      ...data,
    };
    
    console.log(`🎯 [KRAKEN HUNTERS] Triggered: ${trigger_type}`);
    const startTime = Date.now();

    let discoveries: Discovery[] = [];

    switch (trigger_type) {
      case 'query_completed':
        if (resolvedData.query_id) {
          discoveries = await huntFromQueryResults(resolvedData.query_id, supabase);
        } else {
          // Fallback: hunt trending topics if no query_id
          discoveries = await huntTrendingTopics(supabase);
        }
        break;
        
      case 'entity_created':
        if (resolvedData.entity_id) {
          discoveries = await huntForEntityData(resolvedData.entity_id, supabase);
        }
        break;
        
      case 'relationship_found':
        if (resolvedData.relationship_id) {
          discoveries = await huntFromRelationship(resolvedData.relationship_id, supabase);
        }
        break;
        
      case 'flywheel_scheduled':
      case 'scheduled':
      default:
        discoveries = await huntTrendingTopics(supabase);
        break;
    }
    
    // Apply batch size limit if specified
    const maxResults = batch_size || HUNTING_CONFIG.MAX_DISCOVERIES_PER_QUERY;
    discoveries = discoveries.slice(0, maxResults);

    // Queue all discoveries
    if (discoveries.length > 0) {
      const insertData = discoveries.map(d => ({
        discovery_type: d.type,
        target_source: d.source,
        target_query: d.query,
        priority: d.priority,
        context: d.context,
        status: 'pending',
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('flywheel_discovery_queue').insert(insertData);
      
      if (error) {
        console.error('Failed to queue discoveries:', error);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`🎯 [KRAKEN HUNTERS] Found ${discoveries.length} targets in ${processingTime}ms`);

    // Log the hunt (non-blocking)
    try {
      await supabase.rpc('log_kraken_crawl', {
        p_crawler_type: `hunter_${trigger_type}`,
        p_records: discoveries.length,
        p_duration_ms: processingTime,
        p_metadata: { trigger_type, resolved_data: resolvedData }
      });
    } catch (logErr) {
      console.log('Log error:', logErr);
    }

    const result: HuntResult = {
      discoveries: discoveries.length,
      targets_queued: discoveries.length,  // Add this for flywheel compatibility
      trigger_type,
      trigger_id: resolvedData.query_id || resolvedData.entity_id || resolvedData.relationship_id
    };

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('🎯 [KRAKEN HUNTERS] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
