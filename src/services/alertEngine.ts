// BASED DATA - Alert Engine
// Smart alerting for portfolio entities
import { supabase } from '@/integrations/supabase/client';
import { matchOpportunitiesForEntity } from './opportunityMatcher';

interface AlertDigest {
  userId: string;
  newOpportunities: OpportunityAlert[];
  healthChanges: HealthAlert[];
  competitorWins: CompetitorAlert[];
  generatedAt: string;
}

interface OpportunityAlert {
  entityId: string;
  entityName: string;
  opportunityTitle: string;
  matchScore: number;
  dueDate?: string;
}

interface HealthAlert {
  entityId: string;
  entityName: string;
  previousScore: number;
  currentScore: number;
  change: number;
  trend: string;
}

interface CompetitorAlert {
  entityId: string;
  entityName: string;
  competitorName: string;
  agency: string;
  amount: number;
}

export class AlertEngine {
  static async generateDailyDigest(userId: string): Promise<AlertDigest> {
    const digest: AlertDigest = {
      userId,
      newOpportunities: [],
      healthChanges: [],
      competitorWins: [],
      generatedAt: new Date().toISOString()
    };
    
    // Get user's portfolio entities
    const { data: portfolios } = await supabase
      .from('portfolios')
      .select(`
        id,
        name,
        portfolio_members (
          entity_id
        )
      `)
      .eq('user_id', userId);
    
    if (!portfolios) return digest;
    
    const entityIds = portfolios
      .flatMap(p => p.portfolio_members?.map((m: any) => m.entity_id) || [])
      .filter(Boolean);
    
    if (entityIds.length === 0) return digest;
    
    // Check for new opportunity matches
    digest.newOpportunities = await this.findNewOpportunities(entityIds);
    
    // Check for health score changes
    digest.healthChanges = await this.detectHealthChanges(entityIds);
    
    // Check for competitor wins
    digest.competitorWins = await this.detectCompetitorWins(entityIds);
    
    return digest;
  }
  
  private static async findNewOpportunities(entityIds: string[]): Promise<OpportunityAlert[]> {
    const alerts: OpportunityAlert[] = [];
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    // Get recent opportunities
    const { data: opportunities } = await supabase
      .from('opportunities')
      .select('*')
      .gte('created_at', oneDayAgo.toISOString())
      .limit(50);
    
    if (!opportunities || opportunities.length === 0) return alerts;
    
    // Match opportunities against portfolio entities
    for (const entityId of entityIds.slice(0, 10)) {
      try {
        const matches = await matchOpportunitiesForEntity(entityId);
        const highMatches = matches.filter(m => m.score > 70);
        
        if (highMatches.length > 0) {
          const { data: entity } = await supabase
            .from('core_entities')
            .select('canonical_name')
            .eq('id', entityId)
            .single();
          
          for (const match of highMatches.slice(0, 3)) {
            alerts.push({
              entityId,
              entityName: entity?.canonical_name || 'Unknown',
              opportunityTitle: match.opportunityTitle || 'Untitled Opportunity',
              matchScore: match.score,
              dueDate: match.deadline
            });
          }
        }
      } catch (error) {
        console.error(`Error matching opportunities for ${entityId}:`, error);
      }
    }
    
    return alerts;
  }
  
  private static async detectHealthChanges(entityIds: string[]): Promise<HealthAlert[]> {
    const alerts: HealthAlert[] = [];
    
    for (const entityId of entityIds.slice(0, 20)) {
      const { data: healthHistory } = await supabase
        .from('entity_health_scores')
        .select('*')
        .eq('entity_id', entityId)
        .order('calculated_at', { ascending: false })
        .limit(2);
      
      if (healthHistory && healthHistory.length >= 1) {
        const current = healthHistory[0];
        const previous = healthHistory[1];
        
        // Alert on significant changes (>10 points)
        if (previous) {
          const change = current.overall_score - previous.overall_score;
          
          if (Math.abs(change) >= 10) {
            const { data: entity } = await supabase
              .from('core_entities')
              .select('canonical_name')
              .eq('id', entityId)
              .single();
            
            alerts.push({
              entityId,
              entityName: entity?.canonical_name || 'Unknown',
              previousScore: previous.overall_score,
              currentScore: current.overall_score,
              change,
              trend: change > 0 ? 'improving' : 'declining'
            });
          }
        }
      }
    }
    
    return alerts;
  }
  
  private static async detectCompetitorWins(entityIds: string[]): Promise<CompetitorAlert[]> {
    const alerts: CompetitorAlert[] = [];
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    // Get agencies our entities work with
    const { data: ourAgencies } = await supabase
      .from('contracts')
      .select('awarding_agency')
      .in('recipient_entity_id', entityIds)
      .limit(100);
    
    const agencies = [...new Set(ourAgencies?.map(c => c.awarding_agency).filter(Boolean) || [])];
    
    if (agencies.length === 0) return alerts;
    
    // Find new contracts to those agencies by other entities
    const { data: competitorContracts } = await supabase
      .from('contracts')
      .select('recipient_entity_id, recipient_name, awarding_agency, award_amount')
      .in('awarding_agency', agencies.slice(0, 10))
      .not('recipient_entity_id', 'in', `(${entityIds.join(',')})`)
      .gte('award_date', oneDayAgo.toISOString().split('T')[0])
      .order('award_amount', { ascending: false })
      .limit(10);
    
    for (const contract of competitorContracts || []) {
      // Find which of our entities this affects
      const affectedEntity = entityIds[0]; // Simplified - would need more logic
      
      const { data: entity } = await supabase
        .from('core_entities')
        .select('canonical_name')
        .eq('id', affectedEntity)
        .single();
      
      alerts.push({
        entityId: affectedEntity,
        entityName: entity?.canonical_name || 'Unknown',
        competitorName: contract.recipient_name,
        agency: contract.awarding_agency || 'Unknown Agency',
        amount: contract.award_amount || 0
      });
    }
    
    return alerts.slice(0, 5);
  }
  
  static async sendDigestToUser(userId: string, digest: AlertDigest): Promise<boolean> {
    const totalAlerts = 
      digest.newOpportunities.length + 
      digest.healthChanges.length + 
      digest.competitorWins.length;
    
    if (totalAlerts === 0) return false;
    
    // Log the digest (in production, would send email/notification)
    console.log(`📧 Digest for user ${userId}: ${totalAlerts} alerts`);
    return true;
  }
  
  private static formatDigestMessage(digest: AlertDigest): string {
    const parts: string[] = [];
    
    if (digest.newOpportunities.length > 0) {
      parts.push(`🎯 ${digest.newOpportunities.length} new opportunity matches`);
    }
    if (digest.healthChanges.length > 0) {
      parts.push(`📊 ${digest.healthChanges.length} health score changes`);
    }
    if (digest.competitorWins.length > 0) {
      parts.push(`⚔️ ${digest.competitorWins.length} competitor activities`);
    }
    
    return parts.join(' | ');
  }
}
