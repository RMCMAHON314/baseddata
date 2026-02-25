// BASED DATA - System Initialization
// Lightweight startup — heavy enrichment is handled server-side by the flywheel-scheduler

import { supabase } from '@/integrations/supabase/client';

let initialized = false;

export async function initializeBasedData() {
  if (initialized) return;
  
  console.log('🚀 Initializing BASED DATA...');
  const startTime = Date.now();
  
  try {
    // Just log system health — all enrichment runs server-side via cron
    const { count: entityCount } = await supabase
      .from('core_entities')
      .select('id', { count: 'exact', head: true })
      .eq('is_canonical', true);
    
    const { count: contractCount } = await supabase
      .from('contracts')
      .select('id', { count: 'exact', head: true });
    
    const duration = Date.now() - startTime;
    
    console.log(`🚀 BASED DATA ready — ${(entityCount || 0).toLocaleString()} entities, ${(contractCount || 0).toLocaleString()} contracts (${duration}ms)`);
    
    initialized = true;
    return { entityCount, contractCount, durationMs: duration };
  } catch (error) {
    console.error('❌ BASED DATA initialization failed:', error);
  }
}

export function getSystemStatus() {
  return { initialized };
}
