// 💎 DATA FILLER - Bulk Ingestion for Contracts, Grants, Opportunities 💎
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SAM_API_KEY = Deno.env.get('SAM_API_KEY') || '';

interface FillerResults {
  contracts: number;
  grants: number;
  opportunities: number;
  entities: number;
  errors: string[];
  duration_ms: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const startTime = Date.now();
  console.log('💎 DATA FILLER ACTIVATED 💎');

  // Parse options from request
  let options = { 
    contracts: true, 
    grants: true, 
    opportunities: true,
    states: true,
    historical: false 
  };
  
  try {
    const body = await req.json();
    options = { ...options, ...body };
  } catch { /* use defaults */ }

  const results: FillerResults = {
    contracts: 0,
    grants: 0,
    opportunities: 0,
    entities: 0,
    errors: [],
    duration_ms: 0
  };

  // ============================================
  // 1. USASPENDING CONTRACTS (BULK - PARALLEL)
  // ============================================
  if (options.contracts) {
    console.log('📊 Phase 1: USASpending Contracts...');
    const states = ['MD', 'VA', 'DC', 'PA', 'DE', 'NJ', 'NY', 'NC', 'FL', 'TX', 'CA', 'OH', 'GA', 'IL', 'AZ', 'WA', 'CO', 'MA'];
    
    const contractPromises = states.map(state => ingestUSASpendingContracts(supabase, state, results));
    await Promise.allSettled(contractPromises);
  }

  // ============================================
  // 2. SAM.GOV OPPORTUNITIES
  // ============================================
  if (options.opportunities && SAM_API_KEY) {
    console.log('📋 Phase 2: SAM.gov Opportunities...');
    await ingestSAMOpportunities(supabase, results);
  }

  // ============================================
  // 3. GRANTS.GOV
  // ============================================
  if (options.opportunities) {
    console.log('🎁 Phase 3: Grants.gov Opportunities...');
    await ingestGrantsGov(supabase, results);
  }

  // ============================================
  // 4. NIH REPORTER GRANTS
  // ============================================
  if (options.grants) {
    console.log('🔬 Phase 4: NIH Reporter Grants...');
    await ingestNIHGrants(supabase, results);
  }

  // ============================================
  // 5. NSF AWARDS
  // ============================================
  if (options.grants) {
    console.log('🔭 Phase 5: NSF Awards...');
    await ingestNSFAwards(supabase, results);
  }

  // ============================================
  // 6. STATE DATA (MD, VA, DC)
  // ============================================
  if (options.states) {
    console.log('🏛️ Phase 6: State Data Sources...');
    await Promise.allSettled([
      ingestMarylandData(supabase, results),
      ingestVirginiaData(supabase, results),
      ingestDCData(supabase, results)
    ]);
  }

  // ============================================
  // 7. HISTORICAL BACKFILL (if enabled)
  // ============================================
  if (options.historical) {
    console.log('📜 Phase 7: Historical Backfill...');
    await ingestHistoricalContracts(supabase, results);
  }

  // ============================================
  // 8. POST-PROCESSING
  // ============================================
  console.log('⚙️ Phase 8: Post-processing...');
  try {
    await supabase.rpc('sync_all_entity_stats');
  } catch { /* ignore */ }
  try {
    await supabase.rpc('discover_relationships');
  } catch { /* ignore */ }
  try {
    await supabase.rpc('generate_insights');
  } catch { /* ignore */ }
  try {
    await supabase.rpc('capture_health_snapshot');
  } catch (e: any) {
    results.errors.push(`Post-processing: ${e.message}`);
  }

  results.duration_ms = Date.now() - startTime;

  // Log to system_logs
  await supabase.from('system_logs').insert({
    level: 'INFO',
    component: 'data-filler',
    message: `Data fill complete: ${results.contracts} contracts, ${results.grants} grants, ${results.opportunities} opportunities`,
    details: results
  });

  console.log('💎 DATA FILLER COMPLETE 💎', results);

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

// ============================================
// INGESTION FUNCTIONS
// ============================================

async function ingestUSASpendingContracts(supabase: any, state: string, results: FillerResults) {
  try {
    const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters: {
          time_period: [{ start_date: '2020-01-01', end_date: '2025-12-31' }],
          award_type_codes: ['A', 'B', 'C', 'D'],
          place_of_performance_locations: [{ country: 'USA', state }]
        },
        fields: [
          'Award ID', 'Recipient Name', 'recipient_id', 'Award Amount',
          'Awarding Agency', 'Awarding Sub Agency', 'Award Type',
          'Description', 'Start Date', 'End Date', 'Place of Performance State Code',
          'Place of Performance City Name', 'NAICS Code', 'PSC Code',
          'recipient_uei', 'Recipient DUNS Number'
        ],
        limit: 500,
        page: 1,
        sort: 'Award Amount',
        order: 'desc'
      })
    });

    if (!response.ok) return;
    const data = await response.json();

    for (const award of data.results || []) {
      const recipientName = award['Recipient Name'];
      if (!recipientName || recipientName.length < 2) continue;

      // Resolve entity
      const { data: entityId } = await supabase.rpc('smart_resolve_entity', {
        p_name: recipientName,
        p_type: 'organization',
        p_city: award['Place of Performance City Name'],
        p_state: state,
        p_uei: award['recipient_uei'],
        p_duns: award['Recipient DUNS Number'],
        p_source: 'usaspending'
      });

      if (entityId) results.entities++;

      // Insert contract
      const { error } = await supabase.from('contracts').upsert({
        award_id: award['Award ID'],
        recipient_entity_id: entityId,
        recipient_name: recipientName,
        recipient_uei: award['recipient_uei'],
        recipient_duns: award['Recipient DUNS Number'],
        award_amount: parseFloat(award['Award Amount']) || 0,
        awarding_agency: award['Awarding Agency'],
        awarding_sub_agency: award['Awarding Sub Agency'],
        award_type: award['Award Type'],
        description: award['Description']?.substring(0, 5000),
        start_date: award['Start Date'],
        end_date: award['End Date'],
        pop_state: state,
        pop_city: award['Place of Performance City Name'],
        naics_code: award['NAICS Code'],
        psc_code: award['PSC Code'],
        source: 'usaspending'
      }, { onConflict: 'award_id', ignoreDuplicates: true });

      if (!error) results.contracts++;
    }
  } catch (e: any) {
    results.errors.push(`USASpending-${state}: ${e.message}`);
  }
}

async function ingestSAMOpportunities(supabase: any, results: FillerResults) {
  try {
    const response = await fetch(
      `https://api.sam.gov/opportunities/v2/search?api_key=${SAM_API_KEY}&limit=500&postedFrom=01/01/2024&postedTo=12/31/2025`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) return;
    const data = await response.json();

    for (const opp of data.opportunitiesData || []) {
      const { error } = await supabase.from('opportunities').upsert({
        notice_id: opp.noticeId,
        solicitation_number: opp.solicitationNumber,
        title: opp.title,
        description: opp.description?.substring(0, 5000),
        notice_type: opp.type,
        department: opp.department,
        sub_tier: opp.subtier,
        office: opp.office,
        naics_code: opp.naicsCode,
        set_aside: opp.typeOfSetAside,
        posted_date: opp.postedDate,
        response_deadline: opp.responseDeadLine,
        award_floor: opp.award?.floor,
        award_ceiling: opp.award?.ceiling,
        pop_state: opp.placeOfPerformance?.state?.code,
        pop_city: opp.placeOfPerformance?.city?.name,
        primary_contact_email: opp.pointOfContact?.[0]?.email,
        ui_link: opp.uiLink,
        is_active: opp.active === 'Yes',
        source: 'sam_gov'
      }, { onConflict: 'notice_id', ignoreDuplicates: true });

      if (!error) results.opportunities++;
    }
  } catch (e: any) {
    results.errors.push(`SAM Opportunities: ${e.message}`);
  }
}

async function ingestGrantsGov(supabase: any, results: FillerResults) {
  try {
    const response = await fetch('https://www.grants.gov/grantsws/rest/opportunities/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: '',
        oppStatuses: 'forecasted|posted',
        rows: 500
      })
    });

    if (!response.ok) return;
    const data = await response.json();

    for (const grant of data.oppHits || []) {
      const { error } = await supabase.from('opportunities').upsert({
        notice_id: `grants-gov-${grant.id || grant.oppNumber}`,
        title: grant.title,
        description: grant.synopsis?.substring(0, 5000),
        department: grant.agencyName || grant.agency,
        posted_date: grant.openDate,
        response_deadline: grant.closeDate,
        award_ceiling: grant.awardCeiling,
        award_floor: grant.awardFloor,
        is_active: true,
        source: 'grants_gov'
      }, { onConflict: 'notice_id', ignoreDuplicates: true });

      if (!error) results.opportunities++;
    }
  } catch (e: any) {
    results.errors.push(`Grants.gov: ${e.message}`);
  }
}

async function ingestNIHGrants(supabase: any, results: FillerResults) {
  try {
    const response = await fetch('https://api.reporter.nih.gov/v2/projects/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        criteria: {
          fiscal_years: [2022, 2023, 2024, 2025],
          include_active_projects: true
        },
        limit: 500,
        offset: 0
      })
    });

    if (!response.ok) return;
    const data = await response.json();

    for (const project of data.results || []) {
      const org = project.organization;
      if (!org?.org_name) continue;

      // Resolve entity
      const { data: entityId } = await supabase.rpc('smart_resolve_entity', {
        p_name: org.org_name,
        p_type: org.org_name.toLowerCase().includes('university') ? 'university' : 'research_organization',
        p_city: org.org_city,
        p_state: org.org_state,
        p_source: 'nih_reporter'
      });

      if (entityId) results.entities++;

      const { error } = await supabase.from('grants').upsert({
        grant_id: `nih-${project.project_num}`,
        fain: project.project_num,
        recipient_entity_id: entityId,
        recipient_name: org.org_name,
        awarding_agency: 'Department of Health and Human Services',
        awarding_sub_agency: project.ic?.ic_name,
        award_amount: project.award_amount || 0,
        project_title: project.project_title,
        description: project.abstract_text?.substring(0, 5000),
        start_date: project.project_start_date,
        end_date: project.project_end_date,
        pop_state: org.org_state,
        pop_city: org.org_city,
        source: 'nih_reporter'
      }, { onConflict: 'grant_id', ignoreDuplicates: true });

      if (!error) results.grants++;
    }
  } catch (e: any) {
    results.errors.push(`NIH: ${e.message}`);
  }
}

async function ingestNSFAwards(supabase: any, results: FillerResults) {
  try {
    const response = await fetch(
      'https://api.nsf.gov/services/v1/awards.json?startDateStart=01/01/2022&printFields=id,title,awardeeName,awardeeCity,awardeeStateCode,fundsObligatedAmt,startDate,expDate,abstractText&offset=1&rpp=500'
    );

    if (!response.ok) return;
    const data = await response.json();

    for (const award of data.response?.award || []) {
      if (!award.awardeeName) continue;

      const { data: entityId } = await supabase.rpc('smart_resolve_entity', {
        p_name: award.awardeeName,
        p_type: award.awardeeName.toLowerCase().includes('university') ? 'university' : 'research_organization',
        p_city: award.awardeeCity,
        p_state: award.awardeeStateCode,
        p_source: 'nsf_awards'
      });

      if (entityId) results.entities++;

      const { error } = await supabase.from('grants').upsert({
        grant_id: `nsf-${award.id}`,
        recipient_entity_id: entityId,
        recipient_name: award.awardeeName,
        awarding_agency: 'National Science Foundation',
        award_amount: parseFloat(award.fundsObligatedAmt) || 0,
        project_title: award.title,
        description: award.abstractText?.substring(0, 5000),
        start_date: award.startDate,
        end_date: award.expDate,
        pop_state: award.awardeeStateCode,
        pop_city: award.awardeeCity,
        source: 'nsf_awards'
      }, { onConflict: 'grant_id', ignoreDuplicates: true });

      if (!error) results.grants++;
    }
  } catch (e: any) {
    results.errors.push(`NSF: ${e.message}`);
  }
}

async function ingestMarylandData(supabase: any, results: FillerResults) {
  try {
    // Maryland Open Data - State Contracts
    const response = await fetch(
      'https://opendata.maryland.gov/resource/contracts.json?$limit=500',
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) return;
    const data = await response.json();

    for (const contract of data) {
      if (!contract.vendor_name) continue;

      const { data: entityId } = await supabase.rpc('smart_resolve_entity', {
        p_name: contract.vendor_name,
        p_type: 'organization',
        p_state: 'MD',
        p_source: 'maryland_open_data'
      });

      if (entityId) results.entities++;

      const { error } = await supabase.from('contracts').upsert({
        award_id: `md-${contract.contract_id || contract.id || Date.now()}`,
        recipient_entity_id: entityId,
        recipient_name: contract.vendor_name,
        award_amount: parseFloat(contract.contract_value || contract.amount) || 0,
        awarding_agency: contract.agency_name || 'State of Maryland',
        description: contract.description,
        start_date: contract.start_date,
        end_date: contract.end_date,
        pop_state: 'MD',
        source: 'maryland_open_data'
      }, { onConflict: 'award_id', ignoreDuplicates: true });

      if (!error) results.contracts++;
    }
  } catch (e: any) {
    results.errors.push(`Maryland: ${e.message}`);
  }
}

async function ingestVirginiaData(supabase: any, results: FillerResults) {
  try {
    // Virginia eVA - Public contracts data
    const response = await fetch(
      'https://data.virginia.gov/resource/contracts.json?$limit=500',
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) return;
    const data = await response.json();

    for (const contract of data) {
      if (!contract.vendor_name) continue;

      const { data: entityId } = await supabase.rpc('smart_resolve_entity', {
        p_name: contract.vendor_name,
        p_type: 'organization',
        p_state: 'VA',
        p_source: 'virginia_eva'
      });

      if (entityId) results.entities++;

      const { error } = await supabase.from('contracts').upsert({
        award_id: `va-${contract.contract_id || contract.id || Date.now()}`,
        recipient_entity_id: entityId,
        recipient_name: contract.vendor_name,
        award_amount: parseFloat(contract.contract_value || contract.amount) || 0,
        awarding_agency: contract.agency_name || 'Commonwealth of Virginia',
        description: contract.description,
        start_date: contract.start_date,
        end_date: contract.end_date,
        pop_state: 'VA',
        source: 'virginia_eva'
      }, { onConflict: 'award_id', ignoreDuplicates: true });

      if (!error) results.contracts++;
    }
  } catch (e: any) {
    results.errors.push(`Virginia: ${e.message}`);
  }
}

async function ingestDCData(supabase: any, results: FillerResults) {
  try {
    // DC Open Data - Contracts
    const response = await fetch(
      'https://opendata.dc.gov/resource/contracts.json?$limit=500',
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) return;
    const data = await response.json();

    for (const contract of data) {
      if (!contract.vendor_name) continue;

      const { data: entityId } = await supabase.rpc('smart_resolve_entity', {
        p_name: contract.vendor_name,
        p_type: 'organization',
        p_state: 'DC',
        p_source: 'dc_open_data'
      });

      if (entityId) results.entities++;

      const { error } = await supabase.from('contracts').upsert({
        award_id: `dc-${contract.contract_id || contract.id || Date.now()}`,
        recipient_entity_id: entityId,
        recipient_name: contract.vendor_name,
        award_amount: parseFloat(contract.contract_value || contract.amount) || 0,
        awarding_agency: contract.agency_name || 'District of Columbia',
        description: contract.description,
        start_date: contract.start_date,
        end_date: contract.end_date,
        pop_state: 'DC',
        source: 'dc_open_data'
      }, { onConflict: 'award_id', ignoreDuplicates: true });

      if (!error) results.contracts++;
    }
  } catch (e: any) {
    results.errors.push(`DC: ${e.message}`);
  }
}

async function ingestHistoricalContracts(supabase: any, results: FillerResults) {
  const years = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022];
  
  for (const year of years) {
    try {
      const response = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            time_period: [{ 
              start_date: `${year}-01-01`, 
              end_date: `${year}-12-31` 
            }],
            award_type_codes: ['A', 'B', 'C', 'D'],
            award_amounts: [{ lower_bound: 1000000 }]  // Only >$1M for history
          },
          fields: [
            'Award ID', 'Recipient Name', 'recipient_uei', 'Award Amount',
            'Awarding Agency', 'Start Date', 'Place of Performance State Code',
            'NAICS Code'
          ],
          limit: 500,
          page: 1
        })
      });

      if (!response.ok) continue;
      const data = await response.json();

      for (const award of data.results || []) {
        const recipientName = award['Recipient Name'];
        if (!recipientName) continue;

        const { data: entityId } = await supabase.rpc('smart_resolve_entity', {
          p_name: recipientName,
          p_type: 'organization',
          p_state: award['Place of Performance State Code'],
          p_uei: award['recipient_uei'],
          p_source: 'usaspending_historical'
        });

        if (entityId) results.entities++;

        const { error } = await supabase.from('contracts').upsert({
          award_id: award['Award ID'],
          recipient_entity_id: entityId,
          recipient_name: recipientName,
          recipient_uei: award['recipient_uei'],
          award_amount: parseFloat(award['Award Amount']) || 0,
          awarding_agency: award['Awarding Agency'],
          start_date: award['Start Date'],
          pop_state: award['Place of Performance State Code'],
          naics_code: award['NAICS Code'],
          source: 'usaspending_historical'
        }, { onConflict: 'award_id', ignoreDuplicates: true });

        if (!error) results.contracts++;
      }
    } catch (e: any) {
      results.errors.push(`Historical-${year}: ${e.message}`);
    }
  }
}
