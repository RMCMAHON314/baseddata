import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function parseAtomXml(text: string): any[] {
  const entries: any[] = []
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi
  let match
  
  while ((match = entryRegex.exec(text)) !== null) {
    const entry = match[1]
    const getTag = (tag: string) => {
      const r = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i')
      const m = entry.match(r)
      return m ? m[1].trim() : null
    }
    const getAttr = (tag: string, attr: string) => {
      const r = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i')
      const m = entry.match(r)
      return m ? m[1] : null
    }
    
    entries.push({
      title: getTag('title'),
      id: getTag('id'),
      content: getTag('content'),
      updated: getTag('updated'),
      // FPDS-specific fields from content
      piid: getTag('ns1:PIID') || getTag('PIID'),
      vendor_name: getTag('ns1:vendorName') || getTag('vendorName'),
      agency: getTag('ns1:contractingOfficeName') || getTag('contractingOfficeName') || getTag('ns1:agencyID') || getTag('agencyID'),
      signed_date: getTag('ns1:signedDate') || getTag('signedDate'),
      amount: getTag('ns1:obligatedAmount') || getTag('obligatedAmount') || getTag('ns1:dollarsobligated') || getTag('dollarsobligated'),
      description: getTag('ns1:descriptionOfContractRequirement') || getTag('descriptionOfContractRequirement'),
      naics: getTag('ns1:principalNAICSCode') || getTag('principalNAICSCode'),
      psc: getTag('ns1:productOrServiceCode') || getTag('productOrServiceCode'),
      pop_state: getTag('ns1:principalPlaceOfPerformanceStateCode') || getTag('principalPlaceOfPerformanceStateCode'),
      vendor_state: getTag('ns1:vendorLocationStateCode') || getTag('vendorLocationStateCode'),
      modification: getTag('ns1:modNumber') || getTag('modNumber') || '0',
    })
  }
  return entries
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  const body = await req.json().catch(() => ({}))
  const mode = body.mode || 'atom' // 'atom' or 'sam'
  
  try {
    let totalLoaded = 0
    
    if (mode === 'atom') {
      // Pull from FPDS Atom feed
      const queries = [
        'CONTRACTING_AGENCY_NAME:"DEPT OF DEFENSE"',
        'CONTRACTING_AGENCY_NAME:"DEPT OF HOMELAND SECURITY"',
        'CONTRACTING_AGENCY_NAME:"DEPT OF HEALTH AND HUMAN SERVICES"',
        'CONTRACTING_AGENCY_NAME:"DEPT OF ENERGY"',
        'CONTRACTING_AGENCY_NAME:"NATIONAL AERONAUTICS AND SPACE ADMINISTRATION"',
      ]
      
      const targetQuery = body.query || queries[body.queryIndex || 0]
      const num = body.num || 100
      
      const url = `https://www.fpds.gov/ezsearch/LATEST?q=${encodeURIComponent(targetQuery)}&s=SIGNED_DATE&desc=Y&num=${num}`
      console.log(`[load-fpds] Fetching Atom feed: ${targetQuery}`)
      
      const res = await fetch(url, { 
        headers: { 'Accept': 'application/atom+xml, application/xml, text/xml' }
      })
      
      if (!res.ok) {
        // Fallback to SAM contract-awards API
        console.log(`[load-fpds] Atom feed returned ${res.status}, falling back to SAM API`)
        return await loadFromSAM(supabase, body)
      }
      
      const text = await res.text()
      const entries = parseAtomXml(text)
      console.log(`[load-fpds] Parsed ${entries.length} entries from Atom feed`)
      
      for (const e of entries) {
        const piid = e.piid || e.id || `fpds-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
        
        const { error } = await supabase.from('fpds_awards').upsert({
          piid: piid,
          modification_number: e.modification || '0',
          contracting_department: e.agency,
          vendor_name: e.vendor_name || e.title?.split(' - ')?.[0] || 'Unknown',
          dollars_obligated: parseFloat(e.amount) || 0,
          naics_code: e.naics,
          psc_code: e.psc,
          effective_date: e.signed_date,
          description_of_requirement: e.description || e.content || e.title,
          pop_state: e.pop_state,
          vendor_state: e.vendor_state,
          last_modified: e.updated,
          raw_data: e,
        }, { onConflict: 'piid,modification_number', ignoreDuplicates: false })
        
        if (!error) totalLoaded++
      }
    } else {
      return await loadFromSAM(supabase, body)
    }
    
    // Entity resolution
    if (totalLoaded > 0) {
      console.log(`[load-fpds] Running entity resolution for ${totalLoaded} awards`)
      try {
        await supabase.functions.invoke('entity-resolver', { body: { source: 'fpds_awards', limit: 100 } })
      } catch (e) {
        console.log('[load-fpds] Entity resolution skipped:', e.message)
      }
    }
    
    return new Response(JSON.stringify({
      success: true, loaded: totalLoaded, mode
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function loadFromSAM(supabase: any, body: any) {
  const SAM_KEY = Deno.env.get('SAM_API_KEY') || Deno.env.get('DATA_GOV_KEY')
  if (!SAM_KEY) {
    return new Response(JSON.stringify({ error: 'SAM_API_KEY not configured for fallback' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  const deptCode = body.department_code || '9700' // DoD
  const page = body.page || 0
  
  const url = `https://api.sam.gov/contract-awards/v1/search?api_key=${SAM_KEY}&lastModifiedDate=[01/01/2025,]&contractingDepartmentCode=${deptCode}&modificationNumber=0&limit=100&offset=${page * 100}`
  const res = await fetch(url)
  
  if (!res.ok) {
    const text = await res.text()
    return new Response(JSON.stringify({
      error: `SAM Contract Awards API ${res.status}`,
      detail: text.substring(0, 500)
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  
  const data = await res.json()
  let loaded = 0
  
  for (const a of (data.awardSummary || [])) {
    const cid = a.contractId || {}
    const core = a.coreData || {}
    const fed = core.federalOrganization || {}
    const vendor = core.vendor?.vendorSiteDetails || {}
    const perf = core.placeOfPerformance || {}
    const dollars = core.dollarValues || {}
    const comp = core.competition || {}
    
    const { error } = await supabase.from('fpds_awards').upsert({
      piid: cid.piid,
      modification_number: cid.modificationNumber || '0',
      contracting_department: fed.contractingInformation?.contractingDepartment?.name,
      contracting_subtier: fed.contractingInformation?.contractingSubtier?.name,
      contracting_office: fed.contractingInformation?.contractingOffice?.name,
      funding_department: fed.fundingInformation?.fundingDepartment?.name,
      vendor_name: vendor.vendorOrganizationFactors?.vendorName,
      vendor_uei: vendor.vendorSiteUEI,
      vendor_cage: vendor.vendorAlternateSiteCode,
      vendor_city: vendor.vendorLocation?.city,
      vendor_state: vendor.vendorLocation?.state?.code,
      vendor_zip: vendor.vendorLocation?.ZIPCode,
      dollars_obligated: parseFloat(dollars.dollarsObligated) || 0,
      base_and_all_options: parseFloat(dollars.baseAndAllOptionsValue) || 0,
      naics_code: core.productOrServiceInformation?.naicsCode,
      psc_code: core.productOrServiceInformation?.productServiceCode,
      award_type: core.awardOrIDVType?.name,
      set_aside: comp.typeOfSetAside?.name,
      extent_competed: comp.extentCompeted?.name,
      number_of_offers: parseInt(comp.numberOfOffersReceived) || null,
      effective_date: core.relevantDates?.effectiveDate,
      completion_date: core.relevantDates?.ultimateCompletionDate,
      last_modified: a.transactionData?.lastModifiedDate,
      description_of_requirement: core.descriptionOfContractRequirement,
      pop_state: perf.principalPlaceOfPerformanceStateCode,
      pop_city: perf.principalPlaceOfPerformanceCityName,
      raw_data: a
    }, { onConflict: 'piid,modification_number', ignoreDuplicates: false })
    if (!error) loaded++
  }
  
  return new Response(JSON.stringify({
    success: true, loaded, department: deptCode, total: data.totalRecords || 0, page, mode: 'sam_fallback'
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
