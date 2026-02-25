// ============================================================
// 🤖 AI CHAT - Natural Language Data Exploration
// ============================================================

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EntityRow {
  id: string;
  canonical_name: string;
  entity_type: string;
  opportunity_score: number | null;
}

interface FactRow {
  id: string;
  fact_type: string;
  fact_value: unknown;
  entity: Array<{ canonical_name: string }> | null;
}

interface FactRowOld {
  id: string;
  fact_type: string;
  fact_value: unknown;
  entity: { canonical_name: string } | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { message, context, history } = await req.json();

    // Get counts for context
    const [entitiesCount, factsCount, relationshipsCount] = await Promise.all([
      supabase.from('core_entities').select('*', { count: 'exact', head: true }),
      supabase.from('core_facts').select('*', { count: 'exact', head: true }),
      supabase.from('core_relationships').select('*', { count: 'exact', head: true })
    ]);

    // Determine if we need to query the database
    const needsData = /show|find|search|list|get|what|who|how many|top|largest|biggest|recent|contracts|grants|entities|companies|hospitals|schools/i.test(message);

    let responseData: Record<string, unknown> = {};
    let dataContext = '';

    if (needsData) {
      const queryResult = await intelligentQuery(supabase, message);
      responseData = queryResult;
      dataContext = `\n\nRelevant data from database:\n${JSON.stringify(queryResult, null, 2)}`;
    }

    // Build response using Lovable AI
    const systemPrompt = `You are Based Data AI, an intelligent assistant for a public data intelligence platform.

You have access to a database with:
- ${entitiesCount.count?.toLocaleString() || 0} entities (companies, organizations, people)
- ${factsCount.count?.toLocaleString() || 0} facts (contracts, grants, payments, licenses)
- ${relationshipsCount.count?.toLocaleString() || 0} relationships between entities
- Data from 150+ government APIs

When users ask questions, you can:
1. Search for entities by name, type, or location
2. Find contracts, grants, and financial data
3. Analyze relationships between entities
4. Identify market trends and opportunities
5. Compare entities and find competitors

Always be helpful, accurate, and cite specific data when available.
Format responses clearly with bullet points for lists.
When showing entities, include their opportunity score if available.

Current context: ${JSON.stringify(context || {})}`;

    // Call Lovable AI 
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
          { role: 'user', content: message + dataContext }
        ],
        max_tokens: 1024
      })
    });

    let assistantResponse = 'I found some relevant data for you.';
    
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      assistantResponse = aiData.choices?.[0]?.message?.content || assistantResponse;
    } else {
      // Fallback response based on data
      const entities = responseData.entities as Array<{ name: string; type: string; score?: number }> | undefined;
      if (entities && entities.length > 0) {
        assistantResponse = `I found ${entities.length} matching entities:\n\n` +
          entities.slice(0, 5).map((e) => 
            `• **${e.name}** (${e.type})${e.score ? ` - Score: ${e.score}` : ''}`
          ).join('\n');
      } else if (responseData.stats) {
        assistantResponse = 'Here are the current statistics:\n\n' +
          Object.entries(responseData.stats as Record<string, unknown>).map(([k, v]) => `• ${k}: ${v}`).join('\n');
      }
    }

    return new Response(JSON.stringify({
      response: assistantResponse,
      data: responseData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    return new Response(JSON.stringify({
      response: 'Sorry, I encountered an error. Please try again.',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function intelligentQuery(supabase: SupabaseClient, message: string) {
  const lowMsg = message.toLowerCase();
  
  // Entity search
  if (/show|find|search|list/.test(lowMsg) && /entit|compan|hospital|school|universit|organization/.test(lowMsg)) {
    let query = supabase.from('core_entities').select('id, canonical_name, entity_type, opportunity_score');
    
    if (/hospital/.test(lowMsg)) query = query.ilike('entity_type', '%hospital%');
    else if (/school|education/.test(lowMsg)) query = query.ilike('entity_type', '%school%');
    else if (/universit/.test(lowMsg)) query = query.ilike('entity_type', '%university%');
    
    if (/top|best|highest/.test(lowMsg)) {
      query = query.order('opportunity_score', { ascending: false, nullsFirst: false });
    }
    
    const { data } = await query.limit(10);
    const entities = (data || []) as EntityRow[];
    return { 
      entities: entities.map(e => ({
        id: e.id,
        name: e.canonical_name,
        type: e.entity_type,
        score: e.opportunity_score
      }))
    };
  }
  
  // Contract search
  if (/contract|award|grant/.test(lowMsg)) {
    const { data } = await supabase
      .from('core_facts')
      .select(`
        id,
        fact_type,
        fact_value,
        entity:core_entities(canonical_name)
      `)
      .in('fact_type', ['contract_awarded', 'grant_received', 'contract_value'])
      .order('created_at', { ascending: false })
      .limit(10);
    
    const facts = data || [];
    return {
      contracts: facts.map((f: { fact_type: string; entity: Array<{ canonical_name: string }> | null; fact_value: unknown }) => ({
        type: f.fact_type,
        entity: f.entity?.[0]?.canonical_name,
        value: f.fact_value
      }))
    };
  }
  
  // Stats
  if (/how many|count|total|stats/.test(lowMsg)) {
    const [entities, facts, relationships] = await Promise.all([
      supabase.from('core_entities').select('*', { count: 'exact', head: true }),
      supabase.from('core_facts').select('*', { count: 'exact', head: true }),
      supabase.from('core_relationships').select('*', { count: 'exact', head: true })
    ]);
    
    return {
      stats: {
        'Total Entities': entities.count?.toLocaleString(),
        'Total Facts': facts.count?.toLocaleString(),
        'Relationships': relationships.count?.toLocaleString()
      }
    };
  }
  
  // Default: search entities by name
  const searchTerm = message.replace(/show|find|search|get|me|the|a|an/gi, '').trim();
  if (searchTerm.length > 2) {
    const { data } = await supabase
      .from('core_entities')
      .select('id, canonical_name, entity_type, opportunity_score')
      .ilike('canonical_name', `%${searchTerm}%`)
      .limit(5);
    
    const entities = (data || []) as EntityRow[];
    return {
      entities: entities.map(e => ({
        id: e.id,
        name: e.canonical_name,
        type: e.entity_type,
        score: e.opportunity_score
      }))
    };
  }
  
  return {};
}
