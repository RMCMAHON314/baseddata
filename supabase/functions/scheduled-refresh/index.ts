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

  const results: any = { contracts: 0, opportunities: 0, entities_enriched: 0, errors: [] }

  try {
    // STEP 1: Load latest contracts from USASpending (last 7 days, top states)
    const topStates = ['MD', 'VA', 'DC', 'CA', 'TX']
    
    for (const state of topStates) {
      try {
        const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filters: {
              time_period: [{
                start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end_date: new Date().toISOString().split('T')[0]
              }],
              award_type_codes: ['A', 'B', 'C', 'D'],
              place_of_performance_locations: [{ country: 'USA', state: state }]
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
            page: 1,
            sort: 'Award Amount',
            order: 'desc'
          })
        })

        const data = await response.json()
        for (const r of (data.results || [])) {
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
            source: 'usaspending_scheduled',
            updated_at: new Date().toISOString()
          }, { onConflict: 'award_id', ignoreDuplicates: false })
          if (!error) results.contracts++
        }
      } catch (e) {
        results.errors.push(`${state}: ${e.message}`)
      }

      await new Promise(r => setTimeout(r, 300))
    }

    // STEP 2: Load latest SAM.gov opportunities (if key exists)
    const SAM_KEY = Deno.env.get('SAM_API_KEY') || Deno.env.get('DATA_GOV_KEY')
    if (SAM_KEY) {
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const today = new Date()
        const formatDate = (d: Date) => `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`

        const url = `https://api.sam.gov/opportunities/v2/search?api_key=${SAM_KEY}&limit=25&offset=0&postedFrom=${formatDate(sevenDaysAgo)}&postedTo=${formatDate(today)}`
        const response = await fetch(url)
        
        if (response.ok) {
          const data = await response.json()
          for (const opp of (data.opportunitiesData || [])) {
            const { error } = await supabase.from('opportunities').upsert({
              notice_id: opp.noticeId,
              title: opp.title,
              solicitation_number: opp.solicitationNumber?.trim(),
              department: opp.department,
              sub_tier: opp.subTier,
              office: opp.office,
              posted_date: opp.postedDate,
              type: opp.type,
              base_type: opp.baseType,
              set_aside_type: opp.typeOfSetAsideDescription,
              set_aside_code: opp.typeOfSetAside,
              response_deadline: opp.responseDeadLine,
              naics_code: opp.naicsCode,
              active: opp.active === 'Yes',
              award_date: opp.award?.date,
              award_amount: opp.award?.amount ? parseFloat(opp.award.amount) : null,
              awardee_name: opp.award?.awardee?.name,
              source: 'sam_gov',
              raw_data: opp,
              updated_at: new Date().toISOString()
            }, { onConflict: 'notice_id', ignoreDuplicates: false })
            if (!error) results.opportunities++
          }
        }
      } catch (e) {
        results.errors.push(`SAM: ${e.message}`)
      }
    }

    // STEP 3: Auto-create entities from new contract recipients
    const { data: newRecipients } = await supabase
      .from('contracts')
      .select('recipient_name, recipient_uei, pop_state, naics_code')
      .is('recipient_entity_id', null)
      .not('recipient_name', 'is', null)
      .limit(50)

    if (newRecipients?.length) {
      for (const r of newRecipients) {
        const { data: existing } = await supabase
          .from('core_entities')
          .select('id')
          .ilike('canonical_name', r.recipient_name)
          .limit(1)
        
        let entityId: string

        if (existing?.length) {
          entityId = existing[0].id
        } else {
          const { data: newEntity, error } = await supabase
            .from('core_entities')
            .insert({
              canonical_name: r.recipient_name,
              entity_type: 'organization',
              uei: r.recipient_uei,
              state: r.pop_state,
              naics_codes: r.naics_code ? [r.naics_code] : [],
            })
            .select('id')
            .single()
          
          if (!error && newEntity) entityId = newEntity.id
          else continue
        }

        await supabase
          .from('contracts')
          .update({ recipient_entity_id: entityId })
          .ilike('recipient_name', r.recipient_name)
          .is('recipient_entity_id', null)

        results.entities_enriched++
      }
    }

    // STEP 4: Update entity aggregate stats
    await supabase.rpc('sync_all_entity_stats').catch(() => {})

    // Log the refresh
    await supabase.from('system_logs').insert({
      level: 'INFO',
      source: 'scheduled-refresh',
      message: `Refresh complete: ${results.contracts} contracts, ${results.opportunities} opportunities, ${results.entities_enriched} entities`,
      details: results
    }).catch(() => {})

    return new Response(JSON.stringify({
      success: true,
      ...results,
      timestamp: new Date().toISOString()
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
