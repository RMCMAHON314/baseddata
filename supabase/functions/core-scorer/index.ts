// ============================================================
// 🧠 THE CORE: SCORING ENGINE
// Continuously computes and updates entity scores
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EntityData {
  id: string;
  canonical_name: string;
  entity_type: string;
  merged_data: Record<string, unknown>;
  source_records: Array<{ source: string; record_id: string; confidence: number }>;
  source_count: number;
  last_source_update: string;
  last_verified_at: string | null;
  data_quality_score: number | null;
}

interface EntityScores {
  health_score: number;
  risk_score: number;
  opportunity_score: number;
  data_quality_score: number;
}

// Calculate data completeness (0-100)
function measureCompleteness(data: Record<string, unknown>): number {
  const importantFields = [
    'name', 'address', 'city', 'state', 'phone', 'email', 'website',
    'description', 'category', 'latitude', 'longitude'
  ];
  
  let filledCount = 0;
  for (const field of importantFields) {
    if (data[field] && String(data[field]).trim() !== '') {
      filledCount++;
    }
  }
  
  return Math.round((filledCount / importantFields.length) * 100);
}

// Calculate data freshness score (0-100)
function measureFreshness(lastUpdate: string | null): number {
  if (!lastUpdate) return 20;
  
  const daysSinceUpdate = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceUpdate < 1) return 100;
  if (daysSinceUpdate < 7) return 90;
  if (daysSinceUpdate < 30) return 75;
  if (daysSinceUpdate < 90) return 60;
  if (daysSinceUpdate < 365) return 40;
  return 20;
}

// Calculate health score based on data quality and sources
function calculateHealthScore(entity: EntityData): number {
  let score = 0;
  
  // Data completeness (40% weight)
  const completeness = measureCompleteness(entity.merged_data || {});
  score += completeness * 0.4;
  
  // Source count (20% weight) - more sources = more reliable
  const sourceScore = Math.min(entity.source_count * 15, 100);
  score += sourceScore * 0.2;
  
  // Data freshness (20% weight)
  const freshnessScore = measureFreshness(entity.last_source_update);
  score += freshnessScore * 0.2;
  
  // Verification status (10% weight)
  const verifiedScore = entity.last_verified_at ? 100 : 30;
  score += verifiedScore * 0.1;
  
  // No data conflicts (10% weight) - assume no conflicts for now
  score += 80 * 0.1;
  
  return Math.round(Math.max(0, Math.min(100, score)));
}

// Calculate risk score based on data patterns
function calculateRiskScore(entity: EntityData, facts: Array<{ fact_type: string; fact_value: unknown }>): number {
  let score = 25; // Base low risk
  
  const data = entity.merged_data || {};
  
  // Check for violation indicators
  const violationKeywords = ['violation', 'fine', 'penalty', 'exclusion', 'debarment', 'lawsuit'];
  const dataStr = JSON.stringify(data).toLowerCase();
  
  for (const keyword of violationKeywords) {
    if (dataStr.includes(keyword)) {
      score += 15;
    }
  }
  
  // Check facts for violations
  for (const fact of facts) {
    if (fact.fact_type === 'violation' || fact.fact_type === 'exclusion') {
      score += 20;
    }
  }
  
  // Low data quality increases risk
  const qualityScore = entity.data_quality_score || 50;
  if (qualityScore < 40) {
    score += 15;
  }
  
  // Single source increases uncertainty risk
  if (entity.source_count <= 1) {
    score += 10;
  }
  
  return Math.round(Math.max(0, Math.min(100, score)));
}

// Calculate opportunity score
function calculateOpportunityScore(entity: EntityData, facts: Array<{ fact_type: string; fact_value: unknown }>): number {
  let score = 50; // Base neutral
  
  const data = entity.merged_data || {};
  
  // Growth indicators
  const growthKeywords = ['growth', 'expanding', 'hiring', 'new', 'award', 'grant'];
  const dataStr = JSON.stringify(data).toLowerCase();
  
  for (const keyword of growthKeywords) {
    if (dataStr.includes(keyword)) {
      score += 5;
    }
  }
  
  // Contract/payment facts indicate opportunity
  for (const fact of facts) {
    if (fact.fact_type === 'contract_value' || fact.fact_type === 'payment_received') {
      score += 10;
    }
  }
  
  // Multiple sources = more visibility = more opportunity
  if (entity.source_count >= 3) {
    score += 10;
  }
  
  // High data quality = more actionable
  if ((entity.data_quality_score || 0) > 70) {
    score += 10;
  }
  
  return Math.round(Math.max(0, Math.min(100, score)));
}

// Calculate data quality score
function calculateDataQualityScore(entity: EntityData): number {
  let score = 0;
  
  // Completeness (40%)
  const completeness = measureCompleteness(entity.merged_data || {});
  score += completeness * 0.4;
  
  // Timeliness (30%)
  const freshness = measureFreshness(entity.last_source_update);
  score += freshness * 0.3;
  
  // Consistency - multiple sources agreeing (20%)
  const consistencyScore = entity.source_count > 1 ? 80 : 50;
  score += consistencyScore * 0.2;
  
  // Accuracy proxy - verified status (10%)
  const accuracyScore = entity.last_verified_at ? 100 : 50;
  score += accuracyScore * 0.1;
  
  return Math.round(Math.max(0, Math.min(100, score)));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { entity_ids, batch_size = 100 } = await req.json() as {
      entity_ids?: string[];
      batch_size?: number;
    };

    console.log(`[core-scorer] Starting scoring run`);
    const startTime = Date.now();

    let entitiesQuery = supabase
      .from('core_entities')
      .select('*')
      .order('updated_at', { ascending: true })
      .limit(batch_size);

    if (entity_ids && entity_ids.length > 0) {
      entitiesQuery = entitiesQuery.in('id', entity_ids);
    }

    const { data: entities, error } = await entitiesQuery;

    if (error) {
      throw new Error(`Failed to fetch entities: ${error.message}`);
    }

    if (!entities || entities.length === 0) {
      return new Response(
        JSON.stringify({ success: true, scored: 0, message: 'No entities to score' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[core-scorer] Scoring ${entities.length} entities`);

    let scored = 0;
    const scoreUpdates: Array<{ id: string; scores: EntityScores }> = [];

    for (const entity of entities) {
      try {
        // Get facts for this entity
        const { data: facts } = await supabase
          .from('core_facts')
          .select('fact_type, fact_value')
          .eq('entity_id', entity.id);

        const entityFacts = facts || [];

        // Calculate all scores
        const healthScore = calculateHealthScore(entity as EntityData);
        const riskScore = calculateRiskScore(entity as EntityData, entityFacts);
        const opportunityScore = calculateOpportunityScore(entity as EntityData, entityFacts);
        const dataQualityScore = calculateDataQualityScore(entity as EntityData);

        const scores: EntityScores = {
          health_score: healthScore,
          risk_score: riskScore,
          opportunity_score: opportunityScore,
          data_quality_score: dataQualityScore
        };

        // Update entity
        await supabase
          .from('core_entities')
          .update({
            ...scores,
            updated_at: new Date().toISOString()
          })
          .eq('id', entity.id);

        // Record in history if significant change
        const oldHealth = entity.health_score || 0;
        const oldRisk = entity.risk_score || 0;
        
        if (Math.abs(healthScore - oldHealth) > 10 || Math.abs(riskScore - oldRisk) > 10) {
          await supabase
            .from('core_entity_history')
            .insert({
              entity_id: entity.id,
              change_type: 'score_update',
              old_values: {
                health_score: entity.health_score,
                risk_score: entity.risk_score,
                opportunity_score: entity.opportunity_score,
                data_quality_score: entity.data_quality_score
              },
              new_values: scores,
              change_source: 'score_computation',
              change_reason: 'Periodic score recalculation'
            });
        }

        scoreUpdates.push({ id: entity.id, scores });
        scored++;

      } catch (err) {
        console.error(`[core-scorer] Error scoring entity ${entity.id}:`, err);
      }
    }

    // Update daily metrics
    await supabase.rpc('update_intelligence_metrics');

    const processingTime = Date.now() - startTime;
    console.log(`[core-scorer] Scored ${scored} entities in ${processingTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        scored,
        processing_time_ms: processingTime,
        updates: scoreUpdates
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[core-scorer] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
