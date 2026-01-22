// OMNISCIENT Developer API Gateway
// REST API with API key authentication, rate limiting, and usage metering

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface APIKeyValidation {
  key_id: string | null;
  owner_id: string | null;
  scopes: string[];
  is_valid: boolean;
  rate_limited: boolean;
}

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'bd_'; // Based Data prefix
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const url = new URL(req.url);
  const path = url.pathname.replace('/developer-api', '');
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Check for API key in header or query param
    const apiKey = req.headers.get('x-api-key') || url.searchParams.get('api_key');
    const authHeader = req.headers.get('Authorization');
    
    let userId: string | null = null;
    let apiKeyId: string | null = null;
    let scopes: string[] = [];

    // Route: Create API Key (requires auth)
    if (path === '/keys' && req.method === 'POST') {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: userData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !userData.user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const body = await req.json();
      const newKey = generateApiKey();
      const keyHash = await hashApiKey(newKey);

      const { data: keyData, error: keyError } = await supabase
        .from('api_keys')
        .insert({
          user_id: userData.user.id,
          name: body.name || 'API Key',
          key_hash: keyHash,
          key_prefix: newKey.substring(0, 11), // 'bd_' + 8 chars
          scopes: body.scopes || ['read'],
          rate_limit_per_minute: body.rate_limit_per_minute || 60,
          rate_limit_per_day: body.rate_limit_per_day || 10000,
          expires_at: body.expires_at || null
        })
        .select()
        .single();

      if (keyError) throw keyError;

      return new Response(JSON.stringify({
        success: true,
        api_key: newKey, // Only shown once!
        key_id: keyData.id,
        prefix: keyData.key_prefix,
        scopes: keyData.scopes,
        message: 'Save this key - it will not be shown again!'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route: List API Keys (requires auth)
    if (path === '/keys' && req.method === 'GET') {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: userData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !userData.user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: keys, error: keysError } = await supabase
        .from('api_keys')
        .select('id, name, key_prefix, scopes, rate_limit_per_minute, rate_limit_per_day, requests_today, is_active, created_at, expires_at')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (keysError) throw keysError;

      return new Response(JSON.stringify({ keys }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route: Revoke API Key (requires auth)
    if (path.startsWith('/keys/') && req.method === 'DELETE') {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: userData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !userData.user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const keyId = path.split('/')[2];
      const { error: deleteError } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', keyId)
        .eq('user_id', userData.user.id);

      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ success: true, message: 'API key revoked' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // For all other routes, validate API key
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: 'API key required',
        docs: 'Include x-api-key header or api_key query parameter'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const keyHash = await hashApiKey(apiKey);
    const { data: validation } = await supabase.rpc('validate_api_key', { p_key_hash: keyHash });

    if (!validation || validation.length === 0 || !validation[0].is_valid) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const keyInfo = validation[0] as APIKeyValidation;
    if (keyInfo.rate_limited) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        message: 'Please wait before making more requests'
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' }
      });
    }

    userId = keyInfo.owner_id;
    apiKeyId = keyInfo.key_id;
    scopes = keyInfo.scopes;

    // ================== DATA ENDPOINTS ==================

    // Route: Query the data lake
    if (path === '/data/query' && req.method === 'POST') {
      if (!scopes.includes('read')) {
        return new Response(JSON.stringify({ error: 'Insufficient scope: read required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const body = await req.json();
      const { category, source_id, limit = 100, offset = 0, bbox, since } = body;

      let query = supabase
        .from('records')
        .select('*', { count: 'exact' })
        .order('collected_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (category) query = query.eq('category', category);
      if (source_id) query = query.eq('source_id', source_id);
      if (since) query = query.gte('collected_at', since);

      const { data: records, error: queryError, count } = await query;
      if (queryError) throw queryError;

      // Log usage
      await supabase.from('api_usage_logs').insert({
        api_key_id: apiKeyId,
        endpoint: '/data/query',
        method: 'POST',
        status_code: 200,
        response_time_ms: Date.now() - startTime,
        request_body: { category, limit, offset },
        response_size_bytes: JSON.stringify(records).length
      });

      return new Response(JSON.stringify({
        success: true,
        total: count,
        limit,
        offset,
        records
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route: Run OMNISCIENT query
    if (path === '/data/collect' && req.method === 'POST') {
      if (!scopes.includes('write')) {
        return new Response(JSON.stringify({ error: 'Insufficient scope: write required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const body = await req.json();
      const { prompt, config } = body;

      if (!prompt) {
        return new Response(JSON.stringify({ error: 'prompt is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Call the omniscient function
      const response = await fetch(`${supabaseUrl}/functions/v1/omniscient`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ prompt, config: config || {} })
      });

      const result = await response.json();

      // Log usage
      await supabase.from('api_usage_logs').insert({
        api_key_id: apiKeyId,
        endpoint: '/data/collect',
        method: 'POST',
        status_code: response.status,
        response_time_ms: Date.now() - startTime,
        request_body: { prompt },
        response_size_bytes: JSON.stringify(result).length
      });

      return new Response(JSON.stringify(result), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route: Natural Language Query
    if (path === '/data/nl-query' && req.method === 'POST') {
      if (!scopes.includes('read')) {
        return new Response(JSON.stringify({ error: 'Insufficient scope: read required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const body = await req.json();
      const { query: nlQuery } = body;

      if (!nlQuery) {
        return new Response(JSON.stringify({ error: 'query is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Call the nl-query function
      const response = await fetch(`${supabaseUrl}/functions/v1/nl-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ query: nlQuery, user_id: userId, api_key_id: apiKeyId })
      });

      const result = await response.json();

      // Log usage
      await supabase.from('api_usage_logs').insert({
        api_key_id: apiKeyId,
        endpoint: '/data/nl-query',
        method: 'POST',
        status_code: response.status,
        response_time_ms: Date.now() - startTime,
        request_body: { query: nlQuery },
        response_size_bytes: JSON.stringify(result).length
      });

      return new Response(JSON.stringify(result), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route: Get source statistics
    if (path === '/sources' && req.method === 'GET') {
      const { data: sources, error: sourcesError } = await supabase
        .from('source_performance')
        .select('*')
        .order('total_records_collected', { ascending: false });

      if (sourcesError) throw sourcesError;

      return new Response(JSON.stringify({ sources }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route: Get categories
    if (path === '/categories' && req.method === 'GET') {
      const { data: categories, error: catError } = await supabase
        .from('records')
        .select('category')
        .limit(1000);

      if (catError) throw catError;

      const categoryCounts = categories?.reduce((acc: Record<string, number>, r) => {
        acc[r.category] = (acc[r.category] || 0) + 1;
        return acc;
      }, {});

      return new Response(JSON.stringify({ categories: categoryCounts }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route: API usage stats
    if (path === '/usage' && req.method === 'GET') {
      const { data: usage, error: usageError } = await supabase
        .from('api_usage_logs')
        .select('endpoint, method, status_code, response_time_ms, created_at')
        .eq('api_key_id', apiKeyId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (usageError) throw usageError;

      const { data: keyStats } = await supabase
        .from('api_keys')
        .select('requests_today, rate_limit_per_day, rate_limit_per_minute')
        .eq('id', apiKeyId)
        .single();

      return new Response(JSON.stringify({
        today: {
          requests: keyStats?.requests_today || 0,
          limit: keyStats?.rate_limit_per_day || 10000
        },
        rate_limit_per_minute: keyStats?.rate_limit_per_minute || 60,
        recent_requests: usage
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Default: Not found
    return new Response(JSON.stringify({
      error: 'Endpoint not found',
      available_endpoints: [
        'POST /keys - Create API key (auth required)',
        'GET /keys - List your API keys (auth required)',
        'DELETE /keys/:id - Revoke API key (auth required)',
        'POST /data/query - Query the data lake',
        'POST /data/collect - Run OMNISCIENT collection',
        'POST /data/nl-query - Natural language query',
        'GET /sources - Get source statistics',
        'GET /categories - Get data categories',
        'GET /usage - Get your API usage'
      ]
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Developer API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
