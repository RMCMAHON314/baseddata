// ============================================================================
// BASED DATA v10.0 - Discovery Processor Edge Function
// HARDENED: Exponential Backoff, Circuit Breaker, Dead Letter Queue
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_AI_URL = 'https://api-prod.lovable.dev/ai/generate';
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') || '';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY_SECONDS: 60,
  VALIDATION_TIMEOUT_MS: 10000,
  TEST_TIMEOUT_MS: 15000,
  AI_TIMEOUT_MS: 30000,
  CIRCUIT_BREAKER_THRESHOLD: 5,
  BATCH_SIZE: 5,
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SourceDiscovery {
  id: string;
  trigger_type: string;
  trigger_prompt?: string;
  target_api_url?: string;
  target_api_name: string;
  target_description?: string;
  inferred_categories: string[];
  inferred_keywords: string[];
  confidence_score: number;
  priority: number;
  status: string;
  generation_attempts: number;
  error_count: number;
  backoff_multiplier: number;
  retry_after?: string;
}

interface DynamicCollector {
  name: string;
  description: string;
  api_url: string;
  api_method: string;
  headers: Record<string, string>;
  params_template: Record<string, string>;
  response_mapping: {
    features_path: string;
    lat_path: string;
    lng_path: string;
    name_path: string;
    description_path?: string;
    id_path?: string;
  };
  categories: string[];
  keywords: string[];
}

interface ProcessingResult {
  discovery_id: string;
  status: 'approved' | 'rejected' | 'failed' | 'circuit_blocked' | 'dead_letter';
  collector_id?: string;
  error?: string;
  records_collected?: number;
  retry_after?: string;
}

// ============================================================================
// CIRCUIT BREAKER UTILITIES
// ============================================================================

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

async function checkCircuitBreaker(supabase: any, domain: string): Promise<{ isOpen: boolean; state: string; retryAfter?: string }> {
  try {
    const { data, error } = await supabase.rpc('check_circuit_breaker', { p_domain: domain });
    if (error || !data?.[0]) return { isOpen: false, state: 'closed' };
    return {
      isOpen: data[0].is_open,
      state: data[0].state,
      retryAfter: data[0].retry_after,
    };
  } catch {
    return { isOpen: false, state: 'closed' };
  }
}

async function recordCircuitResult(supabase: any, domain: string, success: boolean): Promise<void> {
  try {
    await supabase.rpc('record_circuit_result', { p_domain: domain, p_success: success });
  } catch (e) {
    console.error('Failed to record circuit result:', e);
  }
}

// ============================================================================
// METRICS & OBSERVABILITY
// ============================================================================

async function recordMetric(supabase: any, type: string, name: string, value: number, dimensions: Record<string, any> = {}): Promise<void> {
  try {
    await supabase.rpc('record_flywheel_metric', {
      p_type: type,
      p_name: name,
      p_value: value,
      p_dimensions: dimensions,
    });
  } catch (e) {
    console.error('Failed to record metric:', e);
  }
}

// ============================================================================
// EXPONENTIAL BACKOFF
// ============================================================================

function calculateRetryDelay(attempt: number, baseDelay: number = CONFIG.BASE_DELAY_SECONDS): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), 3600);
  const jitter = Math.floor(Math.random() * delay * 0.25);
  return delay + jitter;
}

async function scheduleRetry(supabase: any, discoveryId: string, attempt: number): Promise<string> {
  const delaySeconds = calculateRetryDelay(attempt);
  const retryAfter = new Date(Date.now() + delaySeconds * 1000).toISOString();
  
  await supabase
    .from('source_discoveries')
    .update({
      retry_after: retryAfter,
      backoff_multiplier: attempt + 1,
      last_error_at: new Date().toISOString(),
    })
    .eq('id', discoveryId);
  
  return retryAfter;
}

// ============================================================================
// DEAD LETTER QUEUE
// ============================================================================

async function moveToDeadLetter(supabase: any, discoveryId: string, reason: string): Promise<void> {
  try {
    await supabase.rpc('move_to_dead_letter', {
      p_discovery_id: discoveryId,
      p_reason: reason,
    });
    console.log(`☠️ Discovery ${discoveryId} moved to dead letter queue: ${reason}`);
  } catch (e) {
    console.error('Failed to move to dead letter:', e);
  }
}

// ============================================================================
// VALIDATION PHASE (with Circuit Breaker)
// ============================================================================

async function validateApiEndpoint(
  supabase: any,
  discovery: SourceDiscovery
): Promise<{ valid: boolean; details: Record<string, any>; circuitBlocked?: boolean }> {
  if (!discovery.target_api_url) {
    return { valid: false, details: { error: 'No API URL provided' } };
  }

  const domain = extractDomain(discovery.target_api_url);
  
  // Check circuit breaker
  const circuit = await checkCircuitBreaker(supabase, domain);
  if (circuit.isOpen) {
    return {
      valid: false,
      details: { error: 'Circuit breaker open', retryAfter: circuit.retryAfter },
      circuitBlocked: true,
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.VALIDATION_TIMEOUT_MS);
    
    const response = await fetch(discovery.target_api_url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'BASEDDATA/10.0 Discovery Validator' },
    });
    
    clearTimeout(timeout);
    
    const isValid = response.ok || response.status === 405;
    await recordCircuitResult(supabase, domain, isValid);
    
    return {
      valid: isValid,
      details: {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        accessible: true,
      },
    };
  } catch (error) {
    await recordCircuitResult(supabase, domain, false);
    return {
      valid: false,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        accessible: false,
      },
    };
  }
}

// ============================================================================
// AI COLLECTOR GENERATION (GENESIS) with Timeout
// ============================================================================

// ============================================================================
// KNOWLEDGE-BASED COLLECTOR TEMPLATES
// When AI is unavailable, use pre-defined working APIs
// ============================================================================

const KNOWN_API_TEMPLATES: Record<string, DynamicCollector> = {
  'WILDLIFE': {
    name: 'iNaturalist Observations',
    description: 'Wildlife observations from citizen scientists',
    api_url: 'https://api.inaturalist.org/v1/observations?lat={lat}&lng={lng}&radius=50&per_page=100',
    api_method: 'GET',
    headers: {},
    params_template: {},
    response_mapping: {
      features_path: 'results',
      lat_path: 'geojson.coordinates.1',
      lng_path: 'geojson.coordinates.0',
      name_path: 'species_guess',
      description_path: 'description',
      id_path: 'id',
    },
    categories: ['WILDLIFE'],
    keywords: ['wildlife', 'species', 'observations', 'nature'],
  },
  'WEATHER': {
    name: 'NOAA Weather Stations',
    description: 'Weather station data from NOAA',
    api_url: 'https://api.weather.gov/points/{lat},{lng}',
    api_method: 'GET',
    headers: { 'User-Agent': 'BASEDDATA/10.0' },
    params_template: {},
    response_mapping: {
      features_path: 'properties',
      lat_path: 'relativeLocation.geometry.coordinates.1',
      lng_path: 'relativeLocation.geometry.coordinates.0',
      name_path: 'relativeLocation.properties.city',
      description_path: 'forecast',
      id_path: 'gridId',
    },
    categories: ['WEATHER'],
    keywords: ['weather', 'forecast', 'temperature', 'climate'],
  },
  'RECREATION': {
    name: 'NPS Park Facilities',
    description: 'National Park Service facilities and parks',
    api_url: 'https://developer.nps.gov/api/v1/parks?limit=50&api_key=DEMO_KEY',
    api_method: 'GET',
    headers: {},
    params_template: {},
    response_mapping: {
      features_path: 'data',
      lat_path: 'latitude',
      lng_path: 'longitude',
      name_path: 'fullName',
      description_path: 'description',
      id_path: 'parkCode',
    },
    categories: ['RECREATION'],
    keywords: ['recreation', 'parks', 'camping', 'outdoors', 'national parks'],
  },
  'GOVERNMENT': {
    name: 'Data.gov Datasets',
    description: 'US Government open datasets catalog',
    api_url: 'https://catalog.data.gov/api/3/action/package_search?rows=50',
    api_method: 'GET',
    headers: {},
    params_template: {},
    response_mapping: {
      features_path: 'result.results',
      lat_path: '',
      lng_path: '',
      name_path: 'title',
      description_path: 'notes',
      id_path: 'id',
    },
    categories: ['GOVERNMENT'],
    keywords: ['government', 'federal', 'datasets', 'open data'],
  },
  'HEALTH': {
    name: 'FDA Drug Events',
    description: 'FDA adverse drug event reports',
    api_url: 'https://api.fda.gov/drug/event.json?limit=50',
    api_method: 'GET',
    headers: {},
    params_template: {},
    response_mapping: {
      features_path: 'results',
      lat_path: '',
      lng_path: '',
      name_path: 'patient.drug.0.medicinalproduct',
      description_path: 'patient.reaction.0.reactionmeddrapt',
      id_path: 'safetyreportid',
    },
    categories: ['HEALTH'],
    keywords: ['health', 'fda', 'drugs', 'safety', 'medical'],
  },
  'MARINE': {
    name: 'NOAA Tide Stations',
    description: 'Ocean tide and current stations',
    api_url: 'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=waterlevels',
    api_method: 'GET',
    headers: {},
    params_template: {},
    response_mapping: {
      features_path: 'stations',
      lat_path: 'lat',
      lng_path: 'lng',
      name_path: 'name',
      description_path: 'state',
      id_path: 'id',
    },
    categories: ['MARINE'],
    keywords: ['ocean', 'marine', 'tides', 'coastal'],
  },
  'GEOSPATIAL': {
    name: 'USGS Geographic Names',
    description: 'Geographic place names from USGS GNIS',
    api_url: 'https://geonames.usgs.gov/api/1.0/features?featureName=park&stateAbbrev=CA&limit=50',
    api_method: 'GET',
    headers: {},
    params_template: {},
    response_mapping: {
      features_path: 'features',
      lat_path: 'geometry.coordinates.1',
      lng_path: 'geometry.coordinates.0',
      name_path: 'properties.name',
      description_path: 'properties.class',
      id_path: 'properties.gaz_id',
    },
    categories: ['GEOSPATIAL'],
    keywords: ['geospatial', 'places', 'locations', 'usgs', 'gnis'],
  },
  'ECONOMIC': {
    name: 'World Bank Indicators',
    description: 'World Bank economic development indicators',
    api_url: 'https://api.worldbank.org/v2/country/US/indicator/NY.GDP.MKTP.CD?format=json&per_page=50',
    api_method: 'GET',
    headers: {},
    params_template: {},
    response_mapping: {
      features_path: '1',
      lat_path: '',
      lng_path: '',
      name_path: 'country.value',
      description_path: 'value',
      id_path: 'date',
    },
    categories: ['ECONOMIC'],
    keywords: ['economic', 'gdp', 'finance', 'world bank', 'development'],
  },
  'TRANSPORTATION': {
    name: 'FAA Airport Status',
    description: 'FAA airport delay and status information',
    api_url: 'https://soa.smext.faa.gov/asws/api/airport/status/ATL',
    api_method: 'GET',
    headers: {},
    params_template: {},
    response_mapping: {
      features_path: '',
      lat_path: '',
      lng_path: '',
      name_path: 'Name',
      description_path: 'Delay',
      id_path: 'IATA',
    },
    categories: ['TRANSPORTATION'],
    keywords: ['flights', 'aviation', 'airports', 'faa', 'delays'],
  },
  'DEMOGRAPHICS': {
    name: 'US Census Population',
    description: 'US Census Bureau population estimates',
    api_url: 'https://api.census.gov/data/2021/pep/population?get=NAME,POP&for=state:*',
    api_method: 'GET',
    headers: {},
    params_template: {},
    response_mapping: {
      features_path: '',
      lat_path: '',
      lng_path: '',
      name_path: '0',
      description_path: '1',
      id_path: '2',
    },
    categories: ['DEMOGRAPHICS'],
    keywords: ['census', 'population', 'demographics', 'statistics'],
  },
  'RESEARCH': {
    name: 'arXiv Research Papers',
    description: 'Open access scientific research papers',
    api_url: 'https://export.arxiv.org/api/query?search_query=all:data&max_results=50',
    api_method: 'GET',
    headers: {},
    params_template: {},
    response_mapping: {
      features_path: 'feed.entry',
      lat_path: '',
      lng_path: '',
      name_path: 'title',
      description_path: 'summary',
      id_path: 'id',
    },
    categories: ['RESEARCH'],
    keywords: ['research', 'publications', 'science', 'arxiv', 'papers'],
  },
  'ENERGY': {
    name: 'NREL Solar Resource',
    description: 'National Renewable Energy Laboratory solar data',
    api_url: 'https://developer.nrel.gov/api/solar/solar_resource/v1.json?api_key=DEMO_KEY&lat=40&lon=-105',
    api_method: 'GET',
    headers: {},
    params_template: {},
    response_mapping: {
      features_path: 'outputs',
      lat_path: '',
      lng_path: '',
      name_path: 'avg_dni.monthly.jan',
      description_path: 'avg_ghi.annual',
      id_path: '',
    },
    categories: ['ENERGY'],
    keywords: ['energy', 'solar', 'renewable', 'nrel'],
  },
  'REGULATIONS': {
    name: 'Federal Register Docs',
    description: 'US Federal regulations and documents',
    api_url: 'https://www.federalregister.gov/api/v1/documents.json?per_page=50',
    api_method: 'GET',
    headers: {},
    params_template: {},
    response_mapping: {
      features_path: 'results',
      lat_path: '',
      lng_path: '',
      name_path: 'title',
      description_path: 'abstract',
      id_path: 'document_number',
    },
    categories: ['REGULATIONS'],
    keywords: ['regulations', 'federal', 'rules', 'legal'],
  },
  'IMAGERY': {
    name: 'NASA EONET Events',
    description: 'Earth Observatory natural events from NASA',
    api_url: 'https://eonet.gsfc.nasa.gov/api/v3/events?limit=50&status=open',
    api_method: 'GET',
    headers: {},
    params_template: {},
    response_mapping: {
      features_path: 'events',
      lat_path: 'geometry.0.coordinates.1',
      lng_path: 'geometry.0.coordinates.0',
      name_path: 'title',
      description_path: 'categories.0.title',
      id_path: 'id',
    },
    categories: ['IMAGERY'],
    keywords: ['satellite', 'imagery', 'nasa', 'earth observation', 'events'],
  },
};

async function generateCollector(discovery: SourceDiscovery): Promise<DynamicCollector | null> {
  // First, try to use a known template for the category
  const primaryCategory = discovery.inferred_categories[0];
  const template = KNOWN_API_TEMPLATES[primaryCategory];
  
  if (template) {
    console.log(`Using known template for ${primaryCategory}`);
    return {
      ...template,
      name: `${discovery.target_api_name} - ${template.name}`,
      keywords: [...template.keywords, ...discovery.inferred_keywords],
    };
  }

  // Then try AI generation
  const systemPrompt = `You are an EXPERT API integration engineer. Generate a collector configuration for the provided API.
Return ONLY valid JSON:
{
  "name": "Source Name",
  "description": "What data it provides",
  "api_url": "https://api.example.com/endpoint?lat={lat}&lng={lng}",
  "api_method": "GET",
  "headers": {},
  "params_template": {},
  "response_mapping": {
    "features_path": "data.results",
    "lat_path": "latitude",
    "lng_path": "longitude", 
    "name_path": "title",
    "description_path": "description",
    "id_path": "id"
  },
  "categories": ["GEOSPATIAL"],
  "keywords": ["relevant", "keywords"]
}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.AI_TIMEOUT_MS);

    const userPrompt = `Generate a collector for: ${discovery.target_api_name}
URL: ${discovery.target_api_url || 'Find best public API'}
Categories: ${discovery.inferred_categories.join(', ')}
Keywords: ${discovery.inferred_keywords.join(', ')}`;

    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error('AI generation failed:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No valid JSON in AI response');
      return null;
    }
    
    return JSON.parse(jsonMatch[0]) as DynamicCollector;
  } catch (error) {
    console.error('Collector generation error:', error);
    // Return null - the template fallback above should catch most cases
    return null;
  }
}

// ============================================================================
// TESTING PHASE (with Circuit Breaker)
// ============================================================================

async function testCollector(
  supabase: any,
  collector: DynamicCollector
): Promise<{ success: boolean; recordCount: number; error?: string }> {
  const domain = extractDomain(collector.api_url);
  
  // Check circuit breaker
  const circuit = await checkCircuitBreaker(supabase, domain);
  if (circuit.isOpen) {
    return { success: false, recordCount: 0, error: 'Circuit breaker open' };
  }

  try {
    let testUrl = collector.api_url
      .replace('{lat}', '40.7128')
      .replace('{lng}', '-74.0060')
      .replace('{bbox}', '-74.1,40.6,-73.9,40.8')
      .replace('{minlat}', '40.6')
      .replace('{maxlat}', '40.8')
      .replace('{minlng}', '-74.1')
      .replace('{maxlng}', '-73.9')
      .replace('{query}', 'test')
      .replace('{keyword}', 'data')
      .replace('{location}', 'New York');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.TEST_TIMEOUT_MS);
    
    const response = await fetch(testUrl, {
      method: collector.api_method,
      headers: { 
        'User-Agent': 'BASEDDATA/10.0 Collector Test',
        ...collector.headers,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      await recordCircuitResult(supabase, domain, false);
      return { success: false, recordCount: 0, error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    
    let features = data;
    for (const key of collector.response_mapping.features_path.split('.')) {
      features = features?.[key];
    }
    
    const recordCount = Array.isArray(features) ? features.length : (features ? 1 : 0);
    await recordCircuitResult(supabase, domain, recordCount > 0);
    
    return { success: recordCount > 0, recordCount };
  } catch (error) {
    await recordCircuitResult(supabase, domain, false);
    return {
      success: false,
      recordCount: 0,
      error: error instanceof Error ? error.message : 'Test failed',
    };
  }
}

// ============================================================================
// MAIN PROCESSING PIPELINE (HARDENED)
// ============================================================================

async function processDiscovery(supabase: any, discovery: SourceDiscovery): Promise<ProcessingResult> {
  const startTime = Date.now();
  const attempt = discovery.backoff_multiplier || 0;
  
  // Check if we've exceeded max retries - move to dead letter
  if (discovery.error_count >= CONFIG.MAX_RETRIES || discovery.generation_attempts >= CONFIG.MAX_RETRIES + 2) {
    const reason = `Exceeded retry limits (errors: ${discovery.error_count}, attempts: ${discovery.generation_attempts})`;
    await moveToDeadLetter(supabase, discovery.id, reason);
    await recordMetric(supabase, 'discovery', 'dead_letter', 1, { reason });
    return { discovery_id: discovery.id, status: 'dead_letter', error: 'Max retries exceeded' };
  }
  
  // Check if we should wait for retry
  if (discovery.retry_after && new Date(discovery.retry_after) > new Date()) {
    return {
      discovery_id: discovery.id,
      status: 'failed',
      error: 'Waiting for retry window',
      retry_after: discovery.retry_after,
    };
  }

  try {
    // Phase 1: Validation with Circuit Breaker
    await supabase.rpc('update_discovery_status', {
      p_discovery_id: discovery.id,
      p_status: 'validating',
    });
    
    if (discovery.target_api_url) {
      const validation = await validateApiEndpoint(supabase, discovery);
      
      if (validation.circuitBlocked) {
        await supabase
          .from('source_discoveries')
          .update({ circuit_breaker_blocked: true })
          .eq('id', discovery.id);
        
        const retryAfter = await scheduleRetry(supabase, discovery.id, attempt);
        return {
          discovery_id: discovery.id,
          status: 'circuit_blocked',
          error: 'Circuit breaker open',
          retry_after: retryAfter,
        };
      }
      
      if (!validation.valid) {
        console.log('Validation failed, proceeding to genesis:', validation.details.error);
      }
    }
    
    // Phase 2: AI Collector Generation
    await supabase.rpc('update_discovery_status', {
      p_discovery_id: discovery.id,
      p_status: 'generating',
    });
    
    const collector = await generateCollector(discovery);
    if (!collector) {
      const retryAfter = await scheduleRetry(supabase, discovery.id, attempt);
      await supabase.rpc('update_discovery_status', {
        p_discovery_id: discovery.id,
        p_status: 'pending',
        p_error_message: 'AI generation failed, scheduled retry',
      });
      return {
        discovery_id: discovery.id,
        status: 'failed',
        error: 'Generation failed',
        retry_after: retryAfter,
      };
    }
    
    // Phase 3: Testing with Circuit Breaker
    await supabase.rpc('update_discovery_status', {
      p_discovery_id: discovery.id,
      p_status: 'testing',
    });
    
    const testResult = await testCollector(supabase, collector);
    if (!testResult.success) {
      const retryAfter = await scheduleRetry(supabase, discovery.id, attempt);
      await supabase.rpc('update_discovery_status', {
        p_discovery_id: discovery.id,
        p_status: 'pending',
        p_error_message: testResult.error || 'Test returned no records',
      });
      return {
        discovery_id: discovery.id,
        status: 'failed',
        error: testResult.error,
        retry_after: retryAfter,
      };
    }
    
    // Phase 4: Archive collector to database
    const { data: collectorData, error: insertError } = await supabase
      .from('dynamic_collectors')
      .insert({
        name: collector.name,
        description: collector.description,
        api_url: collector.api_url,
        api_method: collector.api_method,
        headers: collector.headers,
        params_template: collector.params_template,
        response_mapping: collector.response_mapping,
        categories: collector.categories,
        keywords: collector.keywords,
        created_by_prompt: discovery.trigger_prompt,
        is_active: true,
      })
      .select()
      .single();
    
    if (insertError) {
      await supabase.rpc('update_discovery_status', {
        p_discovery_id: discovery.id,
        p_status: 'failed',
        p_error_message: insertError.message,
      });
      return { discovery_id: discovery.id, status: 'failed', error: insertError.message };
    }
    
    // Phase 5: Approve
    await supabase.rpc('update_discovery_status', {
      p_discovery_id: discovery.id,
      p_status: 'approved',
      p_generated_collector_id: collectorData.id,
    });
    
    // Record success metrics
    const processingTime = Date.now() - startTime;
    await recordMetric(supabase, 'discovery', 'processing_time_ms', processingTime, { status: 'approved' });
    await recordMetric(supabase, 'discovery', 'records_collected', testResult.recordCount, { collector: collector.name });
    
    console.log(`✅ Discovery approved: ${collector.name} (${testResult.recordCount} records in ${processingTime}ms)`);
    
    return {
      discovery_id: discovery.id,
      status: 'approved',
      collector_id: collectorData.id,
      records_collected: testResult.recordCount,
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Processing failed';
    const retryAfter = await scheduleRetry(supabase, discovery.id, attempt);
    
    await supabase.rpc('update_discovery_status', {
      p_discovery_id: discovery.id,
      p_status: 'pending',
      p_error_message: errorMessage,
    });
    
    await recordMetric(supabase, 'discovery', 'error', 1, { error: errorMessage });
    
    return {
      discovery_id: discovery.id,
      status: 'failed',
      error: errorMessage,
      retry_after: retryAfter,
    };
  }
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
    const { action, discovery_id, batch_size = CONFIG.BATCH_SIZE } = await req.json().catch(() => ({}));

    // Record invocation metric
    await recordMetric(supabase, 'invocation', 'discovery_processor', 1, { action: action || 'process_queue' });

    if (action === 'health') {
      const { data: health } = await supabase.rpc('get_flywheel_health');
      return new Response(JSON.stringify({ success: true, health }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'process_single' && discovery_id) {
      const { data: discovery, error } = await supabase
        .from('source_discoveries')
        .select('*')
        .eq('id', discovery_id)
        .single();
      
      if (error || !discovery) {
        return new Response(JSON.stringify({ error: 'Discovery not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const result = await processDiscovery(supabase, discovery as SourceDiscovery);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (action === 'process_queue' || !action) {
      // Process pending discoveries respecting retry_after
      const { data: discoveries, error } = await supabase
        .from('source_discoveries')
        .select('*')
        .eq('status', 'pending')
        .lt('generation_attempts', CONFIG.MAX_RETRIES)
        .or(`retry_after.is.null,retry_after.lte.${new Date().toISOString()}`)
        .eq('circuit_breaker_blocked', false)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(batch_size);
      
      if (error) throw error;
      
      if (!discoveries?.length) {
        return new Response(JSON.stringify({
          success: true,
          message: 'No pending discoveries ready for processing',
          processed: 0,
          approved: 0,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const results: ProcessingResult[] = [];
      
      // Process sequentially to avoid overwhelming external APIs
      for (const discovery of discoveries as SourceDiscovery[]) {
        const result = await processDiscovery(supabase, discovery);
        results.push(result);
        
        // Small delay between discoveries to be nice to external APIs
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const approved = results.filter(r => r.status === 'approved').length;
      const failed = results.filter(r => r.status === 'failed').length;
      const deadLetter = results.filter(r => r.status === 'dead_letter').length;
      
      await recordMetric(supabase, 'batch', 'processed', results.length);
      await recordMetric(supabase, 'batch', 'approved', approved);
      await recordMetric(supabase, 'batch', 'failed', failed);
      
      return new Response(JSON.stringify({
        success: true,
        processed: results.length,
        approved,
        failed,
        dead_letter: deadLetter,
        results,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (action === 'analyze_gaps') {
      const { data: gaps, error } = await supabase.rpc('analyze_data_gaps');
      if (error) throw error;
      
      let queued = 0;
      for (const gap of gaps || []) {
        if (gap.gap_type === 'categorical' && gap.target_category) {
          await supabase.rpc('queue_discovery', {
            p_trigger_type: 'gap_analysis',
            p_target_api_name: `${gap.target_category} Data Source`,
            p_target_description: gap.gap_description,
            p_inferred_categories: [gap.target_category],
            p_inferred_keywords: gap.target_keywords,
            p_priority: Math.min(10, Math.floor(gap.severity * 10)),
            p_confidence: 0.6,
          });
          queued++;
        }
      }
      
      await recordMetric(supabase, 'gap_analysis', 'gaps_found', gaps?.length || 0);
      await recordMetric(supabase, 'gap_analysis', 'discoveries_queued', queued);
      
      return new Response(JSON.stringify({
        success: true,
        gaps_found: gaps?.length || 0,
        discoveries_queued: queued,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'recover_dead_letter') {
      // Recover eligible dead letter items
      const { data: dlq } = await supabase
        .from('discovery_dead_letter')
        .select('*')
        .eq('can_retry', true)
        .is('recovered_at', null)
        .or(`retry_after.is.null,retry_after.lte.${new Date().toISOString()}`)
        .limit(5);
      
      let recovered = 0;
      for (const item of dlq || []) {
        // Re-queue the discovery
        const payload = item.original_payload;
        await supabase.rpc('queue_discovery', {
          p_trigger_type: 'dead_letter_recovery',
          p_trigger_id: item.id,
          p_target_api_name: payload.target_api_name,
          p_target_api_url: payload.target_api_url,
          p_target_description: `[RECOVERED] ${payload.target_description || ''}`,
          p_inferred_categories: payload.inferred_categories,
          p_inferred_keywords: payload.inferred_keywords,
          p_priority: Math.min(payload.priority + 2, 10),
          p_confidence: payload.confidence_score,
        });
        
        await supabase
          .from('discovery_dead_letter')
          .update({ recovered_at: new Date().toISOString() })
          .eq('id', item.id);
        
        recovered++;
      }
      
      return new Response(JSON.stringify({ success: true, recovered }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Discovery processor error:', error);
    await recordMetric(supabase, 'error', 'discovery_processor', 1, {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
