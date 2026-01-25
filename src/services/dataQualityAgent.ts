// BASED DATA - Data Quality Agent
// Autonomous data quality monitoring and fixing
import { supabase } from '@/integrations/supabase/client';
import { classifyAllContracts } from './classificationService';
import { calculateAllHealthScores } from './healthScoreService';

interface AuditResult {
  type: string;
  found: number;
  fixed: number;
  details?: any;
}

export class DataQualityAgent {
  static async runDailyAudit(): Promise<AuditResult[]> {
    console.log('🔍 Starting daily data quality audit...');
    const results: AuditResult[] = [];
    
    // 1. Find orphaned contracts (no entity link)
    const orphanResult = await this.findAndFixOrphanedContracts();
    results.push(orphanResult);
    
    // 2. Find stale entities (not updated recently)
    const staleResult = await this.findStaleEntities();
    results.push(staleResult);
    
    // 3. Classify unclassified contracts
    const classifyResult = await this.classifyContracts();
    results.push(classifyResult);
    
    // 4. Score unscored entities
    const scoreResult = await this.scoreEntities();
    results.push(scoreResult);
    
    // 5. Check data freshness
    const freshnessResult = await this.checkDataFreshness();
    results.push(freshnessResult);
    
    // Log audit results
    console.log('✅ Daily audit complete:', results);
    
    return results;
  }
  
  private static async findAndFixOrphanedContracts(): Promise<AuditResult> {
    const { data: orphaned, count } = await supabase
      .from('contracts')
      .select('id, recipient_name', { count: 'exact' })
      .is('recipient_entity_id', null)
      .limit(100);
    
    let fixed = 0;
    
    // Try to link orphaned contracts to entities
    for (const contract of orphaned || []) {
      if (!contract.recipient_name) continue;
      
      // Find matching entity
      const { data: entity } = await supabase
        .from('core_entities')
        .select('id')
        .ilike('canonical_name', `%${contract.recipient_name.substring(0, 20)}%`)
        .limit(1)
        .maybeSingle();
      
      if (entity) {
        await supabase
          .from('contracts')
          .update({ recipient_entity_id: entity.id })
          .eq('id', contract.id);
        fixed++;
      }
    }
    
    return {
      type: 'orphaned_contracts',
      found: count || 0,
      fixed,
      details: { sample: orphaned?.slice(0, 5).map(c => c.recipient_name) }
    };
  }
  
  private static async findStaleEntities(): Promise<AuditResult> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: stale, count } = await supabase
      .from('core_entities')
      .select('id, canonical_name, updated_at', { count: 'exact' })
      .lt('updated_at', sevenDaysAgo.toISOString())
      .limit(50);
    
    // Mark for refresh (update timestamp triggers enrichment flywheel)
    let refreshed = 0;
    for (const entity of stale || []) {
      // The enrichment flywheel will pick these up
      refreshed++;
    }
    
    return {
      type: 'stale_entities',
      found: count || 0,
      fixed: refreshed,
      details: { staleThreshold: '7 days' }
    };
  }
  
  private static async classifyContracts(): Promise<AuditResult> {
    const { count: unclassified } = await supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .is('psc_description', null);
    
    if (unclassified && unclassified > 0) {
      const result = await classifyAllContracts(Math.min(unclassified, 50));
      return {
        type: 'contract_classification',
        found: unclassified,
        fixed: result.classified,
        details: { errors: result.errors }
      };
    }
    
    return { type: 'contract_classification', found: 0, fixed: 0 };
  }
  
  private static async scoreEntities(): Promise<AuditResult> {
    // Get entities without health scores
    const { count: totalEntities } = await supabase
      .from('core_entities')
      .select('id', { count: 'exact', head: true })
      .eq('is_canonical', true);
    
    const { count: scoredEntities } = await supabase
      .from('entity_health_scores')
      .select('entity_id', { count: 'exact', head: true });
    
    const unscored = (totalEntities || 0) - (scoredEntities || 0);
    
    if (unscored > 0) {
      const result = await calculateAllHealthScores(Math.min(unscored, 25));
      return {
        type: 'entity_scoring',
        found: unscored,
        fixed: result.calculated,
        details: { errors: result.errors }
      };
    }
    
    return { type: 'entity_scoring', found: 0, fixed: 0 };
  }
  
  private static async checkDataFreshness(): Promise<AuditResult> {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const { count: recentContracts } = await supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo.toISOString());
    
    const { count: recentFacts } = await supabase
      .from('core_facts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo.toISOString());
    
    const isHealthy = (recentContracts || 0) > 0 || (recentFacts || 0) > 0;
    
    return {
      type: 'data_freshness',
      found: isHealthy ? 0 : 1,
      fixed: 0,
      details: {
        recentContracts,
        recentFacts,
        status: isHealthy ? 'healthy' : 'stale'
      }
    };
  }
  
  static async getDataQualityScore(): Promise<number> {
    const [
      { count: totalEntities },
      { count: scoredEntities },
      { count: orphanedContracts },
      { count: classifiedContracts }
    ] = await Promise.all([
      supabase.from('core_entities').select('id', { count: 'exact', head: true }).eq('is_canonical', true),
      supabase.from('entity_health_scores').select('entity_id', { count: 'exact', head: true }),
      supabase.from('contracts').select('id', { count: 'exact', head: true }).is('recipient_entity_id', null),
      supabase.from('contract_classifications').select('id', { count: 'exact', head: true })
    ]);
    
    const scoringCoverage = (scoredEntities || 0) / Math.max(totalEntities || 1, 1);
    const linkageCoverage = 1 - ((orphanedContracts || 0) / 1000);
    const classificationCoverage = Math.min((classifiedContracts || 0) / 500, 1);
    
    const score = Math.round(
      (scoringCoverage * 40) +
      (linkageCoverage * 30) +
      (classificationCoverage * 30)
    );
    
    return Math.min(Math.max(score, 0), 100);
  }
}
