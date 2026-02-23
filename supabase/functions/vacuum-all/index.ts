import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface RunResult { source: string; loaded: number; errors: string[]; pages: number }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const SAM_KEY = Deno.env.get('SAM_API_KEY') || Deno.env.get('DATA_GOV_KEY') || ''
  const body = await req.json().catch(() => ({}))
  const mode = body.mode || 'full' // 'full' | 'quick' | 'contracts-only' | 'sbir-only' | 'opportunities-only'
  const startTime = Date.now()
  const results: RunResult[] = []
  const allErrors: string[] = []

  // Create run log entry
  const { data: run } = await supabase.from('vacuum_runs').insert({
    trigger: body.trigger || 'manual', status: 'running', results: { mode }
  }).select('id').single()
  const runId = run?.id

  // Safe fetch with timeout
  async function safeFetch(url: string, options?: RequestInit, timeoutMs = 30000): Promise<Response | null> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      const res = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timeout)
      return res
    } catch (e: any) {
      allErrors.push(`Fetch failed: ${url.substring(0, 100)}... — ${e.message}`)
      return null
    }
  }

  // ========== SOURCE 1: USASpending Contracts ==========
  if (['full', 'quick', 'contracts-only'].includes(mode)) {
    const states = mode === 'quick'
      ? ['MD','VA','DC','CA','TX']
      : ['MD','VA','DC','CA','TX','FL','NY','PA','OH','GA','NC','IL','MA','CO','WA','NJ','AZ','CT','MN','MO','TN','IN','WI','SC','AL','KY','OR','OK','LA','IA','MS','AR','KS','UT','NV','NE','NM','WV','ID','HI','NH','ME','MT','RI','DE','SD','ND','AK','VT','WY']
    const pagesPerState = mode === 'quick' ? 2 : 3
    let totalLoaded = 0
    const sourceErrors: string[] = []

    for (const st of states) {
      for (let page = 1; page <= pagesPerState; page++) {
        try {
          const res = await safeFetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filters: {
                time_period: [{ start_date: '2023-10-01', end_date: '2025-09-30' }],
                award_type_codes: ['A','B','C','D'],
                place_of_performance_locations: [{ country: 'USA', state: st }]
              },
              fields: ['Award ID','Recipient Name','Award Amount','Total Obligation','Description','Start Date','End Date','Awarding Agency','Awarding Sub Agency','Funding Agency','NAICS Code','PSC Code','Place of Performance State Code','Place of Performance City Name','Contract Award Type','Type of Set Aside','Recipient UEI','generated_internal_id'],
              limit: 100, page, sort: 'Award Amount', order: 'desc', subawards: false
            })
          })
          if (!res || !res.ok) { sourceErrors.push(`USASpending ${st} p${page}: HTTP ${res?.status || 'timeout'}`); continue }
          const data = await res.json()
          if (!data.results?.length) break
          for (const r of data.results) {
            const { error } = await supabase.from('contracts').upsert({
              award_id: r['generated_internal_id'] || r['Award ID'],
              recipient_name: r['Recipient Name'], recipient_uei: r['Recipient UEI'],
              awarding_agency: r['Awarding Agency'], awarding_sub_agency: r['Awarding Sub Agency'],
              funding_agency: r['Funding Agency'],
              award_amount: parseFloat(r['Award Amount']) || 0,
              total_obligation: parseFloat(r['Total Obligation']) || 0,
              description: r['Description'], naics_code: r['NAICS Code'], psc_code: r['PSC Code'],
              award_date: r['Start Date'], start_date: r['Start Date'], end_date: r['End Date'],
              pop_state: r['Place of Performance State Code'] || st,
              pop_city: r['Place of Performance City Name'],
              award_type: r['Contract Award Type'], set_aside_type: r['Type of Set Aside'],
              source: 'usaspending_bulk', updated_at: new Date().toISOString()
            }, { onConflict: 'award_id', ignoreDuplicates: false })
            if (!error) totalLoaded++
          }
          if (data.results.length < 100) break
          await new Promise(r => setTimeout(r, 200))
        } catch (e: any) { sourceErrors.push(`USASpending ${st} p${page}: ${e.message}`) }
      }
      await new Promise(r => setTimeout(r, 100))
    }
    results.push({ source: 'usaspending_contracts', loaded: totalLoaded, errors: sourceErrors, pages: states.length * pagesPerState })
  }

  // ========== SOURCE 2: USASpending Subawards ==========
  if (['full'].includes(mode)) {
    let totalLoaded = 0
    const sourceErrors: string[] = []
    const subStates = ['MD','VA','DC','CA','TX','FL','NY','PA','OH','GA']

    for (const st of subStates) {
      for (let page = 1; page <= 2; page++) {
        try {
          const res = await safeFetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filters: {
                time_period: [{ start_date: '2023-10-01', end_date: '2025-09-30' }],
                award_type_codes: ['A','B','C','D'],
                place_of_performance_locations: [{ country: 'USA', state: st }]
              },
              fields: ['Sub-Award ID','Sub-Awardee Name','Sub-Award Amount','Sub-Award Date','Sub-Award Description','Prime Award ID','Prime Recipient Name','Prime Recipient UEI','Awarding Agency','Awarding Sub Agency','NAICS Code','Sub-Awardee City Name','Sub-Awardee State Code','Sub-Awardee Zip Code','Sub-Awardee Country Name'],
              limit: 100, page, sort: 'Sub-Award Amount', order: 'desc', subawards: true
            })
          })
          if (!res || !res.ok) { sourceErrors.push(`Subawards ${st} p${page}: HTTP ${res?.status || 'timeout'}`); continue }
          const data = await res.json()
          if (!data.results?.length) break
          for (const r of data.results) {
            const { error } = await supabase.from('subawards').upsert({
              prime_award_id: r['Prime Award ID'],
              subaward_number: r['Sub-Award ID'],
              subaward_amount: parseFloat(r['Sub-Award Amount']) || 0,
              subaward_action_date: r['Sub-Award Date'],
              subaward_description: r['Sub-Award Description'],
              sub_awardee_name: r['Sub-Awardee Name'],
              sub_awardee_city: r['Sub-Awardee City Name'],
              sub_awardee_state: r['Sub-Awardee State Code'],
              sub_awardee_zip: r['Sub-Awardee Zip Code'],
              sub_awardee_country: r['Sub-Awardee Country Name'],
              prime_recipient_name: r['Prime Recipient Name'],
              prime_recipient_uei: r['Prime Recipient UEI'],
              awarding_agency: r['Awarding Agency'],
              awarding_sub_agency: r['Awarding Sub Agency'],
              naics_code: r['NAICS Code'],
            }, { onConflict: 'prime_award_id,subaward_number', ignoreDuplicates: true })
            if (!error) totalLoaded++
          }
          if (data.results.length < 100) break
          await new Promise(r => setTimeout(r, 200))
        } catch (e: any) { sourceErrors.push(`Subawards ${st}: ${e.message}`) }
      }
    }
    results.push({ source: 'usaspending_subawards', loaded: totalLoaded, errors: sourceErrors, pages: subStates.length * 2 })
  }

  // ========== SOURCE 3: SAM.gov Opportunities ==========
  if (['full', 'quick', 'opportunities-only'].includes(mode) && SAM_KEY) {
    let totalLoaded = 0
    const sourceErrors: string[] = []
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000)
    const today = new Date()
    const fmt = (d: Date) => `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`

    for (let offset = 0; offset < 1000; offset += 100) {
      try {
        const url = `https://api.sam.gov/opportunities/v2/search?api_key=${SAM_KEY}&limit=100&offset=${offset}&postedFrom=${fmt(ninetyDaysAgo)}&postedTo=${fmt(today)}`
        const res = await safeFetch(url)
        if (!res || !res.ok) { sourceErrors.push(`SAM Opps offset ${offset}: HTTP ${res?.status || 'timeout'}`); break }
        const data = await res.json()
        if (!data.opportunitiesData?.length) break
        for (const opp of data.opportunitiesData) {
          const { error } = await supabase.from('opportunities').upsert({
            notice_id: opp.noticeId, title: opp.title, solicitation_number: opp.solicitationNumber?.trim(),
            department: opp.department, sub_tier: opp.subTier, office: opp.office,
            posted_date: opp.postedDate, type: opp.type, base_type: opp.baseType,
            set_aside_type: opp.typeOfSetAsideDescription, set_aside_code: opp.typeOfSetAside,
            response_deadline: opp.responseDeadLine, naics_code: opp.naicsCode,
            classification_code: opp.classificationCode, active: opp.active === 'Yes',
            award_date: opp.award?.date,
            award_amount: opp.award?.amount ? parseFloat(opp.award.amount) : null,
            awardee_name: opp.award?.awardee?.name, awardee_uei: opp.award?.awardee?.ueiSAM,
            raw_data: opp, updated_at: new Date().toISOString()
          }, { onConflict: 'notice_id', ignoreDuplicates: false })
          if (!error) totalLoaded++
        }
        if (data.opportunitiesData.length < 100) break
        await new Promise(r => setTimeout(r, 300))
      } catch (e: any) { sourceErrors.push(`SAM Opps: ${e.message}`); break }
    }
    results.push({ source: 'sam_opportunities', loaded: totalLoaded, errors: sourceErrors, pages: 10 })
  }

  // ========== SOURCE 4: SBIR/STTR Awards ==========
  if (['full', 'quick', 'sbir-only'].includes(mode)) {
    const agencies = ['DOD','HHS','NASA','NSF','DOE','USDA','EPA','DOT','DHS','ED','DOC']
    const years = mode === 'quick' ? [2024] : [2024, 2023, 2022]
    let totalLoaded = 0
    const sourceErrors: string[] = []

    for (const agency of agencies) {
      for (const year of years) {
        try {
          const res = await safeFetch(`https://api.www.sbir.gov/public/api/awards?agency=${agency}&year=${year}`, undefined, 60000)
          if (!res || !res.ok) { sourceErrors.push(`SBIR ${agency} ${year}: HTTP ${res?.status || 'timeout'}`); continue }
          const data = await res.json()
          for (const a of (Array.isArray(data) ? data : [])) {
            if (!a.firm || !a.contract) continue
            const { error } = await supabase.from('sbir_awards').upsert({
              firm: a.firm, award_title: a.award_title, agency: a.agency, branch: a.branch,
              phase: a.phase, program: a.program, contract: a.contract,
              award_year: parseInt(a.award_year) || year,
              award_amount: parseFloat(a.award_amount) || 0,
              uei: a.uei, hubzone_owned: a.hubzone_owned,
              socially_disadvantaged: a.socially_economically_disadvantaged,
              women_owned: a.women_owned,
              number_employees: parseInt(a.number_employees) || null,
              company_url: a.company_url, city: a.city, state: a.state, zip: a.zip,
              poc_name: a.poc_name, poc_email: a.poc_email, pi_name: a.pi_name,
              abstract: a.abstract?.substring(0, 5000), award_link: a.award_link,
            }, { onConflict: 'contract,agency', ignoreDuplicates: true })
            if (!error) totalLoaded++
          }
          await new Promise(r => setTimeout(r, 500))
        } catch (e: any) { sourceErrors.push(`SBIR ${agency} ${year}: ${e.message}`) }
      }
    }
    results.push({ source: 'sbir_awards', loaded: totalLoaded, errors: sourceErrors, pages: agencies.length * years.length })
  }

  // ========== SOURCE 5: SAM.gov Entity Registrations ==========
  if (['full'].includes(mode) && SAM_KEY) {
    const states = ['MD','VA','DC','CA','TX','FL','NY','PA','OH','GA']
    let totalLoaded = 0
    const sourceErrors: string[] = []

    for (const st of states) {
      for (let page = 0; page < 5; page++) {
        try {
          const url = `https://api.sam.gov/entity-information/v3/entities?api_key=${SAM_KEY}&registrationStatus=A&samRegistered=Yes&physicalAddressProvinceOrStateCode=${st}&includeSections=entityRegistration,coreData&page=${page}&size=100`
          const res = await safeFetch(url)
          if (!res || !res.ok) { sourceErrors.push(`SAM Entity ${st} p${page}: HTTP ${res?.status || 'timeout'}`); break }
          const data = await res.json()
          if (!data.entityData?.length) break
          for (const e of data.entityData) {
            const reg = e.entityRegistration || {}
            const core = e.coreData || {}
            const addr = core.physicalAddress || {}
            if (!reg.ueiSAM) continue
            const { error } = await supabase.from('sam_entities').upsert({
              uei: reg.ueiSAM, cage_code: reg.cageCode, legal_business_name: reg.legalBusinessName,
              dba_name: reg.dbaName, registration_status: reg.registrationStatus,
              purpose_of_registration: reg.purposeOfRegistrationDesc,
              registration_date: reg.registrationDate, expiration_date: reg.registrationExpirationDate,
              physical_city: addr.city, physical_state: addr.stateOrProvinceCode,
              physical_zip: addr.zipCode, physical_country: addr.countryCode,
              entity_structure: core.entityInformation?.entityStructureDesc,
              entity_url: core.entityInformation?.entityURL,
              business_types: core.businessTypes?.businessTypeList || [],
              congressional_district: core.congressionalDistrict,
              updated_at: new Date().toISOString()
            }, { onConflict: 'uei', ignoreDuplicates: false })
            if (!error) totalLoaded++
          }
          if (data.entityData.length < 100) break
          await new Promise(r => setTimeout(r, 300))
        } catch (e: any) { sourceErrors.push(`SAM Entity ${st}: ${e.message}`); break }
      }
    }
    results.push({ source: 'sam_entities', loaded: totalLoaded, errors: sourceErrors, pages: states.length * 5 })
  }

  // ========== SOURCE 6: SAM.gov Exclusions ==========
  if (['full'].includes(mode) && SAM_KEY) {
    let totalLoaded = 0
    const sourceErrors: string[] = []

    for (let page = 0; page < 10; page++) {
      try {
        const url = `https://api.sam.gov/entity-information/v2/exclusions?api_key=${SAM_KEY}&isActive=true&page=${page}&size=100`
        const res = await safeFetch(url)
        if (!res || !res.ok) { sourceErrors.push(`Exclusions p${page}: HTTP ${res?.status || 'timeout'}`); break }
        const data = await res.json()
        if (!data.results?.length) break
        for (const ex of data.results) {
          const { error } = await supabase.from('sam_exclusions').upsert({
            classification: ex.classificationType, exclusion_name: ex.name,
            exclusion_type: ex.exclusionType, exclusion_program: ex.exclusionProgram,
            excluding_agency: ex.excludingAgencyCode, uei: ex.ueiSAM, cage_code: ex.cageCode,
            active_date: ex.activateDate, termination_date: ex.terminationDate,
            record_status: ex.recordStatus, city: ex.city, state: ex.stateProvince,
            country: ex.country, description: ex.description,
          }, { onConflict: 'exclusion_name,active_date,excluding_agency', ignoreDuplicates: true })
          if (!error) totalLoaded++
        }
        if (data.results.length < 100) break
        await new Promise(r => setTimeout(r, 300))
      } catch (e: any) { sourceErrors.push(`Exclusions: ${e.message}`); break }
    }
    results.push({ source: 'sam_exclusions', loaded: totalLoaded, errors: sourceErrors, pages: 10 })
  }

  // ========== SOURCE 7: NSF Awards ==========
  if (['full'].includes(mode)) {
    const keywords = ['cybersecurity','artificial intelligence','machine learning','data science','cloud computing','quantum computing','autonomous systems','robotics','climate','blockchain','5G','biotechnology']
    let totalLoaded = 0
    const sourceErrors: string[] = []

    for (const kw of keywords) {
      for (let offset = 1; offset <= 75; offset += 25) {
        try {
          const url = `https://api.nsf.gov/services/v1/awards.json?keyword=${encodeURIComponent(kw)}&offset=${offset}&rpp=25&printFields=id,title,abstractText,amount,startDate,expDate,piFirstName,piLastName,awardeeName,awardeeCity,awardeeStateCode,awardeeZipCode,fundProgramName,fundAgencyCode`
          const res = await safeFetch(url)
          if (!res || !res.ok) { sourceErrors.push(`NSF ${kw}: HTTP ${res?.status || 'timeout'}`); break }
          const data = await res.json()
          const awards = data?.response?.award || []
          if (!awards.length) break
          for (const a of awards) {
            if (!a.id) continue
            const { error } = await supabase.from('nsf_awards').upsert({
              award_number: a.id, title: a.title, abstract: a.abstractText?.substring(0, 5000),
              award_amount: parseFloat(a.amount) || 0, start_date: a.startDate, exp_date: a.expDate,
              pi_first_name: a.piFirstName, pi_last_name: a.piLastName,
              institution_name: a.awardeeName, institution_city: a.awardeeCity,
              institution_state: a.awardeeStateCode, institution_zip: a.awardeeZipCode,
              program_element: a.fundProgramName, fund_agency: a.fundAgencyCode,
            }, { onConflict: 'award_number', ignoreDuplicates: true })
            if (!error) totalLoaded++
          }
          if (awards.length < 25) break
          await new Promise(r => setTimeout(r, 300))
        } catch (e: any) { sourceErrors.push(`NSF ${kw}: ${e.message}`); break }
      }
    }
    results.push({ source: 'nsf_awards', loaded: totalLoaded, errors: sourceErrors, pages: keywords.length * 3 })
  }

  // ========== ENRICHMENT: Auto-link entities ==========
  if (['full', 'quick'].includes(mode)) {
    let linked = 0, created = 0
    try {
      const { data: unlinked } = await supabase.from('contracts')
        .select('recipient_name, recipient_uei, pop_state, naics_code')
        .is('recipient_entity_id', null).not('recipient_name', 'is', null).limit(200)

      const seen = new Set<string>()
      for (const r of (unlinked || [])) {
        const key = r.recipient_name?.toUpperCase()
        if (!key || seen.has(key)) continue
        seen.add(key)

        let entityId: string | null = null
        if (r.recipient_uei) {
          const { data: byUei } = await supabase.from('core_entities').select('id').eq('uei', r.recipient_uei).limit(1)
          if (byUei?.length) entityId = byUei[0].id
        }
        if (!entityId) {
          const { data: byName } = await supabase.from('core_entities').select('id').ilike('canonical_name', r.recipient_name).limit(1)
          if (byName?.length) entityId = byName[0].id
        }
        if (!entityId) {
          const { data: newE } = await supabase.from('core_entities').insert({
            canonical_name: r.recipient_name, entity_type: 'organization', uei: r.recipient_uei,
            state: r.pop_state, naics_codes: r.naics_code ? [r.naics_code] : [],
            identifiers: {}, merged_data: {}, source_records: {}
          }).select('id').single()
          if (newE) { entityId = newE.id; created++ }
        }
        if (entityId) {
          await supabase.from('contracts').update({ recipient_entity_id: entityId })
            .ilike('recipient_name', r.recipient_name).is('recipient_entity_id', null)
          linked++
        }
      }

      // Create teaming relationships from subawards
      const { data: subs } = await supabase.from('subawards')
        .select('prime_recipient_name, sub_awardee_name, awarding_agency, subaward_amount')
        .not('prime_recipient_name', 'is', null).not('sub_awardee_name', 'is', null).limit(200)

      let teamingCreated = 0
      for (const s of (subs || [])) {
        const { data: prime } = await supabase.from('core_entities').select('id').ilike('canonical_name', s.prime_recipient_name).limit(1)
        const { data: sub } = await supabase.from('core_entities').select('id').ilike('canonical_name', s.sub_awardee_name).limit(1)
        if (prime?.length && sub?.length && prime[0].id !== sub[0].id) {
          await supabase.from('core_relationships').insert({
            source_entity_id: prime[0].id, target_entity_id: sub[0].id,
            relationship_type: 'subcontracts_to', confidence: 95,
            metadata: { agency: s.awarding_agency, value: s.subaward_amount }
          }).maybeSingle()
          teamingCreated++
        }
      }

      results.push({ source: 'enrichment', loaded: linked + created + teamingCreated, errors: [], pages: 0 })
    } catch (e: any) { allErrors.push(`Enrichment: ${e.message}`) }
  }

  // ========== FINALIZE ==========
  const totalLoaded = results.reduce((sum, r) => sum + r.loaded, 0)
  const duration = (Date.now() - startTime) / 1000

  if (runId) {
    await supabase.from('vacuum_runs').update({
      completed_at: new Date().toISOString(),
      status: allErrors.length > 0 ? 'completed_with_errors' : 'completed',
      results: Object.fromEntries(results.map(r => [r.source, { loaded: r.loaded, errors: r.errors.length, pages: r.pages }])),
      errors: allErrors,
      total_loaded: totalLoaded,
      total_errors: allErrors.length,
      duration_seconds: duration
    }).eq('id', runId)
  }

  return new Response(JSON.stringify({
    success: true, mode,
    total_loaded: totalLoaded,
    duration_seconds: Math.round(duration),
    sources: results.map(r => ({ source: r.source, loaded: r.loaded, errors: r.errors.length })),
    errors: allErrors.length > 0 ? allErrors : undefined,
    run_id: runId
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
