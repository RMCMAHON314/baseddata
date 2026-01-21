// Based Data - Configuration Constants
// Centralized configuration per architecture document

import type { GenerationStep } from '@/types/dataset';

// Generation pipeline steps (from architecture doc section 5.1)
export const GENERATION_STEPS: GenerationStep[] = [
  { id: 'understand', label: 'understanding request', status: 'pending' },
  { id: 'sources', label: 'mapping data sources', status: 'pending' },
  { id: 'crawling', label: 'crawling sources', status: 'pending' },
  { id: 'processing', label: 'structuring data', status: 'pending' },
  { id: 'insights', label: 'generating insights', status: 'pending' },
];

// Sample prompts for landing page (from architecture doc section 8.1)
export const SAMPLE_PROMPTS = [
  'saas companies in austin that raised series a',
  'nba player statistics 2024 season',
  'ai startups founded by women',
  'electric vehicle sales by country',
  'remote tech jobs paying over $150k',
];

// Credit costs (from architecture doc section 7.2)
export const CREDIT_COSTS = {
  basic: 5,        // < 100 rows
  standard: 15,    // 100-1000 rows
  large: 50,       // 1000-10000 rows
  enterprise: 100, // 10000+ rows
  insights: 5,     // AI insights add-on
  freshData: 10,   // Real-time crawl add-on
  sheetsExport: 2, // Google Sheets export
};

// Credit packages (from architecture doc section 7.3)
export const CREDIT_PACKAGES = [
  { name: 'starter', credits: 100, price: 9, perCredit: 0.09 },
  { name: 'professional', credits: 500, price: 39, perCredit: 0.078 },
  { name: 'team', credits: 2000, price: 129, perCredit: 0.065 },
  { name: 'business', credits: 10000, price: 499, perCredit: 0.05 },
];

// Free signup bonus
export const SIGNUP_BONUS_CREDITS = 100;

// Auto top-off defaults (from architecture doc section 7.4)
export const AUTO_TOPOFF_DEFAULTS = {
  threshold: 10,
  amount: 100,
  enabled: false, // User must opt-in
};

// Step timing for UI simulation (in ms)
export const STEP_TIMINGS = {
  understand: 600,
  sources: 900,
  crawling: 1500,
  processing: 800,
  insights: 600,
};

// Step details for progress display
export const STEP_DETAILS: Record<string, string[]> = {
  understand: [
    'analyzing query intent and parameters...',
    'identifying entity type and filters...',
    'determining optimal data structure...',
  ],
  sources: [
    'found 4 reliable data sources',
    'identified 6 potential data sources',
    'matched 5 high-quality sources',
  ],
  crawling: [
    'collected 127 records from crunchbase, sec, news...',
    'gathering data from 47 sources...',
    'processing api responses and web data...',
  ],
  processing: [
    'cross-referencing and validating data...',
    'normalizing and deduplicating records...',
    'enriching with calculated fields...',
  ],
  insights: [
    'identifying patterns and outliers...',
    'generating statistical analysis...',
    'preparing actionable recommendations...',
  ],
};
