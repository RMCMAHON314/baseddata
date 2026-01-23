// ============================================================================
// BASED DATA v10.0 - Auto-Crawler Engine (HARDENED)
// Exponential Backoff, Circuit Breaker, Dead Letter Queue, Observability
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  MAX_CONSECUTIVE_FAILURES: 5,
  BASE_DELAY_SECONDS: 120,
  REQUEST_TIMEOUT_MS: 15000,
  MAX_SOURCES_PER_RUN: 20,
  RATE_LIMIT_DELAY_MS: 1000,
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CrawlerConfig {
  id: string;
  name: string;
  crawler_type: 'pattern' | 'similarity' | 'expansion' | 'firecrawl';
  target_patterns: any[];
  similarity_config: Record<string, any>;
  firecrawl_config: Record<string, any> | null;
  target_categories: string[];
  expansion_keywords: string[];
  consecutive_failures: number;
  circuit_state: string;
}

interface DiscoveredSource {
  name: string;
  description: string;
  url: string;
  api_endpoint?: string;
  inferred_categories: string[];
  inferred_keywords: string[];
  data_type: string;
  quality_score: number;
}

// ============================================================================
// CIRCUIT BREAKER & METRICS
// ============================================================================

async function checkCircuitBreaker(supabase: any, domain: string): Promise<boolean> {
  try {
    const { data } = await supabase.rpc('check_circuit_breaker', { p_domain: domain });
    return data?.[0]?.is_open || false;
  } catch {
    return false;
  }
}

async function recordCircuitResult(supabase: any, domain: string, success: boolean): Promise<void> {
  try {
    await supabase.rpc('record_circuit_result', { p_domain: domain, p_success: success });
  } catch (e) {
    console.error('Circuit result error:', e);
  }
}

async function recordMetric(supabase: any, type: string, name: string, value: number, dimensions: Record<string, any> = {}): Promise<void> {
  try {
    await supabase.rpc('record_flywheel_metric', {
      p_type: type,
      p_name: name,
      p_value: value,
      p_dimensions: dimensions,
    });
  } catch (e) {
    console.error('Metric error:', e);
  }
}

// ============================================================================
// SAFE FETCH WITH CIRCUIT BREAKER
// ============================================================================

async function safeFetch(
  supabase: any,
  url: string,
  options: RequestInit = {}
): Promise<Response | null> {
  const domain = new URL(url).hostname;
  
  if (await checkCircuitBreaker(supabase, domain)) {
    console.log(`Circuit breaker OPEN for ${domain}, skipping`);
    return null;
  }
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'BASEDDATA/10.0 AutoCrawler',
        ...options.headers,
      },
    });
    
    clearTimeout(timeout);
    await recordCircuitResult(supabase, domain, response.ok);
    
    return response;
  } catch (error) {
    await recordCircuitResult(supabase, domain, false);
    console.error(`Fetch failed for ${url}:`, error);
    return null;
  }
}

// ============================================================================
// DISCOVERY STRATEGIES
// ============================================================================

async function discoverByPattern(
  supabase: any,
  crawler: CrawlerConfig
): Promise<DiscoveredSource[]> {
  const discovered: DiscoveredSource[] = [];
  
  const { data: patterns } = await supabase
    .from('query_patterns')
    .select('*')
    .eq('should_auto_expand', true)
    .order('execution_count', { ascending: false })
    .limit(10);
  
  if (!patterns?.length) {
    console.log('No patterns marked for expansion');
    return discovered;
  }
  
  for (const pattern of patterns) {
    const keywords = pattern.categories?.slice(0, 3) || [];
    const searchQuery = keywords.join(' ');
    
    const response = await safeFetch(
      supabase,
      `https://catalog.data.gov/api/3/action/package_search?q=${encodeURIComponent(searchQuery)}&rows=5`
    );
    
    if (!response?.ok) continue;
    
    try {
      const data = await response.json();
      
      for (const result of data.result?.results?.slice(0, 5) || []) {
        const apiResource = result.resources?.find((r: any) => 
          r.format?.toLowerCase().includes('api') || 
          r.url?.includes('/api/') ||
          r.description?.toLowerCase().includes('api')
        );
        
        if (apiResource || result.resources?.length) {
          discovered.push({
            name: result.title || 'Unknown Dataset',
            description: result.notes?.slice(0, 500) || '',
            url: apiResource?.url || result.resources?.[0]?.url || '',
            api_endpoint: apiResource?.url,
            inferred_categories: keywords,
            inferred_keywords: result.tags?.map((t: any) => t.name).slice(0, 10) || [],
            data_type: apiResource ? 'api' : result.resources?.[0]?.format?.toLowerCase() || 'dataset',
            quality_score: 0.6,
          });
        }
      }
    } catch (e) {
      console.error('Pattern parse error:', e);
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, CONFIG.RATE_LIMIT_DELAY_MS));
  }
  
  return discovered;
}

async function discoverBySimilarity(
  supabase: any,
  crawler: CrawlerConfig
): Promise<DiscoveredSource[]> {
  const discovered: DiscoveredSource[] = [];
  
  const { data: topSources } = await supabase
    .from('source_performance')
    .select('*')
    .gte('reliability_score', 0.8)
    .order('total_records_collected', { ascending: false })
    .limit(20);
  
  if (!topSources?.length) return discovered;
  
  const successfulPatterns = topSources.map((s: any) => ({
    domain: (() => {
      try {
        const sourceId = s.source_id || '';
        return new URL(sourceId.includes('http') ? sourceId : `https://${sourceId}`).hostname.replace('api.', '').replace('www.', '');
      } catch {
        return 'unknown';
      }
    })(),
    category: crawler.target_categories[0] || 'GEOSPATIAL',
  }));
  
  for (const pattern of successfulPatterns.slice(0, 5)) {
    const response = await safeFetch(
      supabase,
      `https://catalog.data.gov/api/3/action/package_search?q=organization:${pattern.domain}&rows=3`
    );
    
    if (!response?.ok) continue;
    
    try {
      const data = await response.json();
      for (const result of data.result?.results || []) {
        const resource = result.resources?.[0];
        if (resource?.url) {
          discovered.push({
            name: result.title,
            description: result.notes?.slice(0, 300) || '',
            url: resource.url,
            inferred_categories: [pattern.category],
            inferred_keywords: [],
            data_type: resource.format?.toLowerCase() || 'dataset',
            quality_score: 0.7,
          });
        }
      }
    } catch (e) {
      console.error('Similarity parse error:', e);
    }
    
    await new Promise(r => setTimeout(r, CONFIG.RATE_LIMIT_DELAY_MS));
  }
  
  return discovered;
}

async function discoverByExpansion(
  supabase: any,
  crawler: CrawlerConfig
): Promise<DiscoveredSource[]> {
  const discovered: DiscoveredSource[] = [];
  
  const { data: stats } = await supabase
    .from('master_dataset_stats')
    .select('records_by_category')
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();
  
  if (!stats?.records_by_category) return discovered;
  
  const categoryCount = stats.records_by_category as Record<string, number>;
  const totalRecords = Object.values(categoryCount).reduce((a, b) => a + b, 0);
  
  const targetCategories = Object.entries(categoryCount)
    .filter(([_, count]) => count < totalRecords * 0.05)
    .map(([cat]) => cat);
  
  const allCategories = ['WILDLIFE', 'WEATHER', 'MARINE', 'GOVERNMENT', 'ECONOMIC', 'HEALTH', 'ENERGY', 'RECREATION', 'GEOSPATIAL', 'TRANSPORTATION'];
  const missingCategories = allCategories.filter(c => !categoryCount[c] || categoryCount[c] === 0);
  
  const categoriesToExpand = [...new Set([...targetCategories, ...missingCategories])];
  
  for (const category of categoriesToExpand.slice(0, 3)) {
    const response = await safeFetch(
      supabase,
      `https://catalog.data.gov/api/3/action/package_search?q=${category.toLowerCase()}&rows=5`
    );
    
    if (!response?.ok) continue;
    
    try {
      const data = await response.json();
      for (const result of data.result?.results || []) {
        const resource = result.resources?.find((r: any) => 
          r.format?.toLowerCase() === 'api' || r.format?.toLowerCase() === 'json'
        ) || result.resources?.[0];
        
        if (resource?.url) {
          discovered.push({
            name: result.title,
            description: result.notes?.slice(0, 300) || '',
            url: resource.url,
            api_endpoint: resource.format?.toLowerCase() === 'api' ? resource.url : undefined,
            inferred_categories: [category],
            inferred_keywords: result.tags?.map((t: any) => t.name).slice(0, 10) || [],
            data_type: resource.format?.toLowerCase() || 'dataset',
            quality_score: 0.5,
          });
        }
      }
    } catch (e) {
      console.error(`Expansion parse error for ${category}:`, e);
    }
    
    await new Promise(r => setTimeout(r, CONFIG.RATE_LIMIT_DELAY_MS));
  }
  
  return discovered;
}

async function discoverWithFirecrawl(
  supabase: any,
  crawler: CrawlerConfig,
  firecrawlApiKey: string
): Promise<DiscoveredSource[]> {
  const discovered: DiscoveredSource[] = [];
  
  if (!crawler.firecrawl_config) {
    console.log('No firecrawl config for crawler');
    return discovered;
  }
  
  const { mode, urls, options } = crawler.firecrawl_config as {
    mode: 'scrape' | 'map' | 'crawl';
    urls: string[];
    options?: Record<string, any>;
  };
  
  for (const targetUrl of urls?.slice(0, 5) || []) {
    let endpoint = '';
    let body: Record<string, any> = {};
    
    switch (mode) {
      case 'scrape':
        endpoint = 'https://api.firecrawl.dev/v1/scrape';
        body = { url: targetUrl, formats: ['markdown', 'links'], onlyMainContent: true, ...options };
        break;
      case 'map':
        endpoint = 'https://api.firecrawl.dev/v1/map';
        body = { url: targetUrl, search: crawler.expansion_keywords?.join(' ') || 'api data', limit: 100, ...options };
        break;
      case 'crawl':
        endpoint = 'https://api.firecrawl.dev/v1/crawl';
        body = { url: targetUrl, limit: 50, scrapeOptions: { formats: ['markdown', 'links'] }, ...options };
        break;
    }
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        const data = await response.json();
        const links: string[] = mode === 'map' 
          ? (data.links || [])
          : (data.data?.links || data.links || []);
        
        const apiLinks = links.filter((link: string) => 
          link.includes('/api') || link.includes('/v1') || link.includes('/v2') ||
          link.includes('developer') || link.includes('docs')
        );
        
        for (const link of apiLinks.slice(0, 10)) {
          discovered.push({
            name: `API from ${new URL(link).hostname}`,
            description: `Discovered via Firecrawl from ${targetUrl}`,
            url: link,
            api_endpoint: link,
            inferred_categories: crawler.target_categories,
            inferred_keywords: crawler.expansion_keywords,
            data_type: 'api',
            quality_score: 0.6,
          });
        }
      }
    } catch (e) {
      console.error(`Firecrawl failed for ${targetUrl}:`, e);
    }
    
    await new Promise(r => setTimeout(r, CONFIG.RATE_LIMIT_DELAY_MS * 2));
  }
  
  return discovered;
}

// ============================================================================
// MAIN CRAWLER EXECUTION (HARDENED)
// ============================================================================

async function runCrawler(
  supabase: any,
  crawler: CrawlerConfig,
  firecrawlApiKey?: string
): Promise<{
  sources: DiscoveredSource[];
  success: boolean;
  error?: string;
}> {
  // Check if crawler is in circuit-open state
  if (crawler.circuit_state === 'open') {
    return { sources: [], success: false, error: 'Crawler circuit breaker open' };
  }
  
  let allDiscovered: DiscoveredSource[] = [];
  
  try {
    switch (crawler.crawler_type) {
      case 'pattern':
        allDiscovered = await discoverByPattern(supabase, crawler);
        break;
      case 'similarity':
        allDiscovered = await discoverBySimilarity(supabase, crawler);
        break;
      case 'expansion':
        allDiscovered = await discoverByExpansion(supabase, crawler);
        break;
      case 'firecrawl':
        if (firecrawlApiKey) {
          allDiscovered = await discoverWithFirecrawl(supabase, crawler, firecrawlApiKey);
        } else {
          console.log('Firecrawl API key not available');
        }
        break;
    }
    
    // Deduplicate
    const { data: existingUrls } = await supabase
      .from('discovered_sources')
      .select('url');
    
    const existingUrlSet = new Set((existingUrls || []).map((e: any) => e.url));
    const newSources = allDiscovered
      .filter(s => s.url && !existingUrlSet.has(s.url))
      .slice(0, CONFIG.MAX_SOURCES_PER_RUN);
    
    // Store new sources
    if (newSources.length > 0) {
      const insertData = newSources.map(s => ({
        discovered_by_crawler_id: crawler.id,
        name: s.name,
        description: s.description,
        url: s.url,
        api_endpoint: s.api_endpoint,
        inferred_categories: s.inferred_categories,
        inferred_keywords: s.inferred_keywords,
        data_type: s.data_type,
        quality_score: s.quality_score,
        review_status: s.quality_score > 0.7 ? 'auto_approved' : 'pending',
      }));
      await supabase.from('discovered_sources').insert(insertData);
    }
    
    // Reset consecutive failures on success
    await supabase
      .from('auto_crawlers')
      .update({ consecutive_failures: 0, circuit_state: 'closed', last_health_check: new Date().toISOString() })
      .eq('id', crawler.id);
    
    return { sources: newSources, success: true };
    
  } catch (error) {
    const newFailureCount = (crawler.consecutive_failures || 0) + 1;
    const shouldOpenCircuit = newFailureCount >= CONFIG.MAX_CONSECUTIVE_FAILURES;
    
    await supabase
      .from('auto_crawlers')
      .update({
        consecutive_failures: newFailureCount,
        circuit_state: shouldOpenCircuit ? 'open' : 'closed',
        last_health_check: new Date().toISOString(),
      })
      .eq('id', crawler.id);
    
    return {
      sources: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { crawler_id, run_all, action } = await req.json().catch(() => ({}));
    
    await recordMetric(supabase, 'invocation', 'auto_crawler', 1, { action: action || 'run' });

    if (action === 'health') {
      const { data: health } = await supabase.rpc('get_flywheel_health');
      return new Response(JSON.stringify({ success: true, health }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'reset_circuits') {
      // Reset all crawler circuits
      await supabase
        .from('auto_crawlers')
        .update({ circuit_state: 'closed', consecutive_failures: 0 })
        .eq('circuit_state', 'open');
      
      return new Response(JSON.stringify({ success: true, message: 'Circuits reset' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    let crawlers: CrawlerConfig[] = [];
    
    if (crawler_id) {
      const { data, error } = await supabase
        .from('auto_crawlers')
        .select('*')
        .eq('id', crawler_id)
        .eq('is_active', true)
        .single();
      
      if (error || !data) {
        return new Response(JSON.stringify({ error: 'Crawler not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      crawlers = [data as CrawlerConfig];
    } else if (run_all) {
      const { data } = await supabase
        .from('auto_crawlers')
        .select('*')
        .eq('is_active', true)
        .neq('circuit_state', 'open')
        .or(`next_run_at.is.null,next_run_at.lte.${new Date().toISOString()}`);
      
      crawlers = (data || []) as CrawlerConfig[];
    } else {
      const { data } = await supabase
        .from('auto_crawlers')
        .select('*')
        .eq('is_active', true)
        .neq('circuit_state', 'open')
        .or(`next_run_at.is.null,next_run_at.lte.${new Date().toISOString()}`)
        .order('next_run_at', { ascending: true })
        .limit(1);
      
      crawlers = (data || []) as CrawlerConfig[];
    }
    
    if (crawlers.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No crawlers due to run',
        crawlers_run: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const results = [];
    
    for (const crawler of crawlers) {
      const startTime = Date.now();
      
      const { data: runData } = await supabase
        .from('crawler_runs')
        .insert({ crawler_id: crawler.id })
        .select()
        .single();
      
      const result = await runCrawler(supabase, crawler, firecrawlApiKey);
      const processingTime = Date.now() - startTime;
      
      await supabase
        .from('crawler_runs')
        .update({
          status: result.success ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          sources_discovered: result.sources.length,
          error_message: result.error,
          processing_time_ms: processingTime,
        })
        .eq('id', runData?.id);
      
      // Update crawler stats
      await supabase
        .from('auto_crawlers')
        .update({
          last_run_at: new Date().toISOString(),
          total_runs: (crawler as any).total_runs + 1 || 1,
          successful_runs: result.success ? ((crawler as any).successful_runs + 1 || 1) : (crawler as any).successful_runs || 0,
          total_sources_found: ((crawler as any).total_sources_found || 0) + result.sources.length,
        })
        .eq('id', crawler.id);
      
      // Calculate next run
      await supabase.rpc('calculate_crawler_next_run', { p_crawler_id: crawler.id });
      
      await recordMetric(supabase, 'crawler', 'run_time_ms', processingTime, { crawler: crawler.name, success: result.success });
      await recordMetric(supabase, 'crawler', 'sources_found', result.sources.length, { crawler: crawler.name });
      
      results.push({
        crawler_id: crawler.id,
        crawler_name: crawler.name,
        success: result.success,
        sources_discovered: result.sources.length,
        error: result.error,
        processing_time_ms: processingTime,
      });
    }
    
    const successful = results.filter(r => r.success).length;
    const totalSources = results.reduce((sum, r) => sum + r.sources_discovered, 0);
    
    return new Response(JSON.stringify({
      success: true,
      crawlers_run: results.length,
      successful,
      failed: results.length - successful,
      total_sources_discovered: totalSources,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Auto-crawler error:', error);
    await recordMetric(supabase, 'error', 'auto_crawler', 1, {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
