// BASED DATA - Continuous Enrichment Flywheel
// Self-improving intelligence system that continuously enriches entities

import { supabase } from '@/integrations/supabase/client';
import { USAspendingAPI } from './usaspendingAPI';
import { OpenCorporatesAPI } from './opencorporatesAPI';
import { calculateAndStoreHealthScore } from './healthScoreService';
import { classifyAllContracts } from './classificationService';

export class EnrichmentFlywheel {
  private static isRunning = false;
  private static intervalId: NodeJS.Timeout | null = null;
  
  static start() {
    if (this.isRunning) {
      console.log('🔄 Flywheel already running');
      return;
    }
    
    this.isRunning = true;
    console.log('🔄 Enrichment Flywheel STARTED');
    
    // Run every 5 minutes
    this.intervalId = setInterval(() => {
      this.runEnrichmentCycle();
    }, 5 * 60 * 1000);
    
    // Run immediately
    this.runEnrichmentCycle();
  }
  
  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('⏹️ Enrichment Flywheel STOPPED');
  }
  
  static async runEnrichmentCycle() {
    console.log('🔄 Running enrichment cycle...');
    const startTime = Date.now();
    
    try {
      // 1. Find stale entities (not updated in 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: staleEntities } = await supabase
        .from('core_entities')
        .select('id, canonical_name, updated_at')
        .lt('updated_at', sevenDaysAgo.toISOString())
        .limit(5);
      
      console.log(`🔄 Enriching ${staleEntities?.length || 0} stale entities...`);
      
      // 2. Enrich each stale entity
      for (const entity of staleEntities || []) {
        await this.enrichEntity(entity);
      }
      
      // 3. Find entities without health scores
      const { data: unscoredEntities } = await supabase
        .from('core_entities')
        .select('id')
        .eq('is_canonical', true)
        .not('id', 'in', supabase.from('entity_health_scores').select('entity_id'))
        .limit(10);
      
      // Calculate health scores for unscored entities
      for (const entity of unscoredEntities || []) {
        await calculateAndStoreHealthScore(entity.id);
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Enrichment cycle complete in ${duration}ms`);
      
      return {
        entitiesEnriched: staleEntities?.length || 0,
        healthScoresCalculated: unscoredEntities?.length || 0,
        durationMs: duration
      };
    } catch (error) {
      console.error('Enrichment cycle failed:', error);
      return { error: String(error) };
    }
  }
  
  private static async enrichEntity(entity: { id: string; canonical_name: string }) {
    console.log(`📊 Enriching ${entity.canonical_name}...`);
    
    // Run all enrichment APIs in parallel
    const results = await Promise.allSettled([
      OpenCorporatesAPI.enrichEntity(entity.id),
      this.enrichFromContracts(entity.id),
      this.enrichFromGrants(entity.id)
    ]);
    
    // Update timestamp
    await supabase
      .from('core_entities')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', entity.id);
    
    return results;
  }
  
  private static async enrichFromContracts(entityId: string) {
    const { data: contracts } = await supabase
      .from('contracts')
      .select('id')
      .eq('recipient_entity_id', entityId)
      .limit(10);
    
    let enriched = 0;
    for (const contract of contracts || []) {
      const success = await USAspendingAPI.enrichContract(contract.id);
      if (success) enriched++;
    }
    
    return enriched;
  }
  
  private static async enrichFromGrants(entityId: string) {
    const { data: grants } = await supabase
      .from('grants')
      .select('*')
      .eq('recipient_entity_id', entityId)
      .limit(5);
    
    // Extract facts from grants
    const facts = [];
    for (const grant of grants || []) {
      if (grant.project_title) {
        facts.push({
          entity_id: entityId,
          fact_value: { project: grant.project_title, amount: grant.award_amount },
          fact_type: 'grant_project',
          source_name: 'grants_analysis',
          confidence: 0.9
        });
      }
    }
    
    if (facts.length > 0) {
      await supabase.from('core_facts').insert(facts);
    }
    
    return facts.length;
  }
  
  static getStatus() {
    return {
      isRunning: this.isRunning,
      message: this.isRunning ? 'Flywheel is actively enriching data' : 'Flywheel is stopped'
    };
  }
}
