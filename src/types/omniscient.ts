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
  | 'HEALTHCARE'
  | 'ENERGY'
  | 'RECREATION'
  | 'RESEARCH'
  | 'ENVIRONMENTAL'
  | 'FINANCIAL'
  | 'CORPORATE'
  | 'EDUCATION'
  | 'FOOD'
  | 'HOUSING'
  | 'PATENTS';

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
  { id: 'openstreetmap', name: 'OpenStreetMap', api_type: 'REST', base_url: 'https://overpass-api.de', website_url: 'https://www.openstreetmap.org', documentation_url: 'https://wiki.openstreetmap.org/wiki/API', logo_emoji: '🗺️', categories: ['GEOSPATIAL'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Global POI and location data' },
  { id: 'census-geocoder', name: 'Census Geocoder', api_type: 'REST', base_url: 'https://geocoding.geo.census.gov', website_url: 'https://www.census.gov', documentation_url: 'https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.pdf', logo_emoji: '📍', categories: ['GEOSPATIAL'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Address geocoding' },
  
  // HEALTHCARE (12 sources)
  { id: 'cms-open-payments', name: 'CMS Open Payments', api_type: 'REST', base_url: 'https://openpaymentsdata.cms.gov', website_url: 'https://openpaymentsdata.cms.gov', documentation_url: 'https://openpaymentsdata.cms.gov/api-documentation', logo_emoji: '💊', categories: ['HEALTHCARE'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Pharma payments to physicians' },
  { id: 'npi-registry', name: 'NPI Registry', api_type: 'REST', base_url: 'https://npiregistry.cms.hhs.gov', website_url: 'https://npiregistry.cms.hhs.gov', documentation_url: 'https://npiregistry.cms.hhs.gov/api-page', logo_emoji: '🩺', categories: ['HEALTHCARE'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Healthcare provider registry' },
  { id: 'hospital-compare', name: 'Hospital Compare', api_type: 'REST', base_url: 'https://data.cms.gov', website_url: 'https://www.medicare.gov/care-compare', documentation_url: 'https://data.cms.gov/provider-data/api', logo_emoji: '🏥', categories: ['HEALTHCARE'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Medicare hospital quality ratings' },
  { id: 'medicare-providers', name: 'Medicare Providers', api_type: 'REST', base_url: 'https://data.cms.gov', website_url: 'https://data.cms.gov', documentation_url: 'https://data.cms.gov/provider-data/api', logo_emoji: '👨‍⚕️', categories: ['HEALTHCARE'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Medicare provider data' },
  { id: 'nursing-homes', name: 'Nursing Homes', api_type: 'REST', base_url: 'https://data.cms.gov', website_url: 'https://www.medicare.gov/care-compare', documentation_url: 'https://data.cms.gov/provider-data/api', logo_emoji: '🏠', categories: ['HEALTHCARE'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Nursing home quality ratings' },
  { id: 'fda-drugs', name: 'FDA Drug Database', api_type: 'REST', base_url: 'https://api.fda.gov', website_url: 'https://open.fda.gov', documentation_url: 'https://open.fda.gov/apis/', logo_emoji: '💉', categories: ['HEALTHCARE'], requires_auth: false, is_free: true, reliability: 0.95, description: 'FDA approved drugs' },
  { id: 'fda-recalls', name: 'FDA Recalls', api_type: 'REST', base_url: 'https://api.fda.gov', website_url: 'https://open.fda.gov', documentation_url: 'https://open.fda.gov/apis/', logo_emoji: '⚠️', categories: ['HEALTHCARE'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Drug recalls' },
  { id: 'fda-adverse', name: 'FDA Adverse Events', api_type: 'REST', base_url: 'https://api.fda.gov', website_url: 'https://open.fda.gov', documentation_url: 'https://open.fda.gov/apis/', logo_emoji: '🚨', categories: ['HEALTHCARE'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Drug adverse events' },
  { id: 'clinical-trials', name: 'ClinicalTrials.gov', api_type: 'REST', base_url: 'https://clinicaltrials.gov', website_url: 'https://clinicaltrials.gov', documentation_url: 'https://clinicaltrials.gov/api/gui', logo_emoji: '🔬', categories: ['HEALTHCARE'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Clinical research studies' },
  { id: 'oig-exclusions', name: 'OIG Exclusions', api_type: 'REST', base_url: 'https://oig.hhs.gov', website_url: 'https://oig.hhs.gov/exclusions', documentation_url: 'https://oig.hhs.gov/exclusions/exclusions_list.asp', logo_emoji: '🚫', categories: ['HEALTHCARE'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Excluded healthcare providers' },
  { id: 'propublica-cms', name: 'ProPublica CMS', api_type: 'REST', base_url: 'https://projects.propublica.org/api', website_url: 'https://projects.propublica.org/checkup', documentation_url: 'https://projects.propublica.org/checkup/api', logo_emoji: '📰', categories: ['HEALTHCARE'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Medicare provider analysis' },
  { id: 'state-licenses', name: 'State Medical Licenses', api_type: 'REST', base_url: 'https://api.fsmb.org', website_url: 'https://www.fsmb.org', documentation_url: 'https://www.fsmb.org/physician-data-center', logo_emoji: '📜', categories: ['HEALTHCARE'], requires_auth: true, is_free: false, reliability: 0.9, description: 'Medical license verification' },
  
  // GOVERNMENT & SPENDING (10 sources)
  { id: 'usaspending', name: 'USASpending', api_type: 'REST', base_url: 'https://api.usaspending.gov', website_url: 'https://www.usaspending.gov', documentation_url: 'https://api.usaspending.gov/docs/', logo_emoji: '💰', categories: ['GOVERNMENT'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Federal contracts & grants' },
  { id: 'sam-entities', name: 'SAM.gov Entities', api_type: 'REST', base_url: 'https://api.sam.gov', website_url: 'https://sam.gov', documentation_url: 'https://open.gsa.gov/api/entity-api/', logo_emoji: '🏛️', categories: ['GOVERNMENT'], requires_auth: true, is_free: true, reliability: 0.95, description: 'Federal contractor registry' },
  { id: 'fpds', name: 'FPDS Contracts', api_type: 'REST', base_url: 'https://www.fpds.gov', website_url: 'https://www.fpds.gov', documentation_url: 'https://www.fpds.gov/wiki/', logo_emoji: '📋', categories: ['GOVERNMENT'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Federal procurement data' },
  { id: 'grants-gov', name: 'Grants.gov', api_type: 'REST', base_url: 'https://www.grants.gov', website_url: 'https://www.grants.gov', documentation_url: 'https://www.grants.gov/web/grants/support/technical-support.html', logo_emoji: '🎁', categories: ['GOVERNMENT'], requires_auth: true, is_free: true, reliability: 0.9, description: 'Federal grant opportunities' },
  { id: 'usajobs', name: 'USAJobs', api_type: 'REST', base_url: 'https://data.usajobs.gov', website_url: 'https://www.usajobs.gov', documentation_url: 'https://developer.usajobs.gov/', logo_emoji: '💼', categories: ['GOVERNMENT'], requires_auth: true, is_free: true, reliability: 0.95, description: 'Federal job listings' },
  { id: 'sbir', name: 'SBIR/STTR Awards', api_type: 'REST', base_url: 'https://www.sbir.gov/api', website_url: 'https://www.sbir.gov', documentation_url: 'https://www.sbir.gov/api', logo_emoji: '🚀', categories: ['GOVERNMENT'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Small business research awards' },
  { id: 'treasury-sanctions', name: 'Treasury Sanctions', api_type: 'REST', base_url: 'https://ofac.treasury.gov', website_url: 'https://ofac.treasury.gov', documentation_url: 'https://ofac.treasury.gov/specially-designated-nationals-list-data-formats-data-schemas', logo_emoji: '🔒', categories: ['GOVERNMENT'], requires_auth: false, is_free: true, reliability: 0.95, description: 'OFAC sanctions list' },
  
  // ENVIRONMENTAL (9 sources)
  { id: 'epa-echo', name: 'EPA ECHO', api_type: 'REST', base_url: 'https://echo.epa.gov', website_url: 'https://echo.epa.gov', documentation_url: 'https://echo.epa.gov/tools/web-services', logo_emoji: '🌍', categories: ['ENVIRONMENTAL'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Environmental compliance & violations' },
  { id: 'epa-air', name: 'EPA Air Quality', api_type: 'REST', base_url: 'https://aqs.epa.gov', website_url: 'https://www.epa.gov/outdoor-air-quality-data', documentation_url: 'https://aqs.epa.gov/aqsweb/documents/data_api.html', logo_emoji: '💨', categories: ['ENVIRONMENTAL'], requires_auth: true, is_free: true, reliability: 0.9, description: 'Air quality data' },
  { id: 'epa-superfund', name: 'EPA Superfund', api_type: 'REST', base_url: 'https://enviro.epa.gov', website_url: 'https://www.epa.gov/superfund', documentation_url: 'https://www.epa.gov/enviro/envirofacts-data-service-api', logo_emoji: '☢️', categories: ['ENVIRONMENTAL'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Contaminated sites' },
  { id: 'epa-tri', name: 'EPA Toxics Release', api_type: 'REST', base_url: 'https://enviro.epa.gov', website_url: 'https://www.epa.gov/toxics-release-inventory-tri-program', documentation_url: 'https://www.epa.gov/enviro/tri-search', logo_emoji: '☣️', categories: ['ENVIRONMENTAL'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Toxic chemical releases' },
  { id: 'fema-flood', name: 'FEMA Flood Maps', api_type: 'REST', base_url: 'https://hazards.fema.gov', website_url: 'https://www.fema.gov/flood-maps', documentation_url: 'https://hazards.fema.gov/gis/nfhl/rest/services', logo_emoji: '🌊', categories: ['ENVIRONMENTAL'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Flood hazard zones' },
  { id: 'usgs-earthquake', name: 'USGS Earthquakes', api_type: 'REST', base_url: 'https://earthquake.usgs.gov', website_url: 'https://earthquake.usgs.gov', documentation_url: 'https://earthquake.usgs.gov/fdsnws/event/1/', logo_emoji: '🌋', categories: ['ENVIRONMENTAL'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Earthquake data' },
  { id: 'usgs-water', name: 'USGS Water Data', api_type: 'REST', base_url: 'https://waterservices.usgs.gov', website_url: 'https://waterdata.usgs.gov', documentation_url: 'https://waterservices.usgs.gov/', logo_emoji: '💧', categories: ['ENVIRONMENTAL'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Water quality & flow' },
  { id: 'noaa-weather', name: 'NOAA Weather', api_type: 'REST', base_url: 'https://www.ncdc.noaa.gov', website_url: 'https://www.noaa.gov', documentation_url: 'https://www.ncdc.noaa.gov/cdo-web/webservices/v2', logo_emoji: '⛈️', categories: ['ENVIRONMENTAL'], requires_auth: true, is_free: true, reliability: 0.95, description: 'Historical weather' },
  { id: 'wildfire-risk', name: 'USFS Wildfire Risk', api_type: 'REST', base_url: 'https://apps.fs.usda.gov', website_url: 'https://www.fs.usda.gov/managing-land/fire', documentation_url: 'https://apps.fs.usda.gov/arcx/rest/services', logo_emoji: '🔥', categories: ['ENVIRONMENTAL'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Wildfire hazard data' },
  
  // ECONOMIC & FINANCIAL (8 sources)
  { id: 'census-acs', name: 'Census ACS', api_type: 'REST', base_url: 'https://api.census.gov', website_url: 'https://www.census.gov/programs-surveys/acs', documentation_url: 'https://www.census.gov/data/developers/data-sets/acs-5year.html', logo_emoji: '📊', categories: ['ECONOMIC'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Demographics & income' },
  { id: 'census-business', name: 'Census Business Patterns', api_type: 'REST', base_url: 'https://api.census.gov', website_url: 'https://www.census.gov/programs-surveys/cbp.html', documentation_url: 'https://www.census.gov/data/developers/data-sets/cbp-nonemp-zbp.html', logo_emoji: '🏢', categories: ['ECONOMIC'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Business statistics' },
  { id: 'bls-employment', name: 'BLS Employment', api_type: 'REST', base_url: 'https://api.bls.gov', website_url: 'https://www.bls.gov', documentation_url: 'https://www.bls.gov/developers/', logo_emoji: '👷', categories: ['ECONOMIC'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Employment & wages' },
  { id: 'fred', name: 'FRED Economic Data', api_type: 'REST', base_url: 'https://api.stlouisfed.org', website_url: 'https://fred.stlouisfed.org', documentation_url: 'https://fred.stlouisfed.org/docs/api/fred/', logo_emoji: '📈', categories: ['ECONOMIC'], requires_auth: true, is_free: true, reliability: 0.95, description: 'Economic indicators' },
  { id: 'bea-gdp', name: 'BEA GDP', api_type: 'REST', base_url: 'https://apps.bea.gov', website_url: 'https://www.bea.gov', documentation_url: 'https://apps.bea.gov/api/', logo_emoji: '💹', categories: ['ECONOMIC'], requires_auth: true, is_free: true, reliability: 0.95, description: 'GDP data' },
  { id: 'fdic-banks', name: 'FDIC Banks', api_type: 'REST', base_url: 'https://banks.data.fdic.gov', website_url: 'https://www.fdic.gov', documentation_url: 'https://banks.data.fdic.gov/docs/', logo_emoji: '🏦', categories: ['FINANCIAL'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Bank financial data' },
  { id: 'sec-edgar', name: 'SEC EDGAR', api_type: 'REST', base_url: 'https://data.sec.gov', website_url: 'https://www.sec.gov/edgar', documentation_url: 'https://www.sec.gov/developer', logo_emoji: '📑', categories: ['FINANCIAL'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Public company filings' },
  { id: 'opencorporates', name: 'OpenCorporates', api_type: 'REST', base_url: 'https://api.opencorporates.com', website_url: 'https://opencorporates.com', documentation_url: 'https://api.opencorporates.com/documentation', logo_emoji: '🏭', categories: ['CORPORATE'], requires_auth: true, is_free: false, reliability: 0.9, description: 'Corporate registry' },
  
  // EDUCATION (2 sources)
  { id: 'college-scorecard', name: 'College Scorecard', api_type: 'REST', base_url: 'https://api.data.gov/ed/collegescorecard', website_url: 'https://collegescorecard.ed.gov', documentation_url: 'https://collegescorecard.ed.gov/data/documentation/', logo_emoji: '🎓', categories: ['EDUCATION'], requires_auth: true, is_free: true, reliability: 0.95, description: 'College costs & outcomes' },
  { id: 'nces-schools', name: 'NCES School Data', api_type: 'REST', base_url: 'https://educationdata.urban.org', website_url: 'https://nces.ed.gov', documentation_url: 'https://educationdata.urban.org/documentation/', logo_emoji: '📚', categories: ['EDUCATION'], requires_auth: false, is_free: true, reliability: 0.9, description: 'K-12 school data' },
  
  // TRANSPORTATION (6 sources)
  { id: 'nhtsa-recalls', name: 'NHTSA Recalls', api_type: 'REST', base_url: 'https://api.nhtsa.gov', website_url: 'https://www.nhtsa.gov', documentation_url: 'https://vpic.nhtsa.dot.gov/api/', logo_emoji: '🚗', categories: ['TRANSPORTATION'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Vehicle recalls' },
  { id: 'nhtsa-complaints', name: 'NHTSA Complaints', api_type: 'REST', base_url: 'https://api.nhtsa.gov', website_url: 'https://www.nhtsa.gov', documentation_url: 'https://vpic.nhtsa.dot.gov/api/', logo_emoji: '🔧', categories: ['TRANSPORTATION'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Vehicle complaints' },
  { id: 'nhtsa-safety', name: 'NHTSA Safety Ratings', api_type: 'REST', base_url: 'https://api.nhtsa.gov', website_url: 'https://www.nhtsa.gov', documentation_url: 'https://vpic.nhtsa.dot.gov/api/', logo_emoji: '⭐', categories: ['TRANSPORTATION'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Vehicle safety ratings' },
  { id: 'faa-airports', name: 'FAA Airports', api_type: 'REST', base_url: 'https://services.arcgis.com', website_url: 'https://www.faa.gov', documentation_url: 'https://www.faa.gov/data_research', logo_emoji: '✈️', categories: ['TRANSPORTATION'], requires_auth: false, is_free: true, reliability: 0.95, description: 'Airport data' },
  { id: 'fmcsa-carriers', name: 'FMCSA Carriers', api_type: 'REST', base_url: 'https://mobile.fmcsa.dot.gov/qc/services', website_url: 'https://ai.fmcsa.dot.gov', documentation_url: 'https://mobile.fmcsa.dot.gov/developer/', logo_emoji: '🚛', categories: ['TRANSPORTATION'], requires_auth: true, is_free: true, reliability: 0.9, description: 'Motor carrier data' },
  { id: 'opensky', name: 'OpenSky Network', api_type: 'REST', base_url: 'https://opensky-network.org', website_url: 'https://opensky-network.org', documentation_url: 'https://openskynetwork.github.io/opensky-api/', logo_emoji: '🛫', categories: ['TRANSPORTATION'], requires_auth: false, is_free: true, reliability: 0.85, description: 'Live flight tracking' },
  
  // FOOD & SAFETY (2 sources)
  { id: 'usda-snap', name: 'USDA SNAP Retailers', api_type: 'REST', base_url: 'https://api.ams.usda.gov', website_url: 'https://www.fns.usda.gov/snap', documentation_url: 'https://www.ams.usda.gov/services/snap', logo_emoji: '🛒', categories: ['FOOD'], requires_auth: false, is_free: true, reliability: 0.9, description: 'SNAP retail locations' },
  { id: 'usda-organic', name: 'USDA Organic', api_type: 'REST', base_url: 'https://apps.ams.usda.gov', website_url: 'https://organic.ams.usda.gov', documentation_url: 'https://organic.ams.usda.gov/integrity/', logo_emoji: '🌱', categories: ['FOOD'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Organic certifications' },
  
  // HOUSING (2 sources)
  { id: 'hud-housing', name: 'HUD Housing', api_type: 'REST', base_url: 'https://www.hud.gov', website_url: 'https://www.hud.gov', documentation_url: 'https://www.hud.gov/program_offices/cio/webservices', logo_emoji: '🏘️', categories: ['HOUSING'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Affordable housing' },
  { id: 'zillow', name: 'Zillow Data', api_type: 'REST', base_url: 'https://www.zillow.com', website_url: 'https://www.zillow.com', documentation_url: 'https://www.zillow.com/howto/api/APIOverview.htm', logo_emoji: '🏠', categories: ['HOUSING'], requires_auth: true, is_free: false, reliability: 0.85, description: 'Real estate data' },
  
  // PATENTS & IP (2 sources)
  { id: 'patents-view', name: 'PatentsView', api_type: 'REST', base_url: 'https://api.patentsview.org', website_url: 'https://patentsview.org', documentation_url: 'https://patentsview.org/apis/api-endpoints', logo_emoji: '💡', categories: ['PATENTS'], requires_auth: false, is_free: true, reliability: 0.9, description: 'US patent data' },
  { id: 'uspto', name: 'USPTO Trademarks', api_type: 'REST', base_url: 'https://tsdrapi.uspto.gov', website_url: 'https://www.uspto.gov', documentation_url: 'https://developer.uspto.gov/', logo_emoji: '™️', categories: ['PATENTS'], requires_auth: false, is_free: true, reliability: 0.9, description: 'Trademark data' },
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
