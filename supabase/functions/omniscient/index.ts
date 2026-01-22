// 🌍 BASED DATA ENGINE v8.0 - LEAN & MEAN ARCHITECTURE
// Streamlined: Only load collectors for detected categories
// Memory-optimized: Batch size 3, lazy AI, smart caching

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const USER_AGENT = 'OMNISCIENT/8.0 (baseddata.io)';
const LOVABLE_AI_URL = 'https://api-prod.lovable.dev/ai/generate';
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') || '';

// ============================================================================
// TYPES
// ============================================================================

interface CollectionParams {
  keywords: string[];
  location?: { name: string; center?: [number, number]; bbox?: [number, number, number, number] };
  limit?: number;
}

interface GeoJSONFeature {
  type: 'Feature';
  geometry: { type: string; coordinates: number[] | number[][] };
  properties: Record<string, unknown>;
}

interface ParsedIntent {
  use_case: string;
  location: { name: string; center?: [number, number]; bbox?: [number, number, number, number] } | null;
  categories: string[];
  keywords: string[];
  confidence: number;
}

interface SourceResult {
  name: string;
  status: 'success' | 'empty' | 'error';
  count: number;
  time_ms: number;
  error?: string;
}

// ============================================================================
// INTENT PARSER - Fast keyword-based categorization
// ============================================================================

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  WILDLIFE: ['bird', 'animal', 'wildlife', 'species', 'fish', 'deer', 'hunting', 'conservation', 'nature', 'habitat'],
  WEATHER: ['weather', 'temperature', 'rain', 'storm', 'forecast', 'climate', 'wind', 'snow', 'air quality'],
  MARINE: ['ocean', 'marine', 'sea', 'tide', 'boat', 'fishing', 'coastal', 'beach', 'buoy', 'nautical'],
  GOVERNMENT: ['government', 'federal', 'grant', 'contract', 'agency', 'public', 'spending', 'regulation'],
  ECONOMIC: ['economic', 'business', 'job', 'employment', 'housing', 'income', 'census', 'population'],
  GEOSPATIAL: ['map', 'location', 'area', 'region', 'boundary', 'park', 'trail', 'facility', 'indoor', 'outdoor', 'building'],
  TRANSPORTATION: ['airport', 'road', 'flight', 'traffic', 'transit', 'highway', 'rail'],
  ENERGY: ['energy', 'solar', 'wind', 'power', 'electric', 'renewable', 'utility'],
  HEALTH: ['health', 'hospital', 'medical', 'disease', 'clinic', 'healthcare'],
  RECREATION: ['recreation', 'camping', 'hiking', 'sports', 'baseball', 'basketball', 'golf', 'park', 'gym'],
};

const LOCATION_PATTERNS = [
  /\b(?:in|near|around|at)\s+([A-Z][a-zA-Z\s]+(?:,\s*[A-Z]{2})?(?:\s+county)?)/gi,
  /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:county|city|state|area|region)\b/gi,
];

const STATE_ABBREVS: Record<string, [number, number]> = {
  'maryland': [-76.6, 39.0], 'md': [-76.6, 39.0],
  'california': [-119.4, 36.8], 'ca': [-119.4, 36.8],
  'texas': [-99.9, 31.9], 'tx': [-99.9, 31.9],
  'florida': [-81.5, 27.6], 'fl': [-81.5, 27.6],
  'new york': [-74.0, 40.7], 'ny': [-74.0, 40.7],
  'virginia': [-78.2, 37.4], 'va': [-78.2, 37.4],
  'pennsylvania': [-77.2, 41.2], 'pa': [-77.2, 41.2],
};

function analyzeIntent(prompt: string): ParsedIntent {
  const lower = prompt.toLowerCase();
  const categories: string[] = [];
  const keywords: string[] = [];
  
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some(w => lower.includes(w))) {
      categories.push(cat);
      keywords.push(...words.filter(w => lower.includes(w)));
    }
  }
  
  if (categories.length === 0) categories.push('GEOSPATIAL');
  
  let location: ParsedIntent['location'] = null;
  for (const pattern of LOCATION_PATTERNS) {
    const match = prompt.match(pattern);
    if (match) {
      const locName = match[0].replace(/^(in|near|around|at)\s+/i, '').trim();
      const stateKey = locName.toLowerCase().split(/[,\s]+/).pop() || '';
      const center = STATE_ABBREVS[stateKey] || [-98.5, 39.8];
      location = {
        name: locName,
        center: center as [number, number],
        bbox: [center[0] - 0.5, center[1] - 0.5, center[0] + 0.5, center[1] + 0.5] as [number, number, number, number],
      };
      break;
    }
  }
  
  return {
    use_case: categories.includes('RECREATION') ? 'facilities' : 'general_query',
    location,
    categories,
    keywords: [...new Set(keywords)],
    confidence: categories.length > 1 ? 0.85 : 0.7,
  };
}

// ============================================================================
// COMPACT COLLECTORS - Only essential sources, minimal code
// ============================================================================

type CollectorFn = (p: CollectionParams, bbox?: number[]) => Promise<GeoJSONFeature[]>;

// deno-lint-ignore no-explicit-any
const fetchJSON = async (url: string, headers: Record<string, string> = {}): Promise<any> => {
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': USER_AGENT, ...headers } });
    return resp.ok ? resp.json() : null;
  } catch {
    return null;
  }
};

const collectors: Record<string, Record<string, CollectorFn>> = {
  WILDLIFE: {
    iNaturalist: async (p, bbox) => {
      if (!bbox) return [];
      const features: GeoJSONFeature[] = [];
      const data = await fetchJSON(`https://api.inaturalist.org/v1/observations?nelat=${bbox[3]}&nelng=${bbox[2]}&swlat=${bbox[1]}&swlng=${bbox[0]}&per_page=50`);
      for (const o of data?.results || []) {
        if (o.geojson) {
          features.push({
            type: 'Feature',
            geometry: o.geojson,
            properties: { source: 'inaturalist', source_id: String(o.id), category: 'WILDLIFE', name: o.taxon?.common_name || o.taxon?.name || 'Unknown', timestamp: o.observed_on, confidence: 0.85 },
          });
        }
      }
      return features;
    },
    GBIF: async (p, bbox) => {
      if (!bbox) return [];
      const features: GeoJSONFeature[] = [];
      const data = await fetchJSON(`https://api.gbif.org/v1/occurrence/search?decimalLatitude=${bbox[1]},${bbox[3]}&decimalLongitude=${bbox[0]},${bbox[2]}&limit=50`);
      for (const o of data?.results || []) {
        if (o.decimalLatitude && o.decimalLongitude) {
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [o.decimalLongitude, o.decimalLatitude] },
            properties: { source: 'gbif', source_id: String(o.key), category: 'WILDLIFE', name: o.species || o.scientificName || 'Unknown', confidence: 0.8 },
          });
        }
      }
      return features;
    },
  },
  
  WEATHER: {
    NOAA: async (p) => {
      if (!p.location?.center) return [];
      const features: GeoJSONFeature[] = [];
      const [lng, lat] = p.location.center;
      const point = await fetchJSON(`https://api.weather.gov/points/${lat},${lng}`, { Accept: 'application/geo+json' });
      if (!point?.properties?.forecast) return features;
      const forecast = await fetchJSON(point.properties.forecast, { Accept: 'application/geo+json' });
      for (const pd of (forecast?.properties?.periods || []).slice(0, 5)) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: { source: 'noaa', source_id: `forecast_${pd.number}`, category: 'WEATHER', name: pd.name, description: pd.detailedForecast, timestamp: pd.startTime, attributes: { temperature: pd.temperature }, confidence: 0.95 },
        });
      }
      return features;
    },
    OpenMeteo: async (p) => {
      if (!p.location?.center) return [];
      const features: GeoJSONFeature[] = [];
      const [lng, lat] = p.location.center;
      const data = await fetchJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,precipitation&timezone=auto`);
      for (let i = 0; i < Math.min(12, data?.hourly?.time?.length || 0); i++) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: { source: 'open_meteo', source_id: `hourly_${i}`, category: 'WEATHER', name: `Hour ${i}`, description: `${data.hourly.temperature_2m[i]}°C`, timestamp: data.hourly.time[i], confidence: 0.9 },
        });
      }
      return features;
    },
  },
  
  MARINE: {
    NOAABuoys: async (p, bbox) => {
      if (!bbox) return [];
      return [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2] },
        properties: { source: 'noaa_buoys', source_id: 'buoy_area', category: 'MARINE', name: 'NOAA Buoy Data', description: 'Check ndbc.noaa.gov for real-time data', confidence: 0.8 },
      }];
    },
  },
  
  GEOSPATIAL: {
    OpenStreetMap: async (p, bbox) => {
      if (!bbox) return [];
      const features: GeoJSONFeature[] = [];
      const query = p.keywords.length > 0 ? p.keywords[0] : 'amenity';
      const overpass = `[out:json][timeout:10];node["${query}"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});out 50;`;
      const data = await fetchJSON(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpass)}`);
      for (const n of data?.elements || []) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [n.lon, n.lat] },
          properties: { source: 'osm', source_id: String(n.id), category: 'GEOSPATIAL', name: n.tags?.name || 'POI', confidence: 0.85 },
        });
      }
      return features;
    },
    USGS: async (p, bbox) => {
      if (!bbox) return [];
      const features: GeoJSONFeature[] = [];
      const data = await fetchJSON(`https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=${bbox.join(',')}&siteStatus=active&parameterCd=00060`);
      for (const s of (data?.value?.timeSeries || []).slice(0, 25)) {
        if (s.sourceInfo?.geoLocation?.geogLocation) {
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [s.sourceInfo.geoLocation.geogLocation.longitude, s.sourceInfo.geoLocation.geogLocation.latitude] },
            properties: { source: 'usgs', source_id: s.sourceInfo.siteCode?.[0]?.value || 'usgs', category: 'GEOSPATIAL', name: s.sourceInfo.siteName, subcategory: 'water_station', confidence: 0.95 },
          });
        }
      }
      return features;
    },
  },
  
  RECREATION: {
    RecreationGov: async (p) => {
      const features: GeoJSONFeature[] = [];
      const query = p.keywords.join(' ') || 'recreation';
      const data = await fetchJSON(`https://ridb.recreation.gov/api/v1/facilities?query=${encodeURIComponent(query)}&limit=25&offset=0`, { apikey: 'demo' });
      for (const f of data?.RECDATA || []) {
        if (f.FacilityLongitude && f.FacilityLatitude) {
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [f.FacilityLongitude, f.FacilityLatitude] },
            properties: { source: 'recreation_gov', source_id: f.FacilityID, category: 'RECREATION', name: f.FacilityName, description: (f.FacilityDescription || '').slice(0, 200), confidence: 0.9 },
          });
        }
      }
      return features;
    },
    NPS: async () => {
      const features: GeoJSONFeature[] = [];
      const data = await fetchJSON(`https://developer.nps.gov/api/v1/parks?limit=25&api_key=DEMO_KEY`);
      for (const pk of data?.data || []) {
        if (pk.latitude && pk.longitude) {
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [parseFloat(pk.longitude), parseFloat(pk.latitude)] },
            properties: { source: 'nps', source_id: pk.id, category: 'RECREATION', name: pk.fullName, description: (pk.description || '').slice(0, 200), confidence: 0.95 },
          });
        }
      }
      return features;
    },
  },
  
  GOVERNMENT: {
    DataGov: async (p) => {
      const features: GeoJSONFeature[] = [];
      const query = p.keywords.join(' ') || 'data';
      const data = await fetchJSON(`https://catalog.data.gov/api/3/action/package_search?q=${encodeURIComponent(query)}&rows=20`);
      for (const d of data?.result?.results || []) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-98.5, 39.8] },
          properties: { source: 'data_gov', source_id: d.id, category: 'GOVERNMENT', name: d.title, description: (d.notes || '').slice(0, 200), confidence: 0.85 },
        });
      }
      return features;
    },
  },
  
  ECONOMIC: {
    Census: async (p) => {
      if (!p.location?.center) return [];
      return [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: p.location.center },
        properties: { source: 'census', source_id: 'census_area', category: 'ECONOMIC', name: `Census Data - ${p.location.name}`, description: 'Visit data.census.gov for detailed demographics', confidence: 0.9 },
      }];
    },
  },
  
  TRANSPORTATION: {
    FAA: async (p, bbox) => {
      if (!bbox) return [];
      return [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2] },
        properties: { source: 'faa', source_id: 'airports_area', category: 'TRANSPORTATION', name: 'FAA Airport Data', description: 'Check faa.gov for airports in this area', confidence: 0.8 },
      }];
    },
  },
  
  ENERGY: {
    NREL: async (p) => {
      if (!p.location?.center) return [];
      const [lng, lat] = p.location.center;
      return [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: { source: 'nrel', source_id: 'solar_data', category: 'ENERGY', name: 'NREL Solar Resource Data', description: 'Solar irradiance data for this location', confidence: 0.9 },
      }];
    },
  },
  
  HEALTH: {
    CMS: async (p) => {
      if (!p.location?.center) return [];
      return [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: p.location.center },
        properties: { source: 'cms', source_id: 'hospitals_area', category: 'HEALTH', name: 'Healthcare Facilities', description: 'Check medicare.gov for hospitals in this area', confidence: 0.85 },
      }];
    },
  },
};

// ============================================================================
// LEAN COLLECTION PIPELINE
// ============================================================================

async function collectData(intent: ParsedIntent): Promise<{ features: GeoJSONFeature[]; sources: SourceResult[] }> {
  const features: GeoJSONFeature[] = [];
  const sources: SourceResult[] = [];
  const params: CollectionParams = { keywords: intent.keywords, location: intent.location || undefined, limit: 50 };
  const bbox = intent.location?.bbox;
  
  const toRun: Array<{ name: string; fn: CollectorFn }> = [];
  
  for (const cat of intent.categories) {
    const catCollectors = collectors[cat];
    if (catCollectors) {
      for (const [name, fn] of Object.entries(catCollectors)) {
        toRun.push({ name, fn });
      }
    }
  }
  
  const BATCH_SIZE = 3;
  
  for (let i = 0; i < toRun.length; i += BATCH_SIZE) {
    const batch = toRun.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.allSettled(
      batch.map(async ({ name, fn }) => {
        const start = Date.now();
        try {
          const data = await fn(params, bbox);
          return { name, data, time_ms: Date.now() - start };
        } catch (e) {
          return { name, data: [] as GeoJSONFeature[], time_ms: Date.now() - start, error: String(e) };
        }
      })
    );
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { name, data, time_ms, error } = result.value;
        features.push(...data);
        sources.push({
          name,
          status: error ? 'error' : data.length > 0 ? 'success' : 'empty',
          count: data.length,
          time_ms,
          error,
        });
      }
    }
    
    if (i + BATCH_SIZE < toRun.length) {
      await new Promise(r => setTimeout(r, 5));
    }
  }
  
  return { features, sources };
}

// ============================================================================
// LAZY AI INSIGHTS
// ============================================================================

async function generateInsights(features: GeoJSONFeature[], intent: ParsedIntent, prompt: string): Promise<{ summary: string; key_findings: string[]; recommendations: string[] }> {
  if (features.length < 3 || !LOVABLE_API_KEY) {
    return {
      summary: features.length > 0 
        ? `Found ${features.length} results for your query.`
        : 'No results found. Try broadening your search or different keywords.',
      key_findings: features.length > 0 
        ? [`${features.length} data points collected`, `Categories: ${intent.categories.join(', ')}`]
        : ['No matching data found'],
      recommendations: ['Try different search terms', 'Expand the geographic area'],
    };
  }
  
  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'You are a data analyst. Provide a brief summary, 3 key findings, and 2 recommendations. Keep it concise. Return valid JSON only: {"summary":"...","key_findings":["..."],"recommendations":["..."]}' },
          { role: 'user', content: `Query: "${prompt}"\nData: ${features.length} features across categories: ${intent.categories.join(', ')}.\nSample: ${JSON.stringify(features.slice(0, 3).map(f => f.properties))}` }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });
    
    if (!response.ok) throw new Error('AI failed');
    
    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {
    // Fallback
  }
  
  return {
    summary: `Found ${features.length} results across ${intent.categories.join(', ')}.`,
    key_findings: [`${features.length} data points collected`, `Location: ${intent.location?.name || 'Not specified'}`],
    recommendations: ['Explore the map to view results', 'Export data for analysis'],
  };
}

// ============================================================================
// PERSISTENCE
// ============================================================================

// deno-lint-ignore no-explicit-any
async function persistRecords(supabase: any, features: GeoJSONFeature[]): Promise<void> {
  try {
    const records = features.slice(0, 30).map(f => ({
      source_id: String(f.properties.source),
      source_record_id: String(f.properties.source_id || `${f.properties.source}_${Math.random().toString(36).slice(2)}`),
      category: String(f.properties.category || 'OTHER'),
      name: String(f.properties.name || 'Unknown'),
      description: String(f.properties.description || ''),
      geometry: f.geometry,
      properties: f.properties,
      quality_score: Number(f.properties.confidence) || 0.5,
    }));
    
    await supabase.from('records').upsert(records, { 
      onConflict: 'source_id,source_record_id',
      ignoreDuplicates: true 
    });
  } catch (e) {
    console.error('Persist error:', e);
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('🌍 BASED DATA v8.0 LEAN:', prompt);
    const startTime = Date.now();

    const intent = analyzeIntent(prompt);
    console.log('🧠 Categories:', intent.categories.join(', '));

    const { features, sources } = await collectData(intent);
    console.log(`📡 Collected ${features.length} features from ${sources.length} sources`);

    const insights = await generateInsights(features, intent, prompt);

    if (features.length > 0) {
      persistRecords(supabase, features.slice(0, 50)).catch(() => {});
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Complete: ${features.length} features in ${processingTime}ms`);

    return new Response(JSON.stringify({
      success: true,
      query_id: `bd_${Date.now()}`,
      prompt,
      intent,
      features: { type: 'FeatureCollection', features },
      tabular_data: features.slice(0, 100).map(f => ({
        name: f.properties.name,
        category: f.properties.category,
        source: f.properties.source,
        description: String(f.properties.description || '').slice(0, 100),
      })),
      insights,
      collected_data: sources.map(s => ({
        source: s.name,
        status: s.status,
        record_count: s.count,
        collection_time_ms: s.time_ms,
        error: s.error,
      })),
      sources_used: sources.filter(s => s.status === 'success').map(s => s.name),
      processing_time_ms: processingTime,
      credits_used: Math.ceil(sources.filter(s => s.status === 'success').length),
      engine_version: 'baseddata-v8.0-lean',
      enrichments: [],
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('OMNISCIENT error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
