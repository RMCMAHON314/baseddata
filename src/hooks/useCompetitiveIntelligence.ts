// BASED DATA - Competitive Intelligence Hook
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CompetitorProfile {
  id: string;
  name: string;
  totalValue: number;
  contractCount: number;
  winRate: number;
  dominantCategories: string[];
  vulnerableCategories: string[];
  recentTrend: 'up' | 'down' | 'stable';
}

export interface HeadToHead {
  competitorId: string;
  competitorName: string;
  sharedAgencies: string[];
  yourWins: number;
  theirWins: number;
  totalOpportunities: number;
}

export interface AgencyPerformance {
  agency: string;
  yourContracts: number;
  yourValue: number;
  competitorContracts: number;
  competitorValue: number;
  marketShare: number;
}

export function useCompetitiveIntelligence(entityId: string | null) {
  const [competitors, setCompetitors] = useState<CompetitorProfile[]>([]);
  const [headToHead, setHeadToHead] = useState<HeadToHead[]>([]);
  const [agencyPerformance, setAgencyPerformance] = useState<AgencyPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCompetitiveData = useCallback(async () => {
    if (!entityId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get entity details
      const { data: entity } = await supabase
        .from('core_entities')
        .select('canonical_name, naics_codes, state')
        .eq('id', entityId)
        .single();

      if (!entity) throw new Error('Entity not found');

      // Get entity's contracts
      const { data: myContracts } = await supabase
        .from('contracts')
        .select('awarding_agency, award_amount, naics_code, award_date')
        .eq('recipient_entity_id', entityId);

      // Get relationships marked as competitors
      const { data: relationships } = await supabase
        .from('core_relationships')
        .select('from_entity_id, to_entity_id, relationship_type, strength')
        .or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`)
        .eq('relationship_type', 'competitor');

      const competitorIds = relationships?.map(r => 
        r.from_entity_id === entityId ? r.to_entity_id : r.from_entity_id
      ).filter(Boolean) || [];

      // If no explicit competitors, find by similar NAICS in same state
      if (competitorIds.length === 0 && entity.naics_codes?.length) {
        const { data: similarEntities } = await supabase
          .from('core_entities')
          .select('id')
          .neq('id', entityId)
          .eq('state', entity.state)
          .overlaps('naics_codes', entity.naics_codes)
          .limit(10);
        
        competitorIds.push(...(similarEntities?.map(e => e.id) || []));
      }

      // Get competitor details
      if (competitorIds.length > 0) {
        const { data: competitorEntities } = await supabase
          .from('core_entities')
          .select('id, canonical_name, total_contract_value, contract_count, naics_codes')
          .in('id', competitorIds.filter(id => id !== null) as string[]);

        // Get competitor contracts
        const { data: competitorContracts } = await supabase
          .from('contracts')
          .select('recipient_entity_id, awarding_agency, award_amount, naics_code, award_date')
          .in('recipient_entity_id', competitorIds.filter(id => id !== null) as string[]);

        // Build competitor profiles
        const profiles: CompetitorProfile[] = (competitorEntities || []).map(comp => {
          const contracts = competitorContracts?.filter(c => c.recipient_entity_id === comp.id) || [];
          const recentContracts = contracts.filter(c => {
            if (!c.award_date) return false;
            const date = new Date(c.award_date);
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            return date > sixMonthsAgo;
          });

          // Calculate category distribution
          const categories: Record<string, number> = {};
          contracts.forEach(c => {
            if (c.naics_code) {
              categories[c.naics_code] = (categories[c.naics_code] || 0) + (c.award_amount || 0);
            }
          });

          const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);
          const dominantCategories = sortedCategories.slice(0, 3).map(([cat]) => cat);
          const vulnerableCategories = sortedCategories.slice(-3).map(([cat]) => cat);

          return {
            id: comp.id,
            name: comp.canonical_name,
            totalValue: comp.total_contract_value || 0,
            contractCount: comp.contract_count || 0,
            winRate: contracts.length > 0 ? Math.round((contracts.length / (contracts.length + 5)) * 100) : 0,
            dominantCategories,
            vulnerableCategories,
            recentTrend: recentContracts.length >= 3 ? 'up' : recentContracts.length === 0 ? 'down' : 'stable'
          };
        });

        setCompetitors(profiles.sort((a, b) => b.totalValue - a.totalValue));

        // Build head-to-head analysis
        const myAgencies = new Set(myContracts?.map(c => c.awarding_agency).filter(Boolean));
        const h2h: HeadToHead[] = profiles.map(comp => {
          const theirContracts = competitorContracts?.filter(c => c.recipient_entity_id === comp.id) || [];
          const theirAgencies = new Set(theirContracts.map(c => c.awarding_agency).filter(Boolean));
          const sharedAgencies = [...myAgencies].filter(a => theirAgencies.has(a));

          return {
            competitorId: comp.id,
            competitorName: comp.name,
            sharedAgencies: sharedAgencies as string[],
            yourWins: myContracts?.filter(c => sharedAgencies.includes(c.awarding_agency || '')).length || 0,
            theirWins: theirContracts.filter(c => sharedAgencies.includes(c.awarding_agency || '')).length,
            totalOpportunities: sharedAgencies.length
          };
        }).filter(h => h.sharedAgencies.length > 0);

        setHeadToHead(h2h);

        // Build agency performance
        const agencyMap: Record<string, { yours: number; yoursValue: number; theirs: number; theirsValue: number }> = {};
        
        myContracts?.forEach(c => {
          if (c.awarding_agency) {
            if (!agencyMap[c.awarding_agency]) {
              agencyMap[c.awarding_agency] = { yours: 0, yoursValue: 0, theirs: 0, theirsValue: 0 };
            }
            agencyMap[c.awarding_agency].yours++;
            agencyMap[c.awarding_agency].yoursValue += c.award_amount || 0;
          }
        });

        competitorContracts?.forEach(c => {
          if (c.awarding_agency) {
            if (!agencyMap[c.awarding_agency]) {
              agencyMap[c.awarding_agency] = { yours: 0, yoursValue: 0, theirs: 0, theirsValue: 0 };
            }
            agencyMap[c.awarding_agency].theirs++;
            agencyMap[c.awarding_agency].theirsValue += c.award_amount || 0;
          }
        });

        const performance: AgencyPerformance[] = Object.entries(agencyMap)
          .map(([agency, data]) => ({
            agency,
            yourContracts: data.yours,
            yourValue: data.yoursValue,
            competitorContracts: data.theirs,
            competitorValue: data.theirsValue,
            marketShare: data.yours / (data.yours + data.theirs) * 100
          }))
          .sort((a, b) => b.yourValue - a.yourValue)
          .slice(0, 15);

        setAgencyPerformance(performance);
      }

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load competitive data');
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    loadCompetitiveData();
  }, [loadCompetitiveData]);

  return {
    competitors,
    headToHead,
    agencyPerformance,
    loading,
    error,
    refresh: loadCompetitiveData
  };
}
