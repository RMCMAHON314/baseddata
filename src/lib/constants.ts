// BASED DATA v6.0 - Central Constants
// Single source of truth for all platform constants

// ============================================================================
// PLATFORM IDENTITY
// ============================================================================

export const BASED_DATA_VERSION = '6.0';
export const BASED_DATA_TAGLINE = 'Every Dataset. On Demand.';
export const BASED_DATA_DESCRIPTION = 'Self-evolving data platform that generates unlimited datasets on demand. Describe what you need, get unified georeferenced data in seconds.';

// Legacy alias
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
  ],
  sourceCount: 70,
  dataTap: true,
};

// ============================================================================
// SAMPLE PROMPTS
// ============================================================================

export const SAMPLE_PROMPTS = [
  { text: 'My friend hunts geese on a small island off Long Island. Give me everything for planning a hunt in December.', category: 'Outdoor' },
  { text: 'Best hiking trails in Yellowstone with current trail conditions and weather', category: 'Recreation' },
  { text: 'Federal cybersecurity contractors in Maryland with $10M+ contracts', category: 'Government' },
  { text: 'Solar potential assessment for properties in Phoenix with available incentives', category: 'Energy' },
  { text: 'Salmon fishing hotspots in Puget Sound this weekend with tide charts', category: 'Fishing' },
];

// ============================================================================
// CREDIT COSTS
// ============================================================================

export const CREDIT_COSTS = {
  simple: 5,           // 1-3 sources
  medium: 15,          // 4-7 sources
  complex: 30,         // 8+ sources
  dynamic_genesis: 10, // When AI generates new collectors
  enrichment: 5,       // Cross-source fusion
  satellite: 10,       // Additional for imagery
  pdf_report: 5,       // PDF generation
  historical: 10,      // Historical data (>1 year)
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
// ENRICHMENT STRATEGIES (by category)
// ============================================================================

export const ENRICHMENT_STRATEGIES: Record<string, string[]> = {
  WILDLIFE: ['WEATHER', 'REGULATIONS', 'GEOSPATIAL'],
  WEATHER: ['GEOSPATIAL'],
  GOVERNMENT: ['ECONOMIC', 'DEMOGRAPHICS', 'GEOSPATIAL'],
  MARINE: ['WEATHER', 'REGULATIONS', 'TRANSPORTATION'],
  TRANSPORTATION: ['GEOSPATIAL', 'WEATHER'],
  ECONOMIC: ['DEMOGRAPHICS', 'GOVERNMENT', 'GEOSPATIAL'],
  DEMOGRAPHICS: ['ECONOMIC', 'GOVERNMENT'],
  REGULATIONS: ['GOVERNMENT', 'GEOSPATIAL'],
  GEOSPATIAL: ['WEATHER', 'DEMOGRAPHICS'],
  ENERGY: ['ECONOMIC', 'REGULATIONS', 'GEOSPATIAL'],
  HEALTH: ['DEMOGRAPHICS', 'ECONOMIC', 'GEOSPATIAL'],
  RECREATION: ['WEATHER', 'GEOSPATIAL', 'REGULATIONS'],
  RESEARCH: ['ECONOMIC', 'GOVERNMENT', 'DEMOGRAPHICS'],
  IMAGERY: ['GEOSPATIAL', 'WEATHER'],
};

// ============================================================================
// RELATIONSHIP PREDICATES (for knowledge graph)
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
