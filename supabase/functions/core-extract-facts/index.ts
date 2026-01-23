// ============================================================
// 🧠 THE CORE: FACT EXTRACTION ENGINE v2.0
// Extracts temporal facts AND links orphaned facts to entities
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecordData {
  id: string;
  name: string;
  category: string;
  source_id: string;
  properties: Record<string, unknown>;
  entity_id?: string;
}

interface ExtractedFact {
  entity_id?: string;
  fact_type: string;
  fact_value: unknown;
  fact_date?: string;
  source_name: string;
  source_record_id: string;
  confidence: number;
}

// ═══════════════════════════════════════════════════════════════
// LINK ORPHANED FACTS TO ENTITIES
// ═══════════════════════════════════════════════════════════════
async function linkOrphanedFacts(supabase: any): Promise<{ linked: number }> {
  // Find facts without entity_id but with source_record_id
  const { data: orphanedFacts } = await supabase
    .from('core_facts')
    .select('id, source_record_id')
    .is('entity_id', null)
    .not('source_record_id', 'is', null)
    .limit(100);

  if (!orphanedFacts || orphanedFacts.length === 0) {
    return { linked: 0 };
  }

  let linked = 0;

  for (const fact of orphanedFacts) {
    // Get record's entity_id
    const { data: record } = await supabase
      .from('records')
      .select('entity_id')
      .eq('id', fact.source_record_id)
      .single();

    if (record?.entity_id) {
      await supabase
        .from('core_facts')
        .update({ entity_id: record.entity_id })
        .eq('id', fact.id);
      linked++;
    }
  }

  console.log(`[core-extract-facts] Linked ${linked} orphaned facts to entities`);
  return { linked };
}

// ═══════════════════════════════════════════════════════════════
// EXTRACT ALL POSSIBLE FACTS FROM A RECORD
// ═══════════════════════════════════════════════════════════════
function extractFactsFromRecord(record: RecordData): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  const props = record.properties || {};
  const baseInfo = {
    source_name: record.source_id,
    source_record_id: record.id,
    entity_id: record.entity_id,
  };

  // ═══════════════════════════════════════════════════════════════
  // FINANCIAL FACTS
  // ═══════════════════════════════════════════════════════════════
  
  // Contract/Award values (USASpending, SAM.gov)
  const contractAmount = props.total_amount || props.award_amount || 
                         props.contract_value || props.obligated_amount ||
                         props.federal_action_obligation;
  if (contractAmount && Number(contractAmount) > 0) {
    facts.push({
      ...baseInfo,
      fact_type: 'contract_awarded',
      fact_value: {
        amount: Number(contractAmount),
        agency: props.awarding_agency || props.agency_name || props.awarding_agency_name,
        type: props.contract_type || props.award_type || props.assistance_type,
        description: props.award_description || props.description,
        recipient: props.recipient_name || record.name,
      },
      fact_date: String(props.award_date || props.action_date || props.start_date || new Date().toISOString()),
      confidence: 0.95,
    });
  }

  // CMS Open Payments
  const paymentAmount = props.total_payment_usd || props.payment_amount || 
                        props.total_amount_of_payment_usdollars;
  if (paymentAmount && Number(paymentAmount) > 0) {
    facts.push({
      ...baseInfo,
      fact_type: 'payment_received',
      fact_value: {
        amount: Number(paymentAmount),
        payer: props.applicable_manufacturer || props.payer_name || props.submitting_applicable_manufacturer,
        nature: props.nature_of_payment || props.payment_type || props.form_of_payment_or_transfer,
        recipient: props.physician_name || props.covered_recipient_name || record.name,
      },
      fact_date: String(props.date_of_payment || props.payment_date || new Date().toISOString()),
      confidence: 0.9,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // FACILITY/CAPACITY FACTS
  // ═══════════════════════════════════════════════════════════════
  
  const beds = props.beds || props.bed_count || props.staffed_beds;
  const capacity = props.capacity || props.max_capacity;
  if (beds || capacity) {
    facts.push({
      ...baseInfo,
      fact_type: 'facility_capacity',
      fact_value: {
        beds: beds ? Number(beds) : null,
        capacity: capacity ? Number(capacity) : null,
        type: props.facility_type || props.hospital_type || record.category,
        name: record.name,
      },
      fact_date: new Date().toISOString(),
      confidence: 0.85,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPLIANCE/VIOLATION FACTS
  // ═══════════════════════════════════════════════════════════════
  
  const violations = props.violations || props.violation_count || 
                     props.informal_enforcement_actions || props.formal_enforcement_actions;
  if (violations || props.compliance_status || props.violation_type) {
    facts.push({
      ...baseInfo,
      fact_type: 'compliance_violation',
      fact_value: {
        count: violations ? Number(violations) : null,
        type: props.violation_type || props.enforcement_type,
        status: props.compliance_status || props.current_compliance_status,
        agency: 'EPA',
        facility: record.name,
      },
      fact_date: String(props.violation_date || props.last_inspection_date || new Date().toISOString()),
      confidence: 0.9,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // RATING/SCORE FACTS
  // ═══════════════════════════════════════════════════════════════
  
  const rating = props.rating || props.overall_rating || props.star_rating || 
                 props.quality_score || props.cms_rating;
  if (rating) {
    facts.push({
      ...baseInfo,
      fact_type: 'rating_received',
      fact_value: {
        rating: rating,
        scale: props.rating_scale || '5-star',
        source: props.rating_source || record.source_id,
        entity: record.name,
      },
      fact_date: String(props.rating_date || new Date().toISOString()),
      confidence: 0.85,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // EMPLOYEE/STAFF FACTS
  // ═══════════════════════════════════════════════════════════════
  
  const employees = props.employee_count || props.staff_count || props.fte || 
                    props.total_employees;
  if (employees && Number(employees) > 0) {
    facts.push({
      ...baseInfo,
      fact_type: 'employee_count',
      fact_value: {
        count: Number(employees),
        type: props.employee_type || 'total',
        entity: record.name,
      },
      fact_date: String(props.data_date || new Date().toISOString()),
      confidence: 0.8,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // REGISTRATION/LICENSE FACTS
  // ═══════════════════════════════════════════════════════════════
  
  if (props.npi || props.license_number || props.registration_number || props.uei) {
    facts.push({
      ...baseInfo,
      fact_type: 'registration',
      fact_value: {
        npi: props.npi,
        uei: props.uei,
        license: props.license_number,
        registration: props.registration_number,
        entity: record.name,
        status: props.registration_status || 'active',
      },
      fact_date: String(props.enumeration_date || props.registration_date || new Date().toISOString()),
      confidence: 0.95,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // GRANT FACTS
  // ═══════════════════════════════════════════════════════════════
  
  const grantAmount = props.grant_amount || props.funding_amount;
  if (grantAmount && Number(grantAmount) > 0) {
    facts.push({
      ...baseInfo,
      fact_type: 'grant_awarded',
      fact_value: {
        amount: Number(grantAmount),
        agency: props.funding_agency || props.grantor_name,
        program: props.program_name,
        recipient: record.name,
      },
      fact_date: String(props.grant_date || props.award_date || new Date().toISOString()),
      confidence: 0.9,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // OWNERSHIP/AFFILIATION FACTS
  // ═══════════════════════════════════════════════════════════════
  
  if (props.parent_company || props.owner_name || props.hospital_system) {
    facts.push({
      ...baseInfo,
      fact_type: 'ownership',
      fact_value: {
        owner: props.parent_company || props.owner_name,
        system: props.hospital_system,
        entity: record.name,
      },
      fact_date: new Date().toISOString(),
      confidence: 0.85,
    });
  }

  return facts;
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { record_ids, query_id, batch_size = 50, link_orphans = true } = await req.json() as {
      record_ids?: string[];
      query_id?: string;
      batch_size?: number;
      link_orphans?: boolean;
    };

    console.log(`[core-extract-facts] Starting extraction for ${record_ids?.length || 'batch'} records`);
    const startTime = Date.now();

    // First, link any orphaned facts
    let orphansLinked = 0;
    if (link_orphans) {
      const linkResult = await linkOrphanedFacts(supabase);
      orphansLinked = linkResult.linked;
    }

    // Fetch records
    let recordsQuery = supabase
      .from('records')
      .select('id, name, category, source_id, properties, entity_id')
      .order('collected_at', { ascending: false })
      .limit(batch_size);

    if (record_ids && record_ids.length > 0) {
      recordsQuery = recordsQuery.in('id', record_ids);
    } else if (query_id) {
      recordsQuery = recordsQuery.eq('query_id', query_id);
    }

    const { data: records, error: fetchError } = await recordsQuery;

    if (fetchError) {
      throw new Error(`Failed to fetch records: ${fetchError.message}`);
    }

    if (!records || records.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          facts_created: 0, 
          orphans_linked: orphansLinked,
          message: 'No records to process' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[core-extract-facts] Processing ${records.length} records`);

    // Extract facts from all records
    const allFacts: ExtractedFact[] = [];
    for (const record of records) {
      const facts = extractFactsFromRecord(record as RecordData);
      allFacts.push(...facts);
    }

    if (allFacts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          facts_created: 0, 
          orphans_linked: orphansLinked,
          message: 'No facts extractable from records' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Batch insert facts (include those without entity_id for later linking)
    const factsWithEntity = allFacts.filter(f => f.entity_id);
    const factsWithoutEntity = allFacts.filter(f => !f.entity_id);
    let factsCreated = 0;

    if (factsWithEntity.length > 0) {
      const { error: insertError, data: inserted } = await supabase
        .from('core_facts')
        .insert(factsWithEntity)
        .select('id');

      if (insertError) {
        console.error('[core-extract-facts] Insert error:', insertError);
      } else {
        factsCreated = inserted?.length || 0;
      }
    }

    // Also insert facts without entity (they'll be linked later)
    if (factsWithoutEntity.length > 0) {
      const { data: orphanInserted } = await supabase
        .from('core_facts')
        .insert(factsWithoutEntity)
        .select('id');
      
      factsCreated += orphanInserted?.length || 0;
    }

    const processingTime = Date.now() - startTime;
    console.log(`[core-extract-facts] Created ${factsCreated} facts from ${records.length} records in ${processingTime}ms`);

    // Update metrics
    try {
      await supabase.rpc('update_intelligence_metrics');
    } catch (e) {
      // Ignore metric update errors
    }

    return new Response(
      JSON.stringify({
        success: true,
        records_processed: records.length,
        facts_created: factsCreated,
        facts_with_entity: factsWithEntity.length,
        facts_orphaned: factsWithoutEntity.length,
        orphans_linked: orphansLinked,
        fact_types: [...new Set(allFacts.map(f => f.fact_type))],
        processing_time_ms: processingTime,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[core-extract-facts] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
