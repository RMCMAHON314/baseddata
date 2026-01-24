import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration
const SAM_API_KEY = Deno.env.get('SAM_API_KEY') || ''
const DATA_GOV_KEY = Deno.env.get('DATA_GOV_KEY') || ''

interface IngestResult {
  source: string;
  records: number;
  entities: number;
  contracts: number;
  grants: number;
  error: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // Get next batch of jobs (process up to 5 at once)
    const { data: jobs, error: jobsError } = await supabase
      .from('ingestion_queue')
      .select('*, source:ingestion_sources(*)')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false })
      .limit(5)

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError)
      throw jobsError
    }

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ message: 'No jobs in queue' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`🦑 MEGA INGEST: Processing ${jobs.length} jobs`)

    const results: (IngestResult & { duration_ms: number })[] = []

    for (const job of jobs) {
      // Mark as running
      await supabase
        .from('ingestion_queue')
        .update({ status: 'running', last_attempt_at: new Date().toISOString(), attempts: (job.attempts || 0) + 1 })
        .eq('id', job.id)

      const startTime = Date.now()
      let result: IngestResult = { source: job.source_slug, records: 0, entities: 0, contracts: 0, grants: 0, error: null }

      try {
        // Route to appropriate handler based on source category
        const source = job.source
        const slug = source?.slug || job.source_slug

        // FEDERAL SPENDING HANDLERS
        if (slug.startsWith('usaspending')) {
          result = await ingestUSASpending(supabase, source, job.params)
        }
        else if (slug.startsWith('sam-entities')) {
          result = await ingestSAMEntities(supabase, source)
        }
        else if (slug.startsWith('sam-opportunities')) {
          result = await ingestSAMOpportunities(supabase, source)
        }
        else if (slug === 'grants-gov') {
          result = await ingestGrantsGov(supabase, source)
        }
        else if (slug === 'sbir' || slug === 'sttr') {
          result = await ingestSBIR(supabase, source)
        }
        // HEALTHCARE HANDLERS
        else if (slug.startsWith('cms-')) {
          result = await ingestCMS(supabase, source)
        }
        else if (slug.startsWith('fda-')) {
          result = await ingestFDA(supabase, source)
        }
        else if (slug === 'clinicaltrials') {
          result = await ingestClinicalTrials(supabase, source)
        }
        else if (slug === 'npi-registry') {
          result = await ingestNPI(supabase, source)
        }
        // RESEARCH HANDLERS
        else if (slug === 'nih-reporter' || slug === 'nih-publications') {
          result = await ingestNIH(supabase, source)
        }
        else if (slug === 'nsf-awards') {
          result = await ingestNSF(supabase, source)
        }
        // FINANCIAL HANDLERS
        else if (slug.startsWith('sec-')) {
          result = await ingestSEC(supabase, source)
        }
        else if (slug.startsWith('fdic-')) {
          result = await ingestFDIC(supabase, source)
        }
        // ENVIRONMENTAL HANDLERS
        else if (slug.startsWith('epa-')) {
          result = await ingestEPA(supabase, source)
        }
        // FEMA
        else if (slug.startsWith('fema-')) {
          result = await ingestFEMA(supabase, source)
        }
        // SOCRATA PORTALS (Most state/local data)
        else if (source?.base_url?.includes('/resource') || 
                 source?.base_url?.includes('data.') ||
                 source?.base_url?.includes('opendata.')) {
          result = await ingestSocrata(supabase, source)
        }
        // GENERIC FALLBACK
        else {
          result = await ingestGeneric(supabase, source)
        }

      } catch (e: unknown) {
        result.error = e instanceof Error ? e.message : 'Unknown error'
        console.error(`❌ ${job.source_slug} error:`, result.error)
      }

      const duration = Date.now() - startTime

      // Update job status
      await supabase
        .from('ingestion_queue')
        .update({
          status: result.error ? 'failed' : 'completed',
          completed_at: result.error ? null : new Date().toISOString(),
          last_error: result.error,
          records_fetched: result.records
        })
        .eq('id', job.id)

      // Update source stats
      if (job.source) {
        await supabase
          .from('ingestion_sources')
          .update({
            last_fetch_at: new Date().toISOString(),
            calls_today: (job.source.calls_today || 0) + 1,
            total_records_fetched: (job.source.total_records_fetched || 0) + result.records,
            total_entities_created: (job.source.total_entities_created || 0) + result.entities,
            consecutive_failures: result.error ? (job.source.consecutive_failures || 0) + 1 : 0,
            health_status: result.error 
              ? ((job.source.consecutive_failures || 0) >= 2 ? 'failing' : 'degraded')
              : 'healthy',
            last_error: result.error,
            avg_response_time_ms: Math.round(((job.source.avg_response_time_ms || duration) + duration) / 2)
          })
          .eq('slug', job.source_slug)
      }

      results.push({ ...result, duration_ms: duration })
      console.log(`${result.error ? '❌' : '✅'} ${job.source_slug}: ${result.records} records in ${duration}ms`)
    }

    // Log batch result
    await supabase.from('system_logs').insert({
      level: 'INFO',
      component: 'mega-ingest',
      message: `Processed ${jobs.length} jobs`,
      details: { results }
    })

    return new Response(JSON.stringify({ processed: jobs.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    console.error('Mega ingest error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// ============================================
// USASPENDING HANDLER
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestUSASpending(supabase: any, source: any, params: any = {}): Promise<IngestResult> {
  const result: IngestResult = { source: source?.slug || 'usaspending', records: 0, entities: 0, contracts: 0, grants: 0, error: null }

  const awardTypes = params?.award_types || source?.fetch_config?.award_types || ['A', 'B', 'C', 'D']
  const states = ['MD', 'VA', 'DC', 'PA', 'DE', 'NJ', 'NY', 'NC', 'FL', 'TX', 'CA', 'IL', 'OH', 'GA', 'MI', 'WA']
  const state = states[Math.floor(Date.now() / 60000) % states.length] // Rotate through states

  try {
    const baseUrl = source?.base_url || 'https://api.usaspending.gov/api/v2'
    const response = await fetch(`${baseUrl}/search/spending_by_award/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters: {
          time_period: [{ start_date: '2023-01-01', end_date: '2025-12-31' }],
          award_type_codes: awardTypes,
          place_of_performance_locations: [{ country: 'USA', state }]
        },
        fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Description', 'Start Date', 'End Date',
                 'Awarding Agency', 'Awarding Sub Agency', 'Place of Performance State Code',
                 'Place of Performance City', 'NAICS Code', 'PSC Code', 'recipient_uei', 'Award Type'],
        page: 1,
        limit: 100,
        sort: 'Award Amount',
        order: 'desc'
      })
    })

    if (!response.ok) throw new Error(`API error: ${response.status}`)
    const data = await response.json()
    const awards = data.results || []
    result.records = awards.length

    for (const award of awards) {
      const entityResult = await upsertEntity(supabase, {
        name: award['Recipient Name'],
        type: 'organization',
        city: award['Place of Performance City'],
        state: award['Place of Performance State Code'],
        uei: award.recipient_uei
      })

      if (entityResult.id) {
        result.entities++

        const { error } = await supabase.from('contracts').upsert({
          award_id: award['Award ID'],
          recipient_entity_id: entityResult.id,
          recipient_name: award['Recipient Name'],
          recipient_uei: award.recipient_uei,
          awarding_agency: award['Awarding Agency'],
          awarding_sub_agency: award['Awarding Sub Agency'],
          award_amount: parseFloat(award['Award Amount']) || 0,
          description: award['Description'],
          start_date: award['Start Date'],
          end_date: award['End Date'],
          pop_state: award['Place of Performance State Code'],
          pop_city: award['Place of Performance City'],
          naics_code: award['NAICS Code'],
          psc_code: award['PSC Code'],
          award_type: award['Award Type'],
          source: 'usaspending'
        }, { onConflict: 'award_id' })

        if (!error) result.contracts++
      }
    }
  } catch (e: unknown) {
    result.error = e instanceof Error ? e.message : 'Unknown error'
  }

  return result
}

// ============================================
// SAM.GOV HANDLERS
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestSAMEntities(supabase: any, source: any): Promise<IngestResult> {
  const result: IngestResult = { source: source?.slug || 'sam-entities', records: 0, entities: 0, contracts: 0, grants: 0, error: null }

  if (!SAM_API_KEY) {
    result.error = 'SAM_API_KEY not configured'
    return result
  }

  const states = ['MD', 'VA', 'DC', 'PA', 'DE', 'NJ']
  const state = states[Math.floor(Date.now() / 60000) % states.length]

  try {
    const baseUrl = source?.base_url || 'https://api.sam.gov/entity-information/v3'
    const response = await fetch(
      `${baseUrl}/entities?api_key=${SAM_API_KEY}&registrationStatus=A&physicalAddressStateCode=${state}&pageSize=100`
    )

    if (!response.ok) throw new Error(`API error: ${response.status}`)
    const data = await response.json()
    const entities = data.entityData || []
    result.records = entities.length

    for (const entityData of entities) {
      const reg = entityData.entityRegistration || {}
      const core = entityData.coreData || {}

      const entityResult = await upsertEntity(supabase, {
        name: reg.legalBusinessName || reg.dbaName,
        type: 'organization',
        city: core.physicalAddress?.city,
        state: core.physicalAddress?.stateOrProvinceCode,
        uei: reg.ueiSAM,
        cage_code: reg.cageCode,
        naics_codes: core.naicsCodeList?.map((n: { naicsCode: string }) => n.naicsCode) || [],
        business_types: entityData.assertions?.goodsAndServices?.businessTypeList || []
      })

      if (entityResult.id) result.entities++
    }
  } catch (e: unknown) {
    result.error = e instanceof Error ? e.message : 'Unknown error'
  }

  return result
}

// deno-lint-ignore no-explicit-any
async function ingestSAMOpportunities(supabase: any, source: any): Promise<IngestResult> {
  const result: IngestResult = { source: source?.slug || 'sam-opportunities', records: 0, entities: 0, contracts: 0, grants: 0, error: null }

  if (!SAM_API_KEY) {
    result.error = 'SAM_API_KEY not configured'
    return result
  }

  try {
    const response = await fetch(
      `https://api.sam.gov/opportunities/v2/search?api_key=${SAM_API_KEY}&postedFrom=01/01/2024&limit=100&offset=0`
    )

    if (!response.ok) throw new Error(`API error: ${response.status}`)
    const data = await response.json()
    const opps = data.opportunitiesData || []
    result.records = opps.length

    for (const opp of opps) {
      await supabase.from('opportunities').upsert({
        notice_id: opp.noticeId,
        solicitation_number: opp.solicitationNumber,
        title: opp.title,
        description: opp.description?.slice(0, 10000),
        notice_type: opp.noticeType,
        department: opp.department,
        sub_tier: opp.subTier,
        office: opp.office,
        posted_date: opp.postedDate,
        response_deadline: opp.responseDeadLine,
        pop_state: opp.placeOfPerformance?.state?.code,
        pop_city: opp.placeOfPerformance?.city?.name,
        naics_code: opp.naicsCode,
        set_aside: opp.typeOfSetAside,
        ui_link: opp.uiLink,
        is_active: opp.active === 'Yes',
        raw_data: opp
      }, { onConflict: 'notice_id' })
    }
  } catch (e: unknown) {
    result.error = e instanceof Error ? e.message : 'Unknown error'
  }

  return result
}

// ============================================
// GRANTS.GOV HANDLER
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestGrantsGov(supabase: any, source: any): Promise<IngestResult> {
  const result: IngestResult = { source: source?.slug || 'grants-gov', records: 0, entities: 0, contracts: 0, grants: 0, error: null }

  try {
    const baseUrl = source?.base_url || 'https://www.grants.gov/grantsws/rest'
    const response = await fetch(`${baseUrl}/opportunities/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: '', oppStatuses: 'forecasted|posted', rows: 100 })
    })

    if (!response.ok) throw new Error(`API error: ${response.status}`)
    const data = await response.json()
    const opps = data.oppHits || []
    result.records = opps.length

    for (const opp of opps) {
      await supabase.from('opportunities').upsert({
        notice_id: opp.id || opp.oppNumber,
        title: opp.title,
        description: opp.synopsis,
        department: opp.agencyName,
        posted_date: opp.openDate,
        response_deadline: opp.closeDate,
        award_ceiling: opp.awardCeiling,
        award_floor: opp.awardFloor,
        is_active: true,
        raw_data: opp
      }, { onConflict: 'notice_id' })
    }
  } catch (e: unknown) {
    result.error = e instanceof Error ? e.message : 'Unknown error'
  }

  return result
}

// ============================================
// CMS HEALTHCARE HANDLER
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestCMS(supabase: any, source: any): Promise<IngestResult> {
  const result: IngestResult = { source: source?.slug || 'cms', records: 0, entities: 0, contracts: 0, grants: 0, error: null }

  const dataset = source?.fetch_config?.dataset || 'mj5m-pzi6'

  try {
    const baseUrl = source?.base_url || 'https://data.cms.gov/provider-data/api/1'
    const response = await fetch(`${baseUrl}/datastore/query/${dataset}/0?limit=100`)
    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    const providers = data.results || []
    result.records = providers.length

    for (const provider of providers) {
      const name = provider.provider_name || provider.facility_name || provider.organization_name
      if (!name) continue

      const entityResult = await upsertEntity(supabase, {
        name,
        type: 'healthcare_provider',
        city: provider.city || provider.provider_city,
        state: provider.state || provider.provider_state,
        metadata: {
          npi: provider.npi,
          provider_type: provider.provider_type,
          cms_certification: provider.cms_certification_number
        }
      })

      if (entityResult.id) result.entities++
    }
  } catch (e: unknown) {
    result.error = e instanceof Error ? e.message : 'Unknown error'
  }

  return result
}

// ============================================
// FDA HANDLER
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestFDA(supabase: any, source: any): Promise<IngestResult> {
  const result: IngestResult = { source: source?.slug || 'fda', records: 0, entities: 0, contracts: 0, grants: 0, error: null }

  const endpoint = source?.fetch_config?.endpoint || '/drugsfda.json'

  try {
    const baseUrl = source?.base_url || 'https://api.fda.gov/drug'
    const response = await fetch(`${baseUrl}${endpoint}?limit=100`)
    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    const items = data.results || []
    result.records = items.length

    for (const item of items) {
      const name = item.sponsor_name || item.manufacturer_name || item.applicant
      if (!name) continue

      const entityResult = await upsertEntity(supabase, {
        name,
        type: 'pharmaceutical_company'
      })

      if (entityResult.id) result.entities++
    }
  } catch (e: unknown) {
    result.error = e instanceof Error ? e.message : 'Unknown error'
  }

  return result
}

// ============================================
// NIH REPORTER HANDLER
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestNIH(supabase: any, source: any): Promise<IngestResult> {
  const result: IngestResult = { source: source?.slug || 'nih', records: 0, entities: 0, contracts: 0, grants: 0, error: null }

  try {
    const baseUrl = source?.base_url || 'https://api.reporter.nih.gov/v2'
    const response = await fetch(`${baseUrl}/projects/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        criteria: { fiscal_years: [2024, 2025], include_active_projects: true },
        limit: 100
      })
    })

    if (!response.ok) throw new Error(`API error: ${response.status}`)
    const data = await response.json()
    const projects = data.results || []
    result.records = projects.length

    for (const project of projects) {
      const org = project.organization
      if (!org?.org_name) continue

      const entityResult = await upsertEntity(supabase, {
        name: org.org_name,
        type: org.org_name.toLowerCase().includes('university') ? 'university' : 'research_organization',
        city: org.org_city,
        state: org.org_state,
        uei: org.org_uei
      })

      if (entityResult.id) {
        result.entities++

        const { error } = await supabase.from('grants').upsert({
          grant_id: project.project_num,
          recipient_entity_id: entityResult.id,
          recipient_name: org.org_name,
          awarding_agency: 'NIH',
          award_amount: project.award_amount,
          project_title: project.project_title,
          start_date: project.project_start_date,
          end_date: project.project_end_date,
          source: 'nih_reporter'
        }, { onConflict: 'grant_id' })

        if (!error) result.grants++
      }
    }
  } catch (e: unknown) {
    result.error = e instanceof Error ? e.message : 'Unknown error'
  }

  return result
}

// ============================================
// NSF HANDLER
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestNSF(supabase: any, source: any): Promise<IngestResult> {
  const result: IngestResult = { source: source?.slug || 'nsf', records: 0, entities: 0, contracts: 0, grants: 0, error: null }

  try {
    const baseUrl = source?.base_url || 'https://api.nsf.gov/services/v1'
    const response = await fetch(`${baseUrl}/awards.json?awardeeName=&offset=1&rpp=100`)
    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    const awards = data.response?.award || []
    result.records = awards.length

    for (const award of awards) {
      if (!award.awardeeName) continue

      const entityResult = await upsertEntity(supabase, {
        name: award.awardeeName,
        type: 'research_organization',
        city: award.awardeeCity,
        state: award.awardeeStateCode
      })

      if (entityResult.id) {
        result.entities++

        const { error } = await supabase.from('grants').upsert({
          grant_id: award.id,
          recipient_entity_id: entityResult.id,
          recipient_name: award.awardeeName,
          awarding_agency: 'NSF',
          award_amount: parseFloat(award.fundsObligatedAmt) || 0,
          project_title: award.title,
          start_date: award.startDate,
          end_date: award.expDate,
          source: 'nsf'
        }, { onConflict: 'grant_id' })

        if (!error) result.grants++
      }
    }
  } catch (e: unknown) {
    result.error = e instanceof Error ? e.message : 'Unknown error'
  }

  return result
}

// ============================================
// FEMA HANDLER
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestFEMA(supabase: any, source: any): Promise<IngestResult> {
  const result: IngestResult = { source: source?.slug || 'fema', records: 0, entities: 0, contracts: 0, grants: 0, error: null }

  try {
    const baseUrl = source?.base_url || 'https://www.fema.gov/api/open/v2'
    const response = await fetch(`${baseUrl}/DisasterDeclarationsSummaries?$top=100&$orderby=declarationDate desc`)
    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    const disasters = data.DisasterDeclarationsSummaries || []
    result.records = disasters.length

    for (const disaster of disasters) {
      await supabase.from('core_facts').insert({
        fact_type: 'fema_disaster',
        fact_value: {
          disaster_number: disaster.disasterNumber,
          declaration_title: disaster.declarationTitle,
          state: disaster.state,
          declaration_type: disaster.declarationType,
          incident_type: disaster.incidentType,
          declaration_date: disaster.declarationDate
        },
        source_name: 'fema',
        confidence: 1.0
      })
    }
  } catch (e: unknown) {
    result.error = e instanceof Error ? e.message : 'Unknown error'
  }

  return result
}

// ============================================
// SOCRATA OPEN DATA HANDLER (Most state/local portals)
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestSocrata(supabase: any, source: any): Promise<IngestResult> {
  const result: IngestResult = { source: source?.slug || 'socrata', records: 0, entities: 0, contracts: 0, grants: 0, error: null }

  try {
    // Build URL - add .json if needed
    let url = source?.base_url || ''
    if (!url) {
      result.error = 'No base URL configured'
      return result
    }
    if (!url.endsWith('.json')) {
      url = url.includes('resource/') ? url + '.json' : url
    }
    url += url.includes('?') ? '&$limit=100' : '?$limit=100'

    const response = await fetch(url)
    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    const records = Array.isArray(data) ? data : []
    result.records = records.length

    for (const record of records) {
      // Try to extract entity information from common field names
      const name = record.vendor_name || record.company_name || record.business_name ||
                   record.contractor_name || record.recipient_name || record.organization_name ||
                   record.agency_name || record.name || record.legal_name

      if (name && typeof name === 'string' && name.length > 2) {
        const entityResult = await upsertEntity(supabase, {
          name,
          type: 'organization',
          city: record.city || record.vendor_city || record.business_city,
          state: record.state || record.vendor_state || record.business_state,
          metadata: { source: source?.slug }
        })

        if (entityResult.id) result.entities++
      }

      // Also store raw record
      await supabase.from('records').insert({
        source_id: source?.slug,
        name: name || 'Unknown',
        category: source?.category,
        properties: record
      })
    }
  } catch (e: unknown) {
    result.error = e instanceof Error ? e.message : 'Unknown error'
  }

  return result
}

// ============================================
// SEC HANDLER
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestSEC(supabase: any, source: any): Promise<IngestResult> {
  const result: IngestResult = { source: source?.slug || 'sec', records: 0, entities: 0, contracts: 0, grants: 0, error: null }

  try {
    const baseUrl = source?.base_url || 'https://data.sec.gov'
    const response = await fetch(`${baseUrl}/submissions/`, {
      headers: { 'User-Agent': 'BasedData/1.0 (contact@baseddata.app)' }
    })
    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    result.records = 1 // SEC returns company data differently

    if (data.name) {
      const entityResult = await upsertEntity(supabase, {
        name: data.name,
        type: 'public_company',
        ein: data.ein,
        metadata: { cik: data.cik, sic: data.sic }
      })

      if (entityResult.id) result.entities++
    }
  } catch (e: unknown) {
    result.error = e instanceof Error ? e.message : 'Unknown error'
  }

  return result
}

// ============================================
// EPA HANDLER
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestEPA(supabase: any, source: any): Promise<IngestResult> {
  const result: IngestResult = { source: source?.slug || 'epa', records: 0, entities: 0, contracts: 0, grants: 0, error: null }

  try {
    const baseUrl = source?.base_url || 'https://data.epa.gov/efservice'
    const response = await fetch(`${baseUrl}/FRS_FACILITY_SITE/ROWS/0:100`)
    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    const facilities = Array.isArray(data) ? data : []
    result.records = facilities.length

    for (const facility of facilities) {
      const name = facility.PRIMARY_NAME || facility.FACILITY_NAME
      if (!name) continue

      const entityResult = await upsertEntity(supabase, {
        name,
        type: 'facility',
        city: facility.CITY_NAME,
        state: facility.STATE_CODE,
        metadata: { registry_id: facility.REGISTRY_ID, epa_region: facility.EPA_REGION_CODE }
      })

      if (entityResult.id) result.entities++
    }
  } catch (e: unknown) {
    result.error = e instanceof Error ? e.message : 'Unknown error'
  }

  return result
}

// ============================================
// FDIC HANDLER
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestFDIC(supabase: any, source: any): Promise<IngestResult> {
  const result: IngestResult = { source: source?.slug || 'fdic', records: 0, entities: 0, contracts: 0, grants: 0, error: null }

  try {
    const baseUrl = source?.base_url || 'https://banks.data.fdic.gov/api'
    const response = await fetch(`${baseUrl}/institutions?limit=100&offset=0`)
    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    const banks = data.data || []
    result.records = banks.length

    for (const bank of banks) {
      if (!bank.NAME) continue

      const entityResult = await upsertEntity(supabase, {
        name: bank.NAME,
        type: 'bank',
        city: bank.CITY,
        state: bank.STNAME,
        metadata: { cert: bank.CERT, charter_class: bank.CHARTER_CLASS }
      })

      if (entityResult.id) result.entities++
    }
  } catch (e: unknown) {
    result.error = e instanceof Error ? e.message : 'Unknown error'
  }

  return result
}

// ============================================
// CLINICAL TRIALS HANDLER
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestClinicalTrials(supabase: any, source: any): Promise<IngestResult> {
  const result: IngestResult = { source: source?.slug || 'clinicaltrials', records: 0, entities: 0, contracts: 0, grants: 0, error: null }

  try {
    const baseUrl = source?.base_url || 'https://clinicaltrials.gov/api/v2'
    const response = await fetch(`${baseUrl}/studies?pageSize=100`)
    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    const studies = data.studies || []
    result.records = studies.length

    for (const study of studies) {
      const sponsor = study.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name
      if (sponsor) {
        const entityResult = await upsertEntity(supabase, {
          name: sponsor,
          type: sponsor.toLowerCase().includes('university') ? 'university' : 'pharmaceutical_company'
        })

        if (entityResult.id) result.entities++
      }
    }
  } catch (e: unknown) {
    result.error = e instanceof Error ? e.message : 'Unknown error'
  }

  return result
}

// ============================================
// NPI REGISTRY HANDLER
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestNPI(supabase: any, source: any): Promise<IngestResult> {
  const result: IngestResult = { source: source?.slug || 'npi', records: 0, entities: 0, contracts: 0, grants: 0, error: null }

  const states = ['MD', 'VA', 'DC', 'PA']
  const state = states[Math.floor(Date.now() / 60000) % states.length]

  try {
    const baseUrl = source?.base_url || 'https://npiregistry.cms.hhs.gov/api'
    const response = await fetch(`${baseUrl}/?version=2.1&state=${state}&limit=100`)
    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    const results_list = data.results || []
    result.records = results_list.length

    for (const npi of results_list) {
      const name = npi.basic?.organization_name || `${npi.basic?.first_name || ''} ${npi.basic?.last_name || ''}`.trim()
      if (!name) continue

      const entityResult = await upsertEntity(supabase, {
        name,
        type: npi.enumeration_type === 'NPI-2' ? 'healthcare_provider' : 'individual',
        city: npi.addresses?.[0]?.city,
        state: npi.addresses?.[0]?.state,
        metadata: { npi: npi.number }
      })

      if (entityResult.id) result.entities++
    }
  } catch (e: unknown) {
    result.error = e instanceof Error ? e.message : 'Unknown error'
  }

  return result
}

// ============================================
// SBIR/STTR HANDLER
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestSBIR(supabase: any, source: any): Promise<IngestResult> {
  const result: IngestResult = { source: source?.slug || 'sbir', records: 0, entities: 0, contracts: 0, grants: 0, error: null }

  try {
    const baseUrl = source?.base_url || 'https://www.sbir.gov/api/awards.json'
    const response = await fetch(`${baseUrl}?rows=100`)
    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    const awards = Array.isArray(data) ? data : []
    result.records = awards.length

    for (const award of awards) {
      if (!award.company) continue

      const entityResult = await upsertEntity(supabase, {
        name: award.company,
        type: 'small_business',
        city: award.city,
        state: award.state
      })

      if (entityResult.id) {
        result.entities++

        const { error } = await supabase.from('grants').upsert({
          grant_id: award.award_id || `sbir-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          recipient_entity_id: entityResult.id,
          recipient_name: award.company,
          awarding_agency: award.agency,
          award_amount: parseFloat(award.award_amount) || 0,
          project_title: award.award_title,
          source: 'sbir'
        }, { onConflict: 'grant_id' })

        if (!error) result.grants++
      }
    }
  } catch (e: unknown) {
    result.error = e instanceof Error ? e.message : 'Unknown error'
  }

  return result
}

// ============================================
// GENERIC FALLBACK HANDLER
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestGeneric(supabase: any, source: any): Promise<IngestResult> {
  const result: IngestResult = { source: source?.slug || 'generic', records: 0, entities: 0, contracts: 0, grants: 0, error: null }

  if (!source?.base_url) {
    result.error = 'No base URL configured'
    return result
  }

  try {
    const response = await fetch(source.base_url)
    if (!response.ok) throw new Error(`API error: ${response.status}`)

    const data = await response.json()
    const items = Array.isArray(data) ? data : data.results || data.data || []
    result.records = items.length

    // Store raw data
    for (const item of items.slice(0, 100)) {
      await supabase.from('records').insert({
        source_id: source.slug,
        name: item.name || item.title || 'Unknown',
        category: source.category,
        properties: item
      })
    }
  } catch (e: unknown) {
    result.error = e instanceof Error ? e.message : 'Unknown error'
  }

  return result
}

// ============================================
// HELPER: Upsert Entity
// ============================================
interface EntityData {
  name: string;
  type?: string;
  city?: string;
  state?: string;
  country?: string;
  uei?: string;
  cage_code?: string;
  ein?: string;
  naics_codes?: string[];
  business_types?: string[];
  metadata?: Record<string, unknown>;
}

// deno-lint-ignore no-explicit-any
async function upsertEntity(supabase: any, data: EntityData): Promise<{ id: string | null }> {
  if (!data.name || data.name.length < 2) return { id: null }

  try {
    const { data: entity, error } = await supabase
      .from('core_entities')
      .upsert({
        canonical_name: data.name,
        entity_type: data.type || 'organization',
        city: data.city,
        state: data.state,
        country: data.country || 'USA',
        uei: data.uei,
        cage_code: data.cage_code,
        ein: data.ein,
        naics_codes: data.naics_codes,
        business_types: data.business_types,
        merged_data: data.metadata ? { metadata: data.metadata } : {},
        source_count: 1,
        data_quality_score: 80
      }, { onConflict: 'canonical_name' })
      .select('id')
      .single()

    if (error) {
      console.error('Entity upsert error:', error.message)
      return { id: null }
    }

    return { id: entity?.id }
  } catch (e) {
    return { id: null }
  }
}
