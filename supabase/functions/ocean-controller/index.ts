// 🌊 OCEAN CONTROLLER - Ultimate Data Ingestion & Derivation Engine
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SAM_API_KEY = Deno.env.get('SAM_API_KEY') || '';

interface OceanResults {
  phase: string;
  ingestion: { records: number; entities: number; contracts: number };
  derivation: { relationships: number; insights: number; scored: number };
  health: { snapshot_id: string | null };
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
  console.log('🌊 OCEAN CONTROLLER ACTIVATED 🌊');

  const results: OceanResults = {
    phase: 'ocean-controller',
    ingestion: { records: 0, entities: 0, contracts: 0 },
    derivation: { relationships: 0, insights: 0, scored: 0 },
    health: { snapshot_id: null },
    errors: [],
    duration_ms: 0
  };

  try {
    // ==========================================
    // PHASE 1: PARALLEL INGESTION (KRAKEN RAGE)
    // ==========================================
    console.log('🦑 Phase 1: Kraken Rage - Ingesting data...');

    const ingestPromises = [
      // USASpending - Priority states
      ...['MD', 'VA', 'DC', 'PA', 'DE', 'NJ', 'NY', 'NC', 'FL', 'TX', 'CA'].map(state =>
        ingestUSASpending(supabase, state, results)
      ),
      // SAM.gov entities
      ingestSAMEntities(supabase, 'MD', results),
      ingestSAMEntities(supabase, 'VA', results),
      ingestSAMEntities(supabase, 'DC', results),
      // SAM opportunities
      ingestSAMOpportunities(supabase, results),
      // Grants.gov
      ingestGrantsGov(supabase, results),
      // Research
      ingestNIH(supabase, results),
      ingestNSF(supabase, results),
      // Emergency
      ingestFEMA(supabase, results),
    ];

    await Promise.allSettled(ingestPromises);

    // ==========================================
    // PHASE 2: DERIVATION (OCEAN CURRENTS)
    // ==========================================
    console.log('🌊 Phase 2: Running derivation pipeline...');

    if (results.ingestion.records > 10) {
      const { data: cycleResult } = await supabase.rpc('run_full_ocean_cycle');
      if (cycleResult) {
        results.derivation.relationships = cycleResult.discovery?.total || 0;
        results.derivation.insights = cycleResult.insights?.total || 0;
        results.derivation.scored = cycleResult.entities_scored || 0;
        results.health.snapshot_id = cycleResult.health_snapshot_id;
      }
    } else {
      // Still capture health even without new data
      const { data: healthId } = await supabase.rpc('capture_ocean_health');
      results.health.snapshot_id = healthId;
    }

    results.duration_ms = Date.now() - startTime;

    // Log to system_logs
    await supabase.from('system_logs').insert({
      level: 'INFO',
      component: 'ocean-controller',
      message: `Ocean cycle complete: ${results.ingestion.records} records, ${results.derivation.relationships} relationships`,
      details: results
    });

    console.log('🌊 OCEAN CONTROLLER COMPLETE 🌊', results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Ocean Controller error:', error);
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    results.duration_ms = Date.now() - startTime;

    return new Response(JSON.stringify(results), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// ==========================================
// INGESTION FUNCTIONS
// ==========================================

async function ingestUSASpending(supabase: any, state: string, results: OceanResults) {
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
          'Place of Performance City', 'NAICS Code', 'PSC Code', 'recipient_uei',
          'recipient_duns', 'Award Type'],
        page: 1,
        limit: 100,
        sort: 'Award Amount',
        order: 'desc'
      })
    });

    if (!res.ok) return;
    const data = await res.json();
    const awards = data.results || [];
    results.ingestion.records += awards.length;

    for (const a of awards) {
      const name = a['Recipient Name'];
      if (!name || name.length < 2) continue;

      const { data: entityId } = await supabase.rpc('smart_resolve_entity', {
        p_name: name,
        p_type: 'organization',
        p_city: a['Place of Performance City'],
        p_state: a['Place of Performance State Code'],
        p_uei: a.recipient_uei,
        p_duns: a.recipient_duns,
        p_source: 'usaspending'
      });

      if (entityId) {
        results.ingestion.entities++;

        const { error } = await supabase.from('contracts').upsert({
          award_id: a['Award ID'],
          recipient_entity_id: entityId,
          recipient_name: name,
          recipient_uei: a.recipient_uei,
          awarding_agency: a['Awarding Agency'],
          awarding_sub_agency: a['Awarding Sub Agency'],
          award_amount: parseFloat(a['Award Amount']) || 0,
          description: a['Description'],
          start_date: a['Start Date'],
          end_date: a['End Date'],
          pop_state: a['Place of Performance State Code'],
          pop_city: a['Place of Performance City'],
          naics_code: a['NAICS Code'],
          psc_code: a['PSC Code'],
          award_type: a['Award Type'],
          source: 'usaspending'
        }, { onConflict: 'award_id', ignoreDuplicates: true });

        if (!error) results.ingestion.contracts++;
      }
    }
  } catch (e: any) {
    results.errors.push(`usaspending-${state}: ${e.message}`);
  }
}

async function ingestSAMEntities(supabase: any, state: string, results: OceanResults) {
  if (!SAM_API_KEY) return;
  try {
    const res = await fetch(
      `https://api.sam.gov/entity-information/v3/entities?api_key=${SAM_API_KEY}&registrationStatus=A&physicalAddressStateCode=${state}&pageSize=100`
    );
    if (!res.ok) return;
    const data = await res.json();
    const entities = data.entityData || [];
    results.ingestion.records += entities.length;

    for (const e of entities) {
      const reg = e.entityRegistration || {};
      const core = e.coreData || {};
      const name = reg.legalBusinessName || reg.dbaName;
      if (!name) continue;

      const { data: entityId } = await supabase.rpc('smart_resolve_entity', {
        p_name: name,
        p_type: 'organization',
        p_city: core.physicalAddress?.city,
        p_state: core.physicalAddress?.stateOrProvinceCode,
        p_uei: reg.ueiSAM,
        p_duns: reg.duns,
        p_cage_code: reg.cageCode,
        p_source: 'sam'
      });

      if (entityId) {
        results.ingestion.entities++;
        await supabase.from('core_entities').update({
          naics_codes: core.naicsCodeList?.map((n: any) => n.naicsCode) || [],
          business_types: e.assertions?.goodsAndServices?.businessTypeList || [],
          data_quality_score: 95
        }).eq('id', entityId);
      }
    }
  } catch (e: any) {
    results.errors.push(`sam-${state}: ${e.message}`);
  }
}

async function ingestSAMOpportunities(supabase: any, results: OceanResults) {
  if (!SAM_API_KEY) return;
  try {
    const res = await fetch(
      `https://api.sam.gov/opportunities/v2/search?api_key=${SAM_API_KEY}&postedFrom=01/01/2024&limit=100`
    );
    if (!res.ok) return;
    const data = await res.json();
    const opps = data.opportunitiesData || [];
    results.ingestion.records += opps.length;

    for (const o of opps) {
      await supabase.from('opportunities').upsert({
        notice_id: o.noticeId,
        solicitation_number: o.solicitationNumber,
        title: o.title,
        description: o.description?.slice(0, 10000),
        notice_type: o.noticeType,
        department: o.department,
        sub_tier: o.subTier,
        office: o.office,
        posted_date: o.postedDate,
        response_deadline: o.responseDeadLine,
        pop_state: o.placeOfPerformance?.state?.code,
        pop_city: o.placeOfPerformance?.city?.name,
        naics_code: o.naicsCode,
        set_aside: o.typeOfSetAside,
        ui_link: o.uiLink,
        is_active: o.active === 'Yes'
      }, { onConflict: 'notice_id', ignoreDuplicates: true });
    }
  } catch (e: any) {
    results.errors.push(`sam-opportunities: ${e.message}`);
  }
}

async function ingestGrantsGov(supabase: any, results: OceanResults) {
  try {
    const res = await fetch('https://www.grants.gov/grantsws/rest/opportunities/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: '', oppStatuses: 'forecasted|posted', rows: 100 })
    });
    if (!res.ok) return;
    const data = await res.json();
    const opps = data.oppHits || [];
    results.ingestion.records += opps.length;

    for (const o of opps) {
      await supabase.from('opportunities').upsert({
        notice_id: `grants-gov-${o.id || o.oppNumber}`,
        title: o.title,
        description: o.synopsis,
        department: o.agencyName,
        posted_date: o.openDate,
        response_deadline: o.closeDate,
        award_ceiling: o.awardCeiling,
        award_floor: o.awardFloor,
        is_active: true
      }, { onConflict: 'notice_id', ignoreDuplicates: true });
    }
  } catch (e: any) {
    results.errors.push(`grants-gov: ${e.message}`);
  }
}

async function ingestNIH(supabase: any, results: OceanResults) {
  try {
    const res = await fetch('https://api.reporter.nih.gov/v2/projects/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ criteria: { fiscal_years: [2023, 2024, 2025] }, limit: 100 })
    });
    if (!res.ok) return;
    const data = await res.json();
    const projects = data.results || [];
    results.ingestion.records += projects.length;

    for (const p of projects) {
      const org = p.organization;
      if (!org?.org_name) continue;

      const { data: entityId } = await supabase.rpc('smart_resolve_entity', {
        p_name: org.org_name,
        p_type: org.org_name.toLowerCase().includes('university') ? 'university' : 'research_organization',
        p_city: org.org_city,
        p_state: org.org_state,
        p_uei: org.org_uei,
        p_source: 'nih'
      });

      if (entityId) {
        results.ingestion.entities++;
        await supabase.from('grants').upsert({
          grant_id: p.project_num,
          recipient_entity_id: entityId,
          recipient_name: org.org_name,
          awarding_agency: 'NIH',
          award_amount: p.award_amount,
          project_title: p.project_title,
          description: p.abstract_text?.slice(0, 5000),
          start_date: p.project_start_date,
          end_date: p.project_end_date,
          source: 'nih_reporter'
        }, { onConflict: 'grant_id', ignoreDuplicates: true });
      }
    }
  } catch (e: any) {
    results.errors.push(`nih: ${e.message}`);
  }
}

async function ingestNSF(supabase: any, results: OceanResults) {
  try {
    const res = await fetch('https://api.nsf.gov/services/v1/awards.json?offset=1&rpp=100');
    if (!res.ok) return;
    const data = await res.json();
    const awards = data.response?.award || [];
    results.ingestion.records += awards.length;

    for (const a of awards) {
      if (!a.awardeeName) continue;

      const { data: entityId } = await supabase.rpc('smart_resolve_entity', {
        p_name: a.awardeeName,
        p_type: 'research_organization',
        p_city: a.awardeeCity,
        p_state: a.awardeeStateCode,
        p_source: 'nsf'
      });

      if (entityId) {
        results.ingestion.entities++;
        await supabase.from('grants').upsert({
          grant_id: `nsf-${a.id}`,
          recipient_entity_id: entityId,
          recipient_name: a.awardeeName,
          awarding_agency: 'NSF',
          award_amount: parseFloat(a.fundsObligatedAmt) || 0,
          project_title: a.title,
          start_date: a.startDate,
          end_date: a.expDate,
          source: 'nsf'
        }, { onConflict: 'grant_id', ignoreDuplicates: true });
      }
    }
  } catch (e: any) {
    results.errors.push(`nsf: ${e.message}`);
  }
}

async function ingestFEMA(supabase: any, results: OceanResults) {
  try {
    const res = await fetch('https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=100&$orderby=declarationDate desc');
    if (!res.ok) return;
    const data = await res.json();
    const disasters = data.DisasterDeclarationsSummaries || [];
    results.ingestion.records += disasters.length;

    for (const d of disasters) {
      await supabase.from('core_facts').insert({
        fact_type: 'fema_disaster',
        fact_value: {
          disaster_number: d.disasterNumber,
          title: d.declarationTitle,
          state: d.state,
          type: d.incidentType,
          date: d.declarationDate
        },
        source_name: 'fema',
        confidence: 1.0
      }).catch(() => { });
    }
  } catch (e: any) {
    results.errors.push(`fema: ${e.message}`);
  }
}
