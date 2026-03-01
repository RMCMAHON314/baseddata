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
  const SAM_KEY = Deno.env.get('SAM_API_KEY') || Deno.env.get('DATA_GOV_KEY')
  if (!SAM_KEY) {
    return new Response(JSON.stringify({ error: 'SAM_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const body = await req.json().catch(() => ({}))
  const maxPages = body.maxPages || 5

  try {
    let totalLoaded = 0
    
    for (let page = 0; page < maxPages; page++) {
      try {
        await new Promise(r => setTimeout(r, 1000))
        
        const url = `https://api.sam.gov/entity-information/v2/exclusions?api_key=${SAM_KEY}&excludingAgencyCode=ALL&isActive=true&page=${page}&size=100`
        console.log(`[load-sam-exclusions] Fetching page ${page}`)
        
        const res = await fetch(url)
        if (!res.ok) {
          const text = await res.text()
          console.error(`[load-sam-exclusions] Page ${page}: ${res.status}`, text.substring(0, 200))
          break
        }
        
        const data = await res.json()
        const exclusions = data.results || []
        
        if (exclusions.length === 0) break

        const batch = exclusions.map((ex: any) => ({
          classification: ex.classificationType,
          exclusion_name: ex.name || 'Unknown',
          exclusion_type: ex.exclusionType,
          exclusion_program: ex.exclusionProgram,
          excluding_agency: ex.excludingAgencyCode,
          uei: ex.ueiSAM,
          cage_code: ex.cageCode,
          active_date: ex.activateDate,
          termination_date: ex.terminationDate,
          record_status: ex.recordStatus,
          city: ex.city,
          state: ex.stateProvince,
          country: ex.country,
          description: ex.description,
          sam_number: ex.samNumber,
        }))

        const { error } = await supabase.from('sam_exclusions').upsert(batch, { 
          onConflict: 'exclusion_name,active_date,excluding_agency', 
          ignoreDuplicates: true 
        })
        
        if (!error) {
          totalLoaded += batch.length
        } else {
          // Fallback: insert ignoring conflicts
          const { error: insertErr } = await supabase.from('sam_exclusions').insert(batch)
          if (!insertErr) totalLoaded += batch.length
          else console.error(`[load-sam-exclusions] Error:`, insertErr.message)
        }
        
        if (exclusions.length < 100) break
      } catch (e) {
        console.error(`[load-sam-exclusions] Page ${page} error:`, e.message)
        break
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
