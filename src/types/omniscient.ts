// BASED DATA v6.0 Type Definitions
// Self-Evolving Universal Data Pipeline with Auto-Enrichment

export interface ParsedIntent {
  use_case: string;
  location: {
    name: string;
    bbox?: [number, number, number, number];
    center?: [number, number];
  } | null;
  time_context: {
    type: 'seasonal' | 'specific' | 'ongoing';
    dates?: string[];
    season?: string;
  };
  categories: DataCategory[];
  sources: DataSourceQuery[];
  insights: string[];
  confidence: number;
}

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

export interface DataSourceQuery {
  name: string;
  api: string;
  query_params: Record<string, any>;
  priority?: number;
}

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

export interface CollectedData {
  source: string;
  status: 'success' | 'error' | 'partial' | 'empty';
  data: GeoJSONFeatureCollection | null;
  error?: string;
  collection_time_ms: number;
  record_count: number;
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point' | 'Polygon' | 'LineString' | 'MultiPolygon' | 'MultiLineString';
    coordinates: number[] | number[][] | number[][][] | number[][][][];
  };
  properties: FeatureProperties;
}

export interface FeatureProperties {
  source: string;
  source_id: string;
  category: DataCategory;
  subcategory?: string;
  name: string;
  description?: string;
  timestamp?: string;
  attributes?: Record<string, any>;
  confidence?: number;
  [key: string]: any;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface OmniscientInsights {
  summary: string;
  key_findings: string[];
  recommendations: string[];
  warnings: string[];
  optimal_conditions?: {
    best_dates?: string[];
    best_times?: string[];
    weather_requirements?: string[];
    other?: string[];
  };
  related_queries: string[];
}

export interface OmniscientQuery {
  id?: string;
  user_id?: string;
  prompt?: string;
  raw_prompt?: string;
  parsed_intent?: ParsedIntent;
  location_bbox?: [number, number, number, number];
  location_center?: [number, number];
  status?: 'pending' | 'collecting' | 'analyzing' | 'complete' | 'failed';
  credits_used?: number;
  created_at?: string;
  completed_at?: string;
  timestamp?: string;
}

// Response from the BASED DATA v6.0 edge function
export interface OmniscientResponse {
  success: boolean;
  query_id: string;
  engine_version: string;
  prompt: string;
  intent: ParsedIntent;
  collected_data: CollectedData[];
  features: GeoJSONFeatureCollection;
  insights: OmniscientInsights;
  tabular_data: Record<string, any>[];
  sources_used: string[];
  processing_time_ms: number;
  credits_used: number;
  data_tap: DataTapStats;
  enrichments?: string[]; // NEW: Auto-enrichment types applied
}

// Data Flywheel Statistics
export interface DataTapStats {
  records_persisted: number;
  records_deduplicated: number;
  dynamic_genesis?: boolean;
  enrichment_queued?: boolean;
  auto_expanded?: boolean; // NEW: Whether query was auto-expanded
}

// Enrichment & Fusion Types
export interface EnrichmentResult {
  enrichedCount: number;
  relationshipsCreated: number;
  knowledgeEdges: number;
  fusedRecords: number;
  aiInsight?: string;
  processingTimeMs: number;
}

export interface FusedRecord {
  id: string;
  base_record_id: string;
  enrichment_sources: string[];
  fused_properties: Record<string, any>;
  fusion_score: number;
  enrichment_count: number;
  last_enriched_at: string;
}

export interface RecordRelationship {
  id: string;
  source_record_id: string;
  target_record_id: string;
  relationship_type: 'near' | 'affects' | 'regulates' | 'contains' | 'overlaps';
  confidence_score: number;
  distance_meters?: number;
  metadata: Record<string, any>;
}

export interface KnowledgeEdge {
  id: string;
  subject_type: 'record' | 'category' | 'location' | 'source';
  subject_id: string;
  predicate: string;
  object_type: string;
  object_id: string;
  weight: number;
  evidence: any[];
}

// DEPRECATED: Use OmniscientResponse instead - keeping for backwards compatibility
export type OmniscientResult = Omit<OmniscientResponse, 'success' | 'engine_version' | 'data_tap' | 'enrichments'>;

export interface MapLayer {
  id: string;
  name: string;
  category: DataCategory;
  visible: boolean;
  features: GeoJSONFeature[];
  color: string;
  icon?: string;
}

export interface DynamicCollector {
  id: string;
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
  success_count: number;
  failure_count: number;
  last_used_at?: string;
  created_at: string;
  is_active: boolean;
  created_by_prompt?: string;
}

// ============================================================================
// DATA SOURCE REGISTRY - 70+ Sources Across 10+ Categories
// ============================================================================

export const DATA_SOURCE_REGISTRY: DataSourceInfo[] = [
  // GEOSPATIAL (6 sources)
  { id: 'osm', name: 'OpenStreetMap', api_type: 'REST', base_url: 'https://overpass-api.de/api/interpreter', categories: ['GEOSPATIAL'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Roads, buildings, POIs, boundaries' },
  { id: 'usgs', name: 'USGS National Map', api_type: 'REST', base_url: 'https://apps.nationalmap.gov/tnmaccess/api', categories: ['GEOSPATIAL'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Elevation, hydrology, land cover' },
  { id: 'census_tiger', name: 'Census TIGER', api_type: 'REST', base_url: 'https://tigerweb.geo.census.gov/arcgis/rest/services', categories: ['GEOSPATIAL', 'DEMOGRAPHICS'], requires_auth: false, is_free: true, reliability: 0.95, description: 'State/county boundaries' },
  { id: 'usgs_earthquakes', name: 'USGS Earthquakes', api_type: 'REST', base_url: 'https://earthquake.usgs.gov/fdsnws/event/1', categories: ['GEOSPATIAL'], requires_auth: false, is_free: true, reliability: 0.98, description: 'Real-time earthquake data' },
  { id: 'nasa_firms', name: 'NASA FIRMS', api_type: 'REST', base_url: 'https://firms.modaps.eosdis.nasa.gov/api', categories: ['GEOSPATIAL'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Active fire detection' },
  { id: 'fema', name: 'FEMA Disasters', api_type: 'REST', base_url: 'https://www.fema.gov/api/open/v2', categories: ['GEOSPATIAL'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Disaster declarations' },
  
  // WILDLIFE (7 sources)
  { id: 'ebird', name: 'eBird', api_type: 'REST', base_url: 'https://api.ebird.org/v2', categories: ['WILDLIFE'], requires_auth: true, is_free: true, reliability: 0.85, description: 'Bird sightings, migration patterns' },
  { id: 'inaturalist', name: 'iNaturalist', api_type: 'REST', base_url: 'https://api.inaturalist.org/v1', categories: ['WILDLIFE'], requires_auth: false, is_free: true, reliability: 0.8, description: 'Crowdsourced wildlife observations' },
  { id: 'gbif', name: 'GBIF', api_type: 'REST', base_url: 'https://api.gbif.org/v1', categories: ['WILDLIFE'], requires_auth: false, is_free: true, reliability: 0.85, description: 'Global biodiversity records' },
  { id: 'usfws', name: 'USFWS ECOS', api_type: 'REST', base_url: 'https://ecos.fws.gov/ecp/services', categories: ['WILDLIFE', 'REGULATIONS'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Endangered species, critical habitat' },
  { id: 'movebank', name: 'Movebank', api_type: 'REST', base_url: 'https://www.movebank.org/movebank/service', categories: ['WILDLIFE'], requires_auth: false, is_free: true, reliability: 0.85, description: 'Animal tracking studies' },
  { id: 'birdcast', name: 'BirdCast', api_type: 'REST', base_url: 'https://birdcast.info/api', categories: ['WILDLIFE'], requires_auth: false, is_free: true, reliability: 0.8, description: 'Migration forecasts' },
  { id: 'xeno_canto', name: 'Xeno-Canto', api_type: 'REST', base_url: 'https://xeno-canto.org/api/2', categories: ['WILDLIFE'], requires_auth: false, is_free: true, reliability: 0.85, description: 'Bird sounds & recordings' },
  
  // WEATHER (6 sources)
  { id: 'noaa_weather', name: 'NOAA Weather', api_type: 'REST', base_url: 'https://api.weather.gov', categories: ['WEATHER'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Forecasts, alerts, historical' },
  { id: 'noaa_climate', name: 'NOAA Climate', api_type: 'REST', base_url: 'https://www.ncei.noaa.gov/cdo-web/api/v2', categories: ['WEATHER'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Climate stations & data' },
  { id: 'open_meteo', name: 'Open-Meteo', api_type: 'REST', base_url: 'https://api.open-meteo.com/v1', categories: ['WEATHER'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Global weather forecasts' },
  { id: 'epa_air', name: 'EPA Air Quality', api_type: 'REST', base_url: 'https://aqs.epa.gov/data/api', categories: ['WEATHER'], requires_auth: false, is_free: true, reliability: 0.9, description: 'AQI, pollution levels' },
  { id: 'nasa_power', name: 'NASA POWER', api_type: 'REST', base_url: 'https://power.larc.nasa.gov/api', categories: ['WEATHER', 'ENERGY'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Solar irradiance, climate' },
  { id: 'purpleair', name: 'PurpleAir', api_type: 'REST', base_url: 'https://api.purpleair.com/v1', categories: ['WEATHER'], requires_auth: true, is_free: false, reliability: 0.85, description: 'Real-time air quality sensors' },
  
  // MARINE (5 sources)
  { id: 'noaa_tides', name: 'NOAA Tides', api_type: 'REST', base_url: 'https://api.tidesandcurrents.noaa.gov/api/prod', categories: ['MARINE'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Tide predictions, water temp' },
  { id: 'noaa_buoys', name: 'NOAA Buoys', api_type: 'REST', base_url: 'https://www.ndbc.noaa.gov/data/realtime2', categories: ['MARINE'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Ocean buoy data' },
  { id: 'noaa_charts', name: 'NOAA Nautical Charts', api_type: 'REST', base_url: 'https://gis.charttools.noaa.gov/arcgis/rest/services', categories: ['MARINE', 'TRANSPORTATION'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Navigation charts, depths' },
  { id: 'openseamap', name: 'OpenSeaMap', api_type: 'REST', base_url: 'https://tiles.openseamap.org', categories: ['MARINE'], requires_auth: false, is_free: true, reliability: 0.85, description: 'Marine navigation' },
  { id: 'noaa_currents', name: 'NOAA Currents', api_type: 'REST', base_url: 'https://tidesandcurrents.noaa.gov/api', categories: ['MARINE'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Ocean currents' },
  
  // GOVERNMENT (10 sources)
  { id: 'usaspending', name: 'USASpending', api_type: 'REST', base_url: 'https://api.usaspending.gov/api/v2', categories: ['GOVERNMENT', 'ECONOMIC'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Federal contracts, grants' },
  { id: 'sam_gov', name: 'SAM.gov', api_type: 'REST', base_url: 'https://api.sam.gov/opportunities/v2', categories: ['GOVERNMENT'], requires_auth: true, is_free: true, reliability: 0.9, description: 'Contract opportunities' },
  { id: 'sec_edgar', name: 'SEC EDGAR', api_type: 'REST', base_url: 'https://data.sec.gov', categories: ['GOVERNMENT', 'ECONOMIC'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Company filings, financials' },
  { id: 'regulations_gov', name: 'Regulations.gov', api_type: 'REST', base_url: 'https://api.regulations.gov/v4', categories: ['REGULATIONS'], requires_auth: true, is_free: true, reliability: 0.9, description: 'Federal regulations' },
  { id: 'blm', name: 'BLM Navigator', api_type: 'REST', base_url: 'https://gis.blm.gov/arcgis/rest/services', categories: ['GEOSPATIAL', 'REGULATIONS'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Public lands boundaries' },
  { id: 'usfs', name: 'USFS', api_type: 'REST', base_url: 'https://apps.fs.usda.gov/arcx/rest/services', categories: ['GEOSPATIAL', 'REGULATIONS'], requires_auth: false, is_free: true, reliability: 0.9, description: 'National forest trails' },
  { id: 'data_gov', name: 'Data.gov', api_type: 'REST', base_url: 'https://catalog.data.gov/api', categories: ['GOVERNMENT'], requires_auth: false, is_free: true, reliability: 0.85, description: 'Federal dataset catalog' },
  { id: 'nih', name: 'NIH Reporter', api_type: 'REST', base_url: 'https://api.reporter.nih.gov/v2', categories: ['GOVERNMENT', 'HEALTH'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Research grants' },
  { id: 'nsf', name: 'NSF Awards', api_type: 'REST', base_url: 'https://api.nsf.gov/services/v1', categories: ['GOVERNMENT', 'RESEARCH'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Science grants' },
  { id: 'uspto', name: 'USPTO PatentsView', api_type: 'REST', base_url: 'https://api.patentsview.org', categories: ['GOVERNMENT'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Patent data' },
  
  // ECONOMIC & DEMOGRAPHICS (4 sources)
  { id: 'census', name: 'Census Bureau', api_type: 'REST', base_url: 'https://api.census.gov/data', categories: ['DEMOGRAPHICS', 'ECONOMIC'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Population, income, housing' },
  { id: 'bls', name: 'Bureau of Labor Statistics', api_type: 'REST', base_url: 'https://api.bls.gov/publicAPI/v2', categories: ['ECONOMIC'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Employment, wages' },
  { id: 'fred', name: 'FRED', api_type: 'REST', base_url: 'https://api.stlouisfed.org/fred', categories: ['ECONOMIC'], requires_auth: true, is_free: true, reliability: 0.95, description: 'Economic indicators' },
  { id: 'hud', name: 'HUD', api_type: 'REST', base_url: 'https://www.huduser.gov/hudapi', categories: ['ECONOMIC', 'DEMOGRAPHICS'], requires_auth: true, is_free: true, reliability: 0.9, description: 'Housing data' },
  
  // TRANSPORTATION (3 sources)
  { id: 'faa', name: 'FAA Airports', api_type: 'REST', base_url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx', categories: ['TRANSPORTATION'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Airport locations' },
  { id: 'opensky', name: 'OpenSky Network', api_type: 'REST', base_url: 'https://opensky-network.org/api', categories: ['TRANSPORTATION'], requires_auth: false, is_free: true, reliability: 0.85, description: 'Live flight tracking' },
  { id: 'osm_roads', name: 'OSM Roads', api_type: 'REST', base_url: 'https://overpass-api.de/api/interpreter', categories: ['TRANSPORTATION', 'GEOSPATIAL'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Road network' },
  
  // ENERGY (3 sources)
  { id: 'eia', name: 'EIA Energy', api_type: 'REST', base_url: 'https://api.eia.gov/v2', categories: ['ENERGY'], requires_auth: true, is_free: true, reliability: 0.95, description: 'Energy production & prices' },
  { id: 'nrel', name: 'NREL Solar', api_type: 'REST', base_url: 'https://developer.nrel.gov/api', categories: ['ENERGY'], requires_auth: true, is_free: true, reliability: 0.9, description: 'Solar resource data' },
  { id: 'dsire', name: 'DSIRE Incentives', api_type: 'REST', base_url: 'https://programs.dsireusa.org/api', categories: ['ENERGY'], requires_auth: false, is_free: true, reliability: 0.85, description: 'Renewable incentives' },
  
  // HEALTH (3 sources)
  { id: 'cdc', name: 'CDC Data', api_type: 'REST', base_url: 'https://data.cdc.gov/api', categories: ['HEALTH'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Public health data' },
  { id: 'cms', name: 'CMS Hospitals', api_type: 'REST', base_url: 'https://data.cms.gov/provider-data/api', categories: ['HEALTH'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Healthcare providers' },
  { id: 'clinical_trials', name: 'ClinicalTrials.gov', api_type: 'REST', base_url: 'https://clinicaltrials.gov/api', categories: ['HEALTH', 'RESEARCH'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Clinical trial registry' },
  
  // RECREATION (2 sources)
  { id: 'recreation_gov', name: 'Recreation.gov', api_type: 'REST', base_url: 'https://ridb.recreation.gov/api/v1', categories: ['RECREATION'], requires_auth: true, is_free: true, reliability: 0.9, description: 'Campgrounds, permits' },
  { id: 'nps', name: 'National Park Service', api_type: 'REST', base_url: 'https://developer.nps.gov/api/v1', categories: ['RECREATION', 'GEOSPATIAL'], requires_auth: true, is_free: true, reliability: 0.95, description: 'National parks data' },
];

// ============================================================================
// CONSTANTS - Centralized in @/lib/constants.ts
// Re-exported here for backwards compatibility
// ============================================================================

export { 
  CREDIT_COSTS as OMNISCIENT_CREDITS,
  ENRICHMENT_STRATEGIES,
  RELATIONSHIP_PREDICATES,
} from '@/lib/constants';
