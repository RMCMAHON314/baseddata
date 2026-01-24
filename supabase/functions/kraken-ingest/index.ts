import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' 
}

const API_KEY = Deno.env.get('SAM_API_KEY') || ''

interface IngestResult {
  source: string;
  records: number;
  entities: number;
  contracts: number;
  error: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // Get next batch of jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('ingestion_queue')
      .select('*, source:ingestion_sources(*)')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false })
      .limit(5)

    if (jobsError) throw jobsError
    if (!jobs?.length) {
      return new Response(JSON.stringify({ message: 'No jobs in queue' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    console.log(`🦑 KRAKEN FEEDING: ${jobs.length} sources`)
    const results: (IngestResult & { ms: number })[] = []

    for (const job of jobs) {
      await supabase
        .from('ingestion_queue')
        .update({ 
          status: 'running', 
          last_attempt_at: new Date().toISOString(), 
          attempts: (job.attempts || 0) + 1 
        })
        .eq('id', job.id)

      const start = Date.now()
      let result: IngestResult = { source: job.source_slug, records: 0, entities: 0, contracts: 0, error: null }

      try {
        const slug = job.source_slug
        const cfg = job.source?.fetch_config || {}
        
        if (slug.startsWith('usaspending')) {
          result = await ingestUSASpending(supabase, cfg.state || 'MD')
        } else if (slug.startsWith('sam-entities')) {
          result = await ingestSAMEntities(supabase, cfg.state || 'MD')
        } else if (slug === 'sam-opportunities') {
          result = await ingestSAMOpportunities(supabase)
        } else if (slug === 'grants-gov') {
          result = await ingestGrantsGov(supabase)
        } else if (slug === 'nih-reporter') {
          result = await ingestNIH(supabase)
        } else if (slug === 'nsf-awards') {
          result = await ingestNSF(supabase)
        } else if (slug === 'fema-disasters') {
          result = await ingestFEMA(supabase)
        } else if (slug.startsWith('cms-') || slug.startsWith('fda-')) {
          result = await ingestHealthcare(supabase, slug)
        } else {
          result = await ingestSocrata(supabase, job.source?.base_url || '')
        }
      } catch (e: unknown) { 
        result.error = e instanceof Error ? e.message : 'Unknown error'
      }

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
            health_status: result.error ? 'degraded' : 'healthy' 
          })
          .eq('slug', job.source_slug)
      }

      results.push({ ...result, ms: Date.now() - start })
      console.log(`${result.error ? '❌' : '✅'} ${job.source_slug}: ${result.records} records`)
    }

    // Log to system_logs
    await supabase.from('system_logs').insert({
      level: 'INFO',
      component: 'kraken-ingest',
      message: `Processed ${jobs.length} jobs`,
      details: { results }
    })

    return new Response(JSON.stringify({ processed: jobs.length, results }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  } catch (e: unknown) { 
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('Kraken error:', message)
    return new Response(JSON.stringify({ error: message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }) 
  }
})

// ============================================
// USASPENDING
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestUSASpending(sb: any, state: string): Promise<IngestResult> {
  const r: IngestResult = { source: 'usaspending', records: 0, entities: 0, contracts: 0, error: null }
  try {
    const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        filters: { 
          time_period: [{ start_date: '2023-01-01', end_date: '2025-12-31' }], 
          award_type_codes: ['A','B','C','D'], 
          place_of_performance_locations: [{ country: 'USA', state }] 
        }, 
        fields: ['Award ID','Recipient Name','Award Amount','Description','Start Date','End Date','Awarding Agency','Place of Performance State Code','Place of Performance City','NAICS Code','recipient_uei'], 
        page: 1, 
        limit: 100, 
        sort: 'Award Amount', 
        order: 'desc' 
      }) 
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    const d = await res.json()
    r.records = d.results?.length || 0
    
    for (const a of d.results || []) {
      const { data: e, error } = await sb
        .from('core_entities')
        .upsert({ 
          canonical_name: a['Recipient Name'], 
          entity_type: 'organization', 
          city: a['Place of Performance City'], 
          state: a['Place of Performance State Code'], 
          country: 'USA', 
          uei: a.recipient_uei, 
          source_count: 1 
        }, { onConflict: 'canonical_name' })
        .select('id')
        .single()

      if (e?.id && !error) { 
        r.entities++
        await sb.from('contracts').upsert({ 
          award_id: a['Award ID'], 
          recipient_entity_id: e.id, 
          recipient_name: a['Recipient Name'], 
          recipient_uei: a.recipient_uei, 
          awarding_agency: a['Awarding Agency'], 
          award_amount: parseFloat(a['Award Amount']) || 0, 
          description: a['Description'], 
          start_date: a['Start Date'], 
          end_date: a['End Date'], 
          pop_state: a['Place of Performance State Code'], 
          pop_city: a['Place of Performance City'], 
          naics_code: a['NAICS Code'], 
          source: 'usaspending' 
        }, { onConflict: 'award_id' })
        r.contracts++
        await sb.rpc('sync_entity_contract_stats', { p_entity_id: e.id })
      }
    }
  } catch (e: unknown) { 
    r.error = e instanceof Error ? e.message : 'Unknown error'
  }
  return r
}

// ============================================
// SAM ENTITIES
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestSAMEntities(sb: any, state: string): Promise<IngestResult> {
  const r: IngestResult = { source: 'sam', records: 0, entities: 0, contracts: 0, error: null }
  if (!API_KEY) { r.error = 'SAM_API_KEY not configured'; return r }
  
  try {
    const res = await fetch(`https://api.sam.gov/entity-information/v3/entities?api_key=${API_KEY}&registrationStatus=A&physicalAddressStateCode=${state}&pageSize=100`)
    if (!res.ok) throw new Error(`API ${res.status}`)
    const d = await res.json()
    r.records = d.entityData?.length || 0
    
    for (const e of d.entityData || []) {
      const reg = e.entityRegistration || {}
      const core = e.coreData || {}
      await sb.from('core_entities').upsert({ 
        canonical_name: reg.legalBusinessName || reg.dbaName, 
        entity_type: 'organization', 
        city: core.physicalAddress?.city, 
        state: core.physicalAddress?.stateOrProvinceCode, 
        country: 'USA', 
        uei: reg.ueiSAM, 
        cage_code: reg.cageCode, 
        naics_codes: core.naicsCodeList?.map((n: { naicsCode: string }) => n.naicsCode) || [], 
        business_types: e.assertions?.goodsAndServices?.businessTypeList || [], 
        source_count: 1, 
        data_quality_score: 90 
      }, { onConflict: 'canonical_name' })
      r.entities++
    }
  } catch (e: unknown) { 
    r.error = e instanceof Error ? e.message : 'Unknown error'
  }
  return r
}

// ============================================
// SAM OPPORTUNITIES
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestSAMOpportunities(sb: any): Promise<IngestResult> {
  const r: IngestResult = { source: 'sam-opps', records: 0, entities: 0, contracts: 0, error: null }
  if (!API_KEY) { r.error = 'SAM_API_KEY not configured'; return r }
  
  try {
    const res = await fetch(`https://api.sam.gov/opportunities/v2/search?api_key=${API_KEY}&postedFrom=01/01/2024&limit=100`)
    if (!res.ok) throw new Error(`API ${res.status}`)
    const d = await res.json()
    r.records = d.opportunitiesData?.length || 0
    
    for (const o of d.opportunitiesData || []) { 
      await sb.from('opportunities').upsert({ 
        notice_id: o.noticeId, 
        solicitation_number: o.solicitationNumber, 
        title: o.title, 
        description: o.description?.slice(0, 10000), 
        notice_type: o.noticeType, 
        department: o.department, 
        posted_date: o.postedDate, 
        response_deadline: o.responseDeadLine, 
        pop_state: o.placeOfPerformance?.state?.code, 
        naics_code: o.naicsCode, 
        set_aside: o.typeOfSetAside, 
        ui_link: o.uiLink, 
        is_active: o.active === 'Yes' 
      }, { onConflict: 'notice_id' }) 
    }
  } catch (e: unknown) { 
    r.error = e instanceof Error ? e.message : 'Unknown error'
  }
  return r
}

// ============================================
// GRANTS.GOV
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestGrantsGov(sb: any): Promise<IngestResult> {
  const r: IngestResult = { source: 'grants-gov', records: 0, entities: 0, contracts: 0, error: null }
  try {
    const res = await fetch('https://www.grants.gov/grantsws/rest/opportunities/search', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ keyword: '', oppStatuses: 'forecasted|posted', rows: 100 }) 
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    const d = await res.json()
    r.records = d.oppHits?.length || 0
    
    for (const o of d.oppHits || []) { 
      await sb.from('opportunities').upsert({ 
        notice_id: o.id || o.oppNumber, 
        title: o.title, 
        description: o.synopsis, 
        department: o.agencyName, 
        posted_date: o.openDate, 
        response_deadline: o.closeDate, 
        award_ceiling: o.awardCeiling, 
        award_floor: o.awardFloor, 
        is_active: true 
      }, { onConflict: 'notice_id' }) 
    }
  } catch (e: unknown) { 
    r.error = e instanceof Error ? e.message : 'Unknown error'
  }
  return r
}

// ============================================
// NIH REPORTER
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestNIH(sb: any): Promise<IngestResult> {
  const r: IngestResult = { source: 'nih', records: 0, entities: 0, contracts: 0, error: null }
  try {
    const res = await fetch('https://api.reporter.nih.gov/v2/projects/search', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ criteria: { fiscal_years: [2024, 2025] }, limit: 100 }) 
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    const d = await res.json()
    r.records = d.results?.length || 0
    
    for (const p of d.results || []) {
      const o = p.organization
      if (!o?.org_name) continue
      
      const { data: e, error } = await sb
        .from('core_entities')
        .upsert({ 
          canonical_name: o.org_name, 
          entity_type: o.org_name.toLowerCase().includes('university') ? 'university' : 'research', 
          city: o.org_city, 
          state: o.org_state, 
          uei: o.org_uei, 
          source_count: 1 
        }, { onConflict: 'canonical_name' })
        .select('id')
        .single()

      if (e?.id && !error) { 
        r.entities++
        await sb.from('grants').upsert({ 
          grant_id: p.project_num, 
          recipient_entity_id: e.id, 
          recipient_name: o.org_name, 
          awarding_agency: 'NIH', 
          award_amount: p.award_amount, 
          project_title: p.project_title, 
          start_date: p.project_start_date, 
          end_date: p.project_end_date, 
          source: 'nih' 
        }, { onConflict: 'grant_id' }) 
      }
    }
  } catch (e: unknown) { 
    r.error = e instanceof Error ? e.message : 'Unknown error'
  }
  return r
}

// ============================================
// NSF AWARDS
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestNSF(sb: any): Promise<IngestResult> {
  const r: IngestResult = { source: 'nsf', records: 0, entities: 0, contracts: 0, error: null }
  try {
    const res = await fetch('https://api.nsf.gov/services/v1/awards.json?offset=1&rpp=100')
    if (!res.ok) throw new Error(`API ${res.status}`)
    const d = await res.json()
    const awards = d.response?.award || []
    r.records = awards.length
    
    for (const a of awards) {
      if (!a.awardeeName) continue
      
      const { data: e, error } = await sb
        .from('core_entities')
        .upsert({ 
          canonical_name: a.awardeeName, 
          entity_type: 'research', 
          city: a.awardeeCity, 
          state: a.awardeeStateCode, 
          source_count: 1 
        }, { onConflict: 'canonical_name' })
        .select('id')
        .single()

      if (e?.id && !error) { 
        r.entities++
        await sb.from('grants').upsert({ 
          grant_id: a.id, 
          recipient_entity_id: e.id, 
          recipient_name: a.awardeeName, 
          awarding_agency: 'NSF', 
          award_amount: parseFloat(a.fundsObligatedAmt) || 0, 
          project_title: a.title, 
          start_date: a.startDate, 
          end_date: a.expDate, 
          source: 'nsf' 
        }, { onConflict: 'grant_id' }) 
      }
    }
  } catch (e: unknown) { 
    r.error = e instanceof Error ? e.message : 'Unknown error'
  }
  return r
}

// ============================================
// FEMA DISASTERS
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestFEMA(sb: any): Promise<IngestResult> {
  const r: IngestResult = { source: 'fema', records: 0, entities: 0, contracts: 0, error: null }
  try {
    const res = await fetch('https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=100&$orderby=declarationDate desc')
    if (!res.ok) throw new Error(`API ${res.status}`)
    const d = await res.json()
    r.records = d.DisasterDeclarationsSummaries?.length || 0
    
    for (const x of d.DisasterDeclarationsSummaries || []) { 
      await sb.from('core_facts').insert({ 
        fact_type: 'fema_disaster', 
        fact_value: { 
          number: x.disasterNumber, 
          title: x.declarationTitle, 
          state: x.state, 
          type: x.incidentType, 
          date: x.declarationDate 
        }, 
        source_name: 'fema', 
        confidence: 1.0 
      }) 
    }
  } catch (e: unknown) { 
    r.error = e instanceof Error ? e.message : 'Unknown error'
  }
  return r
}

// ============================================
// HEALTHCARE (CMS/FDA)
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestHealthcare(sb: any, slug: string): Promise<IngestResult> {
  const r: IngestResult = { source: slug, records: 0, entities: 0, contracts: 0, error: null }
  try {
    const url = slug.startsWith('fda') 
      ? 'https://api.fda.gov/drug/drugsfda.json?limit=100' 
      : 'https://data.cms.gov/provider-data/api/1/datastore/query/mj5m-pzi6/0?limit=100'
    
    const res = await fetch(url)
    if (!res.ok) throw new Error(`API ${res.status}`)
    const d = await res.json()
    const items = d.results || []
    r.records = items.length
    
    for (const i of items) {
      const name = i.provider_name || i.facility_name || i.sponsor_name || i.organization_name
      if (!name) continue
      
      await sb.from('core_entities').upsert({ 
        canonical_name: name, 
        entity_type: slug.includes('fda') ? 'pharma' : 'healthcare', 
        city: i.city || i.provider_city, 
        state: i.state || i.provider_state, 
        source_count: 1 
      }, { onConflict: 'canonical_name' })
      r.entities++
    }
  } catch (e: unknown) { 
    r.error = e instanceof Error ? e.message : 'Unknown error'
  }
  return r
}

// ============================================
// SOCRATA (Generic Open Data)
// ============================================
// deno-lint-ignore no-explicit-any
async function ingestSocrata(sb: any, baseUrl: string): Promise<IngestResult> {
  const r: IngestResult = { source: 'socrata', records: 0, entities: 0, contracts: 0, error: null }
  if (!baseUrl) { r.error = 'No URL'; return r }
  
  try {
    const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + '$limit=100'
    const res = await fetch(url)
    if (!res.ok) throw new Error(`API ${res.status}`)
    const d = await res.json()
    r.records = Array.isArray(d) ? d.length : 0
    
    for (const x of (Array.isArray(d) ? d : [])) {
      const name = x.vendor_name || x.company_name || x.contractor_name || x.business_name || x.recipient_name || x.name
      if (name && name.length > 2) { 
        await sb.from('core_entities').upsert({ 
          canonical_name: name, 
          entity_type: 'organization', 
          city: x.city || x.vendor_city, 
          state: x.state || x.vendor_state, 
          source_count: 1 
        }, { onConflict: 'canonical_name' })
        r.entities++ 
      }
    }
  } catch (e: unknown) { 
    r.error = e instanceof Error ? e.message : 'Unknown error'
  }
  return r
}
