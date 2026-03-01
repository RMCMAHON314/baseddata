import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const body = await req.json().catch(() => ({}))
  const queries = body.queries || [
    'artificial intelligence',
    'cybersecurity',
    'cloud computing',
    'machine learning',
    'blockchain',
    'quantum computing'
  ]

  try {
    let totalLoaded = 0
    const results: any[] = []

    for (const query of queries) {
      try {
        await new Promise(r => setTimeout(r, 1500))
        
        console.log(`[load-patents] Searching: "${query}"`)
        
        const res = await fetch('https://api.patentsview.org/patents/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: { _or: [
              { _text_any: { patent_title: query } },
              { _text_any: { patent_abstract: query } }
            ]},
            f: [
              'patent_number', 'patent_title', 'patent_abstract', 'patent_date', 'patent_type',
              'assignee_organization', 'assignee_state', 'assignee_country',
              'inventor_first_name', 'inventor_last_name',
              'cpc_group_id', 'patent_num_cited_by_us_patents'
            ],
            o: { page: 1, per_page: 100 },
            s: [{ patent_date: 'desc' }],
          }),
        })

        if (!res.ok) {
          console.error(`[load-patents] PatentsView API ${res.status}: ${res.statusText}`)
          results.push({ query, error: `${res.status}`, loaded: 0 })
          
          // If API is gone (410), try alternative
          if (res.status === 410) {
            console.log('[load-patents] PatentsView API deprecated, trying v1...')
            const altResult = await tryAlternativePatentAPI(supabase, query)
            results.push({ query, ...altResult })
            totalLoaded += altResult.loaded || 0
          }
          continue
        }

        const data = await res.json()
        const patents = data.patents || []
        
        if (patents.length === 0) {
          results.push({ query, loaded: 0 })
          continue
        }

        const batch = patents.map((p: any) => ({
          patent_number: p.patent_number,
          title: p.patent_title || 'Untitled',
          abstract: p.patent_abstract?.substring(0, 5000),
          patent_type: p.patent_type,
          grant_date: p.patent_date,
          assignee_name: p.assignees?.[0]?.assignee_organization,
          assignee_state: p.assignees?.[0]?.assignee_state,
          assignee_country: p.assignees?.[0]?.assignee_country,
          inventors: (p.inventors || []).map((i: any) => `${i.inventor_first_name} ${i.inventor_last_name}`).slice(0, 10),
          cpc_codes: (p.cpcs || []).map((c: any) => c.cpc_group_id).filter(Boolean).slice(0, 10),
          citation_count: p.patent_num_cited_by_us_patents || 0,
          search_keyword: query,
          source: 'patentsview',
          updated_at: new Date().toISOString(),
        }))

        const { error } = await supabase.from('uspto_patents').upsert(batch, { 
          onConflict: 'patent_number', ignoreDuplicates: false 
        })
        
        if (!error) {
          totalLoaded += batch.length
          results.push({ query, returned: patents.length, loaded: batch.length })
        } else {
          console.error(`[load-patents] Upsert error for "${query}":`, error.message)
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

async function tryAlternativePatentAPI(supabase: any, query: string) {
  // Try USPTO Open Data API as fallback
  try {
    const url = `https://developer.uspto.gov/ibd-api/v1/application/publications?searchText=${encodeURIComponent(query)}&start=0&rows=50`
    const res = await fetch(url)
    if (!res.ok) return { loaded: 0, error: `USPTO alt API ${res.status}` }
    
    const data = await res.json()
    const docs = data.response?.docs || []
    
    const batch = docs.map((d: any) => ({
      patent_number: d.patentApplicationNumber || d.publicationDocumentIdentifier || `uspto-${Math.random().toString(36).slice(2, 10)}`,
      title: d.inventionTitle || 'Untitled',
      abstract: d.abstractText?.join(' ')?.substring(0, 5000),
      patent_type: d.applicationTypeCategory,
      grant_date: d.publicationDate,
      assignee_name: d.applicantName?.join(', '),
      inventors: d.inventorName || [],
      search_keyword: query,
      source: 'uspto_ibd',
      updated_at: new Date().toISOString(),
    }))
    
    if (batch.length > 0) {
      const { error } = await supabase.from('uspto_patents').insert(batch)
      if (!error) return { loaded: batch.length }
    }
    return { loaded: 0 }
  } catch (e) {
    return { loaded: 0, error: e.message }
  }
}
