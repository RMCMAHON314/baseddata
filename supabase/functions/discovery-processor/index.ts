// ============================================================================
// BASED DATA v7.0 - Discovery Processor Edge Function
// The heart of the Continuous Discovery Engine
// Validates APIs → Generates Collectors → Tests → Approves
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_AI_URL = 'https://api-prod.lovable.dev/ai/generate';
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') || '';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SourceDiscovery {
  id: string;
  trigger_type: string;
  trigger_prompt?: string;
  target_api_url?: string;
  target_api_name: string;
  target_description?: string;
  inferred_categories: string[];
  inferred_keywords: string[];
  confidence_score: number;
  priority: number;
  status: string;
  generation_attempts: number;
  error_count: number;
}

interface DynamicCollector {
  name: string;
  description: string;
  api_url: string;
  api_method: string;
  headers: Record<string, string>;
  params_template: Record<string, string>;
  response_mapping: {
    features_path: string;
    lat_path: string;
    lng_path: string;
    name_path: string;
    description_path?: string;
    id_path?: string;
  };
  categories: string[];
  keywords: string[];
}

interface ProcessingResult {
  discovery_id: string;
  status: 'approved' | 'rejected' | 'failed';
  collector_id?: string;
  error?: string;
  records_collected?: number;
}

// ============================================================================
// VALIDATION PHASE
// ============================================================================

async function validateApiEndpoint(discovery: SourceDiscovery): Promise<{ valid: boolean; details: Record<string, any> }> {
  if (!discovery.target_api_url) {
    return { valid: false, details: { error: 'No API URL provided' } };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(discovery.target_api_url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'BASEDDATA/7.0 Discovery Validator' },
    });
    
    clearTimeout(timeout);
    
    return {
      valid: response.ok || response.status === 405, // 405 = Method not allowed (API exists but doesn't support HEAD)
      details: {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        accessible: true,
      },
    };
  } catch (error) {
    return {
      valid: false,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        accessible: false,
      },
    };
  }
}

// ============================================================================
// AI COLLECTOR GENERATION (GENESIS)
// ============================================================================

async function generateCollector(discovery: SourceDiscovery): Promise<DynamicCollector | null> {
  const systemPrompt = `You are an EXPERT API integration engineer with encyclopedic knowledge of public data sources.

Your task: Generate a working collector configuration for the provided API.

## CRITICAL REQUIREMENTS:
1. The api_url MUST be a valid, working endpoint
2. Use {lat}, {lng}, {bbox}, {query}, {keyword}, {location} as placeholders
3. The response_mapping must correctly extract data from the API response
4. Only use FREE, public, no-auth APIs

Return ONLY valid JSON in this exact format:
{
  "name": "Source Name",
  "description": "What data it provides",
  "api_url": "https://api.example.com/endpoint?lat={lat}&lng={lng}",
  "api_method": "GET",
  "headers": {},
  "params_template": {},
  "response_mapping": {
    "features_path": "data.results",
    "lat_path": "latitude",
    "lng_path": "longitude", 
    "name_path": "title",
    "description_path": "description",
    "id_path": "id"
  },
  "categories": ["GEOSPATIAL"],
  "keywords": ["relevant", "keywords"]
}`;

  try {
    const userPrompt = `Generate a collector for this API discovery:
Name: ${discovery.target_api_name}
URL: ${discovery.target_api_url || 'Unknown - you must find a suitable API'}
Description: ${discovery.target_description || 'No description'}
Categories needed: ${discovery.inferred_categories.join(', ')}
Keywords: ${discovery.inferred_keywords.join(', ')}
Original query: ${discovery.trigger_prompt || 'General data collection'}

If the URL is unknown, use your knowledge to find the BEST public API for this data type.`;

    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      console.error('AI generation failed:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No valid JSON in AI response');
      return null;
    }
    
    return JSON.parse(jsonMatch[0]) as DynamicCollector;
  } catch (error) {
    console.error('Collector generation error:', error);
    return null;
  }
}

// ============================================================================
// TESTING PHASE
// ============================================================================

async function testCollector(collector: DynamicCollector): Promise<{ success: boolean; recordCount: number; error?: string }> {
  try {
    // Build test URL with sample coordinates (NYC as default)
    let testUrl = collector.api_url
      .replace('{lat}', '40.7128')
      .replace('{lng}', '-74.0060')
      .replace('{bbox}', '-74.1,40.6,-73.9,40.8')
      .replace('{minlat}', '40.6')
      .replace('{maxlat}', '40.8')
      .replace('{minlng}', '-74.1')
      .replace('{maxlng}', '-73.9')
      .replace('{query}', 'test')
      .replace('{keyword}', 'data')
      .replace('{location}', 'New York');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(testUrl, {
      method: collector.api_method,
      headers: { 
        'User-Agent': 'BASEDDATA/7.0 Collector Test',
        ...collector.headers,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      return { success: false, recordCount: 0, error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    
    // Navigate to features path
    let features = data;
    for (const key of collector.response_mapping.features_path.split('.')) {
      features = features?.[key];
    }
    
    const recordCount = Array.isArray(features) ? features.length : (features ? 1 : 0);
    
    return {
      success: recordCount > 0,
      recordCount,
    };
  } catch (error) {
    return {
      success: false,
      recordCount: 0,
      error: error instanceof Error ? error.message : 'Test failed',
    };
  }
}

// ============================================================================
// MAIN PROCESSING PIPELINE
// ============================================================================

async function processDiscovery(supabase: any, discovery: SourceDiscovery): Promise<ProcessingResult> {
  const startTime = Date.now();
  
  try {
    // Phase 1: Validation
    await supabase.rpc('update_discovery_status', {
      p_discovery_id: discovery.id,
      p_status: 'validating',
    });
    
    if (discovery.target_api_url) {
      const validation = await validateApiEndpoint(discovery);
      if (!validation.valid) {
        // Continue anyway - AI might find a better URL
        console.log('Validation failed, proceeding to genesis:', validation.details.error);
      }
    }
    
    // Phase 2: AI Collector Generation
    await supabase.rpc('update_discovery_status', {
      p_discovery_id: discovery.id,
      p_status: 'generating',
    });
    
    const collector = await generateCollector(discovery);
    if (!collector) {
      await supabase.rpc('update_discovery_status', {
        p_discovery_id: discovery.id,
        p_status: 'failed',
        p_error_message: 'AI failed to generate collector',
      });
      return { discovery_id: discovery.id, status: 'failed', error: 'Generation failed' };
    }
    
    // Phase 3: Testing
    await supabase.rpc('update_discovery_status', {
      p_discovery_id: discovery.id,
      p_status: 'testing',
    });
    
    const testResult = await testCollector(collector);
    if (!testResult.success) {
      await supabase.rpc('update_discovery_status', {
        p_discovery_id: discovery.id,
        p_status: 'failed',
        p_error_message: testResult.error || 'Test returned no records',
      });
      return { discovery_id: discovery.id, status: 'failed', error: testResult.error };
    }
    
    // Phase 4: Archive collector to database
    const { data: collectorData, error: insertError } = await supabase
      .from('dynamic_collectors')
      .insert({
        name: collector.name,
        description: collector.description,
        api_url: collector.api_url,
        api_method: collector.api_method,
        headers: collector.headers,
        params_template: collector.params_template,
        response_mapping: collector.response_mapping,
        categories: collector.categories,
        keywords: collector.keywords,
        created_by_prompt: discovery.trigger_prompt,
        is_active: true,
      })
      .select()
      .single();
    
    if (insertError) {
      await supabase.rpc('update_discovery_status', {
        p_discovery_id: discovery.id,
        p_status: 'failed',
        p_error_message: insertError.message,
      });
      return { discovery_id: discovery.id, status: 'failed', error: insertError.message };
    }
    
    // Phase 5: Approve
    await supabase.rpc('update_discovery_status', {
      p_discovery_id: discovery.id,
      p_status: 'approved',
      p_generated_collector_id: collectorData.id,
    });
    
    console.log(`✅ Discovery approved: ${collector.name} (${testResult.recordCount} records)`);
    
    return {
      discovery_id: discovery.id,
      status: 'approved',
      collector_id: collectorData.id,
      records_collected: testResult.recordCount,
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Processing failed';
    await supabase.rpc('update_discovery_status', {
      p_discovery_id: discovery.id,
      p_status: 'failed',
      p_error_message: errorMessage,
    });
    return { discovery_id: discovery.id, status: 'failed', error: errorMessage };
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { action, discovery_id, batch_size = 5 } = await req.json().catch(() => ({}));

    if (action === 'process_single' && discovery_id) {
      // Process a specific discovery
      const { data: discovery, error } = await supabase
        .from('source_discoveries')
        .select('*')
        .eq('id', discovery_id)
        .single();
      
      if (error || !discovery) {
        return new Response(JSON.stringify({ error: 'Discovery not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const result = await processDiscovery(supabase, discovery as SourceDiscovery);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (action === 'process_queue' || !action) {
      // Process pending discoveries in batch
      const { data: discoveries, error } = await supabase
        .from('source_discoveries')
        .select('*')
        .eq('status', 'pending')
        .lt('generation_attempts', 3)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(batch_size);
      
      if (error) {
        throw error;
      }
      
      if (!discoveries?.length) {
        return new Response(JSON.stringify({
          success: true,
          message: 'No pending discoveries',
          processed: 0,
          approved: 0,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const results: ProcessingResult[] = [];
      
      for (const discovery of discoveries as SourceDiscovery[]) {
        const result = await processDiscovery(supabase, discovery);
        results.push(result);
      }
      
      const approved = results.filter(r => r.status === 'approved').length;
      const failed = results.filter(r => r.status === 'failed').length;
      
      // Update daily metrics
      await supabase.rpc('update_discovery_status', {
        p_discovery_id: discoveries[0].id, // Trigger metrics update
        p_status: discoveries[0].status, // Keep current status
      });
      
      return new Response(JSON.stringify({
        success: true,
        processed: results.length,
        approved,
        failed,
        results,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (action === 'analyze_gaps') {
      // Run gap analysis
      const { data: gaps, error } = await supabase.rpc('analyze_data_gaps');
      
      if (error) throw error;
      
      // Queue discoveries for identified gaps
      let queued = 0;
      for (const gap of gaps || []) {
        if (gap.gap_type === 'categorical' && gap.target_category) {
          await supabase.rpc('queue_discovery', {
            p_trigger_type: 'gap_analysis',
            p_target_api_name: `${gap.target_category} Data Source`,
            p_target_description: gap.gap_description,
            p_inferred_categories: [gap.target_category],
            p_inferred_keywords: gap.target_keywords,
            p_priority: Math.min(10, Math.floor(gap.severity * 10)),
            p_confidence: 0.6,
          });
          queued++;
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        gaps_found: gaps?.length || 0,
        discoveries_queued: queued,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Discovery processor error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
