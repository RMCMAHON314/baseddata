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
  const maxPages = body.maxPages || 5

  try {
    let totalLoaded = 0
    
    // Strategy 1: Senate Lobbying Disclosure Act API
    for (let page = 1; page <= maxPages; page++) {
      try {
        await new Promise(r => setTimeout(r, 1000))
        
        const url = `https://lda.senate.gov/api/v1/filings/?filing_type=Q&page_size=25&page=${page}`
        console.log(`[load-lobbying] Fetching page ${page}`)
        
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json' }
        })
        
        if (!res.ok) {
          console.error(`[load-lobbying] Senate API ${res.status}`)
          // Fallback to OpenSecrets-style approach
          break
        }
        
        const data = await res.json()
        const filings = data.results || []
        
        if (filings.length === 0) break

        const batch = filings.map((f: any) => ({
          filing_uuid: f.filing_uuid || f.id || `lda-${Math.random().toString(36).slice(2, 12)}`,
          registrant_name: f.registrant?.name || f.registrant_name || 'Unknown',
          registrant_id: f.registrant?.id?.toString(),
          client_name: f.client?.name || f.client_name || 'Unknown',
          client_id: f.client?.id?.toString(),
          filing_type: f.filing_type || 'Q',
          filing_year: f.filing_year || new Date().getFullYear(),
          filing_period: f.filing_period,
          amount: parseFloat(f.income || f.expenses || '0') || null,
          filing_date: f.dt_posted || f.filing_date,
          specific_issues: (f.lobbying_activities || []).map((a: any) => a.general_issue_code_display || a.description).filter(Boolean).join('; ').substring(0, 2000),
          government_entities: (f.lobbying_activities || []).flatMap((a: any) => (a.government_entities || []).map((g: any) => g.name)).filter(Boolean).slice(0, 20),
          lobbyists: (f.lobbying_activities || []).flatMap((a: any) => (a.lobbyists || []).map((l: any) => `${l.first_name} ${l.last_name}`)).filter(Boolean).slice(0, 20),
          source: 'senate_lda',
          updated_at: new Date().toISOString(),
        }))

        const { error } = await supabase.from('lobbying_disclosures').upsert(batch, {
          onConflict: 'filing_uuid',
          ignoreDuplicates: true
        })
        
        if (!error) {
          totalLoaded += batch.length
        } else {
          // Fallback insert
          const { error: ie } = await supabase.from('lobbying_disclosures').insert(batch)
          if (!ie) totalLoaded += batch.length
          else console.error('[load-lobbying] Insert error:', ie.message)
        }
        
        if (!data.next) break // No more pages
      } catch (e) {
        console.error(`[load-lobbying] Page ${page} error:`, e.message)
        break
      }
    }

    // Strategy 2: If Senate API failed, try USASpending sub-awards as proxy
    if (totalLoaded === 0) {
      console.log('[load-lobbying] Senate API unavailable, trying proxy approach...')
      try {
        // Pull from ProPublica Congress API or similar free source
        const ppUrl = 'https://projects.propublica.org/represent/api/lobbying/latest.json'
        const res = await fetch(ppUrl)
        if (res.ok) {
          const data = await res.json()
          const filings = data.results || data.lobbying_representations || []
          
          const batch = filings.slice(0, 100).map((f: any) => ({
            filing_uuid: f.id || `pp-${Math.random().toString(36).slice(2, 12)}`,
            registrant_name: f.lobbying_firm || f.registrant || 'Unknown',
            client_name: f.lobbying_client || f.client || 'Unknown',
            filing_type: 'Q',
            filing_year: new Date().getFullYear(),
            source: 'propublica',
            updated_at: new Date().toISOString(),
          }))
          
          if (batch.length > 0) {
            const { error } = await supabase.from('lobbying_disclosures').insert(batch)
            if (!error) totalLoaded += batch.length
          }
        }
      } catch (e) {
        console.log('[load-lobbying] Proxy also failed:', e.message)
      }
    }

    return new Response(JSON.stringify({
      success: true, loaded: totalLoaded
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
