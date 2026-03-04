// WEB-ENRICH — Scrapes entity websites via Firecrawl, extracts structured intelligence via Lovable AI
// Produces high-value facts: revenue, employees, leadership, capabilities, tech stack, partnerships

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
    const entityId = body.entity_id as string;
    const url = body.url as string;
    const batchMode = body.batch === true;

    // Batch mode: find entities with websites but no web_scrape facts
    if (batchMode) {
      const { data: entities } = await supabase
        .from('core_entities')
        .select('id, canonical_name, website')
        .not('website', 'is', null)
        .limit(5);

      if (!entities?.length) return json({ message: 'No entities with websites to enrich' });

      const results = [];
      for (const entity of entities) {
        // Check if already scraped recently
        const { count } = await supabase
          .from('core_facts')
          .select('id', { count: 'exact', head: true })
          .eq('entity_id', entity.id)
          .eq('fact_type', 'web_intelligence')
          .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());

        if ((count || 0) > 0) continue;

        try {
          const r = await enrichFromWeb(entity.id, entity.website!, entity.canonical_name, firecrawlKey, lovableKey, supabase);
          results.push({ entity: entity.canonical_name, ...r });
        } catch (e) {
          results.push({ entity: entity.canonical_name, error: String(e) });
        }
      }
      return json({ mode: 'batch', results });
    }

    // Single entity mode
    if (!entityId && !url) return json({ error: 'Provide entity_id or url' }, 400);

    if (entityId) {
      const { data: entity } = await supabase
        .from('core_entities')
        .select('canonical_name, website')
        .eq('id', entityId)
        .single();
      if (!entity) return json({ error: 'Entity not found' }, 404);

      const targetUrl = url || entity.website;
      if (!targetUrl) return json({ error: 'Entity has no website' }, 400);

      const result = await enrichFromWeb(entityId, targetUrl, entity.canonical_name, firecrawlKey, lovableKey, supabase);
      return json(result);
    }

    // URL-only mode (no entity)
    const result = await scrapeAndAnalyze(url, firecrawlKey, lovableKey);
    return json(result);

  } catch (e) {
    console.error('[web-enrich] Error:', e);
    return json({ error: String(e) }, 500);
  }
});

async function enrichFromWeb(
  entityId: string, url: string, entityName: string,
  firecrawlKey: string, lovableKey: string,
  supabase: ReturnType<typeof createClient>
) {
  // Step 1: Scrape with Firecrawl
  const scrapeResp = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url, formats: ['markdown', 'links'],
      onlyMainContent: true, waitFor: 3000,
    }),
  });
  if (!scrapeResp.ok) throw new Error(`Firecrawl scrape failed: ${scrapeResp.status}`);
  const scrapeData = await scrapeResp.json();
  const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';
  const links = scrapeData.data?.links || scrapeData.links || [];

  if (!markdown || markdown.length < 50) {
    return { skipped: true, reason: 'Insufficient content scraped' };
  }

  // Step 2: Extract structured intelligence via Lovable AI
  const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are an intelligence extraction engine. Extract structured facts from website content about "${entityName}". Return JSON only.`
        },
        {
          role: 'user',
          content: `Extract all intelligence from this website content. Return a JSON object with these fields (null if not found):
{
  "annual_revenue_estimate": "string or null",
  "employee_count_estimate": "number or null",
  "founded_year": "number or null",
  "headquarters": "string or null",
  "leadership": [{"name": "string", "title": "string"}],
  "capabilities": ["string"],
  "industries_served": ["string"],
  "certifications": ["string"],
  "key_clients_partners": ["string"],
  "technology_stack": ["string"],
  "recent_news": ["string"],
  "contract_vehicles": ["string"],
  "naics_mentioned": ["string"],
  "description_summary": "string"
}

Website content:
${markdown.substring(0, 8000)}`
        }
      ],
      temperature: 0.1,
    }),
  });

  if (!aiResp.ok) throw new Error(`AI extraction failed: ${aiResp.status}`);
  const aiData = await aiResp.json();
  const content = aiData.choices?.[0]?.message?.content || '';

  // Parse JSON from AI response
  let extracted: Record<string, unknown> = {};
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
  } catch { extracted = { raw_response: content }; }

  // Step 3: Store as high-value facts
  const factsToInsert = [];

  if (extracted.description_summary) {
    factsToInsert.push({ entity_id: entityId, fact_type: 'web_intelligence', fact_value: extracted, source_name: 'firecrawl+ai', confidence: 0.8 });
  }
  if (extracted.leadership && Array.isArray(extracted.leadership) && extracted.leadership.length > 0) {
    factsToInsert.push({ entity_id: entityId, fact_type: 'leadership', fact_value: { leaders: extracted.leadership }, source_name: 'firecrawl+ai', confidence: 0.75 });
  }
  if (extracted.capabilities && Array.isArray(extracted.capabilities) && extracted.capabilities.length > 0) {
    factsToInsert.push({ entity_id: entityId, fact_type: 'capabilities', fact_value: { capabilities: extracted.capabilities }, source_name: 'firecrawl+ai', confidence: 0.75 });
  }
  if (extracted.certifications && Array.isArray(extracted.certifications) && extracted.certifications.length > 0) {
    factsToInsert.push({ entity_id: entityId, fact_type: 'certifications', fact_value: { certifications: extracted.certifications }, source_name: 'firecrawl+ai', confidence: 0.8 });
  }

  // Bulk insert facts
  if (factsToInsert.length > 0) {
    await supabase.from('core_facts').insert(factsToInsert);
  }

  // Step 4: Update entity with extracted data
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (extracted.employee_count_estimate && typeof extracted.employee_count_estimate === 'number') {
    updates.employee_count = extracted.employee_count_estimate;
  }
  if (extracted.description_summary) {
    updates.description = (extracted.description_summary as string).substring(0, 1000);
  }
  await supabase.from('core_entities').update(updates).eq('id', entityId);

  return {
    entity: entityName,
    url,
    facts_created: factsToInsert.length,
    extracted_fields: Object.keys(extracted).filter(k => extracted[k] != null),
    links_found: links.length,
  };
}

async function scrapeAndAnalyze(url: string, firecrawlKey: string, lovableKey: string) {
  const scrapeResp = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
  });
  if (!scrapeResp.ok) throw new Error(`Firecrawl ${scrapeResp.status}`);
  const data = await scrapeResp.json();
  return { url, title: data.data?.metadata?.title, content_length: (data.data?.markdown || '').length };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
