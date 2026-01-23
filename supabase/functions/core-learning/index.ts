// ============================================================
// 🧠 THE CORE: LEARNING ENGINE v2.0
// Enhanced pattern extraction and learning from queries
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueryPattern {
  signature: string;
  template: string;
  variables: Record<string, string>;
  category: string;
}

// ═══════════════════════════════════════════════════════════════
// ENHANCED PATTERN EXTRACTION
// ═══════════════════════════════════════════════════════════════
function extractQueryPattern(rawQuery: string): QueryPattern {
  const q = rawQuery.toLowerCase().trim();
  
  // Pattern definitions with regex and templates
  const patterns = [
    // Location patterns
    { regex: /^(.+?)\s+in\s+(.+)$/, template: '{subject} in {location}', category: 'location_search' },
    { regex: /^(.+?)\s+near\s+(.+)$/, template: '{subject} near {location}', category: 'proximity_search' },
    { regex: /^(.+?)\s+around\s+(.+)$/, template: '{subject} around {location}', category: 'proximity_search' },
    
    // Federal patterns
    { regex: /^federal\s+(.+?)\s+in\s+(.+)$/i, template: 'federal {subject} in {location}', category: 'federal_search' },
    { regex: /^(.+?)\s+contracts?\s+in\s+(.+)$/i, template: '{subject} contracts in {location}', category: 'contract_search' },
    { regex: /^(.+?)\s+grants?\s+in\s+(.+)$/i, template: '{subject} grants in {location}', category: 'grant_search' },
    
    // Healthcare patterns
    { regex: /^doctors?\s+(.+?)\s+in\s+(.+)$/i, template: 'doctors {modifier} in {location}', category: 'healthcare_search' },
    { regex: /^physicians?\s+(.+?)\s+in\s+(.+)$/i, template: 'physicians {modifier} in {location}', category: 'healthcare_search' },
    { regex: /^hospitals?\s+in\s+(.+)$/i, template: 'hospitals in {location}', category: 'healthcare_search' },
    { regex: /^(.+?)\s+receiving\s+(.+?)\s+in\s+(.+)$/i, template: '{subject} receiving {object} in {location}', category: 'payment_search' },
    
    // Education patterns
    { regex: /^schools?\s+in\s+(.+)$/i, template: 'schools in {location}', category: 'education_search' },
    { regex: /^universities?\s+in\s+(.+)$/i, template: 'universities in {location}', category: 'education_search' },
    
    // Comparison patterns
    { regex: /^compare\s+(.+?)\s+(?:vs?|versus|and)\s+(.+)$/i, template: 'compare {entity1} vs {entity2}', category: 'comparison' },
    
    // Entity lookup
    { regex: /^who\s+(?:is|are)\s+(.+)$/i, template: 'who is {entity}', category: 'entity_lookup' },
    { regex: /^what\s+is\s+(.+)$/i, template: 'what is {subject}', category: 'entity_lookup' },
    
    // List patterns
    { regex: /^(?:all|list|show)\s+(.+?)\s+in\s+(.+)$/i, template: 'list {subject} in {location}', category: 'list_search' },
    { regex: /^top\s+(\d+)?\s*(.+?)\s+in\s+(.+)$/i, template: 'top {count} {subject} in {location}', category: 'ranking_search' },
  ];

  for (const p of patterns) {
    const match = q.match(p.regex);
    if (match) {
      const variables: Record<string, string> = {};
      const varNames = (p.template.match(/\{(\w+)\}/g) || []).map(v => v.replace(/[{}]/g, ''));
      match.slice(1).forEach((v, i) => {
        if (varNames[i]) {
          variables[varNames[i]] = v;
        }
      });
      
      return {
        signature: p.template,
        template: p.template,
        variables,
        category: p.category,
      };
    }
  }

  // Default: generic search
  return {
    signature: 'generic_search',
    template: '{query}',
    variables: { query: q },
    category: 'generic',
  };
}

// ═══════════════════════════════════════════════════════════════
// CALCULATE USER SATISFACTION
// ═══════════════════════════════════════════════════════════════
function calculateSatisfaction(behavior: {
  clicked_results?: string[];
  exported_data?: boolean;
  saved_search?: boolean;
  time_spent_seconds?: number;
  refined_search?: boolean;
  abandoned_quickly?: boolean;
  clicked_insight?: boolean;
}): number {
  let score = 0.5;
  
  if (behavior.clicked_results?.length) score += 0.1;
  if (behavior.clicked_insight) score += 0.15;
  if (behavior.exported_data) score += 0.15;
  if (behavior.saved_search) score += 0.1;
  if (behavior.time_spent_seconds && behavior.time_spent_seconds > 30) score += 0.05;
  if (behavior.time_spent_seconds && behavior.time_spent_seconds > 120) score += 0.1;
  if (behavior.refined_search) score -= 0.1;
  if (behavior.abandoned_quickly) score -= 0.2;
  
  return Math.max(0, Math.min(1, score));
}

// ═══════════════════════════════════════════════════════════════
// ROLLING AVERAGE CALCULATION
// ═══════════════════════════════════════════════════════════════
function rollingAverage(existing: number | null, newValue: number, weight = 0.1): number {
  if (existing === null) return newValue;
  return existing * (1 - weight) + newValue * weight;
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json() as {
      query_id?: string;
      prompt?: string;
      intent?: { entity_type?: string; category?: string; location?: unknown; keywords?: string[] };
      result_count?: number;
      avg_relevance?: number;
      sources_used?: string[];
      user_behavior?: Record<string, unknown>;
      entity_ids_clicked?: string[];
    };

    const prompt = body.prompt || '';
    const result_count = body.result_count || 0;
    const sources_used = body.sources_used || [];

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'prompt required', pattern_id: null }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[core-learning] Learning from query: "${prompt}"`);
    const startTime = Date.now();

    // 1. Extract query pattern
    const pattern = extractQueryPattern(prompt);
    console.log(`[core-learning] Pattern: ${pattern.signature} (${pattern.category})`);

    // 2. Calculate satisfaction score
    const satisfactionScore = body.user_behavior 
      ? calculateSatisfaction(body.user_behavior as any) 
      : 0.5;

    // 3. Update or create pattern record
    const { data: existingPattern } = await supabase
      .from('core_query_patterns')
      .select('*')
      .eq('pattern_signature', pattern.signature)
      .single();

    let patternId: string;
    let isNewPattern = false;

    if (existingPattern) {
      // Update existing pattern
      const newQueryCount = (existingPattern.query_count || 1) + 1;
      const newAvgResultCount = rollingAverage(existingPattern.avg_result_count, result_count);
      const newAvgSatisfaction = rollingAverage(existingPattern.avg_satisfaction_score, satisfactionScore);
      
      // Merge successful sources
      const existingSources = existingPattern.successful_sources || [];
      const newSources = [...new Set([...existingSources, ...sources_used])];

      // Update sample queries (keep last 10)
      const sampleQueries = existingPattern.sample_queries || [];
      if (!sampleQueries.includes(prompt)) {
        sampleQueries.push(prompt);
        if (sampleQueries.length > 10) sampleQueries.shift();
      }

      await supabase
        .from('core_query_patterns')
        .update({
          query_count: newQueryCount,
          unique_users: (existingPattern.unique_users || 0) + 1,
          last_queried_at: new Date().toISOString(),
          avg_result_count: newAvgResultCount,
          avg_satisfaction_score: newAvgSatisfaction,
          successful_sources: newSources,
          recommended_sources: newSources.slice(0, 5),
          pattern_template: pattern.template,
          pattern_category: pattern.category,
          sample_queries: sampleQueries,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPattern.id);

      patternId = existingPattern.id;
      console.log(`[core-learning] Updated pattern (count: ${newQueryCount})`);
    } else {
      // Create new pattern
      const { data: newPattern, error } = await supabase
        .from('core_query_patterns')
        .insert({
          pattern_signature: pattern.signature,
          pattern_template: pattern.template,
          pattern_category: pattern.category,
          query_count: 1,
          unique_users: 1,
          last_queried_at: new Date().toISOString(),
          avg_result_count: result_count,
          avg_satisfaction_score: satisfactionScore,
          successful_sources: sources_used,
          recommended_sources: sources_used.slice(0, 5),
          sample_queries: [prompt],
        })
        .select()
        .single();

      if (error) {
        console.error('[core-learning] Error creating pattern:', error);
        patternId = 'error';
      } else {
        patternId = newPattern?.id || 'new';
        isNewPattern = true;
        console.log('[core-learning] Created new pattern');
      }
    }

    // 4. Learn from clicked entities (boost relevance)
    let entitiesBoosted = 0;
    if (body.entity_ids_clicked && body.entity_ids_clicked.length > 0) {
      for (const entityId of body.entity_ids_clicked) {
        const { data: entity } = await supabase
          .from('core_entities')
          .select('opportunity_score, tags')
          .eq('id', entityId)
          .single();

        if (entity) {
          const newScore = Math.min(100, (entity.opportunity_score || 50) + 2);
          const patternTag = `engaged:${pattern.category}`;
          const existingTags = entity.tags || [];
          const newTags = existingTags.includes(patternTag)
            ? existingTags
            : [...existingTags, patternTag].slice(-10);

          await supabase
            .from('core_entities')
            .update({
              opportunity_score: newScore,
              tags: newTags,
            })
            .eq('id', entityId);

          entitiesBoosted++;
        }
      }
      console.log(`[core-learning] Boosted ${entitiesBoosted} entities`);
    }

    // 5. Generate popularity insight if high satisfaction
    let insightGenerated = false;
    if (satisfactionScore > 0.7 && result_count > 10 && isNewPattern) {
      const { error: insightError } = await supabase
        .from('core_derived_insights')
        .insert({
          scope_type: 'pattern',
          scope_value: pattern.signature,
          insight_type: 'popular_search',
          severity: 'info',
          title: `Popular search pattern detected`,
          description: `The query pattern "${pattern.signature}" is frequently used with high user satisfaction (${Math.round(satisfactionScore * 100)}%). Consider pre-caching results.`,
          supporting_data: {
            pattern: pattern.signature,
            category: pattern.category,
            avg_results: result_count,
            satisfaction: satisfactionScore,
            sources: sources_used,
          },
          confidence: satisfactionScore,
          is_active: true,
          valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (!insightError) {
        insightGenerated = true;
        console.log('[core-learning] Generated popularity insight');
      }
    }

    // 6. Update daily metrics
    const today = new Date().toISOString().split('T')[0];
    const { data: todayMetrics } = await supabase
      .from('core_intelligence_metrics')
      .select('*')
      .eq('metric_date', today)
      .single();

    if (todayMetrics) {
      await supabase
        .from('core_intelligence_metrics')
        .update({
          queries_processed_today: (todayMetrics.queries_processed_today || 0) + 1,
          patterns_learned_today: (todayMetrics.patterns_learned_today || 0) + (isNewPattern ? 1 : 0),
          insights_generated_today: (todayMetrics.insights_generated_today || 0) + (insightGenerated ? 1 : 0),
        })
        .eq('metric_date', today);
    } else {
      await supabase
        .from('core_intelligence_metrics')
        .insert({
          metric_date: today,
          queries_processed_today: 1,
          patterns_learned_today: isNewPattern ? 1 : 0,
          insights_generated_today: insightGenerated ? 1 : 0,
        });
    }

    const processingTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        pattern_id: patternId,
        pattern_signature: pattern.signature,
        pattern_category: pattern.category,
        is_new_pattern: isNewPattern,
        satisfaction_score: satisfactionScore,
        entities_boosted: entitiesBoosted,
        insight_generated: insightGenerated,
        processing_time_ms: processingTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[core-learning] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
