import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

async function fetchWithRetry(url: string, retries = 3, delayMs = 5000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url)
    if (res.status === 429) {
      console.log(`Rate limited, waiting ${delayMs}ms (retry ${i + 1}/${retries})`)
      await new Promise(r => setTimeout(r, delayMs))
      delayMs *= 2
      continue
    }
    return res
  }
  throw new Error('SBIR API rate limit exceeded after retries')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const body = await req.json().catch(() => ({}))
  const keywords = body.keywords || ['cybersecurity', 'artificial intelligence', 'cloud', 'data', 'defense', 'health IT']
  const rows = body.rows || 500

  try {
    let totalLoaded = 0
    const results: any[] = []

    for (const keyword of keywords) {
      try {
        // Rate limit: wait between keywords
        await new Promise(r => setTimeout(r, 2000))
        
        const url = `https://www.sbir.gov/api/awards.json?keyword=${encodeURIComponent(keyword)}&rows=${rows}`
        console.log(`[load-sbir] Fetching: ${keyword} (${rows} rows)`)
        
        const res = await fetchWithRetry(url)
        if (!res.ok) {
          console.error(`[load-sbir] ${keyword}: ${res.status} ${res.statusText}`)
          results.push({ keyword, error: `${res.status}`, loaded: 0 })
          continue
        }

        const data = await res.json()
        const awards = Array.isArray(data) ? data : []
        
        if (awards.length === 0) {
          results.push({ keyword, loaded: 0 })
          continue
        }

        // Batch upsert
        const batchSize = 50
        let keywordLoaded = 0
        
        for (let i = 0; i < awards.length; i += batchSize) {
          const batch = awards.slice(i, i + batchSize).map((a: any) => ({
            firm: a.firm || a.company || 'Unknown',
            award_title: a.award_title || a.awardTitle || a.title || 'Untitled',
            agency: a.agency || 'Unknown',
            branch: a.branch,
            phase: a.phase,
            program: a.program || 'SBIR',
            contract: a.contract || a.solicitation_number,
            award_year: parseInt(a.award_year) || new Date().getFullYear(),
            award_amount: parseFloat(a.award_amount || a.awardAmount || '0') || 0,
            uei: a.uei,
            hubzone_owned: a.hubzone_owned === 'Y' || a.hubzone_owned === true ? 'Y' : 'N',
            socially_disadvantaged: a.socially_economically_disadvantaged === 'Y' || a.socially_economically_disadvantaged === true ? 'Y' : 'N',
            women_owned: a.women_owned === 'Y' || a.women_owned === true ? 'Y' : 'N',
            number_employees: parseInt(a.number_employees || a.numberOfEmployees || '0') || null,
            company_url: a.company_url || a.companyUrl || a.firm_url,
            city: a.ri_city || a.city,
            state: a.ri_state_code || a.state,
            zip: a.zip,
            poc_name: a.poc_name,
            poc_email: a.poc_email,
            poc_phone: a.poc_phone,
            pi_name: a.pi_name || a.piName,
            pi_email: a.pi_email,
            abstract: a.abstract?.substring(0, 5000),
            award_link: a.award_link,
            updated_at: new Date().toISOString()
          }))

          const { error, data: inserted } = await supabase
            .from('sbir_awards')
            .upsert(batch, { onConflict: 'contract,agency', ignoreDuplicates: false })
          
          if (error) {
            // Try insert instead if upsert constraint fails
            const { error: insertErr } = await supabase.from('sbir_awards').insert(batch)
            if (!insertErr) keywordLoaded += batch.length
            else console.error(`[load-sbir] Batch error for ${keyword}:`, insertErr.message)
          } else {
            keywordLoaded += batch.length
          }
        }

        totalLoaded += keywordLoaded
        results.push({ keyword, returned: awards.length, loaded: keywordLoaded })
        console.log(`[load-sbir] ${keyword}: ${keywordLoaded} loaded from ${awards.length} returned`)
      } catch (e) {
        console.error(`[load-sbir] ${keyword} error:`, e.message)
        results.push({ keyword, error: e.message, loaded: 0 })
      }
    }

    // Run entity resolution for newly loaded firms
    if (totalLoaded > 0) {
      console.log(`[load-sbir] Running entity resolution for ${totalLoaded} new awards...`)
      try {
        await supabase.functions.invoke('entity-resolver', { body: { source: 'sbir_awards', limit: 100 } })
      } catch (e) {
        console.log('[load-sbir] Entity resolution skipped:', e.message)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total_loaded: totalLoaded,
      keywords_processed: results.length,
      results
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
