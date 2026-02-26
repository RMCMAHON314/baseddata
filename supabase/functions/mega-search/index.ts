import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const { 
      query, 
      filters = {},
      page = 1,
      limit = 50,
      include_contracts = true,
      include_grants = true,
      include_opportunities = true
    } = await req.json()

    if (!query?.trim()) {
      return new Response(JSON.stringify({ results: [], total: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`🔍 MEGA SEARCH: "${query}"`)
    const startTime = Date.now()
    const searchTerms = buildSearchTerms(query)
    console.log('search_terms', searchTerms)

    // Parallel searches
    const searches = []

    // 1. Search entities (always)
    searches.push(searchEntities(supabase, searchTerms, filters, limit))

    // 2. Search contracts
    if (include_contracts) {
      searches.push(searchContracts(supabase, searchTerms, filters, limit))
    }

    // 3. Search grants
    if (include_grants) {
      searches.push(searchGrants(supabase, searchTerms, filters, limit))
    }

    // 4. Search opportunities
    if (include_opportunities) {
      searches.push(searchOpportunities(supabase, searchTerms, filters, limit))
    }

    const results = await Promise.all(searches)

    // Flatten and score for relevance
    const allResults = results.flat().map((result: any) => ({
      ...result,
      relevance: computeRelevance(result, searchTerms)
    }))

    // Sort by relevance, then value
    allResults.sort((a, b) => {
      if ((b.relevance || 0) !== (a.relevance || 0)) return (b.relevance || 0) - (a.relevance || 0)
      return (b.value || 0) - (a.value || 0)
    })

    // Calculate aggregations
    const aggregations = {
      total_value: allResults.reduce((sum, r) => sum + (r.value || 0), 0),
      by_type: countBy(allResults, 'result_type'),
      by_state: countBy(allResults, 'state'),
      by_agency: countBy(allResults.filter(r => r.agency), 'agency'),
      entity_count: allResults.filter(r => r.result_type === 'entity').length,
      contract_count: allResults.filter(r => r.result_type === 'contract').length,
      grant_count: allResults.filter(r => r.result_type === 'grant').length,
      opportunity_count: allResults.filter(r => r.result_type === 'opportunity').length
    }

    // Generate insights
    const insights = generateInsights(query, allResults, aggregations)

    const response = {
      query,
      search_terms: searchTerms,
      results: allResults.slice(0, limit),
      total: allResults.length,
      aggregations,
      insights,
      response_time_ms: Date.now() - startTime
    }

    // Log search (async, don't wait)
    supabase.from('search_logs').insert({
      query,
      filters,
      result_count: allResults.length,
      response_time_ms: response.response_time_ms
    }).then(() => {})

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    console.error('Search error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function searchEntities(supabase: any, searchTerms: string[], filters: any, limit: number) {
  let q = supabase
    .from('core_entities')
    .select('id, canonical_name, entity_type, state, city, total_contract_value, total_grant_value, opportunity_score, description')
    .or(buildOrFilter(searchTerms, ['canonical_name', 'description', 'entity_type']))
    .order('total_contract_value', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (filters.states?.length) q = q.in('state', filters.states)
  if (filters.entity_types?.length) q = q.in('entity_type', filters.entity_types)
  if (filters.min_value) q = q.gte('total_contract_value', filters.min_value)
  if (filters.min_score) q = q.gte('opportunity_score', filters.min_score)

  const { data, error } = await q
  if (error) { console.error('Entity search error:', error); return [] }

  return (data || []).map((e: any) => ({
    id: e.id,
    name: e.canonical_name,
    result_type: 'entity',
    entity_type: e.entity_type,
    state: e.state,
    city: e.city,
    value: e.total_contract_value || 0,
    grant_value: e.total_grant_value || 0,
    opportunity_score: e.opportunity_score,
    description: e.description?.slice(0, 200)
  }))
}

async function searchContracts(supabase: any, searchTerms: string[], filters: any, limit: number) {
  let q = supabase
    .from('contracts')
    .select('id, recipient_name, recipient_entity_id, awarding_agency, description, award_amount, pop_state, pop_city, start_date, end_date, naics_code, set_aside_type')
    .or(buildOrFilter(searchTerms, ['recipient_name', 'description', 'awarding_agency', 'set_aside_type', 'naics_code']))
    .order('award_amount', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (filters.states?.length) q = q.in('pop_state', filters.states)
  if (filters.agencies?.length) q = q.in('awarding_agency', filters.agencies)
  if (filters.min_value) q = q.gte('award_amount', filters.min_value)
  if (filters.naics?.length) q = q.in('naics_code', filters.naics)

  const { data, error } = await q
  if (error) { console.error('Contract search error:', error); return [] }

  return (data || []).map((c: any) => ({
    id: c.id,
    name: c.recipient_name,
    result_type: 'contract',
    entity_id: c.recipient_entity_id,
    agency: c.awarding_agency,
    state: c.pop_state,
    city: c.pop_city,
    value: c.award_amount || 0,
    description: c.description?.slice(0, 200),
    start_date: c.start_date,
    end_date: c.end_date,
    naics: c.naics_code,
    set_aside: c.set_aside_type
  }))
}

async function searchGrants(supabase: any, searchTerms: string[], filters: any, limit: number) {
  let q = supabase
    .from('grants')
    .select('id, recipient_name, recipient_entity_id, awarding_agency, project_title, award_amount, recipient_state, start_date, end_date, cfda_number')
    .or(buildOrFilter(searchTerms, ['recipient_name', 'project_title', 'awarding_agency', 'cfda_number']))
    .order('award_amount', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (filters.states?.length) q = q.in('recipient_state', filters.states)
  if (filters.min_value) q = q.gte('award_amount', filters.min_value)

  const { data, error } = await q
  if (error) { console.error('Grant search error:', error); return [] }

  return (data || []).map((g: any) => ({
    id: g.id,
    name: g.recipient_name,
    result_type: 'grant',
    entity_id: g.recipient_entity_id,
    agency: g.awarding_agency,
    state: g.recipient_state,
    value: g.award_amount || 0,
    title: g.project_title,
    description: g.project_title?.slice(0, 200),
    start_date: g.start_date,
    end_date: g.end_date,
    cfda: g.cfda_number
  }))
}

async function searchOpportunities(supabase: any, searchTerms: string[], filters: any, limit: number) {
  let q = supabase
    .from('opportunities')
    .select('id, title, description, department, notice_type, response_deadline, pop_state, award_ceiling, naics_code, set_aside')
    .eq('is_active', true)
    .or(buildOrFilter(searchTerms, ['title', 'description', 'department', 'set_aside', 'naics_code']))
    .order('response_deadline', { ascending: true })
    .limit(limit)

  if (filters.states?.length) q = q.in('pop_state', filters.states)

  const { data, error } = await q
  if (error) return []

  return (data || []).map((o: any) => ({
    id: o.id,
    name: o.title,
    result_type: 'opportunity',
    agency: o.department,
    state: o.pop_state,
    value: o.award_ceiling || 0,
    description: o.description?.slice(0, 200),
    deadline: o.response_deadline,
    notice_type: o.notice_type,
    set_aside: o.set_aside
  }))
}

function countBy(arr: any[], key: string) {
  const counts: Record<string, number> = {}
  arr.forEach(item => {
    const val = item[key]
    if (val) counts[val] = (counts[val] || 0) + 1
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([k, v]) => ({ key: k, count: v }))
}

function generateInsights(query: string, results: any[], aggs: any) {
  const insights: any[] = []

  // High value insight
  const highValue = results.filter(r => r.value > 10000000)
  if (highValue.length > 0) {
    insights.push({
      type: 'high_value',
      icon: '💰',
      title: `${highValue.length} results over $10M`,
      description: `Total value: $${(highValue.reduce((s: number, r: any) => s + r.value, 0) / 1e9).toFixed(2)}B`,
      priority: 'high'
    })
  }

  // Opportunity insight
  const opportunities = results.filter(r => r.result_type === 'opportunity')
  const urgentOpps = opportunities.filter((o: any) => {
    if (!o.deadline) return false
    const days = (new Date(o.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return days > 0 && days < 14
  })
  if (urgentOpps.length > 0) {
    insights.push({
      type: 'urgent',
      icon: '⏰',
      title: `${urgentOpps.length} opportunities closing soon`,
      description: 'Response deadline within 14 days',
      priority: 'high'
    })
  }

  // Geographic concentration
  if (aggs.by_state.length > 0 && results.length > 5) {
    const topState = aggs.by_state[0]
    const pct = ((topState.count / results.length) * 100).toFixed(0)
    if (parseInt(pct) > 30) {
      insights.push({
        type: 'geographic',
        icon: '📍',
        title: `${pct}% concentrated in ${topState.key}`,
        description: `${topState.count} of ${results.length} results`,
        priority: 'medium'
      })
    }
  }

  // Small business opportunity
  const smallBiz = results.filter(r => r.set_aside && r.set_aside.toLowerCase().includes('small'))
  if (smallBiz.length > 0) {
    insights.push({
      type: 'small_business',
      icon: '🏢',
      title: `${smallBiz.length} small business set-asides`,
      description: 'Opportunities reserved for small businesses',
      priority: 'medium'
    })
  }

  return insights
}

function cleanToken(token: string) {
  return token.toLowerCase().replace(/[^a-z0-9-]/g, '').trim()
}

function buildSearchTerms(query: string) {
  const normalized = query.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim()
  const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'that', 'this', 'your'])
  const tokens = normalized.split(' ').map(cleanToken).filter(t => t.length > 2 && !stopWords.has(t)).slice(0, 6)

  const synonyms: Record<string, string[]> = {
    healthcare: ['health', 'medical', 'hospital', 'clinic', 'nih', 'hhs', 'cms'],
    grants: ['grant', 'funding', 'award'],
    cybersecurity: ['cyber', 'security', 'infosec'],
    defense: ['dod', 'military', 'army', 'navy', 'airforce'],
    it: ['technology', 'software', 'cloud']
  }

  const terms = new Set<string>()
  if (normalized && !normalized.includes(' ')) terms.add(normalized)

  for (const t of tokens) {
    terms.add(t)
    const expanded = synonyms[t]
    if (expanded) expanded.forEach(s => terms.add(s))
  }

  return Array.from(terms).slice(0, 10)
}

function buildOrFilter(searchTerms: string[], columns: string[]) {
  const clauses: string[] = []
  for (const term of searchTerms) {
    for (const column of columns) {
      clauses.push(`${column}.ilike.%${term}%`)
    }
  }
  return clauses.join(',')
}

function computeRelevance(result: any, searchTerms: string[]) {
  const text = [
    result.name,
    result.description,
    result.agency,
    result.entity_type,
    result.set_aside,
    result.state
  ].filter(Boolean).join(' ').toLowerCase()

  const hitCount = searchTerms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0)
  const valueScore = result.value ? Math.min(Math.log10(result.value + 1) * 3, 15) : 0
  const oppScore = result.opportunity_score ? result.opportunity_score / 10 : 0

  return (hitCount * 20) + valueScore + oppScore
}
