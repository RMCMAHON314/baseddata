// BASED DATA - Opportunity Intelligence Engine
// Orchestrates: Pull → Enrich → Score → Match → Derive → Insight
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ============ PULL: Multi-source opportunity ingestion ============
async function pullGrantsGov(page = 1, rows = 25, keyword = '') {
  try {
    const res = await fetch('https://apply07.grants.gov/grantsws/rest/opportunities/search/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword,
        oppStatuses: 'forecasted|posted',
        sortBy: 'openDate|desc',
        rows,
        startRecordNum: (page - 1) * rows,
      }),
    });
    if (!res.ok) return { total: 0, error: `${res.status}` };
    const data = await res.json();
    const opps = data.oppHits || [];

    if (opps.length > 0) {
      const oppRows = opps.map((o: any) => ({
        notice_id: o.id?.toString() || o.oppNumber || `grants-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        solicitation_number: o.oppNumber || o.id?.toString(),
        title: o.title || o.oppTitle || 'Untitled',
        description: (o.synopsis || o.description || '').substring(0, 5000) || null,
        department: o.agency?.name || o.agencyName || null,
        award_floor: parseFloat(o.awardFloor || '0') || null,
        award_ceiling: parseFloat(o.awardCeiling || '0') || null,
        posted_date: o.openDate || null,
        response_deadline: o.closeDate && o.closeDate !== '' ? o.closeDate : null,
        archive_date: o.archiveDate && o.archiveDate !== '' ? o.archiveDate : null,
        is_active: true,
        ui_link: `https://www.grants.gov/search-results-detail/${o.id}`,
        notice_type: o.oppType || 'grant',
        source: 'grants_gov',
      }));

      const { error } = await supabase.from('opportunities').upsert(oppRows, { onConflict: 'notice_id', ignoreDuplicates: true });
      if (error) console.error('Grants upsert:', error.message);
      return { total: error ? 0 : oppRows.length, apiTotal: data.hitCount, hasMore: opps.length === rows };
    }
    return { total: 0, apiTotal: data.hitCount };
  } catch (e) {
    return { total: 0, error: e.message };
  }
}

async function pullSAMOpportunities(limit = 25, offset = 0) {
  const SAM_KEY = Deno.env.get('SAM_API_KEY') || Deno.env.get('DATA_GOV_KEY') || '';
  if (!SAM_KEY) return { total: 0, error: 'No SAM_API_KEY' };

  const naisCodes = '541511,541512,541519,541330,541715,541990,518210,561110,334111,334118,541611,541612,541613,541614,541618,541620,541690,561210';
  const url = `https://api.sam.gov/opportunities/v2/search?api_key=${SAM_KEY}&limit=${limit}&offset=${offset}&postedFrom=01/01/2025&postedTo=12/31/2026&ncode=${naisCodes}`;

  try {
    await delay(3000);
    const res = await fetch(url);
    if (res.status === 429) return { total: 0, error: 'Rate limited' };
    if (!res.ok) return { total: 0, error: `${res.status}` };

    const data = await res.json();
    const opps = data.opportunitiesData || [];

    if (opps.length > 0) {
      const rows = opps.map((o: any) => ({
        notice_id: o.noticeId || o.solicitationNumber || `sam-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        solicitation_number: o.solicitationNumber || null,
        title: o.title || 'Untitled',
        description: (o.description || '').substring(0, 5000) || null,
        department: o.department || null,
        sub_tier: o.subtierAgency || null,
        naics_code: o.naicsCode || null,
        set_aside: o.typeOfSetAsideDescription || null,
        classification_code: o.classificationCode || null,
        pop_state: o.placeOfPerformance?.state?.code || null,
        pop_city: o.placeOfPerformance?.city?.name || null,
        award_floor: parseFloat(o.award?.floor || '0') || null,
        award_ceiling: parseFloat(o.award?.ceiling || '0') || null,
        posted_date: o.postedDate || null,
        response_deadline: o.responseDeadLine && o.responseDeadLine !== '' ? o.responseDeadLine : null,
        is_active: o.active === 'Yes' || o.active === true,
        ui_link: o.uiLink || `https://sam.gov/opp/${o.noticeId}/view`,
        notice_type: o.type || null,
        source: 'sam_gov',
      }));

      const { error } = await supabase.from('opportunities').upsert(rows, { onConflict: 'notice_id', ignoreDuplicates: true });
      return { total: error ? 0 : rows.length, apiTotal: data.totalRecords };
    }
    return { total: 0 };
  } catch (e) {
    return { total: 0, error: e.message };
  }
}

// ============ DERIVE: Create opportunities from data patterns ============
async function deriveFromSBIR() {
  // Convert recent SBIR topics into opportunities for follow-on
  const { data: awards } = await supabase
    .from('sbir_awards')
    .select('agency, award_title, abstract, phase, firm, state, city, award_amount')
    .in('phase', ['Phase I', 'I'])
    .order('created_at', { ascending: false })
    .limit(50);

  if (!awards?.length) return { total: 0 };

  const rows = awards.map(a => ({
    notice_id: `sbir-followon-${a.agency}-${a.award_title?.substring(0, 30)}-${Math.random().toString(36).slice(2, 8)}`,
    title: `[SBIR Phase II Forecast] ${a.award_title || 'SBIR Follow-on'}`,
    description: `Phase I SBIR awarded to ${a.firm} by ${a.agency}. Phase II follow-on expected. Topic: ${a.abstract?.substring(0, 300) || a.award_title}`,
    department: a.agency,
    pop_state: a.state,
    pop_city: a.city,
    award_ceiling: (a.award_amount || 150000) * 5, // Phase II typically 5x Phase I
    is_active: true,
    notice_type: 'sbir_forecast',
    source: 'derived_sbir',
    competition_level: 'restricted',
  }));

  const { error } = await supabase.from('opportunities').upsert(rows, { onConflict: 'notice_id', ignoreDuplicates: true });
  return { total: error ? 0 : rows.length };
}

async function deriveFromGrantExpiry() {
  // Grants expiring = new funding opportunities
  const { data: grants } = await supabase
    .from('grants')
    .select('award_id, recipient_name, awarding_agency, project_title, award_amount, recipient_state, recipient_city')
    .gt('award_amount', 100000)
    .order('award_amount', { ascending: false })
    .limit(100);

  if (!grants?.length) return { total: 0 };

  const rows = grants.map(g => ({
    notice_id: `grant-renewal-${g.award_id}`,
    title: `[GRANT RENEWAL] ${g.project_title || g.recipient_name || 'Federal Grant'}`,
    description: `Federal grant (${g.award_id}) by ${g.awarding_agency} to ${g.recipient_name}. Original value: $${(g.award_amount || 0).toLocaleString()}. Renewal/recompetition expected.`,
    department: g.awarding_agency,
    pop_state: g.recipient_state,
    pop_city: g.recipient_city,
    award_ceiling: g.award_amount,
    is_active: true,
    notice_type: 'grant_renewal_forecast',
    source: 'derived_grants',
  }));

  const { error } = await supabase.from('opportunities').upsert(rows, { onConflict: 'notice_id', ignoreDuplicates: true });
  return { total: error ? 0 : rows.length };
}

async function deriveFromAgencyPatterns() {
  // Find agencies that buy repeatedly in same NAICS = predicted opportunities
  let patterns: any[] | null = null;
  try {
    const { data } = await supabase.rpc('get_agency_buying_patterns');
    patterns = data;
  } catch { /* RPC may not exist, use fallback */ }

  if (!patterns?.length) {
    // Fallback: query directly
    const { data: agencies } = await supabase
      .from('contracts')
      .select('awarding_agency, naics_code, award_amount')
      .not('naics_code', 'is', null)
      .order('award_amount', { ascending: false })
      .limit(200);

    if (!agencies?.length) return { total: 0 };

    // Group by agency+naics to find patterns
    const patternMap = new Map<string, { agency: string; naics: string; count: number; totalValue: number }>();
    for (const a of agencies) {
      const key = `${a.awarding_agency}|${a.naics_code}`;
      const existing = patternMap.get(key) || { agency: a.awarding_agency, naics: a.naics_code, count: 0, totalValue: 0 };
      existing.count++;
      existing.totalValue += a.award_amount || 0;
      patternMap.set(key, existing);
    }

    // Only create for repeat buyers (3+ contracts)
    const repeats = [...patternMap.values()].filter(p => p.count >= 3);
    if (repeats.length === 0) return { total: 0 };

    const rows = repeats.slice(0, 50).map(p => ({
      notice_id: `pattern-${p.agency?.substring(0, 20)}-${p.naics}`,
      title: `[FORECAST] ${p.agency} - NAICS ${p.naics} (${p.count} historical awards)`,
      description: `${p.agency} has awarded ${p.count} contracts in NAICS ${p.naics} totaling $${p.totalValue.toLocaleString()}. High probability of future solicitation.`,
      department: p.agency,
      naics_code: p.naics,
      award_ceiling: p.totalValue / p.count, // Average contract size
      is_active: true,
      notice_type: 'agency_pattern_forecast',
      source: 'derived_patterns',
      competition_level: 'anticipated',
      opportunity_score: Math.min(100, 30 + (p.count * 5) + (p.totalValue > 1000000 ? 20 : 0)),
    }));

    const { error } = await supabase.from('opportunities').upsert(rows, { onConflict: 'notice_id', ignoreDuplicates: true });
    return { total: error ? 0 : rows.length };
  }

  return { total: 0 };
}

// ============ CAPABILITY TAGGING ============
async function tagCapabilities() {
  // Parse opportunity descriptions to extract capability keywords
  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, title, description, naics_code')
    .is('capability_tags', null)
    .limit(200);

  if (!opps?.length) return { total: 0 };

  const CAPABILITY_MAP: Record<string, string[]> = {
    'cybersecurity': ['cyber', 'security', 'infosec', 'zero trust', 'siem', 'soc', 'vulnerability', 'penetration test', 'cmmc', 'fisma', 'nist 800'],
    'cloud': ['cloud', 'aws', 'azure', 'gcp', 'iaas', 'paas', 'saas', 'migration', 'fedramp', 'cloud native'],
    'ai_ml': ['artificial intelligence', ' ai ', 'machine learning', ' ml ', 'deep learning', 'neural', 'nlp', 'computer vision', 'predictive'],
    'data_analytics': ['data analy', 'business intelligence', 'data warehouse', 'etl', 'data lake', 'visualization', 'dashboard', 'big data', 'data science'],
    'software_dev': ['software develop', 'agile', 'devops', 'devsecops', 'scrum', 'application', 'coding', 'programming', 'full stack'],
    'it_support': ['help desk', 'it support', 'service desk', 'desktop support', 'technical support', 'end user', 'tier 1', 'tier 2'],
    'networking': ['network', 'cisco', 'switching', 'routing', 'firewall', 'wan', 'lan', 'sd-wan', 'vpn', 'telecommunications'],
    'consulting': ['consult', 'advisory', 'strategy', 'program management', 'pmo', 'transformation', 'modernization'],
    'healthcare_it': ['health it', 'ehr', 'electronic health', 'hipaa', 'medical', 'clinical', 'telehealth', 'health information'],
    'defense': ['defense', 'dod', 'military', 'weapon', 'c4isr', 'intelligence', 'surveillance', 'reconnaissance', 'tactical'],
    'construction': ['construction', 'building', 'renovation', 'hvac', 'electrical', 'plumbing', 'facility', 'maintenance'],
    'professional_services': ['professional service', 'staff augment', 'contractor', 'temporary', 'workforce', 'human capital'],
  };

  let tagged = 0;
  for (const opp of opps) {
    const text = `${opp.title || ''} ${opp.description || ''}`.toLowerCase();
    const tags: string[] = [];

    for (const [capability, keywords] of Object.entries(CAPABILITY_MAP)) {
      if (keywords.some(kw => text.includes(kw))) {
        tags.push(capability);
      }
    }

    if (tags.length > 0) {
      await supabase.from('opportunities').update({ capability_tags: tags }).eq('id', opp.id);
      tagged++;
    }
  }

  return { total: tagged };
}

// ============ FULL ORCHESTRATION ============
async function runFull() {
  const startTime = Date.now();
  const results: Record<string, any> = {};

  // 1. PULL from sources
  console.log('Step 1: Pulling from sources...');
  let grantsTotal = 0;
  for (let page = 1; page <= 6; page++) {
    const r = await pullGrantsGov(page);
    grantsTotal += r.total || 0;
    if (!r.hasMore) break;
    await delay(500);
  }
  results.grants_gov = { total: grantsTotal };

  const sam = await pullSAMOpportunities();
  results.sam_gov = sam;

  // 2. DERIVE opportunities from existing data
  console.log('Step 2: Deriving opportunities...');
  results.recompetes = await supabase.rpc('derive_recompete_opportunities').then(({ data }) => data || {}).catch(() => ({ recompetes_created: 0 }));
  results.sbir_followons = await deriveFromSBIR();
  results.grant_renewals = await deriveFromGrantExpiry();
  results.agency_patterns = await deriveFromAgencyPatterns();

  // 3. TAG capabilities
  console.log('Step 3: Tagging capabilities...');
  results.capability_tagging = await tagCapabilities();

  // 4. ENRICH & SCORE
  console.log('Step 4: Enriching & scoring...');
  const enrichResult = await supabase.rpc('enrich_opportunities');
  results.enrichment = enrichResult.data || { error: enrichResult.error?.message };

  // 5. GENERATE insights
  console.log('Step 5: Generating insights...');
  const insightResult = await supabase.rpc('generate_opportunity_insights');
  results.insights = insightResult.data || { error: insightResult.error?.message };

  const duration = Date.now() - startTime;

  // Log the full run
  await supabase.from('opportunity_intelligence_log').insert({
    run_type: 'full_cycle',
    opportunities_processed: Object.values(results).reduce((sum: number, r: any) => sum + (r?.total || r?.enriched || 0), 0),
    duration_ms: duration,
    details: results,
  });

  // Get final count
  const { count } = await supabase.from('opportunities').select('id', { count: 'exact', head: true });

  return {
    mode: 'full_cycle',
    duration_ms: duration,
    total_opportunities: count,
    results,
  };
}

// ============ MAIN ============
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'full';

    let result;
    switch (mode) {
      case 'pull_grants': result = await pullGrantsGov(body.page, body.rows, body.keyword); break;
      case 'pull_sam': result = await pullSAMOpportunities(body.limit, body.offset); break;
      case 'derive': {
        const recomp = await supabase.rpc('derive_recompete_opportunities');
        result = {
          recompetes: recomp.data || {},
          sbir: await deriveFromSBIR(),
          grants: await deriveFromGrantExpiry(),
          patterns: await deriveFromAgencyPatterns(),
        };
        break;
      }
      case 'enrich': {
        const er = await supabase.rpc('enrich_opportunities');
        result = er.data || { error: er.error?.message };
        break;
      }
      case 'tag': result = await tagCapabilities(); break;
      case 'insights': {
        const ir = await supabase.rpc('generate_opportunity_insights');
        result = ir.data || { error: ir.error?.message };
        break;
      }
      case 'full': result = await runFull(); break;
      default: result = { error: `Unknown mode: ${mode}` };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('OpportunityIntel error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
