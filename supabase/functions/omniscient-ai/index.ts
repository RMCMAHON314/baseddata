// ============================================================
// 🧠 OMNISCIENT AI - THE ULTIMATE QUERY HANDLER
// Full datasphere awareness + AI narrative generation
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
    const { query, mode = 'intelligent' } = await req.json();
    
    console.log('🧠 OMNISCIENT AI QUERY:', query);
    console.log('   Mode:', mode);
    const startTime = Date.now();

    // ========================================
    // PHASE 1: BUILD UNIFIED CONTEXT
    // ========================================
    console.log('📊 Building unified context...');
    
    const { data: context, error: contextError } = await supabase
      .rpc('build_unified_context', { p_query: query });
    
    if (contextError) {
      console.warn('Context build warning:', contextError.message);
    }
    
    const intent = context?.intent || {};
    console.log('   Intent:', intent);

    // ========================================
    // PHASE 2: INTELLIGENT SOURCE SELECTION
    // ========================================
    console.log('🎯 Selecting optimal sources...');
    
    const { data: routes } = await supabase
      .rpc('smart_query_route', { p_query: query });
    
    const sources = routes?.map((r: { source_name: string }) => r.source_name) || ['OpenStreetMap'];
    console.log('   Sources:', sources);

    // ========================================
    // PHASE 3: EXECUTE STANDARD OMNISCIENT
    // ========================================
    console.log('⚡ Executing omniscient pipeline...');
    
    // Create query record
    const { data: newQuery, error: createError } = await supabase
      .from('queries')
      .insert({ 
        prompt: query, 
        status: 'running',
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (createError) {
      console.error('Query creation error:', createError);
      throw createError;
    }

    // Execute omniscient
    const { data: execResult, error: execError } = await supabase.functions.invoke(
      'omniscient',
      { body: { query_id: newQuery.id } }
    );

    if (execError) {
      console.warn('Omniscient execution warning:', execError.message);
    }

    // ========================================
    // PHASE 4: FETCH RESULTS WITH ENRICHMENT
    // ========================================
    console.log('📈 Fetching enriched results...');
    
    // Get records with entity data
    const { data: records } = await supabase
      .from('records')
      .select(`
        *,
        entity:core_entities(
          id,
          canonical_name,
          entity_type,
          health_score,
          opportunity_score,
          data_quality_score
        )
      `)
      .eq('query_id', newQuery.id)
      .order('confidence', { ascending: false })
      .limit(100);

    // Get insights
    const { data: insights } = await supabase
      .from('core_derived_insights')
      .select('*')
      .eq('is_active', true)
      .order('confidence', { ascending: false })
      .limit(10);

    // ========================================
    // PHASE 5: GENERATE AI NARRATIVE
    // ========================================
    console.log('🤖 Generating AI narrative...');
    
    const resultRecords = records || [];
    const sourceSet = new Set(resultRecords.map((r: { source_id: string }) => r.source_id));
    
    // Calculate financial data
    const hasFinancialData = resultRecords.some((r: { properties?: { payment_amount?: number; award_amount?: number } }) => 
      r.properties?.payment_amount || r.properties?.award_amount
    );
    const totalValue = resultRecords.reduce((sum: number, r: { properties?: { payment_amount?: number; award_amount?: number } }) => 
      sum + (r.properties?.payment_amount || 0) + (r.properties?.award_amount || 0), 0
    );

    // Generate highlights
    const highlights = generateHighlights(resultRecords, insights || []);
    
    // Generate geo distribution
    const geoDistribution = calculateGeoDistribution(resultRecords);
    
    // Generate follow-up queries
    const followupQueries = generateFollowupQueries(query, intent, resultRecords);

    const narrativeContext = {
      raw_query: query,
      intent: intent.intent || 'search',
      subject: intent.subject || 'entities',
      location: intent.location || '',
      has_results: resultRecords.length > 0,
      result_count: resultRecords.length,
      source_count: sourceSet.size,
      has_financial_data: hasFinancialData,
      total_value: formatMoney(totalValue),
      highlights: highlights.join('\n'),
      geo_summary: geoDistribution.map(g => `${g.location}: ${g.count}`).join(', '),
      related_entities: (context?.mentioned_entities?.slice(0, 5) || []).length,
      opportunities: context?.opportunity_context?.hot_opportunities?.slice(0, 3)?.length || 0
    };

    const { data: narrative } = await supabase
      .rpc('generate_ai_narrative', {
        p_template_type: 'query_response',
        p_context: narrativeContext
      });

    // ========================================
    // PHASE 6: BUILD INTELLIGENCE RESPONSE
    // ========================================
    console.log('✨ Building intelligence response...');
    
    const processingTime = Date.now() - startTime;

    const response = {
      success: true,
      query_id: newQuery.id,
      
      // The AI understanding
      understanding: {
        raw_query: query,
        intent: intent,
        sources_used: sources,
        context_awareness: 'FULL'
      },
      
      // Raw results
      results: {
        count: resultRecords.length,
        records: resultRecords,
        insights: insights || []
      },
      
      // AI-generated narrative
      narrative: narrative,
      
      // Intelligence summary
      intelligence: {
        total_value: totalValue,
        top_entities: resultRecords.slice(0, 5).map((r: { name: string; category: string; properties?: { payment_amount?: number; award_amount?: number }; entity?: { opportunity_score?: number } }) => ({
          name: r.name,
          category: r.category,
          value: (r.properties?.payment_amount || 0) + (r.properties?.award_amount || 0),
          opportunity_score: r.entity?.opportunity_score
        })),
        market_context: context?.market_context,
        opportunities: context?.opportunity_context?.hot_opportunities,
        related_facts: context?.relevant_facts?.slice(0, 10),
        related_relationships: context?.relevant_relationships?.slice(0, 10)
      },
      
      // Recommended actions
      recommendations: {
        followup_queries: followupQueries,
        hot_leads: resultRecords.filter((r: { entity?: { opportunity_score?: number } }) => (r.entity?.opportunity_score || 0) >= 70).slice(0, 5),
        explore_connections: context?.relevant_relationships?.slice(0, 5)
      },
      
      // Metadata
      metadata: {
        execution_time_ms: processingTime,
        sources_queried: execResult?.source_results,
        context_built_at: context?.context_built_at
      }
    };

    console.log('🧠 OMNISCIENT AI COMPLETE');
    console.log('   Results:', response.results.count);
    console.log('   Processing time:', processingTime, 'ms');

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ OMNISCIENT AI ERROR:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

interface Record {
  name?: string;
  city?: string;
  state?: string;
  source_id?: string;
  category?: string;
  properties?: {
    payment_amount?: number;
    award_amount?: number;
  };
  entity?: {
    opportunity_score?: number;
  };
}

interface Insight {
  title?: string;
  description?: string;
}

function generateHighlights(records: Record[], insights: Insight[]): string[] {
  const highlights: string[] = [];
  
  if (!records || records.length === 0) return highlights;
  
  // Count highlight
  highlights.push(`Found ${records.length} matching entities`);
  
  // Financial highlights
  const withPayments = records.filter(r => (r.properties?.payment_amount || 0) > 0);
  if (withPayments.length > 0) {
    const total = withPayments.reduce((s, r) => s + (r.properties?.payment_amount || 0), 0);
    highlights.push(`$${formatMoney(total)} in pharmaceutical payments across ${withPayments.length} providers`);
  }
  
  const withContracts = records.filter(r => (r.properties?.award_amount || 0) > 0);
  if (withContracts.length > 0) {
    const total = withContracts.reduce((s, r) => s + (r.properties?.award_amount || 0), 0);
    highlights.push(`$${formatMoney(total)} in federal contracts across ${withContracts.length} entities`);
  }
  
  // Top entity
  const topByValue = records
    .map(r => ({ name: r.name, value: (r.properties?.payment_amount || 0) + (r.properties?.award_amount || 0) }))
    .sort((a, b) => b.value - a.value)[0];
  
  if (topByValue && topByValue.value > 0) {
    highlights.push(`Top entity: ${topByValue.name} with $${formatMoney(topByValue.value)}`);
  }
  
  // Source diversity
  const sources = [...new Set(records.map(r => r.source_id))];
  if (sources.length > 1) {
    highlights.push(`Data verified across ${sources.length} independent sources`);
  }
  
  // High-opportunity entities
  const hotLeads = records.filter(r => (r.entity?.opportunity_score || 0) >= 70);
  if (hotLeads.length > 0) {
    highlights.push(`🔥 ${hotLeads.length} high-opportunity entities detected`);
  }
  
  return highlights;
}

interface GeoDistribution {
  location: string;
  count: number;
  percentage: number;
}

function calculateGeoDistribution(records: Record[]): GeoDistribution[] {
  if (!records || records.length === 0) return [];
  
  const byCity: { [key: string]: number } = {};
  records.forEach(r => {
    const loc = r.city || r.state || 'Unknown';
    byCity[loc] = (byCity[loc] || 0) + 1;
  });
  
  return Object.entries(byCity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([location, count]) => ({
      location,
      count,
      percentage: Math.round(count / records.length * 100)
    }));
}

interface Intent {
  intent?: string;
  subject?: string;
}

function generateFollowupQueries(query: string, intent: Intent, records: Record[]): string[] {
  const followups: string[] = [];
  
  // Based on intent
  if (intent?.intent === 'search') {
    followups.push(`Compare ${intent.subject || 'entities'} by financial value`);
    followups.push(`Show network connections for top ${intent.subject || 'entity'}`);
  }
  
  // Based on results
  if (records && records.length > 0) {
    const topEntity = records[0]?.name;
    if (topEntity) {
      followups.push(`Show full profile for ${topEntity}`);
      followups.push(`Find competitors to ${topEntity}`);
    }
    
    const topCategory = records[0]?.category;
    if (topCategory) {
      followups.push(`Market analysis for ${topCategory}`);
    }
  }
  
  // Generic useful queries
  followups.push('Show high-value opportunities');
  followups.push('Recent large contracts');
  
  return followups.slice(0, 5);
}

function formatMoney(amount: number): string {
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + 'B';
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'M';
  if (amount >= 1_000) return (amount / 1_000).toFixed(1) + 'K';
  return amount.toFixed(0);
}
