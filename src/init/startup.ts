// BASED DATA - System Initialization
// Auto-starts all intelligence systems on app load

import { EnrichmentFlywheel } from '@/services/enrichmentFlywheel';
import { classifyAllContracts } from '@/services/classificationService';
import { calculateAllHealthScores } from '@/services/healthScoreService';
import { DataQualityAgent } from '@/services/dataQualityAgent';
import { BackgroundJobs } from '@/jobs/backgroundJobs';
import { supabase } from '@/integrations/supabase/client';

let initialized = false;

export async function initializeBasedData() {
  if (initialized) {
    console.log('✅ BASED DATA already initialized');
    return;
  }
  
  console.log('🚀 Initializing BASED DATA...');
  const startTime = Date.now();
  
  try {
    // 1. Start enrichment flywheel (runs in background)
    EnrichmentFlywheel.start();
    
    // 2. Check and classify unclassified contracts (limit to avoid blocking)
    const { count: unclassifiedCount } = await supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .is('psc_description', null);
    
    if (unclassifiedCount && unclassifiedCount > 0) {
      console.log(`📊 ${unclassifiedCount} contracts may need classification`);
      // Run classification in background (non-blocking)
      classifyAllContracts(50).then(result => {
        console.log(`📊 Classified ${result.classified} contracts`);
      });
    }
    
    // 3. Check for entities without health scores
    const { count: unscoredCount } = await supabase
      .from('core_entities')
      .select('id', { count: 'exact', head: true })
      .eq('is_canonical', true);
    
    const { count: scoredCount } = await supabase
      .from('entity_health_scores')
      .select('entity_id', { count: 'exact', head: true });
    
    const needsScoring = (unscoredCount || 0) - (scoredCount || 0);
    if (needsScoring > 0) {
      console.log(`📊 ${needsScoring} entities need health scores`);
      // Run health scoring in background (non-blocking)
      calculateAllHealthScores(25).then(result => {
        console.log(`📊 Scored ${result.calculated} entities`);
      });
    }
    
    // 4. Log system health
    const { count: entityCount } = await supabase
      .from('core_entities')
      .select('id', { count: 'exact', head: true })
      .eq('is_canonical', true);
    
    const { count: contractCount } = await supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true });
    
    const { count: factCount } = await supabase
      .from('core_facts')
      .select('id', { count: 'exact', head: true });
    
    const duration = Date.now() - startTime;
    
    console.log(`
╔═══════════════════════════════════════════════════════╗
║           🚀 BASED DATA INITIALIZED 🚀                 ║
╠═══════════════════════════════════════════════════════╣
║  Entities: ${(entityCount || 0).toLocaleString().padEnd(12)} Contracts: ${(contractCount || 0).toLocaleString().padEnd(10)} ║
║  Facts: ${(factCount || 0).toLocaleString().padEnd(15)} Duration: ${duration}ms        ║
║  Flywheel: ACTIVE ✓    Intelligence: ONLINE ✓         ║
╚═══════════════════════════════════════════════════════╝
    `);
    
    initialized = true;
    return {
      entityCount,
      contractCount,
      factCount,
      durationMs: duration
    };
  } catch (error) {
    console.error('❌ BASED DATA initialization failed:', error);
    throw error;
  }
}

// Export status checker
export function getSystemStatus() {
  return {
    initialized,
    flywheel: EnrichmentFlywheel.getStatus()
  };
}
