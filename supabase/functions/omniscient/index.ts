// ═══════════════════════════════════════════════════════════════════════════
// 🌍 BASED DATA ENGINE v9.0 — ZERO IN / ZERO OUT
// 
// ARCHITECTURE:
// 1. AI-powered intent parsing (WHAT + WHERE + WHEN + FILTERS)
// 2. Proper geocoding with Nominatim (accurate bounding boxes)
// 3. Intelligent collector selection (only run what's needed)
// 4. Lean parallel execution (batch size 3, memory optimized)
// 5. High-fidelity data extraction (useful names, descriptions, addresses)
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_AI_URL = 'https://api-prod.lovable.dev/ai/generate';
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') || '';
const USER_AGENT = 'BASEDDATA/9.0 (baseddata.lovable.app)';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ParsedIntent {
  what: {
    primary: string;
    keywords: string[];
    category: string;
    subcategory?: string;
  };
  where: {
    raw: string;
    city?: string;
    county?: string;
    state?: string;
    stateCode?: string;
    country: string;
    bounds?: { north: number; south: number; east: number; west: number };
    center?: [number, number];
  };
  when: {
    temporal: 'current' | 'historical' | 'forecast';
  };
  filters: {
    indoor?: boolean;
    outdoor?: boolean;
    keywords: string[];
  };
  collectors: string[];
  confidence: number;
}

interface GeoJSONFeature {
  type: 'Feature';
  geometry: { type: string; coordinates: number[] | number[][] };
  properties: Record<string, unknown>;
}

interface SourceResult {
  name: string;
  status: 'success' | 'empty' | 'error';
  count: number;
  time_ms: number;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: AI-POWERED INTENT PARSING
// ═══════════════════════════════════════════════════════════════════════════

async function parseQueryIntent(prompt: string): Promise<ParsedIntent> {
  // Try AI parsing first for best results
  if (LOVABLE_API_KEY) {
    try {
      const response = await fetch(LOVABLE_AI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [{
            role: 'user',
            content: `Parse this search query and extract structured intent. Return ONLY valid JSON (no markdown):

Query: "${prompt}"

{
  "what": {
    "primary": "the main thing being searched (e.g., 'baseball facilities')",
    "keywords": ["relevant", "search", "terms", "synonyms"],
    "category": "one of: recreation, sports, wildlife, weather, marine, government, healthcare, education, transportation, environment, business, demographics, emergency, infrastructure, energy, research",
    "subcategory": "more specific type if applicable (e.g., 'baseball' for sports)"
  },
  "where": {
    "raw": "the location as mentioned",
    "city": "city name or null",
    "county": "county name or null", 
    "state": "full state name or null",
    "stateCode": "two letter state code or null",
    "country": "country, default USA"
  },
  "when": {
    "temporal": "current, historical, or forecast"
  },
  "filters": {
    "indoor": true/false/null,
    "outdoor": true/false/null,
    "keywords": ["any", "specific", "filter", "terms"]
  }
}

Examples:
- "indoor baseball facilities Baltimore county maryland" → recreation category, baseball subcategory, indoor filter true, Baltimore County MD location
- "goose hunting conditions Long Island December" → wildlife category, Long Island NY location, forecast temporal
- "federal contracts for cybersecurity" → government category, no specific location`
          }],
          temperature: 0.1,
          max_tokens: 500,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          return {
            ...parsed,
            collectors: selectCollectors(parsed),
            confidence: 0.95,
          };
        }
      }
    } catch (e) {
      console.error('AI parsing failed, falling back:', e);
    }
  }

  // Fallback to keyword-based parsing
  return fallbackParse(prompt);
}

function selectCollectors(intent: { what: { primary: string; category: string; keywords?: string[] }; filters?: { indoor?: boolean } }): string[] {
  const collectors: string[] = [];
  const what = intent.what.primary.toLowerCase();
  const category = intent.what.category.toLowerCase();
  const keywords = intent.what.keywords?.map(k => k.toLowerCase()) || [];

  // RECREATION & SPORTS
  if (category === 'recreation' || category === 'sports' ||
      ['baseball', 'soccer', 'tennis', 'basketball', 'golf', 'swimming', 'gym', 'fitness', 'sports', 'athletic', 'field', 'court', 'stadium', 'arena', 'park', 'trail', 'hiking', 'camping'].some(k => what.includes(k) || keywords.includes(k))) {
    collectors.push('osm_sports', 'recreation_gov');
    if (what.includes('park') || keywords.includes('park')) {
      collectors.push('nps');
    }
  }

  // WILDLIFE & NATURE
  if (category === 'wildlife' ||
      ['bird', 'wildlife', 'animal', 'species', 'hunting', 'fishing', 'goose', 'duck', 'deer', 'nature'].some(k => what.includes(k) || keywords.includes(k))) {
    collectors.push('inaturalist', 'gbif');
  }

  // WEATHER
  if (category === 'weather' ||
      ['weather', 'forecast', 'temperature', 'rain', 'storm', 'climate', 'conditions'].some(k => what.includes(k) || keywords.includes(k))) {
    collectors.push('noaa_weather', 'open_meteo');
  }

  // MARINE
  if (category === 'marine' ||
      ['tide', 'ocean', 'marine', 'boat', 'fishing', 'coastal', 'beach', 'buoy'].some(k => what.includes(k) || keywords.includes(k))) {
    collectors.push('noaa_tides');
  }

  // GOVERNMENT
  if (category === 'government' ||
      ['contract', 'grant', 'federal', 'government', 'spending', 'agency'].some(k => what.includes(k) || keywords.includes(k))) {
    collectors.push('data_gov', 'usaspending');
  }

  // HEALTHCARE
  if (category === 'healthcare' ||
      ['hospital', 'doctor', 'clinic', 'medical', 'pharmacy', 'health'].some(k => what.includes(k) || keywords.includes(k))) {
    collectors.push('osm_healthcare');
  }

  // EDUCATION
  if (category === 'education' ||
      ['school', 'college', 'university', 'education', 'library'].some(k => what.includes(k) || keywords.includes(k))) {
    collectors.push('osm_education');
  }

  // TRANSPORTATION
  if (category === 'transportation' ||
      ['airport', 'road', 'transit', 'bus', 'train', 'traffic', 'highway', 'flight'].some(k => what.includes(k) || keywords.includes(k))) {
    collectors.push('osm_transport');
  }

  // EMERGENCY
  if (category === 'emergency' ||
      ['emergency', 'fire', 'police', 'crime', 'disaster'].some(k => what.includes(k) || keywords.includes(k))) {
    collectors.push('osm_emergency');
  }

  // ENVIRONMENT
  if (category === 'environment' ||
      ['pollution', 'air quality', 'water', 'environmental'].some(k => what.includes(k) || keywords.includes(k))) {
    collectors.push('usgs_water');
  }

  // Default: OSM POI search
  if (collectors.length === 0) {
    collectors.push('osm_poi');
  }

  return [...new Set(collectors)];
}

function fallbackParse(prompt: string): ParsedIntent {
  const lower = prompt.toLowerCase();
  
  // Extract location patterns
  const locationMatch = prompt.match(/\b(?:in|near|around|at)\s+([A-Z][a-zA-Z\s]+(?:,?\s*[A-Z]{2})?(?:\s+county)?)/i) ||
                        prompt.match(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:county|city|state)/i);
  
  // State codes
  const stateMap: Record<string, { name: string; center: [number, number] }> = {
    'maryland': { name: 'Maryland', center: [-76.6, 39.0] },
    'md': { name: 'Maryland', center: [-76.6, 39.0] },
    'california': { name: 'California', center: [-119.4, 36.8] },
    'ca': { name: 'California', center: [-119.4, 36.8] },
    'texas': { name: 'Texas', center: [-99.9, 31.9] },
    'tx': { name: 'Texas', center: [-99.9, 31.9] },
    'new york': { name: 'New York', center: [-74.0, 40.7] },
    'ny': { name: 'New York', center: [-74.0, 40.7] },
    'virginia': { name: 'Virginia', center: [-78.2, 37.4] },
    'va': { name: 'Virginia', center: [-78.2, 37.4] },
    'florida': { name: 'Florida', center: [-81.5, 27.6] },
    'fl': { name: 'Florida', center: [-81.5, 27.6] },
    'pennsylvania': { name: 'Pennsylvania', center: [-77.2, 41.2] },
    'pa': { name: 'Pennsylvania', center: [-77.2, 41.2] },
  };

  let stateCode = '';
  let stateName = '';
  let center: [number, number] = [-98.5, 39.8];
  
  for (const [key, val] of Object.entries(stateMap)) {
    if (lower.includes(key)) {
      stateName = val.name;
      stateCode = key.length === 2 ? key.toUpperCase() : key.substring(0, 2).toUpperCase();
      center = val.center;
      break;
    }
  }

  // Detect category from keywords
  let category = 'geospatial';
  if (['baseball', 'soccer', 'tennis', 'basketball', 'sports', 'gym', 'fitness', 'park', 'trail', 'recreation'].some(k => lower.includes(k))) category = 'recreation';
  if (['bird', 'wildlife', 'animal', 'hunting', 'fishing'].some(k => lower.includes(k))) category = 'wildlife';
  if (['weather', 'forecast', 'temperature', 'rain'].some(k => lower.includes(k))) category = 'weather';
  if (['hospital', 'doctor', 'clinic', 'medical'].some(k => lower.includes(k))) category = 'healthcare';
  if (['contract', 'grant', 'federal', 'government'].some(k => lower.includes(k))) category = 'government';

  // Extract primary search term
  const words = prompt.split(/\s+/).filter(w => w.length > 2);
  const stopWords = ['in', 'at', 'near', 'around', 'the', 'for', 'and', 'with', 'county', 'city', 'state'];
  const primaryWords = words.filter(w => !stopWords.includes(w.toLowerCase()) && !stateMap[w.toLowerCase()]);
  
  const intent: ParsedIntent = {
    what: {
      primary: primaryWords.slice(0, 3).join(' ') || prompt,
      keywords: primaryWords,
      category,
      subcategory: lower.includes('baseball') ? 'baseball' : lower.includes('soccer') ? 'soccer' : undefined,
    },
    where: {
      raw: locationMatch?.[1] || '',
      state: stateName,
      stateCode,
      country: 'USA',
      center,
    },
    when: {
      temporal: lower.includes('forecast') ? 'forecast' : 'current',
    },
    filters: {
      indoor: lower.includes('indoor') ? true : undefined,
      outdoor: lower.includes('outdoor') ? true : undefined,
      keywords: primaryWords,
    },
    collectors: [],
    confidence: 0.7,
  };

  intent.collectors = selectCollectors(intent);
  return intent;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: GEOCODING WITH NOMINATIM
// ═══════════════════════════════════════════════════════════════════════════

async function geocodeLocation(where: ParsedIntent['where']): Promise<ParsedIntent['where']> {
  if (!where.raw && !where.city && !where.county && !where.state) {
    return where;
  }

  // Build search string
  const parts: string[] = [];
  if (where.county) parts.push(`${where.county} County`);
  if (where.city) parts.push(where.city);
  if (where.state) parts.push(where.state);
  else if (where.stateCode) parts.push(where.stateCode);
  parts.push('USA');

  const searchText = parts.length > 1 ? parts.join(', ') : where.raw || '';
  if (!searchText) return where;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchText)}&format=json&limit=1&addressdetails=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
    });

    if (!response.ok) return where;
    const data = await response.json();
    
    if (data?.[0]) {
      const result = data[0];
      const [south, north, west, east] = result.boundingbox.map(Number);
      
      console.log(`📍 Geocoded "${searchText}" → [${south.toFixed(3)}, ${north.toFixed(3)}, ${west.toFixed(3)}, ${east.toFixed(3)}]`);
      
      return {
        ...where,
        bounds: { north, south, east, west },
        center: [parseFloat(result.lon), parseFloat(result.lat)],
      };
    }
  } catch (e) {
    console.error('Geocoding failed:', e);
  }

  return where;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: HIGH-FIDELITY DATA COLLECTORS
// ═══════════════════════════════════════════════════════════════════════════

type CollectorFn = (intent: ParsedIntent) => Promise<GeoJSONFeature[]>;

const fetchJSON = async (url: string, headers: Record<string, string> = {}): Promise<unknown> => {
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': USER_AGENT, ...headers } });
    return resp.ok ? resp.json() : null;
  } catch {
    return null;
  }
};

function capitalize(str: string): string {
  if (!str) return '';
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// SMART NAME GENERATION - Creates unique, differentiated names when official name is missing
function generateSmartName(tags: Record<string, string>, lat: number, lon: number, intent?: ParsedIntent): string {
  // Priority 1: Real names from OSM (most valuable)
  const realName = tags.name || tags.official_name || tags['name:en'] || tags.alt_name || 
                   tags.loc_name || tags.short_name || tags.brand;
  if (realName && realName.trim()) return realName;
  
  // Priority 2: Operator/owner + facility type (e.g., "YMCA Sports Center")
  if (tags.operator || tags.owner) {
    const operatorName = tags.operator || tags.owner;
    if (tags.leisure === 'sports_centre') return `${operatorName} Sports Center`;
    if (tags.leisure === 'fitness_centre') return `${operatorName} Fitness Center`;
    if (tags.leisure === 'stadium') return `${operatorName} Stadium`;
    if (tags.leisure === 'pitch') {
      const sportType = tags.sport ? capitalize(tags.sport) : 'Sports';
      return `${operatorName} ${sportType} Field`;
    }
    return `${operatorName} Facility`;
  }
  
  // Priority 3: Address-based naming (e.g., "Main Street Baseball Field")
  const street = tags['addr:street'] || tags['addr:place'];
  const city = tags['addr:city'] || tags['addr:suburb'];
  if (street || city) {
    const locationPart = street || city;
    if (tags.sport) return `${locationPart} ${capitalize(tags.sport)} Facility`;
    if (tags.leisure === 'pitch') return `${locationPart} Sports Field`;
    if (tags.leisure === 'sports_centre') return `${locationPart} Sports Center`;
    if (tags.leisure === 'park') return `${locationPart} Park`;
    return `${locationPart} Recreation Area`;
  }
  
  // Priority 4: Referenced name from nearby features
  if (tags.ref) {
    const sportType = tags.sport ? capitalize(tags.sport) : 'Sports';
    return `${sportType} Field ${tags.ref}`;
  }
  
  // Priority 5: Sport + Leisure type + unique coordinate identifier
  const sportName = tags.sport ? capitalize(tags.sport) : null;
  const leisureType = tags.leisure ? capitalize(tags.leisure) : null;
  
  // Create a simple grid reference from coordinates (helps differentiate nearby points)
  const gridRef = `${Math.abs(lat).toFixed(2)}${lat >= 0 ? 'N' : 'S'}_${Math.abs(lon).toFixed(2)}${lon >= 0 ? 'E' : 'W'}`;
  
  if (sportName && leisureType) {
    if (leisureType.toLowerCase() === 'pitch') return `${sportName} Field #${gridRef}`;
    if (leisureType.toLowerCase() === 'sports centre') return `${sportName} Center #${gridRef}`;
    return `${sportName} ${leisureType} #${gridRef}`;
  }
  if (sportName) return `${sportName} Facility #${gridRef}`;
  if (leisureType) return `${leisureType} #${gridRef}`;
  
  // Fallback: Generic with unique ID
  return `Recreation Site #${gridRef}`;
}

const COLLECTORS: Record<string, CollectorFn> = {
  // ─────────────────────────────────────────────────────────────────────────
  // OSM SPORTS - High fidelity extraction for sports facilities
  // ─────────────────────────────────────────────────────────────────────────
  osm_sports: async (intent) => {
    const bounds = intent.where.bounds;
    if (!bounds) return [];
    
    const features: GeoJSONFeature[] = [];
    const sport = intent.what.subcategory || '';
    const isIndoor = intent.filters.indoor;
    
    // Build targeted Overpass query
    let query: string;
    if (sport) {
      // Specific sport query
      query = `[out:json][timeout:25];(
        node["sport"~"${sport}",i](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        way["sport"~"${sport}",i](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        node["leisure"~"pitch|sports_centre|stadium",i]["sport"~"${sport}",i](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        way["leisure"~"pitch|sports_centre|stadium",i]["sport"~"${sport}",i](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        ${isIndoor ? `node["building"~"sports|gymnasium",i](${bounds.south},${bounds.west},${bounds.north},${bounds.east});` : ''}
      );out center 150;`;
    } else if (isIndoor) {
      // Indoor facilities
      query = `[out:json][timeout:25];(
        node["leisure"="sports_centre"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        way["leisure"="sports_centre"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        node["building"~"sports|gymnasium",i](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        way["building"~"sports|gymnasium",i](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        node["leisure"="fitness_centre"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      );out center 150;`;
    } else {
      // General sports facilities
      query = `[out:json][timeout:25];(
        node["leisure"~"pitch|sports_centre|stadium"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        way["leisure"~"pitch|sports_centre|stadium"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        node["sport"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        way["sport"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      );out center 150;`;
    }
    
    const data = await fetchJSON(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`) as { elements?: Array<{ id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> };
    
    for (const el of data?.elements || []) {
      const tags = el.tags || {};
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      if (!lat || !lon) continue;
      
      // SMART NAME EXTRACTION - creates unique differentiated names
      const name = generateSmartName(tags, lat, lon, intent);
      
      // ENHANCED DESCRIPTION - useful details for differentiation
      const descParts: string[] = [];
      if (tags.sport) descParts.push(`Sport: ${capitalize(tags.sport)}`);
      if (tags.surface) descParts.push(`Surface: ${capitalize(tags.surface)}`);
      if (tags.indoor === 'yes' || tags.building) descParts.push('Indoor');
      else if (tags.covered === 'yes') descParts.push('Covered');
      if (tags.lit === 'yes' || tags.floodlit === 'yes') descParts.push('Lighted');
      if (tags.access === 'public' || tags.access === 'yes') descParts.push('Public');
      else if (tags.access === 'private') descParts.push('Private');
      else if (tags.access === 'members') descParts.push('Members Only');
      if (tags.fee === 'no') descParts.push('Free');
      else if (tags.fee === 'yes') descParts.push('Fee Required');
      if (tags.capacity) descParts.push(`Capacity: ${tags.capacity}`);
      
      // BUILD FULL ADDRESS
      const addressParts: string[] = [];
      if (tags['addr:housenumber']) addressParts.push(tags['addr:housenumber']);
      if (tags['addr:street']) addressParts.push(tags['addr:street']);
      if (tags['addr:city']) addressParts.push(tags['addr:city']);
      if (tags['addr:state'] || tags['addr:postcode']) {
        addressParts.push(`${tags['addr:state'] || ''} ${tags['addr:postcode'] || ''}`.trim());
      }
      const address = tags['addr:full'] || (addressParts.length > 0 ? addressParts.join(', ') : undefined);
      
      // OPERATOR / OWNER - valuable for differentiation
      const operatedBy = tags.operator || tags.owner || tags.brand || undefined;
      
      // HAS REAL NAME? (for confidence scoring)
      const hasRealName = !!(tags.name || tags.official_name || tags['name:en']);
      
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {
          source: 'osm_sports',
          source_id: `osm-${el.type}-${el.id}`,
          osm_id: el.id,
          category: 'RECREATION',
          name,
          has_official_name: hasRealName,
          description: descParts.join(' • ') || undefined,
          sport: tags.sport,
          leisure_type: tags.leisure,
          address,
          indoor: tags.indoor === 'yes' || !!tags.building,
          lighted: tags.lit === 'yes' || tags.floodlit === 'yes',
          surface: tags.surface,
          access: tags.access,
          capacity: tags.capacity,
          website: tags.website,
          phone: tags.phone,
          operator: operatedBy,
          opening_hours: tags.opening_hours,
          confidence: hasRealName ? 0.95 : 0.75,
        },
      });
    }
    
    return features;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // RECREATION.GOV - Federal recreation facilities
  // ─────────────────────────────────────────────────────────────────────────
  recreation_gov: async (intent) => {
    const features: GeoJSONFeature[] = [];
    const keywords = intent.what.keywords.join(' ') || intent.what.primary;
    const state = intent.where.stateCode || '';
    
    let url = `https://ridb.recreation.gov/api/v1/facilities?query=${encodeURIComponent(keywords)}&limit=50`;
    if (state) url += `&state=${state}`;
    
    const data = await fetchJSON(url, { apikey: 'demo' }) as { RECDATA?: Array<{ FacilityID: number; FacilityName: string; FacilityLongitude: number; FacilityLatitude: number; FacilityDescription?: string; FacilityTypeDescription?: string; FacilityStreetAddress1?: string; Reservable?: boolean; FacilityURL?: string }> };
    
    for (const f of data?.RECDATA || []) {
      if (!f.FacilityLongitude || !f.FacilityLatitude) continue;
      
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [f.FacilityLongitude, f.FacilityLatitude] },
        properties: {
          source: 'recreation_gov',
          source_id: `recgov-${f.FacilityID}`,
          category: 'RECREATION',
          name: f.FacilityName,
          description: (f.FacilityDescription || '').replace(/<[^>]*>/g, '').slice(0, 300),
          facility_type: f.FacilityTypeDescription,
          address: f.FacilityStreetAddress1,
          reservable: f.Reservable,
          website: f.FacilityURL,
          confidence: 0.9,
        },
      });
    }
    
    return features;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // NPS - National Park Service
  // ─────────────────────────────────────────────────────────────────────────
  nps: async (intent) => {
    const features: GeoJSONFeature[] = [];
    const stateCode = intent.where.stateCode || '';
    
    const url = stateCode 
      ? `https://developer.nps.gov/api/v1/parks?stateCode=${stateCode}&limit=50&api_key=DEMO_KEY`
      : `https://developer.nps.gov/api/v1/parks?limit=25&api_key=DEMO_KEY`;
    
    const data = await fetchJSON(url) as { data?: Array<{ id: string; fullName: string; latitude: string; longitude: string; description?: string; designation?: string; states?: string; url?: string; addresses?: Array<{ type: string; line1: string }> }> };
    
    for (const pk of data?.data || []) {
      if (!pk.latitude || !pk.longitude) continue;
      
      const physAddr = pk.addresses?.find((a) => a.type === 'Physical');
      
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [parseFloat(pk.longitude), parseFloat(pk.latitude)] },
        properties: {
          source: 'nps',
          source_id: pk.id,
          category: 'RECREATION',
          name: pk.fullName,
          description: (pk.description || '').slice(0, 300),
          park_type: pk.designation,
          state: pk.states,
          address: physAddr?.line1,
          website: pk.url,
          confidence: 0.95,
        },
      });
    }
    
    return features;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // iNATURALIST - Wildlife observations
  // ─────────────────────────────────────────────────────────────────────────
  inaturalist: async (intent) => {
    const bounds = intent.where.bounds;
    if (!bounds) return [];
    
    const features: GeoJSONFeature[] = [];
    const params = new URLSearchParams({
      nelat: String(bounds.north),
      nelng: String(bounds.east),
      swlat: String(bounds.south),
      swlng: String(bounds.west),
      per_page: '50',
    });
    
    const data = await fetchJSON(`https://api.inaturalist.org/v1/observations?${params}`) as { results?: Array<{ id: number; taxon?: { common_name?: string; name?: string }; observed_on?: string; geojson?: { coordinates: number[] }; quality_grade?: string }> };
    
    for (const obs of data?.results || []) {
      if (!obs.geojson?.coordinates) continue;
      
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: obs.geojson.coordinates },
        properties: {
          source: 'inaturalist',
          source_id: `inat-${obs.id}`,
          category: 'WILDLIFE',
          name: obs.taxon?.common_name || obs.taxon?.name || 'Unknown Species',
          timestamp: obs.observed_on,
          confidence: obs.quality_grade === 'research' ? 0.98 : 0.85,
        },
      });
    }
    
    return features;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GBIF - Global Biodiversity
  // ─────────────────────────────────────────────────────────────────────────
  gbif: async (intent) => {
    const bounds = intent.where.bounds;
    if (!bounds) return [];
    
    const features: GeoJSONFeature[] = [];
    const params = new URLSearchParams({
      decimalLatitude: `${bounds.south},${bounds.north}`,
      decimalLongitude: `${bounds.west},${bounds.east}`,
      limit: '50',
      hasCoordinate: 'true',
    });
    
    const data = await fetchJSON(`https://api.gbif.org/v1/occurrence/search?${params}`) as { results?: Array<{ key: number; species?: string; scientificName?: string; decimalLatitude: number; decimalLongitude: number }> };
    
    for (const occ of data?.results || []) {
      if (!occ.decimalLatitude || !occ.decimalLongitude) continue;
      
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [occ.decimalLongitude, occ.decimalLatitude] },
        properties: {
          source: 'gbif',
          source_id: `gbif-${occ.key}`,
          category: 'WILDLIFE',
          name: occ.species || occ.scientificName || 'Unknown',
          confidence: 0.85,
        },
      });
    }
    
    return features;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // NOAA WEATHER
  // ─────────────────────────────────────────────────────────────────────────
  noaa_weather: async (intent) => {
    const center = intent.where.center;
    if (!center) return [];
    
    const features: GeoJSONFeature[] = [];
    const [lng, lat] = center;
    
    const point = await fetchJSON(`https://api.weather.gov/points/${lat},${lng}`, { Accept: 'application/geo+json' }) as { properties?: { forecast?: string } };
    if (!point?.properties?.forecast) return features;
    
    const forecast = await fetchJSON(point.properties.forecast, { Accept: 'application/geo+json' }) as { properties?: { periods?: Array<{ number: number; name: string; detailedForecast: string; startTime: string; temperature: number }> } };
    
    for (const pd of (forecast?.properties?.periods || []).slice(0, 7)) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          source: 'noaa_weather',
          source_id: `noaa-forecast-${pd.number}`,
          category: 'WEATHER',
          name: pd.name,
          description: pd.detailedForecast,
          timestamp: pd.startTime,
          temperature: pd.temperature,
          confidence: 0.95,
        },
      });
    }
    
    return features;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // OPEN METEO
  // ─────────────────────────────────────────────────────────────────────────
  open_meteo: async (intent) => {
    const center = intent.where.center;
    if (!center) return [];
    
    const features: GeoJSONFeature[] = [];
    const [lng, lat] = center;
    
    const data = await fetchJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,precipitation&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`) as { daily?: { time?: string[]; temperature_2m_max?: number[]; temperature_2m_min?: number[] } };
    
    if (data?.daily?.time) {
      for (let i = 0; i < Math.min(7, data.daily.time.length); i++) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: {
            source: 'open_meteo',
            source_id: `meteo-day-${i}`,
            category: 'WEATHER',
            name: `Day ${i + 1} Forecast`,
            description: `High: ${data.daily.temperature_2m_max?.[i]}°C, Low: ${data.daily.temperature_2m_min?.[i]}°C`,
            timestamp: data.daily.time[i],
            confidence: 0.9,
          },
        });
      }
    }
    
    return features;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // OSM HEALTHCARE
  // ─────────────────────────────────────────────────────────────────────────
  osm_healthcare: async (intent) => {
    const bounds = intent.where.bounds;
    if (!bounds) return [];
    
    const features: GeoJSONFeature[] = [];
    const query = `[out:json][timeout:25];(
      node["amenity"="hospital"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      way["amenity"="hospital"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      node["amenity"="clinic"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      node["amenity"="pharmacy"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
    );out center 100;`;
    
    const data = await fetchJSON(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`) as { elements?: Array<{ id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> };
    
    for (const el of data?.elements || []) {
      const tags = el.tags || {};
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      if (!lat || !lon) continue;
      
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {
          source: 'osm_healthcare',
          source_id: `osm-${el.type}-${el.id}`,
          category: 'HEALTH',
          name: tags.name || capitalize(tags.amenity) || 'Healthcare Facility',
          address: tags['addr:street'] ? `${tags['addr:housenumber'] || ''} ${tags['addr:street']}`.trim() : undefined,
          phone: tags.phone,
          website: tags.website,
          confidence: tags.name ? 0.9 : 0.7,
        },
      });
    }
    
    return features;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // OSM EDUCATION
  // ─────────────────────────────────────────────────────────────────────────
  osm_education: async (intent) => {
    const bounds = intent.where.bounds;
    if (!bounds) return [];
    
    const features: GeoJSONFeature[] = [];
    const query = `[out:json][timeout:25];(
      node["amenity"="school"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      way["amenity"="school"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      node["amenity"="university"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      node["amenity"="college"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
    );out center 100;`;
    
    const data = await fetchJSON(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`) as { elements?: Array<{ id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> };
    
    for (const el of data?.elements || []) {
      const tags = el.tags || {};
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      if (!lat || !lon) continue;
      
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {
          source: 'osm_education',
          source_id: `osm-${el.type}-${el.id}`,
          category: 'EDUCATION',
          name: tags.name || capitalize(tags.amenity) || 'Educational Institution',
          school_type: tags.amenity,
          address: tags['addr:street'] ? `${tags['addr:housenumber'] || ''} ${tags['addr:street']}`.trim() : undefined,
          website: tags.website,
          confidence: tags.name ? 0.9 : 0.7,
        },
      });
    }
    
    return features;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // OSM TRANSPORT
  // ─────────────────────────────────────────────────────────────────────────
  osm_transport: async (intent) => {
    const bounds = intent.where.bounds;
    if (!bounds) return [];
    
    const features: GeoJSONFeature[] = [];
    const query = `[out:json][timeout:25];(
      node["aeroway"="aerodrome"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      way["aeroway"="aerodrome"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      node["railway"="station"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      node["amenity"="bus_station"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
    );out center 100;`;
    
    const data = await fetchJSON(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`) as { elements?: Array<{ id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> };
    
    for (const el of data?.elements || []) {
      const tags = el.tags || {};
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      if (!lat || !lon) continue;
      
      const type = tags.aeroway ? 'Airport' : tags.railway ? 'Train Station' : 'Transit Hub';
      
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {
          source: 'osm_transport',
          source_id: `osm-${el.type}-${el.id}`,
          category: 'TRANSPORTATION',
          name: tags.name || type,
          transport_type: type,
          website: tags.website,
          confidence: tags.name ? 0.9 : 0.7,
        },
      });
    }
    
    return features;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // OSM EMERGENCY
  // ─────────────────────────────────────────────────────────────────────────
  osm_emergency: async (intent) => {
    const bounds = intent.where.bounds;
    if (!bounds) return [];
    
    const features: GeoJSONFeature[] = [];
    const query = `[out:json][timeout:25];(
      node["amenity"="fire_station"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      node["amenity"="police"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      node["emergency"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
    );out center 100;`;
    
    const data = await fetchJSON(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`) as { elements?: Array<{ id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> };
    
    for (const el of data?.elements || []) {
      const tags = el.tags || {};
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      if (!lat || !lon) continue;
      
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lon, lat] },
        properties: {
          source: 'osm_emergency',
          source_id: `osm-${el.type}-${el.id}`,
          category: 'EMERGENCY',
          name: tags.name || capitalize(tags.amenity) || 'Emergency Services',
          phone: tags.phone,
          confidence: tags.name ? 0.9 : 0.7,
        },
      });
    }
    
    return features;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // USGS WATER
  // ─────────────────────────────────────────────────────────────────────────
  usgs_water: async (intent) => {
    const bounds = intent.where.bounds;
    if (!bounds) return [];
    
    const features: GeoJSONFeature[] = [];
    const data = await fetchJSON(`https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=${bounds.west},${bounds.south},${bounds.east},${bounds.north}&siteStatus=active&parameterCd=00060`) as { value?: { timeSeries?: Array<{ sourceInfo?: { siteName?: string; geoLocation?: { geogLocation?: { latitude: number; longitude: number } }; siteCode?: Array<{ value: string }> } }> } };
    
    for (const s of (data?.value?.timeSeries || []).slice(0, 25)) {
      const geo = s.sourceInfo?.geoLocation?.geogLocation;
      if (!geo) continue;
      
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [geo.longitude, geo.latitude] },
        properties: {
          source: 'usgs_water',
          source_id: s.sourceInfo?.siteCode?.[0]?.value || 'usgs',
          category: 'ENVIRONMENT',
          name: s.sourceInfo?.siteName || 'USGS Water Station',
          confidence: 0.95,
        },
      });
    }
    
    return features;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DATA.GOV
  // ─────────────────────────────────────────────────────────────────────────
  data_gov: async (intent) => {
    const features: GeoJSONFeature[] = [];
    const query = intent.what.keywords.join(' ') || intent.what.primary;
    
    const data = await fetchJSON(`https://catalog.data.gov/api/3/action/package_search?q=${encodeURIComponent(query)}&rows=10`) as { result?: { results?: Array<{ id: string; title: string; notes?: string }> } };
    
    const center = intent.where.center || [-98.5, 39.8];
    
    for (const d of data?.result?.results || []) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: center },
        properties: {
          source: 'data_gov',
          source_id: d.id,
          category: 'GOVERNMENT',
          name: d.title,
          description: (d.notes || '').slice(0, 200),
          confidence: 0.85,
        },
      });
    }
    
    return features;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // OSM POI - Generic fallback
  // ─────────────────────────────────────────────────────────────────────────
  osm_poi: async (intent) => {
    const bounds = intent.where.bounds;
    if (!bounds) return [];
    
    const features: GeoJSONFeature[] = [];
    const keywords = intent.what.keywords.slice(0, 2);
    
    // Try to build a smart query from keywords
    let amenityFilter = '';
    if (keywords.some(k => ['restaurant', 'food', 'dining'].includes(k))) amenityFilter = '["amenity"="restaurant"]';
    else if (keywords.some(k => ['hotel', 'lodging'].includes(k))) amenityFilter = '["tourism"="hotel"]';
    else amenityFilter = '["amenity"]';
    
    const query = `[out:json][timeout:20];node${amenityFilter}(${bounds.south},${bounds.west},${bounds.north},${bounds.east});out 50;`;
    
    const data = await fetchJSON(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`) as { elements?: Array<{ id: number; lat: number; lon: number; tags?: Record<string, string> }> };
    
    for (const el of data?.elements || []) {
      const tags = el.tags || {};
      
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [el.lon, el.lat] },
        properties: {
          source: 'osm_poi',
          source_id: `osm-node-${el.id}`,
          category: 'GEOSPATIAL',
          name: tags.name || capitalize(tags.amenity) || 'Location',
          address: tags['addr:street'],
          confidence: tags.name ? 0.85 : 0.6,
        },
      });
    }
    
    return features;
  },

  // Placeholder collectors
  noaa_tides: async () => [],
  usaspending: async () => [],
};

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4: LEAN PARALLEL EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function collectData(intent: ParsedIntent): Promise<{ features: GeoJSONFeature[]; sources: SourceResult[] }> {
  const features: GeoJSONFeature[] = [];
  const sources: SourceResult[] = [];
  
  const collectorsToRun = intent.collectors.filter(c => COLLECTORS[c]);
  console.log(`📡 Running collectors: ${collectorsToRun.join(', ')}`);
  
  const BATCH_SIZE = 3;
  
  for (let i = 0; i < collectorsToRun.length; i += BATCH_SIZE) {
    const batch = collectorsToRun.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.allSettled(
      batch.map(async (name) => {
        const start = Date.now();
        try {
          const data = await COLLECTORS[name](intent);
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
    
    // Small pause between batches
    if (i + BATCH_SIZE < collectorsToRun.length) {
      await new Promise(r => setTimeout(r, 10));
    }
  }
  
  return { features, sources };
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 5: AI INSIGHTS
// ═══════════════════════════════════════════════════════════════════════════

async function generateInsights(features: GeoJSONFeature[], intent: ParsedIntent, prompt: string): Promise<{ summary: string; key_findings: string[]; recommendations: string[] }> {
  if (features.length < 3 || !LOVABLE_API_KEY) {
    return {
      summary: features.length > 0 
        ? `Found ${features.length} results for "${intent.what.primary}" in ${intent.where.raw || intent.where.state || 'your area'}.`
        : 'No results found. Try broadening your search or different keywords.',
      key_findings: features.length > 0 
        ? [`${features.length} data points collected`, `Primary category: ${intent.what.category}`]
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
          { role: 'system', content: 'You analyze search results. Provide: 1 sentence summary, 3 key findings, 2 recommendations. Return JSON only: {"summary":"...","key_findings":["..."],"recommendations":["..."]}' },
          { role: 'user', content: `Query: "${prompt}"\nResults: ${features.length} features. Categories: ${intent.what.category}. Location: ${intent.where.raw || intent.where.state}.\nSample names: ${features.slice(0, 5).map(f => f.properties.name).join(', ')}` }
        ],
        temperature: 0.3,
        max_tokens: 400,
      }),
    });
    
    if (response.ok) {
      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content || '';
      const match = content.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    }
  } catch {
    // Fallback
  }
  
  return {
    summary: `Found ${features.length} results for "${intent.what.primary}".`,
    key_findings: [`${features.length} data points`, `Location: ${intent.where.raw || intent.where.state || 'Not specified'}`],
    recommendations: ['Explore the map', 'Export data for analysis'],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

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

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🌍 BASED DATA v9.0 — ZERO IN / ZERO OUT');
    console.log(`📝 Query: "${prompt}"`);
    const startTime = Date.now();

    // STEP 1: Parse intent with AI
    console.log('🧠 Step 1: Parsing intent...');
    const intent = await parseQueryIntent(prompt);
    console.log(`   ✓ What: ${intent.what.primary} (${intent.what.category})`);
    console.log(`   ✓ Where: ${intent.where.raw || 'Not specified'}`);
    console.log(`   ✓ Collectors: ${intent.collectors.join(', ')}`);

    // STEP 2: Geocode location
    console.log('📍 Step 2: Geocoding location...');
    intent.where = await geocodeLocation(intent.where);
    if (intent.where.bounds) {
      console.log(`   ✓ Bounds: [${intent.where.bounds.south.toFixed(3)}, ${intent.where.bounds.north.toFixed(3)}]`);
    }

    // STEP 3: Collect data
    console.log('📡 Step 3: Collecting data...');
    const { features, sources } = await collectData(intent);
    console.log(`   ✓ Collected ${features.length} features from ${sources.length} sources`);

    // STEP 4: Generate insights
    console.log('💡 Step 4: Generating insights...');
    const insights = await generateInsights(features, intent, prompt);

    // Persist a sample to DB (non-blocking)
    if (features.length > 0) {
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
      supabase.from('records').upsert(records, { onConflict: 'source_id,source_record_id', ignoreDuplicates: true }).then(() => {});
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Complete: ${features.length} features in ${processingTime}ms`);
    console.log('═══════════════════════════════════════════════════════════');

    return new Response(JSON.stringify({
      success: true,
      query_id: `bd_${Date.now()}`,
      prompt,
      intent: {
        use_case: intent.what.category,
        location: intent.where.bounds ? {
          name: intent.where.raw || intent.where.state || '',
          center: intent.where.center,
          bbox: [intent.where.bounds.west, intent.where.bounds.south, intent.where.bounds.east, intent.where.bounds.north],
        } : null,
        time_context: { type: intent.when.temporal },
        categories: [intent.what.category.toUpperCase()],
        keywords: intent.what.keywords,
        confidence: intent.confidence,
      },
      features: { type: 'FeatureCollection', features },
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
      engine_version: 'baseddata-v9.0-zero',
      enrichments: [],
      data_tap: {
        records_persisted: Math.min(features.length, 30),
        records_deduplicated: 0,
        dynamic_genesis: false,
        enrichment_queued: false,
        auto_expanded: false,
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('🚨 BASED DATA Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Query failed',
      query_id: `bd_error_${Date.now()}`,
      prompt: '',
      intent: { use_case: 'error', location: null, time_context: { type: 'current' }, categories: [], keywords: [], confidence: 0 },
      features: { type: 'FeatureCollection', features: [] },
      insights: null,
      collected_data: [],
      sources_used: [],
      processing_time_ms: 0,
      credits_used: 0,
      engine_version: 'baseddata-v9.0-zero',
      enrichments: [],
      data_tap: { records_persisted: 0, records_deduplicated: 0 },
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
