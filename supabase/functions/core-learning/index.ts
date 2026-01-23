// ============================================================
// 🧠 THE CORE: LEARNING ENGINE
// Learns from every query to get smarter over time
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueryData {
  query_id: string;
  prompt: string;
  result_count: number;
  sources_used: string[];
  processing_time_ms: number;
  user_id?: string;
}

interface UserBehavior {
  clicked_results: string[];
  exported_data: boolean;
  saved_search: boolean;
  time_spent_seconds: number;
  refined_search: boolean;
  abandoned_quickly: boolean;
  clicked_insight: boolean;
  correlations_clicked: string[];
}

// Extract normalized query pattern
function extractPattern(prompt: string): string {
  let pattern = prompt.toLowerCase().trim();
  
  // Replace specific values with placeholders
  
  // Location patterns
  const states = [
    'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut',
    'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa',
    'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan',
    'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire',
    'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio',
    'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota',
    'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia',
    'wisconsin', 'wyoming'
  ];
  
  for (const state of states) {
    if (pattern.includes(state)) {
      pattern = pattern.replace(new RegExp(`\\b${state}\\b`, 'g'), '{state}');
    }
  }
  
  // City patterns (common cities)
  const cities = [
    'new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia', 
    'san antonio', 'san diego', 'dallas', 'san jose', 'austin', 'jacksonville',
    'fort worth', 'columbus', 'charlotte', 'san francisco', 'indianapolis', 'seattle',
    'denver', 'washington', 'boston', 'el paso', 'nashville', 'detroit', 'oklahoma city',
    'portland', 'las vegas', 'memphis', 'louisville', 'baltimore', 'milwaukee',
    'albuquerque', 'tucson', 'fresno', 'sacramento', 'kansas city', 'mesa', 'atlanta',
    'omaha', 'colorado springs', 'raleigh', 'miami', 'long beach', 'virginia beach',
    'oakland', 'minneapolis', 'tampa', 'arlington', 'new orleans', 'cleveland'
  ];
  
  for (const city of cities) {
    if (pattern.includes(city)) {
      pattern = pattern.replace(new RegExp(`\\b${city}\\b`, 'g'), '{city}');
    }
  }
  
  // Entity type patterns
  const entityTypes: Record<string, string> = {
    'hospitals': '{entity_type}',
    'hospital': '{entity_type}',
    'doctors': '{entity_type}',
    'physician': '{entity_type}',
    'physicians': '{entity_type}',
    'clinics': '{entity_type}',
    'clinic': '{entity_type}',
    'contractors': '{entity_type}',
    'contractor': '{entity_type}',
    'vendors': '{entity_type}',
    'vendor': '{entity_type}',
    'companies': '{entity_type}',
    'company': '{entity_type}',
    'businesses': '{entity_type}',
    'business': '{entity_type}',
    'restaurants': '{entity_type}',
    'restaurant': '{entity_type}',
    'schools': '{entity_type}',
    'school': '{entity_type}',
    'pharmacies': '{entity_type}',
    'pharmacy': '{entity_type}',
    'nursing homes': '{entity_type}',
    'nursing home': '{entity_type}'
  };
  
  for (const [term, placeholder] of Object.entries(entityTypes)) {
    if (pattern.includes(term)) {
      pattern = pattern.replace(new RegExp(`\\b${term}\\b`, 'g'), placeholder);
    }
  }
  
  // Domain patterns
  const domains: Record<string, string> = {
    'federal contracts': '{domain}',
    'government contracts': '{domain}',
    'defense contracts': '{domain}',
    'healthcare': '{domain}',
    'medical': '{domain}',
    'environmental': '{domain}',
    'construction': '{domain}'
  };
  
  for (const [term, placeholder] of Object.entries(domains)) {
    if (pattern.includes(term)) {
      pattern = pattern.replace(new RegExp(`\\b${term}\\b`, 'g'), placeholder);
    }
  }
  
  // Clean up multiple spaces and normalize
  pattern = pattern.replace(/\s+/g, ' ').trim();
  
  // Remove extra placeholders of same type
  pattern = pattern.replace(/\{city\}[^{]*\{city\}/g, '{city}');
  pattern = pattern.replace(/\{state\}[^{]*\{state\}/g, '{state}');
  pattern = pattern.replace(/\{entity_type\}[^{]*\{entity_type\}/g, '{entity_type}');
  
  return pattern;
}

// Calculate user satisfaction score from behavior
function calculateSatisfaction(behavior: UserBehavior): number {
  let score = 0.5; // baseline
  
  if (behavior.clicked_results && behavior.clicked_results.length > 0) score += 0.1;
  if (behavior.clicked_insight) score += 0.15;
  if (behavior.exported_data) score += 0.15;
  if (behavior.saved_search) score += 0.1;
  if (behavior.time_spent_seconds > 30) score += 0.05;
  if (behavior.time_spent_seconds > 120) score += 0.1;
  if (behavior.refined_search) score -= 0.1; // Had to refine = not satisfied
  if (behavior.abandoned_quickly) score -= 0.2;
  
  return Math.max(0, Math.min(1, score));
}

// Rolling average calculation
function rollingAverage(existing: number | null, newValue: number, weight = 0.1): number {
  if (existing === null) return newValue;
  return existing * (1 - weight) + newValue * weight;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json() as {
      // New format from omniscient
      query_id?: string;
      prompt?: string;
      intent?: { entity_type?: string; category?: string; location?: unknown; keywords?: string[] };
      result_count?: number;
      avg_relevance?: number;
      sources_used?: string[];
      // Legacy format
      query_data?: QueryData;
      user_behavior?: UserBehavior;
      entity_ids_clicked?: string[];
    };

    // Support both formats
    const query_data: QueryData = body.query_data || {
      query_id: body.query_id || '',
      prompt: body.prompt || '',
      result_count: body.result_count || 0,
      sources_used: body.sources_used || [],
      processing_time_ms: 0,
    };
    const user_behavior = body.user_behavior;
    const entity_ids_clicked = body.entity_ids_clicked;

    if (!query_data.prompt) {
      return new Response(
        JSON.stringify({ error: 'prompt required', pattern_id: null }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[core-learning] Learning from query: "${query_data.prompt}"`);
    const startTime = Date.now();

    // 1. Extract query pattern
    const patternSignature = extractPattern(query_data.prompt);
    console.log(`[core-learning] Pattern: ${patternSignature}`);

    // 2. Calculate satisfaction score
    const satisfactionScore = user_behavior ? calculateSatisfaction(user_behavior) : 0.5;

    // 3. Update or create pattern record
    const { data: existingPattern } = await supabase
      .from('core_query_patterns')
      .select('*')
      .eq('pattern_signature', patternSignature)
      .single();

    let patternId: string;
    let isNewPattern = false;

    if (existingPattern) {
      // Update existing pattern
      const newQueryCount = (existingPattern.query_count || 1) + 1;
      const newAvgResultCount = rollingAverage(existingPattern.avg_result_count, query_data.result_count);
      const newAvgSatisfaction = rollingAverage(existingPattern.avg_satisfaction_score, satisfactionScore);
      
      // Merge successful sources
      const existingSources = existingPattern.successful_sources || [];
      const newSources = [...new Set([...existingSources, ...query_data.sources_used])];

      await supabase
        .from('core_query_patterns')
        .update({
          query_count: newQueryCount,
          unique_users: existingPattern.unique_users + (query_data.user_id ? 1 : 0),
          last_queried_at: new Date().toISOString(),
          avg_result_count: newAvgResultCount,
          avg_satisfaction_score: newAvgSatisfaction,
          successful_sources: newSources,
          recommended_sources: newSources.slice(0, 5), // Top 5 sources
        })
        .eq('id', existingPattern.id);

      patternId = existingPattern.id;
      console.log(`[core-learning] Updated pattern (count: ${newQueryCount})`);
    } else {
      // Create new pattern
      const { data: newPattern, error } = await supabase
        .from('core_query_patterns')
        .insert({
          pattern_signature: patternSignature,
          query_count: 1,
          unique_users: query_data.user_id ? 1 : 0,
          last_queried_at: new Date().toISOString(),
          avg_result_count: query_data.result_count,
          avg_satisfaction_score: satisfactionScore,
          successful_sources: query_data.sources_used,
          recommended_sources: query_data.sources_used.slice(0, 5),
        })
        .select()
        .single();

      if (error) {
        console.error('[core-learning] Error creating pattern:', error);
      } else {
        patternId = newPattern.id;
        isNewPattern = true;
        console.log('[core-learning] Created new pattern');
      }
    }

    // 4. Learn from clicked entities (boost relevance)
    let entitiesBoosted = 0;
    if (entity_ids_clicked && entity_ids_clicked.length > 0) {
      for (const entityId of entity_ids_clicked) {
        // Get current entity
        const { data: entity } = await supabase
          .from('core_entities')
          .select('opportunity_score, tags')
          .eq('id', entityId)
          .single();

        if (entity) {
          // Boost opportunity score slightly for clicked entities
          const newScore = Math.min(100, (entity.opportunity_score || 50) + 2);
          
          // Add pattern-based tag
          const patternTag = `engaged:${patternSignature.replace(/[{}]/g, '').slice(0, 30)}`;
          const existingTags = entity.tags || [];
          const newTags = existingTags.includes(patternTag) 
            ? existingTags 
            : [...existingTags, patternTag].slice(-10); // Keep last 10 tags

          await supabase
            .from('core_entities')
            .update({
              opportunity_score: newScore,
              tags: newTags
            })
            .eq('id', entityId);

          entitiesBoosted++;
        }
      }
      console.log(`[core-learning] Boosted ${entitiesBoosted} entities`);
    }

    // 5. Generate insights if high satisfaction
    let insightGenerated = false;
    if (satisfactionScore > 0.7 && query_data.result_count > 10) {
      // Check if we should generate a cached insight
      const { data: existingInsight } = await supabase
        .from('core_derived_insights')
        .select('id')
        .eq('scope_value', patternSignature)
        .eq('is_active', true)
        .single();

      if (!existingInsight) {
        await supabase
          .from('core_derived_insights')
          .insert({
            scope_type: 'pattern',
            scope_value: patternSignature,
            insight_type: 'popular_search',
            severity: 'info',
            title: `Popular search pattern detected`,
            description: `The query pattern "${patternSignature}" is frequently used with high user satisfaction (${(satisfactionScore * 100).toFixed(0)}%). Consider pre-caching results for this pattern.`,
            supporting_data: {
              pattern: patternSignature,
              avg_results: query_data.result_count,
              satisfaction: satisfactionScore,
              sources: query_data.sources_used
            },
            confidence: satisfactionScore,
            valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Valid for 7 days
          });
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
        pattern_signature: patternSignature,
        is_new_pattern: isNewPattern,
        satisfaction_score: satisfactionScore,
        entities_boosted: entitiesBoosted,
        insight_generated: insightGenerated,
        processing_time_ms: processingTime
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
