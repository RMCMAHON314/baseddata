import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

async function fetchWithRetry(url: string, retries = 5, delayMs = 10000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url)
    if (res.status === 429) {
      console.log(`Rate limited, waiting ${delayMs}ms before retry ${i + 1}/${retries}`)
      await new Promise(r => setTimeout(r, delayMs))
      delayMs *= 2
      continue
    }
    return res
  }
  throw new Error('SBIR API rate limit exceeded after retries')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const body = await req.json().catch(() => ({}))
  const agency = body.agency || 'DOD'
  const year = body.year || 2024

  try {
    // Try alternate endpoint formats
    const urls = [
      `https://api.www.sbir.gov/public/api/awards?agency=${encodeURIComponent(agency)}&year=${year}`,
      `https://www.sbir.gov/api/awards.json?agency=${encodeURIComponent(agency)}&year=${year}`,
    ]
    
    let res: Response | null = null
    let data: any = null
    for (const url of urls) {
      try {
        res = await fetchWithRetry(url)
        if (res.ok) {
          data = await res.json()
          break
        }
      } catch { continue }
    }
    if (!data) throw new Error(`SBIR API unavailable - rate limited. Try again in a few minutes.`)

    let loaded = 0
    for (const a of (Array.isArray(data) ? data : [])) {
      const { error } = await supabase.from('sbir_awards').upsert({
        firm: a.firm,
        award_title: a.award_title,
        agency: a.agency,
        branch: a.branch,
        phase: a.phase,
        program: a.program,
        contract: a.contract,
        award_year: parseInt(a.award_year) || year,
        award_amount: parseFloat(a.award_amount) || 0,
        uei: a.uei,
        hubzone_owned: a.hubzone_owned,
        socially_disadvantaged: a.socially_economically_disadvantaged,
        women_owned: a.women_owned,
        number_employees: parseInt(a.number_employees) || null,
        company_url: a.company_url,
        city: a.city,
        state: a.state,
        zip: a.zip,
        poc_name: a.poc_name,
        poc_email: a.poc_email,
        poc_phone: a.poc_phone,
        pi_name: a.pi_name,
        pi_email: a.pi_email,
        abstract: a.abstract?.substring(0, 5000),
        award_link: a.award_link,
        updated_at: new Date().toISOString()
      }, { onConflict: 'contract,agency', ignoreDuplicates: false })
      if (!error) loaded++
    }

    return new Response(JSON.stringify({
      success: true, loaded, agency, year,
      total_returned: Array.isArray(data) ? data.length : 0
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
