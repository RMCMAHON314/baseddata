// OMNISCIENT Natural Language SQL Engine
// Query your data lake with plain English using AI

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schema context for the AI
const SCHEMA_CONTEXT = `
You are a SQL query generator for a geospatial data lake. Generate PostgreSQL queries for the following schema:

TABLE: records
- id: UUID (primary key)
- source_id: TEXT (API source identifier)
- source_record_id: TEXT (unique ID from source)
- category: TEXT (wildlife, weather, marine, government, economic, geospatial, transportation, energy, health, regulations, recreation)
- name: TEXT (record title/name)
- description: TEXT (detailed description)
- geometry: JSONB (GeoJSON geometry with coordinates)
- properties: JSONB (all additional metadata)
- quality_score: FLOAT (0-1, crowd-validated quality)
- collected_at: TIMESTAMPTZ
- last_seen_at: TIMESTAMPTZ
- seen_count: INTEGER

TABLE: source_performance
- source_id: TEXT
- source_name: TEXT
- total_requests: INTEGER
- successful_requests: INTEGER
- reliability_score: FLOAT (0-1)
- total_records_collected: INTEGER

TABLE: location_cache
- name: TEXT (location name)
- center: JSONB (lat/lng)
- state: TEXT
- country: TEXT

RULES:
1. Only generate SELECT queries - no INSERT, UPDATE, DELETE, or DDL
2. Use JSONB operators for geometry and properties (e.g., properties->>'key', geometry->'coordinates')
3. Limit results to 100 unless user specifies more
4. For location queries, join with location_cache or search properties
5. For time-based queries, use collected_at or last_seen_at columns
6. Always include ORDER BY for consistent results
7. Return ONLY the SQL query, no explanations
`;

interface NLQueryRequest {
  query: string;
  user_id?: string;
  api_key_id?: string;
}

// Safely check if string could be SQL injection
function isSafeQuery(sql: string): boolean {
  const dangerous = [
    /\bDROP\b/i,
    /\bDELETE\b/i,
    /\bTRUNCATE\b/i,
    /\bALTER\b/i,
    /\bCREATE\b/i,
    /\bINSERT\b/i,
    /\bUPDATE\b/i,
    /\bEXEC\b/i,
    /\bEXECUTE\b/i,
    /--/,
    /;.*SELECT/i,
    /UNION\s+ALL/i,
  ];

  return !dangerous.some(pattern => pattern.test(sql));
}

// Parse SQL for read-only operations
function isReadOnlyQuery(sql: string): boolean {
  const normalized = sql.trim().toUpperCase();
  return normalized.startsWith('SELECT') || normalized.startsWith('WITH');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { query: nlQuery, user_id, api_key_id } = await req.json() as NLQueryRequest;

    if (!nlQuery || nlQuery.trim().length < 3) {
      return new Response(JSON.stringify({ 
        error: 'Query too short',
        message: 'Please provide a more descriptive query'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing NL query: "${nlQuery}"`);

    let generatedSQL = '';
    let explanation = '';

    // Use Lovable AI to generate SQL
    if (lovableApiKey) {
      try {
        const response = await fetch('https://api.lovable.dev/api/v1/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lovableApiKey}`
          },
          body: JSON.stringify({
            model: 'openai/gpt-5-mini',
            messages: [
              { role: 'system', content: SCHEMA_CONTEXT },
              { role: 'user', content: `Generate a PostgreSQL SELECT query for: "${nlQuery}"` }
            ],
            max_tokens: 500,
            temperature: 0.1
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawSQL = data.choices?.[0]?.message?.content || '';
          
          // Extract SQL from response (may have markdown code blocks)
          const sqlMatch = rawSQL.match(/```sql\n?([\s\S]*?)\n?```/) || 
                          rawSQL.match(/```\n?([\s\S]*?)\n?```/) ||
                          [null, rawSQL];
          generatedSQL = sqlMatch[1]?.trim() || rawSQL.trim();
        }
      } catch (aiError) {
        console.error('AI SQL generation failed:', aiError);
      }
    }

    // Fallback: Pattern-based SQL generation
    if (!generatedSQL) {
      generatedSQL = generateFallbackSQL(nlQuery);
      explanation = 'Generated using pattern matching (AI unavailable)';
    }

    // Safety checks
    if (!isSafeQuery(generatedSQL) || !isReadOnlyQuery(generatedSQL)) {
      return new Response(JSON.stringify({
        error: 'Invalid query generated',
        message: 'Only SELECT queries are allowed'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Generated SQL: ${generatedSQL}`);

    // Execute the query using a dedicated read-only function
    const { data: results, error: queryError } = await supabase.rpc('execute_nl_query', {
      p_sql: generatedSQL
    });

    const executionTime = Date.now() - startTime;
    const wasSuccessful = !queryError;

    // Log the query
    await supabase.from('nl_queries').insert({
      user_id,
      api_key_id,
      natural_query: nlQuery,
      generated_sql: generatedSQL,
      explanation,
      result_count: results?.length || 0,
      execution_time_ms: executionTime,
      was_successful: wasSuccessful,
      error_message: queryError?.message
    });

    if (queryError) {
      return new Response(JSON.stringify({
        error: 'Query execution failed',
        message: queryError.message,
        generated_sql: generatedSQL
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      natural_query: nlQuery,
      generated_sql: generatedSQL,
      explanation,
      result_count: results?.length || 0,
      execution_time_ms: executionTime,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('NL Query error:', error);
    return new Response(JSON.stringify({
      error: 'Processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Pattern-based fallback SQL generator
function generateFallbackSQL(query: string): string {
  const q = query.toLowerCase();
  
  // Category queries
  const categories = ['wildlife', 'weather', 'marine', 'government', 'economic', 'geospatial', 'transportation', 'energy', 'health', 'regulations', 'recreation'];
  for (const cat of categories) {
    if (q.includes(cat)) {
      return `SELECT * FROM records WHERE category = '${cat}' ORDER BY collected_at DESC LIMIT 100`;
    }
  }

  // Time-based queries
  if (q.includes('last week') || q.includes('past week')) {
    return `SELECT * FROM records WHERE collected_at >= NOW() - INTERVAL '7 days' ORDER BY collected_at DESC LIMIT 100`;
  }
  if (q.includes('today') || q.includes('recent')) {
    return `SELECT * FROM records WHERE collected_at >= NOW() - INTERVAL '1 day' ORDER BY collected_at DESC LIMIT 100`;
  }
  if (q.includes('last month') || q.includes('past month')) {
    return `SELECT * FROM records WHERE collected_at >= NOW() - INTERVAL '30 days' ORDER BY collected_at DESC LIMIT 100`;
  }

  // Count queries
  if (q.includes('how many') || q.includes('count')) {
    if (q.includes('source')) {
      return `SELECT source_id, COUNT(*) as count FROM records GROUP BY source_id ORDER BY count DESC LIMIT 50`;
    }
    return `SELECT category, COUNT(*) as count FROM records GROUP BY category ORDER BY count DESC`;
  }

  // Top/best queries
  if (q.includes('top') || q.includes('best') || q.includes('highest quality')) {
    return `SELECT * FROM records WHERE quality_score > 0.7 ORDER BY quality_score DESC, collected_at DESC LIMIT 100`;
  }

  // Source performance
  if (q.includes('source') && (q.includes('performance') || q.includes('reliability'))) {
    return `SELECT * FROM source_performance ORDER BY reliability_score DESC, total_records_collected DESC LIMIT 50`;
  }

  // Location queries
  const locationMatch = q.match(/(?:in|near|around|from)\s+([a-zA-Z\s]+?)(?:\s+|$)/);
  if (locationMatch) {
    const location = locationMatch[1].trim();
    return `SELECT * FROM records WHERE properties::text ILIKE '%${location}%' OR description ILIKE '%${location}%' ORDER BY collected_at DESC LIMIT 100`;
  }

  // Default: recent records
  return `SELECT * FROM records ORDER BY collected_at DESC LIMIT 100`;
}
