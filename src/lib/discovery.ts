// ============================================================================
// BASED DATA v7.0 - CONTINUOUS DISCOVERY ENGINE CONSTANTS
// The Discovery Flywheel configuration and types
// ============================================================================

import { DataCategory } from './constants';

// ============================================================================
// DISCOVERY TRIGGER TYPES
// ============================================================================

export const DISCOVERY_TRIGGERS = {
  user_query: { name: 'User Query', description: 'Triggered by user data request', icon: '👤', priority: 8 },
  gap_analysis: { name: 'Gap Analysis', description: 'AI detected missing data coverage', icon: '🔍', priority: 7 },
  crawler: { name: 'Crawler', description: 'Scheduled autonomous discovery', icon: '🕷️', priority: 5 },
  ai_suggestion: { name: 'AI Suggestion', description: 'AI recommends new data source', icon: '🤖', priority: 6 },
  manual: { name: 'Manual', description: 'Manually added by admin', icon: '✋', priority: 4 },
} as const;

export type DiscoveryTrigger = keyof typeof DISCOVERY_TRIGGERS;

// ============================================================================
// DISCOVERY STATUS FLOW
// ============================================================================

export const DISCOVERY_STATUS = {
  pending: { label: 'Pending', color: 'bg-muted', icon: '⏳' },
  validating: { label: 'Validating', color: 'bg-blue-500/20', icon: '🔄' },
  generating: { label: 'Generating', color: 'bg-purple-500/20', icon: '🧬' },
  testing: { label: 'Testing', color: 'bg-yellow-500/20', icon: '🧪' },
  approved: { label: 'Approved', color: 'bg-green-500/20', icon: '✅' },
  rejected: { label: 'Rejected', color: 'bg-red-500/20', icon: '❌' },
  failed: { label: 'Failed', color: 'bg-destructive/20', icon: '💥' },
} as const;

export type DiscoveryStatus = keyof typeof DISCOVERY_STATUS;

// ============================================================================
// GAP TYPES
// ============================================================================

export const GAP_TYPES = {
  categorical: { name: 'Categorical Gap', description: 'Missing or underrepresented data category', icon: '📊' },
  geographic: { name: 'Geographic Gap', description: 'Missing coverage for geographic region', icon: '🗺️' },
  temporal: { name: 'Temporal Gap', description: 'Missing historical or recent data', icon: '📅' },
  semantic: { name: 'Semantic Gap', description: 'Missing conceptual data relationships', icon: '🔗' },
  reliability: { name: 'Reliability Gap', description: 'Existing source has poor reliability', icon: '⚠️' },
} as const;

export type GapType = keyof typeof GAP_TYPES;

// ============================================================================
// DISCOVERY ENGINE CONFIGURATION
// ============================================================================

export const DISCOVERY_CONFIG = {
  // Queue processing
  maxQueueSize: 1000,
  batchSize: 10,
  processingIntervalMs: 60000, // 1 minute
  
  // Validation
  maxValidationAttempts: 3,
  validationTimeoutMs: 30000,
  
  // Generation (AI Collector Genesis)
  maxGenerationAttempts: 2,
  generationTimeoutMs: 45000,
  
  // Testing
  maxTestAttempts: 3,
  testTimeoutMs: 20000,
  minTestRecords: 1,
  
  // Auto-approval thresholds
  autoApproveConfidence: 0.85,
  autoApproveMinRecords: 5,
  
  // Gap analysis
  gapAnalysisIntervalMs: 3600000, // 1 hour
  categoryGapThreshold: 0.03, // 3% of total
  reliabilityGapThreshold: 0.5,
} as const;

// ============================================================================
// API KNOWLEDGE BASE (for AI Genesis)
// ============================================================================

export const API_KNOWLEDGE_BASE = {
  GOVERNMENT: [
    { name: 'Data.gov', url: 'https://catalog.data.gov/api/3', type: 'catalog' },
    { name: 'Census Bureau', url: 'https://api.census.gov', type: 'api' },
    { name: 'USASpending', url: 'https://api.usaspending.gov', type: 'api' },
    { name: 'SEC EDGAR', url: 'https://www.sec.gov/cgi-bin/browse-edgar', type: 'api' },
  ],
  WILDLIFE: [
    { name: 'eBird', url: 'https://api.ebird.org/v2', type: 'api' },
    { name: 'iNaturalist', url: 'https://api.inaturalist.org/v1', type: 'api' },
    { name: 'GBIF', url: 'https://api.gbif.org/v1', type: 'api' },
    { name: 'USFWS', url: 'https://services.arcgis.com/QVENGdaPbd4LUkLV', type: 'arcgis' },
  ],
  WEATHER: [
    { name: 'NOAA', url: 'https://api.weather.gov', type: 'api' },
    { name: 'Open-Meteo', url: 'https://api.open-meteo.com', type: 'api' },
    { name: 'OpenWeatherMap', url: 'https://api.openweathermap.org', type: 'api' },
  ],
  MARINE: [
    { name: 'NOAA Tides', url: 'https://api.tidesandcurrents.noaa.gov', type: 'api' },
    { name: 'USGS Water', url: 'https://waterservices.usgs.gov', type: 'api' },
  ],
  GEOSPATIAL: [
    { name: 'OpenStreetMap', url: 'https://overpass-api.de/api', type: 'api' },
    { name: 'Nominatim', url: 'https://nominatim.openstreetmap.org', type: 'api' },
    { name: 'USGS', url: 'https://earthquake.usgs.gov/fdsnws', type: 'api' },
    { name: 'NASA', url: 'https://api.nasa.gov', type: 'api' },
  ],
  ECONOMIC: [
    { name: 'FRED', url: 'https://api.stlouisfed.org/fred', type: 'api' },
    { name: 'BLS', url: 'https://api.bls.gov/publicAPI/v2', type: 'api' },
    { name: 'World Bank', url: 'https://api.worldbank.org/v2', type: 'api' },
  ],
  HEALTH: [
    { name: 'ClinicalTrials', url: 'https://clinicaltrials.gov/api', type: 'api' },
    { name: 'OpenFDA', url: 'https://api.fda.gov', type: 'api' },
    { name: 'NIH Reporter', url: 'https://api.reporter.nih.gov', type: 'api' },
  ],
  TRANSPORTATION: [
    { name: 'OpenSky', url: 'https://opensky-network.org/api', type: 'api' },
    { name: 'GTFS', url: 'https://gtfs.org', type: 'spec' },
  ],
  RECREATION: [
    { name: 'NPS', url: 'https://developer.nps.gov/api/v1', type: 'api' },
    { name: 'RIDB', url: 'https://ridb.recreation.gov/api/v1', type: 'api' },
  ],
} as const;

// ============================================================================
// DISCOVERY TYPES
// ============================================================================

export interface SourceDiscovery {
  id: string;
  trigger_type: DiscoveryTrigger;
  trigger_id?: string;
  trigger_prompt?: string;
  target_api_url?: string;
  target_api_name: string;
  target_description?: string;
  target_documentation_url?: string;
  inferred_categories: string[];
  inferred_keywords: string[];
  confidence_score: number;
  priority: number;
  estimated_value_score: number;
  status: DiscoveryStatus;
  validation_result: Record<string, unknown>;
  generated_collector_id?: string;
  generation_attempts: number;
  last_generation_at?: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
  error_message?: string;
  error_count: number;
}

export interface GapAnalysisResult {
  id: string;
  gap_type: GapType;
  gap_description: string;
  severity: number;
  query_frequency: number;
  target_category?: string;
  target_region?: string;
  target_keywords: string[];
  status: 'open' | 'in_progress' | 'resolved' | 'wont_fix';
  resolution_discovery_id?: string;
  identified_at: string;
  resolved_at?: string;
  sample_queries: unknown[];
  created_at: string;
  updated_at: string;
}

export interface DiscoveryMetrics {
  id: string;
  date: string;
  discoveries_queued: number;
  discoveries_validated: number;
  collectors_generated: number;
  collectors_approved: number;
  collectors_failed: number;
  avg_confidence_score: number;
  avg_generation_time_ms: number;
  new_sources_added: number;
  records_from_new_sources: number;
  gaps_identified: number;
  gaps_filled: number;
  created_at: string;
}

// ============================================================================
// DISCOVERY PIPELINE PHASES
// ============================================================================

export const DISCOVERY_PIPELINE = {
  phases: [
    { id: 'queue', label: 'Queued', description: 'Waiting for processing' },
    { id: 'validate', label: 'Validate', description: 'Checking API accessibility' },
    { id: 'analyze', label: 'Analyze', description: 'AI analyzing API structure' },
    { id: 'generate', label: 'Generate', description: 'Creating collector code' },
    { id: 'test', label: 'Test', description: 'Testing data collection' },
    { id: 'approve', label: 'Approve', description: 'Final review and activation' },
  ],
  
  statusToPhase: {
    pending: 'queue',
    validating: 'validate',
    generating: 'generate',
    testing: 'test',
    approved: 'approve',
    rejected: 'approve',
    failed: 'approve',
  } as Record<DiscoveryStatus, string>,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getDiscoveryPriority(trigger: DiscoveryTrigger, confidence: number): number {
  const basePriority = DISCOVERY_TRIGGERS[trigger].priority;
  const confidenceBoost = Math.floor(confidence * 2);
  return Math.min(10, basePriority + confidenceBoost);
}

export function estimateValueScore(
  queryFrequency: number,
  categoryGapSeverity: number,
  apiReliabilityHint: number
): number {
  // Weighted average: query frequency (40%) + gap severity (40%) + reliability (20%)
  return (
    Math.min(1, queryFrequency / 100) * 0.4 +
    categoryGapSeverity * 0.4 +
    apiReliabilityHint * 0.2
  );
}

export function shouldAutoApprove(
  confidence: number,
  testRecordCount: number,
  errorCount: number
): boolean {
  return (
    confidence >= DISCOVERY_CONFIG.autoApproveConfidence &&
    testRecordCount >= DISCOVERY_CONFIG.autoApproveMinRecords &&
    errorCount === 0
  );
}
