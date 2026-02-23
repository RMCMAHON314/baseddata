import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALL_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
]

const PRIORITY_ORDER = [
  'MD','VA','DC','CA','TX','FL','NY','PA','OH','GA',
  'NC','IL','MA','CO','WA','NJ','AZ','CT','MN','MO',
  ...ALL_STATES.filter(s => !['MD','VA','DC','CA','TX','FL','NY','PA','OH','GA','NC','IL','MA','CO','WA','NJ','AZ','CT','MN','MO'].includes(s))
]

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const body = await req.json().catch(() => ({}))
  const mode = body.mode || 'targeted'
  const fiscalYear = body.fiscal_year || 2025
  const pagesPerState = body.pages || 3

  const states = mode === 'full' ? PRIORITY_ORDER : PRIORITY_ORDER.slice(0, 5)
  const results: Record<string, string> = {}
  let totalLoaded = 0

  for (const state of states) {
    try {
      for (let page = 1; page <= pagesPerState; page++) {
        const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filters: {
              time_period: [{ start_date: `${fiscalYear - 1}-10-01`, end_date: `${fiscalYear}-09-30` }],
              award_type_codes: ['A', 'B', 'C', 'D'],
              place_of_performance_locations: [{ country: 'USA', state }]
            },
            fields: [
              'Award ID', 'Recipient Name', 'Award Amount', 'Total Obligation',
              'Description', 'Start Date', 'End Date', 'Awarding Agency',
              'Awarding Sub Agency', 'Funding Agency', 'NAICS Code', 'PSC Code',
              'Place of Performance State Code', 'Place of Performance City Name',
              'Contract Award Type', 'Type of Set Aside', 'Recipient UEI',
              'generated_internal_id'
            ],
            limit: 100,
            page,
            sort: 'Award Amount',
            order: 'desc'
          })
        })

        const data = await response.json()
        const records = data.results || []
        if (records.length === 0) break

        for (const r of records) {
          const { error } = await supabase.from('contracts').upsert({
            award_id: r['generated_internal_id'] || r['Award ID'],
            recipient_name: r['Recipient Name'],
            recipient_uei: r['Recipient UEI'],
            awarding_agency: r['Awarding Agency'],
            awarding_sub_agency: r['Awarding Sub Agency'],
            funding_agency: r['Funding Agency'],
            award_amount: parseFloat(r['Award Amount']) || 0,
            total_obligation: parseFloat(r['Total Obligation']) || 0,
            description: r['Description'],
            naics_code: r['NAICS Code'],
            psc_code: r['PSC Code'],
            award_date: r['Start Date'],
            start_date: r['Start Date'],
            end_date: r['End Date'],
            pop_state: r['Place of Performance State Code'] || state,
            pop_city: r['Place of Performance City Name'],
            award_type: r['Contract Award Type'],
            set_aside_type: r['Type of Set Aside'],
            source: 'usaspending_bulk',
            updated_at: new Date().toISOString()
          }, { onConflict: 'award_id', ignoreDuplicates: false })
          if (!error) totalLoaded++
        }

        await new Promise(r => setTimeout(r, 200))
      }
      results[state] = 'done'
    } catch (e) {
      results[state] = `error: ${e.message}`
    }
  }

  return new Response(JSON.stringify({
    success: true,
    total_loaded: totalLoaded,
    states_processed: Object.keys(results).length,
    results, mode,
    fiscal_year: fiscalYear
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
