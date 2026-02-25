// BASED DATA - Opportunities Vacuum
// Pulls from SAM.gov + Grants.gov + derived recompetes
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

// ============ SAM.GOV OPPORTUNITIES ============
async function pullSAMOpportunities(params: any) {
  const SAM_KEY = Deno.env.get('SAM_API_KEY') || Deno.env.get('DATA_GOV_KEY') || '';
  if (!SAM_KEY) return { source: 'sam_gov', total: 0, error: 'No SAM_API_KEY configured' };

  const limit = params.limit || 25;
  const offset = params.offset || 0;
  const postedFrom = params.postedFrom || '01/01/2025';
  const postedTo = params.postedTo || '12/31/2026';
  
  // SAM.gov v2 opportunities endpoint
  const url = `https://api.sam.gov/opportunities/v2/search?api_key=${SAM_KEY}&limit=${limit}&offset=${offset}&postedFrom=${postedFrom}&postedTo=${postedTo}&ptype=o,p,k,r&ncode=541511,541512,541519,541330,541715,541990,518210,561110,334111,334118,541611,541612,541613,541614,541618,541620,541690,561210,238210,236220,541310,541320,541380,511210,517110,517210,517311,517312,517410,517911,517919,519130`;

  try {
    await delay(2000);
    const res = await fetch(url);
    
    if (res.status === 429) {
      // Try with smaller batch after delay
      await delay(10000);
      return { source: 'sam_gov', total: 0, error: 'Rate limited - will retry on next cycle', retryAfter: 60 };
    }
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      return { source: 'sam_gov', total: 0, error: `SAM API ${res.status}: ${errorText.substring(0, 200)}` };
    }

    const data = await res.json();
    const opps = data.opportunitiesData || data.opportunities || [];
    let total = 0;

    if (opps.length > 0) {
      const rows = opps.map((o: any) => ({
        notice_id: o.noticeId || o.solicitationNumber || `sam-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        solicitation_number: o.solicitationNumber || null,
        title: o.title || 'Untitled',
        description: (o.description || o.additionalInfoDesc || '').substring(0, 5000) || null,
        department: o.department || o.fullParentPathName?.split('.')?.[0] || null,
        sub_tier: o.subtierAgency || o.fullParentPathName || null,
        naics_code: o.naicsCode || null,
        set_aside: o.typeOfSetAsideDescription || o.typeOfSetAside || null,
        classification_code: o.classificationCode || null,
        pop_state: o.placeOfPerformance?.state?.code || null,
        pop_city: o.placeOfPerformance?.city?.name || null,
        award_floor: parseFloat(o.award?.floor || '0') || null,
        award_ceiling: parseFloat(o.award?.ceiling || '0') || null,
        posted_date: o.postedDate || null,
        response_deadline: o.responseDeadLine && o.responseDeadLine !== '' ? o.responseDeadLine : null,
        archive_date: o.archiveDate && o.archiveDate !== '' ? o.archiveDate : null,
        is_active: o.active === 'Yes' || o.active === true || !o.archiveDate || new Date(o.archiveDate) > new Date(),
        ui_link: o.uiLink || `https://sam.gov/opp/${o.noticeId}/view`,
        notice_type: o.type || o.noticeType || null,
        source: 'sam_gov',
      }));

      const { error } = await supabase.from('opportunities').upsert(rows, { onConflict: 'notice_id', ignoreDuplicates: true });
      if (error) {
        console.error('SAM upsert error:', error.message);
      } else {
        total = rows.length;
      }
    }

    return { source: 'sam_gov', total, apiTotal: data.totalRecords, hasMore: opps.length === limit };
  } catch (e) {
    console.error('SAM Opportunities:', e.message);
    return { source: 'sam_gov', total: 0, error: e.message };
  }
}

// ============ GRANTS.GOV (NO API KEY NEEDED) ============
async function pullGrantsGov(params: any) {
  const page = params.page || 1;
  const rows = params.rows || 25;
  const keyword = params.keyword || '';

  try {
    // Grants.gov search API - completely free, no key required
    const searchBody: any = {
      keyword: keyword,
      oppStatuses: 'forecasted|posted',
      sortBy: 'openDate|desc',
      rows,
      startRecordNum: ((page - 1) * rows),
    };

    const res = await fetch('https://apply07.grants.gov/grantsws/rest/opportunities/search/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchBody),
    });

    if (!res.ok) {
      return { source: 'grants_gov', total: 0, error: `Grants.gov ${res.status}` };
    }

    const data = await res.json();
    const opps = data.oppHits || [];
    let total = 0;

    if (opps.length > 0) {
      const oppRows = opps.map((o: any) => ({
        notice_id: o.id?.toString() || o.oppNumber || `grants-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        solicitation_number: o.oppNumber || o.id?.toString(),
        title: o.title || o.oppTitle || 'Untitled',
        description: (o.synopsis || o.description || '').substring(0, 5000) || null,
        department: o.agency?.name || o.agencyName || null,
        naics_code: o.cfdaList?.[0]?.cfdaNum || null,
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
      if (error) {
        console.error('Grants.gov upsert:', error.message);
      } else {
        total = oppRows.length;
      }
    }

    return { source: 'grants_gov', total, apiTotal: data.hitCount, page, hasMore: opps.length === rows };
  } catch (e) {
    console.error('Grants.gov:', e.message);
    return { source: 'grants_gov', total: 0, error: e.message };
  }
}

// ============ DERIVE RECOMPETES FROM EXPIRING CONTRACTS ============
async function deriveRecompetes() {
  // Find contracts expiring in the next 18 months = upcoming opportunities
  const cutoff18m = new Date();
  cutoff18m.setMonth(cutoff18m.getMonth() + 18);
  const today = new Date().toISOString().split('T')[0];
  const future = cutoff18m.toISOString().split('T')[0];

  const { data: expiring, error } = await supabase
    .from('contracts')
    .select('award_id, recipient_name, awarding_agency, awarding_sub_agency, description, award_amount, naics_code, psc_code, end_date, pop_state, pop_city')
    .gte('end_date', today)
    .lte('end_date', future)
    .gt('award_amount', 100000)
    .order('award_amount', { ascending: false })
    .limit(200);

  if (error || !expiring?.length) {
    return { source: 'derived_recompetes', total: 0, error: error?.message };
  }

  const rows = expiring.map(c => ({
    notice_id: `recompete-${c.award_id}`,
    title: `[RECOMPETE] ${c.description?.substring(0, 150) || c.recipient_name || 'Contract Recompete'}`,
    description: `Expiring contract (${c.award_id}) with ${c.recipient_name}. Current value: $${(c.award_amount || 0).toLocaleString()}. Agency: ${c.awarding_agency}. Expires: ${c.end_date}.`,
    department: c.awarding_agency,
    sub_agency: c.awarding_sub_agency,
    naics_code: c.naics_code,
    award_ceiling: c.award_amount,
    response_deadline: c.end_date,
    pop_state: c.pop_state,
    pop_city: c.pop_city,
    is_active: true,
    notice_type: 'recompete_forecast',
    source: 'derived',
  }));

  const { error: upsertErr } = await supabase.from('opportunities').upsert(rows, { onConflict: 'notice_id', ignoreDuplicates: true });
  return { source: 'derived_recompetes', total: upsertErr ? 0 : rows.length };
}

// ============ AUTO MODE ============
async function autoFill() {
  const results: any[] = [];

  // 1. Always try Grants.gov (free, no key needed)
  for (let page = 1; page <= 4; page++) {
    const r = await pullGrantsGov({ page, rows: 25 });
    results.push(r);
    if (!r.hasMore) break;
    await delay(1000);
  }

  // 2. Try SAM.gov
  const sam = await pullSAMOpportunities({ limit: 25, offset: 0 });
  results.push(sam);

  // 3. Derive recompetes from expiring contracts
  const recompetes = await deriveRecompetes();
  results.push(recompetes);

  const totalLoaded = results.reduce((sum, r) => sum + (r.total || 0), 0);
  return { mode: 'auto', results, totalLoaded };
}

// ============ MAIN ============
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const source = body.source || 'auto';

    let result;
    switch (source) {
      case 'sam': result = await pullSAMOpportunities(body); break;
      case 'grants_gov': result = await pullGrantsGov(body); break;
      case 'recompetes': result = await deriveRecompetes(); break;
      case 'auto': result = await autoFill(); break;
      default: result = { error: `Unknown source: ${source}` };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Opportunities vacuum error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
