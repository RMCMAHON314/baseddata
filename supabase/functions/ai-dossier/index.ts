// AI-DOSSIER — Generates rich entity profiles using Lovable AI from existing database facts
// No external API calls needed — pure AI synthesis of internal data

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const supabase = createClient(supabaseUrl, serviceKey);

  if (!lovableKey) return json({ error: 'LOVABLE_API_KEY not configured' }, 500);

  try {
    const body = await req.json().catch(() => ({}));
    const mode = (body.mode as string) || 'single';
    const entityId = body.entity_id as string;

    if (mode === 'batch') {
      return json(await batchGenerateDossiers(supabase, lovableKey));
    }

    if (!entityId) return json({ error: 'entity_id required' }, 400);
    return json(await generateDossier(entityId, supabase, lovableKey));
  } catch (e) {
    console.error('[ai-dossier] Error:', e);
    return json({ error: String(e) }, 500);
  }
});

async function batchGenerateDossiers(supabase: ReturnType<typeof createClient>, lovableKey: string) {
  // Find top entities without descriptions that have enough data to generate from
  const { data: entities } = await supabase
    .from('core_entities')
    .select('id, canonical_name, total_contract_value, contract_count')
    .is('description', null)
    .gt('contract_count', 0)
    .order('total_contract_value', { ascending: false })
    .limit(5);

  if (!entities?.length) return { message: 'All entities with contracts already have descriptions', processed: 0 };

  const results = [];
  for (const entity of entities) {
    try {
      const r = await generateDossier(entity.id, supabase, lovableKey);
      results.push({ entity: entity.canonical_name, ...r });
    } catch (e) {
      results.push({ entity: entity.canonical_name, error: String(e) });
    }
  }
  return { mode: 'batch', processed: results.length, results };
}

async function generateDossier(entityId: string, supabase: ReturnType<typeof createClient>, lovableKey: string) {
  // 1. Gather all available data for this entity
  const [entityResult, contractsResult, grantsResult, factsResult, relationshipsResult, insightsResult] = await Promise.all([
    supabase.from('core_entities').select('*').eq('id', entityId).single(),
    supabase.from('contracts').select('award_amount, awarding_agency, description, naics_code, psc_code, start_date, end_date, source')
      .eq('recipient_entity_id', entityId).order('award_amount', { ascending: false }).limit(20),
    supabase.from('grants').select('award_amount, awarding_agency, description, cfda_number, source')
      .eq('recipient_entity_id', entityId).order('award_amount', { ascending: false }).limit(10),
    supabase.from('core_facts').select('fact_type, fact_value, source_name, confidence')
      .eq('entity_id', entityId).order('confidence', { ascending: false }).limit(50),
    supabase.from('core_relationships').select('relationship_type, confidence, evidence, to_entity_id')
      .eq('from_entity_id', entityId).eq('is_active', true).limit(20),
    supabase.from('core_derived_insights').select('insight_type, title, description, confidence')
      .contains('related_entities', [entityId]).limit(10),
  ]);

  const entity = entityResult.data;
  if (!entity) throw new Error('Entity not found');

  const contracts = contractsResult.data || [];
  const grants = grantsResult.data || [];
  const facts = factsResult.data || [];
  const relationships = relationshipsResult.data || [];
  const insights = insightsResult.data || [];

  // Resolve relationship entity names
  const relEntityIds = relationships.map(r => r.to_entity_id).filter(Boolean);
  let relNames: Record<string, string> = {};
  if (relEntityIds.length > 0) {
    const { data: relEntities } = await supabase
      .from('core_entities')
      .select('id, canonical_name')
      .in('id', relEntityIds);
    relNames = Object.fromEntries((relEntities || []).map(e => [e.id, e.canonical_name]));
  }

  // 2. Build context for AI
  const context = buildContext(entity, contracts, grants, facts, relationships, relNames, insights);

  // 3. Generate dossier via Lovable AI
  const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{
        role: 'system',
        content: `You are a federal contracting intelligence analyst. Generate comprehensive organizational profiles from raw data. Be factual, precise, and analytical. Output JSON only.`
      }, {
        role: 'user',
        content: `Generate a complete intelligence dossier for "${entity.canonical_name}" based on this data. Return JSON:
{
  "description": "2-3 sentence professional summary of who they are and what they do",
  "risk_assessment": "1-2 sentences on risk factors or compliance concerns",
  "competitive_position": "1-2 sentences on their market standing",
  "growth_trajectory": "1 sentence on growth trend (growing/stable/declining)",
  "key_capabilities": ["top 5 capability areas based on contract types"],
  "primary_agencies": ["top agencies they work with"],
  "recommended_actions": ["2-3 actionable intelligence recommendations"],
  "opportunity_score_rationale": "1 sentence explaining why their opportunity score should be X/100",
  "suggested_opportunity_score": 50,
  "suggested_risk_score": 30
}

Data:
${context}`
      }],
      temperature: 0.2,
    }),
  });

  if (!aiResp.ok) {
    const errText = await aiResp.text();
    if (aiResp.status === 429) throw new Error('AI rate limited — will retry later');
    if (aiResp.status === 402) throw new Error('AI credits exhausted');
    throw new Error(`AI failed: ${aiResp.status} ${errText.substring(0, 200)}`);
  }

  const aiData = await aiResp.json();
  const content = aiData.choices?.[0]?.message?.content || '';

  let dossier: Record<string, unknown> = {};
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) dossier = JSON.parse(jsonMatch[0]);
  } catch { dossier = { raw: content }; }

  // 4. Update entity with AI-generated content
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (dossier.description) updates.description = (dossier.description as string).substring(0, 1000);
  if (dossier.suggested_opportunity_score) updates.opportunity_score = dossier.suggested_opportunity_score;
  if (dossier.suggested_risk_score) updates.risk_score = dossier.suggested_risk_score;
  await supabase.from('core_entities').update(updates).eq('id', entityId);

  // 5. Store dossier as insight
  await supabase.from('core_derived_insights').insert({
    insight_type: 'ai_dossier',
    scope_type: 'entity',
    scope_value: entityId,
    title: `AI Intelligence Dossier: ${entity.canonical_name}`,
    description: (dossier.description as string) || 'AI-generated organizational profile',
    supporting_data: dossier,
    confidence: 0.85,
    related_entities: [entityId],
  });

  // 6. Store key capabilities as facts
  const caps = (dossier.key_capabilities as string[]) || [];
  if (caps.length > 0) {
    await supabase.from('core_facts').insert({
      entity_id: entityId,
      fact_type: 'ai_capabilities',
      fact_value: { capabilities: caps, source: 'ai_dossier' },
      source_name: 'lovable_ai',
      confidence: 0.8,
    });
  }

  return {
    entity: entity.canonical_name,
    description_set: !!dossier.description,
    opportunity_score: dossier.suggested_opportunity_score,
    risk_score: dossier.suggested_risk_score,
    capabilities: caps.length,
    recommendations: (dossier.recommended_actions as string[])?.length || 0,
  };
}

function buildContext(
  entity: any, contracts: any[], grants: any[], facts: any[],
  relationships: any[], relNames: Record<string, string>, insights: any[]
): string {
  const parts: string[] = [];

  parts.push(`Entity: ${entity.canonical_name}`);
  parts.push(`Type: ${entity.entity_type}, State: ${entity.state || 'Unknown'}, City: ${entity.city || 'Unknown'}`);
  parts.push(`Total Contract Value: $${(entity.total_contract_value || 0).toLocaleString()}`);
  parts.push(`Contracts: ${entity.contract_count || 0}, Grants: ${entity.grant_count || 0}`);
  if (entity.naics_codes?.length) parts.push(`NAICS: ${entity.naics_codes.join(', ')}`);
  if (entity.business_types?.length) parts.push(`Business Types: ${entity.business_types.join(', ')}`);

  if (contracts.length > 0) {
    parts.push('\n--- TOP CONTRACTS ---');
    contracts.slice(0, 10).forEach(c => {
      parts.push(`$${(c.award_amount || 0).toLocaleString()} | ${c.awarding_agency || 'Unknown'} | ${c.description?.substring(0, 100) || 'N/A'} | NAICS: ${c.naics_code || 'N/A'}`);
    });
  }

  if (grants.length > 0) {
    parts.push('\n--- GRANTS ---');
    grants.slice(0, 5).forEach(g => {
      parts.push(`$${(g.award_amount || 0).toLocaleString()} | ${g.awarding_agency || 'Unknown'} | ${g.description?.substring(0, 100) || 'N/A'}`);
    });
  }

  if (relationships.length > 0) {
    parts.push('\n--- RELATIONSHIPS ---');
    relationships.forEach(r => {
      const name = relNames[r.to_entity_id] || 'Unknown';
      parts.push(`${r.relationship_type}: ${name} (confidence: ${r.confidence})`);
    });
  }

  if (facts.length > 0) {
    parts.push('\n--- KEY FACTS ---');
    const factTypes = [...new Set(facts.map(f => f.fact_type))];
    factTypes.slice(0, 10).forEach(ft => {
      const count = facts.filter(f => f.fact_type === ft).length;
      parts.push(`${ft}: ${count} records`);
    });
  }

  if (insights.length > 0) {
    parts.push('\n--- EXISTING INSIGHTS ---');
    insights.forEach(i => parts.push(`[${i.insight_type}] ${i.title}`));
  }

  return parts.join('\n');
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
