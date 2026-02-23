import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const body = await req.json().catch(() => ({}))
  const state = body.state || 'MD'
  const fiscalYear = body.fiscal_year || 2025
  const awardType = body.award_type || 'contracts'
  const page = body.page || 1
  const limit = body.limit || 100

  try {
    let results: string[] = []
    let totalCount = 0

    if (awardType === 'contracts') {
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
            'Awarding Sub Agency', 'Funding Agency', 'NAICS Code',
            'PSC Code', 'Place of Performance State Code',
            'Place of Performance City Name', 'Place of Performance Zip5',
            'Contract Award Type', 'Type of Set Aside',
            'Recipient UEI', 'generated_internal_id'
          ],
          limit,
          page,
          sort: 'Award Amount',
          order: 'desc',
          subawards: false
        })
      })

      const data = await response.json()
      totalCount = data.page_metadata?.total || 0

      for (const r of data.results || []) {
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
          pop_zip: r['Place of Performance Zip5'],
          award_type: r['Contract Award Type'],
          set_aside_type: r['Type of Set Aside'],
          source: 'usaspending_bulk',
          updated_at: new Date().toISOString()
        }, { onConflict: 'award_id', ignoreDuplicates: false })
        if (!error) results.push(r['Recipient Name'])
      }
    } else if (awardType === 'grants') {
      const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            time_period: [{ start_date: `${fiscalYear - 1}-10-01`, end_date: `${fiscalYear}-09-30` }],
            award_type_codes: ['02', '03', '04', '05'],
            recipient_locations: [{ country: 'USA', state }]
          },
          fields: [
            'Award ID', 'Recipient Name', 'Award Amount', 'Description',
            'Start Date', 'End Date', 'Awarding Agency', 'CFDA Number',
            'Recipient UEI', 'generated_internal_id'
          ],
          limit,
          page,
          sort: 'Award Amount',
          order: 'desc',
          subawards: false
        })
      })

      const data = await response.json()
      totalCount = data.page_metadata?.total || 0

      for (const r of data.results || []) {
        const { error } = await supabase.from('grants').upsert({
          grant_id: r['generated_internal_id'] || r['Award ID'],
          recipient_name: r['Recipient Name'],
          awarding_agency: r['Awarding Agency'],
          award_amount: parseFloat(r['Award Amount']) || 0,
          description: r['Description'],
          cfda_number: r['CFDA Number'],
          start_date: r['Start Date'],
          end_date: r['End Date'],
          recipient_state: state,
          source: 'usaspending_bulk',
        }, { onConflict: 'grant_id', ignoreDuplicates: false })
        if (!error) results.push(r['Recipient Name'])
      }
    }

    return new Response(JSON.stringify({
      success: true,
      loaded: results.length,
      total_available: totalCount,
      page, state,
      fiscal_year: fiscalYear,
      award_type: awardType,
      has_more: page * limit < totalCount
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
