// supabase/functions/data-filler-v2/index.ts
// 💥 BATTLE-TESTED DATA FILLER - ACTUALLY WORKS 💥

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Parse request - allow targeting specific sources
  let body = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  
  const mode = (body as any).mode || 'all' // 'contracts', 'grants', 'opportunities', 'all'
  const limit = (body as any).limit || 100 // Keep small to avoid timeout
  const state = (body as any).state || 'MD' // Default to Maryland

  const results = {
    mode,
    state,
    contracts_added: 0,
    grants_added: 0,
    opportunities_added: 0,
    entities_resolved: 0,
    errors: [] as string[],
    duration_ms: 0
  }

  // ============================================
  // CONTRACTS FROM USASPENDING (WORKS!)
  // ============================================
  if (mode === 'all' || mode === 'contracts') {
    try {
      console.log(`Fetching contracts for ${state}...`)
      
      const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            time_period: [{ start_date: '2023-01-01', end_date: '2025-12-31' }],
            award_type_codes: ['A', 'B', 'C', 'D'],
            place_of_performance_locations: [{ country: 'USA', state: state }]
          },
          fields: [
            'Award ID', 'Recipient Name', 'recipient_id', 'Award Amount',
            'Awarding Agency', 'Awarding Sub Agency', 'Award Type',
            'Description', 'Start Date', 'End Date', 'Place of Performance State Code',
            'Place of Performance City Name', 'NAICS Code', 'PSC Code',
            'recipient_uei', 'Recipient DUNS Number'
          ],
          limit: limit,
          page: 1,
          sort: 'Award Amount',
          order: 'desc'
        })
      })

      if (!response.ok) {
        throw new Error(`USASpending API error: ${response.status}`)
      }

      const data = await response.json()
      console.log(`Got ${data.results?.length || 0} contracts from USASpending`)

      for (const award of data.results || []) {
        try {
          // Resolve entity first
          let entityId = null
          if (award['Recipient Name']) {
            const { data: resolvedId, error: resolveError } = await supabase.rpc('smart_resolve_entity', {
              p_name: award['Recipient Name'],
              p_uei: award['recipient_uei'] || null,
              p_duns: award['Recipient DUNS Number'] || null,
              p_state: state,
              p_city: award['Place of Performance City Name'] || null,
              p_source: 'usaspending'
            })
            
            if (!resolveError && resolvedId) {
              entityId = resolvedId
              results.entities_resolved++
            }
          }

          // Insert contract
          const { error } = await supabase.from('contracts').upsert({
            award_id: award['Award ID'],
            recipient_entity_id: entityId,
            recipient_name: award['Recipient Name'] || 'Unknown',
            recipient_uei: award['recipient_uei'],
            recipient_duns: award['Recipient DUNS Number'],
            award_amount: parseFloat(award['Award Amount']) || 0,
            awarding_agency: award['Awarding Agency'],
            awarding_sub_agency: award['Awarding Sub Agency'],
            award_type: award['Award Type'],
            description: award['Description']?.substring(0, 5000),
            start_date: award['Start Date'],
            end_date: award['End Date'],
            pop_state: award['Place of Performance State Code'] || state,
            pop_city: award['Place of Performance City Name'],
            naics_code: award['NAICS Code'],
            psc_code: award['PSC Code'],
            source: 'usaspending'
          }, { onConflict: 'award_id' })

          if (!error) {
            results.contracts_added++
          } else {
            console.error('Contract insert error:', error.message)
          }
        } catch (e) {
          console.error('Contract processing error:', e)
        }
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e)
      results.errors.push(`Contracts: ${err}`)
      console.error('Contracts fetch error:', e)
    }
  }

  // ============================================
  // GRANTS FROM NIH REPORTER (WORKS!)
  // ============================================
  if (mode === 'all' || mode === 'grants') {
    try {
      console.log('Fetching grants from NIH RePORTER...')
      
      const response = await fetch('https://api.reporter.nih.gov/v2/projects/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criteria: {
            fiscal_years: [2024, 2025],
            include_active_projects: true,
            org_states: [state]
          },
          limit: limit,
          offset: 0
        })
      })

      if (!response.ok) {
        throw new Error(`NIH API error: ${response.status}`)
      }

      const data = await response.json()
      console.log(`Got ${data.results?.length || 0} grants from NIH`)

      for (const project of data.results || []) {
        try {
          // Resolve entity
          let entityId = null
          const orgName = project.organization?.org_name
          if (orgName) {
            const { data: resolvedId, error: resolveError } = await supabase.rpc('smart_resolve_entity', {
              p_name: orgName,
              p_city: project.organization?.org_city,
              p_state: project.organization?.org_state,
              p_source: 'nih_reporter'
            })
            
            if (!resolveError && resolvedId) {
              entityId = resolvedId
              results.entities_resolved++
            }
          }

          // Insert grant - FIXED SCHEMA!
          const { error } = await supabase.from('grants').upsert({
            grant_id: `nih-${project.project_num}`,
            fain: project.project_num,
            recipient_entity_id: entityId,
            recipient_name: orgName || 'Unknown',
            recipient_uei: project.organization?.org_uei,
            awarding_agency: 'Department of Health and Human Services',
            awarding_sub_agency: project.ic?.ic_name,
            funding_agency: 'National Institutes of Health',
            grant_type: project.activity_code,
            award_amount: project.award_amount || 0,
            total_funding: project.award_amount || 0,
            cfda_number: project.cfda_code,
            cfda_title: project.cfda_title,
            project_title: project.project_title,
            description: project.abstract_text?.substring(0, 5000),
            start_date: project.project_start_date,
            end_date: project.project_end_date,
            recipient_city: project.organization?.org_city,  // CORRECT COLUMN
            recipient_state: project.organization?.org_state, // CORRECT COLUMN
            source: 'nih_reporter'
          }, { onConflict: 'grant_id' })

          if (!error) {
            results.grants_added++
          } else {
            console.error('Grant insert error:', error.message)
          }
        } catch (e) {
          console.error('Grant processing error:', e)
        }
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e)
      results.errors.push(`NIH Grants: ${err}`)
      console.error('NIH fetch error:', e)
    }

    // Also try NSF
    try {
      console.log('Fetching grants from NSF...')
      
      const nsfUrl = `https://api.nsf.gov/services/v1/awards.json?awardeeStateCode=${state}&startDateStart=01/01/2023&printFields=id,title,awardeeName,awardeeCity,awardeeStateCode,fundsObligatedAmt,startDate,expDate,abstractText,agency&offset=1&rpp=${limit}`
      
      const response = await fetch(nsfUrl)
      
      if (!response.ok) {
        throw new Error(`NSF API error: ${response.status}`)
      }

      const data = await response.json()
      const awards = data.response?.award || []
      console.log(`Got ${awards.length} grants from NSF`)

      for (const award of awards) {
        try {
          // Resolve entity
          let entityId = null
          if (award.awardeeName) {
            const { data: resolvedId } = await supabase.rpc('smart_resolve_entity', {
              p_name: award.awardeeName,
              p_city: award.awardeeCity,
              p_state: award.awardeeStateCode,
              p_source: 'nsf_awards'
            })
            if (resolvedId) {
              entityId = resolvedId
              results.entities_resolved++
            }
          }

          // Insert grant - FIXED SCHEMA!
          const { error } = await supabase.from('grants').upsert({
            grant_id: `nsf-${award.id}`,
            recipient_entity_id: entityId,
            recipient_name: award.awardeeName || 'Unknown',
            awarding_agency: 'National Science Foundation',
            awarding_sub_agency: award.agency,
            award_amount: parseFloat(award.fundsObligatedAmt) || 0,
            total_funding: parseFloat(award.fundsObligatedAmt) || 0,
            project_title: award.title,
            description: award.abstractText?.substring(0, 5000),
            start_date: award.startDate,
            end_date: award.expDate,
            recipient_city: award.awardeeCity,      // CORRECT COLUMN
            recipient_state: award.awardeeStateCode, // CORRECT COLUMN
            source: 'nsf_awards'
          }, { onConflict: 'grant_id' })

          if (!error) {
            results.grants_added++
          }
        } catch (e) {
          console.error('NSF grant error:', e)
        }
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e)
      results.errors.push(`NSF Grants: ${err}`)
      console.error('NSF fetch error:', e)
    }
  }

  // ============================================
  // OPPORTUNITIES FROM SAM.GOV
  // ============================================
  if (mode === 'all' || mode === 'opportunities') {
    try {
      console.log('Fetching opportunities from SAM.gov...')
      
      const samApiKey = Deno.env.get('SAM_API_KEY')
      
      if (!samApiKey) {
        results.errors.push('SAM_API_KEY not configured - skipping opportunities')
        console.warn('SAM_API_KEY not set, skipping SAM.gov')
      } else {
        const today = new Date()
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        const postedFrom = thirtyDaysAgo.toISOString().split('T')[0].replace(/-/g, '/')
        
        const samUrl = `https://api.sam.gov/opportunities/v2/search?api_key=${samApiKey}&limit=${limit}&postedFrom=${postedFrom}&ptype=o,k,p&state=${state}`
        
        const response = await fetch(samUrl, {
          headers: { 'Accept': 'application/json' }
        })

        if (!response.ok) {
          throw new Error(`SAM API error: ${response.status} - ${await response.text()}`)
        }

        const data = await response.json()
        const opps = data.opportunitiesData || []
        console.log(`Got ${opps.length} opportunities from SAM.gov`)

        for (const opp of opps) {
          try {
            const { error } = await supabase.from('opportunities').upsert({
              notice_id: opp.noticeId,
              solicitation_number: opp.solicitationNumber,
              title: opp.title,
              description: opp.description?.substring(0, 5000),
              notice_type: opp.type,
              department: opp.department?.name || opp.departmentName,
              sub_tier: opp.subtierAgency?.name,
              office: opp.office?.name,
              naics_code: opp.naicsCode,
              psc_code: opp.classificationCode,
              set_aside: opp.typeOfSetAside,
              posted_date: opp.postedDate,
              response_deadline: opp.responseDeadLine,
              archive_date: opp.archiveDate,
              award_floor: opp.award?.floor,
              award_ceiling: opp.award?.ceiling,
              pop_state: opp.placeOfPerformance?.state?.code || state,
              pop_city: opp.placeOfPerformance?.city?.name,
              primary_contact_name: opp.pointOfContact?.[0]?.fullName,
              primary_contact_email: opp.pointOfContact?.[0]?.email,
              primary_contact_phone: opp.pointOfContact?.[0]?.phone,
              ui_link: opp.uiLink || `https://sam.gov/opp/${opp.noticeId}/view`,
              is_active: opp.active !== 'No',
              source: 'sam_gov'
            }, { onConflict: 'notice_id' })

            if (!error) {
              results.opportunities_added++
            } else {
              console.error('Opp insert error:', error.message)
            }
          } catch (e) {
            console.error('Opp processing error:', e)
          }
        }
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e)
      results.errors.push(`SAM Opportunities: ${err}`)
      console.error('SAM fetch error:', e)
    }
  }

  // ============================================
  // POST-PROCESSING
  // ============================================
  try {
    // Sync entity stats
    if (results.contracts_added > 0 || results.grants_added > 0) {
      console.log('Syncing entity stats...')
      await supabase.rpc('sync_all_entity_stats')
    }
    
    // Capture health snapshot
    console.log('Capturing health snapshot...')
    await supabase.rpc('capture_health_snapshot')
    
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e)
    results.errors.push(`Post-processing: ${err}`)
  }

  results.duration_ms = Date.now() - startTime

  console.log('=== FINAL RESULTS ===')
  console.log(JSON.stringify(results, null, 2))

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})