// ============================================================
// 🤖 OMNISCIENT AI CHAT - Production Intelligence Assistant
// BOMB-07: Real data queries across contracts, entities, opportunities, labor rates
// ============================================================

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { message, context, history } = await req.json();
    const lowMsg = message.toLowerCase();

    // 1. Gather relevant data based on the question
    const queryResult = await intelligentDataQuery(supabase, lowMsg, context);

    // 2. Build system prompt with database context
    const systemPrompt = buildSystemPrompt(queryResult.stats, context);

    // 3. Build user message with data context
    const userContent = queryResult.dataContext
      ? `${message}\n\n[DATABASE RESULTS]\n${queryResult.dataContext}`
      : message;

    // 4. Call AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...(history || []).slice(-10).map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content
          })),
          { role: 'user', content: userContent }
        ],
        max_tokens: 2048
      })
    });

    let assistantResponse = 'I found some relevant data for you.';
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      assistantResponse = aiData.choices?.[0]?.message?.content || assistantResponse;
    } else {
      // Fallback: format data directly
      assistantResponse = formatFallbackResponse(queryResult);
    }

    return new Response(JSON.stringify({
      response: assistantResponse,
      entities: queryResult.entities || [],
      sources: queryResult.sources || [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    return new Response(JSON.stringify({
      response: "I couldn't find data for that query. Try rephrasing or check if the data source is loaded.",
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function buildSystemPrompt(stats: Record<string, number>, context: any): string {
  return `You are Omniscient, the smartest government contracting intelligence analyst. You work for Based Data, a platform that indexes federal spending data.

DATABASE STATS:
- ${stats.entities?.toLocaleString() || 0} entities (contractors, agencies, universities)
- ${stats.contracts?.toLocaleString() || 0} contracts worth $${((stats.contractValue || 0) / 1e9).toFixed(1)}B
- ${stats.grants?.toLocaleString() || 0} grants
- ${stats.sbir?.toLocaleString() || 0} SBIR/STTR awards
- ${stats.opportunities?.toLocaleString() || 0} active opportunities
- ${stats.laborRates?.toLocaleString() || 0} GSA labor rate records

CONTEXT: User is on the "${context?.currentPage || 'general'}" page.${context?.entityId ? ` Viewing entity ID: ${context.entityId}` : ''}

RESPONSE RULES:
1. Always use markdown formatting: **bold** for key values, bullet points for lists
2. When showing financial data, format as $X.XM or $X.XB
3. When listing entities, mention their state and contract value when available
4. Be concise but thorough — aim for 150-300 words
5. If data is provided in [DATABASE RESULTS], reference it specifically
6. End with a brief insight or recommendation when appropriate
7. Never fabricate data — only reference what's in the database results`;
}

interface QueryResult {
  dataContext: string;
  entities?: Array<{ id: string; name: string }>;
  sources?: string[];
  stats: Record<string, number>;
}

async function intelligentDataQuery(supabase: SupabaseClient, lowMsg: string, context: any): Promise<QueryResult> {
  // Always get platform stats
  const stats = await getPlatformStats(supabase);
  const sources: string[] = [];
  let dataContext = '';
  let entities: Array<{ id: string; name: string }> = [];

  // Entity-specific context
  if (context?.entityId) {
    const { data: entity } = await supabase
      .from('core_entities')
      .select('id, canonical_name, entity_type, state, city, total_contract_value, total_grant_value, contract_count, grant_count, naics_codes, business_types')
      .eq('id', context.entityId)
      .single();
    if (entity) {
      dataContext += `\nCURRENT ENTITY: ${JSON.stringify(entity)}`;
      sources.push('core_entities');
    }
  }

  // Detect intent and query accordingly
  if (/top|biggest|largest|most|rank/.test(lowMsg) && /contractor|compan|firm|entit/.test(lowMsg)) {
    const stateMatch = lowMsg.match(/\b(maryland|virginia|texas|california|florida|georgia|dc|washington)\b/i);
    let query = supabase.from('core_entities').select('id, canonical_name, entity_type, state, total_contract_value, contract_count')
      .not('total_contract_value', 'is', null)
      .order('total_contract_value', { ascending: false })
      .limit(15);
    if (stateMatch) {
      const stateMap: Record<string, string> = { maryland: 'MD', virginia: 'VA', texas: 'TX', california: 'CA', florida: 'FL', georgia: 'GA', dc: 'DC', washington: 'WA' };
      query = query.eq('state', stateMap[stateMatch[1].toLowerCase()] || stateMatch[1]);
    }
    if (/defense|dod|military/.test(lowMsg)) query = query.ilike('entity_type', '%contractor%');
    const { data } = await query;
    if (data?.length) {
      dataContext += `\nTOP CONTRACTORS: ${JSON.stringify(data)}`;
      entities = data.map(e => ({ id: e.id, name: e.canonical_name }));
      sources.push('core_entities');
    }
  }

  if (/opportunit|closing|deadline|due/.test(lowMsg)) {
    const { data } = await supabase
      .from('opportunities')
      .select('id, title, agency, posted_date, response_deadline, estimated_value, set_aside_type, naics_code')
      .gte('response_deadline', new Date().toISOString())
      .order('response_deadline', { ascending: true })
      .limit(10);
    if (data?.length) {
      dataContext += `\nUPCOMING OPPORTUNITIES: ${JSON.stringify(data)}`;
      sources.push('opportunities');
    }
  }

  if (/contract|award/.test(lowMsg) && !/opportunit/.test(lowMsg)) {
    let query = supabase.from('contracts').select('id, recipient_name, recipient_entity_id, awarding_agency, award_amount, award_date, naics_code, description')
      .order('award_amount', { ascending: false })
      .limit(15);
    if (/healthcare|health|medical|hhs|va /.test(lowMsg)) query = query.or('naics_code.like.621%,naics_code.like.622%,naics_code.like.623%');
    if (/cyber|security/.test(lowMsg)) query = query.ilike('description', '%cyber%');
    if (/cloud/.test(lowMsg)) query = query.ilike('description', '%cloud%');
    if (/last year|2025|2024/.test(lowMsg)) {
      const year = /2024/.test(lowMsg) ? '2024' : '2025';
      query = query.gte('award_date', `${year}-01-01`).lte('award_date', `${year}-12-31`);
    }
    if (/over \$?(\d+)\s*m/i.test(lowMsg)) {
      const match = lowMsg.match(/over \$?(\d+)\s*m/i);
      if (match) query = query.gte('award_amount', parseInt(match[1]) * 1e6);
    }
    const { data } = await query;
    if (data?.length) {
      dataContext += `\nCONTRACTS: ${JSON.stringify(data)}`;
      entities = [...entities, ...(data.filter(c => c.recipient_entity_id).map(c => ({ id: c.recipient_entity_id!, name: c.recipient_name })))];
      sources.push('contracts');
    }
  }

  if (/labor rate|gsa rate|hourly rate/.test(lowMsg)) {
    let query = supabase.from('gsa_labor_rates').select('labor_category, current_price, min_education, min_experience, schedule_number')
      .order('current_price', { ascending: false })
      .limit(20);
    if (/senior/.test(lowMsg)) query = query.ilike('labor_category', '%senior%');
    if (/developer|engineer|software/.test(lowMsg)) query = query.or('labor_category.ilike.%developer%,labor_category.ilike.%engineer%,labor_category.ilike.%software%');
    if (/analyst/.test(lowMsg)) query = query.ilike('labor_category', '%analyst%');
    if (/manager|management/.test(lowMsg)) query = query.ilike('labor_category', '%manager%');
    const { data } = await query;
    if (data?.length) {
      dataContext += `\nLABOR RATES: ${JSON.stringify(data)}`;
      sources.push('gsa_labor_rates');
    }
  }

  if (/sbir|sttr|small business innovation/.test(lowMsg)) {
    const { data } = await supabase
      .from('sbir_awards')
      .select('firm, agency, award_amount, award_title, phase, state, award_year')
      .order('award_amount', { ascending: false })
      .limit(15);
    if (data?.length) {
      dataContext += `\nSBIR AWARDS: ${JSON.stringify(data)}`;
      sources.push('sbir_awards');
    }
  }

  if (/grant/.test(lowMsg) && !/contract/.test(lowMsg)) {
    const { data } = await supabase
      .from('grants')
      .select('id, recipient_name, awarding_agency, award_amount, award_date, description')
      .order('award_amount', { ascending: false })
      .limit(15);
    if (data?.length) {
      dataContext += `\nGRANTS: ${JSON.stringify(data)}`;
      sources.push('grants');
    }
  }

  if (/compar|vs|versus|compete|competitor/.test(lowMsg)) {
    // Try to extract entity names
    const nameMatch = lowMsg.match(/(?:compare|between)\s+(.+?)\s+(?:and|vs|versus)\s+(.+?)(?:\?|$)/);
    if (nameMatch) {
      const [, name1, name2] = nameMatch;
      const [res1, res2] = await Promise.all([
        supabase.from('core_entities').select('id, canonical_name, entity_type, state, total_contract_value, contract_count, total_grant_value').ilike('canonical_name', `%${name1.trim()}%`).limit(1).single(),
        supabase.from('core_entities').select('id, canonical_name, entity_type, state, total_contract_value, contract_count, total_grant_value').ilike('canonical_name', `%${name2.trim()}%`).limit(1).single(),
      ]);
      if (res1.data) entities.push({ id: res1.data.id, name: res1.data.canonical_name });
      if (res2.data) entities.push({ id: res2.data.id, name: res2.data.canonical_name });
      dataContext += `\nCOMPARISON:\nEntity A: ${JSON.stringify(res1.data)}\nEntity B: ${JSON.stringify(res2.data)}`;
      sources.push('core_entities');
    }
  }

  // Entity lookup by name
  if (/tell me about|who is|what is|info on/.test(lowMsg)) {
    const nameMatch = lowMsg.match(/(?:tell me about|who is|what is|info on)\s+(.+?)(?:\?|$)/);
    if (nameMatch) {
      const searchName = nameMatch[1].trim();
      const { data } = await supabase
        .from('core_entities')
        .select('id, canonical_name, entity_type, state, city, total_contract_value, total_grant_value, contract_count, grant_count, naics_codes, business_types, employee_count, website')
        .ilike('canonical_name', `%${searchName}%`)
        .order('total_contract_value', { ascending: false })
        .limit(3);
      if (data?.length) {
        dataContext += `\nENTITY LOOKUP: ${JSON.stringify(data)}`;
        entities = [...entities, ...data.map(e => ({ id: e.id, name: e.canonical_name }))];
        sources.push('core_entities');
      }
    }
  }

  // Market/agency analysis
  if (/market size|agency|spend|spending|budget/.test(lowMsg) && /which|what|how much/.test(lowMsg)) {
    const { data } = await supabase
      .from('contracts')
      .select('awarding_agency, award_amount')
      .not('awarding_agency', 'is', null)
      .limit(1000);
    if (data?.length) {
      const agencyMap = new Map<string, { total: number; count: number }>();
      for (const c of data) {
        if (!c.awarding_agency) continue;
        const existing = agencyMap.get(c.awarding_agency) || { total: 0, count: 0 };
        existing.total += Number(c.award_amount) || 0;
        existing.count++;
        agencyMap.set(c.awarding_agency, existing);
      }
      const topAgencies = [...agencyMap.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .map(([name, stats]) => ({ agency: name, totalSpend: stats.total, contractCount: stats.count }));
      dataContext += `\nAGENCY SPENDING: ${JSON.stringify(topAgencies)}`;
      sources.push('contracts');
    }
  }

  // Deduplicate entities
  const uniqueEntities = [...new Map(entities.map(e => [e.id, e])).values()];

  return { dataContext, entities: uniqueEntities.slice(0, 10), sources: [...new Set(sources)], stats };
}

async function getPlatformStats(supabase: SupabaseClient): Promise<Record<string, number>> {
  try {
    const { data } = await supabase.rpc('get_platform_stats');
    const stats = Array.isArray(data) ? data[0] : data;
    return {
      entities: stats?.total_entities || 0,
      contracts: stats?.total_contracts || 0,
      contractValue: stats?.total_contract_value || 0,
      grants: stats?.total_grants || 0,
      sbir: stats?.sbir_awards_count || 0,
      opportunities: stats?.total_opportunities || 0,
      laborRates: stats?.labor_rates_count || 0,
    };
  } catch {
    return { entities: 0, contracts: 0, contractValue: 0, grants: 0, sbir: 0, opportunities: 0, laborRates: 0 };
  }
}

function formatFallbackResponse(result: QueryResult): string {
  if (result.entities?.length) {
    return `I found ${result.entities.length} matching entities:\n\n` +
      result.entities.map(e => `• **${e.name}**`).join('\n');
  }
  return `Here are the current platform stats:\n\n` +
    Object.entries(result.stats).map(([k, v]) => `• **${k}**: ${v?.toLocaleString()}`).join('\n');
}
