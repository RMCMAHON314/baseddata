// BASED DATA v6.0 - Type Definitions
// The Self-Growing Universal Data Platform

// Re-export all omniscient types
export * from './omniscient';

// Re-export constants from central source
export { 
  BASED_DATA_VERSION, 
  BASED_DATA_TAGLINE, 
  BASED_DATA_DESCRIPTION,
  CRAWLER_TYPES,
  CRAWLER_SCHEDULES,
} from '@/lib/constants';

// Auto-Crawler Types
export interface AutoCrawler {
  id: string;
  name: string;
  description?: string | null;
  crawler_type: string;
  target_patterns: any;
  similarity_config: any;
  firecrawl_config: any;
  target_categories: string[];
  expansion_keywords: string[];
  schedule_cron: string;
  last_run_at?: string | null;
  next_run_at?: string | null;
  total_runs: number;
  total_records_discovered: number;
  total_sources_found: number;
  success_rate: number | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface FirecrawlConfig {
  mode: 'scrape' | 'map' | 'crawl';
  urls: string[];
  options?: {
    limit?: number;
    maxDepth?: number;
    search?: string;
    formats?: string[];
  };
}

export interface CrawlerRun {
  id: string;
  crawler_id: string;
  started_at: string;
  completed_at?: string;
  status: 'running' | 'completed' | 'failed';
  urls_discovered: string[];
  sources_discovered: Array<{ name: string; url: string }>;
  records_collected: number;
  new_collectors_created: number;
  processing_time_ms?: number;
  error_message?: string;
  discovery_log: any[];
}

export interface DiscoveredSource {
  id: string;
  discovered_by_crawler_id?: string;
  discovered_at: string;
  name: string;
  description?: string;
  url: string;
  api_endpoint?: string;
  documentation_url?: string;
  inferred_categories: string[];
  inferred_keywords: string[];
  data_type: 'api' | 'dataset' | 'webpage' | 'pdf' | 'csv';
  quality_score: number;
  last_validated_at?: string;
  is_active: boolean;
  auto_collector_id?: string;
  collector_generated: boolean;
  review_status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpansionRule {
  id: string;
  name: string;
  description?: string;
  rule_type: 'category_gap' | 'geographic_gap' | 'temporal_gap' | 'quality_improvement';
  trigger_condition: Record<string, any>;
  expansion_strategy: Record<string, any>;
  target_categories?: string[];
  target_regions?: string[];
  priority: number;
  max_records_per_run: number;
  is_active: boolean;
  last_triggered_at?: string;
  times_triggered: number;
  created_at: string;
  updated_at: string;
}

export interface MasterDatasetStats {
  id: string;
  recorded_at: string;
  total_records: number;
  total_sources: number;
  total_categories: number;
  records_by_category: Record<string, number>;
  records_by_source: Record<string, number>;
  avg_quality_score: number;
  records_with_high_quality: number;
  bounding_box?: [number, number, number, number];
  geographic_coverage: Record<string, number>;
  oldest_record_at?: string;
  newest_record_at?: string;
  records_added_today: number;
  records_added_this_week: number;
  records_added_this_month: number;
}

// NOTE: CRAWLER_TYPES and CRAWLER_SCHEDULES are now exported from @/lib/constants
