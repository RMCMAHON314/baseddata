// Based Data - Configuration Constants
// Centralized configuration per architecture document

import type { GenerationStep } from '@/types/dataset';

// Generation pipeline steps (from architecture doc section 5.1)
export const GENERATION_STEPS: GenerationStep[] = [
  { id: 'understand', label: 'analyzing your request', status: 'pending' },
  { id: 'sources', label: 'mapping data sources', status: 'pending' },
  { id: 'crawling', label: 'crawling the web', status: 'pending' },
  { id: 'processing', label: 'processing & cleaning', status: 'pending' },
  { id: 'insights', label: 'generating insights', status: 'pending' },
];

// Sample prompts for landing page (from architecture doc section 8.1)
export const SAMPLE_PROMPTS = [
  { text: 'SaaS companies in Austin that raised Series A in 2024', category: 'Companies' },
  { text: 'NBA player statistics and salaries 2024 season', category: 'Sports' },
  { text: 'AI startups founded by women with $5M+ funding', category: 'Startups' },
  { text: 'Electric vehicle sales by country and manufacturer', category: 'Market Data' },
  { text: 'Remote software engineering jobs paying $150k+', category: 'Jobs' },
  { text: 'Podcast rankings and listener demographics', category: 'Media' },
];

// Dataset size options
export const DATA_SIZE_OPTIONS = [
  { id: 'small', label: 'Small', sub: '< 100 rows', cost: 5 },
  { id: 'standard', label: 'Standard', sub: '< 1K rows', cost: 15 },
  { id: 'large', label: 'Large', sub: '< 10K rows', cost: 50 },
] as const;

// Data freshness options
export const FRESHNESS_OPTIONS = [
  { id: 'cached', label: 'Cached', sub: 'Instant', extraCost: 0 },
  { id: 'fresh', label: 'Fresh', sub: '+10 credits', extraCost: 10 },
] as const;

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
    'understanding intent & schema...',
    'analyzing query parameters...',
    'identifying entity type...',
  ],
  sources: [
    'found 47 relevant sources',
    'identified 32 high-quality sources',
    'matched 28 reliable sources',
  ],
  crawling: [
    'extracting structured data...',
    'gathering from APIs and web...',
    'processing live data feeds...',
  ],
  processing: [
    'deduplicating 2,341 records...',
    'normalizing and validating...',
    'enriching with AI fields...',
  ],
  insights: [
    'AI analysis complete',
    'patterns identified',
    'recommendations ready',
  ],
};
