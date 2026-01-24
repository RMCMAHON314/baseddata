import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const API_KEY = Deno.env.get('SAM_API_KEY') || ''

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const startTime = Date.now()
  
  console.log('🦑🔥 KRAKEN RAGE MODE ACTIVATED 🔥🦑')
  
  const results = {
    usaspending: { records: 0, entities: 0, contracts: 0 },
    sam_entities: { records: 0, entities: 0 },
    sam_opportunities: { records: 0 },
    grants_gov: { records: 0 },
    nih: { records: 0, entities: 0, grants: 0 },
    nsf: { records: 0, entities: 0, grants: 0 },
    fema: { records: 0 },
    cms: { records: 0, entities: 0 },
    fda: { records: 0, entities: 0 },
    total_records: 0,
    total_entities: 0,
    total_contracts: 0,
    total_grants: 0,
    errors: [] as string[]
  }

  // PARALLEL RAGE - Hit ALL major APIs simultaneously
  const promises = [
    ...['MD', 'VA', 'DC', 'PA', 'DE', 'NJ', 'NY', 'NC', 'FL', 'TX', 'CA', 'IL', 'OH', 'GA', 'MA'].map(state => 
      rageUSASpending(supabase, state, results)
    ),
    rageSAMEntities(supabase, 'MD', results),
    rageSAMEntities(supabase, 'VA', results),
    rageSAMEntities(supabase, 'DC', results),
    rageSAMOpportunities(supabase, results),
    rageGrantsGov(supabase, results),
    rageNIH(supabase, results),
    rageNSF(supabase, results),
    rageCMS(supabase, results),
    rageFDA(supabase, results),
    rageFEMA(supabase, results),
  ]

  await Promise.allSettled(promises)

  results.total_records = results.usaspending.records + results.sam_entities.records + 
    results.sam_opportunities.records + results.grants_gov.records + results.nih.records +
    results.nsf.records + results.fema.records + results.cms.records + results.fda.records
  
  results.total_entities = results.usaspending.entities + results.sam_entities.entities +
    results.nih.entities + results.nsf.entities + results.cms.entities + results.fda.entities
  
  results.total_contracts = results.usaspending.contracts
  results.total_grants = results.nih.grants + results.nsf.grants

  const duration = Date.now() - startTime

  try {
    await supabase.from('system_logs').insert({
      level: 'INFO',
      component: 'kraken-rage',
      message: `🦑 RAGE: ${results.total_records} records, ${results.total_entities} entities in ${duration}ms`,
      details: results
    })
  } catch (_) { /* ignore */ }

  console.log(`🦑🔥 RAGE COMPLETE: ${results.total_records} records in ${duration}ms 🔥🦑`)

  return new Response(JSON.stringify({ success: true, duration_ms: duration, ...results }), 
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})

async function rageUSASpending(supabase: any, state: string, results: any) {
  try {
    const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters: {
          time_period: [{ start_date: '2020-01-01', end_date: '2025-12-31' }],
          award_type_codes: ['A', 'B', 'C', 'D'],
          place_of_performance_locations: [{ country: 'USA', state }]
        },
        fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Description', 'Start Date', 'End Date',
                 'Awarding Agency', 'Awarding Sub Agency', 'Place of Performance State Code',
                 'Place of Performance City', 'NAICS Code', 'PSC Code', 'recipient_uei', 'Award Type'],
        page: 1, limit: 100, sort: 'Award Amount', order: 'desc'
      })
    })
    if (!res.ok) return
    const data = await res.json()
    const awards = data.results || []
    results.usaspending.records += awards.length

    for (const a of awards) {
      const name = a['Recipient Name']
      if (!name || name.length < 2) continue

      const { data: entity } = await supabase.from('core_entities').upsert({
        canonical_name: name, entity_type: 'organization',
        city: a['Place of Performance City'], state: a['Place of Performance State Code'],
        country: 'USA', uei: a.recipient_uei, source_count: 1, data_quality_score: 85
      }, { onConflict: 'canonical_name', ignoreDuplicates: false }).select('id').single()

      if (entity?.id) {
        results.usaspending.entities++
        await supabase.from('contracts').upsert({
          award_id: a['Award ID'], recipient_entity_id: entity.id, recipient_name: name,
          recipient_uei: a.recipient_uei, awarding_agency: a['Awarding Agency'],
          awarding_sub_agency: a['Awarding Sub Agency'],
          award_amount: parseFloat(a['Award Amount']) || 0, description: a['Description'],
          start_date: a['Start Date'], end_date: a['End Date'],
          pop_state: a['Place of Performance State Code'], pop_city: a['Place of Performance City'],
          naics_code: a['NAICS Code'], psc_code: a['PSC Code'], award_type: a['Award Type'],
          source: 'usaspending'
        }, { onConflict: 'award_id', ignoreDuplicates: true })
        results.usaspending.contracts++
        await supabase.from('core_facts').insert({
          entity_id: entity.id, fact_type: 'contract_award',
          fact_value: { award_id: a['Award ID'], amount: parseFloat(a['Award Amount']) || 0, agency: a['Awarding Agency'] },
          source: 'usaspending', confidence: 0.95
        }).catch(() => {})
        await supabase.rpc('sync_entity_contract_stats', { p_entity_id: entity.id }).catch(() => {})
      }
    }
  } catch (e: any) { results.errors.push(`usaspending-${state}: ${e.message}`) }
}

async function rageSAMEntities(supabase: any, state: string, results: any) {
  if (!API_KEY) return
  try {
    const res = await fetch(`https://api.sam.gov/entity-information/v3/entities?api_key=${API_KEY}&registrationStatus=A&physicalAddressStateCode=${state}&pageSize=100`)
    if (!res.ok) return
    const data = await res.json()
    const entities = data.entityData || []
    results.sam_entities.records += entities.length
    for (const e of entities) {
      const reg = e.entityRegistration || {}, core = e.coreData || {}
      const name = reg.legalBusinessName || reg.dbaName
      if (!name) continue
      await supabase.from('core_entities').upsert({
        canonical_name: name, entity_type: 'organization',
        city: core.physicalAddress?.city, state: core.physicalAddress?.stateOrProvinceCode,
        country: 'USA', uei: reg.ueiSAM, cage_code: reg.cageCode,
        naics_codes: core.naicsCodeList?.map((n: any) => n.naicsCode) || [],
        business_types: e.assertions?.goodsAndServices?.businessTypeList || [],
        source_count: 1, data_quality_score: 95
      }, { onConflict: 'canonical_name', ignoreDuplicates: false })
      results.sam_entities.entities++
    }
  } catch (e: any) { results.errors.push(`sam-${state}: ${e.message}`) }
}

async function rageSAMOpportunities(supabase: any, results: any) {
  if (!API_KEY) return
  try {
    const res = await fetch(`https://api.sam.gov/opportunities/v2/search?api_key=${API_KEY}&postedFrom=01/01/2024&limit=100`)
    if (!res.ok) return
    const data = await res.json()
    const opps = data.opportunitiesData || []
    results.sam_opportunities.records += opps.length
    for (const o of opps) {
      await supabase.from('opportunities').upsert({
        notice_id: o.noticeId, solicitation_number: o.solicitationNumber,
        title: o.title, description: o.description?.slice(0, 10000),
        notice_type: o.noticeType, department: o.department,
        posted_date: o.postedDate, response_deadline: o.responseDeadLine,
        pop_state: o.placeOfPerformance?.state?.code, naics_code: o.naicsCode,
        set_aside: o.typeOfSetAside, ui_link: o.uiLink, is_active: o.active === 'Yes'
      }, { onConflict: 'notice_id', ignoreDuplicates: true })
    }
  } catch (e: any) { results.errors.push(`sam-opps: ${e.message}`) }
}

async function rageGrantsGov(supabase: any, results: any) {
  try {
    const res = await fetch('https://www.grants.gov/grantsws/rest/opportunities/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: '', oppStatuses: 'forecasted|posted', rows: 100 })
    })
    if (!res.ok) return
    const data = await res.json()
    const opps = data.oppHits || []
    results.grants_gov.records += opps.length
    for (const o of opps) {
      await supabase.from('opportunities').upsert({
        notice_id: `grants-gov-${o.id || o.oppNumber}`, title: o.title, description: o.synopsis,
        department: o.agencyName, posted_date: o.openDate, response_deadline: o.closeDate,
        award_ceiling: o.awardCeiling, award_floor: o.awardFloor, is_active: true
      }, { onConflict: 'notice_id', ignoreDuplicates: true })
    }
  } catch (e: any) { results.errors.push(`grants-gov: ${e.message}`) }
}

async function rageNIH(supabase: any, results: any) {
  try {
    const res = await fetch('https://api.reporter.nih.gov/v2/projects/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ criteria: { fiscal_years: [2023, 2024, 2025] }, limit: 100 })
    })
    if (!res.ok) return
    const data = await res.json()
    const projects = data.results || []
    results.nih.records += projects.length
    for (const p of projects) {
      const org = p.organization
      if (!org?.org_name) continue
      const { data: entity } = await supabase.from('core_entities').upsert({
        canonical_name: org.org_name,
        entity_type: org.org_name.toLowerCase().includes('university') ? 'university' : 'research_organization',
        city: org.org_city, state: org.org_state, uei: org.org_uei, source_count: 1
      }, { onConflict: 'canonical_name', ignoreDuplicates: false }).select('id').single()
      if (entity?.id) {
        results.nih.entities++
        await supabase.from('grants').upsert({
          grant_id: p.project_num, recipient_entity_id: entity.id, recipient_name: org.org_name,
          awarding_agency: 'NIH', award_amount: p.award_amount, project_title: p.project_title,
          start_date: p.project_start_date, end_date: p.project_end_date, source: 'nih_reporter'
        }, { onConflict: 'grant_id', ignoreDuplicates: true })
        results.nih.grants++
      }
    }
  } catch (e: any) { results.errors.push(`nih: ${e.message}`) }
}

async function rageNSF(supabase: any, results: any) {
  try {
    const res = await fetch('https://api.nsf.gov/services/v1/awards.json?offset=1&rpp=100')
    if (!res.ok) return
    const data = await res.json()
    const awards = data.response?.award || []
    results.nsf.records += awards.length
    for (const a of awards) {
      if (!a.awardeeName) continue
      const { data: entity } = await supabase.from('core_entities').upsert({
        canonical_name: a.awardeeName, entity_type: 'research_organization',
        city: a.awardeeCity, state: a.awardeeStateCode, source_count: 1
      }, { onConflict: 'canonical_name', ignoreDuplicates: false }).select('id').single()
      if (entity?.id) {
        results.nsf.entities++
        await supabase.from('grants').upsert({
          grant_id: `nsf-${a.id}`, recipient_entity_id: entity.id, recipient_name: a.awardeeName,
          awarding_agency: 'NSF', award_amount: parseFloat(a.fundsObligatedAmt) || 0,
          project_title: a.title, start_date: a.startDate, end_date: a.expDate, source: 'nsf'
        }, { onConflict: 'grant_id', ignoreDuplicates: true })
        results.nsf.grants++
      }
    }
  } catch (e: any) { results.errors.push(`nsf: ${e.message}`) }
}

async function rageCMS(supabase: any, results: any) {
  try {
    const res = await fetch('https://data.cms.gov/provider-data/api/1/datastore/query/mj5m-pzi6/0?limit=100')
    if (!res.ok) return
    const data = await res.json()
    const providers = data.results || []
    results.cms.records += providers.length
    for (const p of providers) {
      const name = p.provider_name || p.facility_name
      if (!name) continue
      await supabase.from('core_entities').upsert({
        canonical_name: name, entity_type: 'healthcare_provider',
        city: p.city, state: p.state, source_count: 1
      }, { onConflict: 'canonical_name', ignoreDuplicates: false })
      results.cms.entities++
    }
  } catch (e: any) { results.errors.push(`cms: ${e.message}`) }
}

async function rageFDA(supabase: any, results: any) {
  try {
    const res = await fetch('https://api.fda.gov/drug/drugsfda.json?limit=100')
    if (!res.ok) return
    const data = await res.json()
    const drugs = data.results || []
    results.fda.records += drugs.length
    for (const d of drugs) {
      const name = d.sponsor_name
      if (!name) continue
      await supabase.from('core_entities').upsert({
        canonical_name: name, entity_type: 'pharmaceutical_company', source_count: 1
      }, { onConflict: 'canonical_name', ignoreDuplicates: false })
      results.fda.entities++
    }
  } catch (e: any) { results.errors.push(`fda: ${e.message}`) }
}

async function rageFEMA(supabase: any, results: any) {
  try {
    const res = await fetch('https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=100&$orderby=declarationDate desc')
    if (!res.ok) return
    const data = await res.json()
    const disasters = data.DisasterDeclarationsSummaries || []
    results.fema.records += disasters.length
    for (const d of disasters) {
      await supabase.from('core_facts').insert({
        fact_type: 'fema_disaster',
        fact_value: { number: d.disasterNumber, title: d.declarationTitle, state: d.state, type: d.incidentType },
        source: 'fema', confidence: 1.0
      }).catch(() => {})
    }
  } catch (e: any) { results.errors.push(`fema: ${e.message}`) }
}
