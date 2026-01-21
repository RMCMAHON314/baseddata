// Based Data - Configuration Constants
// Centralized configuration - Ultimate Engine v3 optimized
// ZERO AI CREDITS architecture

import type { GenerationStep } from '@/types/dataset';

// Generation pipeline steps (v3 engine phases)
export const GENERATION_STEPS: GenerationStep[] = [
  { id: 'understand', label: 'analyzing with NLP engine', status: 'pending' },
  { id: 'sources', label: 'querying government APIs', status: 'pending' },
  { id: 'crawling', label: 'synthesizing data patterns', status: 'pending' },
  { id: 'processing', label: 'ML clustering & deduplication', status: 'pending' },
  { id: 'insights', label: 'statistical analysis complete', status: 'pending' },
];

// Sample prompts for landing page
export const SAMPLE_PROMPTS = [
  { text: 'Top federal contractors in cybersecurity with $10M+ contracts', category: 'Government' },
  { text: 'Series A funded AI startups in San Francisco 2024', category: 'Startups' },
  { text: 'Public tech companies with 50%+ YoY revenue growth', category: 'Public Companies' },
  { text: 'Remote software engineering jobs paying $200k+', category: 'Jobs' },
  { text: 'SaaS market size and growth projections by segment', category: 'Market Data' },
  { text: 'Defense contractors with small business certification', category: 'Government' },
];

// Dataset size options - v3 optimized pricing
export const DATA_SIZE_OPTIONS = [
  { id: 'small', label: 'Small', sub: '25 rows', cost: 3 },
  { id: 'standard', label: 'Standard', sub: '100 rows', cost: 8 },
  { id: 'large', label: 'Large', sub: '250 rows', cost: 15 },
] as const;

// Data freshness options
export const FRESHNESS_OPTIONS = [
  { id: 'cached', label: 'Cached', sub: 'Instant', extraCost: 0 },
  { id: 'fresh', label: 'Live APIs', sub: '+2 credits', extraCost: 2 },
] as const;

// Credit costs - v3 nuclear engine (60-80% cheaper than AI)
export const CREDIT_COSTS = {
  small: 3,         // 25 rows
  standard: 8,      // 100 rows  
  large: 15,        // 250 rows
  insights: 0,      // FREE with v3 statistical engine
  freshData: 2,     // Real-time API calls
  sheetsExport: 2,  // Google Sheets export
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

// Step timing for UI simulation (v3 is FAST)
export const STEP_TIMINGS = {
  understand: 400,
  sources: 600,
  crawling: 800,
  processing: 500,
  insights: 300,
};

// Step details for progress display - v3 branding
export const STEP_DETAILS: Record<string, string[]> = {
  understand: [
    'TF-IDF keyword extraction...',
    'BM25 entity classification...',
    'RAKE phrase analysis...',
  ],
  sources: [
    'querying USASpending.gov API',
    'fetching SEC EDGAR filings',
    'mapping 47+ data sources',
  ],
  crawling: [
    'synthesizing 2,341 records...',
    'applying schema templates...',
    'generating realistic patterns...',
  ],
  processing: [
    'K-Means++ clustering active',
    'Jaro-Winkler deduplication...',
    'IQR anomaly detection...',
  ],
  insights: [
    'statistical correlations found',
    'linear regression complete',
    'recommendations generated',
  ],
};

// Engine metadata
export const ENGINE_INFO = {
  version: 'v3.0-nuclear',
  aiCreditsUsed: 0,
  algorithms: ['TF-IDF', 'BM25', 'K-Means++', 'Jaro-Winkler', 'Linear Regression', 'RAKE'],
  dataSources: ['USASpending.gov', 'SEC EDGAR', 'Synthetic Templates'],
};
