// ============================================================
// 🧠 THE CORE: BACKFILL ENTITY RESOLUTION
// One-time or scheduled backfill to resolve existing records
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { batch_size = 100, max_batches = 10 } = await req.json().catch(() => ({}));
    
    console.log(`[backfill] Starting entity resolution backfill (batch_size: ${batch_size}, max_batches: ${max_batches})`);
    const startTime = Date.now();

    let totalProcessed = 0;
    let totalResolved = 0;
    let totalCreated = 0;
    let batchCount = 0;

    // Process in batches
    while (batchCount < max_batches) {
      // Check how many unresolved records remain
      const { count: unresolvedCount } = await supabase
        .from('records')
        .select('*', { count: 'exact', head: true })
        .is('entity_id', null);

      if (!unresolvedCount || unresolvedCount === 0) {
        console.log('[backfill] No more unresolved records');
        break;
      }

      console.log(`[backfill] Batch ${batchCount + 1}: ${unresolvedCount} unresolved records remaining`);

      // Call entity-resolver in backfill mode
      const response = await fetch(`${supabaseUrl}/functions/v1/entity-resolver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          backfill: true,
          batch_size: batch_size,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        totalProcessed += result.records_processed || 0;
        totalResolved += result.entities_merged || 0;
        totalCreated += result.entities_created || 0;
        
        console.log(`[backfill] Batch ${batchCount + 1} complete: ${result.records_processed} processed, ${result.entities_merged} resolved, ${result.entities_created} created`);
        
        // If no records were processed, we're done
        if (result.records_processed === 0) {
          break;
        }
      } else {
        console.error(`[backfill] Batch ${batchCount + 1} failed:`, result.error);
        break;
      }

      batchCount++;
      
      // Small delay between batches to avoid overwhelming the system
      await new Promise(r => setTimeout(r, 500));
    }

    // Calculate final resolution rate
    const { count: totalRecords } = await supabase
      .from('records')
      .select('*', { count: 'exact', head: true });

    const { count: resolvedRecords } = await supabase
      .from('records')
      .select('*', { count: 'exact', head: true })
      .not('entity_id', 'is', null);

    const resolutionRate = totalRecords && totalRecords > 0
      ? ((resolvedRecords || 0) / totalRecords * 100).toFixed(1)
      : 0;

    const processingTime = Date.now() - startTime;

    console.log(`[backfill] Complete: ${totalProcessed} processed, ${totalResolved} resolved, ${totalCreated} created in ${processingTime}ms`);
    console.log(`[backfill] Resolution rate: ${resolutionRate}% (${resolvedRecords}/${totalRecords})`);

    return new Response(
      JSON.stringify({
        success: true,
        batches_processed: batchCount,
        total_records_processed: totalProcessed,
        entities_resolved: totalResolved,
        entities_created: totalCreated,
        resolution_rate: `${resolutionRate}%`,
        total_records: totalRecords,
        resolved_records: resolvedRecords,
        processing_time_ms: processingTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[backfill] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
