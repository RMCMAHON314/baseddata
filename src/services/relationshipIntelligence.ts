// BASED DATA - Relationship Intelligence
// Discovers teaming partners and market shifts
import { supabase } from '@/integrations/supabase/client';

interface TeamingPartner {
  entityId: string;
  entityName: string;
  sharedAgencies: number;
  sharedNaics: number;
  strengthScore: number;
}

interface MarketShift {
  newMarkets: string[];
  lostMarkets: string[];
  contractVelocityChange: number;
  trend: 'expanding' | 'contracting' | 'stable';
}

export class RelationshipIntelligence {
  static async discoverTeamingPartners(entityId: string): Promise<TeamingPartner[]> {
    // Get entity's contracts
    const { data: entityContracts } = await supabase
      .from('contracts')
      .select('awarding_agency, naics_code')
      .eq('recipient_entity_id', entityId);
    
    if (!entityContracts || entityContracts.length === 0) return [];
    
    const agencies = [...new Set(entityContracts.map(c => c.awarding_agency).filter(Boolean))];
    const naicsCodes = [...new Set(entityContracts.map(c => c.naics_code).filter(Boolean))];
    
    if (agencies.length === 0) return [];
    
    // Find other entities working with same agencies
    const { data: potentialPartners } = await supabase
      .from('contracts')
      .select('recipient_entity_id, recipient_name, awarding_agency, naics_code')
      .in('awarding_agency', agencies)
      .neq('recipient_entity_id', entityId)
      .not('recipient_entity_id', 'is', null)
      .limit(200);
    
    // Aggregate partner scores
    const partnerMap = new Map<string, {
      name: string;
      agencies: Set<string>;
      naics: Set<string>;
    }>();
    
    potentialPartners?.forEach(p => {
      if (!p.recipient_entity_id) return;
      
      if (!partnerMap.has(p.recipient_entity_id)) {
        partnerMap.set(p.recipient_entity_id, {
          name: p.recipient_name,
          agencies: new Set(),
          naics: new Set()
        });
      }
      
      const partner = partnerMap.get(p.recipient_entity_id)!;
      if (p.awarding_agency) partner.agencies.add(p.awarding_agency);
      if (p.naics_code) partner.naics.add(p.naics_code);
    });
    
    // Convert to ranked list
    const partners: TeamingPartner[] = Array.from(partnerMap.entries())
      .map(([id, data]) => {
        const sharedAgencies = data.agencies.size;
        const sharedNaics = [...data.naics].filter(n => naicsCodes.includes(n)).length;
        const strengthScore = Math.min((sharedAgencies * 0.15) + (sharedNaics * 0.1), 1);
        
        return {
          entityId: id,
          entityName: data.name,
          sharedAgencies,
          sharedNaics,
          strengthScore
        };
      })
      .filter(p => p.strengthScore > 0.1)
      .sort((a, b) => b.strengthScore - a.strengthScore)
      .slice(0, 15);
    
    // Store relationships
    for (const partner of partners) {
      await supabase.from('core_relationships').upsert({
        from_entity_id: entityId,
        to_entity_id: partner.entityId,
        relationship_type: 'teaming_partner',
        strength: partner.strengthScore,
        confidence: 0.8,
        evidence: [{
          type: 'shared_agencies',
          count: partner.sharedAgencies,
          naics_overlap: partner.sharedNaics
        }]
      }, { onConflict: 'from_entity_id,to_entity_id,relationship_type' });
    }
    
    return partners;
  }
  
  static async detectMarketShifts(entityId: string): Promise<MarketShift> {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    
    // Recent contracts (last 90 days)
    const { data: recent } = await supabase
      .from('contracts')
      .select('awarding_agency, award_amount')
      .eq('recipient_entity_id', entityId)
      .gte('award_date', ninetyDaysAgo.toISOString().split('T')[0]);
    
    // Previous period (90-180 days ago)
    const { data: previous } = await supabase
      .from('contracts')
      .select('awarding_agency, award_amount')
      .eq('recipient_entity_id', entityId)
      .gte('award_date', oneEightyDaysAgo.toISOString().split('T')[0])
      .lt('award_date', ninetyDaysAgo.toISOString().split('T')[0]);
    
    const recentAgencies = new Set(recent?.map(c => c.awarding_agency).filter(Boolean) || []);
    const previousAgencies = new Set(previous?.map(c => c.awarding_agency).filter(Boolean) || []);
    
    const newMarkets = [...recentAgencies].filter(a => !previousAgencies.has(a));
    const lostMarkets = [...previousAgencies].filter(a => !recentAgencies.has(a));
    const contractVelocityChange = (recent?.length || 0) - (previous?.length || 0);
    
    let trend: 'expanding' | 'contracting' | 'stable' = 'stable';
    if (newMarkets.length > lostMarkets.length && contractVelocityChange > 0) {
      trend = 'expanding';
    } else if (lostMarkets.length > newMarkets.length || contractVelocityChange < -2) {
      trend = 'contracting';
    }
    
    return {
      newMarkets,
      lostMarkets,
      contractVelocityChange,
      trend
    };
  }
  
  static async findCompetitors(entityId: string): Promise<TeamingPartner[]> {
    const { data: entity } = await supabase
      .from('core_entities')
      .select('naics_codes, state')
      .eq('id', entityId)
      .single();
    
    if (!entity) return [];
    
    // Find entities with same NAICS in same state
    const { data: competitors } = await supabase
      .from('core_entities')
      .select('id, canonical_name, total_contract_value')
      .eq('state', entity.state)
      .neq('id', entityId)
      .limit(50);
    
    return (competitors || [])
      .map(c => ({
        entityId: c.id,
        entityName: c.canonical_name,
        sharedAgencies: 0,
        sharedNaics: 1,
        strengthScore: Math.min((c.total_contract_value || 0) / 100000000, 1)
      }))
      .sort((a, b) => b.strengthScore - a.strengthScore)
      .slice(0, 10);
  }
  
  static async analyzeNetwork(entityId: string) {
    const partners = await this.discoverTeamingPartners(entityId);
    const competitors = await this.findCompetitors(entityId);
    const marketShift = await this.detectMarketShifts(entityId);
    
    return {
      teamingPartners: partners,
      competitors,
      marketShift,
      networkStrength: partners.reduce((sum, p) => sum + p.strengthScore, 0) / Math.max(partners.length, 1)
    };
  }
}
