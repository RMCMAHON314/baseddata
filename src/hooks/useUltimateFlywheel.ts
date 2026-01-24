// ============================================================================
// 🚀 THE ULTIMATE FLYWHEEL HOOK
// Real-time monitoring and control of the autonomous intelligence engine
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FlywheelHealth {
  score: number;
  breakdown: {
    entity_resolution: number;
    entity_diversity: number;
    fact_density: number;
    insight_freshness: number;
    pipeline_health: number;
    data_quality: number;
  };
  recommendations: string[];
  target_score: number;
}

export interface FlywheelMetrics {
  discoveries_processed: number;
  discoveries_approved: number;
  discoveries_failed: number;
  crawlers_run: number;
  sources_discovered: number;
  records_resolved: number;
  entities_created: number;
  entities_merged: number;
  facts_extracted: number;
  facts_linked: number;
  insights_generated: number;
  entities_scored: number;
  dead_letter_recovered: number;
  circuits_reset: number;
  gaps_identified: number;
  discoveries_queued: number;
}

export interface FlywheelRunResult {
  success: boolean;
  processing_time_ms: number;
  health_score: number;
  health_breakdown: Record<string, number>;
  recommendations: string[];
  metrics: FlywheelMetrics;
  errors: string[];
  phases_completed: string;
}

export interface SystemStats {
  total_records: number;
  resolved_records: number;
  resolution_rate: number;
  total_entities: number;
  total_facts: number;
  total_insights: number;
  open_circuits: number;
  dead_letters: number;
  active_crawlers: number;
  active_collectors: number;
}

// ============================================================================
// THE HOOK
// ============================================================================

export function useUltimateFlywheel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<FlywheelRunResult | null>(null);

  // ============================================================================
  // HEALTH CHECK QUERY
  // ============================================================================
  
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['flywheel-health'],
    queryFn: async (): Promise<FlywheelHealth> => {
      const { data, error } = await supabase.functions.invoke('flywheel-ultimate', {
        body: { action: 'health' },
      });
      
      if (error) throw error;
      
      return {
        score: data.health_score || 0,
        breakdown: data.breakdown || {},
        recommendations: data.recommendations || [],
        target_score: data.target_score || 95,
      };
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });

  // ============================================================================
  // SYSTEM STATS QUERY
  // ============================================================================
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['flywheel-stats'],
    queryFn: async (): Promise<SystemStats> => {
      const [
        { count: totalRecords },
        { count: resolvedRecords },
        { count: totalEntities },
        { count: totalFacts },
        { count: totalInsights },
        { count: openCircuits },
        { count: deadLetters },
        { count: activeCrawlers },
        { count: activeCollectors },
      ] = await Promise.all([
        supabase.from('records').select('*', { count: 'exact', head: true }),
        supabase.from('records').select('*', { count: 'exact', head: true }).not('entity_id', 'is', null),
        supabase.from('core_entities').select('*', { count: 'exact', head: true }),
        supabase.from('core_facts').select('*', { count: 'exact', head: true }),
        supabase.from('core_derived_insights').select('*', { count: 'exact', head: true }),
        supabase.from('api_circuit_breakers').select('*', { count: 'exact', head: true }).eq('state', 'open'),
        supabase.from('discovery_dead_letter').select('*', { count: 'exact', head: true }).is('recovered_at', null),
        supabase.from('auto_crawlers').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('dynamic_collectors').select('*', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      const total = totalRecords || 0;
      const resolved = resolvedRecords || 0;

      return {
        total_records: total,
        resolved_records: resolved,
        resolution_rate: total > 0 ? (resolved / total) * 100 : 0,
        total_entities: totalEntities || 0,
        total_facts: totalFacts || 0,
        total_insights: totalInsights || 0,
        open_circuits: openCircuits || 0,
        dead_letters: deadLetters || 0,
        active_crawlers: activeCrawlers || 0,
        active_collectors: activeCollectors || 0,
      };
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // ============================================================================
  // RECENT METRICS QUERY
  // ============================================================================
  
  const { data: recentMetrics } = useQuery({
    queryKey: ['flywheel-recent-metrics'],
    queryFn: async () => {
      const { data } = await supabase
        .from('flywheel_metrics')
        .select('*')
        .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: false })
        .limit(100);
      
      return data || [];
    },
    refetchInterval: 60000,
  });

  // ============================================================================
  // RUN FLYWHEEL MUTATION
  // ============================================================================
  
  const runFlywheel = useMutation({
    mutationFn: async (forceAll: boolean = false): Promise<FlywheelRunResult> => {
      setIsRunning(true);
      
      const { data, error } = await supabase.functions.invoke('flywheel-ultimate', {
        body: { force_all: forceAll },
      });
      
      if (error) throw error;
      return data as FlywheelRunResult;
    },
    onSuccess: (data) => {
      setLastResult(data);
      setIsRunning(false);
      
      queryClient.invalidateQueries({ queryKey: ['flywheel-health'] });
      queryClient.invalidateQueries({ queryKey: ['flywheel-stats'] });
      queryClient.invalidateQueries({ queryKey: ['flywheel-recent-metrics'] });
      
      toast({
        title: data.success ? '🚀 Flywheel Complete' : '⚠️ Flywheel Completed with Errors',
        description: `Health: ${data.health_score}/100 | ${data.metrics.records_resolved} resolved | ${data.processing_time_ms}ms`,
        variant: data.success ? 'default' : 'destructive',
      });
    },
    onError: (error) => {
      setIsRunning(false);
      toast({
        title: '💥 Flywheel Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  // ============================================================================
  // TRIGGER SPECIFIC PHASES
  // ============================================================================
  
  const triggerDiscovery = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('discovery-processor', {
      body: { action: 'process_queue', batch_size: 10 },
    });
    
    if (error) {
      toast({ title: 'Discovery Error', description: error.message, variant: 'destructive' });
      return null;
    }
    
    toast({ title: '🔍 Discovery Complete', description: `${data.approved || 0} approved` });
    queryClient.invalidateQueries({ queryKey: ['flywheel-stats'] });
    return data;
  }, [queryClient, toast]);

  const triggerEntityResolution = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('entity-resolver', {
      body: { backfill: true, batch_size: 100 },
    });
    
    if (error) {
      toast({ title: 'Resolution Error', description: error.message, variant: 'destructive' });
      return null;
    }
    
    toast({ 
      title: '🧬 Entity Resolution Complete', 
      description: `${data.records_processed || 0} resolved, ${data.entities_created || 0} created` 
    });
    queryClient.invalidateQueries({ queryKey: ['flywheel-stats'] });
    return data;
  }, [queryClient, toast]);

  const triggerFactExtraction = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('core-extract-facts', {
      body: { batch_size: 100, link_orphans: true },
    });
    
    if (error) {
      toast({ title: 'Fact Extraction Error', description: error.message, variant: 'destructive' });
      return null;
    }
    
    toast({ 
      title: '📊 Fact Extraction Complete', 
      description: `${data.facts_created || 0} facts, ${data.orphans_linked || 0} linked` 
    });
    queryClient.invalidateQueries({ queryKey: ['flywheel-stats'] });
    return data;
  }, [queryClient, toast]);

  const triggerScoring = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('core-scorer', {
      body: { batch_size: 100 },
    });
    
    if (error) {
      toast({ title: 'Scoring Error', description: error.message, variant: 'destructive' });
      return null;
    }
    
    toast({ 
      title: '🎯 Scoring Complete', 
      description: `${data.scored || 0} entities scored` 
    });
    queryClient.invalidateQueries({ queryKey: ['flywheel-stats'] });
    return data;
  }, [queryClient, toast]);

  const triggerGapAnalysis = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('discovery-processor', {
      body: { action: 'analyze_gaps' },
    });
    
    if (error) {
      toast({ title: 'Gap Analysis Error', description: error.message, variant: 'destructive' });
      return null;
    }
    
    toast({ 
      title: '🔬 Gap Analysis Complete', 
      description: `${data.gaps_found || 0} gaps, ${data.discoveries_queued || 0} queued` 
    });
    queryClient.invalidateQueries({ queryKey: ['flywheel-stats'] });
    return data;
  }, [queryClient, toast]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const healthScore = health?.score ?? 0;
  const targetScore = health?.target_score ?? 95;
  const scoreGap = targetScore - healthScore;
  
  const isHealthy = healthScore >= 80;
  const needsAttention = healthScore >= 60 && healthScore < 80;
  const isCritical = healthScore < 60;

  const getHealthColor = useCallback(() => {
    if (healthScore >= 90) return 'text-green-500';
    if (healthScore >= 75) return 'text-yellow-500';
    if (healthScore >= 60) return 'text-orange-500';
    return 'text-red-500';
  }, [healthScore]);

  const getHealthEmoji = useCallback(() => {
    if (healthScore >= 90) return '🚀';
    if (healthScore >= 75) return '✅';
    if (healthScore >= 60) return '⚠️';
    return '🔥';
  }, [healthScore]);

  // ============================================================================
  // AGGREGATE TODAY'S METRICS
  // ============================================================================
  
  const todayMetrics = useCallback(() => {
    if (!recentMetrics) return null;
    
    const today = new Date().toDateString();
    const todayMetrics = recentMetrics.filter(
      (m: any) => new Date(m.recorded_at).toDateString() === today
    );
    
    const aggregate = {
      invocations: 0,
      discoveries: 0,
      entities: 0,
      facts: 0,
      insights: 0,
      errors: 0,
    };
    
    for (const metric of todayMetrics) {
      if (metric.metric_name === 'ultimate_invocation') aggregate.invocations++;
      if (metric.metric_name === 'discoveries_approved') aggregate.discoveries += metric.metric_value;
      if (metric.metric_name === 'entities_created') aggregate.entities += metric.metric_value;
      if (metric.metric_name === 'facts_extracted') aggregate.facts += metric.metric_value;
      if (metric.metric_name === 'insights_generated') aggregate.insights += metric.metric_value;
      if (metric.metric_type === 'error') aggregate.errors++;
    }
    
    return aggregate;
  }, [recentMetrics]);

  return {
    // Health
    health,
    healthScore,
    targetScore,
    scoreGap,
    isHealthy,
    needsAttention,
    isCritical,
    getHealthColor,
    getHealthEmoji,
    
    // Stats
    stats,
    
    // Metrics
    recentMetrics,
    todayMetrics: todayMetrics(),
    
    // State
    isLoading: healthLoading || statsLoading,
    isRunning,
    lastResult,
    
    // Actions
    runFlywheel: runFlywheel.mutateAsync,
    refetchHealth,
    
    // Phase triggers
    triggerDiscovery,
    triggerEntityResolution,
    triggerFactExtraction,
    triggerScoring,
    triggerGapAnalysis,
  };
}
