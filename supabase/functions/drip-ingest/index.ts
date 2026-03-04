// DRIP INGEST — Atomic single-task ingestion worker
// Called every 2 minutes by pg_cron. Claims ONE task, executes it, completes it.
// Never times out because each task is a single small API call.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // 1. Claim the next task atomically
    const { data: tasks, error: claimErr } = await supabase.rpc('claim_next_ingestion_task');
    if (claimErr) throw claimErr;
    if (!tasks || tasks.length === 0) {
      return json({ message: 'No tasks pending', idle: true });
    }

    const task = tasks[0];
    console.log(`[drip] Claimed task ${task.id}: ${task.task_type} (attempt ${task.attempt_count})`);

    // 2. Execute the task
    let records = 0;
    let error: string | null = null;
    let summary: Record<string, unknown> = {};

    try {
      const result = await executeTask(task.task_type, task.task_config, supabase);
      records = result.records;
      summary = result.summary;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      console.error(`[drip] Task ${task.id} failed:`, error);
    }

    // 3. Complete the task
    await supabase.rpc('complete_ingestion_task', {
      p_task_id: task.id,
      p_records: records,
      p_error: error,
      p_response: summary,
    });

    console.log(`[drip] Task ${task.id} ${error ? 'FAILED' : 'COMPLETE'}: ${records} records`);
    return json({ task_id: task.id, task_type: task.task_type, records, error, summary });

  } catch (e) {
    console.error('[drip] Critical error:', e);
    return json({ error: String(e) }, 500);
  }
});

// ─── Task Router ────────────────────────────────────────────────
async function executeTask(
  type: string,
  config: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>
): Promise<{ records: number; summary: Record<string, unknown> }> {
  switch (type) {
    case 'usaspending_contracts': return ingestUSASpendingContracts(config, supabase);
    case 'usaspending_grants': return ingestUSASpendingGrants(config, supabase);
    case 'usaspending_idvs': return ingestUSASpendingIDVs(config, supabase);
    case 'sam_entities': return ingestSAMEntities(config, supabase);
    case 'sam_exclusions': return ingestSAMExclusions(config, supabase);
    case 'sam_opportunities': return ingestSAMOpportunities(config, supabase);
    case 'clinical_trials': return ingestClinicalTrials(config, supabase);
    case 'sec_filings': return ingestSECFilings(config, supabase);
    case 'patents': return ingestPatents(config, supabase);
    case 'nsf_awards': return ingestNSFAwards(config, supabase);
    case 'fda_510k': return ingestFDA510k(config, supabase);
    case 'federal_audits': return ingestFederalAudits(config, supabase);
    case 'sbir_awards': return ingestSBIRAwards(config, supabase);
    case 'grants_gov': return ingestGrantsGov(config, supabase);
    case 'entity_enrichment': return enrichEntity(config, supabase);
    case 'firecrawl_scrape': return firecrawlScrape(config, supabase);
    case 'lobbying_disclosures': return ingestLobbyingDisclosures(config, supabase);
    case 'gsa_contracts': return ingestGSAContracts(config, supabase);
    case 'analytics_daily': return computeAnalyticsDaily(config, supabase);
    case 'web_enrich_batch': return webEnrichBatch(config, supabase);
    case 'ai_search_opportunities': return aiSearchIntel('opportunities', config, supabase);
    case 'ai_search_grants': return aiSearchIntel('grants', config, supabase);
    case 'ai_search_news': return aiSearchNews(config, supabase);
    default: throw new Error(`Unknown task type: ${type}`);
  }
}

// ─── Helper ─────────────────────────────────────────────────────
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 25000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...opts, signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

// ─── USASpending Contracts ──────────────────────────────────────
async function ingestUSASpendingContracts(config: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const page = (config.page as number) || 1;
  const limit = (config.limit as number) || 25;
  const agency = (config.agency as string) || '';
  const state = (config.state as string) || '';

  const filters: Record<string, unknown>[] = [
    { field: 'award_type_codes', operation: 'in', value: ['A', 'B', 'C', 'D'] },
  ];
  if (agency) filters.push({ field: 'awarding_agency_name', operation: 'equals', value: agency });
  if (state) filters.push({ field: 'place_of_performance_scope', operation: 'equals', value: state });

  const resp = await fetchWithTimeout('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: { award_type_codes: ['A', 'B', 'C', 'D'], time_period: [{ start_date: '2023-01-01', end_date: '2026-03-04' }] },
      fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency', 'Award Date', 'Description', 'NAICS Code', 'Place of Performance State Code', 'recipient_id'],
      page, limit, sort: 'Award Amount', order: 'desc',
    }),
  });

  const data = await resp.json();
  const results = data.results || [];
  let inserted = 0;

  for (const r of results) {
    const { error } = await supabase.from('contracts').upsert({
      award_id: r['Award ID'] || r['internal_id'],
      recipient_name: r['Recipient Name'] || 'Unknown',
      award_amount: r['Award Amount'],
      awarding_agency: r['Awarding Agency'],
      award_date: r['Award Date'],
      description: r['Description'],
      naics_code: r['NAICS Code']?.toString(),
      pop_state: r['Place of Performance State Code'],
      source: 'usaspending_drip',
    }, { onConflict: 'award_id', ignoreDuplicates: true });
    if (!error) inserted++;
  }

  return { records: inserted, summary: { page, total_results: results.length, has_next: data.page_metadata?.hasNext } };
}

// ─── USASpending Grants ─────────────────────────────────────────
async function ingestUSASpendingGrants(config: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const page = (config.page as number) || 1;
  const limit = (config.limit as number) || 25;

  const resp = await fetchWithTimeout('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: { award_type_codes: ['02', '03', '04', '05'], time_period: [{ start_date: '2023-01-01', end_date: '2026-03-04' }] },
      fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency', 'Award Date', 'Description', 'CFDA Number', 'Place of Performance State Code'],
      page, limit, sort: 'Award Amount', order: 'desc',
    }),
  });

  const data = await resp.json();
  const results = data.results || [];
  let inserted = 0;

  for (const r of results) {
    const { error } = await supabase.from('grants').upsert({
      award_id: r['Award ID'],
      recipient_name: r['Recipient Name'] || 'Unknown',
      award_amount: r['Award Amount'],
      awarding_agency: r['Awarding Agency'],
      award_date: r['Award Date'],
      description: r['Description'],
      cfda_number: r['CFDA Number'],
      pop_state: r['Place of Performance State Code'],
      source: 'usaspending_drip',
    }, { onConflict: 'award_id', ignoreDuplicates: true });
    if (!error) inserted++;
  }

  return { records: inserted, summary: { page, total_results: results.length } };
}

// ─── USASpending IDVs ───────────────────────────────────────────
async function ingestUSASpendingIDVs(config: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const page = (config.page as number) || 1;
  const resp = await fetchWithTimeout('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filters: { award_type_codes: ['IDV_A', 'IDV_B', 'IDV_B_A', 'IDV_B_B', 'IDV_B_C', 'IDV_C', 'IDV_D', 'IDV_E'],
        time_period: [{ start_date: '2023-01-01', end_date: '2026-03-04' }] },
      fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency', 'Description'],
      page, limit: 25, sort: 'Award Amount', order: 'desc',
    }),
  });
  const data = await resp.json();
  const results = data.results || [];
  let inserted = 0;
  for (const r of results) {
    const { error } = await supabase.from('contracts').upsert({
      award_id: r['Award ID'], recipient_name: r['Recipient Name'] || 'Unknown',
      award_amount: r['Award Amount'], awarding_agency: r['Awarding Agency'],
      description: r['Description'], contract_type: 'IDV', source: 'usaspending_idv_drip',
    }, { onConflict: 'award_id', ignoreDuplicates: true });
    if (!error) inserted++;
  }
  return { records: inserted, summary: { page, results: results.length } };
}

// ─── SAM Entities ───────────────────────────────────────────────
async function ingestSAMEntities(config: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const samKey = Deno.env.get('SAM_API_KEY');
  if (!samKey) throw new Error('SAM_API_KEY not configured');
  const page = (config.page as number) || 0;
  const state = (config.state as string) || 'MD';

  const url = `https://api.sam.gov/entity-information/v3/entities?api_key=${samKey}&samRegistered=Yes&registrationStatus=Active&physicalAddressStateCode=${state}&page=${page}&size=25`;
  const resp = await fetchWithTimeout(url);
  if (!resp.ok) throw new Error(`SAM API ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const entities = data.entityData || [];
  let inserted = 0;

  for (const e of entities) {
    const core = e.entityRegistration || {};
    const addr = e.coreData?.physicalAddress || {};
    const { error } = await supabase.from('sam_entities').upsert({
      uei: core.ueiSAM, legal_business_name: core.legalBusinessName,
      dba_name: core.dbaName, cage_code: core.cageCode,
      entity_type: core.businessType, registration_status: core.registrationStatus,
      physical_address: addr, raw_data: e, source: 'sam_drip',
    }, { onConflict: 'uei', ignoreDuplicates: true });
    if (!error) inserted++;
  }

  return { records: inserted, summary: { page, state, total: entities.length } };
}

// ─── SAM Exclusions ─────────────────────────────────────────────
async function ingestSAMExclusions(config: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const samKey = Deno.env.get('SAM_API_KEY');
  if (!samKey) throw new Error('SAM_API_KEY not configured');
  const offset = (config.offset as number) || 0;

  const url = `https://api.sam.gov/entity-information/v2/exclusions?api_key=${samKey}&limit=25&offset=${offset}`;
  const resp = await fetchWithTimeout(url);
  if (!resp.ok) throw new Error(`SAM Exclusions ${resp.status}`);
  const data = await resp.json();
  const results = data.results || [];
  let inserted = 0;

  for (const r of results) {
    const { error } = await supabase.from('sam_exclusions').upsert({
      entity_name: r.name || r.firm, exclusion_type: r.exclusionType,
      agency: r.excludingAgency, activation_date: r.activateDate,
      termination_date: r.terminateDate, sam_number: r.samNumber,
      raw_data: r, source: 'sam_drip',
    }, { onConflict: 'sam_number', ignoreDuplicates: true });
    if (!error) inserted++;
  }

  return { records: inserted, summary: { offset, total: results.length } };
}

// ─── SAM Opportunities ─────────────────────────────────────────
async function ingestSAMOpportunities(config: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const samKey = Deno.env.get('SAM_API_KEY');
  if (!samKey) throw new Error('SAM_API_KEY not configured');
  const offset = (config.offset as number) || 0;
  const limit = 25;

  const postedFrom = new Date(); postedFrom.setDate(postedFrom.getDate() - 30);
  const url = `https://api.sam.gov/opportunities/v2/search?api_key=${samKey}&limit=${limit}&offset=${offset}&postedFrom=${postedFrom.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}&ptype=o,k,p`;
  const resp = await fetchWithTimeout(url);
  if (!resp.ok) throw new Error(`SAM Opps ${resp.status}`);
  const data = await resp.json();
  const opps = data.opportunitiesData || [];
  let inserted = 0;

  for (const o of opps) {
    const { error } = await supabase.from('opportunities').upsert({
      notice_id: o.noticeId, title: o.title, solicitation_number: o.solicitationNumber,
      department: o.department, sub_tier: o.subTier, office: o.office,
      posted_date: o.postedDate, response_deadline: o.responseDeadLine,
      naics_code: o.naicsCode, set_aside_code: o.typeOfSetAside,
      description: o.description?.substring(0, 5000),
      classification_code: o.classificationCode, active: true,
      source: 'sam_drip', raw_data: o,
    }, { onConflict: 'notice_id', ignoreDuplicates: true });
    if (!error) inserted++;
  }

  return { records: inserted, summary: { offset, total: opps.length } };
}

// ─── Clinical Trials ────────────────────────────────────────────
async function ingestClinicalTrials(config: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const pageToken = (config.page_token as string) || '';
  const query = (config.query as string) || 'artificial intelligence OR cybersecurity OR health IT';

  let url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(query)}&pageSize=20`;
  if (pageToken) url += `&pageToken=${pageToken}`;

  const resp = await fetchWithTimeout(url);
  if (!resp.ok) throw new Error(`ClinicalTrials ${resp.status}`);
  const data = await resp.json();
  const studies = data.studies || [];
  let inserted = 0;

  for (const s of studies) {
    const proto = s.protocolSection || {};
    const id = proto.identificationModule || {};
    const status = proto.statusModule || {};
    const sponsor = proto.sponsorCollaboratorsModule?.leadSponsor || {};
    const design = proto.designModule || {};
    const conditions = proto.conditionsModule?.conditions || [];

    const { error } = await supabase.from('clinical_trials').upsert({
      nct_id: id.nctId, title: id.briefTitle || id.officialTitle || 'Unknown',
      official_title: id.officialTitle, overall_status: status.overallStatus,
      phase: design.phases?.join(', '), lead_sponsor_name: sponsor.name,
      lead_sponsor_type: sponsor.class, conditions,
      start_date: status.startDateStruct?.date,
      completion_date: status.completionDateStruct?.date,
      study_type: design.studyType, enrollment: design.enrollmentInfo?.count,
      source: 'clinicaltrials_drip', raw_data: s,
    }, { onConflict: 'nct_id', ignoreDuplicates: true });
    if (!error) inserted++;
  }

  return { records: inserted, summary: { next_token: data.nextPageToken, total: studies.length } };
}

// ─── SEC Filings ────────────────────────────────────────────────
async function ingestSECFilings(config: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const query = (config.query as string) || 'cybersecurity';
  const from = (config.from as number) || 0;

  const url = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(query)}&dateRange=custom&startdt=2024-01-01&enddt=2026-03-04&forms=10-K,10-Q,8-K&from=${from}&size=20`;
  const resp = await fetchWithTimeout(url, {
    headers: { 'User-Agent': 'BasedData/1.0 contact@baseddata.com', Accept: 'application/json' },
  });
  if (!resp.ok) throw new Error(`SEC EDGAR ${resp.status}`);
  const data = await resp.json();
  const hits = data.hits?.hits || [];
  let inserted = 0;

  for (const h of hits) {
    const s = h._source || {};
    const { error } = await supabase.from('sec_filings').upsert({
      accession_number: s.file_num || s.accession_no,
      company_name: s.display_names?.[0] || s.entity_name || 'Unknown',
      form_type: s.form_type, filed_date: s.file_date,
      description: s.display_names?.join(', '),
      source_url: `https://www.sec.gov/Archives/edgar/data/${s.entity_id}/${s.accession_no}`,
      raw_data: s, source: 'sec_drip',
    }, { onConflict: 'accession_number', ignoreDuplicates: true });
    if (!error) inserted++;
  }

  return { records: inserted, summary: { from, total: hits.length, query } };
}

// ─── Patents ────────────────────────────────────────────────────
async function ingestPatents(config: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const page = (config.page as number) || 1;
  const query = (config.query as string) || 'artificial intelligence';

  const resp = await fetchWithTimeout('https://api.patentsview.org/patents/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: { _text_any: { patent_title: query } },
      f: ['patent_number', 'patent_title', 'patent_date', 'patent_type', 'patent_num_cited_by_us_patents'],
      o: { page, per_page: 25 },
      s: [{ patent_date: 'desc' }],
    }),
  });
  if (!resp.ok) throw new Error(`PatentsView ${resp.status}`);
  const data = await resp.json();
  const patents = data.patents || [];
  let inserted = 0;

  for (const p of patents) {
    const { error } = await supabase.from('uspto_patents').upsert({
      patent_number: p.patent_number, patent_title: p.patent_title,
      patent_date: p.patent_date, patent_type: p.patent_type,
      raw_data: p, source: 'patentsview_drip',
    }, { onConflict: 'patent_number', ignoreDuplicates: true });
    if (!error) inserted++;
  }

  return { records: inserted, summary: { page, total: patents.length, query } };
}

// ─── NSF Awards ─────────────────────────────────────────────────
async function ingestNSFAwards(config: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const offset = (config.offset as number) || 1;
  const keyword = (config.keyword as string) || 'artificial intelligence';

  const url = `https://api.nsf.gov/services/v1/awards.json?keyword=${encodeURIComponent(keyword)}&offset=${offset}&rpp=25&printFields=id,title,agency,fundsObligatedAmt,startDate,expDate,piFirstName,piLastName,awardeeCity,awardeeStateCode,awardeeName,abstractText`;
  const resp = await fetchWithTimeout(url);
  if (!resp.ok) throw new Error(`NSF API ${resp.status}`);
  const data = await resp.json();
  const awards = data.response?.award || [];
  let inserted = 0;

  for (const a of awards) {
    const { error } = await supabase.from('nsf_awards').upsert({
      award_id: a.id, title: a.title, agency: a.agency,
      award_amount: parseFloat(a.fundsObligatedAmt) || 0,
      start_date: a.startDate, end_date: a.expDate,
      pi_name: `${a.piFirstName || ''} ${a.piLastName || ''}`.trim(),
      awardee_name: a.awardeeName, awardee_state: a.awardeeStateCode,
      abstract_text: a.abstractText?.substring(0, 5000),
      raw_data: a, source: 'nsf_drip',
    }, { onConflict: 'award_id', ignoreDuplicates: true });
    if (!error) inserted++;
  }

  return { records: inserted, summary: { offset, total: awards.length, keyword } };
}

// ─── FDA 510(k) ─────────────────────────────────────────────────
async function ingestFDA510k(config: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const skip = (config.skip as number) || 0;
  const url = `https://api.fda.gov/device/510k.json?limit=25&skip=${skip}&sort=decision_date:desc`;
  const resp = await fetchWithTimeout(url);
  if (!resp.ok) throw new Error(`FDA API ${resp.status}`);
  const data = await resp.json();
  const results = data.results || [];
  let inserted = 0;

  for (const r of results) {
    const { error } = await supabase.from('fda_510k').upsert({
      k_number: r.k_number, applicant: r.applicant,
      device_name: r.device_name, decision_date: r.decision_date,
      decision_description: r.decision_description,
      product_code: r.product_code, review_panel: r.review_panel,
      raw_data: r, source: 'fda_drip',
    }, { onConflict: 'k_number', ignoreDuplicates: true });
    if (!error) inserted++;
  }

  return { records: inserted, summary: { skip, total: results.length } };
}

// ─── Federal Audits ─────────────────────────────────────────────
async function ingestFederalAudits(config: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const dataGovKey = Deno.env.get('DATA_GOV_KEY') || '';
  const offset = (config.offset as number) || 0;
  const year = (config.year as number) || 2024;

  const url = `https://api.fac.gov/general?audit_year=eq.${year}&limit=25&offset=${offset}`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (dataGovKey) headers['X-Api-Key'] = dataGovKey;

  const resp = await fetchWithTimeout(url, { headers });
  if (!resp.ok) throw new Error(`FAC API ${resp.status}`);
  const results = await resp.json();
  let inserted = 0;

  for (const r of results) {
    const { error } = await supabase.from('federal_audit_findings').upsert({
      report_id: r.report_id, auditee_name: r.auditee_name,
      auditee_state: r.auditee_state, audit_year: r.audit_year,
      total_federal_expenditure: parseFloat(r.total_amount_expended) || null,
      cognizant_agency: r.cognizant_agency,
      raw_data: r, source: 'fac_drip',
    }, { onConflict: 'report_id', ignoreDuplicates: true });
    if (!error) inserted++;
  }

  return { records: inserted, summary: { offset, year, total: results.length } };
}

// ─── SBIR Awards ────────────────────────────────────────────────
async function ingestSBIRAwards(config: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const keyword = (config.keyword as string) || 'cybersecurity';
  const start = (config.start as number) || 0;

  const url = `https://api.www.sbir.gov/public/api/awards?keyword=${encodeURIComponent(keyword)}&start=${start}&rows=10`;
  const resp = await fetchWithTimeout(url, {}, 30000);
  if (!resp.ok) throw new Error(`SBIR API ${resp.status}`);
  const data = await resp.json();
  const results = Array.isArray(data) ? data : (data.results || []);
  let inserted = 0;

  for (const r of results) {
    const { error } = await supabase.from('sbir_awards').upsert({
      award_id: r.award_id || r.id || `sbir_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      firm: r.firm || r.company, award_title: r.award_title || r.title,
      agency: r.agency, award_amount: parseFloat(r.award_amount) || null,
      award_year: parseInt(r.award_year) || null, phase: r.phase,
      hubzone_owned: r.hubzone_owned, woman_owned: r.woman_owned,
      raw_data: r, source: 'sbir_drip',
    }, { onConflict: 'award_id', ignoreDuplicates: true });
    if (!error) inserted++;
  }

  return { records: inserted, summary: { keyword, start, total: results.length } };
}

// ─── Grants.gov ─────────────────────────────────────────────────
async function ingestGrantsGov(config: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const keyword = (config.keyword as string) || 'technology';
  const startRecord = (config.start_record as number) || 0;

  const resp = await fetchWithTimeout('https://www.grants.gov/grantsws/rest/opportunities/search/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, oppStatuses: 'forecasted|posted', startRecordNum: startRecord, rows: 25 }),
  });
  if (!resp.ok) throw new Error(`Grants.gov ${resp.status}`);
  const data = await resp.json();
  const opps = data.oppHits || [];
  let inserted = 0;

  for (const o of opps) {
    const { error } = await supabase.from('opportunities').upsert({
      notice_id: o.id?.toString() || o.opportunityNumber,
      title: o.title || o.opportunityTitle || 'Unknown',
      department: o.agency?.name, posted_date: o.openDate,
      response_deadline: o.closeDate, description: o.synopsis?.substring(0, 5000),
      source: 'grants_gov_drip', raw_data: o,
    }, { onConflict: 'notice_id', ignoreDuplicates: true });
    if (!error) inserted++;
  }

  return { records: inserted, summary: { keyword, start_record: startRecord, total: opps.length } };
}

// ─── Entity Enrichment ──────────────────────────────────────────
async function enrichEntity(config: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const entityId = config.entity_id as string;
  if (!entityId) throw new Error('No entity_id in config');

  // Get entity name
  const { data: entity } = await supabase.from('core_entities').select('canonical_name, uei').eq('id', entityId).single();
  if (!entity) throw new Error(`Entity ${entityId} not found`);

  // Enrich from USASpending recipient profile
  let records = 0;
  try {
    const searchResp = await fetchWithTimeout('https://api.usaspending.gov/api/v2/autocomplete/recipient/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ search_text: entity.canonical_name, limit: 1 }),
    });
    const searchData = await searchResp.json();
    const recipient = searchData.results?.[0];
    if (recipient) {
      await supabase.from('core_entities').update({
        duns: recipient.recipient_id || null,
        updated_at: new Date().toISOString(),
      }).eq('id', entityId);
      records++;
    }
  } catch { /* non-critical */ }

  return { records, summary: { entity: entity.canonical_name } };
}

// ─── Firecrawl Web Scrape ───────────────────────────────────────
async function firecrawlScrape(config: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!firecrawlKey) throw new Error('FIRECRAWL_API_KEY not configured');
  const url = config.url as string;
  if (!url) throw new Error('No URL in config');
  const targetTable = (config.target_table as string) || 'core_facts';

  const resp = await fetchWithTimeout('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
  });
  if (!resp.ok) throw new Error(`Firecrawl ${resp.status}`);
  const data = await resp.json();

  // Store scraped content as a fact
  const { error } = await supabase.from('core_facts').insert({
    fact_type: 'web_scrape',
    fact_value: { url, title: data.data?.metadata?.title, content: data.data?.markdown?.substring(0, 10000) },
    source_name: 'firecrawl_drip',
    confidence: 0.7,
    entity_id: (config.entity_id as string) || null,
  });

  return { records: error ? 0 : 1, summary: { url, title: data.data?.metadata?.title } };
}

// ─── Lobbying Disclosures (House/Senate LDA filings) ────────────
async function ingestLobbyingDisclosures(config: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const year = (config.year as number) || new Date().getFullYear();
  const page = (config.page as number) || 1;
  // Use the Senate Lobbying Disclosure Act API
  const url = `https://lda.senate.gov/api/v1/filings/?filing_year=${year}&page=${page}&page_size=25`;
  const resp = await fetchWithTimeout(url, {
    headers: { 'Accept': 'application/json' },
  });
  if (!resp.ok) throw new Error(`Lobbying API ${resp.status}`);
  const data = await resp.json();
  const results = data.results || [];
  let upserted = 0;

  for (const filing of results) {
    const { error } = await supabase.from('lobbying_disclosures').upsert({
      filing_id: filing.filing_uuid || filing.id,
      registrant_name: filing.registrant?.name || 'Unknown',
      client_name: filing.client?.name || null,
      amount: filing.income != null ? parseFloat(filing.income) : null,
      filing_year: year,
      filing_type: filing.filing_type || null,
      issues: filing.lobbying_activities?.map((a: any) => a.general_issue_code_display) || [],
      raw_data: filing,
      source: 'senate_lda',
    }, { onConflict: 'filing_id', ignoreDuplicates: true });
    if (!error) upserted++;
  }

  return { records: upserted, summary: { year, page, total: data.count } };
}

// ─── GSA Contracts (Advantage/CALC) ─────────────────────────────
async function ingestGSAContracts(config: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const page = (config.page as number) || 0;
  const url = `https://api.sam.gov/opportunities/v2/search?limit=25&offset=${page * 25}&postedFrom=01/01/2024&api_key=${Deno.env.get('SAM_API_KEY') || ''}`;
  // GSA Advantage API or fallback to SAM contract awards
  const resp = await fetchWithTimeout(url);
  if (!resp.ok) throw new Error(`GSA API ${resp.status}`);
  const data = await resp.json();
  const records = data.opportunitiesData || [];
  let upserted = 0;

  for (const rec of records) {
    const { error } = await supabase.from('gsa_contracts').upsert({
      contract_number: rec.solicitationNumber || rec.noticeId,
      vendor_name: rec.organizationName || 'Unknown',
      description: rec.title || rec.description,
      contract_start_date: rec.postedDate,
      contract_end_date: rec.responseDeadLine,
      schedule_number: rec.naicsCode,
      raw_data: rec,
      source: 'sam_gsa',
    }, { onConflict: 'contract_number', ignoreDuplicates: true });
    if (!error) upserted++;
  }

  return { records: upserted, summary: { page, found: records.length } };
}

// ─── Analytics Daily (aggregate snapshot) ───────────────────────
async function computeAnalyticsDaily(_config: Record<string, unknown>, supabase: ReturnType<typeof createClient>) {
  const today = new Date().toISOString().split('T')[0];

  // Run aggregate queries
  const [entities, contracts, grants, contractValue, grantValue] = await Promise.all([
    supabase.from('core_entities').select('id', { count: 'exact', head: true }),
    supabase.from('contracts').select('id', { count: 'exact', head: true }),
    supabase.from('grants').select('id', { count: 'exact', head: true }),
    supabase.from('contracts').select('total_obligation').not('total_obligation', 'is', null).limit(1000),
    supabase.from('grants').select('award_amount').not('award_amount', 'is', null).limit(1000),
  ]);

  const totalContractValue = (contractValue.data || []).reduce((s: number, r: any) => s + (r.total_obligation || 0), 0);
  const totalGrantValue = (grantValue.data || []).reduce((s: number, r: any) => s + (r.award_amount || 0), 0);

  // Get agency breakdown
  const { data: agencyData } = await supabase
    .from('contracts')
    .select('awarding_agency')
    .not('awarding_agency', 'is', null)
    .limit(1000);

  const agencyCounts: Record<string, number> = {};
  (agencyData || []).forEach((r: any) => {
    const a = r.awarding_agency || 'Unknown';
    agencyCounts[a] = (agencyCounts[a] || 0) + 1;
  });

  // Get state breakdown
  const { data: stateData } = await supabase
    .from('core_entities')
    .select('state')
    .not('state', 'is', null)
    .limit(1000);

  const stateCounts: Record<string, number> = {};
  (stateData || []).forEach((r: any) => {
    const s = r.state || 'Unknown';
    stateCounts[s] = (stateCounts[s] || 0) + 1;
  });

  const { error } = await supabase.from('analytics_daily').upsert({
    date: today,
    total_entities: entities.count || 0,
    total_contracts: contracts.count || 0,
    total_grants: grants.count || 0,
    total_contract_value: totalContractValue,
    total_grant_value: totalGrantValue,
    contracts_by_agency: agencyCounts,
    entities_by_state: stateCounts,
  }, { onConflict: 'date' });

  return { records: error ? 0 : 1, summary: { date: today, entities: entities.count, contracts: contracts.count } };
}
