import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface RunResult { source: string; loaded: number; errors: string[]; pages: number }

const ALL_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']
const TOP5 = ['MD','VA','DC','CA','TX']

// Time budget: bail out before CPU limit (50s hard limit, we stop at 45s)
const TIME_BUDGET_MS = 45_000

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const SAM_KEY = Deno.env.get('SAM_API_KEY') || Deno.env.get('DATA_GOV_KEY') || ''
  const body = await req.json().catch(() => ({}))
  const mode = body.mode || 'quick'  // Default to quick to avoid CPU timeout
  const startTime = Date.now()
  const results: RunResult[] = []
  const allErrors: string[] = []

  function timeRemaining() { return TIME_BUDGET_MS - (Date.now() - startTime) }
  function hasTime() { return timeRemaining() > 3000 } // keep 3s buffer

  const { data: run } = await supabase.from('vacuum_runs').insert({
    trigger: body.trigger || 'manual', status: 'running', results: { mode }
  }).select('id').single()
  const runId = run?.id

  async function safeFetch(url: string, options?: RequestInit, timeoutMs = 25000): Promise<Response | null> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), Math.min(timeoutMs, timeRemaining()))
      const res = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timeout)
      return res
    } catch (e: any) {
      allErrors.push(`Fetch: ${url.substring(0, 80)}... — ${e.message}`)
      return null
    }
  }

  const statesFor = (m: string) => m === 'quick' ? TOP5 : ALL_STATES

  // ========== SOURCE 1A: USASpending CONTRACTS ==========
  if (['full','quick','contracts-only'].includes(mode) && hasTime()) {
    const states = statesFor(mode)
    const maxPages = mode === 'quick' ? 2 : 3
    let totalLoaded = 0
    const sourceErrors: string[] = []

    for (const st of states) {
      if (!hasTime()) { sourceErrors.push(`Time budget: stopped at state ${st}`); break }
      for (let page = 1; page <= maxPages; page++) {
        if (!hasTime()) break
        try {
          const res = await safeFetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
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
          if (!res || !res.ok) { sourceErrors.push(`Contracts ${st} p${page}: ${res?.status}`); continue }
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
              contract_category: 'contract', source: 'usaspending_bulk', updated_at: new Date().toISOString()
            }, { onConflict: 'award_id', ignoreDuplicates: false })
            if (!error) totalLoaded++
          }
          if (data.results.length < 100) break
          await new Promise(r => setTimeout(r, 100))
        } catch (e: any) { sourceErrors.push(`Contracts ${st}: ${e.message}`) }
      }
    }
    results.push({ source: 'contracts', loaded: totalLoaded, errors: sourceErrors, pages: states.length * maxPages })
  }

  // ========== SOURCE 1B: USASpending GRANTS ==========
  if (['full','quick','grants-only'].includes(mode) && hasTime()) {
    const states = statesFor(mode)
    const maxPages = mode === 'quick' ? 2 : 3
    let totalLoaded = 0
    const sourceErrors: string[] = []

    for (const st of states) {
      if (!hasTime()) { sourceErrors.push(`Time budget: stopped at state ${st}`); break }
      for (let page = 1; page <= maxPages; page++) {
        if (!hasTime()) break
        try {
          const res = await safeFetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filters: {
                time_period: [{ start_date: '2023-10-01', end_date: '2025-09-30' }],
                award_type_codes: ['02','03','04','05'],
                place_of_performance_locations: [{ country: 'USA', state: st }]
              },
              fields: ['Award ID','Recipient Name','Award Amount','Description','Start Date','End Date','Awarding Agency','Awarding Sub Agency','Funding Agency','Place of Performance State Code','Place of Performance City Name','Award Type','Recipient UEI','generated_internal_id','CFDA Number'],
              limit: 100, page, sort: 'Award Amount', order: 'desc', subawards: false
            })
          })
          if (!res || !res.ok) { sourceErrors.push(`Grants ${st} p${page}: ${res?.status}`); continue }
          const data = await res.json()
          if (!data.results?.length) break
          for (const r of data.results) {
            const { error } = await supabase.from('grants').upsert({
              award_id: r['generated_internal_id'] || r['Award ID'],
              recipient_name: r['Recipient Name'], recipient_uei: r['Recipient UEI'],
              awarding_agency: r['Awarding Agency'], awarding_sub_agency: r['Awarding Sub Agency'],
              funding_agency: r['Funding Agency'],
              award_amount: parseFloat(r['Award Amount']) || 0,
              description: r['Description'],
              award_date: r['Start Date'], start_date: r['Start Date'], end_date: r['End Date'],
              recipient_state: r['Place of Performance State Code'] || st,
              pop_state: r['Place of Performance State Code'] || st,
              recipient_city: r['Place of Performance City Name'],
              pop_city: r['Place of Performance City Name'],
              grant_type: r['Award Type'], cfda_number: r['CFDA Number'],
              grant_category: 'grant', source: 'usaspending_bulk', updated_at: new Date().toISOString()
            }, { onConflict: 'award_id', ignoreDuplicates: false })
            if (!error) totalLoaded++
          }
          if (data.results.length < 100) break
          await new Promise(r => setTimeout(r, 100))
        } catch (e: any) { sourceErrors.push(`Grants ${st}: ${e.message}`) }
      }
    }
    results.push({ source: 'grants', loaded: totalLoaded, errors: sourceErrors, pages: states.length * maxPages })
  }

  // ========== SOURCE 2: SAM.gov Opportunities ==========
  if (['full','quick','opportunities-only'].includes(mode) && SAM_KEY && hasTime()) {
    let totalLoaded = 0
    const sourceErrors: string[] = []
    const today = new Date()
    const ago = new Date(Date.now() - 90 * 86400000)
    const fmt = (d: Date) => `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`

    for (let offset = 0; offset < 500; offset += 100) {
      if (!hasTime()) { sourceErrors.push('Time budget reached'); break }
      try {
        const url = `https://api.sam.gov/opportunities/v2/search?api_key=${SAM_KEY}&limit=100&offset=${offset}&postedFrom=${fmt(ago)}&postedTo=${fmt(today)}`
        const res = await safeFetch(url)
        if (!res || !res.ok) { sourceErrors.push(`Opps offset ${offset}: ${res?.status}`); break }
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
            award_date: opp.award?.date, award_amount: opp.award?.amount ? parseFloat(opp.award.amount) : null,
            awardee_name: opp.award?.awardee?.name, awardee_uei: opp.award?.awardee?.ueiSAM,
            raw_data: opp, updated_at: new Date().toISOString()
          }, { onConflict: 'notice_id', ignoreDuplicates: false })
          if (!error) totalLoaded++
        }
        if (data.opportunitiesData.length < 100) break
        await new Promise(r => setTimeout(r, 300))
      } catch (e: any) { sourceErrors.push(`Opps: ${e.message}`); break }
    }
    results.push({ source: 'opportunities', loaded: totalLoaded, errors: sourceErrors, pages: 5 })
  }

  // ========== SOURCE 3: SBIR Awards (limited) ==========
  if (['full','quick','sbir-only'].includes(mode) && hasTime()) {
    const agencies = mode === 'quick' ? ['DOD','HHS','NASA'] : ['DOD','HHS','NASA','NSF','DOE','USDA','EPA']
    const years = mode === 'quick' ? [2024] : [2024, 2023]
    let totalLoaded = 0
    const sourceErrors: string[] = []

    for (const agency of agencies) {
      if (!hasTime()) break
      for (const year of years) {
        if (!hasTime()) break
        try {
          const res = await safeFetch(`https://api.www.sbir.gov/public/api/awards?agency=${agency}&year=${year}`, undefined, 30000)
          if (!res || !res.ok) { sourceErrors.push(`SBIR ${agency} ${year}: ${res?.status}`); continue }
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

  // ========== SOURCE 4: NSF Awards (limited keywords) ==========
  if (['full'].includes(mode) && hasTime()) {
    const keywords = ['cybersecurity','artificial intelligence','data science','cloud computing','quantum computing','biotechnology']
    let totalLoaded = 0
    const sourceErrors: string[] = []

    for (const kw of keywords) {
      if (!hasTime()) break
      try {
        const url = `https://api.nsf.gov/services/v1/awards.json?keyword=${encodeURIComponent(kw)}&offset=1&rpp=25&printFields=id,title,abstractText,amount,startDate,expDate,piFirstName,piLastName,awardeeName,awardeeCity,awardeeStateCode,awardeeZipCode,fundProgramName,fundAgencyCode`
        const res = await safeFetch(url)
        if (!res || !res.ok) { sourceErrors.push(`NSF ${kw}: ${res?.status}`); continue }
        const data = await res.json()
        const awards = data?.response?.award || []
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
        await new Promise(r => setTimeout(r, 300))
      } catch (e: any) { sourceErrors.push(`NSF ${kw}: ${e.message}`) }
    }
    results.push({ source: 'nsf_awards', loaded: totalLoaded, errors: sourceErrors, pages: keywords.length })
  }

  // ========== SOURCE 5: GSA CALC+ LABOR RATES ==========
  if (['full'].includes(mode) && hasTime()) {
    const keywords = ['software engineer','project manager','cybersecurity','data scientist','systems administrator','cloud architect','program manager','network engineer','devops','database administrator']
    let totalLoaded = 0
    const sourceErrors: string[] = []

    for (const kw of keywords) {
      if (!hasTime()) break
      try {
        const url = `https://api.gsa.gov/acquisition/calc/v3/api/ceilingrates/?keyword=${encodeURIComponent(kw)}&page=1&page_size=100&ordering=current_price&sort=desc`
        const res = await safeFetch(url)
        if (!res || !res.ok) { sourceErrors.push(`CALC ${kw}: ${res?.status}`); continue }
        const data = await res.json()
        const rates = data?.hits || data?.results || []
        if (!Array.isArray(rates)) continue
        for (const r of rates) {
          if (!r.labor_category || !r.vendor_name) continue
          const { error } = await supabase.from('gsa_labor_rates').upsert({
            labor_category: r.labor_category, vendor_name: r.vendor_name, idv_piid: r.idv_piid,
            current_price: parseFloat(r.current_price) || null,
            second_year_price: parseFloat(r.second_year_price) || null,
            next_year_price: parseFloat(r.next_year_price) || null,
            min_years_experience: parseInt(r.min_years_experience) || null,
            education_level: r.education_level, business_size: r.business_size,
            security_clearance: r.security_clearance, site: r.site,
            schedule: r.schedule, sin: r.sin, updated_at: new Date().toISOString()
          }, { onConflict: 'vendor_name,idv_piid,labor_category', ignoreDuplicates: true })
          if (!error) totalLoaded++
        }
        await new Promise(r => setTimeout(r, 200))
      } catch (e: any) { sourceErrors.push(`CALC ${kw}: ${e.message}`) }
    }
    results.push({ source: 'gsa_labor_rates', loaded: totalLoaded, errors: sourceErrors, pages: keywords.length })
  }

  // ========== ENRICHMENT: Cross-link entities ==========
  if (hasTime()) {
    let linked = 0, created = 0
    try {
      const { data: unlinked } = await supabase.from('contracts')
        .select('recipient_name, recipient_uei, pop_state, naics_code')
        .is('recipient_entity_id', null).not('recipient_name', 'is', null).limit(100)

      const seen = new Set<string>()
      for (const r of (unlinked || [])) {
        if (!hasTime()) break
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
      results.push({ source: 'enrichment', loaded: linked + created, errors: [], pages: 0 })
    } catch (e: any) { allErrors.push(`Enrichment: ${e.message}`) }
  }

  // ========== ENTITY LINKING ==========
  if (hasTime()) {
    console.log('[VACUUM] Running entity linker...')
    try {
      const { data, error } = await supabase.rpc('link_transactions_to_entities')
      if (error) { console.error('[VACUUM] Entity linker error:', error); allErrors.push(`Linker: ${error.message}`) }
      else { console.log('[VACUUM] Entity linker done') }
    } catch (e: any) { allErrors.push(`Linker crash: ${e.message}`) }
  }

  // ========== FINALIZE ==========
  const totalLoaded = results.reduce((sum, r) => sum + r.loaded, 0)
  const duration = (Date.now() - startTime) / 1000

  if (runId) {
    await supabase.from('vacuum_runs').update({
      completed_at: new Date().toISOString(),
      status: allErrors.length > 0 ? 'completed_with_errors' : 'completed',
      results: Object.fromEntries(results.map(r => [r.source, { loaded: r.loaded, errors: r.errors.length, pages: r.pages }])),
      errors: allErrors, total_loaded: totalLoaded, total_errors: allErrors.length,
      duration_seconds: duration
    }).eq('id', runId)
  }

  return new Response(JSON.stringify({
    success: true, mode, total_loaded: totalLoaded,
    duration_seconds: Math.round(duration),
    sources: results.map(r => ({ source: r.source, loaded: r.loaded, errors: r.errors.length })),
    errors: allErrors.length > 0 ? allErrors : undefined, run_id: runId
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
