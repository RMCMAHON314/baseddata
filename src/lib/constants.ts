// OMNISCIENT - Configuration Constants
// Unified configuration for the entire platform

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

// Credit packages
export const CREDIT_PACKAGES = [
  { name: 'starter', credits: 100, price: 9, perCredit: 0.09 },
  { name: 'professional', credits: 500, price: 39, perCredit: 0.078 },
  { name: 'team', credits: 2000, price: 129, perCredit: 0.065 },
  { name: 'business', credits: 10000, price: 499, perCredit: 0.05 },
];

// Free signup bonus
export const SIGNUP_BONUS_CREDITS = 100;

// Auto top-off defaults
export const AUTO_TOPOFF_DEFAULTS = {
  threshold: 10,
  amount: 100,
  enabled: false,
};

// Engine metadata
export const ENGINE_INFO = {
  version: 'OMNISCIENT v1.0',
  description: 'Universal On-Demand Data Pipeline',
  algorithms: ['Intent Analysis', 'Parallel Collection', 'GeoJSON Normalization', 'Insight Generation'],
  sourceCount: 20,
};
