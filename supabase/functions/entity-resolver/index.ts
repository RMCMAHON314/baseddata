// ============================================================
// 🧠 THE CORE: ENTITY RESOLUTION ENGINE v2.0
// Multi-strategy entity resolution for 60%+ resolution rate
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SourceRecord {
  id: string;
  name: string;
  category: string;
  source_id: string;
  source_record_id: string;
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: number[] };
  description?: string;
  relevance_score?: number;
  quality_score?: number;
  city?: string;
  state?: string;
}

interface ResolvedEntity {
  entity_id: string;
  is_new: boolean;
  confidence: number;
  strategy: string;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Check if name is too generic to match
// ═══════════════════════════════════════════════════════════════
const GENERIC_NAMES = new Set([
  'poi', 'unknown', 'unnamed', 'n/a', 'na', 'none', 'null', 'undefined',
  'test', 'sample', 'example', 'default', 'placeholder', 'temp', 'tmp',
  'point', 'location', 'place', 'site', 'area', 'zone', 'region',
  'passeriformes', 'magnoliopsida', 'aves', 'mammalia', 'insecta', // Taxonomic classes
  'animalia', 'plantae', 'fungi', 'chordata', 'arthropoda',
]);

function isGenericName(name: string): boolean {
  const normalized = name.toLowerCase().trim();
  if (GENERIC_NAMES.has(normalized)) return true;
  if (normalized.length < 3) return true;
  if (/^\d+\s*km\s+(n|s|e|w|ne|nw|se|sw|nne|nnw|sse|ssw|ene|ese|wnw|wsw)\s+of/i.test(normalized)) return true; // Earthquake location patterns
  return false;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Normalize name for matching
// ═══════════════════════════════════════════════════════════════
function normalizeNameForMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\b(the|inc|llc|corp|corporation|company|co|ltd|hospital|medical|center|clinic|school|university|college|of|and|at|in)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Calculate string similarity (Jaccard-based)
// ═══════════════════════════════════════════════════════════════
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeNameForMatch(str1);
  const s2 = normalizeNameForMatch(str2);
  
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  // Jaccard similarity on words
  const words1 = new Set(s1.split(' ').filter(w => w.length > 1));
  const words2 = new Set(s2.split(' ').filter(w => w.length > 1));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  
  return intersection / union;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Extract identifiers from properties
// ═══════════════════════════════════════════════════════════════
function extractIdentifiers(properties: Record<string, unknown>): Record<string, string> {
  const identifiers: Record<string, string> = {};
  const idFields = [
    'npi', 'duns', 'ein', 'cage_code', 'uei', 'sam_unique_id',
    'osm_id', 'fda_id', 'cms_id', 'epa_id', 'osha_id',
    'contract_id', 'award_id', 'piid', 'fain'
  ];
  
  for (const field of idFields) {
    if (properties[field]) {
      identifiers[field] = String(properties[field]);
    }
  }
  
  return identifiers;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Infer entity type from category
// ═══════════════════════════════════════════════════════════════
function inferEntityType(category: string, properties: Record<string, unknown>): string {
  const categoryLower = (category || '').toLowerCase();
  
  if (categoryLower.includes('hospital') || categoryLower.includes('health') || categoryLower.includes('medical')) {
    return 'facility';
  }
  if (categoryLower.includes('doctor') || categoryLower.includes('physician') || categoryLower.includes('provider')) {
    return properties.npi ? 'person' : 'organization';
  }
  if (categoryLower.includes('contract') || categoryLower.includes('government') || categoryLower.includes('federal')) {
    return 'organization';
  }
  if (categoryLower.includes('school') || categoryLower.includes('education') || categoryLower.includes('university')) {
    return 'educational_institution';
  }
  if (categoryLower.includes('restaurant') || categoryLower.includes('food') || categoryLower.includes('dining')) {
    return 'business';
  }
  
  return 'organization';
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Calculate data quality score
// ═══════════════════════════════════════════════════════════════
function calculateDataQuality(record: SourceRecord): number {
  let score = 50;
  if (record.name) score += 10;
  const props = record.properties || {};
  if (props.address || props.street || props.addr_street) score += 10;
  if (record.city || props.city || props.addr_city) score += 5;
  if (record.state || props.state || props.addr_state) score += 5;
  if (record.geometry?.coordinates?.length >= 2) score += 10;
  if (props.phone || props.telephone) score += 3;
  if (props.website || props.url) score += 3;
  const identifiers = extractIdentifiers(props);
  score += Math.min(Object.keys(identifiers).length * 3, 15);
  return Math.min(score, 100);
}

// ═══════════════════════════════════════════════════════════════
// MULTI-STRATEGY ENTITY RESOLUTION
// ═══════════════════════════════════════════════════════════════
async function resolveRecordToEntity(
  record: SourceRecord,
  supabase: any
): Promise<ResolvedEntity> {
  const props = record.properties || {};
  const identifiers = extractIdentifiers(props);
  const entityType = inferEntityType(record.category, props);
  const recordIsGeneric = isGenericName(record.name);

  // Skip generic names entirely - create isolated entities for them
  if (recordIsGeneric) {
    console.log(`[entity-resolver] Generic name detected: "${record.name}" - creating isolated entity`);
    const newEntity = await createNewEntity(record, entityType, identifiers, supabase);
    return { entity_id: newEntity.id, is_new: true, confidence: 0.5, strategy: 'generic_isolated' };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // STRATEGY 1: Exact identifier match (highest confidence)
  // ═══════════════════════════════════════════════════════════════
  if (Object.keys(identifiers).length > 0) {
    for (const [key, value] of Object.entries(identifiers)) {
      const { data: matches } = await supabase
        .from('core_entities')
        .select('id, canonical_name, source_records, identifiers, merged_data, data_quality_score')
        .contains('identifiers', { [key]: value })
        .limit(1);
      
      if (matches && matches.length > 0) {
        const entity = matches[0];
        // Don't merge into generic entities
        if (!isGenericName(entity.canonical_name)) {
          await mergeRecordIntoEntity(record, entity, supabase);
          console.log(`[entity-resolver] Strategy 1: Exact match on ${key}=${value}`);
          return { entity_id: entity.id, is_new: false, confidence: 1.0, strategy: 'exact_identifier' };
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STRATEGY 2: Name + City + State match (high confidence)
  // ═══════════════════════════════════════════════════════════════
  const city = record.city || props.city || props.addr_city;
  const state = record.state || props.state || props.addr_state;
  
  if (record.name && city && state) {
    const { data: locationMatches } = await supabase
      .from('core_entities')
      .select('id, canonical_name, source_records, identifiers, merged_data, data_quality_score, city, state')
      .eq('city', city)
      .eq('state', state)
      .limit(50);
    
    if (locationMatches && locationMatches.length > 0) {
      const scored = locationMatches
        .filter((e: any) => !isGenericName(e.canonical_name)) // Skip generic entities
        .map((e: any) => ({ ...e, similarity: calculateSimilarity(record.name, e.canonical_name) }))
        .sort((a: any, b: any) => b.similarity - a.similarity);
      
      if (scored.length > 0 && scored[0].similarity > 0.7) {
        await mergeRecordIntoEntity(record, scored[0], supabase);
        console.log(`[entity-resolver] Strategy 2: Location match ${record.name} -> ${scored[0].canonical_name} (${scored[0].similarity.toFixed(2)})`);
        return { entity_id: scored[0].id, is_new: false, confidence: scored[0].similarity, strategy: 'name_location' };
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STRATEGY 3: Name + Proximity match (for records with coordinates)
  // ═══════════════════════════════════════════════════════════════
  const coords = record.geometry?.coordinates;
  if (record.name && coords && coords.length >= 2) {
    const [lng, lat] = coords;
    
    const { data: nearbyEntities } = await supabase
      .rpc('find_nearby_entities_by_name', {
        p_name: record.name,
        p_lat: lat,
        p_lng: lng,
        p_radius_km: 1.0
      });
    
    if (nearbyEntities && nearbyEntities.length > 0) {
      // Filter out generic entity names
      const validMatches = nearbyEntities.filter((e: any) => !isGenericName(e.canonical_name));
      const bestMatch = validMatches[0];
      if (bestMatch && bestMatch.similarity > 0.6) {
        const { data: entity } = await supabase
          .from('core_entities')
          .select('*')
          .eq('id', bestMatch.id)
          .single();
        
        if (entity) {
          await mergeRecordIntoEntity(record, entity, supabase);
          console.log(`[entity-resolver] Strategy 3: Proximity match (${bestMatch.distance_km?.toFixed(2)}km, ${bestMatch.similarity?.toFixed(2)} sim)`);
          return { entity_id: entity.id, is_new: false, confidence: bestMatch.similarity, strategy: 'name_proximity' };
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STRATEGY 4: Fuzzy name match within same entity type (medium confidence)
  // ═══════════════════════════════════════════════════════════════
  if (record.name) {
    const { data: typeMatches } = await supabase
      .from('core_entities')
      .select('id, canonical_name, source_records, identifiers, merged_data, data_quality_score')
      .eq('entity_type', entityType)
      .limit(100);
    
    if (typeMatches && typeMatches.length > 0) {
      const scored = typeMatches
        .filter((e: any) => !isGenericName(e.canonical_name)) // Skip generic entities
        .map((e: any) => ({ ...e, similarity: calculateSimilarity(record.name, e.canonical_name) }))
        .filter((e: any) => e.similarity > 0.85)
        .sort((a: any, b: any) => b.similarity - a.similarity);
      
      if (scored.length > 0) {
        await mergeRecordIntoEntity(record, scored[0], supabase);
        console.log(`[entity-resolver] Strategy 4: Type match ${record.name} -> ${scored[0].canonical_name} (${scored[0].similarity.toFixed(2)})`);
        return { entity_id: scored[0].id, is_new: false, confidence: scored[0].similarity * 0.9, strategy: 'fuzzy_type' };
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STRATEGY 5: Create new entity (record is unique)
  // ═══════════════════════════════════════════════════════════════
  const newEntity = await createNewEntity(record, entityType, identifiers, supabase);
  return { entity_id: newEntity.id, is_new: true, confidence: 1.0, strategy: 'created' };
}

// ═══════════════════════════════════════════════════════════════
// MERGE RECORD INTO EXISTING ENTITY
// ═══════════════════════════════════════════════════════════════
async function mergeRecordIntoEntity(record: SourceRecord, entity: any, supabase: any) {
  const props = record.properties || {};
  const existingRecords = entity.source_records || [];
  const alreadyLinked = existingRecords.some(
    (sr: { source: string; record_id: string }) => 
      sr.source === record.source_id && sr.record_id === record.id
  );
  
  if (alreadyLinked) return;
  
  // Merge identifiers
  const newIdentifiers = {
    ...entity.identifiers,
    ...extractIdentifiers(props),
    [record.source_id]: record.source_record_id,
  };
  
  // Merge data (prefer non-null values)
  const mergedData = { ...entity.merged_data };
  if (props.address && !mergedData.address) mergedData.address = props.address;
  if (props.phone && !mergedData.phone) mergedData.phone = props.phone;
  if (props.website && !mergedData.website) mergedData.website = props.website;
  if (record.geometry?.coordinates && !mergedData.latitude) {
    mergedData.latitude = record.geometry.coordinates[1];
    mergedData.longitude = record.geometry.coordinates[0];
  }
  
  // Add to source records
  const newSourceRecords = [
    ...existingRecords,
    { source: record.source_id, record_id: record.id, confidence: (record.relevance_score || 80) / 100 }
  ];
  
  const newQuality = Math.max(entity.data_quality_score || 50, calculateDataQuality(record));
  
  // Update entity
  await supabase
    .from('core_entities')
    .update({
      identifiers: newIdentifiers,
      merged_data: mergedData,
      source_records: newSourceRecords,
      source_count: newSourceRecords.length,
      data_quality_score: newQuality,
      last_source_update: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', entity.id);
  
  // Link record to entity
  await supabase
    .from('records')
    .update({ entity_id: entity.id })
    .eq('id', record.id);
}

// ═══════════════════════════════════════════════════════════════
// CREATE NEW ENTITY
// ═══════════════════════════════════════════════════════════════
async function createNewEntity(
  record: SourceRecord,
  entityType: string,
  identifiers: Record<string, string>,
  supabase: any
) {
  const props = record.properties || {};
  const coords = record.geometry?.coordinates;
  const city = record.city || props.city || props.addr_city;
  const state = record.state || props.state || props.addr_state;
  
  const { data: newEntity, error } = await supabase
    .from('core_entities')
    .insert({
      canonical_name: record.name,
      entity_type: entityType,
      identifiers: {
        ...identifiers,
        [record.source_id]: record.source_record_id,
      },
      merged_data: {
        name: record.name,
        description: record.description,
        category: record.category,
        ...props,
      },
      latitude: coords?.[1],
      longitude: coords?.[0],
      city: city ? String(city) : null,
      state: state ? String(state) : null,
      source_records: [{ source: record.source_id, record_id: record.id, confidence: 0.9 }],
      source_count: 1,
      last_source_update: new Date().toISOString(),
      data_quality_score: calculateDataQuality(record),
      health_score: 50,
      risk_score: 25,
      opportunity_score: 50,
      tags: [record.category],
    })
    .select()
    .single();

  if (error) {
    console.error(`[entity-resolver] Error creating entity: ${error.message}`);
    throw error;
  }

  // Link record to new entity
  await supabase
    .from('records')
    .update({ entity_id: newEntity.id })
    .eq('id', record.id);

  return newEntity;
}

// ═══════════════════════════════════════════════════════════════
// CREATE RELATIONSHIPS BETWEEN ENTITIES
// ═══════════════════════════════════════════════════════════════
async function createRelationships(entityIds: string[], supabase: any): Promise<number> {
  if (entityIds.length < 2) return 0;
  
  const { data: entities } = await supabase
    .from('core_entities')
    .select('id, canonical_name, latitude, longitude, entity_type')
    .in('id', entityIds)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (!entities || entities.length < 2) return 0;

  let created = 0;
  const batchRelationships: any[] = [];

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const e1 = entities[i];
      const e2 = entities[j];
      
      const latDiff = Math.abs(e1.latitude - e2.latitude);
      const lngDiff = Math.abs(e1.longitude - e2.longitude);
      const approxMiles = Math.sqrt(latDiff ** 2 + lngDiff ** 2) * 69;
      
      // Create "near" relationship if within 5 miles
      if (approxMiles < 5) {
        batchRelationships.push({
          from_entity_id: e1.id,
          to_entity_id: e2.id,
          relationship_type: 'near',
          strength: Math.max(0.1, 1 - (approxMiles / 5)),
          confidence: 0.95,
          evidence: [{ source: 'geo', distance_miles: approxMiles.toFixed(2) }],
        });
      }

      // Create "competes_with" if same type and nearby
      if (e1.entity_type === e2.entity_type && approxMiles < 10) {
        batchRelationships.push({
          from_entity_id: e1.id,
          to_entity_id: e2.id,
          relationship_type: 'competes_with',
          strength: Math.max(0.1, 1 - (approxMiles / 10)),
          confidence: 0.7,
          evidence: [{ source: 'inference', reason: 'Same type in same market' }],
        });
      }
    }
  }

  // Insert relationships (ignore duplicates)
  for (const rel of batchRelationships) {
    const { error } = await supabase
      .from('core_relationships')
      .upsert(rel, { onConflict: 'from_entity_id,to_entity_id,relationship_type', ignoreDuplicates: true });
    if (!error) created++;
  }

  return created;
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json() as { 
      records?: SourceRecord[];
      record_ids?: string[];
      query_id?: string;
      entity_type?: string;
      backfill?: boolean;
      batch_size?: number;
    };

    let records: SourceRecord[] = body.records || [];
    
    // Backfill mode: fetch unresolved records
    if (body.backfill) {
      const batchSize = body.batch_size || 100;
      const { data: unresolvedRecords } = await supabase
        .from('records')
        .select('id, name, category, source_id, source_record_id, properties, geometry, description, quality_score')
        .is('entity_id', null)
        .limit(batchSize);
      
      if (unresolvedRecords) {
        records = unresolvedRecords.map(r => ({
          id: r.id,
          name: r.name,
          category: r.category,
          source_id: r.source_id,
          source_record_id: r.source_record_id,
          properties: r.properties as Record<string, unknown>,
          geometry: r.geometry as { type: string; coordinates: number[] },
          description: r.description || undefined,
          quality_score: r.quality_score || undefined,
          city: (r.properties as any)?.city,
          state: (r.properties as any)?.state,
        }));
      }
      console.log(`[entity-resolver] Backfill mode: ${records.length} unresolved records`);
    }
    
    // If record_ids provided, fetch from database
    else if (body.record_ids && body.record_ids.length > 0) {
      const { data: fetchedRecords } = await supabase
        .from('records')
        .select('id, name, category, source_id, source_record_id, properties, geometry, description, quality_score')
        .in('id', body.record_ids);
      
      if (fetchedRecords) {
        records = fetchedRecords.map(r => ({
          id: r.id,
          name: r.name,
          category: r.category,
          source_id: r.source_id,
          source_record_id: r.source_record_id,
          properties: r.properties as Record<string, unknown>,
          geometry: r.geometry as { type: string; coordinates: number[] },
          description: r.description || undefined,
          quality_score: r.quality_score || undefined,
          city: (r.properties as any)?.city,
          state: (r.properties as any)?.state,
        }));
      }
      console.log(`[entity-resolver] Fetched ${records.length} records from IDs`);
    }

    if (!records || records.length === 0) {
      return new Response(
        JSON.stringify({ success: true, entities_created: 0, entities_merged: 0, message: 'No records to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[entity-resolver] Processing ${records.length} records`);
    const startTime = Date.now();

    let newEntities = 0;
    let mergedEntities = 0;
    const entityIds: string[] = [];
    const strategyStats: Record<string, number> = {};

    for (const record of records) {
      try {
        if (!record.name) continue;
        
        const result = await resolveRecordToEntity(record, supabase);
        entityIds.push(result.entity_id);
        
        if (result.is_new) newEntities++;
        else mergedEntities++;
        
        strategyStats[result.strategy] = (strategyStats[result.strategy] || 0) + 1;
      } catch (err) {
        console.error(`[entity-resolver] Error processing record ${record.id}:`, err);
      }
    }

    // Create relationships between entities
    const relationshipsCreated = await createRelationships([...new Set(entityIds)], supabase);

    const processingTime = Date.now() - startTime;
    console.log(`[entity-resolver] Complete: ${newEntities} new, ${mergedEntities} merged, ${relationshipsCreated} relationships in ${processingTime}ms`);
    console.log(`[entity-resolver] Strategies: ${JSON.stringify(strategyStats)}`);

    return new Response(
      JSON.stringify({
        success: true,
        records_processed: records.length,
        entities_created: newEntities,
        entities_merged: mergedEntities,
        new_entities: newEntities,
        merged_entities: mergedEntities,
        relationships_created: relationshipsCreated,
        strategy_breakdown: strategyStats,
        processing_time_ms: processingTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[entity-resolver] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
