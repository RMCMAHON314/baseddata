// OMNISCIENT Data Fusion Engine
// Auto-enriches records with cross-source data and builds relationship graph

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Enrichment strategies by category
const ENRICHMENT_MAP: Record<string, string[]> = {
  WILDLIFE: ['WEATHER', 'REGULATIONS', 'GEOSPATIAL'],
  WEATHER: ['GEOSPATIAL'],
  GOVERNMENT: ['ECONOMIC', 'DEMOGRAPHICS', 'GEOSPATIAL'],
  MARINE: ['WEATHER', 'REGULATIONS', 'TRANSPORTATION'],
  TRANSPORTATION: ['GEOSPATIAL', 'WEATHER'],
  ECONOMIC: ['DEMOGRAPHICS', 'GOVERNMENT', 'GEOSPATIAL'],
  DEMOGRAPHICS: ['ECONOMIC', 'GOVERNMENT'],
  REGULATIONS: ['GOVERNMENT', 'GEOSPATIAL'],
  GEOSPATIAL: ['WEATHER', 'DEMOGRAPHICS'],
  ENERGY: ['ECONOMIC', 'REGULATIONS', 'GEOSPATIAL'],
  HEALTH: ['DEMOGRAPHICS', 'ECONOMIC', 'GEOSPATIAL'],
  RECREATION: ['WEATHER', 'GEOSPATIAL', 'REGULATIONS'],
  RESEARCH: ['ECONOMIC', 'GOVERNMENT', 'DEMOGRAPHICS'],
  IMAGERY: ['GEOSPATIAL', 'WEATHER'],
};

// Relationship predicates
const PREDICATES = {
  SPATIAL: ['near', 'within', 'overlaps', 'contains'],
  FUNCTIONAL: ['affects', 'regulates', 'supports', 'depends_on'],
  TEMPORAL: ['precedes', 'follows', 'concurrent_with'],
  SEMANTIC: ['related_to', 'similar_to', 'opposite_of'],
};

interface EnrichmentResult {
  enrichedCount: number;
  relationshipsCreated: number;
  knowledgeEdges: number;
  fusedRecords: number;
}

// Calculate distance between two coordinates (Haversine)
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Extract coordinates from GeoJSON geometry
function getCoords(geometry: any): [number, number] | null {
  if (!geometry) return null;
  if (geometry.type === 'Point' && geometry.coordinates) {
    return [geometry.coordinates[1], geometry.coordinates[0]]; // [lat, lon]
  }
  return null;
}

// Find nearby records for spatial relationships
async function findNearbyRecords(
  supabase: any,
  record: any,
  radiusMeters: number = 50000 // 50km default
): Promise<any[]> {
  const coords = getCoords(record.geometry);
  if (!coords) return [];

  const [lat, lon] = coords;
  
  // Get all records and filter by distance (simple approach for now)
  const { data: allRecords } = await supabase
    .from('records')
    .select('*')
    .neq('id', record.id)
    .limit(500);
  
  if (!allRecords) return [];
  
  return allRecords.filter((r: any) => {
    const rCoords = getCoords(r.geometry);
    if (!rCoords) return false;
    const distance = haversineDistance(lat, lon, rCoords[0], rCoords[1]);
    return distance <= radiusMeters;
  }).map((r: any) => ({
    ...r,
    distance: haversineDistance(lat, lon, getCoords(r.geometry)![0], getCoords(r.geometry)![1])
  }));
}

// Create relationships between records
async function createRelationships(
  supabase: any,
  sourceRecord: any,
  nearbyRecords: any[]
): Promise<number> {
  let created = 0;
  
  for (const target of nearbyRecords.slice(0, 20)) { // Limit to 20 relationships per record
    const relationType = target.category === sourceRecord.category ? 'near' : 'affects';
    const confidence = Math.max(0.1, 1 - (target.distance / 50000)); // Higher confidence for closer
    
    try {
      await supabase.rpc('create_record_relationship', {
        p_source_id: sourceRecord.id,
        p_target_id: target.id,
        p_relationship_type: relationType,
        p_confidence: confidence,
        p_distance: target.distance,
        p_metadata: {
          source_category: sourceRecord.category,
          target_category: target.category,
          enriched_at: new Date().toISOString(),
        }
      });
      created++;
    } catch (e) {
      // Relationship may already exist
    }
  }
  
  return created;
}

// Build knowledge graph edges
async function buildKnowledgeEdges(
  supabase: any,
  record: any,
  nearbyRecords: any[]
): Promise<number> {
  let edges = 0;
  
  // Record to Location edge
  const coords = getCoords(record.geometry);
  if (coords) {
    try {
      await supabase.rpc('add_knowledge_edge', {
        p_subject_type: 'record',
        p_subject_id: record.id,
        p_predicate: 'locatedAt',
        p_object_type: 'coordinates',
        p_object_id: `${coords[0].toFixed(4)},${coords[1].toFixed(4)}`,
        p_weight: 1.0,
        p_evidence: [{ source: record.source_id, timestamp: new Date().toISOString() }]
      });
      edges++;
    } catch (e) {}
  }
  
  // Record to Category edge
  try {
    await supabase.rpc('add_knowledge_edge', {
      p_subject_type: 'record',
      p_subject_id: record.id,
      p_predicate: 'belongsTo',
      p_object_type: 'category',
      p_object_id: record.category,
      p_weight: 1.0,
      p_evidence: [{ source: 'system' }]
    });
    edges++;
  } catch (e) {}
  
  // Cross-category relationships
  const crossCategoryRecords = nearbyRecords.filter(r => r.category !== record.category);
  for (const related of crossCategoryRecords.slice(0, 5)) {
    const predicate = determinePredicate(record.category, related.category);
    try {
      await supabase.rpc('add_knowledge_edge', {
        p_subject_type: 'record',
        p_subject_id: record.id,
        p_predicate: predicate,
        p_object_type: 'record',
        p_object_id: related.id,
        p_weight: 0.8,
        p_evidence: [{ distance_m: related.distance, timestamp: new Date().toISOString() }]
      });
      edges++;
    } catch (e) {}
  }
  
  return edges;
}

// Determine relationship predicate between categories
function determinePredicate(sourceCategory: string, targetCategory: string): string {
  const predicateMap: Record<string, Record<string, string>> = {
    WILDLIFE: { REGULATIONS: 'regulatedBy', WEATHER: 'affectedBy', GEOSPATIAL: 'locatedIn' },
    WEATHER: { GEOSPATIAL: 'coversArea' },
    GOVERNMENT: { REGULATIONS: 'issues', ECONOMIC: 'funds' },
    ECONOMIC: { DEMOGRAPHICS: 'serves', GOVERNMENT: 'fundedBy' },
    MARINE: { WEATHER: 'affectedBy', REGULATIONS: 'regulatedBy' },
    HEALTH: { DEMOGRAPHICS: 'serves', GOVERNMENT: 'regulatedBy' },
    ENERGY: { REGULATIONS: 'regulatedBy', ECONOMIC: 'impacts' },
  };
  
  return predicateMap[sourceCategory]?.[targetCategory] || 'relatedTo';
}

// Fuse data from multiple sources into enriched record
async function fuseRecordData(
  supabase: any,
  record: any,
  nearbyRecords: any[]
): Promise<boolean> {
  const enrichmentSources: string[] = [];
  const fusedProperties: Record<string, any> = {};
  
  // Group nearby records by category
  const byCategory: Record<string, any[]> = {};
  for (const r of nearbyRecords) {
    if (!byCategory[r.category]) byCategory[r.category] = [];
    byCategory[r.category].push(r);
  }
  
  // Extract enrichment data from each category
  for (const [category, records] of Object.entries(byCategory)) {
    const closest = records.sort((a, b) => a.distance - b.distance)[0];
    
    switch (category) {
      case 'WEATHER':
        fusedProperties.weather = {
          source: closest.source_id,
          conditions: closest.properties?.conditions || closest.name,
          temperature: closest.properties?.temperature,
          timestamp: closest.properties?.timestamp || closest.collected_at,
        };
        enrichmentSources.push('WEATHER');
        break;
      case 'DEMOGRAPHICS':
        fusedProperties.demographics = {
          population: closest.properties?.population,
          median_income: closest.properties?.median_income,
          area_name: closest.name,
        };
        enrichmentSources.push('DEMOGRAPHICS');
        break;
      case 'REGULATIONS':
        fusedProperties.regulations = {
          applicable_rules: closest.name,
          agency: closest.properties?.agency,
          effective_date: closest.properties?.effective_date,
        };
        enrichmentSources.push('REGULATIONS');
        break;
      case 'ECONOMIC':
        fusedProperties.economic = {
          indicator: closest.name,
          value: closest.properties?.value,
          trend: closest.properties?.trend,
        };
        enrichmentSources.push('ECONOMIC');
        break;
      case 'GOVERNMENT':
        fusedProperties.government = {
          entity: closest.name,
          type: closest.properties?.type,
          jurisdiction: closest.properties?.jurisdiction,
        };
        enrichmentSources.push('GOVERNMENT');
        break;
    }
  }
  
  if (enrichmentSources.length === 0) return false;
  
  try {
    await supabase.rpc('upsert_fused_record', {
      p_base_record_id: record.id,
      p_sources: enrichmentSources,
      p_properties: fusedProperties
    });
    return true;
  } catch (e) {
    console.error('Fusion error:', e);
    return false;
  }
}

// Use AI to generate semantic insights about relationships
async function generateAIInsights(
  records: any[],
  relationships: number
): Promise<string | null> {
  if (!LOVABLE_API_KEY || records.length < 5) return null;
  
  const categories = [...new Set(records.map(r => r.category))];
  const sampleRecords = records.slice(0, 10).map(r => ({
    name: r.name,
    category: r.category,
    location: getCoords(r.geometry)
  }));
  
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'system',
          content: 'You are a data analyst. Generate a brief insight about data relationships.'
        }, {
          role: 'user',
          content: `Analyze these ${records.length} records across ${categories.length} categories (${categories.join(', ')}) with ${relationships} discovered relationships. Sample: ${JSON.stringify(sampleRecords)}. Provide one key insight in 1-2 sentences.`
        }],
        max_tokens: 150,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    }
  } catch (e) {
    console.error('AI insight error:', e);
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const startTime = Date.now();
  
  try {
    const { record_ids, category, limit = 100, radius_km = 50 } = await req.json();
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Get records to enrich
    let query = supabase.from('records').select('*').limit(limit);
    
    if (record_ids?.length) {
      query = query.in('id', record_ids);
    } else if (category) {
      query = query.eq('category', category);
    }
    
    const { data: records, error } = await query;
    
    if (error || !records?.length) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: error?.message || 'No records found' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const result: EnrichmentResult = {
      enrichedCount: 0,
      relationshipsCreated: 0,
      knowledgeEdges: 0,
      fusedRecords: 0,
    };
    
    // Process each record
    for (const record of records) {
      // Find nearby records
      const nearbyRecords = await findNearbyRecords(supabase, record, radius_km * 1000);
      
      if (nearbyRecords.length > 0) {
        // Create spatial relationships
        result.relationshipsCreated += await createRelationships(supabase, record, nearbyRecords);
        
        // Build knowledge graph
        result.knowledgeEdges += await buildKnowledgeEdges(supabase, record, nearbyRecords);
        
        // Fuse data from multiple sources
        if (await fuseRecordData(supabase, record, nearbyRecords)) {
          result.fusedRecords++;
        }
        
        result.enrichedCount++;
      }
    }
    
    // Generate AI insights
    const aiInsight = await generateAIInsights(records, result.relationshipsCreated);
    
    // Update enrichment stats
    const categories = [...new Set(records.map(r => r.category))];
    for (const cat of categories) {
      try {
        await supabase.from('enrichment_stats').upsert({
          date: new Date().toISOString().split('T')[0],
          category: cat,
          records_enriched: result.enrichedCount,
          relationships_created: result.relationshipsCreated,
          fusion_operations: result.fusedRecords,
          avg_enrichment_time_ms: Math.round((Date.now() - startTime) / records.length),
        }, { onConflict: 'date,category' });
      } catch (e) {}
    }
    
    return new Response(JSON.stringify({
      success: true,
      ...result,
      aiInsight,
      processingTimeMs: Date.now() - startTime,
      recordsProcessed: records.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (e) {
    console.error('Enrichment error:', e);
    return new Response(JSON.stringify({ 
      success: false, 
      error: e instanceof Error ? e.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
