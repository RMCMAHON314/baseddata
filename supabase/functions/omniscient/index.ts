// ═══════════════════════════════════════════════════════════════════════════
// 🌍 BASED DATA ENGINE v10.0 — INTELLIGENT QUERY ENGINE
// 
// ARCHITECTURE:
// 1. AI-powered intent parsing with OSM tags + relevance criteria
// 2. Precision geocoding with hardcoded fallbacks
// 3. Intelligent collector selection based on intent
// 4. RELEVANCE SCORING - filter out garbage before display
// 5. POST-PROCESSING - hard filters + soft ranking + diversity
// 6. High-fidelity data extraction with smart naming
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const USER_AGENT = 'BASEDDATA/10.0 (baseddata.lovable.app)';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES - Enhanced with Relevance Criteria
// ═══════════════════════════════════════════════════════════════════════════

interface CoreEntity {
  type: string;
  keywords: string[];
  osm_tags: {
    primary: Record<string, string>;
    secondary: Record<string, string>[];
  };
  exclude_keywords: string[];
}

interface RelevanceCriteria {
  must_have: string[];
  should_have: string[];
  must_not_have: string[];
}

interface ParsedIntent {
  core_entity: CoreEntity;
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
  relevance_criteria: RelevanceCriteria;
  data_sources: {
    primary: string[];
    secondary: string[];
    excluded: string[];
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
  records_after_filter: number;
  time_ms: number;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTITY TYPE MAPPINGS - For smart inference
// ═══════════════════════════════════════════════════════════════════════════

const ENTITY_MAPPINGS: Record<string, {
  type: string;
  osm_primary: Record<string, string>;
  osm_secondary: Record<string, string>[];
  keywords: string[];
  exclude: string[];
  must_have: string[];
  should_have: string[];
  must_not_have: string[];
  category: string;
}> = {
  baseball: {
    type: 'sports_facility',
    osm_primary: { sport: 'baseball' },
    osm_secondary: [{ leisure: 'pitch' }, { leisure: 'sports_centre' }, { leisure: 'stadium' }],
    keywords: ['baseball', 'field', 'diamond', 'batting cage', 'little league', 'softball'],
    exclude: ['golf', 'soccer', 'tennis', 'basketball', 'football'],
    must_have: ['baseball', 'softball', 'batting', 'diamond', 'little league', 'dugout'],
    should_have: ['field', 'park', 'recreation', 'sports'],
    must_not_have: ['golf course', 'soccer field', 'tennis court', 'basketball court', 'football field'],
    category: 'recreation',
  },
  soccer: {
    type: 'sports_facility',
    osm_primary: { sport: 'soccer' },
    osm_secondary: [{ leisure: 'pitch' }, { sport: 'football' }],
    keywords: ['soccer', 'football', 'pitch', 'field', 'goal'],
    exclude: ['american football', 'baseball', 'golf'],
    must_have: ['soccer', 'football', 'pitch'],
    should_have: ['field', 'goal', 'recreation'],
    must_not_have: ['baseball', 'golf', 'tennis', 'american football'],
    category: 'recreation',
  },
  tennis: {
    type: 'sports_facility',
    osm_primary: { sport: 'tennis' },
    osm_secondary: [{ leisure: 'pitch' }],
    keywords: ['tennis', 'court', 'racquet'],
    exclude: ['golf', 'soccer', 'baseball'],
    must_have: ['tennis', 'court', 'racquet'],
    should_have: ['club', 'recreation'],
    must_not_have: ['golf', 'soccer', 'baseball'],
    category: 'recreation',
  },
  basketball: {
    type: 'sports_facility',
    osm_primary: { sport: 'basketball' },
    osm_secondary: [{ leisure: 'pitch' }],
    keywords: ['basketball', 'court', 'hoop'],
    exclude: ['golf', 'soccer', 'baseball', 'tennis'],
    must_have: ['basketball', 'court', 'hoop'],
    should_have: ['recreation', 'gym'],
    must_not_have: ['golf', 'soccer', 'baseball', 'tennis'],
    category: 'recreation',
  },
  golf: {
    type: 'sports_facility',
    osm_primary: { leisure: 'golf_course' },
    osm_secondary: [{ sport: 'golf' }],
    keywords: ['golf', 'course', 'driving range', 'club'],
    exclude: ['mini golf', 'baseball', 'soccer'],
    must_have: ['golf', 'course', 'club', 'driving range'],
    should_have: ['country', 'links'],
    must_not_have: ['baseball', 'soccer', 'tennis', 'mini'],
    category: 'recreation',
  },
  park: {
    type: 'recreation_area',
    osm_primary: { leisure: 'park' },
    osm_secondary: [{ boundary: 'national_park' }, { leisure: 'nature_reserve' }],
    keywords: ['park', 'recreation', 'nature', 'outdoor'],
    exclude: ['parking'],
    must_have: ['park', 'recreation', 'nature'],
    should_have: ['trail', 'playground', 'picnic'],
    must_not_have: ['parking lot', 'parking garage'],
    category: 'recreation',
  },
  hospital: {
    type: 'healthcare_facility',
    osm_primary: { amenity: 'hospital' },
    osm_secondary: [{ amenity: 'clinic' }, { healthcare: 'hospital' }],
    keywords: ['hospital', 'medical center', 'healthcare', 'emergency'],
    exclude: ['veterinary'],
    must_have: ['hospital', 'medical', 'healthcare', 'clinic'],
    should_have: ['emergency', 'care'],
    must_not_have: ['veterinary', 'animal'],
    category: 'healthcare',
  },
  school: {
    type: 'education_facility',
    osm_primary: { amenity: 'school' },
    osm_secondary: [{ amenity: 'college' }, { amenity: 'university' }],
    keywords: ['school', 'education', 'elementary', 'high school', 'academy'],
    exclude: ['driving school'],
    must_have: ['school', 'education', 'academy', 'elementary', 'high'],
    should_have: ['learning', 'student'],
    must_not_have: ['driving school', 'dance school'],
    category: 'education',
  },
  restaurant: {
    type: 'food_establishment',
    osm_primary: { amenity: 'restaurant' },
    osm_secondary: [{ amenity: 'cafe' }, { amenity: 'fast_food' }],
    keywords: ['restaurant', 'dining', 'food', 'eat'],
    exclude: ['gas station'],
    must_have: ['restaurant', 'dining', 'food', 'cafe'],
    should_have: ['cuisine', 'menu'],
    must_not_have: ['gas station', 'convenience'],
    category: 'dining',
  },
  hunting: {
    type: 'hunting_area',
    osm_primary: { hunting: 'yes' },
    osm_secondary: [{ leisure: 'nature_reserve' }, { natural: 'wetland' }],
    keywords: ['hunting', 'game', 'waterfowl', 'deer', 'wildlife'],
    exclude: [],
    must_have: ['hunting', 'game', 'waterfowl', 'wildlife'],
    should_have: ['reserve', 'management'],
    must_not_have: [],
    category: 'wildlife',
  },
  // Government Spending / Federal Contracts
  'tax funded': {
    type: 'federal_spending',
    osm_primary: {},
    osm_secondary: [],
    keywords: ['tax', 'funded', 'federal', 'grant', 'contract', 'award', 'spending', 'government', 'IT', 'technology', 'project'],
    exclude: [],
    must_have: ['award', 'contract', 'grant', 'funding', 'federal', 'government'],
    should_have: ['technology', 'IT', 'project', 'data', 'agency'],
    must_not_have: [],
    category: 'government',
  },
  contract: {
    type: 'federal_spending',
    osm_primary: {},
    osm_secondary: [],
    keywords: ['contract', 'award', 'procurement', 'federal', 'government', 'spending'],
    exclude: [],
    must_have: ['contract', 'award', 'procurement', 'federal'],
    should_have: ['agency', 'vendor', 'recipient'],
    must_not_have: [],
    category: 'government',
  },
  grant: {
    type: 'federal_spending',
    osm_primary: {},
    osm_secondary: [],
    keywords: ['grant', 'funding', 'federal', 'award', 'recipient'],
    exclude: [],
    must_have: ['grant', 'funding', 'award', 'federal'],
    should_have: ['recipient', 'agency', 'program'],
    must_not_have: [],
    category: 'government',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: INTELLIGENT QUERY PARSING
// ═══════════════════════════════════════════════════════════════════════════

// Hardcoded bounding boxes for major US counties
const COUNTY_BBOXES: Record<string, { bounds: { north: number; south: number; east: number; west: number }; center: [number, number] }> = {
  'baltimore_md': { bounds: { north: 39.72, south: 39.23, east: -76.32, west: -76.92 }, center: [-76.61, 39.47] },
  'baltimore city_md': { bounds: { north: 39.37, south: 39.20, east: -76.53, west: -76.71 }, center: [-76.61, 39.29] },
  'anne arundel_md': { bounds: { north: 39.22, south: 38.67, east: -76.40, west: -76.84 }, center: [-76.60, 38.95] },
  'montgomery_md': { bounds: { north: 39.36, south: 38.93, east: -76.88, west: -77.52 }, center: [-77.20, 39.14] },
  'prince george_md': { bounds: { north: 39.14, south: 38.54, east: -76.67, west: -77.04 }, center: [-76.85, 38.84] },
  'howard_md': { bounds: { north: 39.35, south: 39.10, east: -76.70, west: -77.07 }, center: [-76.93, 39.25] },
  'harford_md': { bounds: { north: 39.72, south: 39.35, east: -76.05, west: -76.51 }, center: [-76.30, 39.53] },
  'fairfax_va': { bounds: { north: 39.03, south: 38.59, east: -77.09, west: -77.53 }, center: [-77.31, 38.81] },
  'arlington_va': { bounds: { north: 38.94, south: 38.83, east: -77.03, west: -77.17 }, center: [-77.10, 38.88] },
  'los angeles_ca': { bounds: { north: 34.82, south: 33.70, east: -117.65, west: -118.67 }, center: [-118.24, 34.05] },
  'orange_ca': { bounds: { north: 33.95, south: 33.39, east: -117.41, west: -118.12 }, center: [-117.76, 33.67] },
  'san diego_ca': { bounds: { north: 33.51, south: 32.53, east: -116.08, west: -117.60 }, center: [-117.16, 32.72] },
  'cook_il': { bounds: { north: 42.16, south: 41.47, east: -87.52, west: -88.26 }, center: [-87.68, 41.88] },
  'harris_tx': { bounds: { north: 30.17, south: 29.50, east: -95.01, west: -95.91 }, center: [-95.36, 29.76] },
  'maricopa_az': { bounds: { north: 34.04, south: 32.51, east: -111.04, west: -113.33 }, center: [-112.07, 33.45] },
  'king_wa': { bounds: { north: 47.78, south: 47.08, east: -121.07, west: -122.54 }, center: [-122.33, 47.45] },
  'miami-dade_fl': { bounds: { north: 25.98, south: 25.14, east: -80.09, west: -80.87 }, center: [-80.19, 25.76] },
  'new york_ny': { bounds: { north: 40.92, south: 40.48, east: -73.70, west: -74.26 }, center: [-74.01, 40.71] },
  'philadelphia_pa': { bounds: { north: 40.14, south: 39.87, east: -74.96, west: -75.28 }, center: [-75.16, 39.95] },
  'suffolk_ny': { bounds: { north: 41.16, south: 40.59, east: -71.85, west: -73.50 }, center: [-72.80, 40.88] },
  'nassau_ny': { bounds: { north: 40.93, south: 40.52, east: -73.42, west: -73.74 }, center: [-73.59, 40.73] },
};

const STATE_MAP: Record<string, { name: string; code: string; center: [number, number] }> = {
  'maryland': { name: 'Maryland', code: 'MD', center: [-76.6, 39.0] },
  'md': { name: 'Maryland', code: 'MD', center: [-76.6, 39.0] },
  'california': { name: 'California', code: 'CA', center: [-119.4, 36.8] },
  'ca': { name: 'California', code: 'CA', center: [-119.4, 36.8] },
  'texas': { name: 'Texas', code: 'TX', center: [-99.9, 31.9] },
  'tx': { name: 'Texas', code: 'TX', center: [-99.9, 31.9] },
  'new york': { name: 'New York', code: 'NY', center: [-74.0, 40.7] },
  'ny': { name: 'New York', code: 'NY', center: [-74.0, 40.7] },
  'virginia': { name: 'Virginia', code: 'VA', center: [-78.2, 37.4] },
  'va': { name: 'Virginia', code: 'VA', center: [-78.2, 37.4] },
  'florida': { name: 'Florida', code: 'FL', center: [-81.5, 27.6] },
  'fl': { name: 'Florida', code: 'FL', center: [-81.5, 27.6] },
  'pennsylvania': { name: 'Pennsylvania', code: 'PA', center: [-77.2, 41.2] },
  'pa': { name: 'Pennsylvania', code: 'PA', center: [-77.2, 41.2] },
  'ohio': { name: 'Ohio', code: 'OH', center: [-82.9, 40.4] },
  'oh': { name: 'Ohio', code: 'OH', center: [-82.9, 40.4] },
  'georgia': { name: 'Georgia', code: 'GA', center: [-83.5, 32.9] },
  'ga': { name: 'Georgia', code: 'GA', center: [-83.5, 32.9] },
  'illinois': { name: 'Illinois', code: 'IL', center: [-89.3, 40.6] },
  'il': { name: 'Illinois', code: 'IL', center: [-89.3, 40.6] },
  'michigan': { name: 'Michigan', code: 'MI', center: [-84.5, 44.3] },
  'mi': { name: 'Michigan', code: 'MI', center: [-84.5, 44.3] },
  'arizona': { name: 'Arizona', code: 'AZ', center: [-111.9, 34.0] },
  'az': { name: 'Arizona', code: 'AZ', center: [-111.9, 34.0] },
  'washington': { name: 'Washington', code: 'WA', center: [-120.5, 47.4] },
  'wa': { name: 'Washington', code: 'WA', center: [-120.5, 47.4] },
  'massachusetts': { name: 'Massachusetts', code: 'MA', center: [-71.4, 42.4] },
  'ma': { name: 'Massachusetts', code: 'MA', center: [-71.4, 42.4] },
};

function parseQueryIntent(prompt: string): ParsedIntent {
  const lower = prompt.toLowerCase();
  
  // ═══════════════════════════════════════════════════════════════
  // STEP 1A: Detect entity type from ENTITY_MAPPINGS
  // ═══════════════════════════════════════════════════════════════
  let detectedEntity: typeof ENTITY_MAPPINGS[string] | null = null;
  let entityKey = '';
  
  for (const [key, mapping] of Object.entries(ENTITY_MAPPINGS)) {
    if (lower.includes(key)) {
      detectedEntity = mapping;
      entityKey = key;
      break;
    }
    // Also check keywords
    if (mapping.keywords.some(kw => lower.includes(kw))) {
      detectedEntity = mapping;
      entityKey = key;
      break;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // STEP 1B: Extract location - EXCLUDE prepositions from county name
  // ═══════════════════════════════════════════════════════════════
  const countyMatch = lower.match(/(?:^|[\s,])(?!in\s|at\s|near\s|around\s|the\s)([a-z]+(?:\s+[a-z]+)?)\s+county\b/);
  
  let stateCode = '';
  let stateName = '';
  let center: [number, number] = [-98.5, 39.8];
  let countyName = '';
  
  if (countyMatch && countyMatch[1]) {
    countyName = countyMatch[1].trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  
  for (const [key, val] of Object.entries(STATE_MAP)) {
    if (lower.includes(key)) {
      stateName = val.name;
      stateCode = val.code;
      center = val.center;
      break;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 1C: Build core entity with OSM tags and relevance criteria
  // ═══════════════════════════════════════════════════════════════
  const words = prompt.split(/\s+/).filter(w => w.length > 2);
  const stopWords = ['in', 'at', 'near', 'around', 'the', 'for', 'and', 'with', 'county', 'city', 'state', 'facilities', 'facility', 'all', 'show', 'find', 'get', 'list'];
  const primaryWords = words.filter(w => 
    !stopWords.includes(w.toLowerCase()) && 
    !STATE_MAP[w.toLowerCase()] &&
    !w.toLowerCase().includes('county')
  );

  const coreEntity: CoreEntity = detectedEntity ? {
    type: detectedEntity.type,
    keywords: [...detectedEntity.keywords, ...primaryWords.slice(0, 3)],
    osm_tags: {
      primary: detectedEntity.osm_primary,
      secondary: detectedEntity.osm_secondary,
    },
    exclude_keywords: detectedEntity.exclude,
  } : {
    type: 'generic_poi',
    keywords: primaryWords.slice(0, 5),
    osm_tags: { primary: {}, secondary: [] },
    exclude_keywords: [],
  };

  const relevanceCriteria: RelevanceCriteria = detectedEntity ? {
    must_have: detectedEntity.must_have,
    should_have: detectedEntity.should_have,
    must_not_have: detectedEntity.must_not_have,
  } : {
    must_have: primaryWords.slice(0, 2),
    should_have: primaryWords.slice(2, 4),
    must_not_have: [],
  };

  // ═══════════════════════════════════════════════════════════════
  // STEP 1D: Determine data sources based on entity type
  // ═══════════════════════════════════════════════════════════════
  const category = detectedEntity?.category || detectCategory(lower);
  const dataSources = selectDataSources(category, coreEntity.type);

  // Build location string for geocoding
  const rawLocation = countyName 
    ? `${countyName} County${stateName ? `, ${stateName}` : ''}`
    : stateName || '';
  
  // Check for hardcoded bbox
  let bounds: ParsedIntent['where']['bounds'] | undefined;
  if (countyName && stateCode) {
    const bboxKey = `${countyName.toLowerCase()}_${stateCode.toLowerCase()}`;
    const hardcoded = COUNTY_BBOXES[bboxKey];
    if (hardcoded) {
      bounds = hardcoded.bounds;
      center = hardcoded.center;
    }
  }

  const intent: ParsedIntent = {
    core_entity: coreEntity,
    what: {
      primary: entityKey || primaryWords.slice(0, 3).join(' ') || prompt,
      keywords: primaryWords,
      category,
      subcategory: entityKey || undefined,
    },
    where: {
      raw: rawLocation,
      county: countyName || undefined,
      state: stateName,
      stateCode,
      country: 'USA',
      center,
      bounds,
    },
    when: {
      temporal: lower.includes('forecast') ? 'forecast' : 'current',
    },
    filters: {
      indoor: lower.includes('indoor') ? true : undefined,
      outdoor: lower.includes('outdoor') ? true : undefined,
      keywords: primaryWords,
    },
    relevance_criteria: relevanceCriteria,
    data_sources: dataSources,
    collectors: [],
    confidence: detectedEntity ? 0.95 : 0.75,
  };

  intent.collectors = selectCollectors(intent);
  return intent;
}

function detectCategory(text: string): string {
  if (['baseball', 'soccer', 'tennis', 'basketball', 'sports', 'gym', 'fitness', 'park', 'trail', 'recreation', 'field', 'athletic', 'stadium', 'golf'].some(k => text.includes(k))) return 'recreation';
  if (['bird', 'wildlife', 'animal', 'hunting', 'fishing', 'species', 'goose', 'duck'].some(k => text.includes(k))) return 'wildlife';
  if (['weather', 'forecast', 'temperature', 'rain', 'storm'].some(k => text.includes(k))) return 'weather';
  // Enhanced healthcare detection with doctor payments, NPI, drugs
  if (['hospital', 'doctor', 'clinic', 'medical', 'health', 'physician', 'npi', 'drug', 'pharma', 'prescription', 'pharmacy', 'payment', 'cms'].some(k => text.includes(k))) return 'healthcare';
  // Enhanced government detection with spending/funding terms
  if (['contract', 'grant', 'federal', 'government', 'procurement', 'tax', 'funded', 'spending', 'award', 'usaspending', 'agency'].some(k => text.includes(k))) return 'government';
  if (['school', 'college', 'university', 'education'].some(k => text.includes(k))) return 'education';
  if (['restaurant', 'food', 'dining', 'cafe'].some(k => text.includes(k))) return 'dining';
  // Financial sector
  if (['bank', 'financial', 'deposit', 'fdic', 'credit union', 'atm'].some(k => text.includes(k))) return 'financial';
  // Environmental sector
  if (['epa', 'pollution', 'environmental', 'toxic', 'emission', 'permit', 'water quality'].some(k => text.includes(k))) return 'environmental';
  return 'geospatial';
}

function selectDataSources(category: string, entityType: string): { primary: string[]; secondary: string[]; excluded: string[] } {
  const sources: { primary: string[]; secondary: string[]; excluded: string[] } = {
    primary: [],
    secondary: [],
    excluded: [],
  };

  switch (category) {
    case 'recreation':
      sources.primary = ['osm_sports', 'recreation_gov'];
      sources.secondary = ['nps'];
      sources.excluded = ['inaturalist', 'noaa_weather'];
      break;
    case 'wildlife':
      sources.primary = ['inaturalist', 'gbif'];
      sources.secondary = ['osm_poi'];
      sources.excluded = ['osm_sports', 'usaspending'];
      break;
    case 'weather':
      sources.primary = ['noaa_weather', 'open_meteo'];
      sources.secondary = [];
      sources.excluded = ['osm_sports', 'inaturalist'];
      break;
    case 'healthcare':
      // DATAVERSE: Enhanced healthcare with NPI, CMS, FDA
      sources.primary = ['osm_healthcare', 'npi_registry', 'cms_open_payments'];
      sources.secondary = ['fda_drugs', 'osm_poi'];
      sources.excluded = ['inaturalist', 'noaa_weather', 'usaspending'];
      break;
    case 'education':
      sources.primary = ['osm_education'];
      sources.secondary = ['osm_poi'];
      sources.excluded = ['inaturalist', 'noaa_weather'];
      break;
    case 'government':
      sources.primary = ['data_gov', 'usaspending'];
      sources.secondary = ['osm_poi'];
      sources.excluded = ['inaturalist'];
      break;
    case 'financial':
      // DATAVERSE: FDIC Banks
      sources.primary = ['fdic_banks', 'osm_poi'];
      sources.secondary = [];
      sources.excluded = ['inaturalist', 'noaa_weather', 'npi_registry'];
      break;
    case 'environmental':
      // DATAVERSE: EPA ECHO
      sources.primary = ['epa_echo'];
      sources.secondary = ['osm_poi'];
      sources.excluded = ['inaturalist', 'usaspending'];
      break;
    default:
      sources.primary = ['osm_poi'];
      sources.secondary = ['recreation_gov'];
      sources.excluded = [];
  }

  return sources;
}

function selectCollectors(intent: ParsedIntent): string[] {
  const collectors: string[] = [];
  const { primary, secondary } = intent.data_sources;
  
  // Add primary collectors
  collectors.push(...primary);
  
  // Add secondary collectors
  collectors.push(...secondary);
  
  // Default fallback
  if (collectors.length === 0) {
    collectors.push('osm_poi');
  }

  return [...new Set(collectors)];
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: GEOCODING WITH NOMINATIM + HARDCODED FALLBACKS
// ═══════════════════════════════════════════════════════════════════════════

async function geocodeLocation(where: ParsedIntent['where']): Promise<ParsedIntent['where']> {
  // If we already have bounds from hardcoded fallback, skip geocoding
  if (where.bounds) {
    console.log(`📍 Using pre-filled bounds: [${where.bounds.south.toFixed(3)}, ${where.bounds.north.toFixed(3)}]`);
    return where;
  }

  if (!where.raw && !where.city && !where.county && !where.state) {
    return where;
  }

  let searchText = '';
  
  if (where.county) {
    searchText = `${where.county} County, ${where.state || where.stateCode || ''}, United States`.replace(/,\s*,/g, ',').trim();
  } else if (where.city && where.state) {
    searchText = `${where.city}, ${where.state}, United States`;
  } else if (where.raw) {
    searchText = where.raw.replace(/^(in|at|near|around)\s+/i, '').trim();
    if (!searchText.toLowerCase().includes('usa') && !searchText.toLowerCase().includes('united states')) {
      searchText += ', United States';
    }
  } else if (where.state) {
    searchText = `${where.state}, United States`;
  }
  
  if (!searchText || searchText === ', United States') return where;

  try {
    let url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(searchText)}`;
    if (where.county) {
      url += '&featuretype=county';
    }
    
    console.log(`📍 Geocoding: "${searchText}"`);
    
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
    });

    if (!response.ok) return where;
    const data = await response.json();
    
    if (data?.[0]) {
      const result = data[0];
      const [south, north, west, east] = result.boundingbox.map(Number);
      
      const latRange = north - south;
      const lngRange = east - west;
      
      if (latRange < 0.01 || lngRange < 0.01) {
        console.log(`   ⚠ Result too small, expanding...`);
        return {
          ...where,
          raw: searchText,
          bounds: { north: north + 0.1, south: south - 0.1, east: east + 0.1, west: west - 0.1 },
          center: [parseFloat(result.lon), parseFloat(result.lat)],
        };
      }
      
      console.log(`   ✓ Found: [${south.toFixed(3)}, ${north.toFixed(3)}, ${west.toFixed(3)}, ${east.toFixed(3)}]`);
      
      return {
        ...where,
        raw: searchText,
        bounds: { north, south, east, west },
        center: [parseFloat(result.lon), parseFloat(result.lat)],
      };
    }
  } catch (e) {
    console.error('Geocoding failed:', e);
  }

  // Last resort fallback
  if (where.county && where.stateCode) {
    const bboxKey = `${where.county.toLowerCase()}_${where.stateCode.toLowerCase()}`;
    const hardcoded = COUNTY_BBOXES[bboxKey];
    if (hardcoded) {
      return { ...where, bounds: hardcoded.bounds, center: hardcoded.center };
    }
  }

  return where;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: RELEVANCE SCORING ENGINE (THE SECRET SAUCE)
// ═══════════════════════════════════════════════════════════════════════════

function calculateRelevance(record: GeoJSONFeature, intent: ParsedIntent): number {
  const criteria = intent.relevance_criteria;
  const coreEntity = intent.core_entity;
  const props = record.properties;
  const category = intent.what.category.toLowerCase();
  
  // ═════ SPECIAL HANDLING FOR HIGH-TRUST SOURCES ═════
  const source = String(props.source || '');
  const recordCategory = String(props.category || '').toLowerCase();
  
  // Trust high-quality data sources - pre-filtered by API
  if (['usaspending', 'npi_registry', 'cms_open_payments', 'fdic_banks', 'epa_echo'].includes(source)) {
    // These are authoritative sources, trust their data
    return Math.max((props.confidence as number) || 0.8, 0.75);
  }
  
  // ═════ CATEGORY MATCHING BONUS ═════
  // If record category matches query category, give it a baseline boost
  let score = 0.5; // Base score
  
  const categoryMatches = 
    (category === 'healthcare' && ['health', 'healthcare', 'medical'].includes(recordCategory)) ||
    (category === 'government' && ['government', 'contract', 'grant'].includes(recordCategory)) ||
    (category === 'recreation' && ['recreation', 'sports'].includes(recordCategory)) ||
    (category === 'education' && ['education'].includes(recordCategory)) ||
    (category === 'financial' && ['financial', 'bank'].includes(recordCategory)) ||
    (category === 'environmental' && ['environmental'].includes(recordCategory));
  
  if (categoryMatches) {
    score += 0.25; // Significant boost for matching category
  }
  
  // Combine all searchable text from the record
  const searchableText = [
    String(props.name || ''),
    String(props.description || ''),
    String(props.sport || ''),
    String(props.leisure_type || ''),
    String(props.amenity || ''),
    String(props.facility_type || ''),
    String(props.award_type || ''),
    String(props.awarding_agency || ''),
    JSON.stringify(props),
  ].join(' ').toLowerCase();
  
  // ═════ MUST HAVE CHECKS (Softened for category matches) ═════
  let mustHaveMatches = 0;
  const mustHaveTotal = criteria.must_have.length;
  
  for (const condition of criteria.must_have) {
    const orTerms = condition.toLowerCase().split(' or ').map(t => t.trim());
    const hasMatch = orTerms.some(term => searchableText.includes(term));
    if (hasMatch) mustHaveMatches++;
  }
  
  if (mustHaveTotal > 0) {
    const mustHaveRatio = mustHaveMatches / mustHaveTotal;
    if (mustHaveRatio === 0) {
      // If category matches, don't penalize as harshly
      score = categoryMatches ? 0.35 : 0.1;
    } else {
      score += mustHaveRatio * 0.25;
    }
  }
  
  // ═════ MUST NOT HAVE CHECKS (Disqualifying) ═════
  for (const term of criteria.must_not_have) {
    if (searchableText.includes(term.toLowerCase())) {
      score -= 0.25;
    }
  }
  
  // ═════ SHOULD HAVE CHECKS (Bonus) ═════
  let shouldHaveMatches = 0;
  for (const term of criteria.should_have) {
    if (searchableText.includes(term.toLowerCase())) {
      shouldHaveMatches++;
    }
  }
  if (criteria.should_have.length > 0) {
    score += (shouldHaveMatches / criteria.should_have.length) * 0.15;
  }
  
  // ═════ KEYWORD MATCHING ═════
  let keywordMatches = 0;
  for (const keyword of coreEntity.keywords.slice(0, 5)) {
    if (searchableText.includes(keyword.toLowerCase())) {
      keywordMatches++;
    }
  }
  if (coreEntity.keywords.length > 0) {
    score += (keywordMatches / Math.min(coreEntity.keywords.length, 5)) * 0.1;
  }
  
  // ═════ OSM TAG MATCHING (High confidence) ═════
  const primaryTag = coreEntity.osm_tags?.primary;
  if (primaryTag && Object.keys(primaryTag).length > 0) {
    for (const [key, value] of Object.entries(primaryTag)) {
      if (String(props[key]).toLowerCase() === value.toLowerCase() ||
          String(props.sport).toLowerCase() === value.toLowerCase()) {
        score += 0.15;
        break;
      }
    }
  }
  
  // ═════ NAME QUALITY ═════
  if (props.has_official_name) {
    score += 0.05;
  }
  const name = String(props.name || '').toLowerCase();
  if (name.includes('unnamed') || name.includes('unknown') || name.includes('#')) {
    score -= 0.05;
  }
  
  // ═════ GOVERNMENT/SPENDING BONUS ═════
  if (coreEntity.type === 'federal_spending') {
    if (props.award_amount || props.awarding_agency || props.award_type) {
      score += 0.2;
    }
  }
  
  // Clamp score between 0 and 1
  return Math.max(0, Math.min(1.0, score));
}

function getRelevanceFlags(record: GeoJSONFeature, intent: ParsedIntent): string[] {
  const flags: string[] = [];
  const searchableText = JSON.stringify(record.properties).toLowerCase();
  
  for (const keyword of intent.core_entity.keywords.slice(0, 3)) {
    if (searchableText.includes(keyword.toLowerCase())) {
      flags.push(`✓ ${keyword}`);
    }
  }
  
  const props = record.properties;
  if (props.sport) flags.push(`Sport: ${props.sport}`);
  if (props.leisure_type) flags.push(`Type: ${props.leisure_type}`);
  
  return flags;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4: POST-PROCESSING FILTER
// ═══════════════════════════════════════════════════════════════════════════

function filterAndRankResults(
  records: GeoJSONFeature[], 
  intent: ParsedIntent
): { filtered: GeoJSONFeature[]; filteredOutCount: number; avgRelevance: number } {
  
  // Calculate relevance scores
  const scoredRecords = records.map(record => {
    const relevanceScore = calculateRelevance(record, intent);
    const relevanceFlags = getRelevanceFlags(record, intent);
    const newRecord: GeoJSONFeature = {
      type: 'Feature',
      geometry: record.geometry,
      properties: {
        ...record.properties,
        relevance_score: relevanceScore,
        relevance_flags: relevanceFlags,
      },
    };
    return newRecord;
  });
  
  // ═════ HARD FILTERS ═════
  const MINIMUM_RELEVANCE = 0.35;
  let filtered = scoredRecords.filter(r => 
    (r.properties.relevance_score as number) >= MINIMUM_RELEVANCE
  );
  
  // Verify geographic bounds
  if (intent.where.bounds) {
    const { north, south, east, west } = intent.where.bounds;
    filtered = filtered.filter(r => {
      const coords = r.geometry?.coordinates;
      if (!coords || r.geometry?.type !== 'Point') return true;
      const [lng, lat] = coords as number[];
      return lat <= north && lat >= south && lng <= east && lng >= west;
    });
  }
  
  // ═════ SOFT RANKING ═════
  filtered.sort((a, b) => 
    (b.properties.relevance_score as number) - (a.properties.relevance_score as number)
  );
  
  // ═════ DIVERSITY - Don't show all from same source ═════
  const bySource = new Map<string, GeoJSONFeature[]>();
  filtered.forEach(r => {
    const src = String(r.properties.source);
    if (!bySource.has(src)) bySource.set(src, []);
    bySource.get(src)!.push(r);
  });
  
  const interleaved: GeoJSONFeature[] = [];
  let hasMore = true;
  let index = 0;
  const sources = Array.from(bySource.keys());
  
  while (hasMore && interleaved.length < filtered.length) {
    hasMore = false;
    for (const source of sources) {
      const sourceRecords = bySource.get(source)!;
      if (index < sourceRecords.length) {
        interleaved.push(sourceRecords[index]);
        hasMore = true;
      }
    }
    index++;
  }
  
  // Re-sort by relevance after interleaving (keeps diversity but prioritizes relevance)
  interleaved.sort((a, b) => 
    (b.properties.relevance_score as number) - (a.properties.relevance_score as number)
  );
  
  const filteredOutCount = records.length - interleaved.length;
  const avgRelevance = interleaved.length > 0
    ? interleaved.reduce((sum, r) => sum + (r.properties.relevance_score as number), 0) / interleaved.length
    : 0;
  
  return { filtered: interleaved, filteredOutCount, avgRelevance };
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 5: HIGH-FIDELITY DATA COLLECTORS
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

function generateSmartName(tags: Record<string, string>, lat: number, lon: number): string {
  const realName = tags.name || tags.official_name || tags['name:en'] || tags.alt_name || tags.loc_name || tags.short_name || tags.brand;
  if (realName && realName.trim()) return realName;
  
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
  
  if (tags.ref) {
    const sportType = tags.sport ? capitalize(tags.sport) : 'Sports';
    return `${sportType} Field ${tags.ref}`;
  }
  
  const sportName = tags.sport ? capitalize(tags.sport) : null;
  const leisureType = tags.leisure ? capitalize(tags.leisure) : null;
  const gridRef = `${lat.toFixed(3)}_${lon.toFixed(3)}`;
  
  if (sportName && leisureType) {
    if (leisureType.toLowerCase() === 'pitch') return `${sportName} Field @${gridRef}`;
    if (leisureType.toLowerCase() === 'sports centre') return `${sportName} Center @${gridRef}`;
    return `${sportName} ${leisureType} @${gridRef}`;
  }
  if (sportName) return `${sportName} Facility @${gridRef}`;
  if (leisureType) return `${leisureType} @${gridRef}`;
  
  return `Recreation Site @${gridRef}`;
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
    const osmPrimary = intent.core_entity.osm_tags.primary;
    
    // Build targeted Overpass query using parsed OSM tags
    let query: string;
    
    if (Object.keys(osmPrimary).length > 0) {
      const primaryFilter = Object.entries(osmPrimary).map(([k, v]) => `["${k}"="${v}"]`).join('');
      query = `[out:json][timeout:30];(
        node${primaryFilter}(${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        way${primaryFilter}(${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        node["leisure"~"pitch|sports_centre|stadium"]${primaryFilter}(${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        way["leisure"~"pitch|sports_centre|stadium"]${primaryFilter}(${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        ${isIndoor ? `node["building"~"sports|gymnasium",i](${bounds.south},${bounds.west},${bounds.north},${bounds.east});` : ''}
      );out center 200;`;
    } else if (sport) {
      query = `[out:json][timeout:30];(
        node["sport"~"${sport}",i](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        way["sport"~"${sport}",i](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        node["leisure"~"pitch|sports_centre|stadium"]["sport"~"${sport}",i](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        way["leisure"~"pitch|sports_centre|stadium"]["sport"~"${sport}",i](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      );out center 200;`;
    } else {
      query = `[out:json][timeout:30];(
        node["leisure"~"pitch|sports_centre|stadium"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        way["leisure"~"pitch|sports_centre|stadium"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        node["sport"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
        way["sport"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      );out center 200;`;
    }
    
    const data = await fetchJSON(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`) as { elements?: Array<{ id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> };
    
    for (const el of data?.elements || []) {
      const tags = el.tags || {};
      const lat = el.lat || el.center?.lat;
      const lon = el.lon || el.center?.lon;
      if (!lat || !lon) continue;
      
      const name = generateSmartName(tags, lat, lon);
      const hasRealName = !!(tags.name || tags.official_name || tags['name:en']);
      
      const descParts: string[] = [];
      if (tags.sport) descParts.push(`Sport: ${capitalize(tags.sport)}`);
      if (tags.surface) descParts.push(`Surface: ${capitalize(tags.surface)}`);
      if (tags.indoor === 'yes' || tags.building) descParts.push('Indoor');
      if (tags.lit === 'yes') descParts.push('Lighted');
      if (tags.access === 'public') descParts.push('Public');
      else if (tags.access === 'private') descParts.push('Private');
      
      const addressParts: string[] = [];
      if (tags['addr:housenumber']) addressParts.push(tags['addr:housenumber']);
      if (tags['addr:street']) addressParts.push(tags['addr:street']);
      if (tags['addr:city']) addressParts.push(tags['addr:city']);
      const address = tags['addr:full'] || (addressParts.length > 0 ? addressParts.join(', ') : undefined);
      
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
          lighted: tags.lit === 'yes',
          surface: tags.surface,
          access: tags.access,
          website: tags.website,
          phone: tags.phone,
          operator: tags.operator || tags.owner,
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
    const keywords = intent.core_entity.keywords.slice(0, 3).join(' ') || intent.what.primary;
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
  // GBIF
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
    
    const forecast = await fetchJSON(point.properties.forecast, { Accept: 'application/geo+json' }) as { properties?: { periods?: Array<{ number: number; name: string; temperature: number; temperatureUnit: string; shortForecast: string; windSpeed: string; windDirection: string }> } };
    
    for (const period of (forecast?.properties?.periods || []).slice(0, 4)) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          source: 'noaa_weather',
          source_id: `noaa-${period.number}`,
          category: 'WEATHER',
          name: period.name,
          description: period.shortForecast,
          temperature: period.temperature,
          temperature_unit: period.temperatureUnit,
          wind_speed: period.windSpeed,
          wind_direction: period.windDirection,
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
  // DATA.GOV
  // ─────────────────────────────────────────────────────────────────────────
  data_gov: async (intent) => {
    const features: GeoJSONFeature[] = [];
    const query = intent.core_entity.keywords.join(' ') || intent.what.primary;
    
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
    const keywords = intent.core_entity.keywords.slice(0, 2);
    
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

  // ─────────────────────────────────────────────────────────────────────────
  // USASPENDING.GOV - Federal Contracts & Grants
  // ─────────────────────────────────────────────────────────────────────────
  usaspending: async (intent) => {
    const features: GeoJSONFeature[] = [];
    const stateCode = intent.where.stateCode || '';
    
    // Get actual search keywords
    const stopWords = ['tax', 'funded', 'project', 'for', 'and', 'in', 'the', 'data', 'federal'];
    let keywords = intent.core_entity.keywords.filter(k => 
      !stopWords.includes(k.toLowerCase()) && k.length > 2
    );
    
    // Add IT/technology if mentioned
    const prompt = intent.what.primary.toLowerCase();
    if (prompt.includes('it') || prompt.includes('technology')) {
      keywords.push('information technology');
    }
    
    console.log(`   💰 USASpending: keywords="${keywords.join(', ')}" state=${stateCode || 'all'}`);
    
    try {
      // Use award search endpoint with proper filter structure
      const searchPayload: Record<string, unknown> = {
        filters: {
          time_period: [{ start_date: '2023-01-01', end_date: '2026-12-31' }],
          award_type_codes: ['A', 'B', 'C', 'D', '02', '03', '04', '05'], // Contracts and grants
        },
        fields: [
          'Award ID',
          'Recipient Name', 
          'Award Amount',
          'Description',
          'Start Date',
          'End Date',
          'Awarding Agency',
          'Awarding Sub Agency',
          'Award Type',
          'Place of Performance State Code',
        ],
        limit: 30,
        page: 1,
        sort: 'Award Amount',
        order: 'desc',
      };
      
      // Add keywords if we have any
      if (keywords.length > 0) {
        (searchPayload.filters as Record<string, unknown>).keywords = keywords;
      }
      
      // Add state filter if specified
      if (stateCode && stateCode.length === 2) {
        (searchPayload.filters as Record<string, unknown>).place_of_performance_locations = [
          { country: 'USA', state: stateCode }
        ];
      }
      
      const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT,
        },
        body: JSON.stringify(searchPayload),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`   ⚠ USASpending returned ${response.status}: ${errorText.slice(0, 200)}`);
        
        // Try simpler query without keywords
        const simplePayload = {
          filters: {
            time_period: [{ start_date: '2024-01-01', end_date: '2026-12-31' }],
            award_type_codes: ['A', 'B', 'C', 'D'],
            ...(stateCode ? { place_of_performance_locations: [{ country: 'USA', state: stateCode }] } : {}),
          },
          fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Description', 'Awarding Agency', 'Award Type'],
          limit: 25,
          page: 1,
          sort: 'Award Amount',
          order: 'desc',
        };
        
        const retryResponse = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
          body: JSON.stringify(simplePayload),
        });
        
        if (!retryResponse.ok) {
          console.log(`   ⚠ USASpending retry also failed: ${retryResponse.status}`);
          return features;
        }
        
        const retryData = await retryResponse.json();
        return processUSASpendingResults(retryData, intent, features);
      }
      
      const data = await response.json();
      return processUSASpendingResults(data, intent, features);
      
    } catch (error) {
      console.error('USASpending API error:', error);
    }
    
    return features;
  },
};

// ─────────────────────────────────────────────────────────────────────────
// NPI REGISTRY - Healthcare Providers (from DATAVERSE integration)
// ─────────────────────────────────────────────────────────────────────────
const npi_registry: CollectorFn = async (intent) => {
  const stateCode = intent.where.stateCode;
  if (!stateCode) return [];
  
  const features: GeoJSONFeature[] = [];
  try {
    const url = `https://npiregistry.cms.hhs.gov/api/?version=2.1&state=${stateCode}&limit=200`;
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) return [];
    
    const data = await response.json();
    for (const r of (data.results || []).slice(0, 150)) {
      const basic = r.basic || {};
      const firstName = basic.first_name || basic.authorized_official_first_name || '';
      const lastName = basic.last_name || basic.authorized_official_last_name || basic.organization_name || '';
      const addresses = r.addresses || [];
      const address = addresses[0] || {};
      const lat = parseFloat(address.latitude) || undefined;
      const lon = parseFloat(address.longitude) || undefined;
      
      features.push({
        type: 'Feature',
        geometry: lat && lon ? { type: 'Point', coordinates: [lon, lat] } : { type: 'Point', coordinates: intent.where.center || [-98.5, 39.8] },
        properties: {
          source: 'npi_registry',
          source_id: `npi-${r.number}`,
          category: 'HEALTH',
          name: basic.organization_name || `${firstName} ${lastName}`.trim(),
          description: `NPI: ${r.number} | ${basic.enumeration_type === 'NPI-2' ? 'Organization' : 'Individual'}`,
          npi_number: r.number,
          provider_type: basic.enumeration_type,
          city: address.city,
          state: address.state,
          zip: address.postal_code,
          address: `${address.address_1 || ''} ${address.address_2 || ''}`.trim(),
          confidence: 0.95,
        },
      });
    }
    console.log(`   ✓ NPI Registry: ${features.length} providers`);
  } catch (e) {
    console.error('NPI Registry error:', e);
  }
  return features;
};

// ─────────────────────────────────────────────────────────────────────────
// CMS OPEN PAYMENTS - Doctor Payments (from DATAVERSE integration)
// ─────────────────────────────────────────────────────────────────────────
const cms_open_payments: CollectorFn = async (intent) => {
  const stateCode = intent.where.stateCode;
  if (!stateCode) return [];
  
  const features: GeoJSONFeature[] = [];
  try {
    const url = 'https://openpaymentsdata.cms.gov/api/1/datastore/query/ebd7ac92-73ee-4a1b-8022-a1339f016833';
    const payload = {
      conditions: [{ property: "recipient_state", value: stateCode, operator: "=" }],
      limit: 300,
      offset: 0,
      sort: { property: "total_amount_of_payment_usdollars", order: "desc" }
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) return [];
    const data = await response.json();
    
    for (const r of (data.results || []).slice(0, 200)) {
      const firstName = r.physician_first_name || '';
      const lastName = r.physician_last_name || '';
      if (!firstName && !lastName) continue;
      
      const amount = parseFloat(r.total_amount_of_payment_usdollars || 0);
      
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: intent.where.center || [-98.5, 39.8] },
        properties: {
          source: 'cms_open_payments',
          source_id: `cms-${r.record_id || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          category: 'HEALTH',
          name: `Dr. ${firstName} ${lastName}`.trim(),
          description: [
            r.physician_specialty || 'Physician',
            `Payment: $${amount.toLocaleString()}`,
            r.applicable_manufacturer_or_applicable_gpo_making_payment_name ? `From: ${r.applicable_manufacturer_or_applicable_gpo_making_payment_name}` : null,
            r.name_of_drug_or_biological_or_device_or_medical_supply_1 ? `Product: ${r.name_of_drug_or_biological_or_device_or_medical_supply_1}` : null
          ].filter(Boolean).join(' | '),
          specialty: r.physician_specialty,
          payment_amount: amount,
          payer: r.applicable_manufacturer_or_applicable_gpo_making_payment_name,
          city: r.recipient_city,
          state: r.recipient_state,
          confidence: 0.98,
        },
      });
    }
    console.log(`   ✓ CMS Open Payments: ${features.length} payments`);
  } catch (e) {
    console.error('CMS Open Payments error:', e);
  }
  return features;
};

// ─────────────────────────────────────────────────────────────────────────
// FDA DRUG DATABASE (from DATAVERSE integration)
// ─────────────────────────────────────────────────────────────────────────
const fda_drugs: CollectorFn = async (intent) => {
  const features: GeoJSONFeature[] = [];
  const searchTerms = intent.core_entity.keywords.filter(k => k.length > 3).slice(0, 3).join('+');
  if (!searchTerms) return [];
  
  try {
    const url = `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(searchTerms)}&limit=50`;
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) return [];
    
    const data = await response.json();
    for (const r of (data.results || []).slice(0, 40)) {
      const openfda = r.openfda || {};
      const brandName = openfda.brand_name?.[0] || openfda.generic_name?.[0];
      if (!brandName) continue;
      
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: intent.where.center || [-98.5, 39.8] },
        properties: {
          source: 'fda_drugs',
          source_id: `fda-${r.id || Date.now()}`,
          category: 'HEALTH',
          name: brandName,
          description: `${openfda.generic_name?.[0] || ''} | ${openfda.manufacturer_name?.[0] || ''}`.trim(),
          brand_name: openfda.brand_name,
          generic_name: openfda.generic_name,
          manufacturer: openfda.manufacturer_name,
          confidence: 0.9,
        },
      });
    }
    console.log(`   ✓ FDA Drugs: ${features.length} drugs`);
  } catch (e) {
    console.error('FDA Drugs error:', e);
  }
  return features;
};

// ─────────────────────────────────────────────────────────────────────────
// EPA ECHO - Environmental Facilities (from DATAVERSE integration)
// ─────────────────────────────────────────────────────────────────────────
const epa_echo: CollectorFn = async (intent) => {
  const stateCode = intent.where.stateCode;
  if (!stateCode) return [];
  
  const features: GeoJSONFeature[] = [];
  try {
    const url = `https://echo.epa.gov/tools/web-services/facility-search?output=JSON&p_st=${stateCode}&p_act=Y`;
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) return [];
    
    const data = await response.json();
    for (const f of (data.Results?.Facilities || []).slice(0, 100)) {
      const lat = parseFloat(f.FacLat);
      const lon = parseFloat(f.FacLong);
      
      features.push({
        type: 'Feature',
        geometry: lat && lon ? { type: 'Point', coordinates: [lon, lat] } : { type: 'Point', coordinates: intent.where.center || [-98.5, 39.8] },
        properties: {
          source: 'epa_echo',
          source_id: `epa-${f.RegistryId}`,
          category: 'ENVIRONMENTAL',
          name: f.FacName,
          description: `${f.FacTypeName || 'Facility'} | Compliance: ${f.CurrSvFlag === 'Y' ? 'Violation' : 'Compliant'}`,
          has_violation: f.CurrSvFlag === 'Y',
          facility_type: f.FacTypeName,
          city: f.FacCity,
          state: f.FacState,
          zip: f.FacZip,
          address: f.FacStreet,
          confidence: 0.92,
        },
      });
    }
    console.log(`   ✓ EPA ECHO: ${features.length} facilities`);
  } catch (e) {
    console.error('EPA ECHO error:', e);
  }
  return features;
};

// ─────────────────────────────────────────────────────────────────────────
// FDIC BANKS - Financial Institutions (from DATAVERSE integration)
// ─────────────────────────────────────────────────────────────────────────
const fdic_banks: CollectorFn = async (intent) => {
  const stateCode = intent.where.stateCode;
  if (!stateCode) return [];
  
  const features: GeoJSONFeature[] = [];
  try {
    const url = `https://banks.data.fdic.gov/api/institutions?filters=STALP:${stateCode}&limit=100&format=json`;
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) return [];
    
    const data = await response.json();
    for (const b of (data.data || []).slice(0, 80)) {
      const d = b.data;
      if (!d?.NAME) continue;
      
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: intent.where.center || [-98.5, 39.8] },
        properties: {
          source: 'fdic_banks',
          source_id: `fdic-${d.CERT}`,
          category: 'FINANCIAL',
          name: d.NAME,
          description: `FDIC Cert: ${d.CERT} | Assets: $${((d.ASSET || 0) * 1000).toLocaleString()}`,
          cert: d.CERT,
          assets: (d.ASSET || 0) * 1000,
          deposits: (d.DEP || 0) * 1000,
          city: d.CITY,
          state: d.STALP,
          zip: d.ZIP,
          address: d.ADDRESS,
          confidence: 0.95,
        },
      });
    }
    console.log(`   ✓ FDIC Banks: ${features.length} banks`);
  } catch (e) {
    console.error('FDIC Banks error:', e);
  }
  return features;
};

// Add new collectors to the registry
COLLECTORS['npi_registry'] = npi_registry;
COLLECTORS['cms_open_payments'] = cms_open_payments;
COLLECTORS['fda_drugs'] = fda_drugs;
COLLECTORS['epa_echo'] = epa_echo;
COLLECTORS['fdic_banks'] = fdic_banks;

function processUSASpendingResults(
  data: { results?: Array<Record<string, unknown>> },
  intent: ParsedIntent,
  features: GeoJSONFeature[]
): GeoJSONFeature[] {
  const stateCode = intent.where.stateCode || '';
  const stateInfo = stateCode ? STATE_MAP[stateCode.toLowerCase()] : null;
  const baseCenter = stateInfo?.center || intent.where.center || [-76.6, 39.0];
  
  for (const award of data?.results || []) {
    const awardId = String(award['Award ID'] || '');
    if (!awardId) continue;
    
    // Spread awards on map with slight random offset
    const idx = features.length;
    const coords: [number, number] = [
      baseCenter[0] + (Math.sin(idx * 0.5) * 0.3) + (Math.random() - 0.5) * 0.2,
      baseCenter[1] + (Math.cos(idx * 0.5) * 0.3) + (Math.random() - 0.5) * 0.2,
    ];
    
    const amount = Number(award['Award Amount']) || 0;
    const formattedAmount = new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
    
    const descParts: string[] = [];
    if (award['Awarding Agency']) descParts.push(`Agency: ${award['Awarding Agency']}`);
    if (award['Award Type']) descParts.push(`Type: ${award['Award Type']}`);
    const desc = String(award.Description || '');
    if (desc) descParts.push(desc.slice(0, 150));
    
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: coords },
      properties: {
        source: 'usaspending',
        source_id: `usa-${awardId}`,
        category: 'GOVERNMENT',
        name: String(award['Recipient Name'] || 'Federal Award'),
        description: descParts.join(' • ') || `Federal award ${formattedAmount}`,
        award_id: awardId,
        award_amount: amount,
        award_amount_formatted: formattedAmount,
        award_type: String(award['Award Type'] || ''),
        awarding_agency: String(award['Awarding Agency'] || ''),
        start_date: award['Start Date'],
        end_date: award['End Date'],
        state: award['Place of Performance State Code'],
        confidence: 0.95,
      },
    });
  }
  
  console.log(`   ✓ USASpending: ${features.length} awards processed`);
  return features;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 6: PARALLEL EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function collectData(intent: ParsedIntent): Promise<{ features: GeoJSONFeature[]; sources: SourceResult[] }> {
  const allFeatures: GeoJSONFeature[] = [];
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
        
        // Apply relevance filtering per-source
        const { filtered, filteredOutCount } = filterAndRankResults(data, intent);
        
        allFeatures.push(...filtered);
        sources.push({
          name,
          status: error ? 'error' : filtered.length > 0 ? 'success' : 'empty',
          count: data.length,
          records_after_filter: filtered.length,
          time_ms,
          error,
        });
      }
    }
    
    if (i + BATCH_SIZE < collectorsToRun.length) {
      await new Promise(r => setTimeout(r, 10));
    }
  }
  
  return { features: allFeatures, sources };
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 7: INSIGHTS GENERATION
// ═══════════════════════════════════════════════════════════════════════════

function generateInsights(features: GeoJSONFeature[], intent: ParsedIntent): { summary: string; key_findings: string[]; recommendations: string[] } {
  const uniqueSources = [...new Set(features.map(f => String(f.properties.source || '')))];
  const highRelevance = features.filter(f => (f.properties.relevance_score as number) >= 0.7);
  const avgRelevance = features.length > 0 
    ? features.reduce((acc, f) => acc + ((f.properties.relevance_score as number) || 0), 0) / features.length 
    : 0;
  
  if (features.length === 0) {
    return {
      summary: 'No results found. Try broadening your search or different keywords.',
      key_findings: ['No matching data found in the specified area'],
      recommendations: ['Try different search terms', 'Expand the geographic area', 'Check spelling of location names'],
    };
  }
  
  const findings: string[] = [];
  findings.push(`${features.length} relevant ${intent.what.primary} found`);
  if (highRelevance.length > 0) {
    findings.push(`${highRelevance.length} high-relevance matches (≥70% confidence)`);
  }
  findings.push(`Data from ${uniqueSources.length} source${uniqueSources.length > 1 ? 's' : ''}: ${uniqueSources.join(', ')}`);
  findings.push(`Average relevance score: ${Math.round(avgRelevance * 100)}%`);
  
  const recommendations: string[] = [];
  if (features.length > 50) {
    recommendations.push('Use filters to narrow down results');
  }
  if (avgRelevance < 0.6) {
    recommendations.push('Results may include partial matches - verify before use');
  }
  recommendations.push('Export data for offline analysis');
  
  return {
    summary: `Found ${features.length} ${intent.what.primary} in ${intent.where.raw || intent.where.state || 'your search area'}. ${highRelevance.length} are high-confidence matches.`,
    key_findings: findings.slice(0, 4),
    recommendations: recommendations.slice(0, 3),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 8: SNAPSHOT GENERATION FOR HISTORY
// ═══════════════════════════════════════════════════════════════════════════

function generateSnapshot(
  features: GeoJSONFeature[],
  intent: ParsedIntent,
  sources: SourceResult[],
  processingTimeMs: number
) {
  const uniqueRecords = features.filter(f => !f.properties.is_duplicate);
  const withGeo = uniqueRecords.filter(f => f.geometry?.type === 'Point');
  const highRelevance = uniqueRecords.filter(f => (f.properties.relevance_score as number) >= 0.7);
  
  const avgRelevance = uniqueRecords.length > 0
    ? uniqueRecords.reduce((sum, f) => sum + ((f.properties.relevance_score as number) || 0.5), 0) / uniqueRecords.length
    : 0;

  // Group by category
  const categoryMap = new Map<string, { count: number; totalRelevance: number }>();
  uniqueRecords.forEach(f => {
    const cat = String(f.properties.category || 'OTHER');
    const existing = categoryMap.get(cat) || { count: 0, totalRelevance: 0 };
    categoryMap.set(cat, {
      count: existing.count + 1,
      totalRelevance: existing.totalRelevance + ((f.properties.relevance_score as number) || 0.5),
    });
  });
  const categories = Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      avg_relevance: Math.round((data.totalRelevance / data.count) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count);

  // Group by source
  const sourceMap = new Map<string, number>();
  uniqueRecords.forEach(f => {
    const src = String(f.properties.source || 'unknown');
    sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
  });
  const sourceSummary = Array.from(sourceMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Top results by relevance
  const topResults = uniqueRecords
    .sort((a, b) => ((b.properties.relevance_score as number) || 0) - ((a.properties.relevance_score as number) || 0))
    .slice(0, 10)
    .map(f => ({
      id: String(f.properties.source_id || ''),
      name: String(f.properties.name || 'Unknown'),
      category: String(f.properties.category || 'OTHER'),
      relevance_score: (f.properties.relevance_score as number) || 0.5,
      lat: f.geometry?.type === 'Point' ? (f.geometry.coordinates as number[])[1] : undefined,
      lng: f.geometry?.type === 'Point' ? (f.geometry.coordinates as number[])[0] : undefined,
    }));

  // Calculate bounds
  let bounds = null;
  if (withGeo.length > 0) {
    const lats = withGeo.map(f => (f.geometry.coordinates as number[])[1]);
    const lngs = withGeo.map(f => (f.geometry.coordinates as number[])[0]);
    bounds = {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    };
  }

  return {
    stats: {
      unique_records: uniqueRecords.length,
      high_relevance: highRelevance.length,
      avg_relevance: Math.round(avgRelevance * 100) / 100,
      geo_percent: uniqueRecords.length > 0 ? Math.round((withGeo.length / uniqueRecords.length) * 100) : 0,
      query_time_ms: processingTimeMs,
      sources: sources.filter(s => s.status === 'success').length,
      categories: categories.length,
    },
    categories: categories.slice(0, 5),
    sources: sourceSummary.slice(0, 5),
    top_results: topResults,
    query_analysis: {
      core_entity: intent.core_entity.type,
      location: intent.where.raw || intent.where.state || 'Unknown',
      keywords: intent.core_entity.keywords.slice(0, 5),
    },
    bounds,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { prompt, session_id } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🌍 BASED DATA v10.0 — INTELLIGENT QUERY ENGINE');
    console.log(`📝 Query: "${prompt}"`);
    console.log(`📋 Session: ${session_id || 'anonymous'}`);
    const startTime = Date.now();

    // Create query record for history tracking
    let queryId = `bd_${Date.now()}`;
    if (session_id) {
      const { data: queryRecord } = await supabase
        .from('queries')
        .insert({
          prompt,
          session_id,
          status: 'pending',
          input_type: 'natural_language',
          engine_version: 'baseddata-v10.0-intelligent',
        })
        .select('id')
        .single();
      
      if (queryRecord) {
        queryId = queryRecord.id;
      }
    }

    // STEP 1: Parse intent with intelligence
    console.log('🧠 Step 1: Parsing intent...');
    const intent = parseQueryIntent(prompt);
    console.log(`   ✓ Entity: ${intent.core_entity.type} (${intent.what.category})`);
    console.log(`   ✓ Keywords: ${intent.core_entity.keywords.slice(0, 5).join(', ')}`);
    console.log(`   ✓ Where: ${intent.where.raw || 'Not specified'}`);
    console.log(`   ✓ Must have: ${intent.relevance_criteria.must_have.slice(0, 3).join(' OR ')}`);
    console.log(`   ✓ Must NOT have: ${intent.relevance_criteria.must_not_have.slice(0, 3).join(', ') || 'none'}`);

    // STEP 2: Geocode location
    console.log('📍 Step 2: Geocoding location...');
    intent.where = await geocodeLocation(intent.where);
    if (intent.where.bounds) {
      console.log(`   ✓ Bounds: [${intent.where.bounds.south.toFixed(3)}, ${intent.where.bounds.north.toFixed(3)}]`);
    }

    // STEP 3: Collect data with per-source relevance filtering
    console.log('📡 Step 3: Collecting & filtering data...');
    const { features, sources } = await collectData(intent);
    
    const totalRaw = sources.reduce((sum, s) => sum + s.count, 0);
    const totalFiltered = sources.reduce((sum, s) => sum + s.records_after_filter, 0);
    const filteredOut = totalRaw - totalFiltered;
    
    console.log(`   ✓ Raw: ${totalRaw} → Filtered: ${totalFiltered} (removed ${filteredOut} low-relevance)`);

    // Calculate stats
    const avgRelevance = features.length > 0
      ? features.reduce((sum, f) => sum + ((f.properties.relevance_score as number) || 0), 0) / features.length
      : 0;
    const highRelevanceCount = features.filter(f => (f.properties.relevance_score as number) >= 0.7).length;

    // STEP 4: Generate insights
    console.log('💡 Step 4: Generating insights...');
    const insights = generateInsights(features, intent);

    const processingTime = Date.now() - startTime;

    // STEP 5: Generate snapshot for history
    const snapshot = generateSnapshot(features, intent, sources, processingTime);

    // STEP 6: Update query record with results
    if (session_id && queryId !== `bd_${startTime}`) {
      await supabase
        .from('queries')
        .update({
          status: 'completed',
          result_count: features.length,
          sources_queried: sources.map(s => s.name),
          categories_matched: [intent.what.category.toUpperCase()],
          features: { type: 'FeatureCollection', features: features.slice(0, 100) },
          insights,
          processing_time_ms: processingTime,
          avg_relevance_score: Math.round(avgRelevance * 100) / 100,
          high_relevance_count: highRelevanceCount,
          low_relevance_filtered: filteredOut,
          total_records_raw: totalRaw,
          snapshot,
          parsed_intent: intent,
          completed_at: new Date().toISOString(),
        })
        .eq('id', queryId);
    }

    // Persist to records table (non-blocking)
    if (features.length > 0) {
      const records = features.slice(0, 50).map(f => ({
        source_id: String(f.properties.source),
        source_record_id: String(f.properties.source_id || `${f.properties.source}_${Math.random().toString(36).slice(2)}`),
        category: String(f.properties.category || 'OTHER'),
        name: String(f.properties.name || 'Unknown'),
        description: String(f.properties.description || ''),
        geometry: f.geometry,
        properties: f.properties,
        quality_score: f.properties.relevance_score as number || 0.5,
      }));
      supabase.from('records').upsert(records, { onConflict: 'source_id,source_record_id', ignoreDuplicates: true }).then(() => {});
    }

    console.log(`✅ Complete: ${features.length} relevant features in ${processingTime}ms`);
    console.log(`   📊 Avg relevance: ${Math.round(avgRelevance * 100)}%, High relevance: ${highRelevanceCount}`);
    console.log('═══════════════════════════════════════════════════════════');

    return new Response(JSON.stringify({
      success: true,
      query_id: queryId,
      prompt,
      intent: {
        use_case: intent.what.category,
        entity_type: intent.core_entity.type,
        location: intent.where.bounds ? {
          name: intent.where.raw || intent.where.state || '',
          center: intent.where.center,
          bbox: [intent.where.bounds.west, intent.where.bounds.south, intent.where.bounds.east, intent.where.bounds.north],
        } : null,
        time_context: { type: intent.when.temporal },
        categories: [intent.what.category.toUpperCase()],
        keywords: intent.core_entity.keywords,
        osm_tags: intent.core_entity.osm_tags,
        relevance_criteria: intent.relevance_criteria,
        confidence: intent.confidence,
      },
      features: { type: 'FeatureCollection', features },
      insights,
      quality_metrics: {
        total_raw: totalRaw,
        total_filtered: totalFiltered,
        filtered_out: filteredOut,
        avg_relevance: Math.round(avgRelevance * 100) / 100,
        high_relevance_count: highRelevanceCount,
      },
      collected_data: sources.map(s => ({
        source: s.name,
        status: s.status,
        record_count: s.count,
        records_after_filter: s.records_after_filter,
        collection_time_ms: s.time_ms,
        error: s.error,
      })),
      sources_used: sources.filter(s => s.status === 'success').map(s => s.name),
      processing_time_ms: processingTime,
      credits_used: Math.ceil(sources.filter(s => s.status === 'success').length),
      engine_version: 'baseddata-v10.0-intelligent',
      data_tap: {
        records_persisted: Math.min(features.length, 50),
        records_deduplicated: 0,
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
      quality_metrics: { total_raw: 0, total_filtered: 0, filtered_out: 0, avg_relevance: 0, high_relevance_count: 0 },
      collected_data: [],
      sources_used: [],
      processing_time_ms: 0,
      credits_used: 0,
      engine_version: 'baseddata-v10.0-intelligent',
      data_tap: { records_persisted: 0, records_deduplicated: 0 },
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
