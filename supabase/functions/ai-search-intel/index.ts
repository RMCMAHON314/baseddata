// AI-SEARCH-INTEL — Uses Firecrawl search + Lovable AI to find and structure live intelligence
// Fills gaps in grants, opportunities, and competitive data that APIs can't reach

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const supabase = createClient(supabaseUrl, serviceKey);

  if (!firecrawlKey) return json({ error: 'FIRECRAWL_API_KEY not configured' }, 500);
  if (!lovableKey) return json({ error: 'LOVABLE_API_KEY not configured' }, 500);

  try {
    const body = await req.json().catch(() => ({}));
    const mode = (body.mode as string) || 'opportunities';

    switch (mode) {
      case 'opportunities': return json(await searchOpportunities(body, firecrawlKey, lovableKey, supabase));
      case 'grants': return json(await searchGrants(body, firecrawlKey, lovableKey, supabase));
      case 'competitive': return json(await searchCompetitiveIntel(body, firecrawlKey, lovableKey, supabase));
      case 'news': return json(await searchEntityNews(body, firecrawlKey, lovableKey, supabase));
      default: return json({ error: `Unknown mode: ${mode}` }, 400);
    }
  } catch (e) {
    console.error('[ai-search-intel] Error:', e);
    return json({ error: String(e) }, 500);
  }
});

// ─── Search for live opportunities ──────────────────────────────
async function searchOpportunities(
  body: Record<string, unknown>, firecrawlKey: string, lovableKey: string,
  supabase: ReturnType<typeof createClient>
) {
  const naics = (body.naics as string) || '';
  const keywords = (body.keywords as string) || 'government contract opportunity';
  const query = `${keywords} ${naics} federal contract RFP RFI solicitation 2025 2026`.trim();

  // Search via Firecrawl
  const searchResp = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      limit: 10,
      scrapeOptions: { formats: ['markdown'] },
    }),
  });
  if (!searchResp.ok) throw new Error(`Firecrawl search failed: ${searchResp.status}`);
  const searchData = await searchResp.json();
  const results = searchData.data || [];

  if (results.length === 0) return { mode: 'opportunities', found: 0, message: 'No results found' };

  // Compile search results for AI extraction
  const compiledContent = results.slice(0, 5).map((r: any, i: number) =>
    `--- Result ${i + 1}: ${r.title || r.url} ---\n${(r.markdown || r.description || '').substring(0, 2000)}`
  ).join('\n\n');

  // Extract structured opportunities via AI
  const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{
        role: 'system',
        content: 'Extract government contract opportunities from search results. Return JSON array only.'
      }, {
        role: 'user',
        content: `Extract any government contract opportunities, RFPs, RFIs, or solicitations from these search results. Return a JSON array of objects:
[{
  "title": "string",
  "agency": "string or null",
  "solicitation_number": "string or null",
  "naics_code": "string or null",
  "deadline": "string or null",
  "estimated_value": "string or null",
  "url": "string or null",
  "summary": "string"
}]

If no opportunities found, return [].

Search results:
${compiledContent}`
      }],
      temperature: 0.1,
    }),
  });

  if (!aiResp.ok) throw new Error(`AI extraction failed: ${aiResp.status}`);
  const aiData = await aiResp.json();
  const content = aiData.choices?.[0]?.message?.content || '[]';

  let opportunities: any[] = [];
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) opportunities = JSON.parse(jsonMatch[0]);
  } catch { /* parse failed */ }

  // Store valid opportunities
  let inserted = 0;
  for (const opp of opportunities) {
    if (!opp.title) continue;
    const noticeId = opp.solicitation_number || `web_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const { error } = await supabase.from('opportunities').upsert({
      notice_id: noticeId,
      title: opp.title,
      department: opp.agency,
      solicitation_number: opp.solicitation_number,
      naics_code: opp.naics_code,
      response_deadline: opp.deadline,
      description: opp.summary?.substring(0, 5000),
      source: 'firecrawl_ai_search',
      raw_data: opp,
    }, { onConflict: 'notice_id', ignoreDuplicates: true });
    if (!error) inserted++;
  }

  return { mode: 'opportunities', search_results: results.length, extracted: opportunities.length, inserted };
}

// ─── Search for grants ──────────────────────────────────────────
async function searchGrants(
  body: Record<string, unknown>, firecrawlKey: string, lovableKey: string,
  supabase: ReturnType<typeof createClient>
) {
  const keywords = (body.keywords as string) || 'federal grant funding';
  const query = `${keywords} grant award funding 2025 2026 government`.trim();

  const searchResp = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit: 10, scrapeOptions: { formats: ['markdown'] } }),
  });
  if (!searchResp.ok) throw new Error(`Firecrawl search failed: ${searchResp.status}`);
  const searchData = await searchResp.json();
  const results = searchData.data || [];

  const compiledContent = results.slice(0, 5).map((r: any, i: number) =>
    `--- Result ${i + 1}: ${r.title || r.url} ---\n${(r.markdown || r.description || '').substring(0, 2000)}`
  ).join('\n\n');

  const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{
        role: 'system',
        content: 'Extract grant opportunities from search results. Return JSON array only.'
      }, {
        role: 'user',
        content: `Extract any grants, funding opportunities, or research awards from these search results. Return a JSON array:
[{
  "title": "string",
  "agency": "string or null",
  "award_amount": "number or null",
  "recipient": "string or null",
  "cfda_number": "string or null",
  "url": "string or null",
  "summary": "string"
}]

Search results:
${compiledContent}`
      }],
      temperature: 0.1,
    }),
  });

  if (!aiResp.ok) throw new Error(`AI extraction failed: ${aiResp.status}`);
  const aiData = await aiResp.json();
  const content = aiData.choices?.[0]?.message?.content || '[]';

  let grants: any[] = [];
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) grants = JSON.parse(jsonMatch[0]);
  } catch { /* parse failed */ }

  let inserted = 0;
  for (const g of grants) {
    if (!g.title) continue;
    const { error } = await supabase.from('grants').upsert({
      award_id: `web_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      recipient_name: g.recipient || 'Unknown',
      award_amount: g.award_amount,
      awarding_agency: g.agency,
      description: g.summary?.substring(0, 5000),
      cfda_number: g.cfda_number,
      source: 'firecrawl_ai_search',
      raw_data: g,
    }, { onConflict: 'award_id', ignoreDuplicates: true });
    if (!error) inserted++;
  }

  return { mode: 'grants', search_results: results.length, extracted: grants.length, inserted };
}

// ─── Competitive intelligence for an entity ─────────────────────
async function searchCompetitiveIntel(
  body: Record<string, unknown>, firecrawlKey: string, lovableKey: string,
  supabase: ReturnType<typeof createClient>
) {
  const entityId = body.entity_id as string;
  if (!entityId) throw new Error('entity_id required');

  const { data: entity } = await supabase
    .from('core_entities')
    .select('canonical_name, naics_codes, state')
    .eq('id', entityId).single();
  if (!entity) throw new Error('Entity not found');

  const query = `"${entity.canonical_name}" government contracts competitor analysis ${entity.state || ''}`.trim();

  const searchResp = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit: 8, scrapeOptions: { formats: ['markdown'] } }),
  });
  if (!searchResp.ok) throw new Error(`Firecrawl search failed: ${searchResp.status}`);
  const searchData = await searchResp.json();
  const results = searchData.data || [];

  const compiledContent = results.slice(0, 5).map((r: any, i: number) =>
    `--- ${r.title || r.url} ---\n${(r.markdown || r.description || '').substring(0, 1500)}`
  ).join('\n\n');

  const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{
        role: 'system',
        content: `You are a competitive intelligence analyst researching "${entity.canonical_name}".`
      }, {
        role: 'user',
        content: `Analyze these web results about "${entity.canonical_name}" and extract competitive intelligence. Return JSON:
{
  "market_position": "string",
  "competitors": [{"name": "string", "relationship": "string"}],
  "recent_wins": ["string"],
  "partnerships": ["string"],
  "strengths": ["string"],
  "weaknesses": ["string"],
  "news_highlights": ["string"]
}

Web results:
${compiledContent}`
      }],
      temperature: 0.2,
    }),
  });

  if (!aiResp.ok) throw new Error(`AI analysis failed: ${aiResp.status}`);
  const aiData = await aiResp.json();
  const content = aiData.choices?.[0]?.message?.content || '{}';

  let intel: Record<string, unknown> = {};
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) intel = JSON.parse(jsonMatch[0]);
  } catch { intel = { raw: content }; }

  // Store as insight
  await supabase.from('core_derived_insights').insert({
    insight_type: 'competitive_intel',
    scope_type: 'entity',
    scope_value: entityId,
    title: `Competitive Intelligence: ${entity.canonical_name}`,
    description: (intel.market_position as string) || 'Web-sourced competitive analysis',
    supporting_data: intel,
    confidence: 0.65,
    related_entities: [entityId],
  });

  // Store competitor relationships
  const competitors = (intel.competitors as any[]) || [];
  for (const comp of competitors.slice(0, 5)) {
    if (!comp.name) continue;
    // Try to resolve competitor to existing entity
    const { data: match } = await supabase
      .from('core_entities')
      .select('id')
      .ilike('canonical_name', `%${comp.name}%`)
      .limit(1).single();

    if (match) {
      await supabase.from('core_relationships').upsert({
        from_entity_id: entityId,
        to_entity_id: match.id,
        relationship_type: 'competitor',
        confidence: 0.6,
        evidence: { source: 'firecrawl_ai', relationship: comp.relationship },
        is_active: true,
      }, { onConflict: 'from_entity_id,to_entity_id,relationship_type', ignoreDuplicates: true });
    }
  }

  return { entity: entity.canonical_name, intel, competitors_resolved: competitors.length, sources: results.length };
}

// ─── Entity news search ─────────────────────────────────────────
async function searchEntityNews(
  body: Record<string, unknown>, firecrawlKey: string, lovableKey: string,
  supabase: ReturnType<typeof createClient>
) {
  const entityId = body.entity_id as string;
  if (!entityId) throw new Error('entity_id required');

  const { data: entity } = await supabase
    .from('core_entities')
    .select('canonical_name')
    .eq('id', entityId).single();
  if (!entity) throw new Error('Entity not found');

  const searchResp = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `"${entity.canonical_name}" news contract award`,
      limit: 5,
      tbs: 'qdr:m', // last month
    }),
  });
  if (!searchResp.ok) throw new Error(`Firecrawl search failed: ${searchResp.status}`);
  const searchData = await searchResp.json();
  const results = searchData.data || [];

  let inserted = 0;
  for (const r of results) {
    const { error } = await supabase.from('core_facts').insert({
      entity_id: entityId,
      fact_type: 'news_mention',
      fact_value: { title: r.title, url: r.url, snippet: (r.description || '').substring(0, 500) },
      source_name: 'firecrawl_news',
      confidence: 0.6,
      fact_date: new Date().toISOString().split('T')[0],
    });
    if (!error) inserted++;
  }

  return { entity: entity.canonical_name, news_found: results.length, facts_created: inserted };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
