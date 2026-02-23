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

  const body = await req.json().catch(() => ({}))
  const keyword = body.keyword || 'cybersecurity'
  const offset = body.offset || 1
  const rpp = body.rpp || 25

  try {
    const url = `https://api.nsf.gov/services/v1/awards.json?keyword=${encodeURIComponent(keyword)}&offset=${offset}&rpp=${rpp}&printFields=id,title,abstractText,amount,startDate,expDate,piFirstName,piLastName,awardeeName,awardeeCity,awardeeStateCode,awardeeZipCode,fundProgramName,fundAgencyCode`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`NSF API returned ${res.status}`)
    const data = await res.json()

    let loaded = 0
    for (const a of (data?.response?.award || [])) {
      const { error } = await supabase.from('nsf_awards').upsert({
        award_number: a.id,
        title: a.title,
        abstract: a.abstractText?.substring(0, 5000),
        award_amount: parseFloat(a.amount) || 0,
        start_date: a.startDate,
        exp_date: a.expDate,
        pi_first_name: a.piFirstName,
        pi_last_name: a.piLastName,
        institution_name: a.awardeeName,
        institution_city: a.awardeeCity,
        institution_state: a.awardeeStateCode,
        institution_zip: a.awardeeZipCode,
        program_element: a.fundProgramName,
        fund_agency: a.fundAgencyCode,
      }, { onConflict: 'award_number', ignoreDuplicates: false })
      if (!error) loaded++
    }

    return new Response(JSON.stringify({
      success: true, loaded, keyword,
      total: data?.response?.metadata?.totalCount || 0
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
