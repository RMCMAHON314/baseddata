// ============================================================
// ♾️ THE INFINITE ALGORITHM
// A self-perpetuating, ever-expanding data intelligence engine
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlgorithmResults {
  entities_expanded: number;
  facts_enriched: number;
  relationships_discovered: number;
  insights_generated: number;
  sources_discovered: number;
  queue_processed: number;
  queue_additions: number;
}

interface UnderExploredEntity {
  id: string;
  canonical_name: string;
  entity_type: string;
  opportunity_score: number;
  relationship_count: number;
  fact_count: number;
  state: string;
}

interface FactPoorEntity {
  id: string;
  canonical_name: string;
  entity_type: string;
  opportunity_score: number;
  fact_count: number;
}

interface TransitiveRelationship {
  from_entity_id: string;
  to_entity_id: string;
  via_entity_id: string;
  via_type: string;
  inferred_strength: number;
}

interface Anomaly {
  entity_id: string;
  entity_name: string;
  anomaly_type: string;
  description: string;
  confidence: number;
  details: Record<string, unknown>;
}

interface MarketInsight {
  market_category: string;
  market_state: string;
  description: string;
  data: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { mode = 'standard', max_queue_process = 20, action } = await req.json().catch(() => ({}));

  // Health check action
  if (action === 'status') {
    const { data: status } = await supabase
      .from('infinite_algorithm_status')
      .select('*')
      .single();
    
    return new Response(JSON.stringify({ success: true, status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  console.log(`♾️ INFINITE ALGORITHM ACTIVATED - Mode: ${mode}`);
  
  const startTime = Date.now();
  const results: AlgorithmResults = {
    entities_expanded: 0,
    facts_enriched: 0,
    relationships_discovered: 0,
    insights_generated: 0,
    sources_discovered: 0,
    queue_processed: 0,
    queue_additions: 0
  };

  try {
    // ═══════════════════════════════════════════════════════════════
    // PHASE 1: ENTITY EXPANSION
    // Find entities with few relationships and queue expansion searches
    // ═══════════════════════════════════════════════════════════════
    console.log('  → Phase 1: Entity Expansion');
    
    const { data: underExplored } = await supabase.rpc('get_under_explored_entities', {
      min_relationships: 5,
      limit_count: mode === 'deep' ? 100 : 30
    }) as { data: UnderExploredEntity[] | null };

    if (underExplored && underExplored.length > 0) {
      for (const entity of underExplored) {
        const expansions = [
          `${entity.canonical_name} Inc`,
          `${entity.canonical_name} LLC`,
          `${entity.entity_type} in ${entity.state}`,
          `${entity.canonical_name} competitors`,
          `${entity.canonical_name} subsidiaries`
        ];
        
        for (const query of expansions) {
          const { error } = await supabase.from('flywheel_discovery_queue').upsert({
            target_type: 'entity_expansion',
            target_value: query,
            source: 'infinite_algorithm',
            priority: entity.opportunity_score >= 70 ? 1 : 2,
            status: 'pending',
            metadata: { source_entity_id: entity.id, entity_name: entity.canonical_name }
          }, { onConflict: 'target_type,target_value', ignoreDuplicates: true });
          
          if (!error) results.queue_additions++;
        }
        results.entities_expanded++;
      }
      console.log(`    ✓ Queued expansion for ${results.entities_expanded} entities`);
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 2: FACT ENRICHMENT
    // Find entities with missing fact types and queue searches
    // ═══════════════════════════════════════════════════════════════
    console.log('  → Phase 2: Fact Enrichment');
    
    const { data: factPoor } = await supabase.rpc('get_fact_poor_entities', {
      min_facts: 3,
      min_opportunity_score: 40,
      limit_count: mode === 'deep' ? 100 : 30
    }) as { data: FactPoorEntity[] | null };

    if (factPoor && factPoor.length > 0) {
      for (const entity of factPoor) {
        // Get existing fact types for this entity
        const { data: existingTypes } = await supabase
          .from('core_facts')
          .select('fact_type')
          .eq('entity_id', entity.id);
        
        const existing = new Set(existingTypes?.map(f => f.fact_type) || []);
        
        // Queue searches for missing fact types
        const searches = [
          { type: 'contract_awarded', query: `${entity.canonical_name} federal contracts` },
          { type: 'grant_received', query: `${entity.canonical_name} grants` },
          { type: 'payment_received', query: `${entity.canonical_name} CMS payments` },
          { type: 'violation', query: `${entity.canonical_name} EPA violations` }
        ];
        
        for (const search of searches) {
          if (!existing.has(search.type)) {
            await supabase.from('flywheel_discovery_queue').upsert({
              target_type: 'fact_enrichment',
              target_value: search.query,
              source: 'infinite_algorithm',
              priority: 2,
              status: 'pending',
              metadata: { entity_id: entity.id, expected_fact_type: search.type }
            }, { onConflict: 'target_type,target_value', ignoreDuplicates: true });
            results.queue_additions++;
          }
        }
        results.facts_enriched++;
      }
      console.log(`    ✓ Queued enrichment for ${results.facts_enriched} entities`);
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 3: RELATIONSHIP DISCOVERY
    // Find transitive relationships (A→B, B→C implies A→C)
    // ═══════════════════════════════════════════════════════════════
    console.log('  → Phase 3: Relationship Discovery');
    
    const { data: transitiveRels } = await supabase.rpc('discover_transitive_relationships', {
      min_strength: 0.5,
      limit_count: mode === 'deep' ? 200 : 50
    }) as { data: TransitiveRelationship[] | null };

    if (transitiveRels && transitiveRels.length > 0) {
      for (const rel of transitiveRels) {
        const { error } = await supabase.from('core_relationships').upsert({
          from_entity_id: rel.from_entity_id,
          to_entity_id: rel.to_entity_id,
          relationship_type: 'inferred_' + rel.via_type,
          strength: rel.inferred_strength,
          confidence: 0.7,
          evidence: { via_entity_id: rel.via_entity_id, source: 'infinite_algorithm' }
        }, { onConflict: 'from_entity_id,to_entity_id,relationship_type', ignoreDuplicates: true });

        if (!error) results.relationships_discovered++;
      }
      console.log(`    ✓ Discovered ${results.relationships_discovered} transitive relationships`);
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 4: INSIGHT GENERATION
    // Detect anomalies and generate market insights
    // ═══════════════════════════════════════════════════════════════
    console.log('  → Phase 4: Insight Generation');
    
    // 4a. Detect anomalies
    const { data: anomalies } = await supabase.rpc('detect_anomalies', {
      lookback_days: 7,
      threshold_multiplier: 2.0
    }) as { data: Anomaly[] | null };

    if (anomalies && anomalies.length > 0) {
      for (const anomaly of anomalies) {
        await supabase.from('core_derived_insights').upsert({
          related_entities: [anomaly.entity_id],
          insight_type: 'anomaly',
          title: `Activity Spike: ${anomaly.entity_name}`,
          description: anomaly.description,
          confidence: anomaly.confidence,
          scope_type: 'entity',
          scope_value: anomaly.entity_id,
          supporting_data: anomaly.details
        }, { onConflict: 'insight_type,scope_type,scope_value', ignoreDuplicates: true });
        results.insights_generated++;
      }
    }

    // 4b. Generate market insights
    const { data: marketInsights } = await supabase.rpc('generate_market_insights') as { data: MarketInsight[] | null };
    
    if (marketInsights && marketInsights.length > 0) {
      for (const insight of marketInsights) {
        await supabase.from('core_derived_insights').upsert({
          insight_type: 'market_trend',
          title: `Market: ${insight.market_category} in ${insight.market_state}`,
          description: insight.description,
          confidence: 0.85,
          scope_type: 'market',
          scope_value: `${insight.market_category}_${insight.market_state}`,
          supporting_data: insight.data
        }, { onConflict: 'insight_type,scope_type,scope_value', ignoreDuplicates: true });
        results.insights_generated++;
      }
    }
    console.log(`    ✓ Generated ${results.insights_generated} insights`);

    // ═══════════════════════════════════════════════════════════════
    // PHASE 5: SOURCE DISCOVERY
    // Look for gaps in coverage and queue new source searches
    // ═══════════════════════════════════════════════════════════════
    console.log('  → Phase 5: Source Discovery');
    
    // Get categories with low coverage
    const { data: categoryStats } = await supabase
      .from('records')
      .select('category')
      .limit(1000);
    
    const categoryCount = categoryStats?.reduce((acc, r) => {
      if (r.category) {
        acc[r.category] = (acc[r.category] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    const lowCoverageCategories = ['Environmental', 'Education', 'Transportation', 'Energy', 'Agriculture']
      .filter(cat => (categoryCount[cat] || 0) < 100);

    for (const category of lowCoverageCategories) {
      await supabase.from('flywheel_discovery_queue').upsert({
        target_type: 'source_discovery',
        target_value: `${category} data in United States`,
        source: 'infinite_algorithm',
        priority: 2,
        status: 'pending',
        metadata: { category, reason: 'low_coverage' }
      }, { onConflict: 'target_type,target_value', ignoreDuplicates: true });
      results.sources_discovered++;
    }
    console.log(`    ✓ Queued ${results.sources_discovered} source discoveries`);

    // ═══════════════════════════════════════════════════════════════
    // PHASE 6: OPPORTUNITY RECALCULATION
    // Update opportunity scores based on new data
    // ═══════════════════════════════════════════════════════════════
    console.log('  → Phase 6: Opportunity Recalculation');
    
    const { data: updatedCount } = await supabase.rpc('recalculate_opportunity_scores', { 
      lookback_days: 30 
    });
    console.log(`    ✓ Updated ${updatedCount || 0} opportunity scores`);

    // ═══════════════════════════════════════════════════════════════
    // PHASE 7: PROCESS QUEUE
    // Execute pending discovery items through omniscient
    // ═══════════════════════════════════════════════════════════════
    console.log('  → Phase 7: Processing Queue');
    
    const { data: queueItems } = await supabase
      .from('flywheel_discovery_queue')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: true })
      .limit(max_queue_process);

    if (queueItems && queueItems.length > 0) {
      for (const item of queueItems) {
        // Mark as processing
        await supabase
          .from('flywheel_discovery_queue')
          .update({ status: 'processing', started_at: new Date().toISOString() })
          .eq('id', item.id);

        try {
          // Execute search through omniscient
          const { data: searchResults, error: searchError } = await supabase.functions.invoke('omniscient', {
            body: { query: item.target_value, limit: 50 }
          });

          if (searchError) throw searchError;

          await supabase
            .from('flywheel_discovery_queue')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString(),
              result_count: searchResults?.total_results || 0
            })
            .eq('id', item.id);
          
          results.queue_processed++;
        } catch (err) {
          await supabase
            .from('flywheel_discovery_queue')
            .update({ 
              status: 'failed', 
              error: err instanceof Error ? err.message : 'Unknown error' 
            })
            .eq('id', item.id);
        }
      }
      console.log(`    ✓ Processed ${results.queue_processed} queue items`);
    }

    // ═══════════════════════════════════════════════════════════════
    // RECORD METRICS
    // ═══════════════════════════════════════════════════════════════
    const duration = Date.now() - startTime;
    
    // Get current totals
    const { data: totals } = await supabase
      .from('infinite_algorithm_status')
      .select('*')
      .single();

    // Record this cycle
    await supabase.from('algorithm_metrics').insert({
      cycle_timestamp: new Date().toISOString(),
      duration_ms: duration,
      entities_expanded: results.entities_expanded,
      facts_enriched: results.facts_enriched,
      relationships_discovered: results.relationships_discovered,
      insights_generated: results.insights_generated,
      sources_discovered: results.sources_discovered,
      queue_processed: results.queue_processed,
      queue_additions: results.queue_additions,
      total_entities: totals?.total_entities,
      total_facts: totals?.total_facts,
      total_relationships: totals?.total_relationships
    });

    console.log(`♾️ INFINITE ALGORITHM COMPLETE in ${duration}ms`);
    console.log(JSON.stringify(results, null, 2));

    return new Response(JSON.stringify({
      success: true,
      duration_ms: duration,
      mode,
      results,
      totals: {
        entities: totals?.total_entities,
        facts: totals?.total_facts,
        relationships: totals?.total_relationships,
        insights: totals?.total_insights,
        queue_pending: totals?.queue_pending,
        avg_opportunity_score: totals?.avg_opportunity_score,
        completed_24h: totals?.completed_24h
      },
      message: '♾️ The system feeds itself. The system grows itself. The system improves itself.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('♾️ ERROR:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
