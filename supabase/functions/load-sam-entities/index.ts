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
  const states = body.states || ['MD', 'VA', 'DC', 'DE', 'PA', 'CA', 'TX', 'FL', 'NY', 'IL']
  const maxPages = body.maxPages || 3

  try {
    let totalLoaded = 0
    const stateResults: any[] = []

    for (const state of states) {
      let stateLoaded = 0
      
      for (let page = 0; page < maxPages; page++) {
        try {
          await new Promise(r => setTimeout(r, 1000)) // Rate limit
          
          const url = `https://api.sam.gov/entity-information/v3/entities?api_key=${SAM_KEY}&registrationStatus=A&samRegistered=Yes&physicalAddressProvinceOrStateCode=${state}&includeSections=entityRegistration,coreData&page=${page}&size=100`
          console.log(`[load-sam-entities] Fetching ${state} page ${page}`)
          
          const res = await fetch(url)
          if (!res.ok) {
            const text = await res.text()
            console.error(`[load-sam-entities] ${state} page ${page}: ${res.status}`, text.substring(0, 200))
            if (res.status === 403) {
              stateResults.push({ state, error: 'API key needs Entity Management role', loaded: 0 })
            }
            break
          }

          const data = await res.json()
          const entities = data.entityData || []
          
          if (entities.length === 0) break

          const batch = entities.map((e: any) => {
            const reg = e.entityRegistration || {}
            const core = e.coreData || {}
            const addr = core.physicalAddress || {}
            const naicsList = core.naics?.naicsList || []
            
            return {
              uei: reg.ueiSAM,
              cage_code: reg.cageCode,
              legal_business_name: reg.legalBusinessName,
              dba_name: reg.dbaName,
              registration_status: reg.registrationStatus,
              purpose_of_registration: reg.purposeOfRegistrationDesc,
              registration_date: reg.registrationDate,
              expiration_date: reg.registrationExpirationDate,
              physical_address_line1: addr.addressLine1,
              physical_city: addr.city,
              physical_state: addr.stateOrProvinceCode,
              physical_zip: addr.zipCode,
              physical_country: addr.countryCode,
              entity_structure: core.entityInformation?.entityStructureDesc,
              entity_url: core.entityInformation?.entityURL,
              business_types: (core.businessTypes?.businessTypeList || []).map((bt: any) => bt.businessType || bt),
              naics_codes: naicsList.map((n: any) => n.naicsCode).filter(Boolean),
              congressional_district: core.congressionalDistrict,
              updated_at: new Date().toISOString()
            }
          })

          const { error } = await supabase.from('sam_entities').upsert(batch, { onConflict: 'uei', ignoreDuplicates: false })
          if (!error) {
            stateLoaded += batch.length
          } else {
            console.error(`[load-sam-entities] Upsert error ${state}:`, error.message)
          }
          
          // If fewer than 100 returned, no more pages
          if (entities.length < 100) break
        } catch (e) {
          console.error(`[load-sam-entities] ${state} page ${page} error:`, e.message)
          break
        }
      }
      
      totalLoaded += stateLoaded
      stateResults.push({ state, loaded: stateLoaded })
    }

    // Entity resolution
    if (totalLoaded > 0) {
      try {
        await supabase.functions.invoke('entity-resolver', { body: { source: 'sam_entities', limit: 200 } })
      } catch (e) {
        console.log('[load-sam-entities] Entity resolution skipped:', e.message)
      }
    }

    return new Response(JSON.stringify({
      success: true, total_loaded: totalLoaded, states: stateResults
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
