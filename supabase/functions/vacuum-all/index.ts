import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface RunResult { source: string; loaded: number; errors: string[]; pages: number }

const ALL_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']
const TOP5 = ['MD','VA','DC','CA','TX']

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const SAM_KEY = Deno.env.get('SAM_API_KEY') || Deno.env.get('DATA_GOV_KEY') || ''
  const body = await req.json().catch(() => ({}))
  const mode = body.mode || 'full'
  // Modes: 'full' | 'quick' | 'contracts-only' | 'grants-only' | 'sbir-only' | 'opportunities-only'
  const startTime = Date.now()
  const results: RunResult[] = []
  const allErrors: string[] = []

  const { data: run } = await supabase.from('vacuum_runs').insert({
    trigger: body.trigger || 'manual', status: 'running', results: { mode }
  }).select('id').single()
  const runId = run?.id

  async function safeFetch(url: string, options?: RequestInit, timeoutMs = 30000): Promise<Response | null> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      const res = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timeout)
      return res
    } catch (e: any) {
      allErrors.push(`Fetch: ${url.substring(0, 80)}... — ${e.message}`)
      return null
    }
  }

  const statesFor = (m: string) => m === 'quick' ? TOP5 : ALL_STATES

  // ========== SOURCE 1A: USASpending CONTRACTS (A,B,C,D) — ALL 50 STATES ==========
  if (['full','quick','contracts-only'].includes(mode)) {
    const states = statesFor(mode)
    const maxPages = mode === 'quick' ? 2 : 5
    let totalLoaded = 0
    const sourceErrors: string[] = []

    for (const st of states) {
      for (let page = 1; page <= maxPages; page++) {
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
          await new Promise(r => setTimeout(r, 150))
        } catch (e: any) { sourceErrors.push(`Contracts ${st}: ${e.message}`) }
      }
      await new Promise(r => setTimeout(r, 50))
    }
    results.push({ source: 'contracts', loaded: totalLoaded, errors: sourceErrors, pages: states.length * maxPages })
  }

  // ========== SOURCE 1B: USASpending IDVs (GWACs, BPAs, IDIQs, FSS) ==========
  if (['full','contracts-only'].includes(mode)) {
    const states = ALL_STATES
    let totalLoaded = 0
    const sourceErrors: string[] = []

    for (const st of states) {
      for (let page = 1; page <= 3; page++) {
        try {
          const res = await safeFetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filters: {
                time_period: [{ start_date: '2023-10-01', end_date: '2025-09-30' }],
                award_type_codes: ['IDV_A','IDV_B','IDV_B_A','IDV_B_B','IDV_B_C','IDV_C','IDV_D','IDV_E'],
                place_of_performance_locations: [{ country: 'USA', state: st }]
              },
              fields: ['Award ID','Recipient Name','Award Amount','Total Obligation','Description','Start Date','End Date','Awarding Agency','Awarding Sub Agency','Funding Agency','NAICS Code','PSC Code','Place of Performance State Code','Place of Performance City Name','Contract Award Type','Type of Set Aside','Recipient UEI','generated_internal_id'],
              limit: 100, page, sort: 'Award Amount', order: 'desc', subawards: false
            })
          })
          if (!res || !res.ok) { sourceErrors.push(`IDVs ${st} p${page}: ${res?.status}`); continue }
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
              contract_category: 'idv', source: 'usaspending_bulk', updated_at: new Date().toISOString()
            }, { onConflict: 'award_id', ignoreDuplicates: false })
            if (!error) totalLoaded++
          }
          if (data.results.length < 100) break
          await new Promise(r => setTimeout(r, 150))
        } catch (e: any) { sourceErrors.push(`IDVs ${st}: ${e.message}`) }
      }
    }
    results.push({ source: 'idvs', loaded: totalLoaded, errors: sourceErrors, pages: states.length * 3 })
  }

  // ========== SOURCE 1C: USASpending GRANTS (02,03,04,05) — ALL 50 STATES ==========
  if (['full','quick','grants-only'].includes(mode)) {
    const states = statesFor(mode)
    const maxPages = mode === 'quick' ? 2 : 4
    let totalLoaded = 0
    const sourceErrors: string[] = []

    for (const st of states) {
      for (let page = 1; page <= maxPages; page++) {
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
          await new Promise(r => setTimeout(r, 150))
        } catch (e: any) { sourceErrors.push(`Grants ${st}: ${e.message}`) }
      }
      await new Promise(r => setTimeout(r, 50))
    }
    results.push({ source: 'grants', loaded: totalLoaded, errors: sourceErrors, pages: states.length * maxPages })
  }

  // ========== SOURCE 2: USASpending SUBAWARDS — ALL 50 STATES ==========
  if (['full'].includes(mode)) {
    let totalLoaded = 0
    const sourceErrors: string[] = []

    for (const st of ALL_STATES) {
      for (let page = 1; page <= 2; page++) {
        try {
          const res = await safeFetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
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
          if (!res || !res.ok) { sourceErrors.push(`Subs ${st} p${page}: ${res?.status}`); continue }
          const data = await res.json()
          if (!data.results?.length) break
          for (const r of data.results) {
            const { error } = await supabase.from('subawards').upsert({
              prime_award_id: r['Prime Award ID'], subaward_number: r['Sub-Award ID'],
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
          await new Promise(r => setTimeout(r, 150))
        } catch (e: any) { sourceErrors.push(`Subs ${st}: ${e.message}`) }
      }
    }
    results.push({ source: 'subawards', loaded: totalLoaded, errors: sourceErrors, pages: ALL_STATES.length * 2 })
  }

  // ========== SOURCE 3: SAM.gov Opportunities — last 90 days ==========
  if (['full','quick','opportunities-only'].includes(mode) && SAM_KEY) {
    let totalLoaded = 0
    const sourceErrors: string[] = []
    const today = new Date()
    const ago = new Date(Date.now() - 90 * 86400000)
    const fmt = (d: Date) => `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`

    for (let offset = 0; offset < 1000; offset += 100) {
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
    results.push({ source: 'opportunities', loaded: totalLoaded, errors: sourceErrors, pages: 10 })
  }

  // ========== SOURCE 4: SBIR/STTR Awards — ALL agencies, 3 years ==========
  if (['full','quick','sbir-only'].includes(mode)) {
    const agencies = ['DOD','HHS','NASA','NSF','DOE','USDA','EPA','DOT','DHS','ED','DOC']
    const years = mode === 'quick' ? [2024] : [2024, 2023, 2022]
    let totalLoaded = 0
    const sourceErrors: string[] = []

    for (const agency of agencies) {
      for (const year of years) {
        try {
          const res = await safeFetch(`https://api.www.sbir.gov/public/api/awards?agency=${agency}&year=${year}`, undefined, 60000)
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

  // ========== SOURCE 5: SAM.gov Entities — ALL 50 STATES ==========
  if (['full'].includes(mode) && SAM_KEY) {
    let totalLoaded = 0
    const sourceErrors: string[] = []

    for (const st of ALL_STATES) {
      for (let page = 0; page < 3; page++) {
        try {
          const url = `https://api.sam.gov/entity-information/v3/entities?api_key=${SAM_KEY}&registrationStatus=A&samRegistered=Yes&physicalAddressProvinceOrStateCode=${st}&includeSections=entityRegistration,coreData&page=${page}&size=100`
          const res = await safeFetch(url)
          if (!res || !res.ok) { sourceErrors.push(`SAM ${st} p${page}: ${res?.status}`); break }
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
        } catch (e: any) { sourceErrors.push(`SAM ${st}: ${e.message}`); break }
      }
    }
    results.push({ source: 'sam_entities', loaded: totalLoaded, errors: sourceErrors, pages: ALL_STATES.length * 3 })
  }

  // ========== SOURCE 6: SAM.gov Exclusions — ALL active ==========
  if (['full'].includes(mode) && SAM_KEY) {
    let totalLoaded = 0
    const sourceErrors: string[] = []

    for (let page = 0; page < 10; page++) {
      try {
        const url = `https://api.sam.gov/entity-information/v2/exclusions?api_key=${SAM_KEY}&isActive=true&page=${page}&size=100`
        const res = await safeFetch(url)
        if (!res || !res.ok) { sourceErrors.push(`Excl p${page}: ${res?.status}`); break }
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
      } catch (e: any) { sourceErrors.push(`Excl: ${e.message}`); break }
    }
    results.push({ source: 'exclusions', loaded: totalLoaded, errors: sourceErrors, pages: 10 })
  }

  // ========== SOURCE 7: NSF Awards — 12 tech keywords ==========
  if (['full'].includes(mode)) {
    const keywords = ['cybersecurity','artificial intelligence','machine learning','data science','cloud computing','quantum computing','autonomous systems','robotics','climate','blockchain','5G','biotechnology']
    let totalLoaded = 0
    const sourceErrors: string[] = []

    for (const kw of keywords) {
      for (let offset = 1; offset <= 75; offset += 25) {
        try {
          const url = `https://api.nsf.gov/services/v1/awards.json?keyword=${encodeURIComponent(kw)}&offset=${offset}&rpp=25&printFields=id,title,abstractText,amount,startDate,expDate,piFirstName,piLastName,awardeeName,awardeeCity,awardeeStateCode,awardeeZipCode,fundProgramName,fundAgencyCode`
          const res = await safeFetch(url)
          if (!res || !res.ok) { sourceErrors.push(`NSF ${kw}: ${res?.status}`); break }
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

  // ========== SOURCE 8: FPDS Competition Data (NEW) ==========
  if (['full'].includes(mode) && SAM_KEY) {
    const deptCodes = ['9700','7000','3600','4700','8000','1400','1500','6900','8900','2000']
    let totalLoaded = 0
    const sourceErrors: string[] = []

    for (const dept of deptCodes) {
      for (let page = 0; page < 3; page++) {
        try {
          const url = `https://api.sam.gov/contract-awards/v1/search?api_key=${SAM_KEY}&lastModifiedDate=[01/01/2024,]&contractingDepartmentCode=${dept}&modificationNumber=0&limit=100&offset=${page * 100}`
          const res = await safeFetch(url)
          if (!res || !res.ok) { sourceErrors.push(`FPDS ${dept} p${page}: ${res?.status}`); break }
          const data = await res.json()
          const awards = data?.results || data?.data || []
          if (!Array.isArray(awards) || !awards.length) break
          for (const a of awards) {
            const piid = a.piid || a.contractNumber
            if (!piid) continue
            const { error } = await supabase.from('fpds_awards').upsert({
              piid, modification_number: a.modificationNumber || '0',
              contracting_department: a.contractingDepartmentName,
              contracting_subtier: a.contractingSubTierAgencyName,
              contracting_office: a.contractingOfficeName,
              vendor_name: a.vendorName, vendor_uei: a.vendorUEI,
              vendor_city: a.vendorCity, vendor_state: a.vendorState,
              dollars_obligated: parseFloat(a.dollarsObligated) || 0,
              base_and_all_options: parseFloat(a.baseAndAllOptionsValue) || 0,
              naics_code: a.naicsCode, psc_code: a.pscCode,
              award_type: a.awardType, set_aside: a.typeOfSetAside,
              extent_competed: a.extentCompeted,
              number_of_offers: parseInt(a.numberOfOffersReceived) || null,
              effective_date: a.effectiveDate, completion_date: a.completionDate,
              description_of_requirement: a.descriptionOfRequirement?.substring(0, 2000),
              pop_state: a.popStateCode, pop_city: a.popCity,
            }, { onConflict: 'piid,modification_number', ignoreDuplicates: false })
            if (!error) totalLoaded++
          }
          if (awards.length < 100) break
          await new Promise(r => setTimeout(r, 300))
        } catch (e: any) { sourceErrors.push(`FPDS ${dept}: ${e.message}`); break }
      }
    }
    results.push({ source: 'fpds_awards', loaded: totalLoaded, errors: sourceErrors, pages: deptCodes.length * 3 })
  }

  // ========== ENRICHMENT: Cross-link entities + teaming ==========
  if (['full','quick'].includes(mode)) {
    let linked = 0, created = 0
    try {
      const { data: unlinked } = await supabase.from('contracts')
        .select('recipient_name, recipient_uei, pop_state, naics_code')
        .is('recipient_entity_id', null).not('recipient_name', 'is', null).limit(300)

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

      const { data: subs } = await supabase.from('subawards')
        .select('prime_recipient_name, sub_awardee_name, awarding_agency, subaward_amount')
        .not('prime_recipient_name', 'is', null).not('sub_awardee_name', 'is', null).limit(300)

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
