// ============================================================================
// BASED DATA v7.0 - CRAWLER & AUTOMATION TYPES
// Types for the self-evolving data discovery system
// ============================================================================

// Re-export core types
export * from './omniscient';

// Re-export constants
export { 
  BASED_DATA_VERSION, 
  BASED_DATA_TAGLINE, 
  BASED_DATA_DESCRIPTION,
  CRAWLER_TYPES, 
  CRAWLER_SCHEDULES,
  USER_TIERS,
} from '@/lib/constants';

export type { UserTier } from '@/lib/constants';

// ============================================================================
// AUTO-CRAWLER TYPES
// ============================================================================

export interface AutoCrawler {
  id: string;
  name: string;
  description?: string | null;
  crawler_type: 'pattern' | 'similarity' | 'expansion' | 'firecrawl';
  target_patterns: unknown[];
  target_categories: string[];
  expansion_keywords: string[];
  similarity_config?: Record<string, unknown>;
  firecrawl_config?: FirecrawlConfig;
  schedule_cron: string;
  is_active: boolean;
  last_run_at?: string | null;
  next_run_at?: string | null;
  total_runs: number;
  total_sources_found: number;
  total_records_discovered: number;
  success_rate: number | null;
  created_at: string;
  updated_at: string;
}

export interface FirecrawlConfig {
  mode: 'scrape' | 'crawl' | 'map';
  url?: string;
  urls?: string[];
  limit?: number;
  include_patterns?: string[];
  exclude_patterns?: string[];
  extract_schema?: Record<string, unknown>;
  options?: {
    maxDepth?: number;
    search?: string;
    formats?: string[];
  };
}

export interface CrawlerRun {
  id: string;
  crawler_id: string;
  status: 'running' | 'complete' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  sources_discovered: DiscoveredSource[] | Array<{ name: string; url: string }>;
  records_collected: number;
  new_collectors_created: number;
  processing_time_ms?: number;
  discovery_log: unknown[];
  urls_discovered: string[];
  error_message?: string;
}

export interface DiscoveredSource {
  id: string;
  name: string;
  url: string;
  description?: string;
  data_type?: string | 'api' | 'dataset' | 'webpage' | 'pdf' | 'csv';
  inferred_categories: string[];
  inferred_keywords: string[];
  quality_score: number;
  discovered_by_crawler_id?: string;
  review_status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
  reviewed_at?: string;
  collector_generated: boolean;
  api_endpoint?: string;
  documentation_url?: string;
  auto_collector_id?: string;
  is_active: boolean;
  last_validated_at?: string;
  discovered_at: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// EXPANSION RULES
// ============================================================================

export interface ExpansionRule {
  id: string;
  name: string;
  description?: string;
  rule_type: 'geographic' | 'temporal' | 'categorical' | 'quality' | 'category_gap' | 'geographic_gap' | 'temporal_gap' | 'quality_improvement';
  trigger_condition: {
    min_records?: number;
    max_records?: number;
    categories?: string[];
    regions?: string[];
    time_range?: { start: string; end: string };
  };
  expansion_strategy: {
    type?: 'add_sources' | 'expand_bbox' | 'add_categories' | 'increase_depth';
    params?: Record<string, unknown>;
  };
  target_categories?: string[];
  target_regions?: string[];
  is_active: boolean;
  priority: number;
  max_records_per_run: number;
  times_triggered: number;
  last_triggered_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// MASTER DATASET STATS
// ============================================================================

export interface MasterDatasetStats {
  id: string;
  total_records: number;
  total_sources: number;
  total_categories: number;
  records_by_category: Record<string, number>;
  records_by_source: Record<string, number>;
  avg_quality_score: number;
  records_with_high_quality: number;
  geographic_coverage: Record<string, unknown>;
  bounding_box?: number[] | [number, number, number, number];
  oldest_record_at?: string;
  newest_record_at?: string;
  records_added_today: number;
  records_added_this_week: number;
  records_added_this_month: number;
  recorded_at: string;
}
