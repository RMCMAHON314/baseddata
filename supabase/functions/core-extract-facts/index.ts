// ============================================================
// 🧠 THE CORE: FACT EXTRACTION ENGINE
// Extracts temporal facts from records for the knowledge graph
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

// Extract all possible facts from a record
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

  return facts;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { record_ids, query_id, batch_size = 50 } = await req.json() as {
      record_ids?: string[];
      query_id?: string;
      batch_size?: number;
    };

    console.log(`[core-extract-facts] Starting extraction for ${record_ids?.length || 'batch'} records`);
    const startTime = Date.now();

    // Fetch records
    let recordsQuery = supabase
      .from('records')
      .select('id, name, category, source_id, properties')
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
        JSON.stringify({ success: true, facts_created: 0, message: 'No records to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[core-extract-facts] Processing ${records.length} records`);

    // Try to match records to entities
    const recordsWithEntities: RecordData[] = [];
    for (const record of records) {
      // Try to find linked entity
      const { data: entity } = await supabase
        .from('core_entities')
        .select('id')
        .contains('source_records', [{ record_id: record.id }])
        .single();

      recordsWithEntities.push({
        ...record,
        entity_id: entity?.id,
      });
    }

    // Extract facts from all records
    const allFacts: ExtractedFact[] = [];
    for (const record of recordsWithEntities) {
      const facts = extractFactsFromRecord(record);
      allFacts.push(...facts);
    }

    if (allFacts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, facts_created: 0, message: 'No facts extractable from records' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Batch insert facts (skip if entity_id is null)
    const factsToInsert = allFacts.filter(f => f.entity_id);
    let factsCreated = 0;

    if (factsToInsert.length > 0) {
      const { error: insertError, data: inserted } = await supabase
        .from('core_facts')
        .insert(factsToInsert)
        .select('id');

      if (insertError) {
        console.error('[core-extract-facts] Insert error:', insertError);
      } else {
        factsCreated = inserted?.length || 0;
      }
    }

    // Also store facts without entity (for later matching)
    const orphanFacts = allFacts.filter(f => !f.entity_id).length;

    const processingTime = Date.now() - startTime;
    console.log(`[core-extract-facts] Created ${factsCreated} facts from ${records.length} records in ${processingTime}ms`);

    // Update metrics
    await supabase.rpc('update_intelligence_metrics');

    return new Response(
      JSON.stringify({
        success: true,
        records_processed: records.length,
        facts_created: factsCreated,
        facts_orphaned: orphanFacts,
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
