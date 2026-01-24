// ============================================================
// ⚡ ZAPIER TRIGGER - Automation Webhooks
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const url = new URL(req.url);
    const trigger = url.searchParams.get('trigger');
    const apiKey = req.headers.get('X-API-Key') || req.headers.get('authorization')?.replace('Bearer ', '');

    // Validate API key
    const { data: apiKeyData } = await supabase
      .from('api_keys')
      .select('user_id, scopes')
      .eq('key_hash', apiKey)
      .eq('is_active', true)
      .single();

    if (!apiKeyData) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    switch (trigger) {
      case 'new_entity': {
        const { data: entities } = await supabase
          .from('core_entities')
          .select('id, canonical_name, entity_type, opportunity_score, created_at')
          .order('created_at', { ascending: false })
          .limit(10);
        
        return new Response(JSON.stringify(entities || []), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'new_contract': {
        const { data: contracts } = await supabase
          .from('core_facts')
          .select(`
            id,
            fact_type,
            fact_value,
            created_at,
            entity:core_entities(canonical_name)
          `)
          .in('fact_type', ['contract_awarded', 'contract_value'])
          .order('created_at', { ascending: false })
          .limit(10);
        
        return new Response(JSON.stringify(contracts || []), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'alert_triggered': {
        const { data: alerts } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', apiKeyData.user_id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        return new Response(JSON.stringify(alerts || []), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'search': {
        const body = await req.json();
        const { data: searchResults } = await supabase.functions.invoke('omniscient', {
          body: { prompt: body.query, limit: body.limit || 10 }
        });
        
        return new Response(JSON.stringify(searchResults || {}), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'high_opportunity': {
        const { data: opportunities } = await supabase
          .from('core_entities')
          .select('id, canonical_name, entity_type, opportunity_score, health_score')
          .gte('opportunity_score', 80)
          .order('opportunity_score', { ascending: false })
          .limit(10);
        
        return new Response(JSON.stringify(opportunities || []), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ 
          error: 'Unknown trigger',
          available_triggers: ['new_entity', 'new_contract', 'alert_triggered', 'search', 'high_opportunity']
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Zapier trigger error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
