// ============================================================================
// 🦑 THE KRAKEN - ULTIMATE ORCHESTRATOR
// The central brain of the unstoppable data growth engine
// Coordinates Hunters, Crawlers, Linkers, Scorers, and Insight Generators
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// KRAKEN CONFIGURATION
// ============================================================================

const KRAKEN_CONFIG = {
  // Timing
  MAX_RUN_TIME_MS: 55000,
  
  // Batch sizes
  HUNTER_BATCH_SIZE: 10,
  CRAWLER_BATCH_SIZE: 25,
  RESOLVER_BATCH_SIZE: 100,
  FACT_BATCH_SIZE: 100,
  SCORER_BATCH_SIZE: 50,
  INSIGHT_BATCH_SIZE: 25,
  
  // Thresholds
  MIN_QUEUE_DEPTH_FOR_CRAWL: 1,
  MIN_UNRESOLVED_FOR_RESOLUTION: 10,
  MIN_ENTITIES_FOR_SCORING: 5,
  
  // Intervals (hours)
  GAP_ANALYSIS_INTERVAL: 4,
  TRENDING_HUNT_INTERVAL: 2,
  ENTITY_REFRESH_INTERVAL: 24,
};

// ============================================================================
// KRAKEN STATE
// ============================================================================

interface KrakenState {
  startTime: number;
  phase: string;
  metrics: KrakenMetrics;
  errors: string[];
}

interface KrakenMetrics {
  // Hunting
  discoveries_found: number;
  queries_processed: number;
  entities_hunted: number;
  
  // Crawling
  discoveries_processed: number;
  records_collected: number;
  
  // Linking
  records_resolved: number;
  entities_created: number;
  entities_merged: number;
  relationships_created: number;
  
  // Facts
  facts_extracted: number;
  facts_linked: number;
  
  // Scoring
  entities_scored: number;
  
  // Insights
  insights_generated: number;
  
  // Health
  sources_healthy: number;
  sources_degraded: number;
  queue_depth: number;
}

function createInitialState(): KrakenState {
  return {
    startTime: Date.now(),
    phase: 'awakening',
    errors: [],
    metrics: {
      discoveries_found: 0,
      queries_processed: 0,
      entities_hunted: 0,
      discoveries_processed: 0,
      records_collected: 0,
      records_resolved: 0,
      entities_created: 0,
      entities_merged: 0,
      relationships_created: 0,
      facts_extracted: 0,
      facts_linked: 0,
      entities_scored: 0,
      insights_generated: 0,
      sources_healthy: 0,
      sources_degraded: 0,
      queue_depth: 0,
    },
  };
}

function hasTimeRemaining(state: KrakenState): boolean {
  return Date.now() - state.startTime < KRAKEN_CONFIG.MAX_RUN_TIME_MS;
}

// ============================================================================
// PHASE 1: HUNTERS - Find new data targets
// ============================================================================

async function runHuntersPhase(supabase: any, state: KrakenState): Promise<void> {
  state.phase = 'hunting';
  
  try {
    // Hunt from recent queries
    const { data: recentQueries } = await supabase
      .from('nl_queries')
      .select('id')
      .eq('was_successful', true)
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .limit(KRAKEN_CONFIG.HUNTER_BATCH_SIZE);

    for (const query of recentQueries || []) {
      if (!hasTimeRemaining(state)) break;
      
      try {
        const { data } = await supabase.functions.invoke('kraken-hunters', {
          body: { trigger_type: 'query_completed', data: { query_id: query.id } }
        });
        
        state.metrics.discoveries_found += data?.discoveries || 0;
        state.metrics.queries_processed++;
      } catch (e) {
        console.error(`Hunter error for query ${query.id}:`, e);
      }
    }

    // Hunt from new entities
    const { data: newEntities } = await supabase
      .from('core_entities')
      .select('id')
      .gte('created_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
      .limit(5);

    for (const entity of newEntities || []) {
      if (!hasTimeRemaining(state)) break;
      
      try {
        const { data } = await supabase.functions.invoke('kraken-hunters', {
          body: { trigger_type: 'entity_created', data: { entity_id: entity.id } }
        });
        
        state.metrics.discoveries_found += data?.discoveries || 0;
        state.metrics.entities_hunted++;
      } catch (e) {
        console.error(`Hunter error for entity ${entity.id}:`, e);
      }
    }

    // Scheduled trending hunt
    const currentHour = new Date().getHours();
    if (currentHour % KRAKEN_CONFIG.TRENDING_HUNT_INTERVAL === 0) {
      try {
        const { data } = await supabase.functions.invoke('kraken-hunters', {
          body: { trigger_type: 'scheduled', data: {} }
        });
        
        state.metrics.discoveries_found += data?.discoveries || 0;
      } catch (e) {
        state.errors.push(`Trending hunt: ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    console.log(`🎯 [KRAKEN] Hunters found ${state.metrics.discoveries_found} targets`);
  } catch (e) {
    state.errors.push(`Hunters phase: ${e instanceof Error ? e.message : 'Unknown'}`);
  }
}

// ============================================================================
// PHASE 2: CRAWLERS - Collect data from discoveries
// ============================================================================

async function runCrawlersPhase(supabase: any, state: KrakenState): Promise<void> {
  state.phase = 'crawling';
  
  try {
    // Check queue depth
    const { count: queueDepth } = await supabase
      .from('flywheel_discovery_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    state.metrics.queue_depth = queueDepth || 0;

    if ((queueDepth || 0) >= KRAKEN_CONFIG.MIN_QUEUE_DEPTH_FOR_CRAWL) {
      const { data, error } = await supabase.functions.invoke('kraken-crawlers', {
        body: { crawler_type: 'discovery_queue' }
      });

      if (!error && data) {
        state.metrics.discoveries_processed = data.records || 0;
        state.metrics.records_collected = data.records || 0;
      }
    }

    console.log(`🔄 [KRAKEN] Crawlers collected ${state.metrics.records_collected} records`);
  } catch (e) {
    state.errors.push(`Crawlers phase: ${e instanceof Error ? e.message : 'Unknown'}`);
  }
}

// ============================================================================
// PHASE 3: LINKERS - Entity resolution
// ============================================================================

async function runLinkersPhase(supabase: any, state: KrakenState): Promise<void> {
  state.phase = 'linking';
  
  try {
    const { count: unresolvedCount } = await supabase
      .from('records')
      .select('*', { count: 'exact', head: true })
      .is('entity_id', null);

    if ((unresolvedCount || 0) >= KRAKEN_CONFIG.MIN_UNRESOLVED_FOR_RESOLUTION) {
      const { data, error } = await supabase.functions.invoke('entity-resolver', {
        body: { backfill: true, batch_size: KRAKEN_CONFIG.RESOLVER_BATCH_SIZE }
      });

      if (!error && data) {
        state.metrics.records_resolved = data.records_processed || 0;
        state.metrics.entities_created = data.entities_created || 0;
        state.metrics.entities_merged = data.entities_merged || 0;
      }
    }

    console.log(`🔗 [KRAKEN] Linkers resolved ${state.metrics.records_resolved} records`);
  } catch (e) {
    state.errors.push(`Linkers phase: ${e instanceof Error ? e.message : 'Unknown'}`);
  }
}

// ============================================================================
// PHASE 4: FACT EXTRACTORS - Build temporal memory
// ============================================================================

async function runFactExtractorsPhase(supabase: any, state: KrakenState): Promise<void> {
  state.phase = 'extracting_facts';
  
  try {
    const { data, error } = await supabase.functions.invoke('core-extract-facts', {
      body: { 
        batch_size: KRAKEN_CONFIG.FACT_BATCH_SIZE,
        link_orphans: true
      }
    });

    if (!error && data) {
      state.metrics.facts_extracted = data.facts_created || 0;
      state.metrics.facts_linked = data.orphans_linked || 0;
    }

    console.log(`📊 [KRAKEN] Extracted ${state.metrics.facts_extracted} facts`);
  } catch (e) {
    state.errors.push(`Fact extraction: ${e instanceof Error ? e.message : 'Unknown'}`);
  }
}

// ============================================================================
// PHASE 5: SCORERS - Compute entity scores
// ============================================================================

async function runScorersPhase(supabase: any, state: KrakenState): Promise<void> {
  state.phase = 'scoring';
  
  try {
    const { data: entitiesToScore } = await supabase
      .from('core_entities')
      .select('id')
      .or('health_score.is.null,updated_at.lt.' + new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(KRAKEN_CONFIG.SCORER_BATCH_SIZE);

    if (entitiesToScore && entitiesToScore.length >= KRAKEN_CONFIG.MIN_ENTITIES_FOR_SCORING) {
      const entityIds = entitiesToScore.map((e: any) => e.id);
      
      const { data, error } = await supabase.functions.invoke('core-scorer', {
        body: { entity_ids: entityIds }
      });

      if (!error && data) {
        state.metrics.entities_scored = data.scored || 0;
      }
    }

    console.log(`🎯 [KRAKEN] Scored ${state.metrics.entities_scored} entities`);
  } catch (e) {
    state.errors.push(`Scoring phase: ${e instanceof Error ? e.message : 'Unknown'}`);
  }
}

// ============================================================================
// PHASE 6: INSIGHT GENERATORS - Derive intelligence
// ============================================================================

async function runInsightGeneratorsPhase(supabase: any, state: KrakenState): Promise<void> {
  state.phase = 'generating_insights';
  
  try {
    // Get recent successful queries for insight generation
    const { data: recentQueries } = await supabase
      .from('nl_queries')
      .select('id')
      .eq('was_successful', true)
      .gte('result_count', 5)
      .order('created_at', { ascending: false })
      .limit(3);

    for (const query of recentQueries || []) {
      if (!hasTimeRemaining(state)) break;
      
      try {
        await supabase.functions.invoke('core-generate-insights', {
          body: { query_id: query.id, prompt: '', features: [] }
        });
        state.metrics.insights_generated++;
      } catch (e) {
        console.error(`Insight generation for ${query.id} failed:`, e);
      }
    }

    console.log(`💡 [KRAKEN] Generated ${state.metrics.insights_generated} insights`);
  } catch (e) {
    state.errors.push(`Insight generation: ${e instanceof Error ? e.message : 'Unknown'}`);
  }
}

// ============================================================================
// PHASE 7: HEALTH CHECK
// ============================================================================

async function runHealthCheckPhase(supabase: any, state: KrakenState): Promise<void> {
  state.phase = 'health_check';
  
  try {
    // Check source health
    const { data: healthyCount } = await supabase
      .from('flywheel_source_health')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'healthy');

    const { data: degradedCount } = await supabase
      .from('flywheel_source_health')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'healthy');

    state.metrics.sources_healthy = healthyCount || 0;
    state.metrics.sources_degraded = degradedCount || 0;

    // Update flywheel metrics
    await supabase.rpc('record_flywheel_metric', {
      p_type: 'kraken',
      p_name: 'full_cycle',
      p_value: 1,
      p_dimensions: state.metrics
    });

  } catch (e) {
    state.errors.push(`Health check: ${e instanceof Error ? e.message : 'Unknown'}`);
  }
}

// ============================================================================
// COMPUTE KRAKEN POWER LEVEL
// ============================================================================

async function computePowerLevel(supabase: any): Promise<{
  power: number;
  breakdown: Record<string, number>;
  status: string;
}> {
  const breakdown: Record<string, number> = {};
  
  try {
    // Queue processing rate (20 points)
    const { count: queueDepth } = await supabase
      .from('flywheel_discovery_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    const { count: completedToday } = await supabase
      .from('flywheel_discovery_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completed_at', new Date().toISOString().split('T')[0]);
    
    const queueHealthy = (queueDepth || 0) < 100;
    breakdown.queue_processing = queueHealthy ? 20 : Math.max(0, 20 - (queueDepth || 0) / 10);

    // Entity resolution rate (25 points)
    const { count: totalRecords } = await supabase
      .from('records')
      .select('*', { count: 'exact', head: true });
    
    const { count: resolvedRecords } = await supabase
      .from('records')
      .select('*', { count: 'exact', head: true })
      .not('entity_id', 'is', null);
    
    const resolutionRate = totalRecords ? (resolvedRecords || 0) / totalRecords : 0;
    breakdown.entity_resolution = Math.min(25, Math.round(resolutionRate * 25 / 0.6));

    // Fact density (20 points)
    const { count: totalEntities } = await supabase
      .from('core_entities')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalFacts } = await supabase
      .from('core_facts')
      .select('*', { count: 'exact', head: true });
    
    const factDensity = totalEntities ? (totalFacts || 0) / totalEntities : 0;
    breakdown.fact_density = Math.min(20, Math.round(factDensity * 20 / 0.5));

    // Source health (15 points)
    const { count: healthySources } = await supabase
      .from('flywheel_source_health')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'healthy');
    
    const { count: totalSources } = await supabase
      .from('flywheel_source_health')
      .select('*', { count: 'exact', head: true });
    
    const sourceHealth = totalSources ? (healthySources || 0) / totalSources : 1;
    breakdown.source_health = Math.round(sourceHealth * 15);

    // Insight freshness (10 points)
    const { count: recentInsights } = await supabase
      .from('core_derived_insights')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    breakdown.insight_freshness = Math.min(10, (recentInsights || 0) / 2);

    // Data growth (10 points)
    const { count: recordsToday } = await supabase
      .from('records')
      .select('*', { count: 'exact', head: true })
      .gte('collected_at', new Date().toISOString().split('T')[0]);
    
    breakdown.data_growth = Math.min(10, Math.round((recordsToday || 0) / 100 * 10));

    const power = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    
    let status = '🦑 DORMANT';
    if (power >= 90) status = '🦑 UNSTOPPABLE';
    else if (power >= 75) status = '🦑 POWERFUL';
    else if (power >= 60) status = '🦑 GROWING';
    else if (power >= 40) status = '🦑 AWAKENING';

    return { power, breakdown, status };
  } catch (e) {
    console.error('Power level calculation failed:', e);
    return { power: 0, breakdown: {}, status: '🦑 ERROR' };
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
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const state = createInitialState();

  try {
    const { action } = await req.json().catch(() => ({}));
    
    console.log(`🦑 [THE KRAKEN] Awakening... (action: ${action || 'full_cycle'})`);

    // Health/power check only
    if (action === 'health' || action === 'power') {
      const power = await computePowerLevel(supabase);
      return new Response(JSON.stringify({
        success: true,
        ...power
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Full cycle execution
    // Phase 1: Hunters
    if (hasTimeRemaining(state)) {
      await runHuntersPhase(supabase, state);
    }

    // Phase 2: Crawlers
    if (hasTimeRemaining(state)) {
      await runCrawlersPhase(supabase, state);
    }

    // Phase 3: Linkers
    if (hasTimeRemaining(state)) {
      await runLinkersPhase(supabase, state);
    }

    // Phase 4: Fact Extractors
    if (hasTimeRemaining(state)) {
      await runFactExtractorsPhase(supabase, state);
    }

    // Phase 5: Scorers
    if (hasTimeRemaining(state)) {
      await runScorersPhase(supabase, state);
    }

    // Phase 6: Insight Generators
    if (hasTimeRemaining(state)) {
      await runInsightGeneratorsPhase(supabase, state);
    }

    // Phase 7: Health Check
    await runHealthCheckPhase(supabase, state);

    // Compute power level
    const power = await computePowerLevel(supabase);

    const processingTime = Date.now() - state.startTime;
    
    console.log(`🦑 [THE KRAKEN] Cycle complete in ${processingTime}ms - Power: ${power.power}/100 ${power.status}`);

    return new Response(JSON.stringify({
      success: state.errors.length === 0,
      processing_time_ms: processingTime,
      power_level: power.power,
      power_status: power.status,
      power_breakdown: power.breakdown,
      metrics: state.metrics,
      errors: state.errors,
      phases_completed: state.phase,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🦑 [THE KRAKEN] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processing_time_ms: Date.now() - state.startTime,
      metrics: state.metrics,
      errors: [...state.errors, error instanceof Error ? error.message : 'Unknown'],
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
