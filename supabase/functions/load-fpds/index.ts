import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const SAM_KEY = Deno.env.get('SAM_API_KEY') || Deno.env.get('DATA_GOV_KEY')
  if (!SAM_KEY) {
    return new Response(JSON.stringify({ error: 'SAM_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const body = await req.json().catch(() => ({}))
  const deptCode = body.department_code || '9700'
  const page = body.page || 0

  try {
    const url = `https://api.sam.gov/contract-awards/v1/search?api_key=${SAM_KEY}&lastModifiedDate=[01/01/2025,]&contractingDepartmentCode=${deptCode}&modificationNumber=0&limit=100&offset=${page * 100}`
    const res = await fetch(url)
    if (!res.ok) {
      const text = await res.text()
      return new Response(JSON.stringify({
        error: `FPDS API ${res.status}`,
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
      success: true, loaded, department: deptCode, total: data.totalRecords || 0, page
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
