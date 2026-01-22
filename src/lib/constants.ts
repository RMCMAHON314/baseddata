// ============================================================================
// BASED DATA v7.0 - UNIFIED CONSTANTS
// Single source of truth for all platform constants
// Includes: Categories, Credits, Enrichment, Pipelines, Discovery Engine
// ============================================================================

// Re-export discovery engine constants
export * from './discovery';

// ============================================================================
// PLATFORM IDENTITY
// ============================================================================

export const BASED_DATA_VERSION = '7.0';
export const BASED_DATA_TAGLINE = 'Every Dataset. On Demand.';
export const BASED_DATA_DESCRIPTION = 'Self-evolving data platform that generates unlimited datasets on demand. Describe what you need, get unified georeferenced data in seconds.';

export const ENGINE_INFO = {
  version: `BASED DATA v${BASED_DATA_VERSION}`,
  description: BASED_DATA_DESCRIPTION,
  capabilities: [
    'Intent Analysis',
    'Parallel Collection',
    'GeoJSON Normalization',
    'Insight Generation',
    'Record Persistence',
    'Source Intelligence',
    'Location Caching',
    'Query Learning',
    'Dynamic Collector Genesis',
    'Auto-Enrichment',
    'Knowledge Graph',
  ],
  sourceCount: 70,
  dataTap: true,
} as const;

// ============================================================================
// DATA CATEGORIES (single definition)
// ============================================================================

export const DATA_CATEGORIES = [
  'WILDLIFE',
  'WEATHER', 
  'MARINE',
  'GEOSPATIAL',
  'GOVERNMENT',
  'REGULATIONS',
  'ECONOMIC',
  'DEMOGRAPHICS',
  'TRANSPORTATION',
  'HEALTH',
  'ENERGY',
  'RECREATION',
  'RESEARCH',
  'IMAGERY',
] as const;

export type DataCategory = typeof DATA_CATEGORIES[number];

// ============================================================================
// SAMPLE PROMPTS
// ============================================================================

export const SAMPLE_PROMPTS = [
  { text: 'My friend hunts geese on a small island off Long Island. Give me everything for planning a hunt in December.', category: 'Outdoor' },
  { text: 'Best hiking trails in Yellowstone with current trail conditions and weather', category: 'Recreation' },
  { text: 'Federal cybersecurity contractors in Maryland with $10M+ contracts', category: 'Government' },
  { text: 'Solar potential assessment for properties in Phoenix with available incentives', category: 'Energy' },
  { text: 'Salmon fishing hotspots in Puget Sound this weekend with tide charts', category: 'Fishing' },
] as const;

// ============================================================================
// CREDIT COSTS (unified pricing)
// ============================================================================

export const CREDIT_COSTS = {
  simple: 5,           // 1-3 sources
  medium: 15,          // 4-7 sources
  complex: 30,         // 8+ sources
  dynamic_genesis: 10, // When AI generates new collectors
  enrichment: 5,       // Cross-source fusion
  satellite: 10,       // Satellite imagery
  pdf_report: 5,       // PDF generation
  historical: 10,      // Historical data (>1 year)
  nl_query: 2,         // Natural language SQL query
} as const;

export const SIGNUP_BONUS_CREDITS = 100;

// ============================================================================
// CATEGORY COLORS (for UI consistency)
// ============================================================================

export const CATEGORY_COLORS: Record<string, string> = {
  WILDLIFE: 'hsl(var(--chart-1))',
  WEATHER: 'hsl(var(--chart-2))',
  MARINE: 'hsl(var(--chart-3))',
  GEOSPATIAL: 'hsl(var(--chart-4))',
  GOVERNMENT: 'hsl(var(--chart-5))',
  REGULATIONS: 'hsl(142, 76%, 36%)',
  ECONOMIC: 'hsl(45, 93%, 47%)',
  DEMOGRAPHICS: 'hsl(280, 87%, 65%)',
  TRANSPORTATION: 'hsl(199, 89%, 48%)',
  HEALTH: 'hsl(346, 84%, 61%)',
  ENERGY: 'hsl(25, 95%, 53%)',
  RECREATION: 'hsl(142, 71%, 45%)',
  RESEARCH: 'hsl(262, 83%, 58%)',
  IMAGERY: 'hsl(217, 91%, 60%)',
};

// ============================================================================
// ENRICHMENT STRATEGIES (category cross-references)
// ============================================================================

export const ENRICHMENT_STRATEGIES: Record<DataCategory, DataCategory[]> = {
  WILDLIFE: ['WEATHER', 'REGULATIONS', 'GEOSPATIAL'],
  WEATHER: ['GEOSPATIAL'],
  MARINE: ['WEATHER', 'REGULATIONS', 'TRANSPORTATION'],
  GEOSPATIAL: ['WEATHER', 'DEMOGRAPHICS'],
  GOVERNMENT: ['ECONOMIC', 'DEMOGRAPHICS', 'GEOSPATIAL'],
  REGULATIONS: ['GOVERNMENT', 'GEOSPATIAL'],
  ECONOMIC: ['DEMOGRAPHICS', 'GOVERNMENT', 'GEOSPATIAL'],
  DEMOGRAPHICS: ['ECONOMIC', 'GOVERNMENT'],
  TRANSPORTATION: ['GEOSPATIAL', 'WEATHER'],
  HEALTH: ['DEMOGRAPHICS', 'ECONOMIC', 'GEOSPATIAL'],
  ENERGY: ['ECONOMIC', 'REGULATIONS', 'GEOSPATIAL'],
  RECREATION: ['WEATHER', 'GEOSPATIAL', 'REGULATIONS'],
  RESEARCH: ['ECONOMIC', 'GOVERNMENT', 'DEMOGRAPHICS'],
  IMAGERY: ['GEOSPATIAL', 'WEATHER'],
};

// ============================================================================
// RELATIONSHIP PREDICATES (knowledge graph)
// ============================================================================

export const RELATIONSHIP_PREDICATES = {
  SPATIAL: ['near', 'within', 'overlaps', 'contains'] as const,
  FUNCTIONAL: ['affects', 'regulates', 'supports', 'depends_on'] as const,
  TEMPORAL: ['precedes', 'follows', 'concurrent_with'] as const,
  SEMANTIC: ['related_to', 'similar_to', 'locatedAt', 'belongsTo'] as const,
};

// ============================================================================
// CRAWLER CONFIGURATIONS
// ============================================================================

export const CRAWLER_TYPES = {
  pattern: { name: 'Pattern Discovery', description: 'Finds APIs matching patterns from your query history', icon: 'Search' },
  similarity: { name: 'Similarity Discovery', description: 'Discovers sources similar to your best-performing ones', icon: 'GitBranch' },
  expansion: { name: 'Gap Expansion', description: 'Fills gaps in categorical, geographic, or temporal coverage', icon: 'Expand' },
  firecrawl: { name: 'Deep Crawl', description: 'Uses Firecrawl to discover APIs from documentation sites', icon: 'Globe' },
} as const;

export const CRAWLER_SCHEDULES = [
  { label: 'Every hour', cron: '0 * * * *', description: 'Aggressive discovery' },
  { label: 'Every 6 hours', cron: '0 */6 * * *', description: 'Balanced (default)' },
  { label: 'Daily', cron: '0 0 * * *', description: 'Conservative' },
  { label: 'Weekly', cron: '0 0 * * 0', description: 'Minimal' },
] as const;

// ============================================================================
// QUALITY SCORE THRESHOLDS
// ============================================================================

export const QUALITY_THRESHOLDS = {
  excellent: 0.8,
  good: 0.6,
  fair: 0.4,
  poor: 0.2,
} as const;

export function getQualityLabel(score: number): { label: string; color: string; emoji: string } {
  if (score >= QUALITY_THRESHOLDS.excellent) return { label: 'Excellent', color: 'text-green-500', emoji: '⭐' };
  if (score >= QUALITY_THRESHOLDS.good) return { label: 'Good', color: 'text-blue-500', emoji: '👍' };
  if (score >= QUALITY_THRESHOLDS.fair) return { label: 'Fair', color: 'text-yellow-500', emoji: '🤔' };
  if (score >= QUALITY_THRESHOLDS.poor) return { label: 'Poor', color: 'text-orange-500', emoji: '⚠️' };
  return { label: 'Unreliable', color: 'text-red-500', emoji: '❌' };
}

// ============================================================================
// PIPELINE STEPS (unified definition for UI)
// ============================================================================

export const PIPELINE_PHASES = ['analyzing', 'collecting', 'processing', 'insights'] as const;
export type PipelinePhase = typeof PIPELINE_PHASES[number];

export const PIPELINE_STEPS = {
  analyzing: [
    { id: 'parse', label: 'Parsing natural language query', icon: '📝' },
    { id: 'intent', label: 'Extracting search intent & keywords', icon: '🔍' },
    { id: 'location', label: 'Geocoding location references', icon: '📍' },
    { id: 'temporal', label: 'Analyzing temporal context', icon: '📅' },
    { id: 'categories', label: 'Identifying data categories', icon: '🏷️' },
  ],
  collecting: [
    { id: 'wildlife', label: 'Wildlife observation APIs', icon: '🦅' },
    { id: 'weather', label: 'Weather & climate services', icon: '⛅' },
    { id: 'marine', label: 'Marine & tidal data', icon: '🌊' },
    { id: 'geo', label: 'Geospatial mapping layers', icon: '🗺️' },
    { id: 'gov', label: 'Government regulations', icon: '📋' },
    { id: 'recreation', label: 'Recreation & public lands', icon: '🏞️' },
  ],
  processing: [
    { id: 'normalize', label: 'Normalizing data schemas', icon: '🔄' },
    { id: 'georef', label: 'Georeferencing records', icon: '🎯' },
    { id: 'dedup', label: 'Deduplicating entries', icon: '🧹' },
    { id: 'quality', label: 'Scoring data quality', icon: '⭐' },
    { id: 'enrich', label: 'Enriching with metadata', icon: '✨' },
  ],
  insights: [
    { id: 'analyze_ai', label: 'AI pattern analysis', icon: '🧠' },
    { id: 'insights', label: 'Generating insights', icon: '💡' },
    { id: 'finalize', label: 'Preparing visualization', icon: '📊' },
  ],
} as const;

// ============================================================================
// INPUT TYPES (unified query sources)
// ============================================================================

export const INPUT_TYPES = ['natural_language', 'api', 'scheduled', 'nl_query'] as const;
export type InputType = typeof INPUT_TYPES[number];

// ============================================================================
// USER TIERS
// ============================================================================

export const USER_TIERS = {
  free: { name: 'Free', creditsPerMonth: 100, rateLimit: 10 },
  starter: { name: 'Starter', creditsPerMonth: 500, rateLimit: 30 },
  pro: { name: 'Pro', creditsPerMonth: 2000, rateLimit: 60 },
  team: { name: 'Team', creditsPerMonth: 10000, rateLimit: 120 },
  enterprise: { name: 'Enterprise', creditsPerMonth: -1, rateLimit: 300 },
  api: { name: 'API', creditsPerMonth: -1, rateLimit: 600 },
} as const;

export type UserTier = keyof typeof USER_TIERS;
