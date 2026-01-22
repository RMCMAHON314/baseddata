// BASED DATA v6.0 - Auto-Crawler Engine
// Autonomous data discovery that continuously expands the master dataset

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CrawlerConfig {
  id: string;
  name: string;
  crawler_type: 'pattern' | 'similarity' | 'expansion' | 'firecrawl';
  target_patterns: any[];
  similarity_config: Record<string, any>;
  firecrawl_config: Record<string, any> | null;
  target_categories: string[];
  expansion_keywords: string[];
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

// Known API directories and data catalogs to discover new sources
const DISCOVERY_SEEDS = [
  // Government data catalogs
  { url: 'https://catalog.data.gov/api/3/action/package_search', type: 'api_catalog', category: 'GOVERNMENT' },
  { url: 'https://data.census.gov/api', type: 'api', category: 'DEMOGRAPHICS' },
  
  // Scientific data
  { url: 'https://api.gbif.org/v1/dataset', type: 'api_catalog', category: 'WILDLIFE' },
  { url: 'https://api.crossref.org/works', type: 'api', category: 'RESEARCH' },
  
  // Environmental
  { url: 'https://www.epa.gov/enviro/envirofacts-data-service-api', type: 'documentation', category: 'WEATHER' },
  { url: 'https://waterservices.usgs.gov/rest/Site-Service.html', type: 'documentation', category: 'MARINE' },
];

// Pattern-based discovery: Look for APIs matching patterns in query history
async function discoverByPattern(
  supabase: any,
  crawler: CrawlerConfig,
  firecrawlApiKey?: string
): Promise<DiscoveredSource[]> {
  const discovered: DiscoveredSource[] = [];
  
  // Get high-priority query patterns that need expansion
  const { data: patterns } = await supabase
    .from('query_patterns')
    .select('*')
    .eq('should_auto_expand', true)
    .order('execution_count', { ascending: false })
    .limit(10) as { data: any[] | null };
  
  if (!patterns?.length) {
    console.log('No patterns marked for expansion');
    return discovered;
  }
  
  // For each pattern, search for relevant data sources
  for (const pattern of patterns) {
    const keywords = pattern.categories?.slice(0, 3) || [];
    
    // Search data.gov catalog
    try {
      const searchQuery = keywords.join(' ');
      const response = await fetch(
        `https://catalog.data.gov/api/3/action/package_search?q=${encodeURIComponent(searchQuery)}&rows=5`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        for (const result of data.result?.results || []) {
          // Check if it has an API endpoint
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
              inferred_keywords: result.tags?.map((t: any) => t.name) || [],
              data_type: apiResource ? 'api' : result.resources?.[0]?.format?.toLowerCase() || 'dataset',
              quality_score: 0.6,
            });
          }
        }
      }
    } catch (e) {
      console.error('Data.gov search failed:', e);
    }
  }
  
  return discovered;
}

// Similarity-based discovery: Find sources similar to high-performing ones
async function discoverBySimilarity(
  supabase: any,
  crawler: CrawlerConfig
): Promise<DiscoveredSource[]> {
  const discovered: DiscoveredSource[] = [];
  
  // Get top performing sources
  const { data: topSources } = await supabase
    .from('source_performance')
    .select('*')
    .gte('reliability_score', 0.8)
    .order('total_records_collected', { ascending: false })
    .limit(20) as { data: any[] | null };
  
  if (!topSources?.length) return discovered;
  
  // Extract patterns from successful sources
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
  
  // Search for similar domains/APIs
  for (const pattern of successfulPatterns.slice(0, 5)) {
    try {
      // Search data.gov for similar domains
      const response = await fetch(
        `https://catalog.data.gov/api/3/action/package_search?q=organization:${pattern.domain}&rows=3`
      );
      
      if (response.ok) {
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
      }
    } catch (e) {
      console.error('Similarity search failed:', e);
    }
  }
  
  return discovered;
}

// Expansion discovery: Fill gaps in geographic/temporal/categorical coverage
async function discoverByExpansion(
  supabase: any,
  crawler: CrawlerConfig
): Promise<DiscoveredSource[]> {
  const discovered: DiscoveredSource[] = [];
  
  // Get current category distribution
  const { data: stats } = await supabase
    .from('master_dataset_stats')
    .select('records_by_category')
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single() as { data: any | null };
  
  if (!stats?.records_by_category) return discovered;
  
  const categoryCount = stats.records_by_category as Record<string, number>;
  const totalRecords = Object.values(categoryCount).reduce((a, b) => a + b, 0);
  
  // Find underrepresented categories
  const targetCategories = Object.entries(categoryCount)
    .filter(([_, count]) => count < totalRecords * 0.05) // Less than 5% of total
    .map(([cat]) => cat);
  
  // Also check for completely missing categories
  const allCategories = ['WILDLIFE', 'WEATHER', 'MARINE', 'GOVERNMENT', 'ECONOMIC', 'HEALTH', 'ENERGY', 'RECREATION', 'GEOSPATIAL', 'TRANSPORTATION'];
  const missingCategories = allCategories.filter(c => !categoryCount[c] || categoryCount[c] === 0);
  
  const categoriesToExpand = [...new Set([...targetCategories, ...missingCategories])];
  
  // Search for sources in underrepresented categories
  for (const category of categoriesToExpand.slice(0, 3)) {
    try {
      const response = await fetch(
        `https://catalog.data.gov/api/3/action/package_search?q=${category.toLowerCase()}&rows=5`
      );
      
      if (response.ok) {
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
              inferred_keywords: result.tags?.map((t: any) => t.name) || [],
              data_type: resource.format?.toLowerCase() || 'dataset',
              quality_score: 0.5,
            });
          }
        }
      }
    } catch (e) {
      console.error(`Expansion search for ${category} failed:`, e);
    }
  }
  
  return discovered;
}

// Firecrawl-powered discovery: Crawl documentation sites and data catalogs
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
  
  for (const targetUrl of urls || []) {
    try {
      let endpoint = '';
      let body: Record<string, any> = {};
      
      switch (mode) {
        case 'scrape':
          endpoint = 'https://api.firecrawl.dev/v1/scrape';
          body = {
            url: targetUrl,
            formats: ['markdown', 'links'],
            onlyMainContent: true,
            ...options,
          };
          break;
          
        case 'map':
          endpoint = 'https://api.firecrawl.dev/v1/map';
          body = {
            url: targetUrl,
            search: crawler.expansion_keywords?.join(' ') || 'api data',
            limit: 100,
            ...options,
          };
          break;
          
        case 'crawl':
          endpoint = 'https://api.firecrawl.dev/v1/crawl';
          body = {
            url: targetUrl,
            limit: 50,
            scrapeOptions: { formats: ['markdown', 'links'] },
            ...options,
          };
          break;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Extract potential API links from results
        const links: string[] = mode === 'map' 
          ? (data.links || [])
          : (data.data?.links || data.links || []);
        
        // Filter for API-like URLs
        const apiLinks = links.filter((link: string) => 
          link.includes('/api') || 
          link.includes('/v1') || 
          link.includes('/v2') ||
          link.includes('developer') ||
          link.includes('docs')
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
      console.error(`Firecrawl discovery failed for ${targetUrl}:`, e);
    }
  }
  
  return discovered;
}

// Main crawler execution
async function runCrawler(
  supabase: any,
  crawler: CrawlerConfig,
  firecrawlApiKey?: string
): Promise<{
  sources: DiscoveredSource[];
  recordsCollected: number;
  newCollectors: number;
}> {
  let allDiscovered: DiscoveredSource[] = [];
  
  switch (crawler.crawler_type) {
    case 'pattern':
      allDiscovered = await discoverByPattern(supabase, crawler, firecrawlApiKey);
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
  
  // Deduplicate against existing discovered sources
  const { data: existingUrls } = await supabase
    .from('discovered_sources')
    .select('url') as { data: any[] | null };
  
  const existingUrlSet = new Set((existingUrls || []).map((e: any) => e.url));
  const newSources = allDiscovered.filter(s => !existingUrlSet.has(s.url));
  
  // Store new discovered sources
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
  
  return {
    sources: newSources,
    recordsCollected: 0, // Will be updated when we actually collect from sources
    newCollectors: 0,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { crawler_id, run_all } = await req.json().catch(() => ({}));
    
    // Get crawlers to run
    let crawlers: CrawlerConfig[] = [];
    
    if (crawler_id) {
      // Run specific crawler
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
      // Run all due crawlers
      const { data } = await supabase
        .from('auto_crawlers')
        .select('*')
        .eq('is_active', true)
        .or(`next_run_at.is.null,next_run_at.lte.${new Date().toISOString()}`);
      
      crawlers = (data || []) as CrawlerConfig[];
    } else {
      // Get next due crawler
      const { data } = await supabase
        .from('auto_crawlers')
        .select('*')
        .eq('is_active', true)
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
      
      // Create run record
      const { data: runData } = await supabase
        .from('crawler_runs')
        .insert({ crawler_id: crawler.id })
        .select()
        .single();
      
      try {
        // Execute crawler
        const result = await runCrawler(supabase, crawler, firecrawlApiKey);
        
        const processingTime = Date.now() - startTime;
        
        // Update run record
        await supabase
          .from('crawler_runs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            sources_discovered: result.sources.map(s => ({ name: s.name, url: s.url })),
            records_collected: result.recordsCollected,
            new_collectors_created: result.newCollectors,
            processing_time_ms: processingTime,
          })
          .eq('id', runData?.id);
        
        // Update crawler stats
        await supabase
          .from('auto_crawlers')
          .update({
            last_run_at: new Date().toISOString(),
            total_runs: (crawler as any).total_runs + 1,
            total_sources_found: (crawler as any).total_sources_found + result.sources.length,
          })
          .eq('id', crawler.id);
        
        // Calculate next run
        await supabase.rpc('calculate_crawler_next_run', { p_crawler_id: crawler.id });
        
        results.push({
          crawler_id: crawler.id,
          crawler_name: crawler.name,
          success: true,
          sources_discovered: result.sources.length,
          processing_time_ms: processingTime,
        });
      } catch (e) {
        // Update run record with error
        await supabase
          .from('crawler_runs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: e instanceof Error ? e.message : 'Unknown error',
            processing_time_ms: Date.now() - startTime,
          })
          .eq('id', runData?.id);
        
        results.push({
          crawler_id: crawler.id,
          crawler_name: crawler.name,
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        });
      }
    }
    
    // Record master dataset stats after crawling
    await supabase.rpc('record_master_dataset_stats');
    
    return new Response(JSON.stringify({
      success: true,
      crawlers_run: crawlers.length,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Auto-crawler error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
