// ============================================================
// 🧠 THE CORE: QUANTUM FACT EXTRACTION ENGINE v3.0
// MAXIMUM AGGRESSION - Extract 5-15 facts per record
// Target: 1000+ facts, 1.0+ density
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
  description?: string;
  geometry?: {
    type: string;
    coordinates: number[];
  };
  quality_score?: number;
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
  const { data: orphanedFacts } = await supabase
    .from('core_facts')
    .select('id, source_record_id')
    .is('entity_id', null)
    .not('source_record_id', 'is', null)
    .limit(200);

  if (!orphanedFacts || orphanedFacts.length === 0) {
    return { linked: 0 };
  }

  let linked = 0;

  for (const fact of orphanedFacts) {
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
// CALCULATE RECORD QUALITY SCORE
// ═══════════════════════════════════════════════════════════════
function calculateRecordQuality(record: RecordData): number {
  // Use stored quality_score if available
  if (record.quality_score) return record.quality_score;
  
  let score = 30;
  const props = record.properties || {};
  
  if (record.name) score += 15;
  if (props.address || props.street_address) score += 10;
  if (props.city && props.state) score += 10;
  if (record.geometry && record.geometry.coordinates && record.geometry.coordinates.length >= 2) score += 15;
  if (props.phone || props.website) score += 5;
  if (record.description) score += 5;
  if (Object.keys(props).length > 3) score += 10;
  
  return Math.min(100, score);
}

// ═══════════════════════════════════════════════════════════════
// QUANTUM FACT EXTRACTION - 5-15 facts per record
// ═══════════════════════════════════════════════════════════════
function extractFactsFromRecord(record: RecordData): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  const props = record.properties || {};
  const now = new Date().toISOString();
  
  const baseInfo = {
    source_name: record.source_id,
    source_record_id: record.id,
    entity_id: record.entity_id,
  };

  // ═══════════════════════════════════════════════════════════════
  // 1. PAYMENT FACTS (CMS Data)
  // ═══════════════════════════════════════════════════════════════
  const paymentAmount = Number(props.total_payment_usd || props.payment_amount || 
                               props.total_amount_of_payment_usdollars || 0);
  
  if (paymentAmount > 0) {
    // Main payment fact
    facts.push({
      ...baseInfo,
      fact_type: 'payment_received',
      fact_value: {
        amount: paymentAmount,
        payer: props.applicable_manufacturer || props.payer_name || props.submitting_applicable_manufacturer,
        nature: props.nature_of_payment || props.payment_type || props.form_of_payment_or_transfer,
        recipient: props.physician_name || props.covered_recipient_name || record.name,
      },
      fact_date: String(props.date_of_payment || props.payment_date || now),
      confidence: 0.95,
    });

    // Payment tier fact
    const tier = paymentAmount >= 100000 ? 'major' :
                 paymentAmount >= 10000 ? 'significant' :
                 paymentAmount >= 1000 ? 'moderate' : 'minor';
    facts.push({
      ...baseInfo,
      fact_type: 'payment_tier',
      fact_value: { tier, amount: paymentAmount },
      fact_date: String(props.date_of_payment || props.payment_date || now),
      confidence: 0.9,
    });

    // Payer relationship fact
    const payer = props.applicable_manufacturer || props.payer_name || props.submitting_applicable_manufacturer;
    if (payer) {
      facts.push({
        ...baseInfo,
        fact_type: 'pharma_relationship',
        fact_value: { 
          company: payer,
          payment_count: 1,
          total_value: paymentAmount
        },
        fact_date: now,
        confidence: 0.9,
      });
    }

    // Specialty fact
    const specialty = props.specialty || props.physician_specialty || props.provider_specialty;
    if (specialty) {
      facts.push({
        ...baseInfo,
        fact_type: 'medical_specialty',
        fact_value: { specialty },
        fact_date: now,
        confidence: 0.95,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. CONTRACT FACTS (USASpending Data)
  // ═══════════════════════════════════════════════════════════════
  const contractAmount = Number(props.total_amount || props.award_amount || 
                                props.contract_value || props.obligated_amount ||
                                props.federal_action_obligation || 0);
  
  if (contractAmount > 0) {
    // Main contract fact
    facts.push({
      ...baseInfo,
      fact_type: 'contract_awarded',
      fact_value: {
        amount: contractAmount,
        agency: props.awarding_agency || props.agency_name || props.awarding_agency_name,
        sub_agency: props.awarding_sub_agency,
        type: props.contract_type || props.award_type || props.assistance_type,
        description: props.award_description || props.description || record.description,
        recipient: props.recipient_name || record.name,
      },
      fact_date: String(props.award_date || props.action_date || props.start_date || now),
      confidence: 0.95,
    });

    // Contract size tier
    const contractTier = contractAmount >= 10000000 ? 'major' :
                         contractAmount >= 1000000 ? 'significant' :
                         contractAmount >= 100000 ? 'moderate' : 'small';
    facts.push({
      ...baseInfo,
      fact_type: 'contract_tier',
      fact_value: { tier: contractTier, amount: contractAmount },
      fact_date: String(props.start_date || props.award_date || now),
      confidence: 0.9,
    });

    // Agency relationship
    const agency = props.awarding_agency || props.agency_name || props.awarding_agency_name;
    if (agency) {
      facts.push({
        ...baseInfo,
        fact_type: 'federal_relationship',
        fact_value: { 
          agency,
          contract_count: 1,
          total_value: contractAmount
        },
        fact_date: now,
        confidence: 0.9,
      });
    }

    // Contract duration fact
    if (props.start_date && props.end_date) {
      const start = new Date(String(props.start_date));
      const end = new Date(String(props.end_date));
      const durationDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (!isNaN(durationDays) && durationDays > 0) {
        facts.push({
          ...baseInfo,
          fact_type: 'contract_duration',
          fact_value: { 
            days: durationDays,
            start: props.start_date,
            end: props.end_date
          },
          fact_date: String(props.start_date),
          confidence: 0.9,
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. LOCATION FACTS (All Sources) - Use geometry and properties
  // ═══════════════════════════════════════════════════════════════
  const coords = record.geometry?.coordinates;
  const hasCoords = coords && coords.length >= 2;
  const propLat = Number(props.latitude || props.lat);
  const propLng = Number(props.longitude || props.lng || props.lon);
  
  if (hasCoords || (propLat && propLng)) {
    facts.push({
      ...baseInfo,
      fact_type: 'location_verified',
      fact_value: {
        latitude: hasCoords ? coords[1] : propLat,
        longitude: hasCoords ? coords[0] : propLng,
        address: props.address || props.street_address,
        city: props.city,
        state: props.state,
        zip: props.zip_code || props.zip
      },
      fact_date: now,
      confidence: 0.85,
    });
  }

  // City/State presence fact
  if (props.city && props.state) {
    facts.push({
      ...baseInfo,
      fact_type: 'geographic_presence',
      fact_value: { city: props.city, state: props.state },
      fact_date: now,
      confidence: 0.9,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. FACILITY FACTS (OSM Data)
  // ═══════════════════════════════════════════════════════════════
  if (record.source_id === 'OpenStreetMap' || record.source_id?.includes('osm')) {
    // Facility type fact
    facts.push({
      ...baseInfo,
      fact_type: 'facility_type',
      fact_value: {
        category: record.category,
        subcategory: props.subcategory,
        amenity: props.amenity
      },
      fact_date: now,
      confidence: 0.85,
    });

    // Operating hours
    if (props.opening_hours) {
      facts.push({
        ...baseInfo,
        fact_type: 'operating_hours',
        fact_value: { hours: props.opening_hours },
        fact_date: now,
        confidence: 0.8,
      });
    }

    // Accessibility
    if (props.wheelchair) {
      facts.push({
        ...baseInfo,
        fact_type: 'accessibility',
        fact_value: { wheelchair: props.wheelchair },
        fact_date: now,
        confidence: 0.85,
      });
    }

    // Brand/chain
    if (props.brand) {
      facts.push({
        ...baseInfo,
        fact_type: 'brand_affiliation',
        fact_value: { brand: props.brand },
        fact_date: now,
        confidence: 0.9,
      });
    }

    // Operator
    if (props.operator) {
      facts.push({
        ...baseInfo,
        fact_type: 'operated_by',
        fact_value: { operator: props.operator },
        fact_date: now,
        confidence: 0.85,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. CONTACT FACTS (All Sources) - Use properties
  // ═══════════════════════════════════════════════════════════════
  if (props.phone || props.telephone) {
    facts.push({
      ...baseInfo,
      fact_type: 'contact_phone',
      fact_value: { phone: props.phone || props.telephone },
      fact_date: now,
      confidence: 0.9,
    });
  }

  if (props.website || props.url) {
    facts.push({
      ...baseInfo,
      fact_type: 'contact_website',
      fact_value: { website: props.website || props.url },
      fact_date: now,
      confidence: 0.9,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. IDENTIFIER FACTS
  // ═══════════════════════════════════════════════════════════════
  if (props.npi) {
    facts.push({
      ...baseInfo,
      fact_type: 'identifier_npi',
      fact_value: { npi: props.npi },
      fact_date: now,
      confidence: 0.99,
    });
  }

  if (props.recipient_duns || props.duns || props.uei) {
    facts.push({
      ...baseInfo,
      fact_type: 'identifier_duns_uei',
      fact_value: { 
        duns: props.recipient_duns || props.duns,
        uei: props.uei
      },
      fact_date: now,
      confidence: 0.99,
    });
  }

  if (props.license_number || props.registration_number) {
    facts.push({
      ...baseInfo,
      fact_type: 'registration',
      fact_value: {
        license: props.license_number,
        registration: props.registration_number,
        status: props.registration_status || 'active',
      },
      fact_date: String(props.enumeration_date || props.registration_date || now),
      confidence: 0.95,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. CAPACITY/FACILITY FACTS
  // ═══════════════════════════════════════════════════════════════
  const beds = Number(props.beds || props.bed_count || props.staffed_beds || 0);
  const capacity = Number(props.capacity || props.max_capacity || 0);
  if (beds > 0 || capacity > 0) {
    facts.push({
      ...baseInfo,
      fact_type: 'facility_capacity',
      fact_value: {
        beds: beds || null,
        capacity: capacity || null,
        type: props.facility_type || props.hospital_type || record.category,
        name: record.name,
      },
      fact_date: now,
      confidence: 0.85,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 8. COMPLIANCE/VIOLATION FACTS
  // ═══════════════════════════════════════════════════════════════
  const violations = Number(props.violations || props.violation_count || 
                            props.informal_enforcement_actions || props.formal_enforcement_actions || 0);
  if (violations > 0 || props.compliance_status || props.violation_type) {
    facts.push({
      ...baseInfo,
      fact_type: 'compliance_violation',
      fact_value: {
        count: violations || null,
        type: props.violation_type || props.enforcement_type,
        status: props.compliance_status || props.current_compliance_status,
        agency: 'EPA',
        facility: record.name,
      },
      fact_date: String(props.violation_date || props.last_inspection_date || now),
      confidence: 0.9,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 9. RATING/SCORE FACTS
  // ═══════════════════════════════════════════════════════════════
  const rating = props.rating || props.overall_rating || props.star_rating || 
                 props.quality_score || props.cms_rating;
  if (rating) {
    facts.push({
      ...baseInfo,
      fact_type: 'rating_received',
      fact_value: {
        rating,
        scale: props.rating_scale || '5-star',
        source: props.rating_source || record.source_id,
        entity: record.name,
      },
      fact_date: String(props.rating_date || now),
      confidence: 0.85,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 10. EMPLOYEE/STAFF FACTS
  // ═══════════════════════════════════════════════════════════════
  const employees = Number(props.employee_count || props.staff_count || props.fte || 
                          props.total_employees || 0);
  if (employees > 0) {
    facts.push({
      ...baseInfo,
      fact_type: 'employee_count',
      fact_value: {
        count: employees,
        type: props.employee_type || 'total',
        entity: record.name,
      },
      fact_date: String(props.data_date || now),
      confidence: 0.8,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 11. GRANT FACTS
  // ═══════════════════════════════════════════════════════════════
  const grantAmount = Number(props.grant_amount || props.funding_amount || 0);
  if (grantAmount > 0) {
    facts.push({
      ...baseInfo,
      fact_type: 'grant_awarded',
      fact_value: {
        amount: grantAmount,
        agency: props.funding_agency || props.grantor_name,
        program: props.program_name,
        recipient: record.name,
      },
      fact_date: String(props.grant_date || props.award_date || now),
      confidence: 0.9,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 12. OWNERSHIP/AFFILIATION FACTS
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
      fact_date: now,
      confidence: 0.85,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 13. CATEGORY/TYPE FACT (Always)
  // ═══════════════════════════════════════════════════════════════
  if (record.category) {
    facts.push({
      ...baseInfo,
      fact_type: 'entity_category',
      fact_value: { 
        category: record.category,
        subcategory: props.subcategory
      },
      fact_date: now,
      confidence: 0.95,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 14. DATA QUALITY FACT (Meta)
  // ═══════════════════════════════════════════════════════════════
  const qualityScore = calculateRecordQuality(record);
  facts.push({
    ...baseInfo,
    fact_type: 'data_quality_score',
    fact_value: { score: qualityScore, source: record.source_id },
    fact_date: now,
    confidence: 0.95,
  });

  // ═══════════════════════════════════════════════════════════════
  // 15. ENTITY NAME FACT (Always - for search)
  // ═══════════════════════════════════════════════════════════════
  if (record.name) {
    facts.push({
      ...baseInfo,
      fact_type: 'entity_name',
      fact_value: { 
        name: record.name,
        normalized: record.name.toLowerCase().trim()
      },
      fact_date: now,
      confidence: 0.99,
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

    const { record_ids, query_id, batch_size = 200, link_orphans = true } = await req.json() as {
      record_ids?: string[];
      query_id?: string;
      batch_size?: number;
      link_orphans?: boolean;
    };

    console.log(`[core-extract-facts] Starting QUANTUM extraction (batch: ${batch_size})`);
    const startTime = Date.now();

    // First, link any orphaned facts
    let orphansLinked = 0;
    if (link_orphans) {
      const linkResult = await linkOrphanedFacts(supabase);
      orphansLinked = linkResult.linked;
    }

    // Fetch records - prioritize those with entities but could use facts
    // Note: Only select columns that actually exist in the records table
    let recordsQuery = supabase
      .from('records')
      .select('id, name, category, source_id, properties, entity_id, description, geometry, quality_score')
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

    console.log(`[core-extract-facts] Processing ${records.length} records (QUANTUM mode)`);

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

    // Batch insert facts
    const factsWithEntity = allFacts.filter(f => f.entity_id);
    const factsWithoutEntity = allFacts.filter(f => !f.entity_id);
    let factsCreated = 0;

    // Insert facts with entities
    if (factsWithEntity.length > 0) {
      // Insert in batches of 100 to avoid payload limits
      for (let i = 0; i < factsWithEntity.length; i += 100) {
        const batch = factsWithEntity.slice(i, i + 100);
        const { data: inserted, error: insertError } = await supabase
          .from('core_facts')
          .insert(batch)
          .select('id');

        if (insertError) {
          console.error('[core-extract-facts] Insert error:', insertError);
        } else {
          factsCreated += inserted?.length || 0;
        }
      }
    }

    // Also insert facts without entity (they'll be linked later)
    if (factsWithoutEntity.length > 0) {
      for (let i = 0; i < factsWithoutEntity.length; i += 100) {
        const batch = factsWithoutEntity.slice(i, i + 100);
        const { data: orphanInserted } = await supabase
          .from('core_facts')
          .insert(batch)
          .select('id');
        
        factsCreated += orphanInserted?.length || 0;
      }
    }

    const processingTime = Date.now() - startTime;
    const avgFactsPerRecord = (factsCreated / records.length).toFixed(2);
    
    console.log(`[core-extract-facts] QUANTUM: Created ${factsCreated} facts from ${records.length} records (${avgFactsPerRecord}/record) in ${processingTime}ms`);

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
        facts_per_record: parseFloat(avgFactsPerRecord),
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
