// BASED DATA - Mega Data Vacuum v2
// Pulls from ALL free federal/public APIs with chunking for 60s timeout
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

async function safeFetch(url: string, opts?: RequestInit): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// ==================== SOURCE HANDLERS ====================

async function pullSBIR(params: any) {
  const agencies = ['DOD', 'HHS', 'NASA', 'DOE', 'NSF', 'USDA', 'EPA', 'DOC', 'ED', 'DHS', 'DOT', 'SBA'];
  const agency = params.agency || agencies[Math.floor(Math.random() * agencies.length)];
  const year = params.year || 2024;
  let total = 0;

  for (const y of [year, year - 1]) {
    try {
      await new Promise(r => setTimeout(r, 1500));
      const data = await safeFetch(`https://api.www.sbir.gov/public/api/awards?agency=${agency}&year=${y}&rows=500`);
      const awards = Array.isArray(data) ? data : [];
      if (awards.length === 0) continue;

      const rows = awards.map((a: any) => ({
        firm: a.firm || a.company || 'Unknown',
        award_title: a.awardTitle || a.award_title || a.title || 'Untitled',
        agency: a.agency || agency,
        branch: a.branch,
        program: a.program || 'SBIR',
        phase: a.phase,
        award_year: y,
        award_amount: parseFloat(a.awardAmount || a.award_amount || '0') || null,
        state: a.ri_state_code || a.state,
        city: a.ri_city || a.city,
        abstract: a.abstract?.substring(0, 5000),
        pi_name: a.piName || a.pi_name,
        uei: a.uei,
        number_employees: parseInt(a.numberOfEmployees || '0') || null,
        company_url: a.companyUrl,
        source: 'sbir_gov_api',
      }));

      const { error } = await supabase.from('sbir_awards').insert(rows).select('id');
      if (!error) total += rows.length;
    } catch (e) {
      console.error(`SBIR ${agency} ${y}:`, e.message);
    }
  }
  return { source: 'sbir', agency, total };
}

async function pullClinicalTrials(params: any) {
  const pageSize = params.pageSize || 100;
  const pageToken = params.pageToken || '';
  const query = params.query || 'AREA[LeadSponsorClass]INDUSTRY';

  try {
    let url = `https://clinicaltrials.gov/api/v2/studies?format=json&pageSize=${pageSize}&query.term=${encodeURIComponent(query)}&fields=NCTId,BriefTitle,OfficialTitle,OverallStatus,Phase,StudyType,EnrollmentCount,EnrollmentType,StartDate,CompletionDate,LeadSponsorName,LeadSponsorClass,Condition,InterventionName,InterventionType,LocationCountry,LocationState`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    const data = await safeFetch(url);
    const studies = data.studies || [];
    let total = 0;

    if (studies.length > 0) {
      const rows = studies.map((s: any) => {
        const p = s.protocolSection || {};
        const id = p.identificationModule || {};
        const status = p.statusModule || {};
        const design = p.designModule || {};
        const sponsor = p.sponsorCollaboratorsModule?.leadSponsor || {};
        const conditions = p.conditionsModule?.conditions || [];
        const interventions = (p.armsInterventionsModule?.interventions || []);
        const locations = p.contactsLocationsModule?.locations || [];

        return {
          nct_id: id.nctId,
          title: id.briefTitle || 'Untitled',
          official_title: id.officialTitle,
          overall_status: status.overallStatus,
          phase: (design.phases || []).join(', '),
          study_type: design.studyType,
          enrollment: design.enrollmentInfo?.count,
          enrollment_type: design.enrollmentInfo?.type,
          start_date: status.startDateStruct?.date,
          completion_date: status.completionDateStruct?.date,
          lead_sponsor_name: sponsor.name,
          lead_sponsor_type: sponsor.class,
          conditions: conditions.slice(0, 20),
          intervention_names: interventions.map((i: any) => i.name).slice(0, 10),
          intervention_type: interventions[0]?.type,
          location_countries: [...new Set(locations.map((l: any) => l.country).filter(Boolean))].slice(0, 10),
          location_states: [...new Set(locations.map((l: any) => l.state).filter(Boolean))].slice(0, 20),
          source: 'clinicaltrials_gov',
        };
      });

      const { error } = await supabase.from('clinical_trials').upsert(rows, { onConflict: 'nct_id', ignoreDuplicates: true });
      if (!error) total = rows.length;
    }

    return { source: 'clinical_trials', total, nextPageToken: data.nextPageToken };
  } catch (e) {
    console.error('ClinicalTrials:', e.message);
    return { source: 'clinical_trials', total: 0, error: e.message };
  }
}

async function pullFDADrugs(params: any) {
  const skip = params.skip || 0;
  const limit = params.limit || 100;
  try {
    const data = await safeFetch(`https://api.fda.gov/drug/drugsfda.json?limit=${limit}&skip=${skip}`);
    const results = data.results || [];
    let total = 0;

    if (results.length > 0) {
      const rows = results.map((d: any) => {
        const product = d.products?.[0] || {};
        const submission = d.submissions?.[0] || {};
        return {
          application_number: d.application_number,
          sponsor_name: d.sponsor_name,
          brand_name: product.brand_name,
          generic_name: product.active_ingredients?.map((i: any) => i.name).join('; '),
          dosage_form: product.dosage_form,
          route: product.route,
          market_status: product.marketing_status,
          application_type: submission.submission_type,
          approval_date: submission.submission_status_date,
          therapeutic_class: product.te_code,
          raw_data: d,
          source: 'openfda',
        };
      });

      const { error } = await supabase.from('fda_drugs').upsert(rows, { onConflict: 'application_number', ignoreDuplicates: true });
      if (!error) total = rows.length;
    }

    return { source: 'fda_drugs', total, nextSkip: skip + limit, apiTotal: data.meta?.results?.total };
  } catch (e) {
    console.error('FDA Drugs:', e.message);
    return { source: 'fda_drugs', total: 0, error: e.message };
  }
}

async function pullFDADevices(params: any) {
  const skip = params.skip || 0;
  const limit = params.limit || 100;
  try {
    const data = await safeFetch(`https://api.fda.gov/device/510k.json?limit=${limit}&skip=${skip}`);
    const results = data.results || [];
    let total = 0;

    if (results.length > 0) {
      const rows = results.map((d: any) => ({
        k_number: d.k_number,
        applicant: d.applicant,
        device_name: d.device_name,
        product_code: d.product_code,
        decision_date: d.decision_date,
        decision: d.decision_description,
        medical_specialty: d.medical_specialty_description,
        raw_data: d,
        source: 'openfda',
      }));

      const { error } = await supabase.from('fda_devices').upsert(rows, { onConflict: 'k_number', ignoreDuplicates: true });
      if (!error) total = rows.length;
    }

    return { source: 'fda_devices', total, nextSkip: skip + limit, apiTotal: data.meta?.results?.total };
  } catch (e) {
    console.error('FDA Devices:', e.message);
    return { source: 'fda_devices', total: 0, error: e.message };
  }
}

async function pullSECFilings(params: any) {
  // SEC EDGAR full-text search API
  const query = params.query || 'government contract';
  const dateRange = params.dateRange || '2023-01-01,2025-12-31';
  const from = params.from || 0;
  const size = params.size || 50;

  try {
    const data = await safeFetch('https://efts.sec.gov/LATEST/search-index', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BasedData/1.0 (research@baseddata.io)',
      },
      body: JSON.stringify({
        q: query,
        dateRange: `custom&startdt=${dateRange.split(',')[0]}&enddt=${dateRange.split(',')[1]}`,
        from,
        size,
      }),
    });

    // Fallback: use EDGAR company search
    return await pullSECCompanyFilings(params);
  } catch (e) {
    // Fallback to company filings endpoint
    return await pullSECCompanyFilings(params);
  }
}

async function pullSECCompanyFilings(params: any) {
  // Pull recent filings from EDGAR
  const ciks = params.ciks || [
    '0000051143', // IBM
    '0000789019', // Microsoft
    '0001018724', // Amazon
    '0000040545', // General Dynamics
    '0000936468', // Booz Allen
    '0001336920', // Palantir
    '0001385157', // SAIC
    '0001521332', // Leidos
    '0000885725', // Northrop Grumman
    '0000818479', // Lockheed Martin
    '0000101829', // Raytheon
    '0000034088', // General Electric
    '0000012927', // Boeing
  ];

  let total = 0;
  for (const cik of ciks.slice(0, 5)) {
    try {
      await new Promise(r => setTimeout(r, 200));
      const paddedCik = cik.padStart(10, '0');
      const data = await safeFetch(`https://data.sec.gov/submissions/CIK${paddedCik}.json`, {
        headers: { 'User-Agent': 'BasedData research@baseddata.io' },
      });

      if (!data || !data.filings) continue;

      const recent = data.filings.recent || {};
      const forms = recent.form || [];
      const dates = recent.filingDate || [];
      const accessions = recent.accessionNumber || [];
      const primaryDocs = recent.primaryDocument || [];

      const rows = forms.slice(0, 20).map((form: string, i: number) => ({
        cik: cik.replace(/^0+/, ''),
        company_name: data.name || data.entityName || 'Unknown',
        filing_type: form,
        filing_date: dates[i],
        accession_number: accessions[i],
        primary_document: primaryDocs[i],
        filing_url: `https://www.sec.gov/Archives/edgar/data/${cik.replace(/^0+/, '')}/${accessions[i]?.replace(/-/g, '')}/${primaryDocs[i]}`,
        sic_code: data.sic,
        state_of_incorporation: data.stateOfIncorporation,
        business_address_state: data.addresses?.business?.stateOrCountry,
        employees: data.formerNames?.[0] ? null : null,
        source: 'sec_edgar',
      }));

      const { error } = await supabase.from('sec_filings').upsert(rows, { onConflict: 'accession_number', ignoreDuplicates: true });
      if (!error) total += rows.length;
    } catch (e) {
      console.error(`SEC CIK ${cik}:`, e.message);
    }
  }
  return { source: 'sec_filings', total };
}

async function pullUSPTOPatents(params: any) {
  // USPTO PatentsView API
  const query = params.query || 'government';
  const page = params.page || 1;
  const perPage = params.perPage || 100;

  try {
    const data = await safeFetch('https://api.patentsview.org/patents/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: { _text_any: { patent_abstract: query } },
        f: ['patent_number', 'patent_title', 'patent_abstract', 'patent_date', 'patent_type',
          'assignee_organization', 'assignee_state', 'assignee_country',
          'inventor_first_name', 'inventor_last_name',
          'cpc_group_id', 'patent_num_cited_by_us_patents'],
        o: { page, per_page: perPage },
        s: [{ patent_date: 'desc' }],
      }),
    });

    const patents = data.patents || [];
    let total = 0;

    if (patents.length > 0) {
      const rows = patents.map((p: any) => ({
        patent_number: p.patent_number,
        title: p.patent_title || 'Untitled',
        abstract: p.patent_abstract?.substring(0, 5000),
        patent_type: p.patent_type,
        grant_date: p.patent_date,
        assignee_name: p.assignees?.[0]?.assignee_organization,
        assignee_state: p.assignees?.[0]?.assignee_state,
        assignee_country: p.assignees?.[0]?.assignee_country,
        inventors: (p.inventors || []).map((i: any) => `${i.inventor_first_name} ${i.inventor_last_name}`).slice(0, 10),
        cpc_codes: (p.cpcs || []).map((c: any) => c.cpc_group_id).slice(0, 10),
        citation_count: p.patent_num_cited_by_us_patents || 0,
        source: 'patentsview',
      }));

      const { error } = await supabase.from('uspto_patents').upsert(rows, { onConflict: 'patent_number', ignoreDuplicates: true });
      if (!error) total = rows.length;
    }

    return { source: 'uspto_patents', total, totalFound: data.total_patent_count };
  } catch (e) {
    console.error('USPTO:', e.message);
    return { source: 'uspto_patents', total: 0, error: e.message };
  }
}

async function pullFederalAudits(params: any) {
  // FAC API (api.fac.gov)
  const year = params.year || 2023;
  const offset = params.offset || 0;
  const limit = params.limit || 100;

  try {
    const data = await safeFetch(
      `https://api.fac.gov/general?audit_year=eq.${year}&limit=${limit}&offset=${offset}`,
      { headers: { 'Accept': 'application/json' } }
    );

    const audits = Array.isArray(data) ? data : [];
    let total = 0;

    if (audits.length > 0) {
      const rows = audits.map((a: any) => ({
        audit_year: year,
        dbkey: a.dbkey || a.report_id || `fac-${year}-${Math.random().toString(36).slice(2, 10)}`,
        auditee_name: a.auditee_name || 'Unknown',
        auditee_ein: a.auditee_ein,
        auditee_uei: a.auditee_uei,
        auditee_state: a.auditee_state,
        auditee_city: a.auditee_city,
        auditee_zip: a.auditee_zip,
        auditor_name: a.auditor_firm_name,
        audit_type: a.audit_type,
        total_federal_expenditures: parseFloat(a.total_amount_expended || '0') || null,
        findings_count: parseInt(a.number_months || '0') || 0,
        material_weakness: a.is_going_concern === 'Y',
        cognizant_agency: a.cognizant_agency,
        source: 'fac_gov',
      }));

      const { error } = await supabase.from('federal_audits').upsert(rows, { onConflict: 'audit_year,dbkey', ignoreDuplicates: true });
      if (!error) total = rows.length;
    }

    return { source: 'federal_audits', total };
  } catch (e) {
    console.error('FAC:', e.message);
    return { source: 'federal_audits', total: 0, error: e.message };
  }
}

async function pullUSASpendingBulk(params: any) {
  const type = params.type || 'contracts'; // contracts, grants, idvs
  const fiscalYear = params.fiscal_year || 2024;
  const page = params.page || 1;
  const limit = params.limit || 100;

  const awardTypes = type === 'grants' ? ['02', '03', '04', '05'] :
    type === 'idvs' ? ['IDV_A', 'IDV_B', 'IDV_B_A', 'IDV_B_B', 'IDV_B_C', 'IDV_C', 'IDV_D', 'IDV_E'] :
      ['A', 'B', 'C', 'D'];

  try {
    const data = await safeFetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters: {
          time_period: [{ start_date: `${fiscalYear - 1}-10-01`, end_date: `${fiscalYear}-09-30` }],
          award_type_codes: awardTypes,
        },
        fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Awarding Agency', 'Awarding Sub Agency',
          'Start Date', 'End Date', 'recipient_id', 'Description', 'NAICS Code', 'PSC Code',
          'Place of Performance State Code', 'Place of Performance City Name'],
        page,
        limit,
        sort: 'Award Amount',
        order: 'desc',
      }),
    });

    const results = data.results || [];
    let total = 0;

    if (type === 'contracts' || type === 'idvs') {
      const rows = results.map((r: any) => ({
        award_id: r['Award ID'] || `usa-${Math.random().toString(36).slice(2, 12)}`,
        recipient_name: r['Recipient Name'] || 'Unknown',
        award_amount: r['Award Amount'],
        awarding_agency: r['Awarding Agency'],
        awarding_sub_agency: r['Awarding Sub Agency'],
        start_date: r['Start Date'],
        end_date: r['End Date'],
        description: r['Description']?.substring(0, 2000),
        naics_code: r['NAICS Code'],
        psc_code: r['PSC Code'],
        pop_state: r['Place of Performance State Code'],
        pop_city: r['Place of Performance City Name'],
        contract_category: type === 'idvs' ? 'idv' : 'contract',
        source: 'usaspending',
      }));

      const { error } = await supabase.from('contracts').upsert(rows, { onConflict: 'award_id', ignoreDuplicates: true });
      if (!error) total = rows.length;
    } else {
      const rows = results.map((r: any) => ({
        award_id: r['Award ID'] || `grant-${Math.random().toString(36).slice(2, 12)}`,
        recipient_name: r['Recipient Name'] || 'Unknown',
        award_amount: r['Award Amount'],
        awarding_agency: r['Awarding Agency'],
        funding_agency: r['Awarding Sub Agency'],
        project_title: r['Description']?.substring(0, 2000),
        recipient_state: r['Place of Performance State Code'],
        recipient_city: r['Place of Performance City Name'],
        source: 'usaspending',
      }));

      const { error } = await supabase.from('grants').upsert(rows, { onConflict: 'award_id', ignoreDuplicates: true });
      if (!error) total = rows.length;
    }

    return { source: `usaspending_${type}`, total, page, hasMore: results.length === limit };
  } catch (e) {
    console.error(`USASpending ${type}:`, e.message);
    return { source: `usaspending_${type}`, total: 0, error: e.message };
  }
}

async function pullNSFAwards(params: any) {
  const keywords = params.keyword || 'artificial intelligence';
  const offset = params.offset || 1;
  const rpp = 100;

  try {
    const data = await safeFetch(
      `https://api.nsf.gov/services/v1/awards.json?keyword=${encodeURIComponent(keywords)}&offset=${offset}&rpp=${rpp}&printFields=id,title,abstractText,agency,awardee,awardeeName,awardeeCity,awardeeStateCode,piFirstName,piLastName,startDate,expDate,estimatedTotalAmt,fundsObligatedAmt,primaryProgram`
    );

    const awards = data?.response?.award || [];
    let total = 0;

    if (awards.length > 0) {
      const rows = awards.map((a: any) => ({
        award_id: a.id,
        title: a.title || 'Untitled',
        abstract: a.abstractText?.substring(0, 5000),
        pi_name: `${a.piFirstName || ''} ${a.piLastName || ''}`.trim(),
        institution: a.awardeeName,
        institution_state: a.awardeeStateCode,
        institution_city: a.awardeeCity,
        award_amount: parseFloat(a.estimatedTotalAmt || '0') || null,
        funds_obligated: parseFloat(a.fundsObligatedAmt || '0') || null,
        start_date: a.startDate,
        end_date: a.expDate,
        program: a.primaryProgram,
        source: 'nsf_api',
      }));

      const { error } = await supabase.from('nsf_awards').upsert(rows, { onConflict: 'award_id', ignoreDuplicates: true });
      if (!error) total = rows.length;
    }

    return { source: 'nsf_awards', total, hasMore: awards.length === rpp };
  } catch (e) {
    console.error('NSF:', e.message);
    return { source: 'nsf_awards', total: 0, error: e.message };
  }
}

// ==================== AUTO MODE ====================

async function autoVacuum() {
  // Check counts and fill the emptiest sources first
  const counts: Record<string, number> = {};
  const tables = ['sbir_awards', 'clinical_trials', 'fda_drugs', 'fda_devices', 'sec_filings', 'uspto_patents', 'federal_audits', 'nsf_awards'];

  for (const t of tables) {
    const { count } = await supabase.from(t).select('id', { count: 'exact', head: true });
    counts[t] = count || 0;
  }

  // Also check core tables
  for (const t of ['contracts', 'grants', 'subawards']) {
    const { count } = await supabase.from(t).select('id', { count: 'exact', head: true });
    counts[t] = count || 0;
  }

  console.log('Current counts:', JSON.stringify(counts));

  // Sort by count ascending - fill emptiest first
  const sorted = Object.entries(counts).sort((a, b) => a[1] - b[1]);
  const results: any[] = [];

  // Run up to 3 sources per auto cycle
  for (const [table] of sorted.slice(0, 3)) {
    try {
      let result;
      switch (table) {
        case 'sbir_awards':
          result = await pullSBIR({});
          break;
        case 'clinical_trials':
          result = await pullClinicalTrials({ pageSize: 100 });
          break;
        case 'fda_drugs':
          result = await pullFDADrugs({ skip: counts.fda_drugs, limit: 100 });
          break;
        case 'fda_devices':
          result = await pullFDADevices({ skip: counts.fda_devices, limit: 100 });
          break;
        case 'sec_filings':
          result = await pullSECCompanyFilings({});
          break;
        case 'uspto_patents':
          result = await pullUSPTOPatents({ query: 'defense cybersecurity', page: Math.floor(counts.uspto_patents / 100) + 1 });
          break;
        case 'federal_audits':
          result = await pullFederalAudits({ year: 2023, offset: counts.federal_audits });
          break;
        case 'nsf_awards':
          const topics = ['cybersecurity', 'quantum computing', 'machine learning', 'biotechnology', 'defense', 'climate', 'robotics', 'semiconductor'];
          const topic = topics[Math.floor(Math.random() * topics.length)];
          result = await pullNSFAwards({ keyword: topic, offset: counts.nsf_awards + 1 });
          break;
        case 'contracts':
          result = await pullUSASpendingBulk({ type: 'contracts', fiscal_year: 2024, page: Math.floor(counts.contracts / 100) + 1 });
          break;
        case 'grants':
          result = await pullUSASpendingBulk({ type: 'grants', fiscal_year: 2024, page: Math.floor(counts.grants / 100) + 1 });
          break;
        case 'subawards':
          // Skip subawards in auto mode, handled by fill-source
          continue;
      }
      if (result) results.push(result);
    } catch (e) {
      console.error(`Auto vacuum ${table}:`, e.message);
      results.push({ source: table, error: e.message });
    }
  }

  return { mode: 'auto', counts, results };
}

// ==================== MAIN HANDLER ====================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const source = body.source || 'auto';

    let result;
    switch (source) {
      case 'sbir': result = await pullSBIR(body); break;
      case 'clinical_trials': result = await pullClinicalTrials(body); break;
      case 'fda_drugs': result = await pullFDADrugs(body); break;
      case 'fda_devices': result = await pullFDADevices(body); break;
      case 'sec': result = await pullSECCompanyFilings(body); break;
      case 'uspto': result = await pullUSPTOPatents(body); break;
      case 'fac': result = await pullFederalAudits(body); break;
      case 'usaspending': result = await pullUSASpendingBulk(body); break;
      case 'nsf': result = await pullNSFAwards(body); break;
      case 'auto': result = await autoVacuum(); break;
      default: result = { error: `Unknown source: ${source}` };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Vacuum error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
