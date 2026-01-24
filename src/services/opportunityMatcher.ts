// BASED DATA - Opportunity Matching Service
import { supabase } from '@/integrations/supabase/client';

export interface MatchReason {
  factor: string;
  weight: number;
  description: string;
}

export interface OpportunityMatch {
  opportunityId: string;
  opportunityTitle: string;
  score: number;
  reasons: MatchReason[];
  department: string | null;
  deadline: string | null;
  awardCeiling: number | null;
}

interface EntityProfile {
  naics_codes: string[] | null;
  psc_codes: string[] | null;
  business_types: string[] | null;
  state: string | null;
}

interface ContractHistory {
  awarding_agency: string | null;
  naics_code: string | null;
  psc_code: string | null;
  description: string | null;
  set_aside_type: string | null;
}

export async function matchOpportunitiesForEntity(
  entityId: string,
  limit = 20
): Promise<OpportunityMatch[]> {
  // Get entity profile
  const { data: entity } = await supabase
    .from('core_entities')
    .select('naics_codes, psc_codes, business_types, state')
    .eq('id', entityId)
    .single();
  
  if (!entity) return [];
  
  // Get entity's contract history for additional matching
  const { data: contracts } = await supabase
    .from('contracts')
    .select('awarding_agency, naics_code, psc_code, description, set_aside_type')
    .eq('recipient_entity_id', entityId)
    .limit(50);
  
  // Get active opportunities
  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('id, title, department, naics_code, psc_code, set_aside, pop_state, response_deadline, award_ceiling, description')
    .eq('is_active', true)
    .gte('response_deadline', new Date().toISOString())
    .order('response_deadline', { ascending: true })
    .limit(200);
  
  if (!opportunities?.length) return [];
  
  // Calculate match scores
  const matches: OpportunityMatch[] = opportunities.map(opp => {
    const reasons: MatchReason[] = [];
    let totalScore = 0;
    
    // NAICS Code Match (30 points max)
    if (opp.naics_code && entity.naics_codes?.includes(opp.naics_code)) {
      reasons.push({ factor: 'NAICS Code', weight: 30, description: `Entity has matching NAICS code ${opp.naics_code}` });
      totalScore += 30;
    } else if (opp.naics_code && entity.naics_codes?.some(n => n.startsWith(opp.naics_code?.substring(0, 2) || ''))) {
      reasons.push({ factor: 'NAICS Sector', weight: 15, description: `Entity works in same NAICS sector` });
      totalScore += 15;
    }
    
    // PSC Code Match (20 points max)
    if (opp.psc_code && entity.psc_codes?.includes(opp.psc_code)) {
      reasons.push({ factor: 'PSC Code', weight: 20, description: `Entity has matching PSC code ${opp.psc_code}` });
      totalScore += 20;
    }
    
    // Agency History Match (15 points)
    const workedWithAgency = contracts?.some(c => 
      c.awarding_agency?.toLowerCase().includes(opp.department?.toLowerCase() || '') ||
      opp.department?.toLowerCase().includes(c.awarding_agency?.toLowerCase() || '')
    );
    if (workedWithAgency) {
      reasons.push({ factor: 'Agency History', weight: 15, description: `Previously awarded contracts by ${opp.department}` });
      totalScore += 15;
    }
    
    // Set-Aside Match (15 points)
    if (opp.set_aside) {
      const setAsideMap: Record<string, string[]> = {
        'SBA': ['Small Business', 'SBA'],
        'SDB': ['Small Disadvantaged Business', 'SDB', '8(a)'],
        'WOSB': ['Women-Owned', 'WOSB'],
        'SDVOSB': ['Veteran-Owned', 'Service-Disabled Veteran', 'SDVOSB'],
        'HUBZone': ['HUBZone'],
        '8(a)': ['8(a)', 'Small Disadvantaged']
      };
      
      for (const [code, types] of Object.entries(setAsideMap)) {
        if (opp.set_aside.includes(code) && entity.business_types?.some(bt => types.some(t => bt.includes(t)))) {
          reasons.push({ factor: 'Set-Aside Eligible', weight: 15, description: `Entity qualifies for ${opp.set_aside}` });
          totalScore += 15;
          break;
        }
      }
    }
    
    // Geographic Match (10 points)
    if (opp.pop_state && entity.state === opp.pop_state) {
      reasons.push({ factor: 'Location Match', weight: 10, description: `Entity is located in ${opp.pop_state}` });
      totalScore += 10;
    }
    
    // Similar Contract History (10 points)
    const similarContract = contracts?.find(c => {
      const oppDesc = (opp.description || '').toLowerCase();
      const contractDesc = (c.description || '').toLowerCase();
      const keywords = oppDesc.split(' ').filter(w => w.length > 5);
      return keywords.some(kw => contractDesc.includes(kw));
    });
    if (similarContract) {
      reasons.push({ factor: 'Similar Experience', weight: 10, description: 'Entity has performed similar work' });
      totalScore += 10;
    }
    
    return {
      opportunityId: opp.id,
      opportunityTitle: opp.title || 'Untitled Opportunity',
      score: Math.min(100, totalScore),
      reasons,
      department: opp.department,
      deadline: opp.response_deadline,
      awardCeiling: opp.award_ceiling
    };
  });
  
  // Sort by score and return top matches
  return matches
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function findSimilarContracts(
  opportunityId: string,
  limit = 10
): Promise<{ id: string; name: string; value: number; agency: string; similarity: number }[]> {
  // Get opportunity details
  const { data: opp } = await supabase
    .from('opportunities')
    .select('naics_code, psc_code, department, description')
    .eq('id', opportunityId)
    .single();
  
  if (!opp) return [];
  
  // Build query for similar contracts
  let query = supabase
    .from('contracts')
    .select('id, recipient_name, award_amount, awarding_agency, naics_code, psc_code, description')
    .order('award_amount', { ascending: false })
    .limit(100);
  
  if (opp.naics_code) {
    query = query.eq('naics_code', opp.naics_code);
  }
  
  const { data: contracts } = await query;
  
  if (!contracts?.length) return [];
  
  // Score contracts by similarity
  return contracts
    .map(c => {
      let similarity = 0;
      if (c.naics_code === opp.naics_code) similarity += 40;
      if (c.psc_code === opp.psc_code) similarity += 30;
      if (c.awarding_agency?.includes(opp.department || '')) similarity += 20;
      
      // Description keyword overlap
      const oppWords = (opp.description || '').toLowerCase().split(' ').filter(w => w.length > 4);
      const contractWords = (c.description || '').toLowerCase().split(' ').filter(w => w.length > 4);
      const overlap = oppWords.filter(w => contractWords.includes(w)).length;
      similarity += Math.min(10, overlap * 2);
      
      return {
        id: c.id,
        name: c.recipient_name,
        value: c.award_amount || 0,
        agency: c.awarding_agency || 'Unknown',
        similarity
      };
    })
    .filter(c => c.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
