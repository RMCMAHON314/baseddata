// ============================================================
// 🧠 THE CORE: ENTITY RESOLUTION ENGINE
// Resolves records to unified entities - The Brain of Based Data
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
}

interface ResolvedEntity {
  entity_id: string;
  is_new: boolean;
  confidence: number;
  merge_actions: string[];
}

interface EntityData {
  id: string;
  canonical_name: string;
  entity_type: string;
  identifiers: Record<string, string>;
  merged_data: Record<string, unknown>;
  data_quality_score?: number;
  latitude?: number;
  longitude?: number;
  city?: string;
  state?: string;
  source_records: Array<{ source: string; record_id: string; confidence: number }>;
  source_count: number;
}

// Extract identifiers from record properties
function extractIdentifiers(properties: Record<string, unknown>): Record<string, string> {
  const identifiers: Record<string, string> = {};
  
  // Common identifier fields
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

// Infer entity type from category and properties
function inferEntityType(category: string, properties: Record<string, unknown>): string {
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('hospital') || categoryLower.includes('health') || categoryLower.includes('medical')) {
    return 'facility';
  }
  if (categoryLower.includes('doctor') || categoryLower.includes('physician') || categoryLower.includes('provider')) {
    if (properties.npi || properties.physician_name) return 'person';
    return 'organization';
  }
  if (categoryLower.includes('contract') || categoryLower.includes('government') || categoryLower.includes('federal')) {
    return 'organization';
  }
  if (categoryLower.includes('company') || categoryLower.includes('business') || categoryLower.includes('vendor')) {
    return 'organization';
  }
  if (categoryLower.includes('location') || categoryLower.includes('place') || categoryLower.includes('building')) {
    return 'location';
  }
  if (categoryLower.includes('product') || categoryLower.includes('drug') || categoryLower.includes('device')) {
    return 'product';
  }
  
  return 'organization'; // Default
}

// Calculate data quality score
function calculateDataQuality(record: SourceRecord): number {
  let score = 50; // Base score
  
  const props = record.properties || {};
  const fieldCount = Object.keys(props).length;
  
  // More fields = higher quality
  score += Math.min(fieldCount * 2, 20);
  
  // Has address info
  if (props.address || props.street || props.addr_street) score += 5;
  if (props.city || props.addr_city) score += 5;
  if (props.state || props.addr_state) score += 5;
  
  // Has contact info
  if (props.phone || props.telephone) score += 3;
  if (props.email) score += 3;
  if (props.website || props.url) score += 3;
  
  // Has identifiers
  const identifiers = extractIdentifiers(props);
  score += Math.min(Object.keys(identifiers).length * 3, 15);
  
  // Has description
  if (record.description && record.description.length > 50) score += 5;
  
  return Math.min(score, 100);
}

// Merge data from multiple sources - keep best values
function mergeEntityData
(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  existingQuality: number,
  incomingQuality: number
): Record<string, unknown> {
  const merged = { ...existing };
  
  for (const [key, value] of Object.entries(incoming)) {
    if (value === null || value === undefined) continue;
    
    // If we don't have this field, add it
    if (!(key in merged) || merged[key] === null || merged[key] === undefined) {
      merged[key] = value;
      continue;
    }
    
    // If incoming has higher quality score, prefer its values for important fields
    if (incomingQuality > existingQuality) {
      // Prefer incoming for key fields if they look more complete
      if (typeof value === 'string' && typeof merged[key] === 'string') {
        if (value.length > (merged[key] as string).length) {
          merged[key] = value;
        }
      }
    }
  }
  
  return merged;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { records, query_id } = await req.json() as { 
      records: SourceRecord[];
      query_id?: string;
    };

    if (!records || !Array.isArray(records)) {
      return new Response(
        JSON.stringify({ error: 'records array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[entity-resolver] Processing ${records.length} records`);
    const startTime = Date.now();

    const results: ResolvedEntity[] = [];
    let newEntities = 0;
    let mergedEntities = 0;
    let newRelationships = 0;
    let newFacts = 0;

    for (const record of records) {
      try {
        const identifiers = extractIdentifiers(record.properties || {});
        const entityType = inferEntityType(record.category, record.properties || {});
        const qualityScore = calculateDataQuality(record);
        
        // Step 1: Try exact identifier match
        let matchedEntity: EntityData | null = null;
        
        if (Object.keys(identifiers).length > 0) {
          for (const [key, value] of Object.entries(identifiers)) {
            const { data: matches } = await supabase
              .from('core_entities')
              .select('*')
              .contains('identifiers', { [key]: value })
              .limit(1);
            
            if (matches && matches.length > 0) {
              matchedEntity = matches[0] as EntityData;
              console.log(`[entity-resolver] Exact match on ${key}=${value}`);
              break;
            }
          }
        }

        // Step 2: Try fuzzy name + location match
        if (!matchedEntity && record.name) {
          const { data: similarEntities } = await supabase
            .rpc('find_similar_entities', {
              search_name: record.name,
              search_type: entityType,
              similarity_threshold: 0.7
            });

          if (similarEntities && similarEntities.length > 0) {
            // Check if location also matches
            const coords = record.geometry?.coordinates;
            if (coords && coords.length >= 2) {
              for (const similar of similarEntities) {
                // Get full entity data
                const { data: fullEntity } = await supabase
                  .from('core_entities')
                  .select('*')
                  .eq('id', similar.entity_id)
                  .single();

                if (fullEntity && fullEntity.latitude && fullEntity.longitude) {
                  // Check if within ~1 mile
                  const latDiff = Math.abs(fullEntity.latitude - coords[1]);
                  const lngDiff = Math.abs(fullEntity.longitude - coords[0]);
                  if (latDiff < 0.015 && lngDiff < 0.015) {
                    matchedEntity = fullEntity as EntityData;
                    console.log(`[entity-resolver] Fuzzy match: ${record.name} -> ${fullEntity.canonical_name} (${similar.similarity})`);
                    break;
                  }
                }
              }
            }
            
            // High similarity match even without location
            if (!matchedEntity && similarEntities[0].similarity > 0.9) {
              const { data: fullEntity } = await supabase
                .from('core_entities')
                .select('*')
                .eq('id', similarEntities[0].entity_id)
                .single();
              
              if (fullEntity) {
                matchedEntity = fullEntity as EntityData;
              }
            }
          }
        }

        // Step 3: Create or update entity
        if (matchedEntity) {
          // Update existing entity with new data
          const existingRecords = matchedEntity.source_records || [];
          const alreadyLinked = existingRecords.some(
            (sr: { source: string; record_id: string }) => 
              sr.source === record.source_id && sr.record_id === record.id
          );

          if (!alreadyLinked) {
            const mergedData = mergeEntityData(
              matchedEntity.merged_data || {},
              record.properties || {},
              matchedEntity.data_quality_score || 50,
              qualityScore
            );

            const newSourceRecords = [
              ...existingRecords,
              { source: record.source_id, record_id: record.id, confidence: (record.relevance_score || 80) / 100 }
            ];

            // Merge identifiers
            const mergedIdentifiers = { ...matchedEntity.identifiers, ...identifiers };

            await supabase
              .from('core_entities')
              .update({
                merged_data: mergedData,
                identifiers: mergedIdentifiers,
                source_records: newSourceRecords,
                source_count: newSourceRecords.length,
                last_source_update: new Date().toISOString(),
                data_quality_score: Math.max(matchedEntity.data_quality_score || 0, qualityScore)
              })
              .eq('id', matchedEntity.id);

            mergedEntities++;
          }

          results.push({
            entity_id: matchedEntity.id,
            is_new: false,
            confidence: 0.95,
            merge_actions: alreadyLinked ? [] : ['updated_merged_data', 'added_source_record']
          });

        } else {
          // Create new entity
          const coords = record.geometry?.coordinates;
          const props = record.properties || {};

          const { data: newEntity, error } = await supabase
            .from('core_entities')
            .insert({
              canonical_name: record.name,
              entity_type: entityType,
              identifiers,
              merged_data: {
                name: record.name,
                description: record.description,
                category: record.category,
                ...props
              },
              latitude: coords?.[1],
              longitude: coords?.[0],
              city: props.city || props.addr_city,
              state: props.state || props.addr_state,
              source_records: [{ source: record.source_id, record_id: record.id, confidence: 0.9 }],
              source_count: 1,
              last_source_update: new Date().toISOString(),
              data_quality_score: qualityScore,
              health_score: 50, // Initial neutral score
              risk_score: 25, // Low risk default
              opportunity_score: 50, // Neutral opportunity
              tags: [record.category]
            })
            .select()
            .single();

          if (error) {
            console.error(`[entity-resolver] Error creating entity: ${error.message}`);
            continue;
          }

          newEntities++;

          results.push({
            entity_id: newEntity.id,
            is_new: true,
            confidence: 1.0,
            merge_actions: ['created']
          });

          // Create facts from properties
          const factsToCreate = [];
          
          if (props.total_amount || props.award_amount || props.contract_value) {
            factsToCreate.push({
              entity_id: newEntity.id,
              fact_type: 'contract_value',
              fact_value: { 
                amount: props.total_amount || props.award_amount || props.contract_value,
                agency: props.awarding_agency || props.agency_name
              },
              fact_date: props.award_date || props.start_date,
              source_name: record.source_id,
              source_record_id: record.id,
              confidence: 0.9
            });
          }

          if (props.total_payment_usd || props.payment_amount) {
            factsToCreate.push({
              entity_id: newEntity.id,
              fact_type: 'payment_received',
              fact_value: { 
                amount: props.total_payment_usd || props.payment_amount,
                payer: props.applicable_manufacturer || props.payer_name
              },
              source_name: record.source_id,
              source_record_id: record.id,
              confidence: 0.9
            });
          }

          if (factsToCreate.length > 0) {
            await supabase.from('core_facts').insert(factsToCreate);
            newFacts += factsToCreate.length;
          }
        }
      } catch (err) {
        console.error(`[entity-resolver] Error processing record ${record.id}:`, err);
      }
    }

    // Discover relationships between entities in this batch
    // (Geographic proximity relationships)
    if (results.length > 1) {
      const entityIds = results.map(r => r.entity_id);
      
      // Get all entities with locations
      const { data: entities } = await supabase
        .from('core_entities')
        .select('id, canonical_name, latitude, longitude, entity_type')
        .in('id', entityIds)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (entities && entities.length > 1) {
        const relationshipsToCreate: Array<{
          from_entity_id: string;
          to_entity_id: string;
          relationship_type: string;
          strength: number;
          confidence: number;
          evidence: unknown[];
        }> = [];

        for (let i = 0; i < entities.length; i++) {
          for (let j = i + 1; j < entities.length; j++) {
            const e1 = entities[i];
            const e2 = entities[j];
            
            // Calculate distance in miles
            const latDiff = Math.abs(e1.latitude - e2.latitude);
            const lngDiff = Math.abs(e1.longitude - e2.longitude);
            const approxMiles = Math.sqrt(latDiff ** 2 + lngDiff ** 2) * 69; // Rough conversion
            
            // Create "near" relationship if within 5 miles
            if (approxMiles < 5) {
              relationshipsToCreate.push({
                from_entity_id: e1.id,
                to_entity_id: e2.id,
                relationship_type: 'near',
                strength: Math.max(0.1, 1 - (approxMiles / 5)),
                confidence: 0.95,
                evidence: [{ source: 'geo', distance_miles: approxMiles.toFixed(2) }]
              });
            }

            // Create "competes_with" if same type and nearby
            if (e1.entity_type === e2.entity_type && approxMiles < 10) {
              relationshipsToCreate.push({
                from_entity_id: e1.id,
                to_entity_id: e2.id,
                relationship_type: 'competes_with',
                strength: Math.max(0.1, 1 - (approxMiles / 10)),
                confidence: 0.7,
                evidence: [{ source: 'inference', reason: 'Same type in same market' }]
              });
            }
          }
        }

        // Insert relationships (ignore conflicts)
        if (relationshipsToCreate.length > 0) {
          for (const rel of relationshipsToCreate) {
            await supabase
              .from('core_relationships')
              .upsert(rel, { onConflict: 'from_entity_id,to_entity_id,relationship_type' });
          }
          newRelationships = relationshipsToCreate.length;
        }
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`[entity-resolver] Completed: ${newEntities} new, ${mergedEntities} merged, ${newRelationships} relationships, ${newFacts} facts in ${processingTime}ms`);

    // Update intelligence metrics
    await supabase.rpc('update_intelligence_metrics');

    return new Response(
      JSON.stringify({
        success: true,
        processed: records.length,
        new_entities: newEntities,
        merged_entities: mergedEntities,
        new_relationships: newRelationships,
        new_facts: newFacts,
        processing_time_ms: processingTime,
        results
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
