import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

async function fetchWithRetry(url: string, retries = 3, delayMs = 10000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url)
    if (res.status === 429) {
      console.log(`Rate limited, waiting ${delayMs}ms (retry ${i + 1}/${retries})`)
      await new Promise(r => setTimeout(r, delayMs))
      delayMs *= 2
      continue
    }
    return res
  }
  throw new Error('SBIR API rate limit exceeded after retries')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const body = await req.json().catch(() => ({}))
  // Support agency-based or keyword-based loading
  const agencies = body.agencies || ['DOD', 'HHS', 'NASA', 'NSF', 'DOE', 'DHS']
  const year = body.year || 2024
  const rows = body.rows || 200

  try {
    let totalLoaded = 0
    const results: any[] = []

    for (const agency of agencies) {
      try {
        // Rate limit: wait between requests
        await new Promise(r => setTimeout(r, 3000))
        
        // Updated API URL per SBIR.gov docs
        const url = `https://api.www.sbir.gov/public/api/awards?agency=${encodeURIComponent(agency)}&year=${year}&rows=${rows}`
        console.log(`[load-sbir] Fetching: ${agency} year=${year} rows=${rows}`)
        
        const res = await fetchWithRetry(url)
        if (!res.ok) {
          console.error(`[load-sbir] ${agency}: ${res.status} ${res.statusText}`)
          results.push({ agency, year, error: `${res.status}`, loaded: 0 })
          continue
        }

        const data = await res.json()
        const awards = Array.isArray(data) ? data : (data.results || data.awards || [])
        
        if (awards.length === 0) {
          console.log(`[load-sbir] ${agency}: no awards returned`)
          results.push({ agency, year, loaded: 0 })
          continue
        }

        // Batch upsert
        const batchSize = 50
        let agencyLoaded = 0
        
        for (let i = 0; i < awards.length; i += batchSize) {
          const batch = awards.slice(i, i + batchSize).map((a: any) => ({
            firm: a.firm || a.company || 'Unknown',
            award_title: a.award_title || a.awardTitle || a.title || 'Untitled',
            agency: a.agency || agency,
            branch: a.branch,
            phase: a.phase,
            program: a.program || 'SBIR',
            contract: a.contract || a.solicitation_number || a.agency_tracking_number || `${agency}-${a.award_year || year}-${i}`,
            award_year: parseInt(a.award_year) || year,
            award_amount: parseFloat(a.award_amount || a.awardAmount || '0') || 0,
            uei: a.uei,
            hubzone_owned: a.hubzone_owned === 'Y' || a.hubzone_owned === true ? 'Y' : 'N',
            socially_disadvantaged: a.socially_economically_disadvantaged === 'Y' ? 'Y' : 'N',
            women_owned: a.women_owned === 'Y' || a.women_owned === true ? 'Y' : 'N',
            number_employees: parseInt(a.number_employees || '0') || null,
            company_url: a.company_url || a.firm_url,
            city: a.ri_city || a.city,
            state: a.ri_state_code || a.state,
            zip: a.zip,
            poc_name: a.poc_name,
            poc_email: a.poc_email,
            poc_phone: a.poc_phone,
            pi_name: a.pi_name,
            pi_email: a.pi_email,
            abstract: a.abstract?.substring(0, 5000),
            award_link: a.award_link,
            updated_at: new Date().toISOString()
          }))

          const { error } = await supabase
            .from('sbir_awards')
            .upsert(batch, { onConflict: 'contract,agency', ignoreDuplicates: true })
          
          if (error) {
            // Fallback: insert ignoring duplicates
            const { error: insertErr } = await supabase.from('sbir_awards').insert(batch)
            if (!insertErr) agencyLoaded += batch.length
            else console.error(`[load-sbir] Batch error for ${agency}:`, insertErr.message)
          } else {
            agencyLoaded += batch.length
          }
        }

        totalLoaded += agencyLoaded
        results.push({ agency, year, returned: awards.length, loaded: agencyLoaded })
        console.log(`[load-sbir] ${agency}: ${agencyLoaded} loaded from ${awards.length} returned`)
      } catch (e: any) {
        console.error(`[load-sbir] ${agency} error:`, e.message)
        results.push({ agency, year, error: e.message, loaded: 0 })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total_loaded: totalLoaded,
      agencies_processed: results.length,
      results
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
