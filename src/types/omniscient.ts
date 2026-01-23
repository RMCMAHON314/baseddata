// ============================================================================
// BASED DATA v7.0 - UNIFIED TYPE DEFINITIONS
// Single source of truth for all data types
// ============================================================================

// ============================================================================
// DATA CATEGORIES (single definition)
// ============================================================================

export type DataCategory = 
  | 'GEOSPATIAL'
  | 'WILDLIFE'
  | 'WEATHER'
  | 'REGULATIONS'
  | 'TRANSPORTATION'
  | 'DEMOGRAPHICS'
  | 'ECONOMIC'
  | 'IMAGERY'
  | 'GOVERNMENT'
  | 'MARINE'
  | 'HEALTH'
  | 'ENERGY'
  | 'RECREATION'
  | 'RESEARCH';

// ============================================================================
// CORE GEOJSON TYPES
// ============================================================================

export interface GeoJSONGeometry {
  type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';
  coordinates: number[] | number[][] | number[][][] | number[][][][];
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: GeoJSONGeometry;
  properties: {
    source: string;
    source_id?: string;
    source_url?: string;           // Link to source website
    source_record_url?: string;    // Direct link to this specific record
    api_documentation_url?: string; // API docs link
    category: string;
    subcategory?: string;
    name: string;
    description?: string;
    timestamp?: string;
    attributes?: Record<string, unknown>;
    confidence?: number;
    url?: string;                  // Legacy field for backward compat
    [key: string]: unknown;
  };
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

// ============================================================================
// QUERY TYPES (unified input layer)
// ============================================================================

export interface ParsedIntent {
  use_case: string;
  location: {
    name: string;
    center?: [number, number];
    bbox?: [number, number, number, number];
  } | null;
  time_context: {
    type: 'current' | 'historical' | 'forecast' | 'seasonal' | 'specific' | 'ongoing';
    season?: string;
    start?: string;
    end?: string;
    dates?: string[];
  };
  categories: DataCategory[];
  keywords: string[];
  confidence: number;
}

export interface DataSourceQuery {
  name: string;
  api: string;
  query_params: Record<string, unknown>;
  priority?: number;
}

export interface OmniscientQuery {
  prompt: string;
  timestamp: string;
  id?: string;
  user_id?: string;
  input_type?: 'natural_language' | 'api' | 'scheduled' | 'nl_query';
  parsed_intent?: ParsedIntent;
  status?: 'pending' | 'running' | 'collecting' | 'analyzing' | 'complete' | 'failed' | 'cached';
  credits_used?: number;
  created_at?: string;
  completed_at?: string;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface CollectedData {
  source: string;
  source_url?: string;             // Link to source homepage
  api_documentation_url?: string;  // Link to API documentation
  status: 'success' | 'error' | 'partial' | 'empty';
  record_count: number;
  collection_time_ms: number;
  data?: GeoJSONFeatureCollection | null;
  error?: string;
}

export interface OmniscientInsights {
  summary: string;
  key_findings: string[];
  recommendations: string[];
  warnings?: string[];
  optimal_conditions?: Record<string, string | string[]>;
  related_queries?: string[];
  data_quality?: {
    score: number;
    issues: string[];
  };
}

export interface DataTapStats {
  records_persisted: number;
  records_deduplicated: number;
  dynamic_genesis?: boolean;
  enrichment_queued?: boolean;
  auto_expanded?: boolean;
}

export interface OmniscientResponse {
  success: boolean;
  query_id: string;
  prompt: string;
  intent: ParsedIntent;
  features: GeoJSONFeatureCollection;
  tabular_data?: Record<string, unknown>[];
  insights: OmniscientInsights | null;
  collected_data: CollectedData[];
  sources_used: string[];
  processing_time_ms: number;
  credits_used: number;
  engine_version: string;
  enrichments?: string[];
  data_tap: DataTapStats;
}

// ============================================================================
// ENRICHMENT & KNOWLEDGE GRAPH TYPES
// ============================================================================

export interface RecordRelationship {
  id: string;
  source_record_id: string;
  target_record_id: string;
  relationship_type: string;
  confidence_score: number;
  distance_meters?: number;
  metadata: Record<string, unknown>;
}

export interface KnowledgeEdge {
  id: string;
  subject_type: string;
  subject_id: string;
  predicate: string;
  object_type: string;
  object_id: string;
  weight: number;
  evidence: unknown[];
}

export interface FusedRecord {
  id: string;
  base_record_id: string;
  enrichment_sources: string[];
  fused_properties: Record<string, unknown>;
  fusion_score: number;
  enrichment_count: number;
  last_enriched_at?: string;
}

export interface EnrichmentResult {
  enrichedCount: number;
  relationshipsCreated: number;
  knowledgeEdges: number;
  fusedRecords: number;
  aiInsight?: string;
  processingTimeMs: number;
}

// ============================================================================
// DYNAMIC COLLECTOR TYPES
// ============================================================================

export interface DynamicCollector {
  id?: string;
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
  categories: DataCategory[];
  keywords: string[];
  success_count?: number;
  failure_count?: number;
  is_active?: boolean;
  last_used_at?: string;
  created_at?: string;
  created_by_prompt?: string;
}

// ============================================================================
// MAP & VISUALIZATION TYPES
// ============================================================================

export interface MapLayer {
  id: string;
  name: string;
  category?: DataCategory;
  visible: boolean;
  features: GeoJSONFeature[];
  color?: string;
  icon?: string;
}

// ============================================================================
// DATA SOURCE INFO (for registry)
// ============================================================================

export interface DataSourceInfo {
  id: string;
  name: string;
  api_type: 'REST' | 'SOAP' | 'GraphQL' | 'Scrape';
  base_url: string;
  categories: DataCategory[];
  rate_limit?: number;
  requires_auth: boolean;
  is_free: boolean;
  reliability: number;
  description: string;
}

// ============================================================================
// DEPRECATED TYPES (kept for backward compatibility)
// ============================================================================

/** @deprecated Use OmniscientResponse instead */
export type OmniscientResult = Omit<OmniscientResponse, 'success' | 'engine_version' | 'data_tap' | 'enrichments'>;

// ============================================================================
// DATA SOURCE REGISTRY - For UI display
// ============================================================================

// Enhanced data source registry with website links for UI
export interface DataSourceRegistryEntry extends DataSourceInfo {
  website_url: string;
  documentation_url: string;
  logo_emoji: string;
}

export const DATA_SOURCE_REGISTRY: DataSourceRegistryEntry[] = [
  // GEOSPATIAL
  { id: 'osm', name: 'OpenStreetMap', api_type: 'REST', base_url: 'https://overpass-api.de', website_url: 'https://www.openstreetmap.org', documentation_url: 'https://wiki.openstreetmap.org/wiki/API', logo_emoji: '🗺️', categories: ['GEOSPATIAL'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Roads, buildings, POIs' },
  { id: 'usgs', name: 'USGS National Map', api_type: 'REST', base_url: 'https://apps.nationalmap.gov', website_url: 'https://www.usgs.gov', documentation_url: 'https://apps.nationalmap.gov/help/', logo_emoji: '🏔️', categories: ['GEOSPATIAL'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Elevation, hydrology' },
  { id: 'census_tiger', name: 'Census TIGER', api_type: 'REST', base_url: 'https://tigerweb.geo.census.gov', website_url: 'https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html', documentation_url: 'https://www.census.gov/data/developers/data-sets/TIGERweb-map-service.html', logo_emoji: '🏛️', categories: ['GEOSPATIAL', 'DEMOGRAPHICS'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Boundaries' },
  // WILDLIFE
  { id: 'ebird', name: 'eBird', api_type: 'REST', base_url: 'https://api.ebird.org', website_url: 'https://ebird.org', documentation_url: 'https://documenter.getpostman.com/view/664302/S1ENwy59', logo_emoji: '🦅', categories: ['WILDLIFE'], requires_auth: true, is_free: true, reliability: 0.85, description: 'Bird sightings' },
  { id: 'inaturalist', name: 'iNaturalist', api_type: 'REST', base_url: 'https://api.inaturalist.org', website_url: 'https://www.inaturalist.org', documentation_url: 'https://api.inaturalist.org/v1/docs/', logo_emoji: '🌿', categories: ['WILDLIFE'], requires_auth: false, is_free: true, reliability: 0.8, description: 'Wildlife observations' },
  { id: 'gbif', name: 'GBIF', api_type: 'REST', base_url: 'https://api.gbif.org', website_url: 'https://www.gbif.org', documentation_url: 'https://www.gbif.org/developer/summary', logo_emoji: '🧬', categories: ['WILDLIFE'], requires_auth: false, is_free: true, reliability: 0.85, description: 'Biodiversity records' },
  // WEATHER
  { id: 'noaa_weather', name: 'NOAA Weather', api_type: 'REST', base_url: 'https://api.weather.gov', website_url: 'https://www.weather.gov', documentation_url: 'https://www.weather.gov/documentation/services-web-api', logo_emoji: '⛈️', categories: ['WEATHER'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Forecasts & alerts' },
  { id: 'open_meteo', name: 'Open-Meteo', api_type: 'REST', base_url: 'https://api.open-meteo.com', website_url: 'https://open-meteo.com', documentation_url: 'https://open-meteo.com/en/docs', logo_emoji: '🌤️', categories: ['WEATHER'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Global weather' },
  // MARINE
  { id: 'noaa_tides', name: 'NOAA Tides', api_type: 'REST', base_url: 'https://tidesandcurrents.noaa.gov', website_url: 'https://tidesandcurrents.noaa.gov', documentation_url: 'https://api.tidesandcurrents.noaa.gov/api/prod/', logo_emoji: '🌊', categories: ['MARINE'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Tide predictions' },
  { id: 'noaa_buoys', name: 'NOAA Buoys', api_type: 'REST', base_url: 'https://www.ndbc.noaa.gov', website_url: 'https://www.ndbc.noaa.gov', documentation_url: 'https://www.ndbc.noaa.gov/docs/', logo_emoji: '🔘', categories: ['MARINE'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Ocean buoy data' },
  // GOVERNMENT
  { id: 'usaspending', name: 'USASpending', api_type: 'REST', base_url: 'https://api.usaspending.gov', website_url: 'https://www.usaspending.gov', documentation_url: 'https://api.usaspending.gov/docs/', logo_emoji: '💰', categories: ['GOVERNMENT', 'ECONOMIC'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Federal contracts' },
  { id: 'regulations_gov', name: 'Regulations.gov', api_type: 'REST', base_url: 'https://api.regulations.gov', website_url: 'https://www.regulations.gov', documentation_url: 'https://open.gsa.gov/api/regulationsgov/', logo_emoji: '📜', categories: ['REGULATIONS'], requires_auth: true, is_free: true, reliability: 0.9, description: 'Federal regulations' },
  // ECONOMIC
  { id: 'census', name: 'Census Bureau', api_type: 'REST', base_url: 'https://api.census.gov', website_url: 'https://www.census.gov', documentation_url: 'https://www.census.gov/data/developers.html', logo_emoji: '📊', categories: ['DEMOGRAPHICS', 'ECONOMIC'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Population, income' },
  { id: 'bls', name: 'Bureau of Labor', api_type: 'REST', base_url: 'https://api.bls.gov', website_url: 'https://www.bls.gov', documentation_url: 'https://www.bls.gov/developers/', logo_emoji: '👷', categories: ['ECONOMIC'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Employment, wages' },
  // TRANSPORTATION
  { id: 'faa', name: 'FAA Airports', api_type: 'REST', base_url: 'https://services.arcgis.com', website_url: 'https://www.faa.gov', documentation_url: 'https://www.faa.gov/data_research', logo_emoji: '✈️', categories: ['TRANSPORTATION'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Airport locations' },
  { id: 'opensky', name: 'OpenSky Network', api_type: 'REST', base_url: 'https://opensky-network.org', website_url: 'https://opensky-network.org', documentation_url: 'https://openskynetwork.github.io/opensky-api/', logo_emoji: '🛫', categories: ['TRANSPORTATION'], requires_auth: false, is_free: true, reliability: 0.85, description: 'Flight tracking' },
  // ENERGY
  { id: 'eia', name: 'EIA Energy', api_type: 'REST', base_url: 'https://api.eia.gov', website_url: 'https://www.eia.gov', documentation_url: 'https://www.eia.gov/opendata/documentation.php', logo_emoji: '⚡', categories: ['ENERGY'], requires_auth: true, is_free: true, reliability: 0.95, description: 'Energy data' },
  { id: 'nrel', name: 'NREL Solar', api_type: 'REST', base_url: 'https://developer.nrel.gov', website_url: 'https://www.nrel.gov', documentation_url: 'https://developer.nrel.gov/docs/', logo_emoji: '☀️', categories: ['ENERGY'], requires_auth: true, is_free: true, reliability: 0.9, description: 'Solar resources' },
  // HEALTH
  { id: 'cdc', name: 'CDC Data', api_type: 'REST', base_url: 'https://data.cdc.gov', website_url: 'https://www.cdc.gov', documentation_url: 'https://open.cdc.gov/apis.html', logo_emoji: '🏥', categories: ['HEALTH'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Public health' },
  { id: 'cms', name: 'CMS Hospitals', api_type: 'REST', base_url: 'https://data.cms.gov', website_url: 'https://www.cms.gov', documentation_url: 'https://data.cms.gov/provider-data/api', logo_emoji: '🩺', categories: ['HEALTH'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Healthcare providers' },
  // RECREATION
  { id: 'recreation_gov', name: 'Recreation.gov', api_type: 'REST', base_url: 'https://ridb.recreation.gov', website_url: 'https://www.recreation.gov', documentation_url: 'https://ridb.recreation.gov/docs', logo_emoji: '🏕️', categories: ['RECREATION'], requires_auth: true, is_free: true, reliability: 0.9, description: 'Campgrounds, permits' },
  { id: 'nps', name: 'National Park Service', api_type: 'REST', base_url: 'https://developer.nps.gov', website_url: 'https://www.nps.gov', documentation_url: 'https://www.nps.gov/subjects/developer/api-documentation.htm', logo_emoji: '🏞️', categories: ['RECREATION', 'GEOSPATIAL'], requires_auth: true, is_free: true, reliability: 0.95, description: 'National parks' },
];

// Helper to find source info by ID or name
export function findSourceInfo(sourceIdOrName: string): DataSourceRegistryEntry | undefined {
  const normalized = sourceIdOrName.toLowerCase().replace(/[_\s-]/g, '');
  return DATA_SOURCE_REGISTRY.find(s => 
    s.id.toLowerCase() === normalized || 
    s.name.toLowerCase().replace(/[_\s-]/g, '') === normalized ||
    normalized.includes(s.id.toLowerCase()) ||
    normalized.includes(s.name.toLowerCase().replace(/[_\s-]/g, ''))
  );
}

// ============================================================================
// RE-EXPORTS (from central constants)
// ============================================================================

export { 
  CREDIT_COSTS, 
  CREDIT_COSTS as OMNISCIENT_CREDITS,
  ENRICHMENT_STRATEGIES, 
  RELATIONSHIP_PREDICATES,
  CATEGORY_COLORS,
} from '@/lib/constants';
