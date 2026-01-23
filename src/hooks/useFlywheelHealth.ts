// ============================================================================
// BASED DATA v10.0 - Flywheel Health Hook
// Real-time monitoring of the discovery pipeline
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FlywheelHealth {
  queue_depth: number;
  processing: number;
  approved_today: number;
  failed_today: number;
  dead_letter_count: number;
  open_circuits: number;
  active_collectors: number;
  active_crawlers: number;
  total_records: number;
  records_today: number;
}

export interface CircuitBreaker {
  id: string;
  api_domain: string;
  state: 'closed' | 'open' | 'half_open';
  failure_count: number;
  success_count: number;
  last_failure_at: string | null;
  opened_at: string | null;
  timeout_seconds: number;
}

export interface FlywheelMetric {
  id: string;
  metric_type: string;
  metric_name: string;
  metric_value: number;
  dimensions: Record<string, any>;
  recorded_at: string;
}

export function useFlywheelHealth() {
  const queryClient = useQueryClient();

  // Fetch health snapshot
  const { data: health, isLoading: loadingHealth, refetch: refetchHealth } = useQuery({
    queryKey: ['flywheel-health'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_flywheel_health');
      if (error) throw error;
      return data as unknown as FlywheelHealth;
    },
    refetchInterval: 30000,
  });

  // Fetch circuit breakers
  const { data: circuits, isLoading: loadingCircuits } = useQuery({
    queryKey: ['circuit-breakers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_circuit_breakers')
        .select('*')
        .order('last_failure_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as CircuitBreaker[];
    },
  });

  // Fetch recent metrics
  const { data: metrics } = useQuery({
    queryKey: ['flywheel-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flywheel_metrics')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as FlywheelMetric[];
    },
  });

  // Fetch dead letter queue
  const { data: deadLetterQueue } = useQuery({
    queryKey: ['dead-letter-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discovery_dead_letter')
        .select('*')
        .is('recovered_at', null)
        .order('last_failed_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Trigger discovery processing
  const processQueue = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('discovery-processor', {
        body: { action: 'process_queue', batch_size: 5 },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['flywheel-health'] });
      queryClient.invalidateQueries({ queryKey: ['source-discoveries'] });
      toast.success(`Processed ${data.processed} discoveries, ${data.approved} approved`);
    },
    onError: (error) => {
      toast.error(`Processing failed: ${error.message}`);
    },
  });

  // Trigger crawler run
  const runCrawlers = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('auto-crawler', {
        body: { run_all: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['flywheel-health'] });
      queryClient.invalidateQueries({ queryKey: ['discovered-sources'] });
      toast.success(`Ran ${data.crawlers_run} crawlers, found ${data.total_sources_discovered} sources`);
    },
    onError: (error) => {
      toast.error(`Crawlers failed: ${error.message}`);
    },
  });

  // Run gap analysis
  const analyzeGaps = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('discovery-processor', {
        body: { action: 'analyze_gaps' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gap-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['source-discoveries'] });
      toast.success(`Found ${data.gaps_found} gaps, queued ${data.discoveries_queued} discoveries`);
    },
  });

  // Recover dead letter items
  const recoverDeadLetter = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('discovery-processor', {
        body: { action: 'recover_dead_letter' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dead-letter-queue'] });
      queryClient.invalidateQueries({ queryKey: ['source-discoveries'] });
      toast.success(`Recovered ${data.recovered} items from dead letter queue`);
    },
  });

  // Reset circuit breakers
  const resetCircuits = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('auto-crawler', {
        body: { action: 'reset_circuits' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circuit-breakers'] });
      queryClient.invalidateQueries({ queryKey: ['flywheel-health'] });
      toast.success('Circuit breakers reset');
    },
  });

  // Compute aggregated metrics
  const getMetricsSummary = () => {
    if (!metrics?.length) return null;
    
    const today = new Date().toISOString().split('T')[0];
    const todayMetrics = metrics.filter(m => m.recorded_at.startsWith(today));
    
    return {
      invocations: todayMetrics.filter(m => m.metric_name === 'invocation').length,
      avgProcessingTime: Math.round(
        todayMetrics
          .filter(m => m.metric_name === 'processing_time_ms')
          .reduce((sum, m) => sum + m.metric_value, 0) /
        Math.max(1, todayMetrics.filter(m => m.metric_name === 'processing_time_ms').length)
      ),
      errorsToday: todayMetrics.filter(m => m.metric_type === 'error').length,
    };
  };

  // Health score (0-100)
  const calculateHealthScore = (): number => {
    if (!health) return 0;
    
    let score = 100;
    
    // Penalize for queue backlog
    if (health.queue_depth > 50) score -= 20;
    else if (health.queue_depth > 20) score -= 10;
    
    // Penalize for dead letters
    if (health.dead_letter_count > 10) score -= 15;
    else if (health.dead_letter_count > 0) score -= 5;
    
    // Penalize for open circuits
    score -= health.open_circuits * 5;
    
    // Bonus for approvals
    if (health.approved_today > 0) score = Math.min(100, score + 5);
    
    // Bonus for active growth
    if (health.records_today > 0) score = Math.min(100, score + 5);
    
    return Math.max(0, score);
  };

  return {
    // Data
    health,
    circuits: circuits || [],
    metrics: metrics || [],
    deadLetterQueue: deadLetterQueue || [],
    
    // Loading
    isLoading: loadingHealth || loadingCircuits,
    
    // Actions
    processQueue: processQueue.mutate,
    runCrawlers: runCrawlers.mutate,
    analyzeGaps: analyzeGaps.mutate,
    recoverDeadLetter: recoverDeadLetter.mutate,
    resetCircuits: resetCircuits.mutate,
    refetchHealth,
    
    // Processing states
    isProcessing: processQueue.isPending,
    isCrawling: runCrawlers.isPending,
    
    // Computed
    healthScore: calculateHealthScore(),
    metricsSummary: getMetricsSummary(),
    openCircuits: circuits?.filter(c => c.state === 'open') || [],
    halfOpenCircuits: circuits?.filter(c => c.state === 'half_open') || [],
  };
}
