// ============================================================================
// 🚀 BASED DATA - MASTER FLYWHEEL SCHEDULER
// Orchestrates all automated data collection, enrichment, and analysis
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ScheduledTask {
  name: string;
  edgeFunction: string;
  intervalHours: number;
  body?: any;
  description: string;
}

const SCHEDULED_TASKS: ScheduledTask[] = [
  { name: 'mega-ingest', edgeFunction: 'mega-ingest', intervalHours: 2, description: 'Process pending queue items' },
  { name: 'data-refresh', edgeFunction: 'data-filler-v2', intervalHours: 4, body: { mode: 'auto' }, description: 'Refresh contracts, grants, opportunities' },
  { name: 'ocean-cycle', edgeFunction: 'ocean-controller', intervalHours: 6, description: 'Full ingest → resolve → enrich → insights cycle' },
  { name: 'flywheel-healing', edgeFunction: 'flywheel-ultimate', intervalHours: 8, body: { action: 'full_cycle' }, description: 'Self-healing check and expansion' },
  { name: 'vacuum-comprehensive', edgeFunction: 'vacuum-all', intervalHours: 12, body: { mode: 'full' }, description: 'Comprehensive data pull from all sources' },
  { name: 'entity-resolution', edgeFunction: 'backfill-entity-resolution', intervalHours: 24, description: 'Entity resolution backfill + insight regen' },
  { name: 'load-sbir', edgeFunction: 'load-sbir', intervalHours: 24, description: 'SBIR/STTR awards ingestion' },
  { name: 'load-fpds', edgeFunction: 'load-fpds', intervalHours: 24, body: { mode: 'atom' }, description: 'FPDS awards ingestion' },
  { name: 'load-sam-entities', edgeFunction: 'load-sam-entities', intervalHours: 48, description: 'SAM entity registration data' },
  { name: 'load-sam-exclusions', edgeFunction: 'load-sam-exclusions', intervalHours: 48, description: 'SAM exclusions/debarments' },
  { name: 'load-gsa-contracts', edgeFunction: 'load-gsa-contracts', intervalHours: 48, description: 'GSA schedule contracts' },
  { name: 'load-patents', edgeFunction: 'load-patents', intervalHours: 72, description: 'USPTO patent data' },
  { name: 'load-lobbying', edgeFunction: 'load-lobbying', intervalHours: 72, description: 'Lobbying disclosures' },
  { name: 'kraken-expansion', edgeFunction: 'kraken-rage', intervalHours: 168, description: 'Multi-state bulk expansion (weekly)' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'auto'; // 'auto', 'run_task', 'run_all', 'status'
    
    if (action === 'status') {
      return await getSchedulerStatus(supabase);
    }
    
    if (action === 'run_task') {
      const taskName = body.task_name;
      const task = SCHEDULED_TASKS.find(t => t.name === taskName);
      if (!task) {
        return new Response(JSON.stringify({ error: `Unknown task: ${taskName}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      return await runSingleTask(supabase, task);
    }
    
    if (action === 'run_all') {
      return await runAllTasks(supabase);
    }
    
    // Auto mode: check what's due and run it
    return await autoSchedule(supabase);
    
  } catch (error) {
    console.error('[flywheel-scheduler] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function autoSchedule(supabase: any) {
  console.log('[flywheel-scheduler] Auto-scheduling: checking due tasks...');
  
  const dueTasks: ScheduledTask[] = [];
  
  for (const task of SCHEDULED_TASKS) {
    const { data: lastRun } = await supabase
      .from('scheduler_runs')
      .select('completed_at, status')
      .eq('task_name', task.name)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!lastRun) {
      // Never run before — it's due
      dueTasks.push(task);
      continue;
    }
    
    const lastRunTime = new Date(lastRun.completed_at || lastRun.started_at || 0).getTime();
    const hoursSince = (Date.now() - lastRunTime) / (1000 * 60 * 60);
    
    if (hoursSince >= task.intervalHours) {
      dueTasks.push(task);
    }
  }
  
  console.log(`[flywheel-scheduler] ${dueTasks.length} tasks due: ${dueTasks.map(t => t.name).join(', ')}`);
  
  // Run up to 3 due tasks per invocation to stay within timeout
  const tasksToRun = dueTasks.slice(0, 3);
  const results: any[] = [];
  
  for (const task of tasksToRun) {
    // Check circuit breakers
    const { data: breakers } = await supabase
      .from('api_circuit_breakers')
      .select('api_domain, state')
      .eq('state', 'open');
    
    const openBreakers = (breakers || []).map((b: any) => b.api_domain);
    if (openBreakers.length > 5) {
      console.log(`[flywheel-scheduler] Skipping ${task.name}: too many open circuit breakers (${openBreakers.length})`);
      results.push({ task: task.name, skipped: true, reason: 'circuit_breakers_open' });
      continue;
    }
    
    const result = await executeTask(supabase, task);
    results.push(result);
  }
  
  return new Response(JSON.stringify({
    success: true,
    action: 'auto',
    tasks_due: dueTasks.length,
    tasks_run: results.length,
    results,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function runSingleTask(supabase: any, task: ScheduledTask) {
  const result = await executeTask(supabase, task);
  return new Response(JSON.stringify({
    success: true, action: 'run_task', result
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function runAllTasks(supabase: any) {
  console.log('[flywheel-scheduler] Running ALL tasks...');
  const results: any[] = [];
  
  for (const task of SCHEDULED_TASKS) {
    const result = await executeTask(supabase, task);
    results.push(result);
  }
  
  return new Response(JSON.stringify({
    success: true, action: 'run_all', results
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function executeTask(supabase: any, task: ScheduledTask) {
  console.log(`[flywheel-scheduler] Executing: ${task.name} → ${task.edgeFunction}`);
  
  // Log run start
  const { data: run } = await supabase.from('scheduler_runs').insert({
    task_name: task.name,
    edge_function: task.edgeFunction,
    status: 'running',
    metadata: { description: task.description, interval_hours: task.intervalHours }
  }).select('id').single();
  
  const runId = run?.id;
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase.functions.invoke(task.edgeFunction, {
      body: task.body || {},
    });
    
    const durationMs = Date.now() - startTime;
    const rowsAffected = data?.loaded || data?.total_loaded || data?.total || data?.rows_affected || 0;
    
    if (error) {
      await supabase.from('scheduler_runs').update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
        error_message: error.message,
      }).eq('id', runId);
      
      console.error(`[flywheel-scheduler] ${task.name} FAILED:`, error.message);
      return { task: task.name, status: 'failed', error: error.message, duration_ms: durationMs };
    }
    
    await supabase.from('scheduler_runs').update({
      status: 'success',
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
      rows_affected: rowsAffected,
      metadata: { ...data, description: task.description }
    }).eq('id', runId);
    
    // Update vacuum_runs for tracking
    await supabase.from('vacuum_runs').insert({
      mode: task.name,
      status: 'completed',
      records_ingested: rowsAffected,
      duration_ms: durationMs,
      results: data,
    }).catch(() => {});
    
    console.log(`[flywheel-scheduler] ${task.name} SUCCESS: ${rowsAffected} rows in ${durationMs}ms`);
    return { task: task.name, status: 'success', rows_affected: rowsAffected, duration_ms: durationMs };
  } catch (e) {
    const durationMs = Date.now() - startTime;
    
    await supabase.from('scheduler_runs').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
      error_message: e instanceof Error ? e.message : 'Unknown error',
    }).eq('id', runId);
    
    return { task: task.name, status: 'failed', error: e instanceof Error ? e.message : 'Unknown', duration_ms: durationMs };
  }
}

async function getSchedulerStatus(supabase: any) {
  const taskStatuses: any[] = [];
  
  for (const task of SCHEDULED_TASKS) {
    const { data: lastRun } = await supabase
      .from('scheduler_runs')
      .select('*')
      .eq('task_name', task.name)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();
    
    const lastRunTime = lastRun?.completed_at ? new Date(lastRun.completed_at).getTime() : 0;
    const nextDue = lastRunTime > 0 
      ? new Date(lastRunTime + task.intervalHours * 60 * 60 * 1000).toISOString()
      : 'now';
    
    taskStatuses.push({
      name: task.name,
      edge_function: task.edgeFunction,
      description: task.description,
      interval_hours: task.intervalHours,
      last_run: lastRun ? {
        status: lastRun.status,
        started_at: lastRun.started_at,
        completed_at: lastRun.completed_at,
        rows_affected: lastRun.rows_affected,
        duration_ms: lastRun.duration_ms,
        error: lastRun.error_message,
      } : null,
      next_due: nextDue,
      is_overdue: nextDue === 'now' || new Date(nextDue).getTime() < Date.now(),
    });
  }
  
  return new Response(JSON.stringify({
    success: true,
    tasks: taskStatuses,
    total_tasks: SCHEDULED_TASKS.length,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
