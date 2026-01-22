// ============================================================================
// BASED DATA v7.5 - UNIFIED CONSTANTS
// Single source of truth for all platform constants
// 30+ Data Categories, Always Growing Architecture
// ============================================================================

// Re-export discovery engine constants
export * from './discovery';

// ============================================================================
// PLATFORM IDENTITY
// ============================================================================

export const BASED_DATA_VERSION = '7.5';
export const BASED_DATA_TAGLINE = 'Every Dataset. On Demand.';
export const BASED_DATA_DESCRIPTION = 'Self-evolving data platform that queries 70+ live APIs and generates new collectors on demand.';

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
  // These reflect actual built-in collectors + dynamic genesis capability
  sourceCount: 70,
  dataTap: true,
} as const;

// ============================================================================
// DATA CATEGORIES - 30+ Categories (Always Growing)
// ============================================================================

export const DATA_CATEGORIES = [
  // Core Geo & Environmental (Live)
  'GEOSPATIAL',
  'WILDLIFE',
  'WEATHER', 
  'MARINE',
  'ENVIRONMENT',
  
  // Government & Legal (Live)
  'GOVERNMENT',
  'REGULATIONS',
  'LEGAL',
  
  // Economic & Business (Live)
  'ECONOMIC',
  'DEMOGRAPHICS',
  'BUSINESS',
  'FINANCE',
  
  // Infrastructure & Transport (Live)
  'TRANSPORTATION',
  'INFRASTRUCTURE',
  'AVIATION',
  'UTILITIES',
  'TELECOMMUNICATIONS',
  
  // Energy & Resources (Live)
  'ENERGY',
  'AGRICULTURE',
  
  // Health & Safety (Building)
  'HEALTH',
  'CLINICAL',
  'CRIME',
  'EMERGENCY',
  
  // Real Estate & Permits (Building)
  'REAL_ESTATE',
  'PERMITS',
  
  // Education & Research (Live)
  'EDUCATION',
  'RESEARCH',
  
  // Recreation & Culture (Live)
  'RECREATION',
  
  // Media & Imagery (Live)
  'IMAGERY',
  'SATELLITE',
] as const;

export type DataCategory = typeof DATA_CATEGORIES[number];

// Category metadata for UI
export const CATEGORY_META: Record<string, { icon: string; status: 'live' | 'building'; description: string }> = {
  GEOSPATIAL: { icon: '🗺️', status: 'live', description: 'Maps, boundaries, coordinates' },
  WILDLIFE: { icon: '🦅', status: 'live', description: 'Species observations, migrations' },
  WEATHER: { icon: '🌤️', status: 'live', description: 'Forecasts, climate, conditions' },
  MARINE: { icon: '🌊', status: 'live', description: 'Tides, buoys, water data' },
  ENVIRONMENT: { icon: '🌱', status: 'live', description: 'EPA, air quality, water quality' },
  GOVERNMENT: { icon: '🏛️', status: 'live', description: 'Spending, contracts, agencies' },
  REGULATIONS: { icon: '📜', status: 'live', description: 'Federal Register, rules' },
  LEGAL: { icon: '⚖️', status: 'building', description: 'Patents, court records' },
  ECONOMIC: { icon: '📈', status: 'live', description: 'BLS, FRED, trade data' },
  DEMOGRAPHICS: { icon: '👥', status: 'live', description: 'Census, population, ACS' },
  BUSINESS: { icon: '💼', status: 'building', description: 'SEC EDGAR, corporations' },
  FINANCE: { icon: '💹', status: 'building', description: 'Markets, securities, FINRA' },
  TRANSPORTATION: { icon: '✈️', status: 'live', description: 'FAA, flights, traffic' },
  INFRASTRUCTURE: { icon: '🌉', status: 'building', description: 'Bridges, dams, utilities' },
  AVIATION: { icon: '🛩️', status: 'building', description: 'Airspace, NOTAMs, airports' },
  UTILITIES: { icon: '💡', status: 'building', description: 'Power, water, gas' },
  TELECOMMUNICATIONS: { icon: '📡', status: 'building', description: 'FCC, broadband, spectrum' },
  ENERGY: { icon: '⚡', status: 'live', description: 'EIA, NREL, grid data' },
  AGRICULTURE: { icon: '🌾', status: 'building', description: 'USDA, crops, farms' },
  HEALTH: { icon: '🏥', status: 'building', description: 'CDC, CMS, hospitals' },
  CLINICAL: { icon: '💊', status: 'building', description: 'Clinical trials, FDA' },
  CRIME: { icon: '🚔', status: 'building', description: 'FBI UCR, safety data' },
  EMERGENCY: { icon: '🚨', status: 'building', description: 'FEMA, disasters, shelters' },
  REAL_ESTATE: { icon: '🏠', status: 'building', description: 'Property, assessors, HUD' },
  PERMITS: { icon: '📋', status: 'building', description: 'Building, business licenses' },
  EDUCATION: { icon: '🎓', status: 'building', description: 'IPEDS, schools, colleges' },
  RESEARCH: { icon: '🔬', status: 'live', description: 'NASA, NSF, arXiv' },
  RECREATION: { icon: '🏕️', status: 'live', description: 'Parks, trails, camping' },
  IMAGERY: { icon: '📷', status: 'live', description: 'Aerial, street view' },
  SATELLITE: { icon: '🛰️', status: 'live', description: 'Landsat, Sentinel, MODIS' },
};

// ============================================================================
// SAMPLE PROMPTS
// ============================================================================

export const SAMPLE_PROMPTS = [
  { text: 'My friend hunts geese on a small island off Long Island. Give me everything for planning a hunt in December.', category: 'Outdoor' },
  { text: 'Best hiking trails in Yellowstone with current trail conditions and weather', category: 'Recreation' },
  { text: 'Federal cybersecurity contractors in Maryland with $10M+ contracts', category: 'Government' },
  { text: 'Solar potential assessment for properties in Phoenix with available incentives', category: 'Energy' },
  { text: 'Salmon fishing hotspots in Puget Sound this weekend with tide charts', category: 'Marine' },
  { text: 'Air quality and environmental hazards near schools in Los Angeles', category: 'Environment' },
  { text: 'Bridge infrastructure ratings along I-95 corridor in Connecticut', category: 'Infrastructure' },
  { text: 'Real-time flight delays and weather at JFK airport', category: 'Aviation' },
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
// CATEGORY COLORS (for UI consistency) - All 30+ categories
// ============================================================================

export const CATEGORY_COLORS: Record<string, string> = {
  // Core
  GEOSPATIAL: 'hsl(217, 91%, 60%)',
  WILDLIFE: 'hsl(142, 76%, 36%)',
  WEATHER: 'hsl(45, 93%, 47%)',
  MARINE: 'hsl(199, 89%, 48%)',
  ENVIRONMENT: 'hsl(142, 71%, 45%)',
  
  // Government
  GOVERNMENT: 'hsl(220, 70%, 50%)',
  REGULATIONS: 'hsl(262, 83%, 58%)',
  LEGAL: 'hsl(280, 60%, 50%)',
  
  // Economic
  ECONOMIC: 'hsl(25, 95%, 53%)',
  DEMOGRAPHICS: 'hsl(280, 87%, 65%)',
  BUSINESS: 'hsl(210, 60%, 45%)',
  FINANCE: 'hsl(150, 60%, 40%)',
  
  // Transport
  TRANSPORTATION: 'hsl(199, 89%, 48%)',
  INFRASTRUCTURE: 'hsl(30, 80%, 50%)',
  AVIATION: 'hsl(200, 80%, 55%)',
  UTILITIES: 'hsl(50, 80%, 50%)',
  TELECOMMUNICATIONS: 'hsl(260, 70%, 55%)',
  
  // Energy
  ENERGY: 'hsl(45, 100%, 51%)',
  AGRICULTURE: 'hsl(90, 60%, 40%)',
  
  // Health
  HEALTH: 'hsl(346, 84%, 61%)',
  CLINICAL: 'hsl(340, 75%, 55%)',
  CRIME: 'hsl(0, 70%, 50%)',
  EMERGENCY: 'hsl(0, 90%, 60%)',
  
  // Property
  REAL_ESTATE: 'hsl(30, 60%, 50%)',
  PERMITS: 'hsl(180, 50%, 45%)',
  
  // Education
  EDUCATION: 'hsl(220, 80%, 60%)',
  RESEARCH: 'hsl(280, 70%, 60%)',
  
  // Recreation
  RECREATION: 'hsl(120, 60%, 45%)',
  
  // Media
  IMAGERY: 'hsl(320, 70%, 55%)',
  SATELLITE: 'hsl(240, 60%, 55%)',
};

// ============================================================================
// ENRICHMENT STRATEGIES (category cross-references)
// ============================================================================

export const ENRICHMENT_STRATEGIES: Record<string, string[]> = {
  WILDLIFE: ['WEATHER', 'REGULATIONS', 'GEOSPATIAL', 'ENVIRONMENT'],
  WEATHER: ['GEOSPATIAL', 'SATELLITE'],
  MARINE: ['WEATHER', 'REGULATIONS', 'TRANSPORTATION', 'ENVIRONMENT'],
  GEOSPATIAL: ['WEATHER', 'DEMOGRAPHICS', 'SATELLITE'],
  GOVERNMENT: ['ECONOMIC', 'DEMOGRAPHICS', 'GEOSPATIAL', 'REGULATIONS'],
  REGULATIONS: ['GOVERNMENT', 'GEOSPATIAL', 'LEGAL'],
  ECONOMIC: ['DEMOGRAPHICS', 'GOVERNMENT', 'GEOSPATIAL', 'BUSINESS'],
  DEMOGRAPHICS: ['ECONOMIC', 'GOVERNMENT', 'EDUCATION', 'HEALTH'],
  TRANSPORTATION: ['GEOSPATIAL', 'WEATHER', 'INFRASTRUCTURE'],
  HEALTH: ['DEMOGRAPHICS', 'ECONOMIC', 'GEOSPATIAL', 'ENVIRONMENT'],
  ENERGY: ['ECONOMIC', 'REGULATIONS', 'GEOSPATIAL', 'ENVIRONMENT'],
  RECREATION: ['WEATHER', 'GEOSPATIAL', 'REGULATIONS', 'WILDLIFE'],
  RESEARCH: ['ECONOMIC', 'GOVERNMENT', 'DEMOGRAPHICS', 'EDUCATION'],
  IMAGERY: ['GEOSPATIAL', 'WEATHER', 'SATELLITE'],
  ENVIRONMENT: ['HEALTH', 'GEOSPATIAL', 'WEATHER', 'REGULATIONS'],
  LEGAL: ['GOVERNMENT', 'BUSINESS', 'REGULATIONS'],
  BUSINESS: ['ECONOMIC', 'DEMOGRAPHICS', 'GOVERNMENT', 'FINANCE'],
  FINANCE: ['ECONOMIC', 'BUSINESS', 'GOVERNMENT'],
  INFRASTRUCTURE: ['TRANSPORTATION', 'GEOSPATIAL', 'GOVERNMENT'],
  AVIATION: ['WEATHER', 'TRANSPORTATION', 'GEOSPATIAL'],
  UTILITIES: ['INFRASTRUCTURE', 'ENERGY', 'GEOSPATIAL'],
  TELECOMMUNICATIONS: ['GEOSPATIAL', 'DEMOGRAPHICS', 'INFRASTRUCTURE'],
  AGRICULTURE: ['WEATHER', 'ECONOMIC', 'GEOSPATIAL', 'ENVIRONMENT'],
  CLINICAL: ['HEALTH', 'RESEARCH', 'DEMOGRAPHICS'],
  CRIME: ['DEMOGRAPHICS', 'GEOSPATIAL', 'GOVERNMENT'],
  EMERGENCY: ['WEATHER', 'GEOSPATIAL', 'INFRASTRUCTURE'],
  REAL_ESTATE: ['DEMOGRAPHICS', 'ECONOMIC', 'GEOSPATIAL', 'PERMITS'],
  PERMITS: ['GOVERNMENT', 'REAL_ESTATE', 'BUSINESS'],
  EDUCATION: ['DEMOGRAPHICS', 'ECONOMIC', 'GOVERNMENT'],
  SATELLITE: ['GEOSPATIAL', 'WEATHER', 'ENVIRONMENT'],
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
// PIPELINE STEPS - Expanded for 30+ categories
// ============================================================================

export const PIPELINE_PHASES = ['analyzing', 'collecting', 'processing', 'insights'] as const;
export type PipelinePhase = typeof PIPELINE_PHASES[number];

export const PIPELINE_STEPS = {
  analyzing: [
    { id: 'parse', label: 'Parsing your request', icon: '📝' },
    { id: 'intent', label: 'Understanding what you need', icon: '🔍' },
    { id: 'location', label: 'Finding your location', icon: '📍' },
    { id: 'temporal', label: 'Setting time context', icon: '📅' },
    { id: 'categories', label: 'Matching data categories', icon: '🏷️' },
  ],
  collecting: [
    { id: 'core', label: 'Core data sources', icon: '🌐' },
    { id: 'wildlife', label: 'Wildlife & nature', icon: '🦅' },
    { id: 'weather', label: 'Weather & climate', icon: '🌤️' },
    { id: 'marine', label: 'Ocean & marine', icon: '🌊' },
    { id: 'environment', label: 'Environment & EPA', icon: '🌱' },
    { id: 'government', label: 'Government data', icon: '🏛️' },
    { id: 'economic', label: 'Economic indicators', icon: '📈' },
    { id: 'transport', label: 'Transportation', icon: '✈️' },
    { id: 'infrastructure', label: 'Infrastructure', icon: '🌉' },
    { id: 'energy', label: 'Energy & utilities', icon: '⚡' },
    { id: 'health', label: 'Health & safety', icon: '🏥' },
    { id: 'recreation', label: 'Recreation & parks', icon: '🏕️' },
    { id: 'research', label: 'Research & science', icon: '🔬' },
    { id: 'satellite', label: 'Satellite imagery', icon: '🛰️' },
    { id: 'dynamic', label: 'Dynamic discovery', icon: '✨' },
  ],
  processing: [
    { id: 'normalize', label: 'Standardizing formats', icon: '🔄' },
    { id: 'georef', label: 'Adding coordinates', icon: '🎯' },
    { id: 'dedup', label: 'Removing duplicates', icon: '🧹' },
    { id: 'quality', label: 'Quality scoring', icon: '⭐' },
    { id: 'enrich', label: 'Enriching data', icon: '✨' },
  ],
  insights: [
    { id: 'analyze_ai', label: 'AI analysis', icon: '🧠' },
    { id: 'insights', label: 'Finding insights', icon: '💡' },
    { id: 'finalize', label: 'Preparing results', icon: '📊' },
  ],
} as const;

// ============================================================================
// COOKING MESSAGES - Fun messages while we work
// ============================================================================

export const COOKING_MESSAGES = [
  "🍳 Cooking up your data...",
  "🔥 Firing up the data engines...",
  "⚡ Supercharging your query...",
  "🌐 Scanning the data universe...",
  "🎯 Zeroing in on your target...",
  "🧪 Mixing the perfect dataset...",
  "🚀 Launching data collectors...",
  "💫 Orchestrating 70+ APIs...",
  "🎨 Crafting your results...",
  "⭐ Polishing the final output...",
];

export const COOKING_DISCLAIMER = "This may take 30-60 seconds as we query real-time APIs across multiple categories";

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
