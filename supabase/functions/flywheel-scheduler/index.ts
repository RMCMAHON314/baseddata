// ============================================================================
// 🚀 BASED DATA v10.0 - FLYWHEEL SCHEDULER (Redirects to Ultimate)
// This is the pg_cron entry point - delegates to flywheel-ultimate
// ============================================================================

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
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    
    console.log('[flywheel-scheduler] Delegating to flywheel-ultimate...');
    
    // Delegate to the Ultimate Flywheel
    const { data, error } = await supabase.functions.invoke('flywheel-ultimate', {
      body: body,
    });
    
    if (error) {
      console.error('[flywheel-scheduler] Ultimate flywheel error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        delegated_to: 'flywheel-ultimate',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`[flywheel-scheduler] Ultimate flywheel complete - Health: ${data?.health_score}/100`);
    
    return new Response(JSON.stringify({
      ...data,
      delegated_to: 'flywheel-ultimate',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
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
