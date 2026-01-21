// Based Data - Core Type Definitions
// Single source of truth for all dataset-related types

export interface DataColumn {
  name: string;
  type: string; // Flexible to accept AI-generated types
  description: string;
  is_enriched: boolean;
}

export interface DataSource {
  name: string;
  type: 'api' | 'database' | 'web_scrape' | 'ai_enrichment';
  reliability: number;
}

export interface DatasetSchema {
  entity_type: string;
  columns: DataColumn[];
}

export interface KeyMetric {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
}

export interface DatasetInsights {
  summary: string;
  totalRecords: number;
  keyFindings: string[];
  topCategories: string[];
  keyMetrics: KeyMetric[];
  recommendations: string[];
  dataQualityScore: number;
}

export interface Dataset {
  id: string;
  title: string;
  description: string;
  prompt: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  row_count: number;
  credits_used: number;
  data: Record<string, any>[];
  insights: DatasetInsights;
  schema_definition: DatasetSchema;
  sources: DataSource[];
  is_public: boolean;
  created_at: string;
}

export interface DatasetResult {
  id: string;
  title: string;
  description: string;
  data: Record<string, any>[];
  insights: DatasetInsights;
  schema?: DatasetSchema;
  creditsUsed: number;
}

export interface GenerationStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'complete';
  detail?: string;
}

// Generation options from advanced settings
export interface GenerationOptions {
  dataSize: 'small' | 'standard' | 'large';
  freshness: 'cached' | 'fresh';
  includeInsights: boolean;
}

// Live stats during generation
export interface GenerationStats {
  sourcesFound: number;
  recordsProcessed: number;
  timeElapsed: number;
}

// Credit costs per architecture doc section 7.2
export interface CreditCosts {
  basic: number;      // < 100 rows: 5 credits
  standard: number;   // 100-1000 rows: 15 credits
  large: number;      // 1000-10000 rows: 50 credits
  enterprise: number; // 10000+ rows: 100+ credits
  insights: number;   // AI insights: +5 credits
  freshData: number;  // Real-time crawl: +10 credits
  sheetsExport: number; // Google Sheets: 2 credits
}
