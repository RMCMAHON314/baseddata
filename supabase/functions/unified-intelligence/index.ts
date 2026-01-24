// ============================================================
// 🧠 UNIFIED INTELLIGENCE API
// One endpoint to rule them all
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActionParams {
  query?: string;
  entity_id?: string;
  depth?: number;
  min_strength?: number;
  limit?: number;
  filter_by?: string;
  filter_value?: string;
  state?: string;
  top_n?: number;
  min_score?: number;
  trend?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { action, params = {} } = await req.json() as { action: string; params: ActionParams };

    console.log('🧠 UNIFIED INTELLIGENCE:', action);
    let result: Record<string, unknown>;

    switch (action) {
      // ==========================================
      // QUERY ACTIONS
      // ==========================================
      case 'search':
        // AI-powered search with full context
        const searchResult = await supabase.functions.invoke('omniscient-ai', {
          body: { query: params.query, mode: 'intelligent' }
        });
        result = searchResult.data;
        break;

      case 'context':
        // Get unified context for a query
        const { data: context } = await supabase.rpc('build_unified_context', {
          p_query: params.query
        });
        result = { context };
        break;

      // ==========================================
      // ENTITY ACTIONS
      // ==========================================
      case 'entity.profile':
        // Full 360° profile
        const { data: profile } = await supabase
          .from('entity_360_profiles')
          .select('*')
          .eq('id', params.entity_id)
          .single();
        result = { profile };
        break;

      case 'entity.briefing':
        // AI-generated briefing
        const { data: briefing } = await supabase.rpc('generate_entity_briefing', {
          p_entity_id: params.entity_id
        });
        result = { briefing };
        break;

      case 'entity.network':
        // Relationship network
        const { data: network } = await supabase.rpc('get_entity_network', {
          p_entity_id: params.entity_id,
          p_depth: params.depth || 2,
          p_min_strength: params.min_strength || 0.3
        });
        result = { network };
        break;

      case 'entity.competitors':
        // Find competitors
        const { data: competitors } = await supabase.rpc('find_competitors', {
          p_entity_id: params.entity_id,
          p_limit: params.limit || 10
        });
        result = { competitors };
        break;

      case 'entity.timeline':
        // Entity timeline
        const { data: timeline } = await supabase
          .from('entity_timeline')
          .select('*')
          .eq('entity_id', params.entity_id)
          .order('recorded_at', { ascending: false })
          .limit(params.limit || 50);
        result = { timeline };
        break;

      // ==========================================
      // MARKET ACTIONS
      // ==========================================
      case 'market.concentration':
        const { data: concentration } = await supabase
          .from('market_concentration')
          .select('*')
          .eq(params.filter_by || 'state', params.filter_value)
          .limit(50);
        result = { concentration };
        break;

      case 'market.leaders':
        const { data: leaders } = await supabase
          .from('market_leaders')
          .select('*')
          .eq('state', params.state)
          .lte('market_rank', params.top_n || 10);
        result = { leaders };
        break;

      case 'market.opportunities':
        const { data: opportunities } = await supabase
          .from('high_value_opportunities')
          .select('*')
          .gte('opportunity_score', params.min_score || 60)
          .limit(params.limit || 20);
        result = { opportunities };
        break;

      // ==========================================
      // INTELLIGENCE ACTIONS
      // ==========================================
      case 'intel.alerts':
        const { data: alerts } = await supabase
          .from('intelligence_alerts')
          .select('*')
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(params.limit || 20);
        result = { alerts };
        break;

      case 'intel.dashboard':
        const { data: dashboard } = await supabase
          .from('realtime_dashboard')
          .select('*');
        result = { 
          dashboard: Object.fromEntries(
            (dashboard || []).map((d: { metric: string; value: string }) => [d.metric, d.value])
          )
        };
        break;

      case 'intel.trends':
        const { data: trends } = await supabase
          .from('entity_growth_trends')
          .select('*')
          .eq('trend', params.trend || 'GROWING')
          .limit(20);
        result = { trends };
        break;

      // ==========================================
      // ANALYSIS ACTIONS
      // ==========================================
      case 'analyze.agency':
        const { data: agencyData } = await supabase
          .from('agency_spending_analysis')
          .select('*')
          .order('total_awarded', { ascending: false })
          .limit(20);
        result = { agency_analysis: agencyData };
        break;

      case 'analyze.pharma':
        const { data: pharmaData } = await supabase
          .from('pharma_payment_analysis')
          .select('*')
          .order('total_paid', { ascending: false })
          .limit(20);
        result = { pharma_analysis: pharmaData };
        break;

      // ==========================================
      // FLYWHEEL ACTIONS
      // ==========================================
      case 'flywheel.status':
        const { data: queueData } = await supabase
          .from('flywheel_discovery_queue')
          .select('status')
          .eq('status', 'pending');
        
        const { data: recentCrawls } = await supabase
          .from('flywheel_crawl_log')
          .select('*')
          .order('crawled_at', { ascending: false })
          .limit(5);
        
        result = { 
          queue_depth: queueData?.length || 0,
          recent_crawls: recentCrawls
        };
        break;

      case 'flywheel.trigger':
        // Trigger the Kraken
        const krakenResult = await supabase.functions.invoke('kraken', {
          body: { mode: 'full_cycle' }
        });
        result = { kraken: krakenResult.data };
        break;

      case 'flywheel.health':
        // Get comprehensive flywheel health
        const { data: flywheelHealth } = await supabase.rpc('get_flywheel_health');
        result = { health: flywheelHealth };
        break;

      // ==========================================
      // SYSTEM HEALTH ACTIONS
      // ==========================================
      case 'system.metrics':
        const { data: entities } = await supabase
          .from('core_entities')
          .select('id', { count: 'exact' });
        
        const { data: facts } = await supabase
          .from('core_facts')
          .select('id', { count: 'exact' });
        
        const { data: relationships } = await supabase
          .from('core_relationships')
          .select('id', { count: 'exact' });
        
        const { data: insights } = await supabase
          .from('core_derived_insights')
          .select('id', { count: 'exact' });
        
        result = {
          metrics: {
            entities: entities?.length || 0,
            facts: facts?.length || 0,
            relationships: relationships?.length || 0,
            insights: insights?.length || 0
          }
        };
        break;

      case 'system.initialize':
        // Initialize all intelligence systems
        await supabase.rpc('calculate_opportunity_scores');
        await supabase.rpc('calculate_network_influence');
        await supabase.rpc('generate_intelligence_alerts');
        result = { initialized: true };
        break;

      default:
        throw new Error('Unknown action: ' + action);
    }

    console.log('✅ Action completed:', action);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ UNIFIED INTELLIGENCE ERROR:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
