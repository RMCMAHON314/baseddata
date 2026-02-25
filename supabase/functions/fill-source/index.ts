import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALL_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const SAM_KEY = Deno.env.get('SAM_API_KEY') || Deno.env.get('DATA_GOV_KEY') || ''
  const body = await req.json().catch(() => ({}))
  const source = body.source as string
  const stateChunk = body.states as string[] | undefined
  const startTime = Date.now()
  let loaded = 0
  const errors: string[] = []

  async function safeFetch(url: string, options?: RequestInit): Promise<Response | null> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 25000)
      const res = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timeout)
      return res
    } catch (e: any) { errors.push(`Fetch: ${e.message}`); return null }
  }

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

  try {
    // ─── SBIR/STTR Awards (with heavy rate limit respect) ───
    if (source === 'sbir') {
      const agencies = body.agencies || ['DOD','HHS','NASA','NSF','DOE','USDA','EPA','DOT','DHS','ED','DOC']
      const years = body.years || [2024, 2023, 2022]
      for (const agency of agencies) {
        for (const year of years) {
          try {
            await delay(2000) // SBIR API needs 2s between requests
            const res = await safeFetch(`https://api.www.sbir.gov/public/api/awards?agency=${agency}&year=${year}`)
            if (!res) continue
            if (res.status === 429) { errors.push(`SBIR ${agency} ${year}: rate limited`); await delay(5000); continue }
            if (!res.ok) { errors.push(`SBIR ${agency} ${year}: ${res.status}`); continue }
            const data = await res.json()
            const items = Array.isArray(data) ? data : []
            for (const a of items) {
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
              if (!error) loaded++
            }
            console.log(`[fill-source] SBIR ${agency} ${year}: ${items.length} awards`)
          } catch (e: any) { errors.push(`SBIR ${agency} ${year}: ${e.message}`) }
        }
      }
    }

    // ─── NSF Awards (smaller batch) ───
    if (source === 'nsf') {
      const keywords = body.keywords || ['cybersecurity','artificial intelligence','machine learning','data science','cloud computing','quantum computing']
      for (const kw of keywords) {
        for (let offset = 1; offset <= 50; offset += 25) {
          try {
            await delay(500)
            const url = `https://api.nsf.gov/services/v1/awards.json?keyword=${encodeURIComponent(kw)}&offset=${offset}&rpp=25&printFields=id,title,abstractText,amount,startDate,expDate,piFirstName,piLastName,awardeeName,awardeeCity,awardeeStateCode,awardeeZipCode,fundProgramName,fundAgencyCode`
            const res = await safeFetch(url)
            if (!res || !res.ok) { errors.push(`NSF ${kw}: ${res?.status}`); break }
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
              if (!error) loaded++
            }
            console.log(`[fill-source] NSF ${kw} offset=${offset}: ${awards.length} awards`)
            if (awards.length < 25) break
          } catch (e: any) { errors.push(`NSF ${kw}: ${e.message}`); break }
        }
      }
    }

    // ─── GSA Labor Rates (CALC+ API v2 endpoint) ───
    if (source === 'labor-rates') {
      // Try both v2 and v3 endpoints
      const keywords = body.keywords || ['software engineer','project manager','cybersecurity','data scientist','systems administrator','business analyst','cloud architect','program manager','help desk','network engineer','security analyst','devops','database administrator','technical writer','quality assurance']
      for (const kw of keywords) {
        try {
          await delay(300)
          // Try CALC+ v2 first (more reliable)
          const url = `https://api.gsa.gov/acquisition/calc/v2/prices/?search=${encodeURIComponent(kw)}&limit=100`
          const res = await safeFetch(url)
          if (!res) continue
          
          let rates: any[] = []
          if (res.ok) {
            const data = await res.json()
            rates = data?.results || data?.hits || data || []
          } else {
            // Fallback: try v3
            const url3 = `https://api.gsa.gov/acquisition/calc/v3/api/ceilingrates/?keyword=${encodeURIComponent(kw)}&page=1&page_size=100`
            const res3 = await safeFetch(url3)
            if (res3 && res3.ok) {
              const data3 = await res3.json()
              rates = data3?.hits || data3?.results || []
            } else {
              errors.push(`CALC ${kw}: v2=${res.status} v3=${res3?.status}`)
              continue
            }
          }
          
          if (!Array.isArray(rates)) continue
          for (const r of rates) {
            if (!r.labor_category || !r.vendor_name) continue
            const { error } = await supabase.from('gsa_labor_rates').upsert({
              labor_category: r.labor_category, vendor_name: r.vendor_name,
              idv_piid: r.idv_piid || r.contract_number || 'unknown',
              current_price: parseFloat(r.current_price || r.price) || null,
              second_year_price: parseFloat(r.second_year_price) || null,
              next_year_price: parseFloat(r.next_year_price) || null,
              min_years_experience: parseInt(r.min_years_experience) || null,
              education_level: r.education_level, business_size: r.business_size,
              security_clearance: r.security_clearance, site: r.site,
              schedule: r.schedule, sin: r.sin, updated_at: new Date().toISOString()
            }, { onConflict: 'vendor_name,idv_piid,labor_category', ignoreDuplicates: true })
            if (!error) loaded++
          }
          console.log(`[fill-source] CALC ${kw}: ${rates.length} rates`)
        } catch (e: any) { errors.push(`CALC ${kw}: ${e.message}`) }
      }
    }

    // ─── IDVs (chunked by state) ───
    if (source === 'idvs') {
      const states = stateChunk || ALL_STATES.slice(0, 10)
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
            if (!res || !res.ok) { errors.push(`IDVs ${st} p${page}: ${res?.status}`); continue }
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
              if (!error) loaded++
            }
            console.log(`[fill-source] IDVs ${st} p${page}: ${data.results.length}`)
            if (data.results.length < 100) break
            await delay(200)
          } catch (e: any) { errors.push(`IDVs ${st}: ${e.message}`) }
        }
      }
    }

    // ─── Subawards (chunked by state) ───
    if (source === 'subawards') {
      const states = stateChunk || ALL_STATES.slice(0, 10)
      for (const st of states) {
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
            if (!res || !res.ok) { errors.push(`Subs ${st} p${page}: ${res?.status}`); continue }
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
              if (!error) loaded++
            }
            console.log(`[fill-source] Subs ${st} p${page}: ${data.results.length}`)
            if (data.results.length < 100) break
            await delay(200)
          } catch (e: any) { errors.push(`Subs ${st}: ${e.message}`) }
        }
      }
    }

    // ─── SAM Entities (chunked by state) ───
    if (source === 'sam-entities' && SAM_KEY) {
      const states = stateChunk || ALL_STATES.slice(0, 8)
      for (const st of states) {
        for (let page = 0; page < 3; page++) {
          try {
            await delay(500)
            const url = `https://api.sam.gov/entity-information/v3/entities?api_key=${SAM_KEY}&registrationStatus=A&samRegistered=Yes&physicalAddressProvinceOrStateCode=${st}&includeSections=entityRegistration,coreData&page=${page}&size=100`
            const res = await safeFetch(url)
            if (!res || !res.ok) { errors.push(`SAM ${st} p${page}: ${res?.status}`); break }
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
              if (!error) loaded++
            }
            console.log(`[fill-source] SAM ${st} p${page}: ${data.entityData.length}`)
            if (data.entityData.length < 100) break
          } catch (e: any) { errors.push(`SAM ${st}: ${e.message}`); break }
        }
      }
    }

    // ─── SAM Exclusions ───
    if (source === 'exclusions' && SAM_KEY) {
      // Use v3 endpoint
      for (let page = 0; page < 10; page++) {
        try {
          await delay(500)
          const url = `https://api.sam.gov/entity-information/v3/exclusions?api_key=${SAM_KEY}&isActive=Yes&page=${page}&size=100`
          const res = await safeFetch(url)
          if (!res || !res.ok) {
            // Try v2 fallback
            const url2 = `https://api.sam.gov/entity-information/v2/exclusions?api_key=${SAM_KEY}&isActive=Yes&page=${page}&size=100`
            const res2 = await safeFetch(url2)
            if (!res2 || !res2.ok) { errors.push(`Excl p${page}: v3=${res?.status} v2=${res2?.status}`); break }
            const data2 = await res2.json()
            const results2 = data2?.results || data2?.exclusionData || []
            if (!results2.length) break
            for (const ex of results2) {
              const { error } = await supabase.from('sam_exclusions').upsert({
                classification: ex.classificationType, exclusion_name: ex.name,
                exclusion_type: ex.exclusionType, exclusion_program: ex.exclusionProgram,
                excluding_agency: ex.excludingAgencyCode, uei: ex.ueiSAM, cage_code: ex.cageCode,
                active_date: ex.activateDate, termination_date: ex.terminationDate,
                record_status: ex.recordStatus, city: ex.city, state: ex.stateProvince,
                country: ex.country, description: ex.description,
              }, { onConflict: 'exclusion_name,active_date,excluding_agency', ignoreDuplicates: true })
              if (!error) loaded++
            }
            if (results2.length < 100) break
            continue
          }
          const data = await res.json()
          const excls = data?.exclusionData || data?.results || []
          if (!excls.length) break
          for (const ex of excls) {
            const { error } = await supabase.from('sam_exclusions').upsert({
              classification: ex.classificationType, exclusion_name: ex.name,
              exclusion_type: ex.exclusionType, exclusion_program: ex.exclusionProgram,
              excluding_agency: ex.excludingAgencyCode, uei: ex.ueiSAM, cage_code: ex.cageCode,
              active_date: ex.activateDate, termination_date: ex.terminationDate,
              record_status: ex.recordStatus, city: ex.city, state: ex.stateProvince,
              country: ex.country, description: ex.description,
            }, { onConflict: 'exclusion_name,active_date,excluding_agency', ignoreDuplicates: true })
            if (!error) loaded++
          }
          console.log(`[fill-source] Excl p${page}: ${excls.length}`)
          if (excls.length < 100) break
        } catch (e: any) { errors.push(`Excl: ${e.message}`); break }
      }
    }

    // ─── More Opportunities (expand coverage) ───
    if (source === 'opportunities' && SAM_KEY) {
      const today = new Date()
      const ago = new Date(Date.now() - 180 * 86400000) // 6 months
      const fmt = (d: Date) => `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`
      for (let offset = 0; offset < 2000; offset += 100) {
        try {
          await delay(500)
          const url = `https://api.sam.gov/opportunities/v2/search?api_key=${SAM_KEY}&limit=100&offset=${offset}&postedFrom=${fmt(ago)}&postedTo=${fmt(today)}`
          const res = await safeFetch(url)
          if (!res || !res.ok) { errors.push(`Opps offset ${offset}: ${res?.status}`); break }
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
            if (!error) loaded++
          }
          console.log(`[fill-source] Opps offset=${offset}: ${data.opportunitiesData.length}`)
          if (data.opportunitiesData.length < 100) break
        } catch (e: any) { errors.push(`Opps: ${e.message}`); break }
      }
    }

  } catch (e: any) {
    errors.push(`Fatal: ${e.message}`)
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`[fill-source] ${source}: loaded=${loaded} errors=${errors.length} duration=${duration}s`)

  return new Response(JSON.stringify({
    success: true, source, loaded, errors: errors.length > 0 ? errors : undefined,
    duration_seconds: parseFloat(duration)
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
