// OMNISCIENT Scheduled Pipeline Runner
// Executes scheduled data collection pipelines on a cron basis

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledPipeline {
  id: string;
  user_id: string;
  name: string;
  prompt: string;
  cron_expression: string;
  config: Record<string, unknown>;
  next_run_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const now = new Date().toISOString();
    console.log(`[Scheduler] Running at ${now}`);

    // Get all pipelines due to run
    const { data: duePipelines, error: fetchError } = await supabase
      .from('scheduled_pipelines')
      .select('*')
      .eq('is_active', true)
      .lte('next_run_at', now)
      .order('next_run_at', { ascending: true })
      .limit(10); // Process max 10 at a time

    if (fetchError) throw fetchError;

    if (!duePipelines || duePipelines.length === 0) {
      return new Response(JSON.stringify({
        message: 'No pipelines due to run',
        checked_at: now
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[Scheduler] Found ${duePipelines.length} pipelines to run`);

    const results = [];

    for (const pipeline of duePipelines as ScheduledPipeline[]) {
      const runStart = Date.now();

      // Create a pipeline run record
      const { data: run, error: runError } = await supabase
        .from('pipeline_runs')
        .insert({
          pipeline_id: pipeline.id,
          status: 'running',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (runError) {
        console.error(`[Scheduler] Failed to create run record for ${pipeline.id}:`, runError);
        continue;
      }

      try {
        // Execute the OMNISCIENT query
        const response = await fetch(`${supabaseUrl}/functions/v1/omniscient`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            prompt: pipeline.prompt,
            config: pipeline.config
          })
        });

        const result = await response.json();
        const processingTime = Date.now() - runStart;

        if (response.ok && result.collected_data) {
          // Calculate total records
          const recordsCollected = result.collected_data.reduce(
            (sum: number, d: { data?: { features?: unknown[] } }) => 
              sum + (d.data?.features?.length || 0), 
            0
          );

          // Update the run as complete
          await supabase
            .from('pipeline_runs')
            .update({
              status: 'complete',
              records_collected: recordsCollected,
              sources_queried: result.collected_data.map((d: { source: string }) => d.source),
              insights: result.insights,
              processing_time_ms: processingTime,
              credits_used: result.credits_used || 0,
              completed_at: new Date().toISOString()
            })
            .eq('id', run.id);

          // Update pipeline stats
          const { data: nextRun } = await supabase.rpc('calculate_next_run', {
            p_cron: pipeline.cron_expression
          });

          // Fetch current counts and increment
          const { data: currentPipeline } = await supabase
            .from('scheduled_pipelines')
            .select('run_count, success_count')
            .eq('id', pipeline.id)
            .single();

          await supabase
            .from('scheduled_pipelines')
            .update({
              last_run_at: new Date().toISOString(),
              next_run_at: nextRun,
              run_count: (currentPipeline?.run_count || 0) + 1,
              success_count: (currentPipeline?.success_count || 0) + 1
            })
            .eq('id', pipeline.id);

          results.push({
            pipeline_id: pipeline.id,
            pipeline_name: pipeline.name,
            status: 'success',
            records_collected: recordsCollected,
            processing_time_ms: processingTime
          });
        } else {
          throw new Error(result.error || 'Collection failed');
        }

      } catch (pipelineError) {
        const errorMessage = pipelineError instanceof Error ? pipelineError.message : 'Unknown error';
        console.error(`[Scheduler] Pipeline ${pipeline.id} failed:`, errorMessage);

        // Update run as failed
        await supabase
          .from('pipeline_runs')
          .update({
            status: 'failed',
            error_message: errorMessage,
            processing_time_ms: Date.now() - runStart,
            completed_at: new Date().toISOString()
          })
          .eq('id', run.id);

        // Update pipeline failure count and reschedule
        const { data: nextRun } = await supabase.rpc('calculate_next_run', {
          p_cron: pipeline.cron_expression
        });

        // Fetch current counts and increment
        const { data: failedPipeline } = await supabase
          .from('scheduled_pipelines')
          .select('run_count, failure_count')
          .eq('id', pipeline.id)
          .single();

        await supabase
          .from('scheduled_pipelines')
          .update({
            last_run_at: new Date().toISOString(),
            next_run_at: nextRun,
            run_count: (failedPipeline?.run_count || 0) + 1,
            failure_count: (failedPipeline?.failure_count || 0) + 1
          })
          .eq('id', pipeline.id);

        results.push({
          pipeline_id: pipeline.id,
          pipeline_name: pipeline.name,
          status: 'failed',
          error: errorMessage
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      pipelines_processed: results.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Scheduler] Critical error:', error);
    return new Response(JSON.stringify({
      error: 'Scheduler failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
