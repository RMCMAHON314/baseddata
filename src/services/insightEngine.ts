// BASED DATA - Insight Engine
// AI-driven insight generation for entities
import { supabase } from '@/integrations/supabase/client';
import { getEntityHealthScore, HealthScoreMetrics } from './healthScoreService';
import { RelationshipIntelligence } from './relationshipIntelligence';

interface Insight {
  entityId: string;
  type: 'warning' | 'opportunity' | 'threat' | 'success' | 'info';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionItems: string[];
  generatedAt: string;
}

export class InsightEngine {
  static async generateEntityInsights(entityId: string): Promise<Insight[]> {
    const { data: entity } = await supabase
      .from('core_entities')
      .select('*')
      .eq('id', entityId)
      .single();
    
    if (!entity) return [];
    
    const insights: Insight[] = [];
    
    // Get health score
    const healthScore = await getEntityHealthScore(entityId);
    if (healthScore) {
      insights.push(...this.generateHealthInsights(entityId, healthScore));
    }
    
    // Detect market shifts
    const marketShift = await RelationshipIntelligence.detectMarketShifts(entityId);
    insights.push(...this.generateMarketInsights(entityId, marketShift));
    
    // Analyze contract concentration
    const concentrationInsights = await this.analyzeConcentration(entityId);
    insights.push(...concentrationInsights);
    
    // Store insights
    for (const insight of insights) {
      await supabase.from('core_derived_insights').insert({
        scope_type: 'entity',
        scope_value: entityId,
        insight_type: insight.type,
        title: insight.title,
        description: insight.description,
        severity: insight.priority,
        supporting_data: { actionItems: insight.actionItems },
        related_entities: [entityId]
      });
    }
    
    return insights;
  }
  
  private static generateHealthInsights(entityId: string, health: HealthScoreMetrics): Insight[] {
    const insights: Insight[] = [];
    const now = new Date().toISOString();
    
    if (health.trendDirection === 'down') {
      insights.push({
        entityId,
        type: 'warning',
        title: 'Declining Performance Detected',
        description: `Health score trending down. Current: ${health.overallScore}/100. Contract velocity at ${health.contractVelocity}/100.`,
        priority: 'high',
        actionItems: [
          'Review recent contract performance',
          'Assess relationship density',
          'Consider market diversification strategies'
        ],
        generatedAt: now
      });
    }
    
    if (health.overallScore >= 80) {
      insights.push({
        entityId,
        type: 'success',
        title: 'Strong Performance',
        description: `Health score: ${health.overallScore}/100. Top tier performance maintained.`,
        priority: 'low',
        actionItems: ['Maintain current strategy', 'Document best practices', 'Consider expansion'],
        generatedAt: now
      });
    }
    
    if (health.relationshipDensity < 30) {
      insights.push({
        entityId,
        type: 'opportunity',
        title: 'Network Growth Opportunity',
        description: `Relationship density is low (${health.relationshipDensity}/100). Building partnerships could improve win rates.`,
        priority: 'medium',
        actionItems: [
          'Identify potential teaming partners',
          'Attend industry events',
          'Join relevant industry associations'
        ],
        generatedAt: now
      });
    }
    
    if (health.marketDiversification < 30) {
      insights.push({
        entityId,
        type: 'warning',
        title: 'Market Concentration Risk',
        description: `Low market diversification (${health.marketDiversification}/100). Over-reliance on limited markets.`,
        priority: 'medium',
        actionItems: [
          'Explore adjacent NAICS codes',
          'Target new agency relationships',
          'Diversify service offerings'
        ],
        generatedAt: now
      });
    }
    
    return insights;
  }
  
  private static generateMarketInsights(entityId: string, shift: any): Insight[] {
    const insights: Insight[] = [];
    const now = new Date().toISOString();
    
    if (shift.newMarkets.length > 0) {
      insights.push({
        entityId,
        type: 'opportunity',
        title: 'New Market Entry',
        description: `Entered ${shift.newMarkets.length} new agency market(s): ${shift.newMarkets.slice(0, 3).join(', ')}`,
        priority: 'medium',
        actionItems: shift.newMarkets.slice(0, 3).map((m: string) => `Strengthen ${m} relationship`),
        generatedAt: now
      });
    }
    
    if (shift.lostMarkets.length > 0) {
      insights.push({
        entityId,
        type: 'threat',
        title: 'Market Position Loss',
        description: `Lost contracts with ${shift.lostMarkets.length} agency(ies) in the last 90 days.`,
        priority: 'high',
        actionItems: shift.lostMarkets.slice(0, 3).map((m: string) => `Investigate ${m} loss and recovery options`),
        generatedAt: now
      });
    }
    
    if (shift.trend === 'expanding') {
      insights.push({
        entityId,
        type: 'success',
        title: 'Market Expansion Trend',
        description: `Contract velocity increasing with ${shift.contractVelocityChange} more contracts in recent period.`,
        priority: 'low',
        actionItems: ['Continue growth momentum', 'Scale operations as needed'],
        generatedAt: now
      });
    }
    
    return insights;
  }
  
  private static async analyzeConcentration(entityId: string): Promise<Insight[]> {
    const insights: Insight[] = [];
    const now = new Date().toISOString();
    
    const { data: contracts } = await supabase
      .from('contracts')
      .select('awarding_agency, award_amount')
      .eq('recipient_entity_id', entityId)
      .limit(100);
    
    if (!contracts || contracts.length === 0) return insights;
    
    // Calculate agency concentration
    const agencyTotals = new Map<string, number>();
    let totalValue = 0;
    
    contracts.forEach(c => {
      const agency = c.awarding_agency || 'Unknown';
      const amount = c.award_amount || 0;
      agencyTotals.set(agency, (agencyTotals.get(agency) || 0) + amount);
      totalValue += amount;
    });
    
    // Check for concentration
    const sorted = Array.from(agencyTotals.entries()).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0 && totalValue > 0) {
      const topAgencyShare = (sorted[0][1] / totalValue) * 100;
      
      if (topAgencyShare > 70) {
        insights.push({
          entityId,
          type: 'warning',
          title: 'High Agency Concentration',
          description: `${Math.round(topAgencyShare)}% of contract value from ${sorted[0][0]}. Diversification recommended.`,
          priority: 'high',
          actionItems: [
            'Identify alternative agency targets',
            'Build relationships with secondary agencies',
            'Reduce single-agency dependency'
          ],
          generatedAt: now
        });
      }
    }
    
    return insights;
  }
  
  static async generateBatchInsights(limit = 50): Promise<{ processed: number; insights: number }> {
    const { data: entities } = await supabase
      .from('core_entities')
      .select('id')
      .eq('is_canonical', true)
      .limit(limit);
    
    let totalInsights = 0;
    
    for (const entity of entities || []) {
      const insights = await this.generateEntityInsights(entity.id);
      totalInsights += insights.length;
    }
    
    return { processed: entities?.length || 0, insights: totalInsights };
  }
}
