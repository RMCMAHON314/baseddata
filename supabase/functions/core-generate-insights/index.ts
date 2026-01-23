// ============================================================
// 🧠 THE CORE: INSIGHT GENERATION ENGINE
// Generates actionable insights from query results
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeatureProperties {
  name?: string;
  category?: string;
  city?: string;
  state?: string;
  source?: string;
  relevance_score?: number;
  total_payment_usd?: number;
  total_amount?: number;
  award_amount?: number;
  payment_amount?: number;
  [key: string]: unknown;
}

interface Feature {
  type: 'Feature';
  properties: FeatureProperties;
  geometry?: { coordinates?: number[] };
}

interface InsightData {
  scope_type: string;
  scope_value?: string;
  insight_type: string;
  title: string;
  description: string;
  supporting_data: Record<string, unknown>;
  confidence: number;
  severity?: string;
  is_active: boolean;
}

// Group array by key
function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key] || 'unknown');
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

// Generate insights from features
function generateInsightsFromFeatures(
  features: Feature[],
  queryId: string,
  prompt: string
): InsightData[] {
  const insights: InsightData[] = [];
  const props = features.map(f => f.properties);

  // ═══════════════════════════════════════════════════════════════
  // 1. CONCENTRATION INSIGHT
  // ═══════════════════════════════════════════════════════════════
  
  const byCity = groupBy(props, 'city');
  const validCities = Object.entries(byCity).filter(([city]) => city && city !== 'unknown');
  
  if (validCities.length > 0) {
    const topCity = validCities.sort((a, b) => b[1].length - a[1].length)[0];
    const percentage = topCity[1].length / features.length;
    
    if (percentage > 0.25 && topCity[1].length >= 3) {
      insights.push({
        scope_type: 'query',
        scope_value: queryId,
        insight_type: 'concentration',
        title: `High concentration in ${topCity[0]}`,
        description: `${topCity[1].length} of ${features.length} results (${Math.round(percentage * 100)}%) are in ${topCity[0]}. This may indicate market saturation or regional specialization.`,
        supporting_data: {
          city: topCity[0],
          count: topCity[1].length,
          percentage: Math.round(percentage * 100),
          total: features.length,
        },
        confidence: 0.9,
        severity: percentage > 0.5 ? 'notable' : 'informational',
        is_active: true,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. FINANCIAL INSIGHT
  // ═══════════════════════════════════════════════════════════════
  
  const withMoney = props.filter(p => 
    p.total_payment_usd || p.total_amount || p.award_amount || p.payment_amount
  );
  
  if (withMoney.length > 0) {
    const totalMoney = withMoney.reduce((sum, p) => {
      const amount = Number(p.total_payment_usd || p.total_amount || p.award_amount || p.payment_amount || 0);
      return sum + amount;
    }, 0);
    
    const sorted = [...withMoney].sort((a, b) => {
      const aAmt = Number(a.total_payment_usd || a.total_amount || a.award_amount || 0);
      const bAmt = Number(b.total_payment_usd || b.total_amount || b.award_amount || 0);
      return bAmt - aAmt;
    });
    const topRecipient = sorted[0];
    const topAmount = Number(topRecipient.total_payment_usd || topRecipient.total_amount || topRecipient.award_amount || 0);

    if (totalMoney > 1000) {
      const formatted = totalMoney >= 1000000 
        ? `$${(totalMoney / 1000000).toFixed(1)}M`
        : `$${totalMoney.toLocaleString()}`;
      
      insights.push({
        scope_type: 'query',
        scope_value: queryId,
        insight_type: 'financial',
        title: `${formatted} in total value identified`,
        description: `${withMoney.length} records with financial data totaling ${formatted}. Top recipient: ${topRecipient.name || 'Unknown'} with $${topAmount.toLocaleString()}.`,
        supporting_data: {
          total: totalMoney,
          count: withMoney.length,
          top_recipient: topRecipient.name,
          top_amount: topAmount,
          avg_amount: Math.round(totalMoney / withMoney.length),
        },
        confidence: 0.95,
        severity: totalMoney > 1000000 ? 'critical' : 'notable',
        is_active: true,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. SOURCE DIVERSITY INSIGHT
  // ═══════════════════════════════════════════════════════════════
  
  const sources = [...new Set(props.map(p => p.source).filter(Boolean))];
  
  if (sources.length >= 2) {
    insights.push({
      scope_type: 'query',
      scope_value: queryId,
      insight_type: 'data_quality',
      title: `Cross-referenced from ${sources.length} data sources`,
      description: `Results verified across ${sources.join(', ')}. Multi-source data provides higher confidence in accuracy.`,
      supporting_data: { 
        sources, 
        count: sources.length,
        records_per_source: Object.fromEntries(
          sources.map(s => [s, props.filter(p => p.source === s).length])
        ),
      },
      confidence: 0.85,
      severity: 'informational',
      is_active: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. ANOMALY/LOW CONFIDENCE INSIGHT
  // ═══════════════════════════════════════════════════════════════
  
  if (features.length > 10) {
    const withScores = props.filter(p => p.relevance_score !== undefined);
    
    if (withScores.length > 0) {
      const avgConfidence = withScores.reduce((s, p) => s + (p.relevance_score || 0), 0) / withScores.length;
      const lowConfidence = withScores.filter(p => (p.relevance_score || 0) < avgConfidence * 0.7);
      
      if (lowConfidence.length > 0 && lowConfidence.length < features.length * 0.3) {
        const flaggedNames = lowConfidence.slice(0, 5).map(p => p.name).filter(Boolean);
        
        insights.push({
          scope_type: 'query',
          scope_value: queryId,
          insight_type: 'anomaly',
          title: `${lowConfidence.length} results flagged for review`,
          description: `These records have below-average confidence scores and may need verification: ${flaggedNames.join(', ')}${lowConfidence.length > 5 ? '...' : ''}`,
          supporting_data: {
            flagged_count: lowConfidence.length,
            avg_confidence: Math.round(avgConfidence * 100) / 100,
            threshold: Math.round(avgConfidence * 0.7 * 100) / 100,
            flagged_names: flaggedNames,
          },
          confidence: 0.7,
          severity: 'notable',
          is_active: true,
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. CATEGORY DIVERSITY INSIGHT
  // ═══════════════════════════════════════════════════════════════
  
  const byCategory = groupBy(props, 'category');
  const validCategories = Object.entries(byCategory).filter(([cat]) => cat && cat !== 'unknown');
  
  if (validCategories.length > 1) {
    insights.push({
      scope_type: 'query',
      scope_value: queryId,
      insight_type: 'opportunity',
      title: `${validCategories.length} market segments identified`,
      description: `Results span multiple categories: ${validCategories.map(([cat, items]) => `${cat} (${items.length})`).join(', ')}. Cross-segment analysis may reveal opportunities.`,
      supporting_data: {
        categories: Object.fromEntries(validCategories.map(([k, v]) => [k, v.length])),
        total_categories: validCategories.length,
      },
      confidence: 0.75,
      severity: 'informational',
      is_active: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. GEOGRAPHIC SPREAD INSIGHT
  // ═══════════════════════════════════════════════════════════════
  
  const byState = groupBy(props, 'state');
  const validStates = Object.entries(byState).filter(([state]) => state && state !== 'unknown');
  
  if (validStates.length > 2) {
    insights.push({
      scope_type: 'query',
      scope_value: queryId,
      insight_type: 'geographic',
      title: `Results span ${validStates.length} states`,
      description: `Geographic distribution: ${validStates.slice(0, 5).map(([state, items]) => `${state} (${items.length})`).join(', ')}${validStates.length > 5 ? '...' : ''}`,
      supporting_data: {
        states: Object.fromEntries(validStates.map(([k, v]) => [k, v.length])),
        total_states: validStates.length,
      },
      confidence: 0.9,
      severity: 'informational',
      is_active: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. QUERY-SPECIFIC INSIGHT
  // ═══════════════════════════════════════════════════════════════
  
  if (features.length > 0) {
    insights.push({
      scope_type: 'query',
      scope_value: queryId,
      insight_type: 'summary',
      title: `Found ${features.length} results for "${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}"`,
      description: `Query returned ${features.length} relevant records from ${sources.length} source${sources.length !== 1 ? 's' : ''}.`,
      supporting_data: {
        prompt,
        result_count: features.length,
        source_count: sources.length,
        timestamp: new Date().toISOString(),
      },
      confidence: 1.0,
      severity: 'informational',
      is_active: true,
    });
  }

  return insights;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { query_id, prompt, features, intent } = await req.json() as {
      query_id: string;
      prompt: string;
      features: Feature[];
      intent?: Record<string, unknown>;
    };

    if (!query_id || !features) {
      return new Response(
        JSON.stringify({ error: 'query_id and features are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[core-generate-insights] Generating insights for query ${query_id} with ${features.length} features`);
    const startTime = Date.now();

    // Generate insights
    const insights = generateInsightsFromFeatures(features, query_id, prompt);

    if (insights.length === 0) {
      return new Response(
        JSON.stringify({ success: true, insights_created: 0, message: 'No insights generated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert insights
    const { data: inserted, error: insertError } = await supabase
      .from('core_derived_insights')
      .insert(insights)
      .select('id, insight_type, title');

    if (insertError) {
      console.error('[core-generate-insights] Insert error:', insertError);
      throw new Error(`Failed to insert insights: ${insertError.message}`);
    }

    const processingTime = Date.now() - startTime;
    console.log(`[core-generate-insights] Created ${inserted?.length || 0} insights in ${processingTime}ms`);

    // Update metrics
    await supabase.rpc('update_intelligence_metrics');

    return new Response(
      JSON.stringify({
        success: true,
        insights_created: inserted?.length || 0,
        insight_types: [...new Set(insights.map(i => i.insight_type))],
        insights: inserted,
        processing_time_ms: processingTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[core-generate-insights] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
