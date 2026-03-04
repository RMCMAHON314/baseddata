// BASED DATA — USPTO Patent Data Loader V2
// Uses PatentsView PatentSearch API v2 (search.patentsview.org)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const API_BASE = 'https://search.patentsview.org/api/v1/patent/'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const body = await req.json().catch(() => ({}))
  const queries = body.queries || [
    'defense',
    'cybersecurity',
    'artificial intelligence',
    'cloud computing',
    'quantum computing',
    'biotechnology'
  ]

  try {
    let totalLoaded = 0
    const results: any[] = []

    for (const query of queries) {
      try {
        await new Promise(r => setTimeout(r, 1200))
        
        console.log(`[load-patents] Searching PatentsView v2: "${query}"`)
        
        // PatentsView v2 uses GET with q parameter as JSON
        const q = JSON.stringify({ _text_any: { patent_abstract: query } })
        const f = JSON.stringify([
          'patent_id', 'patent_title', 'patent_abstract', 'patent_date', 'patent_type',
          'assignees.assignee_organization', 'assignees.assignee_state',
          'assignees.assignee_country', 'inventors.inventor_name_first',
          'inventors.inventor_name_last', 'cpcs.cpc_group_id',
          'patent_num_us_patent_citations'
        ])
        const o = JSON.stringify({ size: 100 })
        const s = JSON.stringify([{ patent_date: 'desc' }])
        
        const url = `${API_BASE}?q=${encodeURIComponent(q)}&f=${encodeURIComponent(f)}&o=${encodeURIComponent(o)}&s=${encodeURIComponent(s)}`
        
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json' }
        })

        if (!res.ok) {
          console.error(`[load-patents] PatentsView v2 ${res.status}: ${res.statusText}`)
          results.push({ query, error: `${res.status}`, loaded: 0 })
          continue
        }

        const data = await res.json()
        const patents = data.patents || []
        
        if (patents.length === 0) {
          results.push({ query, loaded: 0 })
          continue
        }

        const batch = patents.map((p: any) => ({
          patent_number: p.patent_id,
          title: p.patent_title || 'Untitled',
          abstract: p.patent_abstract?.substring(0, 5000),
          patent_type: p.patent_type,
          grant_date: p.patent_date,
          assignee_name: p.assignees?.[0]?.assignee_organization,
          assignee_state: p.assignees?.[0]?.assignee_state,
          assignee_country: p.assignees?.[0]?.assignee_country,
          inventors: (p.inventors || []).map((i: any) => `${i.inventor_name_first || ''} ${i.inventor_name_last || ''}`).slice(0, 10),
          cpc_codes: (p.cpcs || []).map((c: any) => c.cpc_group_id).filter(Boolean).slice(0, 10),
          citation_count: p.patent_num_us_patent_citations || 0,
          search_keyword: query,
          source: 'patentsview_v2',
          updated_at: new Date().toISOString(),
        }))

        const { error } = await supabase.from('uspto_patents').upsert(batch, { 
          onConflict: 'patent_number', ignoreDuplicates: false 
        })
        
        if (!error) {
          totalLoaded += batch.length
          results.push({ query, returned: patents.length, loaded: batch.length })
        } else {
          console.error(`[load-patents] Upsert error:`, error.message)
          // Fallback insert
          const { error: ie } = await supabase.from('uspto_patents').insert(batch)
          if (!ie) {
            totalLoaded += batch.length
            results.push({ query, loaded: batch.length, fallback: true })
          } else {
            results.push({ query, error: ie.message, loaded: 0 })
          }
        }
      } catch (e) {
        console.error(`[load-patents] "${query}" error:`, e.message)
        results.push({ query, error: e.message, loaded: 0 })
      }
    }

    // Entity resolution
    if (totalLoaded > 0) {
      try {
        await supabase.functions.invoke('entity-resolver', { body: { source: 'uspto_patents', limit: 100 } })
      } catch (e) {
        console.log('[load-patents] Entity resolution skipped:', e.message)
      }
    }

    return new Response(JSON.stringify({
      success: true, total_loaded: totalLoaded, results
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
