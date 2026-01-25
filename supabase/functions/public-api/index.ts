// PUBLIC API - Developer API for external access
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: Date;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/public-api', '');
    const apiKey = req.headers.get('x-api-key');

    // Validate API key
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'API key required',
        message: 'Include your API key in the x-api-key header'
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Look up API key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*, api_pricing_tiers(*)')
      .eq('key_hash', await hashKey(apiKey))
      .eq('is_active', true)
      .single();

    if (keyError || !keyData) {
      return new Response(JSON.stringify({
        error: 'Invalid API key',
        message: 'The provided API key is invalid or has been deactivated'
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check rate limit
    const tier = keyData.api_pricing_tiers;
    const rateLimit = await checkRateLimit(supabase, keyData.id, tier?.rate_limit_per_minute || 10);
    
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Limit of ${rateLimit.limit} requests per minute exceeded. Try again at ${rateLimit.resetAt.toISOString()}`
      }), { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetAt.toISOString()
        } 
      });
    }

    // Route handling
    let response;
    
    // ═══════════════════════════════════════════════════════════════
    // GET /entities - Search entities
    // ═══════════════════════════════════════════════════════════════
    if (path === '/entities' && req.method === 'GET') {
      const query = url.searchParams.get('q') || '';
      const state = url.searchParams.get('state');
      const type = url.searchParams.get('type');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

      let dbQuery = supabase
        .from('core_entities')
        .select('id, canonical_name, entity_type, state, city, total_contract_value, opportunity_score')
        .eq('is_canonical', true)
        .limit(limit);

      if (query) {
        dbQuery = dbQuery.ilike('canonical_name', `%${query}%`);
      }
      if (state) {
        dbQuery = dbQuery.eq('state', state);
      }
      if (type) {
        dbQuery = dbQuery.eq('entity_type', type);
      }

      const { data, error } = await dbQuery.order('total_contract_value', { ascending: false, nullsFirst: false });

      if (error) throw error;
      response = { data, count: data?.length || 0 };
    }

    // ═══════════════════════════════════════════════════════════════
    // GET /entities/:id - Get entity details
    // ═══════════════════════════════════════════════════════════════
    else if (path.startsWith('/entities/') && req.method === 'GET') {
      const entityId = path.replace('/entities/', '');
      
      const { data: entity, error } = await supabase
        .from('core_entities')
        .select('*')
        .eq('id', entityId)
        .single();

      if (error) throw error;
      if (!entity) {
        return new Response(JSON.stringify({ error: 'Entity not found' }), { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // Get health score if available
      const { data: healthScore } = await supabase
        .from('entity_health_scores')
        .select('*')
        .eq('entity_id', entityId)
        .maybeSingle();

      // Get contract summary
      const { count: contractCount } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_entity_id', entityId);

      response = {
        ...entity,
        health_score: healthScore,
        contract_count: contractCount
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // GET /contracts - Search contracts
    // ═══════════════════════════════════════════════════════════════
    else if (path === '/contracts' && req.method === 'GET') {
      const query = url.searchParams.get('q');
      const agency = url.searchParams.get('agency');
      const state = url.searchParams.get('state');
      const minAmount = url.searchParams.get('min_amount');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

      let dbQuery = supabase
        .from('contracts')
        .select('id, recipient_name, awarding_agency, award_amount, award_date, pop_state, description')
        .limit(limit);

      if (query) {
        dbQuery = dbQuery.or(`recipient_name.ilike.%${query}%,description.ilike.%${query}%`);
      }
      if (agency) {
        dbQuery = dbQuery.ilike('awarding_agency', `%${agency}%`);
      }
      if (state) {
        dbQuery = dbQuery.eq('pop_state', state);
      }
      if (minAmount) {
        dbQuery = dbQuery.gte('award_amount', parseInt(minAmount));
      }

      const { data, error } = await dbQuery.order('award_date', { ascending: false, nullsFirst: false });

      if (error) throw error;
      response = { data, count: data?.length || 0 };
    }

    // ═══════════════════════════════════════════════════════════════
    // GET /opportunities - Search opportunities
    // ═══════════════════════════════════════════════════════════════
    else if (path === '/opportunities' && req.method === 'GET') {
      const query = url.searchParams.get('q');
      const naics = url.searchParams.get('naics');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

      let dbQuery = supabase
        .from('opportunities')
        .select('id, title, department, naics_code, award_ceiling, response_deadline, set_aside_code')
        .eq('is_active', true)
        .limit(limit);

      if (query) {
        dbQuery = dbQuery.ilike('title', `%${query}%`);
      }
      if (naics) {
        dbQuery = dbQuery.eq('naics_code', naics);
      }

      const { data, error } = await dbQuery.order('response_deadline', { ascending: true, nullsFirst: false });

      if (error) throw error;
      response = { data, count: data?.length || 0 };
    }

    // ═══════════════════════════════════════════════════════════════
    // GET /stats - Platform statistics
    // ═══════════════════════════════════════════════════════════════
    else if (path === '/stats' && req.method === 'GET') {
      const [entities, contracts, grants, opportunities, relationships] = await Promise.all([
        supabase.from('core_entities').select('*', { count: 'exact', head: true }).eq('is_canonical', true),
        supabase.from('contracts').select('*', { count: 'exact', head: true }),
        supabase.from('grants').select('*', { count: 'exact', head: true }),
        supabase.from('opportunities').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('core_relationships').select('*', { count: 'exact', head: true })
      ]);

      const { data: valueData } = await supabase
        .from('contracts')
        .select('award_amount')
        .limit(5000);

      const totalValue = (valueData || []).reduce((s, c) => s + (Number(c.award_amount) || 0), 0);

      response = {
        entities: entities.count || 0,
        contracts: contracts.count || 0,
        grants: grants.count || 0,
        opportunities: opportunities.count || 0,
        relationships: relationships.count || 0,
        total_contract_value: totalValue
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // Unknown route
    // ═══════════════════════════════════════════════════════════════
    else {
      return new Response(JSON.stringify({
        error: 'Not found',
        available_endpoints: [
          'GET /entities',
          'GET /entities/:id',
          'GET /contracts',
          'GET /opportunities',
          'GET /stats'
        ]
      }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Log request
    const responseTime = Date.now() - startTime;
    await supabase.from('api_request_logs').insert({
      api_key_id: keyData.id,
      endpoint: path,
      method: req.method,
      status_code: 200,
      response_time_ms: responseTime
    });

    return new Response(JSON.stringify({
      success: true,
      ...response,
      _meta: {
        response_time_ms: responseTime,
        rate_limit_remaining: rateLimit.remaining - 1
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(rateLimit.limit),
        'X-RateLimit-Remaining': String(rateLimit.remaining - 1)
      }
    });

  } catch (error: unknown) {
    console.error('[public-api] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: errorMessage
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

// Helper: Hash API key
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: Check rate limit
async function checkRateLimit(
  supabase: any, 
  apiKeyId: string, 
  limitPerMinute: number
): Promise<{ allowed: boolean; remaining: number; limit: number; resetAt: Date }> {
  const oneMinuteAgo = new Date(Date.now() - 60000);
  
  const { count } = await supabase
    .from('api_request_logs')
    .select('*', { count: 'exact', head: true })
    .eq('api_key_id', apiKeyId)
    .gte('created_at', oneMinuteAgo.toISOString());

  const used = count || 0;
  const remaining = Math.max(0, limitPerMinute - used);
  const resetAt = new Date(Date.now() + 60000);

  return {
    allowed: used < limitPerMinute,
    remaining,
    limit: limitPerMinute,
    resetAt
  };
}
