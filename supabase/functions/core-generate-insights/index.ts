// ============================================================
// 🧠 THE CORE: INSIGHT GENERATION ENGINE v2.0
// Generates 8+ insight types from query results
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
  awarding_agency?: string;
  payment_date?: string;
  start_date?: string;
  award_date?: string;
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

// ═══════════════════════════════════════════════════════════════
// HELPER: Group array by key
// ═══════════════════════════════════════════════════════════════
function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key] || 'unknown');
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Format money
// ═══════════════════════════════════════════════════════════════
function formatMoney(amount: number): string {
  if (amount >= 1000000000) return `$${(amount / 1000000000).toFixed(1)}B`;
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

// ═══════════════════════════════════════════════════════════════
// GENERATE 8+ INSIGHT TYPES
// ═══════════════════════════════════════════════════════════════
function generateComprehensiveInsights(
  features: Feature[],
  queryId: string,
  prompt: string
): InsightData[] {
  const insights: InsightData[] = [];
  const props = features.map(f => f.properties);

  if (features.length === 0) return insights;

  // ═══════════════════════════════════════════════════════════════
  // 1. GEOGRAPHIC CONCENTRATION INSIGHT
  // ═══════════════════════════════════════════════════════════════
  const byCity = groupBy(props, 'city');
  const validCities = Object.entries(byCity)
    .filter(([city]) => city && city !== 'unknown')
    .sort((a, b) => b[1].length - a[1].length);
  
  if (validCities.length > 0) {
    const topCity = validCities[0];
    const percentage = topCity[1].length / features.length;
    
    if (percentage > 0.2 && topCity[1].length >= 2) {
      insights.push({
        scope_type: 'query',
        scope_value: queryId,
        insight_type: 'concentration',
        title: `${Math.round(percentage * 100)}% concentrated in ${topCity[0]}`,
        description: `Top locations: ${validCities.slice(0, 3).map(([city, items]) => `${city} (${items.length})`).join(', ')}. ${percentage > 0.5 ? 'High market saturation in this area.' : 'Consider geographic diversification.'}`,
        supporting_data: {
          top_cities: validCities.slice(0, 5).map(([c, i]) => ({ city: c, count: i.length })),
          percentage: Math.round(percentage * 100),
          total: features.length,
        },
        confidence: 0.9,
        severity: percentage > 0.5 ? 'important' : 'notable',
        is_active: true,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. FINANCIAL PAYMENTS INSIGHT
  // ═══════════════════════════════════════════════════════════════
  const withPayments = props.filter(p => {
    const amt = Number(p.total_payment_usd || p.payment_amount || 0);
    return amt > 0;
  });
  
  if (withPayments.length > 0) {
    const totalPayments = withPayments.reduce((sum, p) => {
      return sum + Number(p.total_payment_usd || p.payment_amount || 0);
    }, 0);
    const avgPayment = totalPayments / withPayments.length;
    const sorted = [...withPayments].sort((a, b) => {
      return Number(b.total_payment_usd || b.payment_amount || 0) - Number(a.total_payment_usd || a.payment_amount || 0);
    });
    const topRecipient = sorted[0];
    const topAmount = Number(topRecipient.total_payment_usd || topRecipient.payment_amount || 0);

    insights.push({
      scope_type: 'query',
      scope_value: queryId,
      insight_type: 'financial_payments',
      title: `${formatMoney(totalPayments)} in pharmaceutical payments`,
      description: `${withPayments.length} providers received payments. Average: ${formatMoney(avgPayment)}. Top recipient: ${topRecipient.name || 'Unknown'} (${formatMoney(topAmount)})`,
      supporting_data: {
        total: totalPayments,
        count: withPayments.length,
        average: avgPayment,
        top_recipient: topRecipient.name,
        top_amount: topAmount,
      },
      confidence: 0.95,
      severity: totalPayments > 1000000 ? 'critical' : 'important',
      is_active: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. FEDERAL CONTRACTS INSIGHT
  // ═══════════════════════════════════════════════════════════════
  const withContracts = props.filter(p => {
    const amt = Number(p.total_amount || p.award_amount || 0);
    return amt > 0;
  });
  
  if (withContracts.length > 0) {
    const totalContracts = withContracts.reduce((sum, p) => {
      return sum + Number(p.total_amount || p.award_amount || 0);
    }, 0);
    const sorted = [...withContracts].sort((a, b) => {
      return Number(b.total_amount || b.award_amount || 0) - Number(a.total_amount || a.award_amount || 0);
    });
    const topContract = sorted[0];
    const topAmount = Number(topContract.total_amount || topContract.award_amount || 0);

    insights.push({
      scope_type: 'query',
      scope_value: queryId,
      insight_type: 'financial_contracts',
      title: `${formatMoney(totalContracts)} in federal contract value`,
      description: `${withContracts.length} contracts found. Largest: ${topContract.name || 'Unknown'} (${formatMoney(topAmount)})`,
      supporting_data: {
        total: totalContracts,
        count: withContracts.length,
        top_contractor: topContract.name,
        top_amount: topAmount,
      },
      confidence: 0.95,
      severity: totalContracts > 10000000 ? 'critical' : 'important',
      is_active: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. SOURCE DIVERSITY INSIGHT
  // ═══════════════════════════════════════════════════════════════
  const sources = [...new Set(props.map(p => p.source).filter(Boolean))];
  
  if (sources.length >= 2) {
    const bySource = groupBy(props, 'source');
    insights.push({
      scope_type: 'query',
      scope_value: queryId,
      insight_type: 'source_diversity',
      title: `Cross-referenced from ${sources.length} independent sources`,
      description: `Data verified across: ${sources.map(s => `${s} (${bySource[s!]?.length || 0})`).join(', ')}. Multi-source data provides higher confidence.`,
      supporting_data: {
        sources,
        breakdown: Object.fromEntries(Object.entries(bySource).map(([k, v]) => [k, v.length])),
      },
      confidence: 0.85,
      severity: 'informational',
      is_active: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. CATEGORY DISTRIBUTION INSIGHT
  // ═══════════════════════════════════════════════════════════════
  const byCategory = groupBy(props, 'category');
  const validCategories = Object.entries(byCategory)
    .filter(([cat]) => cat && cat !== 'unknown')
    .sort((a, b) => b[1].length - a[1].length);
  
  if (validCategories.length > 1) {
    insights.push({
      scope_type: 'query',
      scope_value: queryId,
      insight_type: 'category_distribution',
      title: `${validCategories.length} market segments identified`,
      description: validCategories.slice(0, 5).map(([cat, items]) => `${cat}: ${items.length}`).join(' | '),
      supporting_data: {
        categories: Object.fromEntries(validCategories.map(([k, v]) => [k, v.length])),
        total_categories: validCategories.length,
      },
      confidence: 0.9,
      severity: 'informational',
      is_active: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. DATA QUALITY ASSESSMENT INSIGHT
  // ═══════════════════════════════════════════════════════════════
  const withCoordinates = features.filter(f => f.geometry?.coordinates?.length === 2);
  const withRelevance = props.filter(p => p.relevance_score !== undefined);
  const avgRelevance = withRelevance.length > 0
    ? withRelevance.reduce((s, p) => s + (p.relevance_score || 0), 0) / withRelevance.length
    : 0;
  
  const qualityScore = Math.round(
    (withCoordinates.length / features.length * 50) +
    (avgRelevance * 50)
  );

  insights.push({
    scope_type: 'query',
    scope_value: queryId,
    insight_type: 'data_quality',
    title: `Data quality score: ${qualityScore}/100`,
    description: `${withCoordinates.length}/${features.length} mapped, average relevance ${Math.round(avgRelevance * 100)}%`,
    supporting_data: {
      quality_score: qualityScore,
      mapped: withCoordinates.length,
      avg_relevance: Math.round(avgRelevance * 100),
      total: features.length,
    },
    confidence: 0.95,
    severity: qualityScore < 50 ? 'warning' : 'informational',
    is_active: true,
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. GEOGRAPHIC SPREAD INSIGHT
  // ═══════════════════════════════════════════════════════════════
  const byState = groupBy(props, 'state');
  const validStates = Object.entries(byState)
    .filter(([state]) => state && state !== 'unknown')
    .sort((a, b) => b[1].length - a[1].length);
  
  if (validStates.length > 2) {
    insights.push({
      scope_type: 'query',
      scope_value: queryId,
      insight_type: 'geographic_spread',
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
  // 8. TOP ENTITIES BY VALUE INSIGHT
  // ═══════════════════════════════════════════════════════════════
  const entitiesWithValue = props
    .filter(p => Number(p.total_payment_usd || p.total_amount || p.award_amount || 0) > 0)
    .map(p => ({
      name: p.name || 'Unknown',
      value: Number(p.total_payment_usd || 0) + Number(p.total_amount || 0) + Number(p.award_amount || 0),
      source: p.source,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  if (entitiesWithValue.length >= 3) {
    insights.push({
      scope_type: 'query',
      scope_value: queryId,
      insight_type: 'top_entities',
      title: `Top ${entitiesWithValue.length} by financial value`,
      description: entitiesWithValue.map((e, i) => `${i + 1}. ${e.name}: ${formatMoney(e.value)}`).join(' | '),
      supporting_data: { rankings: entitiesWithValue },
      confidence: 0.9,
      severity: 'notable',
      is_active: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 9. TEMPORAL PATTERN INSIGHT
  // ═══════════════════════════════════════════════════════════════
  const withDates = props.filter(p => p.payment_date || p.start_date || p.award_date);
  
  if (withDates.length > 5) {
    const byYear: Record<number, number> = {};
    for (const p of withDates) {
      const dateStr = String(p.payment_date || p.start_date || p.award_date);
      const year = new Date(dateStr).getFullYear();
      if (!isNaN(year) && year > 2000 && year < 2100) {
        byYear[year] = (byYear[year] || 0) + 1;
      }
    }
    
    const years = Object.entries(byYear).sort((a, b) => Number(b[0]) - Number(a[0]));
    
    if (years.length > 1) {
      insights.push({
        scope_type: 'query',
        scope_value: queryId,
        insight_type: 'temporal_pattern',
        title: `Activity spans ${years.length} years`,
        description: years.slice(0, 5).map(([y, c]) => `${y}: ${c}`).join(' | '),
        supporting_data: { by_year: byYear },
        confidence: 0.85,
        severity: 'informational',
        is_active: true,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 10. MARKET OPPORTUNITY INSIGHT
  // ═══════════════════════════════════════════════════════════════
  if (withContracts.length > 0) {
    const agencies = [...new Set(withContracts.map(p => p.awarding_agency).filter(Boolean))];
    const avgContractSize = withContracts.reduce((s, p) => {
      return s + Number(p.total_amount || p.award_amount || 0);
    }, 0) / withContracts.length;
    
    insights.push({
      scope_type: 'query',
      scope_value: queryId,
      insight_type: 'market_opportunity',
      title: `${agencies.length} federal agencies active in this market`,
      description: `Average contract size: ${formatMoney(avgContractSize)}. Active agencies: ${agencies.slice(0, 3).join(', ')}${agencies.length > 3 ? '...' : ''}`,
      supporting_data: { agencies, avg_contract: avgContractSize },
      confidence: 0.8,
      severity: 'important',
      is_active: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 11. QUERY SUMMARY INSIGHT
  // ═══════════════════════════════════════════════════════════════
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

  return insights;
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

    // Generate comprehensive insights
    const insights = generateComprehensiveInsights(features, query_id, prompt || '');

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
    try {
      await supabase.rpc('update_intelligence_metrics');
    } catch (e) {
      // Ignore metric update errors
    }

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
