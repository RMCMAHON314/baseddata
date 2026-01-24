// ============================================================
// 📡 WEBHOOK DISPATCHER - Event Notifications
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function createHmacSignature(secret: string, payload: string): string {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(payload);
  
  // Simple hash for signature (in production, use proper HMAC)
  let hash = 0;
  const combined = new Uint8Array([...keyData, ...data]);
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash + combined[i]) | 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { event, data, user_id } = await req.json();
    
    console.log(`📡 Dispatching webhook: ${event}`);

    // Get all active webhooks for this event
    let query = supabase
      .from('webhooks')
      .select('*')
      .eq('is_active', true)
      .contains('events', [event]);
    
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data: webhooks } = await query;

    if (!webhooks || webhooks.length === 0) {
      return new Response(JSON.stringify({ dispatched: 0, message: 'No matching webhooks' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let dispatched = 0;
    const results: Array<{ webhook_id: string; success: boolean; status?: number }> = [];

    for (const webhook of webhooks) {
      const startTime = Date.now();
      
      try {
        const payload = JSON.stringify({ event, data, timestamp: Date.now() });
        const signature = createHmacSignature(webhook.secret || '', payload);

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event,
            ...(webhook.headers || {})
          },
          body: payload
        });

        const duration = Date.now() - startTime;
        const responseText = await response.text().catch(() => '');

        // Log result
        await supabase.from('webhook_logs').insert({
          webhook_id: webhook.id,
          event,
          payload: { event, data },
          response_status: response.status,
          response_body: responseText.substring(0, 1000),
          duration_ms: duration,
          success: response.ok
        });

        // Update webhook
        await supabase
          .from('webhooks')
          .update({ 
            last_triggered: new Date().toISOString(),
            failure_count: response.ok ? 0 : (webhook.failure_count || 0) + 1
          })
          .eq('id', webhook.id);

        if (response.ok) dispatched++;
        
        results.push({ webhook_id: webhook.id, success: response.ok, status: response.status });

      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Log failure
        await supabase.from('webhook_logs').insert({
          webhook_id: webhook.id,
          event,
          payload: { event, data },
          response_status: 0,
          response_body: error instanceof Error ? error.message : 'Unknown error',
          duration_ms: duration,
          success: false
        });

        // Increment failure count
        const newFailureCount = (webhook.failure_count || 0) + 1;
        
        await supabase
          .from('webhooks')
          .update({ 
            failure_count: newFailureCount,
            // Disable after 10 consecutive failures
            is_active: newFailureCount < 10
          })
          .eq('id', webhook.id);

        results.push({ webhook_id: webhook.id, success: false });
      }
    }

    return new Response(JSON.stringify({ 
      dispatched,
      total: webhooks.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook dispatcher error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
