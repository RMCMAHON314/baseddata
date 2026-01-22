// OMNISCIENT Type Definitions
// Universal On-Demand Data Pipeline Types

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
  | 'MARINE';

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
  status: 'success' | 'error' | 'partial';
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

// Response from the OMNISCIENT edge function
export interface OmniscientResponse {
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
}

export interface OmniscientResult {
  query_id?: string;
  prompt: string;
  intent: ParsedIntent;
  collected_data: CollectedData[];
  features: GeoJSONFeatureCollection;
  insights: OmniscientInsights;
  tabular_data: Record<string, any>[];
  sources_used: string[];
  processing_time_ms: number;
  credits_used: number;
}
export interface MapLayer {
  id: string;
  name: string;
  category: DataCategory;
  visible: boolean;
  features: GeoJSONFeature[];
  color: string;
  icon?: string;
}

// Data Source Registry
export const DATA_SOURCE_REGISTRY: DataSourceInfo[] = [
  // Geospatial
  { id: 'osm', name: 'OpenStreetMap', api_type: 'REST', base_url: 'https://overpass-api.de/api/interpreter', categories: ['GEOSPATIAL'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Roads, buildings, POIs, boundaries' },
  { id: 'usgs', name: 'USGS National Map', api_type: 'REST', base_url: 'https://apps.nationalmap.gov/tnmaccess/api', categories: ['GEOSPATIAL'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Elevation, hydrology, land cover' },
  { id: 'census_tiger', name: 'Census TIGER', api_type: 'REST', base_url: 'https://tigerweb.geo.census.gov/arcgis/rest/services', categories: ['GEOSPATIAL', 'DEMOGRAPHICS'], requires_auth: false, is_free: true, reliability: 0.95, description: 'State/county boundaries' },
  
  // Wildlife
  { id: 'ebird', name: 'eBird', api_type: 'REST', base_url: 'https://api.ebird.org/v2', categories: ['WILDLIFE'], requires_auth: true, is_free: true, reliability: 0.85, description: 'Bird sightings, migration patterns' },
  { id: 'inaturalist', name: 'iNaturalist', api_type: 'REST', base_url: 'https://api.inaturalist.org/v1', categories: ['WILDLIFE'], requires_auth: false, is_free: true, reliability: 0.8, description: 'Crowdsourced wildlife observations' },
  { id: 'gbif', name: 'GBIF', api_type: 'REST', base_url: 'https://api.gbif.org/v1', categories: ['WILDLIFE'], requires_auth: false, is_free: true, reliability: 0.85, description: 'Global biodiversity records' },
  { id: 'usfws', name: 'USFWS ECOS', api_type: 'REST', base_url: 'https://ecos.fws.gov/ecp/services', categories: ['WILDLIFE', 'REGULATIONS'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Endangered species, critical habitat' },
  
  // Weather
  { id: 'noaa_weather', name: 'NOAA Weather', api_type: 'REST', base_url: 'https://api.weather.gov', categories: ['WEATHER'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Forecasts, alerts, historical' },
  { id: 'noaa_tides', name: 'NOAA Tides', api_type: 'REST', base_url: 'https://api.tidesandcurrents.noaa.gov/api/prod', categories: ['WEATHER', 'MARINE'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Tide predictions, water temp' },
  { id: 'epa_air', name: 'EPA Air Quality', api_type: 'REST', base_url: 'https://aqs.epa.gov/data/api', categories: ['WEATHER'], requires_auth: false, is_free: true, reliability: 0.9, description: 'AQI, pollution levels' },
  
  // Government
  { id: 'usaspending', name: 'USASpending', api_type: 'REST', base_url: 'https://api.usaspending.gov/api/v2', categories: ['GOVERNMENT', 'ECONOMIC'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Federal contracts, grants' },
  { id: 'sec_edgar', name: 'SEC EDGAR', api_type: 'REST', base_url: 'https://data.sec.gov', categories: ['GOVERNMENT', 'ECONOMIC'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Company filings, financials' },
  { id: 'regulations_gov', name: 'Regulations.gov', api_type: 'REST', base_url: 'https://api.regulations.gov/v4', categories: ['REGULATIONS'], requires_auth: true, is_free: true, reliability: 0.9, description: 'Federal regulations' },
  { id: 'blm', name: 'BLM Navigator', api_type: 'REST', base_url: 'https://gis.blm.gov/arcgis/rest/services', categories: ['GEOSPATIAL', 'REGULATIONS'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Public lands boundaries' },
  { id: 'usfs', name: 'USFS', api_type: 'REST', base_url: 'https://apps.fs.usda.gov/arcx/rest/services', categories: ['GEOSPATIAL', 'REGULATIONS'], requires_auth: false, is_free: true, reliability: 0.9, description: 'National forest trails' },
  
  // Marine
  { id: 'noaa_charts', name: 'NOAA Nautical Charts', api_type: 'REST', base_url: 'https://gis.charttools.noaa.gov/arcgis/rest/services', categories: ['MARINE', 'TRANSPORTATION'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Navigation charts, depths' },
  
  // Demographics
  { id: 'census', name: 'Census Bureau', api_type: 'REST', base_url: 'https://api.census.gov/data', categories: ['DEMOGRAPHICS', 'ECONOMIC'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Population, income, housing' },
  { id: 'bls', name: 'Bureau of Labor Statistics', api_type: 'REST', base_url: 'https://api.bls.gov/publicAPI/v2', categories: ['ECONOMIC'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Employment, wages' },
  
  // Research
  { id: 'nih', name: 'NIH Reporter', api_type: 'REST', base_url: 'https://api.reporter.nih.gov/v2', categories: ['GOVERNMENT'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Research grants' },
  { id: 'uspto', name: 'USPTO PatentsView', api_type: 'REST', base_url: 'https://api.patentsview.org', categories: ['GOVERNMENT'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Patent data' },
];

// Credit costs for different query types
export const OMNISCIENT_CREDITS = {
  simple: 5,      // 1-3 sources
  medium: 15,     // 4-7 sources
  complex: 30,    // 8+ sources
  satellite: 10,  // Additional for imagery
  pdf_report: 5,  // PDF generation
  historical: 10, // Historical data (>1 year)
};
