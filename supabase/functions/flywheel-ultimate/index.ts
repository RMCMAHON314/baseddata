// ============================================================================
// 🚀 BASED DATA v10.0 - THE ULTIMATE FLYWHEEL
// Fully Autonomous, Self-Healing, Self-Expanding Intelligence Engine
// Designed to be called every minute via pg_cron
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// ULTIMATE CONFIGURATION - MAXIMUM AGGRESSION 🔥🔥🔥
// Audit v10.0 - Optimized for rapid growth to 95/100 health
// ============================================================================

const ULTIMATE_CONFIG = {
  // Processing limits per invocation - DOUBLED for faster growth
  DISCOVERY_BATCH_SIZE: 20,
  CRAWLER_BATCH_SIZE: 8,
  ENTITY_BATCH_SIZE: 100,  // More aggressive resolution
  FACT_BATCH_SIZE: 200,    // Extract more facts per run
  INSIGHT_BATCH_SIZE: 40,
  SCORING_BATCH_SIZE: 100,
  KRAKEN_BATCH_SIZE: 15,   // New: Kraken targets per run
  
  // Timing - Optimized for 60s timeout
  MAX_RUN_TIME_MS: 52000, // 52s safety (8s buffer)
  PHASE_TIMEOUT_MS: 8000, // 8s per phase for faster cycling
  
  // Scheduling intervals - MORE FREQUENT
  GAP_ANALYSIS_INTERVAL_HOURS: 2,    // Hunt gaps every 2h
  CIRCUIT_RESET_INTERVAL_HOURS: 8,   // Faster recovery
  INSIGHT_REGEN_INTERVAL_HOURS: 3,   // Fresher insights
  SCORING_INTERVAL_HOURS: 4,         // More current scores
  KRAKEN_INTERVAL_HOURS: 1,          // Hunt every hour
  
  // Thresholds - LOWER for more action
  MIN_UNRESOLVED_FOR_BACKFILL: 5,    // Lower threshold
  MIN_ORPHAN_FACTS_FOR_LINKING: 2,
  MIN_ENTITIES_FOR_SCORING: 3,
  
  // Health score targets - AMBITIOUS
  TARGET_RESOLUTION_RATE: 0.60,   // 60% entity resolution
  TARGET_FACT_DENSITY: 0.50,      // 0.5 facts per entity
  TARGET_INSIGHT_FRESHNESS_HOURS: 12, // Fresher insights
};

// ============================================================================
// FLYWHEEL STATE TRACKING
// ============================================================================

interface FlywheelState {
  startTime: number;
  phase: string;
  metrics: FlywheelMetrics;
  errors: string[];
}

interface FlywheelMetrics {
  // Discovery
  discoveries_processed: number;
  discoveries_approved: number;
  discoveries_failed: number;
  
  // Crawling
  crawlers_run: number;
  sources_discovered: number;
  
  // Entity Resolution
  records_resolved: number;
  entities_created: number;
  entities_merged: number;
  
  // Fact Extraction
  facts_extracted: number;
  facts_linked: number;
  
  // Insights
  insights_generated: number;
  
  // Scoring
  entities_scored: number;
  
  // Recovery
  dead_letter_recovered: number;
  circuits_reset: number;
  
  // Gap Analysis
  gaps_identified: number;
  discoveries_queued: number;
}

function createInitialState(): FlywheelState {
  return {
    startTime: Date.now(),
    phase: 'initializing',
    errors: [],
    metrics: {
      discoveries_processed: 0,
      discoveries_approved: 0,
      discoveries_failed: 0,
      crawlers_run: 0,
      sources_discovered: 0,
      records_resolved: 0,
      entities_created: 0,
      entities_merged: 0,
      facts_extracted: 0,
      facts_linked: 0,
      insights_generated: 0,
      entities_scored: 0,
      dead_letter_recovered: 0,
      circuits_reset: 0,
      gaps_identified: 0,
      discoveries_queued: 0,
    },
  };
}

function hasTimeRemaining(state: FlywheelState): boolean {
  return Date.now() - state.startTime < ULTIMATE_CONFIG.MAX_RUN_TIME_MS;
}

// ============================================================================
// PHASE 1: DISCOVERY PROCESSING (Feed the Flywheel)
// ============================================================================

async function runDiscoveryPhase(supabase: any, state: FlywheelState): Promise<void> {
  state.phase = 'discovery';
  
  try {
    // Check for pending discoveries
    const { count: pendingCount } = await supabase
      .from('source_discoveries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .lt('generation_attempts', 3)
      .or(`retry_after.is.null,retry_after.lte.${new Date().toISOString()}`);
    
    if (!pendingCount || pendingCount === 0) {
      console.log('[flywheel] No pending discoveries');
      return;
    }
    
    console.log(`[flywheel] Processing ${pendingCount} pending discoveries`);
    
    const { data, error } = await supabase.functions.invoke('discovery-processor', {
      body: { action: 'process_queue', batch_size: ULTIMATE_CONFIG.DISCOVERY_BATCH_SIZE },
    });
    
    if (error) {
      state.errors.push(`Discovery: ${error.message}`);
      return;
    }
    
    state.metrics.discoveries_processed = data?.processed || 0;
    state.metrics.discoveries_approved = data?.approved || 0;
    state.metrics.discoveries_failed = data?.failed || 0;
    
    console.log(`[flywheel] Discoveries: ${data?.processed} processed, ${data?.approved} approved`);
  } catch (e) {
    state.errors.push(`Discovery phase: ${e instanceof Error ? e.message : 'Unknown'}`);
  }
}

// ============================================================================
// PHASE 2: CRAWLER EXECUTION (Expand the Dataset)
// ============================================================================

async function runCrawlerPhase(supabase: any, state: FlywheelState): Promise<void> {
  state.phase = 'crawling';
  
  try {
    // Find due crawlers
    const { data: dueCrawlers } = await supabase
      .from('auto_crawlers')
      .select('id, name')
      .eq('is_active', true)
      .neq('circuit_state', 'open')
      .or(`next_run_at.is.null,next_run_at.lte.${new Date().toISOString()}`)
      .limit(ULTIMATE_CONFIG.CRAWLER_BATCH_SIZE);
    
    if (!dueCrawlers?.length) {
      console.log('[flywheel] No crawlers due');
      return;
    }
    
    console.log(`[flywheel] Running ${dueCrawlers.length} crawlers`);
    
    const { data, error } = await supabase.functions.invoke('auto-crawler', {
      body: { run_all: false },
    });
    
    if (error) {
      state.errors.push(`Crawler: ${error.message}`);
      return;
    }
    
    state.metrics.crawlers_run = data?.crawlers_run || 0;
    state.metrics.sources_discovered = data?.total_sources_discovered || 0;
    
    console.log(`[flywheel] Crawlers: ${data?.crawlers_run} run, ${data?.total_sources_discovered} sources found`);
  } catch (e) {
    state.errors.push(`Crawler phase: ${e instanceof Error ? e.message : 'Unknown'}`);
  }
}

// ============================================================================
// PHASE 3: ENTITY RESOLUTION (Unify the Intelligence)
// ============================================================================

async function runEntityResolutionPhase(supabase: any, state: FlywheelState): Promise<void> {
  state.phase = 'entity_resolution';
  
  try {
    // Check unresolved record count
    const { count: unresolvedCount } = await supabase
      .from('records')
      .select('*', { count: 'exact', head: true })
      .is('entity_id', null);
    
    if (!unresolvedCount || unresolvedCount < ULTIMATE_CONFIG.MIN_UNRESOLVED_FOR_BACKFILL) {
      console.log(`[flywheel] Only ${unresolvedCount || 0} unresolved records, skipping backfill`);
      return;
    }
    
    console.log(`[flywheel] Resolving ${unresolvedCount} unresolved records`);
    
    const { data, error } = await supabase.functions.invoke('entity-resolver', {
      body: { backfill: true, batch_size: ULTIMATE_CONFIG.ENTITY_BATCH_SIZE },
    });
    
    if (error) {
      state.errors.push(`Entity resolution: ${error.message}`);
      return;
    }
    
    state.metrics.records_resolved = data?.records_processed || 0;
    state.metrics.entities_created = data?.entities_created || 0;
    state.metrics.entities_merged = data?.entities_merged || 0;
    
    console.log(`[flywheel] Entities: ${data?.records_processed} resolved, ${data?.entities_created} created, ${data?.entities_merged} merged`);
  } catch (e) {
    state.errors.push(`Entity resolution: ${e instanceof Error ? e.message : 'Unknown'}`);
  }
}

// ============================================================================
// PHASE 4: FACT EXTRACTION (Build Temporal Memory)
// ============================================================================

async function runFactExtractionPhase(supabase: any, state: FlywheelState): Promise<void> {
  state.phase = 'fact_extraction';
  
  try {
    // Find records with entities but no facts
    const { data: recordsNeedingFacts } = await supabase
      .from('records')
      .select('id')
      .not('entity_id', 'is', null)
      .limit(ULTIMATE_CONFIG.FACT_BATCH_SIZE);
    
    const recordIds = (recordsNeedingFacts || []).map((r: any) => r.id);
    
    if (recordIds.length === 0) {
      console.log('[flywheel] No records need fact extraction');
      return;
    }
    
    console.log(`[flywheel] Extracting facts from ${recordIds.length} records`);
    
    const { data, error } = await supabase.functions.invoke('core-extract-facts', {
      body: { 
        record_ids: recordIds,
        batch_size: ULTIMATE_CONFIG.FACT_BATCH_SIZE,
        link_orphans: true,
      },
    });
    
    if (error) {
      state.errors.push(`Fact extraction: ${error.message}`);
      return;
    }
    
    state.metrics.facts_extracted = data?.facts_created || 0;
    state.metrics.facts_linked = data?.orphans_linked || 0;
    
    console.log(`[flywheel] Facts: ${data?.facts_created} extracted, ${data?.orphans_linked} linked`);
  } catch (e) {
    state.errors.push(`Fact extraction: ${e instanceof Error ? e.message : 'Unknown'}`);
  }
}

// ============================================================================
// PHASE 5: INSIGHT GENERATION (Derive Intelligence)
// ============================================================================

async function runInsightGenerationPhase(supabase: any, state: FlywheelState): Promise<void> {
  state.phase = 'insight_generation';
  
  // Only run every N hours
  const currentHour = new Date().getHours();
  if (currentHour % ULTIMATE_CONFIG.INSIGHT_REGEN_INTERVAL_HOURS !== 0) {
    return;
  }
  
  try {
    // Get recent queries with features for insight generation
    const { data: recentQueries } = await supabase
      .from('nl_queries')
      .select('id')
      .eq('was_successful', true)
      .gte('result_count', 5)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!recentQueries?.length) {
      console.log('[flywheel] No recent queries for insight generation');
      return;
    }
    
    // Generate insights for each query (in parallel would be ideal but sequential for safety)
    for (const query of recentQueries) {
      if (!hasTimeRemaining(state)) break;
      
      try {
        await supabase.functions.invoke('core-generate-insights', {
          body: { query_id: query.id, prompt: '', features: [] },
        });
        state.metrics.insights_generated++;
      } catch (e) {
        console.error(`Insight generation for ${query.id} failed:`, e);
      }
    }
    
    console.log(`[flywheel] Insights: ${state.metrics.insights_generated} generated`);
  } catch (e) {
    state.errors.push(`Insight generation: ${e instanceof Error ? e.message : 'Unknown'}`);
  }
}

// ============================================================================
// PHASE 6: ENTITY SCORING (Rank Intelligence)
// ============================================================================

async function runScoringPhase(supabase: any, state: FlywheelState): Promise<void> {
  state.phase = 'scoring';
  
  // Only run every N hours
  const currentHour = new Date().getHours();
  if (currentHour % ULTIMATE_CONFIG.SCORING_INTERVAL_HOURS !== 0) {
    return;
  }
  
  try {
    // Find entities needing rescoring (null scores or old scores)
    const { data: entitiesToScore } = await supabase
      .from('core_entities')
      .select('id')
      .or('health_score.is.null,updated_at.lt.' + new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(ULTIMATE_CONFIG.SCORING_BATCH_SIZE);
    
    if (!entitiesToScore?.length) {
      console.log('[flywheel] No entities need scoring');
      return;
    }
    
    console.log(`[flywheel] Scoring ${entitiesToScore.length} entities`);
    
    const entityIds = entitiesToScore.map((e: any) => e.id);
    
    const { data, error } = await supabase.functions.invoke('core-scorer', {
      body: { entity_ids: entityIds },
    });
    
    if (error) {
      state.errors.push(`Scoring: ${error.message}`);
      return;
    }
    
    state.metrics.entities_scored = data?.scored || 0;
    console.log(`[flywheel] Scored ${data?.scored} entities`);
  } catch (e) {
    state.errors.push(`Scoring phase: ${e instanceof Error ? e.message : 'Unknown'}`);
  }
}

// ============================================================================
// PHASE 7: GAP ANALYSIS (Find Opportunities)
// ============================================================================

async function runGapAnalysisPhase(supabase: any, state: FlywheelState): Promise<void> {
  state.phase = 'gap_analysis';
  
  try {
    // Check when last gap analysis ran
    const { data: lastGap } = await supabase
      .from('flywheel_metrics')
      .select('recorded_at')
      .eq('metric_name', 'gap_analysis_run')
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();
    
    const lastRunTime = lastGap?.recorded_at ? new Date(lastGap.recorded_at) : new Date(0);
    const hoursSince = (Date.now() - lastRunTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursSince < ULTIMATE_CONFIG.GAP_ANALYSIS_INTERVAL_HOURS) {
      return;
    }
    
    console.log('[flywheel] Running gap analysis');
    
    const { data, error } = await supabase.functions.invoke('discovery-processor', {
      body: { action: 'analyze_gaps' },
    });
    
    if (error) {
      state.errors.push(`Gap analysis: ${error.message}`);
      return;
    }
    
    state.metrics.gaps_identified = data?.gaps_found || 0;
    state.metrics.discoveries_queued = data?.discoveries_queued || 0;
    
    // Record that we ran gap analysis
    await supabase.rpc('record_flywheel_metric', {
      p_type: 'scheduler',
      p_name: 'gap_analysis_run',
      p_value: 1,
      p_dimensions: { gaps: data?.gaps_found, queued: data?.discoveries_queued },
    });
    
    console.log(`[flywheel] Gaps: ${data?.gaps_found} found, ${data?.discoveries_queued} queued`);
  } catch (e) {
    state.errors.push(`Gap analysis: ${e instanceof Error ? e.message : 'Unknown'}`);
  }
}

// ============================================================================
// PHASE 7.5: KRAKEN HUNTERS (Autonomous Data Expansion)
// ============================================================================

async function runKrakenPhase(supabase: any, state: FlywheelState): Promise<void> {
  state.phase = 'kraken';
  
  try {
    // Check if Kraken should hunt
    const currentHour = new Date().getHours();
    if (currentHour % ULTIMATE_CONFIG.KRAKEN_INTERVAL_HOURS !== 0) {
      return;
    }
    
    console.log('[flywheel] Unleashing Kraken hunters...');
    
    const { data, error } = await supabase.functions.invoke('kraken-hunters', {
      body: { 
        trigger_type: 'flywheel_scheduled',
        batch_size: ULTIMATE_CONFIG.KRAKEN_BATCH_SIZE,
      },
    });
    
    if (error) {
      state.errors.push(`Kraken: ${error.message}`);
      return;
    }
    
    const targetsQueued = data?.targets_queued || 0;
    state.metrics.discoveries_queued += targetsQueued;
    
    console.log(`[flywheel] Kraken: ${targetsQueued} targets queued for crawling`);
  } catch (e) {
    state.errors.push(`Kraken phase: ${e instanceof Error ? e.message : 'Unknown'}`);
  }
}

// ============================================================================
// PHASE 8: DEAD LETTER RECOVERY (Self-Healing)
// ============================================================================

async function runRecoveryPhase(supabase: any, state: FlywheelState): Promise<void> {
  state.phase = 'recovery';
  
  // Only run at the top of each hour
  const currentMinute = new Date().getMinutes();
  if (currentMinute !== 0) return;
  
  try {
    console.log('[flywheel] Running dead letter recovery');
    
    const { data, error } = await supabase.functions.invoke('discovery-processor', {
      body: { action: 'recover_dead_letter' },
    });
    
    if (error) {
      state.errors.push(`Recovery: ${error.message}`);
      return;
    }
    
    state.metrics.dead_letter_recovered = data?.recovered || 0;
    console.log(`[flywheel] Recovered ${data?.recovered} from dead letter queue`);
  } catch (e) {
    state.errors.push(`Recovery phase: ${e instanceof Error ? e.message : 'Unknown'}`);
  }
}

// ============================================================================
// PHASE 9: CIRCUIT BREAKER RESET (Infrastructure Healing)
// ============================================================================

async function runCircuitResetPhase(supabase: any, state: FlywheelState): Promise<void> {
  state.phase = 'circuit_reset';
  
  // Check when last reset
  const currentHour = new Date().getHours();
  if (currentHour % ULTIMATE_CONFIG.CIRCUIT_RESET_INTERVAL_HOURS !== 0) {
    return;
  }
  
  try {
    // Find circuits that have been open for too long
    const cutoff = new Date(Date.now() - ULTIMATE_CONFIG.CIRCUIT_RESET_INTERVAL_HOURS * 60 * 60 * 1000).toISOString();
    
    const { data: staleCircuits } = await supabase
      .from('api_circuit_breakers')
      .select('id, api_domain')
      .eq('state', 'open')
      .lt('opened_at', cutoff);
    
    if (!staleCircuits?.length) {
      return;
    }
    
    console.log(`[flywheel] Resetting ${staleCircuits.length} stale circuits`);
    
    for (const circuit of staleCircuits) {
      await supabase
        .from('api_circuit_breakers')
        .update({
          state: 'half_open',
          half_open_at: new Date().toISOString(),
          failure_count: 0,
        })
        .eq('id', circuit.id);
      
      state.metrics.circuits_reset++;
    }
    
    console.log(`[flywheel] Reset ${state.metrics.circuits_reset} circuits`);
  } catch (e) {
    state.errors.push(`Circuit reset: ${e instanceof Error ? e.message : 'Unknown'}`);
  }
}

// ============================================================================
// PHASE 10: METRICS & OBSERVABILITY (Track Everything)
// ============================================================================

async function recordFlywheelRun(supabase: any, state: FlywheelState): Promise<void> {
  state.phase = 'metrics';
  
  const processingTime = Date.now() - state.startTime;
  const hasErrors = state.errors.length > 0;
  
  try {
    // Record overall invocation
    await supabase.rpc('record_flywheel_metric', {
      p_type: 'scheduler',
      p_name: 'ultimate_invocation',
      p_value: 1,
      p_dimensions: {
        processing_time_ms: processingTime,
        has_errors: hasErrors,
        error_count: state.errors.length,
      },
    });
    
    // Record each metric category
    const metricCategories = [
      ['discovery', 'discoveries_processed', state.metrics.discoveries_processed],
      ['discovery', 'discoveries_approved', state.metrics.discoveries_approved],
      ['crawler', 'crawlers_run', state.metrics.crawlers_run],
      ['crawler', 'sources_discovered', state.metrics.sources_discovered],
      ['entity', 'records_resolved', state.metrics.records_resolved],
      ['entity', 'entities_created', state.metrics.entities_created],
      ['entity', 'entities_merged', state.metrics.entities_merged],
      ['fact', 'facts_extracted', state.metrics.facts_extracted],
      ['fact', 'facts_linked', state.metrics.facts_linked],
      ['insight', 'insights_generated', state.metrics.insights_generated],
      ['scoring', 'entities_scored', state.metrics.entities_scored],
      ['recovery', 'dead_letter_recovered', state.metrics.dead_letter_recovered],
      ['recovery', 'circuits_reset', state.metrics.circuits_reset],
      ['gap', 'gaps_identified', state.metrics.gaps_identified],
      ['gap', 'discoveries_queued', state.metrics.discoveries_queued],
    ] as const;
    
    for (const [type, name, value] of metricCategories) {
      if (value > 0) {
        await supabase.rpc('record_flywheel_metric', {
          p_type: type,
          p_name: name,
          p_value: value,
          p_dimensions: {},
        });
      }
    }
    
    // Update master dataset stats every 15 minutes
    const currentMinute = new Date().getMinutes();
    if (currentMinute % 15 === 0) {
      await supabase.rpc('record_master_dataset_stats');
    }
    
  } catch (e) {
    console.error('Failed to record metrics:', e);
  }
}

// ============================================================================
// COMPUTE SYSTEM HEALTH SCORE
// ============================================================================

async function computeHealthScore(supabase: any): Promise<{
  score: number;
  breakdown: Record<string, number>;
  recommendations: string[];
}> {
  const breakdown: Record<string, number> = {};
  const recommendations: string[] = [];
  
  try {
    // 1. Entity Resolution Rate (25 points)
    const { count: totalRecords } = await supabase
      .from('records')
      .select('*', { count: 'exact', head: true });
    
    const { count: resolvedRecords } = await supabase
      .from('records')
      .select('*', { count: 'exact', head: true })
      .not('entity_id', 'is', null);
    
    const resolutionRate = totalRecords > 0 ? (resolvedRecords || 0) / totalRecords : 0;
    breakdown.entity_resolution = Math.min(25, Math.round(resolutionRate * 25 / ULTIMATE_CONFIG.TARGET_RESOLUTION_RATE));
    
    if (resolutionRate < ULTIMATE_CONFIG.TARGET_RESOLUTION_RATE) {
      recommendations.push(`Resolution rate ${(resolutionRate * 100).toFixed(1)}% below target ${ULTIMATE_CONFIG.TARGET_RESOLUTION_RATE * 100}%`);
    }
    
    // 2. Entity Count & Diversity (20 points)
    const { count: entityCount } = await supabase
      .from('core_entities')
      .select('*', { count: 'exact', head: true });
    
    breakdown.entity_diversity = Math.min(20, Math.round((entityCount || 0) / 50 * 20));
    
    // 3. Fact Density (15 points)
    const { count: factCount } = await supabase
      .from('core_facts')
      .select('*', { count: 'exact', head: true });
    
    const factDensity = entityCount > 0 ? (factCount || 0) / entityCount : 0;
    breakdown.fact_density = Math.min(15, Math.round(factDensity * 15 / ULTIMATE_CONFIG.TARGET_FACT_DENSITY));
    
    if (factDensity < ULTIMATE_CONFIG.TARGET_FACT_DENSITY) {
      recommendations.push(`Fact density ${factDensity.toFixed(2)} below target ${ULTIMATE_CONFIG.TARGET_FACT_DENSITY}`);
    }
    
    // 4. Insight Freshness (15 points)
    const { count: recentInsights } = await supabase
      .from('core_derived_insights')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - ULTIMATE_CONFIG.TARGET_INSIGHT_FRESHNESS_HOURS * 60 * 60 * 1000).toISOString());
    
    breakdown.insight_freshness = Math.min(15, Math.round((recentInsights || 0) / 10 * 15));
    
    // 5. Pipeline Health (15 points)
    const { count: openCircuits } = await supabase
      .from('api_circuit_breakers')
      .select('*', { count: 'exact', head: true })
      .eq('state', 'open');
    
    const { count: deadLetterItems } = await supabase
      .from('discovery_dead_letter')
      .select('*', { count: 'exact', head: true })
      .is('recovered_at', null);
    
    const pipelineIssues = (openCircuits || 0) + (deadLetterItems || 0);
    breakdown.pipeline_health = Math.max(0, 15 - pipelineIssues);
    
    if (pipelineIssues > 0) {
      recommendations.push(`${pipelineIssues} pipeline issues (${openCircuits} open circuits, ${deadLetterItems} dead letters)`);
    }
    
    // 6. Data Quality (10 points)
    const { data: avgQuality } = await supabase
      .from('core_entities')
      .select('data_quality_score')
      .not('data_quality_score', 'is', null)
      .limit(100);
    
    const avgScore = avgQuality?.length > 0 
      ? avgQuality.reduce((sum: number, e: any) => sum + (e.data_quality_score || 0), 0) / avgQuality.length
      : 50;
    
    breakdown.data_quality = Math.min(10, Math.round(avgScore / 10));
    
    // Calculate total
    const score = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    
    return { score, breakdown, recommendations };
  } catch (e) {
    console.error('Health score calculation failed:', e);
    return { score: 0, breakdown: {}, recommendations: ['Health calculation failed'] };
  }
}

// ============================================================================
// MAIN ULTIMATE FLYWHEEL HANDLER
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
    const { action, force_all } = await req.json().catch(() => ({}));
    
    console.log(`🚀 [ULTIMATE FLYWHEEL] Starting (action: ${action || 'full_cycle'})`);

    // Health check action
    if (action === 'health') {
      const health = await computeHealthScore(supabase);
      return new Response(JSON.stringify({
        success: true,
        health_score: health.score,
        breakdown: health.breakdown,
        recommendations: health.recommendations,
        target_score: 95,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Full cycle execution
    // Phase 1: Discovery Processing
    if (hasTimeRemaining(state)) {
      await runDiscoveryPhase(supabase, state);
    }

    // Phase 2: Crawler Execution
    if (hasTimeRemaining(state)) {
      await runCrawlerPhase(supabase, state);
    }

    // Phase 3: Entity Resolution
    if (hasTimeRemaining(state)) {
      await runEntityResolutionPhase(supabase, state);
    }

    // Phase 4: Fact Extraction
    if (hasTimeRemaining(state)) {
      await runFactExtractionPhase(supabase, state);
    }

    // Phase 5: Insight Generation
    if (hasTimeRemaining(state) || force_all) {
      await runInsightGenerationPhase(supabase, state);
    }

    // Phase 6: Entity Scoring
    if (hasTimeRemaining(state) || force_all) {
      await runScoringPhase(supabase, state);
    }

    // Phase 7: Gap Analysis
    if (hasTimeRemaining(state)) {
      await runGapAnalysisPhase(supabase, state);
    }
    
    // Phase 7.5: Kraken Hunters - Autonomous data expansion
    if (hasTimeRemaining(state)) {
      await runKrakenPhase(supabase, state);
    }

    // Phase 8: Dead Letter Recovery
    if (hasTimeRemaining(state)) {
      await runRecoveryPhase(supabase, state);
    }

    // Phase 9: Circuit Breaker Reset
    if (hasTimeRemaining(state)) {
      await runCircuitResetPhase(supabase, state);
    }

    // Phase 10: Record Metrics
    await recordFlywheelRun(supabase, state);

    // Compute final health score
    const health = await computeHealthScore(supabase);

    const processingTime = Date.now() - state.startTime;
    
    console.log(`✅ [ULTIMATE FLYWHEEL] Complete in ${processingTime}ms - Health: ${health.score}/100`);

    return new Response(JSON.stringify({
      success: state.errors.length === 0,
      processing_time_ms: processingTime,
      health_score: health.score,
      health_breakdown: health.breakdown,
      recommendations: health.recommendations,
      metrics: state.metrics,
      errors: state.errors,
      phases_completed: state.phase,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 [ULTIMATE FLYWHEEL] Error:', error);
    
    await recordFlywheelRun(supabase, state);
    
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
