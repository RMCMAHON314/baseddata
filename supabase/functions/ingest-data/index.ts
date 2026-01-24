import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface IngestResult {
  source: string;
  records_fetched: number;
  records_inserted: number;
  entities_created: number;
  contracts_created: number;
  errors: string[];
  duration_ms?: number;
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
    const { source, state, fiscal_year = 2024, limit = 500 } = await req.json()

    console.log(`🌊 INGESTING: ${source} | State: ${state || 'ALL'} | FY: ${fiscal_year}`)

    const startTime = Date.now()
    let results: IngestResult = { 
      source, 
      records_fetched: 0, 
      records_inserted: 0, 
      entities_created: 0, 
      contracts_created: 0, 
      errors: [] 
    }

    switch (source) {
      case 'usaspending':
        results = await ingestUSASpending(supabase, { state, fiscal_year, limit })
        break
      case 'sam':
        results = await ingestSAM(supabase, { state, limit })
        break
      case 'grants':
        results = await ingestGrants(supabase, { state, fiscal_year, limit })
        break
      default:
        throw new Error(`Unknown source: ${source}`)
    }

    results.duration_ms = Date.now() - startTime

    // Log ingestion
    await supabase.from('system_logs').insert({
      level: 'INFO',
      component: 'ingest-data',
      message: `Ingested ${results.records_inserted} records from ${source}`,
      details: results
    })

    console.log(`✅ INGESTION COMPLETE: ${results.records_inserted} records in ${results.duration_ms}ms`)

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    console.error('Ingestion error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function ingestUSASpending(supabase: ReturnType<typeof createClient>, options: { state?: string; fiscal_year: number; limit: number }): Promise<IngestResult> {
  const { state, fiscal_year, limit } = options
  const results: IngestResult = { 
    source: 'usaspending', 
    records_fetched: 0, 
    records_inserted: 0, 
    entities_created: 0, 
    contracts_created: 0, 
    errors: [] 
  }

  try {
    const filters: Record<string, unknown> = {
      time_period: [{ start_date: `${fiscal_year}-10-01`, end_date: `${fiscal_year + 1}-09-30` }],
      award_type_codes: ['A', 'B', 'C', 'D'],
    }

    if (state) {
      filters.place_of_performance_locations = [{ country: 'USA', state }]
    }

    const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters,
        fields: [
          'Award ID', 'Recipient Name', 'recipient_id', 'Award Amount', 'Total Outlays', 
          'Description', 'Start Date', 'End Date', 'Awarding Agency', 'Awarding Sub Agency', 
          'Award Type', 'Place of Performance City', 'Place of Performance State Code', 
          'Place of Performance Zip', 'NAICS Code', 'PSC Code', 'recipient_uei'
        ],
        page: 1,
        limit,
        sort: 'Award Amount',
        order: 'desc'
      })
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`USASpending API error: ${response.status} - ${text}`)
    }

    const data = await response.json()
    const awards = data.results || []
    results.records_fetched = awards.length

    for (const award of awards) {
      try {
        // Upsert entity
        const { data: entity, error: entityError } = await supabase
          .from('core_entities')
          .upsert({
            canonical_name: award['Recipient Name'],
            entity_type: 'organization',
            city: award['Place of Performance City'],
            state: award['Place of Performance State Code'],
            country: 'USA',
            uei: award.recipient_uei,
            source_count: 1,
            data_quality_score: 80,
            opportunity_score: calculateScore(award['Award Amount'])
          }, { onConflict: 'canonical_name' })
          .select()
          .single()

        if (entityError) {
          results.errors.push(`Entity error: ${entityError.message}`)
          continue
        }

        if (entity) {
          results.entities_created++

          // Insert contract
          const { error: contractError } = await supabase.from('contracts').upsert({
            award_id: award['Award ID'],
            recipient_entity_id: entity.id,
            recipient_name: award['Recipient Name'],
            recipient_uei: award.recipient_uei,
            awarding_agency: award['Awarding Agency'],
            awarding_sub_agency: award['Awarding Sub Agency'],
            award_amount: award['Award Amount'],
            total_obligation: award['Total Outlays'],
            description: award['Description'],
            start_date: award['Start Date'],
            end_date: award['End Date'],
            pop_city: award['Place of Performance City'],
            pop_state: award['Place of Performance State Code'],
            pop_zip: award['Place of Performance Zip'],
            naics_code: award['NAICS Code'],
            psc_code: award['PSC Code'],
            award_type: award['Award Type'],
            source: 'usaspending',
            raw_data: award
          }, { onConflict: 'award_id' })

          if (!contractError) {
            results.contracts_created++
          } else {
            results.errors.push(`Contract error: ${contractError.message}`)
          }

          // Update entity stats
          await supabase.rpc('sync_entity_contract_stats', { p_entity_id: entity.id })
        }

        results.records_inserted++
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        results.errors.push(msg)
      }
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    results.errors.push(msg)
  }

  return results
}

async function ingestSAM(supabase: ReturnType<typeof createClient>, options: { state?: string; limit: number }): Promise<IngestResult> {
  const { state, limit } = options
  const apiKey = Deno.env.get('SAM_API_KEY')
  const results: IngestResult = { 
    source: 'sam', 
    records_fetched: 0, 
    records_inserted: 0, 
    entities_created: 0, 
    contracts_created: 0, 
    errors: [] 
  }

  if (!apiKey) {
    results.errors.push('SAM_API_KEY not configured')
    return results
  }

  try {
    let url = `https://api.sam.gov/entity-information/v3/entities?api_key=${apiKey}&registrationStatus=A&pageSize=${limit}`
    if (state) url += `&physicalAddressStateCode=${state}`

    const response = await fetch(url)
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`SAM API error: ${response.status} - ${text}`)
    }

    const data = await response.json()
    const entities = data.entityData || []
    results.records_fetched = entities.length

    for (const entityData of entities) {
      try {
        const reg = entityData.entityRegistration || {}
        const core = entityData.coreData || {}

        const { data: entity, error: entityError } = await supabase
          .from('core_entities')
          .upsert({
            canonical_name: reg.legalBusinessName || reg.dbaName,
            entity_type: 'organization',
            city: core.physicalAddress?.city,
            state: core.physicalAddress?.stateOrProvinceCode,
            country: core.physicalAddress?.countryCode || 'USA',
            uei: reg.ueiSAM,
            cage_code: reg.cageCode,
            naics_codes: core.naicsCodeList?.map((n: { naicsCode: string }) => n.naicsCode) || [],
            business_types: entityData.assertions?.goodsAndServices?.businessTypeList || [],
            source_count: 1,
            data_quality_score: 90
          }, { onConflict: 'canonical_name' })
          .select()
          .single()

        if (entityError) {
          results.errors.push(`Entity error: ${entityError.message}`)
          continue
        }

        if (entity) {
          results.entities_created++

          // Create registration fact
          await supabase.from('core_facts').insert({
            entity_id: entity.id,
            fact_type: 'sam_registration',
            fact_value: {
              registration_status: reg.registrationStatus,
              registration_date: reg.registrationDate,
              expiration_date: reg.registrationExpirationDate,
              cage_code: reg.cageCode
            },
            confidence: 0.98,
            source: 'sam.gov'
          })
        }

        results.records_inserted++
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        results.errors.push(msg)
      }
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    results.errors.push(msg)
  }

  return results
}

async function ingestGrants(supabase: ReturnType<typeof createClient>, options: { state?: string; fiscal_year: number; limit: number }): Promise<IngestResult> {
  const { state, fiscal_year, limit } = options
  const results: IngestResult = { 
    source: 'grants', 
    records_fetched: 0, 
    records_inserted: 0, 
    entities_created: 0, 
    contracts_created: 0, 
    errors: [] 
  }

  try {
    const filters: Record<string, unknown> = {
      time_period: [{ start_date: `${fiscal_year}-10-01`, end_date: `${fiscal_year + 1}-09-30` }],
      award_type_codes: ['02', '03', '04', '05'], // Grant types
    }

    if (state) {
      filters.recipient_locations = [{ country: 'USA', state }]
    }

    const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters,
        fields: [
          'Award ID', 'Recipient Name', 'recipient_id', 'Award Amount', 
          'Description', 'Start Date', 'End Date', 'Awarding Agency',
          'Recipient State Code', 'Recipient City', 'CFDA Number', 'recipient_uei'
        ],
        page: 1,
        limit,
        sort: 'Award Amount',
        order: 'desc'
      })
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`USASpending Grants API error: ${response.status} - ${text}`)
    }

    const data = await response.json()
    const awards = data.results || []
    results.records_fetched = awards.length

    for (const award of awards) {
      try {
        // Upsert entity
        const { data: entity, error: entityError } = await supabase
          .from('core_entities')
          .upsert({
            canonical_name: award['Recipient Name'],
            entity_type: 'organization',
            city: award['Recipient City'],
            state: award['Recipient State Code'],
            country: 'USA',
            uei: award.recipient_uei,
            source_count: 1,
            data_quality_score: 80,
            opportunity_score: calculateScore(award['Award Amount'])
          }, { onConflict: 'canonical_name' })
          .select()
          .single()

        if (entityError) {
          results.errors.push(`Entity error: ${entityError.message}`)
          continue
        }

        if (entity) {
          results.entities_created++

          // Insert grant
          const { error: grantError } = await supabase.from('grants').upsert({
            grant_id: award['Award ID'],
            fain: award['Award ID'],
            recipient_entity_id: entity.id,
            recipient_name: award['Recipient Name'],
            recipient_uei: award.recipient_uei,
            awarding_agency: award['Awarding Agency'],
            award_amount: award['Award Amount'],
            project_title: award['Description'],
            description: award['Description'],
            cfda_number: award['CFDA Number'],
            start_date: award['Start Date'],
            end_date: award['End Date'],
            recipient_city: award['Recipient City'],
            recipient_state: award['Recipient State Code'],
            source: 'usaspending',
            raw_data: award
          }, { onConflict: 'grant_id' })

          if (grantError) {
            results.errors.push(`Grant error: ${grantError.message}`)
          }

          // Update entity grant stats
          await supabase
            .from('core_entities')
            .update({
              total_grant_value: entity.total_grant_value + (award['Award Amount'] || 0),
              grant_count: (entity.grant_count || 0) + 1
            })
            .eq('id', entity.id)
        }

        results.records_inserted++
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        results.errors.push(msg)
      }
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    results.errors.push(msg)
  }

  return results
}

function calculateScore(amount: number | null | undefined): number {
  if (!amount) return 50
  if (amount >= 100000000) return 95
  if (amount >= 50000000) return 90
  if (amount >= 10000000) return 85
  if (amount >= 5000000) return 80
  if (amount >= 1000000) return 75
  if (amount >= 500000) return 70
  if (amount >= 100000) return 65
  return 60
}
