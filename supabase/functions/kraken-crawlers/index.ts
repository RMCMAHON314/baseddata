// ============================================================================
// 🦑 THE KRAKEN CRAWLERS
// Processes the discovery queue and bulk collects data from sources
// Works with hunters to create the infinite growth loop
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// CRAWLER CONFIGURATION
// ============================================================================

const CRAWLER_CONFIG = {
  DISCOVERY_BATCH_SIZE: 25,
  MAX_RETRIES: 3,
  TIMEOUT_MS: 15000,
  RATE_LIMIT_DELAY_MS: 500,
};

// ============================================================================
// TYPES
// ============================================================================

interface CrawlResult {
  records: number;
  entities: number;
  facts: number;
  relationships: number;
  duration: number;
  errors: string[];
}

interface SourceResult {
  records: number;
  success: boolean;
  error?: string;
}

// ============================================================================
// SOURCE COLLECTORS - These actually fetch data from APIs
// ============================================================================

async function collectFromUSASpending(query: Record<string, unknown>, supabase: any): Promise<SourceResult> {
  try {
    const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters: {
          keywords: query.keywords || [],
          recipient_search_text: query.recipient_name || '',
          time_period: [{ 
            start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0]
          }]
        },
        fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency', 'Description', 'Place of Performance State Code'],
        limit: 50
      })
    });

    if (!response.ok) return { records: 0, success: false, error: `HTTP ${response.status}` };

    const data = await response.json();
    const awards = data.results || [];

    if (awards.length > 0) {
      const records = awards.map((award: any) => ({
        source_id: 'usaspending',
        source_record_id: `usaspending-${award['Award ID']}`,
        name: award['Recipient Name'],
        category: 'Government',
        description: award['Description'],
        properties: {
          award_id: award['Award ID'],
          award_amount: award['Award Amount'],
          awarding_agency: award['Awarding Agency'],
          state: award['Place of Performance State Code']
        },
        quality_score: 0.9,
        collected_at: new Date().toISOString()
      }));

      await supabase.from('records').upsert(records, { onConflict: 'source_id,source_record_id' });
    }

    await supabase.rpc('update_source_health', { p_source_name: 'usaspending', p_success: true });
    return { records: awards.length, success: true };
  } catch (e) {
    await supabase.rpc('update_source_health', { p_source_name: 'usaspending', p_success: false });
    return { records: 0, success: false, error: e instanceof Error ? e.message : 'Unknown' };
  }
}

async function collectFromNPIRegistry(query: Record<string, unknown>, supabase: any): Promise<SourceResult> {
  try {
    const params = new URLSearchParams({
      version: '2.1',
      limit: '100'
    });
    
    if (query.name) params.append('name', query.name as string);
    if (query.state) params.append('state', query.state as string);
    if (query.city) params.append('city', query.city as string);
    if (query.npi) params.append('number', query.npi as string);

    const response = await fetch(`https://npiregistry.cms.hhs.gov/api/?${params}`);
    if (!response.ok) return { records: 0, success: false, error: `HTTP ${response.status}` };

    const data = await response.json();
    const providers = data.results || [];

    if (providers.length > 0) {
      const records = providers.map((provider: any) => {
        const basic = provider.basic || {};
        const address = provider.addresses?.[0] || {};
        
        return {
          source_id: 'npi_registry',
          source_record_id: `npi-${provider.number}`,
          name: basic.organization_name || `${basic.first_name} ${basic.last_name}`,
          category: 'Healthcare',
          city: address.city,
          state: address.state,
          properties: {
            npi: provider.number,
            entity_type: provider.enumeration_type,
            specialty: provider.taxonomies?.[0]?.desc,
            address: `${address.address_1} ${address.city}, ${address.state} ${address.postal_code}`,
            phone: address.telephone_number
          },
          quality_score: 0.95,
          collected_at: new Date().toISOString()
        };
      });

      await supabase.from('records').upsert(records, { onConflict: 'source_id,source_record_id' });
    }

    await supabase.rpc('update_source_health', { p_source_name: 'npi_registry', p_success: true });
    return { records: providers.length, success: true };
  } catch (e) {
    await supabase.rpc('update_source_health', { p_source_name: 'npi_registry', p_success: false });
    return { records: 0, success: false, error: e instanceof Error ? e.message : 'Unknown' };
  }
}

async function collectFromOSM(query: Record<string, unknown>, supabase: any): Promise<SourceResult> {
  try {
    const location = query.location as string || '';
    const category = query.category as string || 'amenity';
    
    const nominatimResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'BASEDDATA/10.0 Kraken Crawler' } }
    );
    
    if (!nominatimResponse.ok) return { records: 0, success: false, error: 'Geocoding failed' };
    
    const [geo] = await nominatimResponse.json();
    if (!geo) return { records: 0, success: false, error: 'Location not found' };

    const bbox = geo.boundingbox;
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"="${category}"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
        way["amenity"="${category}"](${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]});
      );
      out center 100;
    `;

    const overpassResponse = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery
    });

    if (!overpassResponse.ok) return { records: 0, success: false, error: `Overpass ${overpassResponse.status}` };

    const osmData = await overpassResponse.json();
    const elements = osmData.elements || [];

    if (elements.length > 0) {
      const records = elements.slice(0, 100).map((el: any) => {
        const lat = el.lat || el.center?.lat;
        const lon = el.lon || el.center?.lon;
        
        return {
          source_id: 'openstreetmap',
          source_record_id: `osm-${el.type}-${el.id}`,
          name: el.tags?.name || `${category} POI`,
          category: category,
          city: location,
          geometry: lat && lon ? { type: 'Point', coordinates: [lon, lat] } : null,
          properties: el.tags || {},
          quality_score: el.tags?.name ? 0.8 : 0.5,
          collected_at: new Date().toISOString()
        };
      });

      await supabase.from('records').upsert(records, { onConflict: 'source_id,source_record_id' });
    }

    await supabase.rpc('update_source_health', { p_source_name: 'openstreetmap', p_success: true });
    return { records: elements.length, success: true };
  } catch (e) {
    await supabase.rpc('update_source_health', { p_source_name: 'openstreetmap', p_success: false });
    return { records: 0, success: false, error: e instanceof Error ? e.message : 'Unknown' };
  }
}

async function collectFromEPAEcho(query: Record<string, unknown>, supabase: any): Promise<SourceResult> {
  try {
    const lat = query.latitude as number;
    const lng = query.longitude as number;
    const radius = query.radius as number || 5;

    const response = await fetch(
      `https://enviro.epa.gov/enviro/efservice/AIR_PROGRAM/LATITUDE/>${lat - 0.1}/LATITUDE/<${lat + 0.1}/LONGITUDE/>${lng - 0.1}/LONGITUDE/<${lng + 0.1}/JSON`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) return { records: 0, success: false, error: `HTTP ${response.status}` };

    const facilities = await response.json();
    
    if (Array.isArray(facilities) && facilities.length > 0) {
      const records = facilities.slice(0, 50).map((fac: any) => ({
        source_id: 'epa_echo',
        source_record_id: `epa-${fac.REGISTRY_ID || fac.PGMFA_CODE}`,
        name: fac.FAC_NAME || fac.FACILITY_NAME || 'Unknown Facility',
        category: 'Environmental',
        geometry: fac.LATITUDE && fac.LONGITUDE ? {
          type: 'Point',
          coordinates: [parseFloat(fac.LONGITUDE), parseFloat(fac.LATITUDE)]
        } : null,
        properties: {
          epa_id: fac.REGISTRY_ID,
          program: fac.PGMFA_CODE,
          status: fac.AIR_POLLUTANT_CLASS
        },
        quality_score: 0.85,
        collected_at: new Date().toISOString()
      }));

      await supabase.from('records').upsert(records, { onConflict: 'source_id,source_record_id' });
    }

    await supabase.rpc('update_source_health', { p_source_name: 'epa_echo', p_success: true });
    return { records: facilities?.length || 0, success: true };
  } catch (e) {
    await supabase.rpc('update_source_health', { p_source_name: 'epa_echo', p_success: false });
    return { records: 0, success: false, error: e instanceof Error ? e.message : 'Unknown' };
  }
}

// ============================================================================
// MAIN CRAWLER FUNCTIONS
// ============================================================================

async function processDiscoveryQueue(supabase: any): Promise<CrawlResult> {
  const start = Date.now();
  const errors: string[] = [];
  let totalRecords = 0;

  // Get pending discoveries, highest priority first
  const { data: discoveries } = await supabase
    .from('flywheel_discovery_queue')
    .select('*')
    .eq('status', 'pending')
    .order('priority', { ascending: false })
    .limit(CRAWLER_CONFIG.DISCOVERY_BATCH_SIZE);

  for (const discovery of discoveries || []) {
    try {
      // Mark as processing
      await supabase
        .from('flywheel_discovery_queue')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', discovery.id);

      let result: SourceResult = { records: 0, success: false };
      
      switch (discovery.target_source) {
        case 'usaspending':
          result = await collectFromUSASpending(discovery.target_query, supabase);
          break;
        case 'npi_registry':
          result = await collectFromNPIRegistry(discovery.target_query, supabase);
          break;
        case 'openstreetmap':
          result = await collectFromOSM(discovery.target_query, supabase);
          break;
        case 'epa_echo':
          result = await collectFromEPAEcho(discovery.target_query, supabase);
          break;
        default:
          console.log(`Unknown source: ${discovery.target_source}`);
          result = { records: 0, success: false, error: 'Unknown source' };
      }

      totalRecords += result.records;

      // Mark as completed
      await supabase
        .from('flywheel_discovery_queue')
        .update({ 
          status: result.success ? 'completed' : 'failed', 
          completed_at: new Date().toISOString(),
          records_collected: result.records,
          error_message: result.error
        })
        .eq('id', discovery.id);

      // Rate limiting
      await new Promise(r => setTimeout(r, CRAWLER_CONFIG.RATE_LIMIT_DELAY_MS));

    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Unknown error';
      errors.push(`Discovery ${discovery.id}: ${errMsg}`);
      
      await supabase
        .from('flywheel_discovery_queue')
        .update({ 
          status: 'failed', 
          error_message: errMsg,
          completed_at: new Date().toISOString()
        })
        .eq('id', discovery.id);
    }
  }

  // Trigger entity resolution and fact extraction if we collected records
  if (totalRecords > 0) {
    // Entity resolution
    await supabase.functions.invoke('entity-resolver', {
      body: { backfill: true, batch_size: 50 }
    }).catch(() => {});

    // Fact extraction
    await supabase.functions.invoke('core-extract-facts', {
      body: { batch_size: 50, link_orphans: true }
    }).catch(() => {});
  }

  return {
    records: totalRecords,
    entities: 0,
    facts: 0,
    relationships: 0,
    duration: Date.now() - start,
    errors
  };
}

async function runFederalDaily(supabase: any): Promise<CrawlResult> {
  const start = Date.now();
  const errors: string[] = [];
  let totalRecords = 0;

  // Crawl recent USASpending awards
  try {
    const result = await collectFromUSASpending({ keywords: ['technology', 'healthcare', 'construction'] }, supabase);
    totalRecords += result.records;
  } catch (e) {
    errors.push(`USASpending: ${e instanceof Error ? e.message : 'Unknown'}`);
  }

  // Run entity resolution
  const { data: resolveResult } = await supabase.functions.invoke('entity-resolver', {
    body: { backfill: true, batch_size: 100 }
  }).catch(() => ({ data: null }));

  return {
    records: totalRecords,
    entities: resolveResult?.entities_created || 0,
    facts: 0,
    relationships: 0,
    duration: Date.now() - start,
    errors
  };
}

async function runHealthcareWeekly(supabase: any): Promise<CrawlResult> {
  const start = Date.now();
  const errors: string[] = [];
  let totalRecords = 0;

  // Get states with healthcare entities
  const { data: states } = await supabase
    .from('core_entities')
    .select('state')
    .eq('entity_type', 'facility')
    .not('state', 'is', null);

  const uniqueStates = [...new Set((states || []).map((s: any) => s.state))].slice(0, 5);

  for (const state of uniqueStates) {
    try {
      const result = await collectFromNPIRegistry({ state }, supabase);
      totalRecords += result.records;
    } catch (e) {
      errors.push(`NPI ${state}: ${e instanceof Error ? e.message : 'Unknown'}`);
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  return {
    records: totalRecords,
    entities: 0,
    facts: 0,
    relationships: 0,
    duration: Date.now() - start,
    errors
  };
}

async function runGeographicExpansion(supabase: any): Promise<CrawlResult> {
  const start = Date.now();
  const errors: string[] = [];
  let totalRecords = 0;

  // Get low coverage areas
  const { data: lowCoverage } = await supabase.rpc('find_low_coverage_areas');

  const categories = ['hospital', 'school', 'bank', 'pharmacy'];

  for (const area of (lowCoverage || []).slice(0, 3)) {
    for (const category of categories.slice(0, 2)) {
      try {
        const result = await collectFromOSM({ location: area.area_name, category }, supabase);
        totalRecords += result.records;
      } catch (e) {
        errors.push(`OSM ${area.area_name} ${category}: ${e instanceof Error ? e.message : 'Unknown'}`);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return {
    records: totalRecords,
    entities: 0,
    facts: 0,
    relationships: 0,
    duration: Date.now() - start,
    errors
  };
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
    const { crawler_type } = await req.json().catch(() => ({ crawler_type: 'discovery_queue' }));
    
    console.log(`🔄 [KRAKEN CRAWLERS] Running: ${crawler_type}`);

    let results: CrawlResult;

    switch (crawler_type) {
      case 'federal_daily':
        results = await runFederalDaily(supabase);
        break;
      case 'healthcare_weekly':
        results = await runHealthcareWeekly(supabase);
        break;
      case 'geographic_expansion':
        results = await runGeographicExpansion(supabase);
        break;
      case 'discovery_queue':
      default:
        results = await processDiscoveryQueue(supabase);
    }

    // Log crawl results
    await supabase.rpc('log_kraken_crawl', {
      p_crawler_type: crawler_type,
      p_records: results.records,
      p_entities: results.entities,
      p_facts: results.facts,
      p_relationships: results.relationships,
      p_duration_ms: results.duration,
      p_errors: results.errors,
      p_metadata: {}
    });

    console.log(`🔄 [KRAKEN CRAWLERS] Complete: ${results.records} records in ${results.duration}ms`);

    return new Response(
      JSON.stringify({ success: results.errors.length === 0, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('🔄 [KRAKEN CRAWLERS] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
