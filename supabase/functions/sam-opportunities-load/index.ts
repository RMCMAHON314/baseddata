import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const SAM_API_KEY = Deno.env.get('SAM_API_KEY') || Deno.env.get('DATA_GOV_KEY')
  if (!SAM_API_KEY) {
    return new Response(JSON.stringify({ error: 'SAM_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const body = await req.json().catch(() => ({}))
  const limit = body.limit || 25
  const offset = body.offset || 0
  const postedFrom = body.posted_from || '01/01/2025'
  const postedTo = body.posted_to || new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })

  try {
    const url = new URL('https://api.sam.gov/opportunities/v2/search')
    url.searchParams.set('api_key', SAM_API_KEY)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('offset', String(offset))
    url.searchParams.set('postedFrom', postedFrom)
    url.searchParams.set('postedTo', postedTo)

    const response = await fetch(url.toString())

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(JSON.stringify({
        error: `SAM.gov API error: ${response.status}`,
        detail: errorText,
        hint: response.status === 403 ? 'API key may need Contract Opportunities Data Access role on SAM.gov.' : undefined
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const data = await response.json()
    const opportunities = data.opportunitiesData || []
    let loaded = 0

    for (const opp of opportunities) {
      const record: Record<string, unknown> = {
        notice_id: opp.noticeId,
        title: opp.title,
        solicitation_number: opp.solicitationNumber?.trim(),
        department: opp.department,
        sub_tier: opp.subTier,
        office: opp.office,
        posted_date: opp.postedDate,
        notice_type: opp.type,
        base_type: opp.baseType,
        set_aside: opp.typeOfSetAsideDescription,
        set_aside_code: opp.typeOfSetAside,
        response_deadline: opp.responseDeadLine,
        naics_code: opp.naicsCode,
        classification_code: opp.classificationCode,
        is_active: opp.active === 'Yes',
        award_date: opp.award?.date || null,
        award_number: opp.award?.number || null,
        award_amount: opp.award?.amount ? parseFloat(opp.award.amount) : null,
        awardee_name: opp.award?.awardee?.name || null,
        awardee_uei: opp.award?.awardee?.ueiSAM || null,
        awardee_city: opp.award?.awardee?.location?.city?.name || null,
        awardee_state: opp.award?.awardee?.location?.state?.code || null,
        primary_contact_email: opp.pointOfContact?.find((p: any) => p.type === 'primary')?.email || null,
        primary_contact_name: opp.pointOfContact?.find((p: any) => p.type === 'primary')?.fullName || null,
        primary_contact_phone: opp.pointOfContact?.find((p: any) => p.type === 'primary')?.phone || null,
        source: 'sam_gov',
        raw_data: opp,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('opportunities')
        .upsert(record, { onConflict: 'notice_id', ignoreDuplicates: false })
      if (!error) loaded++
    }

    return new Response(JSON.stringify({
      success: true, loaded,
      total_available: data.totalRecords || 0,
      offset, limit,
      posted_from: postedFrom, posted_to: postedTo
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
