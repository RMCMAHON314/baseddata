// ============================================================================
// BASED DATA v10.0 - Flywheel Scheduler
// Central orchestrator for automated data pipeline execution
// Designed to be called by pg_cron every minute
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
  DISCOVERY_BATCH_SIZE: 3,
  CRAWLER_BATCH_SIZE: 2,
  MAX_RUN_TIME_MS: 50000, // Leave headroom for 60s timeout
  ENABLE_GAP_ANALYSIS: true,
  GAP_ANALYSIS_INTERVAL_HOURS: 6,
};

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const results = {
    discoveries_processed: 0,
    discoveries_approved: 0,
    crawlers_run: 0,
    sources_discovered: 0,
    gap_analysis_run: false,
    dead_letter_recovered: 0,
    errors: [] as string[],
  };

  try {
    // Record scheduler invocation
    await supabase.rpc('record_flywheel_metric', {
      p_type: 'scheduler',
      p_name: 'invocation',
      p_value: 1,
      p_dimensions: {},
    });

    // ========================================================================
    // PHASE 1: Process Discovery Queue
    // ========================================================================
    try {
      const { data: pendingDiscoveries } = await supabase
        .from('source_discoveries')
        .select('id')
        .eq('status', 'pending')
        .lt('generation_attempts', 3)
        .or(`retry_after.is.null,retry_after.lte.${new Date().toISOString()}`)
        .limit(CONFIG.DISCOVERY_BATCH_SIZE);

      if (pendingDiscoveries?.length) {
        // Call discovery processor
        const { data, error } = await supabase.functions.invoke('discovery-processor', {
          body: { action: 'process_queue', batch_size: CONFIG.DISCOVERY_BATCH_SIZE },
        });

        if (!error && data) {
          results.discoveries_processed = data.processed || 0;
          results.discoveries_approved = data.approved || 0;
        } else if (error) {
          results.errors.push(`Discovery processor: ${error.message}`);
        }
      }
    } catch (e) {
      results.errors.push(`Discovery phase: ${e instanceof Error ? e.message : 'Unknown'}`);
    }

    // Check time budget
    if (Date.now() - startTime > CONFIG.MAX_RUN_TIME_MS) {
      console.log('Time budget exceeded after discovery phase');
      return createResponse(results, startTime);
    }

    // ========================================================================
    // PHASE 2: Run Due Crawlers
    // ========================================================================
    try {
      const { data: dueCrawlers } = await supabase
        .from('auto_crawlers')
        .select('id')
        .eq('is_active', true)
        .neq('circuit_state', 'open')
        .or(`next_run_at.is.null,next_run_at.lte.${new Date().toISOString()}`)
        .limit(CONFIG.CRAWLER_BATCH_SIZE);

      if (dueCrawlers?.length) {
        const { data, error } = await supabase.functions.invoke('auto-crawler', {
          body: { run_all: false },
        });

        if (!error && data) {
          results.crawlers_run = data.crawlers_run || 0;
          results.sources_discovered = data.total_sources_discovered || 0;
        } else if (error) {
          results.errors.push(`Crawler: ${error.message}`);
        }
      }
    } catch (e) {
      results.errors.push(`Crawler phase: ${e instanceof Error ? e.message : 'Unknown'}`);
    }

    // Check time budget
    if (Date.now() - startTime > CONFIG.MAX_RUN_TIME_MS) {
      console.log('Time budget exceeded after crawler phase');
      return createResponse(results, startTime);
    }

    // ========================================================================
    // PHASE 3: Gap Analysis (every 6 hours)
    // ========================================================================
    if (CONFIG.ENABLE_GAP_ANALYSIS) {
      try {
        const { data: lastGapAnalysis } = await supabase
          .from('flywheel_metrics')
          .select('recorded_at')
          .eq('metric_name', 'gap_analysis_run')
          .order('recorded_at', { ascending: false })
          .limit(1)
          .single();

        const lastRunTime = lastGapAnalysis?.recorded_at 
          ? new Date(lastGapAnalysis.recorded_at) 
          : new Date(0);
        
        const hoursSinceLastRun = (Date.now() - lastRunTime.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastRun >= CONFIG.GAP_ANALYSIS_INTERVAL_HOURS) {
          const { data, error } = await supabase.functions.invoke('discovery-processor', {
            body: { action: 'analyze_gaps' },
          });

          if (!error && data) {
            results.gap_analysis_run = true;
            await supabase.rpc('record_flywheel_metric', {
              p_type: 'scheduler',
              p_name: 'gap_analysis_run',
              p_value: 1,
              p_dimensions: { gaps_found: data.gaps_found, queued: data.discoveries_queued },
            });
          }
        }
      } catch (e) {
        results.errors.push(`Gap analysis: ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    // ========================================================================
    // PHASE 4: Dead Letter Recovery (once per hour)
    // ========================================================================
    try {
      const currentMinute = new Date().getMinutes();
      if (currentMinute === 0) {
        const { data, error } = await supabase.functions.invoke('discovery-processor', {
          body: { action: 'recover_dead_letter' },
        });

        if (!error && data) {
          results.dead_letter_recovered = data.recovered || 0;
        }
      }
    } catch (e) {
      results.errors.push(`Dead letter recovery: ${e instanceof Error ? e.message : 'Unknown'}`);
    }

    // ========================================================================
    // PHASE 5: Record Master Dataset Stats (every 15 minutes)
    // ========================================================================
    try {
      const currentMinute = new Date().getMinutes();
      if (currentMinute % 15 === 0) {
        await supabase.rpc('record_master_dataset_stats');
      }
    } catch (e) {
      // Non-critical, just log
      console.error('Stats recording failed:', e);
    }

    return createResponse(results, startTime);

  } catch (error) {
    console.error('Scheduler error:', error);
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    
    return new Response(JSON.stringify({
      success: false,
      ...results,
      processing_time_ms: Date.now() - startTime,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function createResponse(results: any, startTime: number): Response {
  const processingTime = Date.now() - startTime;
  
  return new Response(JSON.stringify({
    success: results.errors.length === 0,
    ...results,
    processing_time_ms: processingTime,
  }), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
