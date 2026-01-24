// ============================================================
// 🧠 THE CORE: QUANTUM INSIGHT GENERATION ENGINE v3.0
// MAXIMUM AGGRESSION - Generate 15+ insights per query
// Target: 200+ total insights
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
  payer?: string;
  applicable_manufacturer?: string;
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
function groupBy<T>(arr: T[], keyOrFn: string | ((item: T) => string)): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const key = typeof keyOrFn === 'function' ? keyOrFn(item) : String((item as any)[keyOrFn] || 'unknown');
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
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
// QUANTUM INSIGHT GENERATION - 15+ per query
// ═══════════════════════════════════════════════════════════════
function generateQuantumInsights(
  features: Feature[],
  queryId: string,
  prompt: string
): InsightData[] {
  const insights: InsightData[] = [];
  const props = features.map(f => f.properties);

  if (features.length === 0) return insights;

  // ═══════════════════════════════════════════════════════════════
  // 1. SUMMARY INSIGHT (Always)
  // ═══════════════════════════════════════════════════════════════
  const sources = [...new Set(props.map(p => p.source).filter(Boolean))];
  insights.push({
    scope_type: 'query',
    scope_value: queryId,
    insight_type: 'search_summary',
    title: `Found ${features.length} results across ${sources.length} sources`,
    description: `Your search for "${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}" returned ${features.length} records from ${sources.join(', ')}.`,
    supporting_data: { total: features.length, sources, query: prompt },
    confidence: 1.0,
    severity: 'info',
    is_active: true,
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. GEOGRAPHIC CONCENTRATION INSIGHT
  // ═══════════════════════════════════════════════════════════════
  const byCity = groupBy(props, 'city');
  const validCities = Object.entries(byCity)
    .filter(([city]) => city && city !== 'unknown')
    .sort((a, b) => b[1].length - a[1].length);
  
  if (validCities.length > 0) {
    const topCity = validCities[0];
    const percentage = topCity[1].length / features.length;
    
    if (percentage > 0.15 && topCity[1].length >= 2) {
      insights.push({
        scope_type: 'query',
        scope_value: queryId,
        insight_type: 'geographic_concentration',
        title: `${Math.round(percentage * 100)}% concentrated in ${topCity[0]}`,
        description: `Top locations: ${validCities.slice(0, 5).map(([city, items]) => `${city} (${items.length})`).join(', ')}. ${percentage > 0.5 ? 'High market saturation.' : 'Consider geographic diversification.'}`,
        supporting_data: {
          top_cities: validCities.slice(0, 10).map(([c, i]) => ({ city: c, count: i.length })),
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
  // 3. MAP COVERAGE INSIGHT
  // ═══════════════════════════════════════════════════════════════
  const mappable = features.filter(f => f.geometry?.coordinates?.length === 2);
  if (mappable.length < features.length) {
    const unmapped = features.length - mappable.length;
    const coveragePct = Math.round(mappable.length / features.length * 100);
    insights.push({
      scope_type: 'query',
      scope_value: queryId,
      insight_type: 'map_coverage',
      title: `${mappable.length}/${features.length} results mapped (${coveragePct}%)`,
      description: `${unmapped} results lack coordinates and won't appear on the map.`,
      supporting_data: { mapped: mappable.length, unmapped, coverage_pct: coveragePct },
      confidence: 0.95,
      severity: coveragePct < 50 ? 'warning' : 'info',
      is_active: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. FINANCIAL PAYMENTS INSIGHT
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
      severity: totalPayments > 1000000 ? 'critical' : totalPayments > 100000 ? 'important' : 'notable',
      is_active: true,
    });

    // Payment distribution tiers
    const tiers = {
      major: withPayments.filter(r => Number(r.total_payment_usd || r.payment_amount || 0) >= 100000).length,
      significant: withPayments.filter(r => {
        const amt = Number(r.total_payment_usd || r.payment_amount || 0);
        return amt >= 10000 && amt < 100000;
      }).length,
      moderate: withPayments.filter(r => {
        const amt = Number(r.total_payment_usd || r.payment_amount || 0);
        return amt >= 1000 && amt < 10000;
      }).length,
      minor: withPayments.filter(r => Number(r.total_payment_usd || r.payment_amount || 0) < 1000).length,
    };

    insights.push({
      scope_type: 'query',
      scope_value: queryId,
      insight_type: 'payment_distribution',
      title: `Payment tiers: ${tiers.major} major, ${tiers.significant} significant`,
      description: `Major ($100K+): ${tiers.major} | Significant ($10K-100K): ${tiers.significant} | Moderate ($1K-10K): ${tiers.moderate} | Minor (<$1K): ${tiers.minor}`,
      supporting_data: tiers,
      confidence: 0.9,
      severity: 'info',
      is_active: true,
    });

    // Top payers
    const byPayer = groupBy(withPayments, p => String(p.payer || p.applicable_manufacturer || 'Unknown'));
    const topPayers = Object.entries(byPayer)
      .map(([payer, recs]) => ({
        payer,
        count: recs.length,
        total: recs.reduce((s, r) => s + Number(r.total_payment_usd || r.payment_amount || 0), 0)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    if (topPayers.length > 0 && topPayers[0].payer !== 'Unknown') {
      insights.push({
        scope_type: 'query',
        scope_value: queryId,
        insight_type: 'top_payers',
        title: `Top payer: ${topPayers[0].payer}`,
        description: topPayers.map((p, i) => `${i + 1}. ${p.payer}: ${formatMoney(p.total)} (${p.count} payments)`).join(' | '),
        supporting_data: { payers: topPayers },
        confidence: 0.9,
        severity: 'notable',
        is_active: true,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. FEDERAL CONTRACTS INSIGHT
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
      severity: totalContracts > 10000000 ? 'critical' : totalContracts > 1000000 ? 'important' : 'notable',
      is_active: true,
    });

    // Agency breakdown
    const byAgency = groupBy(withContracts, p => String(p.awarding_agency || 'Unknown'));
    const topAgencies = Object.entries(byAgency)
      .map(([agency, recs]) => ({
        agency,
        count: recs.length,
        total: recs.reduce((s, r) => s + Number(r.total_amount || r.award_amount || 0), 0)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    if (topAgencies.length > 0 && topAgencies[0].agency !== 'Unknown') {
      insights.push({
        scope_type: 'query',
        scope_value: queryId,
        insight_type: 'agency_breakdown',
        title: `${topAgencies.length} federal agencies represented`,
        description: topAgencies.map(a => `${a.agency}: ${formatMoney(a.total)}`).join(' | '),
        supporting_data: { agencies: topAgencies },
        confidence: 0.9,
        severity: 'notable',
        is_active: true,
      });
    }

    // Market opportunity
    const uniqueAgencies = [...new Set(withContracts.map(p => p.awarding_agency).filter(Boolean))];
    const avgContractSize = totalContracts / withContracts.length;
    insights.push({
      scope_type: 'query',
      scope_value: queryId,
      insight_type: 'market_opportunity',
      title: `${uniqueAgencies.length} federal agencies active in this market`,
      description: `Average contract size: ${formatMoney(avgContractSize)}. Active agencies: ${uniqueAgencies.slice(0, 3).join(', ')}${uniqueAgencies.length > 3 ? '...' : ''}`,
      supporting_data: { agencies: uniqueAgencies, avg_contract: avgContractSize },
      confidence: 0.8,
      severity: 'important',
      is_active: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. SOURCE DIVERSITY INSIGHT
  // ═══════════════════════════════════════════════════════════════
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
  // 7. CATEGORY DISTRIBUTION INSIGHT
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
  // 8. DATA QUALITY ASSESSMENT INSIGHT
  // ═══════════════════════════════════════════════════════════════
  const withRelevance = props.filter(p => p.relevance_score !== undefined);
  const avgRelevance = withRelevance.length > 0
    ? withRelevance.reduce((s, p) => s + (p.relevance_score || 0), 0) / withRelevance.length
    : 0.5;
  
  const qualityScore = Math.round(
    (mappable.length / features.length * 50) +
    (avgRelevance * 50)
  );

  insights.push({
    scope_type: 'query',
    scope_value: queryId,
    insight_type: 'data_quality',
    title: `Data quality score: ${qualityScore}/100`,
    description: `${mappable.length}/${features.length} mapped, average relevance ${Math.round(avgRelevance * 100)}%`,
    supporting_data: {
      quality_score: qualityScore,
      mapped: mappable.length,
      avg_relevance: Math.round(avgRelevance * 100),
      total: features.length,
    },
    confidence: 0.95,
    severity: qualityScore < 50 ? 'warning' : 'informational',
    is_active: true,
  });

  // ═══════════════════════════════════════════════════════════════
  // 9. GEOGRAPHIC SPREAD INSIGHT
  // ═══════════════════════════════════════════════════════════════
  const byState = groupBy(props, 'state');
  const validStates = Object.entries(byState)
    .filter(([state]) => state && state !== 'unknown')
    .sort((a, b) => b[1].length - a[1].length);
  
  if (validStates.length > 1) {
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
  // 10. TOP ENTITIES BY VALUE INSIGHT
  // ═══════════════════════════════════════════════════════════════
  const entitiesWithValue = props
    .filter(p => Number(p.total_payment_usd || p.total_amount || p.award_amount || 0) > 0)
    .map(p => ({
      name: p.name || 'Unknown',
      value: Number(p.total_payment_usd || 0) + Number(p.total_amount || 0) + Number(p.award_amount || 0),
      source: p.source,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  if (entitiesWithValue.length >= 3) {
    insights.push({
      scope_type: 'query',
      scope_value: queryId,
      insight_type: 'top_entities',
      title: `Top ${Math.min(5, entitiesWithValue.length)} by financial value`,
      description: entitiesWithValue.slice(0, 5).map((e, i) => `${i + 1}. ${e.name}: ${formatMoney(e.value)}`).join(' | '),
      supporting_data: { rankings: entitiesWithValue },
      confidence: 0.9,
      severity: 'notable',
      is_active: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 11. TEMPORAL PATTERN INSIGHT
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
  // 12. DATA COMPLETENESS INSIGHT
  // ═══════════════════════════════════════════════════════════════
  const withAddress = props.filter(p => p.address).length;
  const completenessScore = Math.round(
    (mappable.length / features.length * 40) +
    (withAddress / features.length * 30) +
    ((props.filter(p => p.name).length / features.length) * 30)
  );

  insights.push({
    scope_type: 'query',
    scope_value: queryId,
    insight_type: 'data_completeness',
    title: `Data completeness: ${completenessScore}%`,
    description: `Coordinates: ${mappable.length}/${features.length} | Addresses: ${withAddress}/${features.length} | Named: ${props.filter(p => p.name).length}/${features.length}`,
    supporting_data: { score: completenessScore, coords: mappable.length, addresses: withAddress },
    confidence: 0.95,
    severity: completenessScore < 50 ? 'warning' : 'info',
    is_active: true,
  });

  // ═══════════════════════════════════════════════════════════════
  // 13. DENSITY INSIGHT
  // ═══════════════════════════════════════════════════════════════
  if (features.length > 10 && validCities.length > 0) {
    const avgPerCity = features.length / validCities.length;
    const densityLevel = avgPerCity > 10 ? 'high' : avgPerCity > 5 ? 'moderate' : 'low';
    
    insights.push({
      scope_type: 'query',
      scope_value: queryId,
      insight_type: 'density_analysis',
      title: `${densityLevel.charAt(0).toUpperCase() + densityLevel.slice(1)} density: ${avgPerCity.toFixed(1)} per city`,
      description: `${features.length} results across ${validCities.length} cities. ${densityLevel === 'high' ? 'Market is saturated.' : densityLevel === 'moderate' ? 'Good market coverage.' : 'Sparse distribution - opportunity for growth.'}`,
      supporting_data: { avg_per_city: avgPerCity, density_level: densityLevel, total_cities: validCities.length },
      confidence: 0.85,
      severity: 'informational',
      is_active: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 14. RESULT COUNT INSIGHT
  // ═══════════════════════════════════════════════════════════════
  const countLevel = features.length > 100 ? 'comprehensive' : 
                     features.length > 50 ? 'substantial' : 
                     features.length > 20 ? 'moderate' : 'limited';
  
  insights.push({
    scope_type: 'query',
    scope_value: queryId,
    insight_type: 'result_volume',
    title: `${countLevel.charAt(0).toUpperCase() + countLevel.slice(1)} result set: ${features.length} records`,
    description: `This is a ${countLevel} dataset. ${features.length > 50 ? 'Consider filtering for more focused analysis.' : 'Results are manageable for detailed review.'}`,
    supporting_data: { count: features.length, level: countLevel },
    confidence: 0.95,
    severity: 'info',
    is_active: true,
  });

  // ═══════════════════════════════════════════════════════════════
  // 15. ACTIONABLE RECOMMENDATION
  // ═══════════════════════════════════════════════════════════════
  let recommendation = '';
  if (withContracts.length > 0 && withPayments.length > 0) {
    recommendation = 'Cross-reference contracts and payments to identify entities with multiple revenue streams.';
  } else if (withContracts.length > 0) {
    recommendation = 'Analyze contract patterns to identify emerging opportunities in this market.';
  } else if (withPayments.length > 0) {
    recommendation = 'Track payment trends to understand pharmaceutical industry relationships.';
  } else {
    recommendation = 'Explore related searches to expand your data coverage.';
  }

  insights.push({
    scope_type: 'query',
    scope_value: queryId,
    insight_type: 'recommendation',
    title: 'Recommended Action',
    description: recommendation,
    supporting_data: { has_contracts: withContracts.length > 0, has_payments: withPayments.length > 0 },
    confidence: 0.75,
    severity: 'info',
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

    const { query_id, prompt, features } = await req.json() as {
      query_id: string;
      prompt: string;
      features: Feature[];
    };

    console.log(`[core-generate-insights] QUANTUM generation for query: ${query_id}`);
    const startTime = Date.now();

    // If features not provided, try to fetch from records
    let featuresToProcess = features || [];
    
    if (featuresToProcess.length === 0 && query_id) {
      const { data: records } = await supabase
        .from('records')
        .select('*')
        .eq('query_id', query_id)
        .limit(500);

      if (records) {
        featuresToProcess = records.map((r: any) => ({
          type: 'Feature' as const,
          properties: {
            name: r.name,
            category: r.category,
            city: r.city,
            state: r.state,
            source: r.source_id,
            relevance_score: r.relevance_score,
            ...r.properties,
          },
          geometry: r.latitude && r.longitude ? {
            coordinates: [r.longitude, r.latitude],
          } : undefined,
        }));
      }
    }

    // Generate quantum insights
    const insights = generateQuantumInsights(featuresToProcess, query_id, prompt || '');

    if (insights.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          insights_created: 0,
          message: 'No insights generated' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert insights
    const { error: insertError, data: inserted } = await supabase
      .from('core_derived_insights')
      .insert(insights)
      .select('id');

    if (insertError) {
      console.error('[core-generate-insights] Insert error:', insertError);
      throw new Error(`Failed to insert insights: ${insertError.message}`);
    }

    const processingTime = Date.now() - startTime;
    const insightsCreated = inserted?.length || 0;

    console.log(`[core-generate-insights] QUANTUM: Created ${insightsCreated} insights in ${processingTime}ms`);

    // Update metrics
    try {
      await supabase.rpc('update_intelligence_metrics');
    } catch (e) {
      // Ignore
    }

    return new Response(
      JSON.stringify({
        success: true,
        features_processed: featuresToProcess.length,
        insights_created: insightsCreated,
        insight_types: [...new Set(insights.map(i => i.insight_type))],
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
