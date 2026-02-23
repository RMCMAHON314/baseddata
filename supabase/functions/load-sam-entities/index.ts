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

  const body = await req.json().catch(() => ({}))
  const state = body.state || 'MD'
  const page = body.page || 0

  try {
    const url = `https://api.sam.gov/entity-information/v3/entities?api_key=${SAM_KEY}&registrationStatus=A&samRegistered=Yes&physicalAddressProvinceOrStateCode=${state}&includeSections=entityRegistration,coreData&page=${page}&size=100`
    const res = await fetch(url)
    if (!res.ok) {
      const text = await res.text()
      return new Response(JSON.stringify({
        error: `SAM Entity API ${res.status}`,
        detail: text.substring(0, 500),
        hint: res.status === 403 ? 'Your API key may need the Entity Management role on api.sam.gov.' : undefined
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const data = await res.json()
    let loaded = 0

    for (const e of (data.entityData || [])) {
      const reg = e.entityRegistration || {}
      const core = e.coreData || {}
      const addr = core.physicalAddress || {}

      const { error } = await supabase.from('sam_entities').upsert({
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
        business_types: core.businessTypes?.businessTypeList || [],
        congressional_district: core.congressionalDistrict,
        updated_at: new Date().toISOString()
      }, { onConflict: 'uei', ignoreDuplicates: false })
      if (!error) loaded++
    }

    return new Response(JSON.stringify({
      success: true, loaded, state, total: data.totalRecords || 0, page
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
