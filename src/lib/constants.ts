// OMNISCIENT v1.1 - Configuration Constants
// Unified configuration for the data tap platform

// Sample prompts for landing page
export const SAMPLE_PROMPTS = [
  { text: 'My friend hunts geese on a small island off Long Island. Give me everything for planning a hunt in December.', category: 'Outdoor' },
  { text: 'Best hiking trails in Yellowstone with current trail conditions and weather', category: 'Recreation' },
  { text: 'Federal cybersecurity contractors in Maryland with $10M+ contracts', category: 'Government' },
  { text: 'Solar potential assessment for properties in Phoenix with available incentives', category: 'Energy' },
  { text: 'Salmon fishing hotspots in Puget Sound this weekend with tide charts', category: 'Fishing' },
];

// Credit costs for OMNISCIENT queries
export const CREDIT_COSTS = {
  simple: 5,      // 1-3 sources
  medium: 15,     // 4-7 sources
  complex: 30,    // 8+ sources
  satellite: 10,  // Additional for imagery
  pdf_report: 5,  // PDF generation
  historical: 10, // Historical data (>1 year)
};

// Free signup bonus
export const SIGNUP_BONUS_CREDITS = 100;

// Engine metadata
export const ENGINE_INFO = {
  version: 'OMNISCIENT v1.1',
  description: 'Universal Data Tap - Every query grows the dataset',
  capabilities: [
    'Intent Analysis',
    'Parallel Collection',
    'GeoJSON Normalization',
    'Insight Generation',
    'Record Persistence',
    'Source Intelligence',
    'Location Caching',
    'Query Learning',
  ],
  sourceCount: 20,
  dataTap: true,
};
