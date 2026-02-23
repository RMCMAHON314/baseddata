import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
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

  try {
    const url = `https://api.sam.gov/entity-information/v2/exclusions?api_key=${SAM_KEY}&excludingAgencyCode=ALL&isActive=true&page=0&size=100`
    const res = await fetch(url)
    if (!res.ok) {
      const text = await res.text()
      return new Response(JSON.stringify({ error: `SAM Exclusions API ${res.status}`, detail: text.substring(0, 500) }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const data = await res.json()
    let loaded = 0

    for (const ex of (data.results || [])) {
      const { error } = await supabase.from('sam_exclusions').upsert({
        classification: ex.classificationType,
        exclusion_name: ex.name,
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
      }, { onConflict: 'exclusion_name,active_date,excluding_agency', ignoreDuplicates: true })
      if (!error) loaded++
    }

    return new Response(JSON.stringify({
      success: true, loaded, total: data.totalRecords || 0
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
