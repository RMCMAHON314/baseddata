// BASED DATA - Entity Health Score Calculator
import { supabase } from '@/integrations/supabase/client';

export interface HealthScoreMetrics {
  overallScore: number;
  contractVelocity: number;
  grantSuccess: number;
  relationshipDensity: number;
  marketDiversification: number;
  trendDirection: 'up' | 'down' | 'stable';
}

interface EntityData {
  id: string;
  contract_count: number | null;
  grant_count: number | null;
  total_contract_value: number | null;
  total_grant_value: number | null;
  naics_codes: string[] | null;
  business_types: string[] | null;
  created_at: string | null;
}

export function calculateHealthScore(entity: EntityData, relationshipCount: number, recentContracts: number): HealthScoreMetrics {
  // Contract Velocity (0-100): Based on contract count and recency
  const contractCount = entity.contract_count || 0;
  const contractValue = entity.total_contract_value || 0;
  const contractVelocity = Math.min(100, 
    (contractCount * 5) + 
    (contractValue > 100000000 ? 30 : contractValue > 10000000 ? 20 : contractValue > 1000000 ? 10 : 0) +
    (recentContracts * 10)
  );
  
  // Grant Success (0-100): Based on grant count and value
  const grantCount = entity.grant_count || 0;
  const grantValue = entity.total_grant_value || 0;
  const grantSuccess = Math.min(100,
    (grantCount * 8) +
    (grantValue > 10000000 ? 30 : grantValue > 1000000 ? 20 : grantValue > 100000 ? 10 : 0)
  );
  
  // Relationship Density (0-100): Based on relationship count
  const relationshipDensity = Math.min(100, relationshipCount * 10);
  
  // Market Diversification (0-100): Based on NAICS codes and business types
  const naicsCount = entity.naics_codes?.length || 0;
  const businessTypeCount = entity.business_types?.length || 0;
  const marketDiversification = Math.min(100, (naicsCount * 15) + (businessTypeCount * 10));
  
  // Weighted overall score
  const weights = {
    contractVelocity: 0.35,
    grantSuccess: 0.20,
    relationshipDensity: 0.25,
    marketDiversification: 0.20
  };
  
  const overallScore = Math.round(
    (contractVelocity * weights.contractVelocity) +
    (grantSuccess * weights.grantSuccess) +
    (relationshipDensity * weights.relationshipDensity) +
    (marketDiversification * weights.marketDiversification)
  );
  
  // Trend direction based on recent activity
  const trendDirection: 'up' | 'down' | 'stable' = 
    recentContracts >= 3 ? 'up' :
    recentContracts === 0 && contractCount > 5 ? 'down' :
    'stable';
  
  return {
    overallScore,
    contractVelocity: Math.round(contractVelocity),
    grantSuccess: Math.round(grantSuccess),
    relationshipDensity: Math.round(relationshipDensity),
    marketDiversification: Math.round(marketDiversification),
    trendDirection
  };
}

export async function calculateAndStoreHealthScore(entityId: string): Promise<HealthScoreMetrics | null> {
  // Get entity data
  const { data: entity, error } = await supabase
    .from('core_entities')
    .select('id, contract_count, grant_count, total_contract_value, total_grant_value, naics_codes, business_types, created_at')
    .eq('id', entityId)
    .single();
  
  if (error || !entity) return null;
  
  // Get relationship count
  const { count: relationshipCount } = await supabase
    .from('core_relationships')
    .select('*', { count: 'exact', head: true })
    .or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`);
  
  // Get recent contracts (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const { count: recentContracts } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_entity_id', entityId)
    .gte('award_date', sixMonthsAgo.toISOString().split('T')[0]);
  
  // Calculate metrics
  const metrics = calculateHealthScore(
    entity as EntityData,
    relationshipCount || 0,
    recentContracts || 0
  );
  
  // Store in database
  await supabase
    .from('entity_health_scores')
    .upsert({
      entity_id: entityId,
      overall_score: metrics.overallScore,
      contract_velocity: metrics.contractVelocity,
      grant_success: metrics.grantSuccess,
      relationship_density: metrics.relationshipDensity,
      market_diversification: metrics.marketDiversification,
      trend_direction: metrics.trendDirection,
      calculated_at: new Date().toISOString()
    }, { onConflict: 'entity_id' });
  
  return metrics;
}

export async function getEntityHealthScore(entityId: string): Promise<HealthScoreMetrics | null> {
  const { data } = await supabase
    .from('entity_health_scores')
    .select('*')
    .eq('entity_id', entityId)
    .maybeSingle();
  
  if (!data) {
    // Calculate fresh if not cached
    return calculateAndStoreHealthScore(entityId);
  }
  
  return {
    overallScore: data.overall_score,
    contractVelocity: data.contract_velocity || 0,
    grantSuccess: data.grant_success || 0,
    relationshipDensity: data.relationship_density || 0,
    marketDiversification: data.market_diversification || 0,
    trendDirection: (data.trend_direction as 'up' | 'down' | 'stable') || 'stable'
  };
}

export async function calculateAllHealthScores(batchSize = 50): Promise<{ calculated: number; errors: number }> {
  let calculated = 0;
  let errors = 0;
  let offset = 0;
  
  while (true) {
    const { data: entities, error } = await supabase
      .from('core_entities')
      .select('id')
      .eq('is_canonical', true)
      .range(offset, offset + batchSize - 1);
    
    if (error || !entities?.length) break;
    
    for (const entity of entities) {
      try {
        await calculateAndStoreHealthScore(entity.id);
        calculated++;
      } catch (e) {
        errors++;
      }
    }
    
    if (entities.length < batchSize) break;
    offset += batchSize;
  }
  
  return { calculated, errors };
}

export async function getHealthScoreDistribution(): Promise<{ range: string; count: number }[]> {
  const { data } = await supabase
    .from('entity_health_scores')
    .select('overall_score');
  
  const ranges = [
    { range: '0-20', min: 0, max: 20, count: 0 },
    { range: '21-40', min: 21, max: 40, count: 0 },
    { range: '41-60', min: 41, max: 60, count: 0 },
    { range: '61-80', min: 61, max: 80, count: 0 },
    { range: '81-100', min: 81, max: 100, count: 0 }
  ];
  
  (data || []).forEach(row => {
    const score = row.overall_score;
    const range = ranges.find(r => score >= r.min && score <= r.max);
    if (range) range.count++;
  });
  
  return ranges.map(r => ({ range: r.range, count: r.count }));
}
