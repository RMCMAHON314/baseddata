// ============================================================================
// BASED DATA v7.0 - Discovery Engine Hook
// Manages the Continuous Discovery Flywheel from the frontend
// ============================================================================

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  SourceDiscovery, 
  GapAnalysisResult, 
  DiscoveryMetrics,
  DiscoveryTrigger,
  DiscoveryStatus 
} from '@/lib/discovery';

// ============================================================================
// HOOK RETURN INTERFACE
// ============================================================================

interface UseDiscoveryEngineReturn {
  // Data
  discoveries: SourceDiscovery[];
  gaps: GapAnalysisResult[];
  metrics: DiscoveryMetrics | null;
  pendingCount: number;
  
  // Loading states
  isLoading: boolean;
  isProcessing: boolean;
  
  // Actions
  queueDiscovery: (params: QueueDiscoveryParams) => Promise<string | null>;
  analyzeGaps: () => Promise<void>;
  processQueue: () => Promise<void>;
  updateDiscoveryStatus: (id: string, status: DiscoveryStatus) => Promise<void>;
  
  // Computed
  discoveryFunnel: DiscoveryFunnel;
  categoryGaps: CategoryGap[];
}

interface QueueDiscoveryParams {
  triggerType: DiscoveryTrigger;
  triggerId?: string;
  triggerPrompt?: string;
  targetApiName: string;
  targetApiUrl?: string;
  targetDescription?: string;
  inferredCategories?: string[];
  inferredKeywords?: string[];
  priority?: number;
  confidence?: number;
}

interface DiscoveryFunnel {
  queued: number;
  validating: number;
  generating: number;
  testing: number;
  approved: number;
  failed: number;
}

interface CategoryGap {
  category: string;
  severity: number;
  recordCount: number;
  percentage: number;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useDiscoveryEngine(): UseDiscoveryEngineReturn {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch all pending/active discoveries
  const { data: discoveries = [], isLoading: loadingDiscoveries } = useQuery({
    queryKey: ['source-discoveries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('source_discoveries')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (error) throw error;
      return (data || []) as unknown as SourceDiscovery[];
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  // Fetch gap analysis results
  const { data: gaps = [], isLoading: loadingGaps } = useQuery({
    queryKey: ['gap-analysis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gap_analysis')
        .select('*')
        .in('status', ['open', 'in_progress'])
        .order('severity', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as unknown as GapAnalysisResult[];
    },
  });

  // Fetch today's metrics
  const { data: metrics } = useQuery({
    queryKey: ['discovery-metrics'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('discovery_metrics')
        .select('*')
        .eq('date', today)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return (data as unknown as DiscoveryMetrics) || null;
    },
  });

  // Queue a new discovery
  const queueMutation = useMutation({
    mutationFn: async (params: QueueDiscoveryParams) => {
      const { data, error } = await supabase.rpc('queue_discovery', {
        p_trigger_type: params.triggerType,
        p_trigger_id: params.triggerId || null,
        p_trigger_prompt: params.triggerPrompt || null,
        p_target_api_name: params.targetApiName,
        p_target_api_url: params.targetApiUrl || null,
        p_target_description: params.targetDescription || null,
        p_inferred_categories: params.inferredCategories || [],
        p_inferred_keywords: params.inferredKeywords || [],
        p_priority: params.priority || 5,
        p_confidence: params.confidence || 0.5,
      });
      
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source-discoveries'] });
      toast.success('Discovery queued successfully');
    },
    onError: (error) => {
      toast.error(`Failed to queue discovery: ${error.message}`);
    },
  });

  // Analyze gaps
  const analyzeGaps = useCallback(async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc('analyze_data_gaps');
      
      if (error) throw error;
      
      // Insert new gaps
      for (const gap of data || []) {
        await supabase.from('gap_analysis').upsert({
          gap_type: gap.gap_type,
          gap_description: gap.gap_description,
          severity: gap.severity,
          target_category: gap.target_category,
          target_keywords: gap.target_keywords,
          status: 'open',
        }, {
          onConflict: 'gap_type,target_category',
          ignoreDuplicates: true,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['gap-analysis'] });
      toast.success(`Found ${data?.length || 0} gaps to address`);
    } catch (error: any) {
      toast.error(`Gap analysis failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [queryClient]);

  // Process discovery queue (triggers backend)
  const processQueue = useCallback(async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('discovery-processor', {
        body: { action: 'process_queue' },
      });
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['source-discoveries'] });
      queryClient.invalidateQueries({ queryKey: ['discovery-metrics'] });
      
      const processed = data?.processed || 0;
      const approved = data?.approved || 0;
      toast.success(`Processed ${processed} discoveries, ${approved} approved`);
    } catch (error: any) {
      toast.error(`Queue processing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [queryClient]);

  // Update discovery status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DiscoveryStatus }) => {
      const { data, error } = await supabase.rpc('update_discovery_status', {
        p_discovery_id: id,
        p_status: status,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source-discoveries'] });
    },
  });

  // Compute discovery funnel
  const discoveryFunnel: DiscoveryFunnel = {
    queued: discoveries.filter(d => d.status === 'pending').length,
    validating: discoveries.filter(d => d.status === 'validating').length,
    generating: discoveries.filter(d => d.status === 'generating').length,
    testing: discoveries.filter(d => d.status === 'testing').length,
    approved: discoveries.filter(d => d.status === 'approved').length,
    failed: discoveries.filter(d => d.status === 'failed' || d.status === 'rejected').length,
  };

  // Compute category gaps from gap analysis
  const categoryGaps: CategoryGap[] = gaps
    .filter(g => g.gap_type === 'categorical' && g.target_category)
    .map(g => ({
      category: g.target_category!,
      severity: g.severity,
      recordCount: 0, // Would need to fetch from stats
      percentage: (1 - g.severity) * 3, // Approximate from severity
    }));

  return {
    // Data
    discoveries,
    gaps,
    metrics,
    pendingCount: discoveryFunnel.queued,
    
    // Loading states
    isLoading: loadingDiscoveries || loadingGaps,
    isProcessing,
    
    // Actions
    queueDiscovery: async (params) => queueMutation.mutateAsync(params),
    analyzeGaps,
    processQueue,
    updateDiscoveryStatus: async (id, status) => { await updateStatus.mutateAsync({ id, status }); },
    
    // Computed
    discoveryFunnel,
    categoryGaps,
  };
}
