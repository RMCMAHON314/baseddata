// BASED DATA v6.0 - Auto-Crawler Hook
// Manage autonomous data discovery crawlers

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AutoCrawler, CrawlerRun, DiscoveredSource, MasterDatasetStats } from '@/types/baseddata';

export function useAutoCrawlers() {
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);

  // Fetch all crawlers
  const { data: crawlers, isLoading: loadingCrawlers } = useQuery({
    queryKey: ['auto-crawlers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auto_crawlers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as AutoCrawler[];
    },
  });

  // Fetch recent crawler runs
  const { data: recentRuns, isLoading: loadingRuns } = useQuery({
    queryKey: ['crawler-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crawler_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as CrawlerRun[];
    },
  });

  // Fetch discovered sources
  const { data: discoveredSources, isLoading: loadingSources } = useQuery({
    queryKey: ['discovered-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discovered_sources')
        .select('*')
        .order('discovered_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as DiscoveredSource[];
    },
  });

  // Fetch master dataset stats
  const { data: masterStats } = useQuery({
    queryKey: ['master-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_dataset_stats')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as MasterDatasetStats | null;
    },
  });

  // Create a new crawler
  const createCrawler = useMutation({
    mutationFn: async (crawler: Record<string, any>) => {
      const { data, error } = await supabase
        .from('auto_crawlers')
        .insert(crawler as any)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-crawlers'] });
      toast.success('Crawler created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create crawler: ${error.message}`);
    },
  });

  // Update a crawler
  const updateCrawler = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { data, error } = await supabase
        .from('auto_crawlers')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-crawlers'] });
      toast.success('Crawler updated');
    },
  });

  // Delete a crawler
  const deleteCrawler = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('auto_crawlers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-crawlers'] });
      toast.success('Crawler deleted');
    },
  });

  // Run a specific crawler
  const runCrawler = useCallback(async (crawlerId?: string) => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-crawler', {
        body: crawlerId ? { crawler_id: crawlerId } : { run_all: true },
      });
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['crawler-runs'] });
      queryClient.invalidateQueries({ queryKey: ['discovered-sources'] });
      queryClient.invalidateQueries({ queryKey: ['master-stats'] });
      
      if (data.results?.length) {
        const successful = data.results.filter((r: any) => r.success).length;
        const totalSources = data.results.reduce((sum: number, r: any) => sum + (r.sources_discovered || 0), 0);
        toast.success(`${successful} crawler(s) completed, ${totalSources} new sources discovered`);
      }
      
      return data;
    } catch (error: any) {
      toast.error(`Crawler failed: ${error.message}`);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, [queryClient]);

  // Approve/reject a discovered source
  const reviewSource = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { data, error } = await supabase
        .from('discovered_sources')
        .update({ 
          review_status: status, 
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['discovered-sources'] });
      toast.success(`Source ${status}`);
    },
  });

  // Get stats summary
  const getStatsSummary = useCallback(() => {
    if (!masterStats) return null;
    
    return {
      totalRecords: masterStats.total_records,
      totalSources: masterStats.total_sources,
      totalCategories: masterStats.total_categories,
      avgQuality: masterStats.avg_quality_score,
      growthToday: masterStats.records_added_today,
      growthWeek: masterStats.records_added_this_week,
      growthMonth: masterStats.records_added_this_month,
      topCategories: Object.entries(masterStats.records_by_category)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
    };
  }, [masterStats]);

  return {
    // Data
    crawlers: crawlers || [],
    recentRuns: recentRuns || [],
    discoveredSources: discoveredSources || [],
    masterStats,
    
    // Loading states
    isLoading: loadingCrawlers || loadingRuns || loadingSources,
    isRunning,
    
    // Actions
    createCrawler: createCrawler.mutate,
    updateCrawler: updateCrawler.mutate,
    deleteCrawler: deleteCrawler.mutate,
    runCrawler,
    reviewSource: reviewSource.mutate,
    
    // Helpers
    getStatsSummary,
    
    // Computed
    activeCrawlers: crawlers?.filter(c => c.is_active) || [],
    pendingSources: discoveredSources?.filter(s => s.review_status === 'pending') || [],
    totalDiscovered: discoveredSources?.length || 0,
  };
}
