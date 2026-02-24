import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const ALL_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  'DC','PR','GU','VI','AS','MP'
]

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const body = await req.json().catch(() => ({}))
    const chunkSize = body.chunk_size || 5
    const chunkIndex = body.chunk ?? 0
    const specificStates = body.states as string[] | undefined
    const fiscalYears = body.fiscal_years || [2024, 2025]

    const statesToLoad = specificStates ||
      ALL_STATES.slice(chunkIndex * chunkSize, (chunkIndex + 1) * chunkSize)

    if (statesToLoad.length === 0) {
      return new Response(JSON.stringify({
        done: true, message: 'All chunks processed', total_states: ALL_STATES.length
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const results: Record<string, number> = {}
    let totalInserted = 0

    for (const state of statesToLoad) {
      let stateCount = 0

      for (const year of fiscalYears) {
        try {
          const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filters: {
                time_period: [{ start_date: `${year - 1}-10-01`, end_date: `${year}-09-30` }],
                place_of_performance_locations: [{ country: 'USA', state }],
                award_type_codes: ['A', 'B', 'C', 'D']
              },
              fields: [
                'Award ID', 'Recipient Name', 'Award Amount', 'Total Obligation',
                'Awarding Agency', 'Awarding Sub Agency', 'Funding Agency', 'Description',
                'NAICS Code', 'PSC Code', 'Start Date', 'End Date',
                'Place of Performance State Code', 'Place of Performance City Name',
                'Contract Award Type', 'Type of Set Aside', 'Recipient UEI', 'generated_internal_id'
              ],
              limit: 100, page: 1, sort: 'Award Amount', order: 'desc', subawards: false
            })
          })

          if (!response.ok) {
            console.error(`USASpending error ${state} FY${year}: ${response.status}`)
            continue
          }

          const data = await response.json()
          const awards = data.results || []
          if (awards.length === 0) continue

          const contracts = awards
            .filter((a: any) => (a['generated_internal_id'] || a['Award ID']) && a['Recipient Name'])
            .map((a: any) => ({
              award_id: a['generated_internal_id'] || a['Award ID'],
              recipient_name: a['Recipient Name'],
              recipient_uei: a['Recipient UEI'] || null,
              award_amount: parseFloat(a['Award Amount']) || 0,
              total_obligation: parseFloat(a['Total Obligation']) || 0,
              awarding_agency: a['Awarding Agency'],
              awarding_sub_agency: a['Awarding Sub Agency'],
              funding_agency: a['Funding Agency'],
              description: (a['Description'] || '').substring(0, 2000),
              naics_code: a['NAICS Code'], psc_code: a['PSC Code'],
              award_date: a['Start Date'], start_date: a['Start Date'], end_date: a['End Date'],
              pop_state: a['Place of Performance State Code'] || state,
              pop_city: a['Place of Performance City Name'],
              award_type: a['Contract Award Type'], set_aside_type: a['Type of Set Aside'],
              contract_category: 'contract', source: 'usaspending_state_sweep',
              updated_at: new Date().toISOString()
            }))

          if (contracts.length > 0) {
            const { error } = await supabase.from('contracts')
              .upsert(contracts, { onConflict: 'award_id', ignoreDuplicates: true })
            if (!error) stateCount += contracts.length
            else console.error(`Upsert error ${state}: ${error.message}`)
          }

          await new Promise(r => setTimeout(r, 400))
        } catch (e: any) {
          console.error(`Error ${state} FY${year}:`, e.message)
        }
      }

      results[state] = stateCount
      totalInserted += stateCount
    }

    // Auto-link new contracts to entities
    let entitiesCreated = 0
    try {
      const { data: unlinked } = await supabase.from('contracts')
        .select('recipient_name, recipient_uei, pop_state, pop_city, naics_code')
        .is('recipient_entity_id', null).not('recipient_name', 'is', null).limit(200)

      const seen = new Set<string>()
      for (const r of (unlinked || [])) {
        const key = r.recipient_name?.toLowerCase().trim()
        if (!key || seen.has(key)) continue
        seen.add(key)

        let entityId: string | null = null

        // Try UEI match
        if (r.recipient_uei) {
          const { data: byUei } = await supabase.from('core_entities').select('id').eq('uei', r.recipient_uei).limit(1)
          if (byUei?.length) entityId = byUei[0].id
        }
        // Try name match
        if (!entityId) {
          const { data: byName } = await supabase.from('core_entities').select('id').ilike('canonical_name', r.recipient_name.trim()).limit(1)
          if (byName?.length) entityId = byName[0].id
        }
        // Create new entity
        if (!entityId) {
          const entityType =
            /university|college/i.test(r.recipient_name) ? 'university' :
            /department|agency|commission/i.test(r.recipient_name) ? 'agency' :
            /school|board of education/i.test(r.recipient_name) ? 'school_district' :
            /city of|county|town of/i.test(r.recipient_name) ? 'municipality' :
            /inc|llc|corp|ltd/i.test(r.recipient_name) ? 'contractor' :
            'organization'

          const { data: newE } = await supabase.from('core_entities').insert({
            canonical_name: r.recipient_name.trim(), entity_type: entityType,
            uei: r.recipient_uei, state: r.pop_state, city: r.pop_city,
            naics_codes: r.naics_code ? [r.naics_code] : [],
            identifiers: {}, merged_data: {}, source_records: { source: 'state_sweep' }
          }).select('id').single()
          if (newE) { entityId = newE.id; entitiesCreated++ }
        }

        if (entityId) {
          await supabase.from('contracts').update({ recipient_entity_id: entityId })
            .ilike('recipient_name', r.recipient_name.trim()).is('recipient_entity_id', null)
        }
      }
    } catch (e: any) {
      console.error('Entity linking error:', e.message)
    }

    const nextChunk = chunkIndex + 1
    const hasMore = !specificStates && (nextChunk * chunkSize) < ALL_STATES.length

    return new Response(JSON.stringify({
      success: true,
      states_loaded: statesToLoad,
      contracts_per_state: results,
      total_inserted: totalInserted,
      entities_created: entitiesCreated,
      chunk: chunkIndex,
      next_chunk: hasMore ? nextChunk : null,
      has_more: hasMore,
      states_remaining: hasMore ? ALL_STATES.length - ((chunkIndex + 1) * chunkSize) : 0
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
