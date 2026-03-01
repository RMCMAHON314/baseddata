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

  const body = await req.json().catch(() => ({}))
  const naics = body.naics || ['541512', '541511', '541519', '541513', '541611', '541690'] // IT & consulting
  const maxPages = body.maxPages || 3

  try {
    let totalLoaded = 0
    const results: any[] = []

    // Strategy 1: Pull from USASpending for GSA-awarded contracts
    for (const naicsCode of naics) {
      try {
        await new Promise(r => setTimeout(r, 500))
        
        const data = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filters: {
              time_period: [{ start_date: '2023-10-01', end_date: '2026-09-30' }],
              award_type_codes: ['A', 'B', 'C', 'D'],
              agencies: [{ type: 'awarding', tier: 'toptier', name: 'General Services Administration' }],
              naics_codes: { require: [naicsCode] },
            },
            fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency', 'Awarding Sub Agency',
              'Start Date', 'End Date', 'Description', 'NAICS Code', 'PSC Code',
              'Place of Performance State Code'],
            page: 1,
            limit: 100,
            sort: 'Award Amount',
            order: 'desc',
          }),
        }).then(r => r.json())

        const awards = data.results || []
        
        if (awards.length > 0) {
          const batch = awards.map((r: any) => ({
            contract_number: r['Award ID'] || `gsa-${Math.random().toString(36).slice(2, 12)}`,
            contractor_name: r['Recipient Name'] || 'Unknown',
            schedule: 'MAS',
            sin_number: naicsCode,
            contract_start: r['Start Date'],
            contract_end: r['End Date'],
            pricing_type: 'GSA Schedule',
            award_amount: r['Award Amount'],
            description: r['Description']?.substring(0, 2000),
            naics_code: r['NAICS Code'] || naicsCode,
            psc_code: r['PSC Code'],
            pop_state: r['Place of Performance State Code'],
            source: 'usaspending_gsa',
            updated_at: new Date().toISOString(),
          }))

          const { error } = await supabase.from('gsa_contracts').upsert(batch, { 
            onConflict: 'contract_number', ignoreDuplicates: false 
          })
          
          if (!error) {
            totalLoaded += batch.length
            results.push({ naics: naicsCode, loaded: batch.length })
          } else {
            // Fallback insert
            const { error: ie } = await supabase.from('gsa_contracts').insert(batch)
            if (!ie) totalLoaded += batch.length
            results.push({ naics: naicsCode, loaded: batch.length, fallback: true })
          }
        }
      } catch (e) {
        console.error(`[load-gsa-contracts] NAICS ${naicsCode}:`, e.message)
        results.push({ naics: naicsCode, error: e.message })
      }
    }

    // Strategy 2: If SAM key available, try SAM contract opportunities for GSA
    if (SAM_KEY && totalLoaded < 50) {
      try {
        const samUrl = `https://api.sam.gov/opportunities/v2/search?api_key=${SAM_KEY}&postedFrom=01/01/2025&limit=100&organizationId=100006688` // GSA org ID
        const res = await fetch(samUrl)
        if (res.ok) {
          const data = await res.json()
          console.log(`[load-gsa-contracts] SAM returned ${data.opportunitiesData?.length || 0} GSA opportunities`)
        }
      } catch (e) {
        console.log('[load-gsa-contracts] SAM fallback skipped:', e.message)
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
