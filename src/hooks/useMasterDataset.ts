// BASED DATA v6.0 - Master Dataset Hook
// Access and query the unified, ever-growing data lake

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { GeoJSONFeature, GeoJSONFeatureCollection, DataCategory } from '@/types/omniscient';

export interface DatasetQueryOptions {
  categories?: DataCategory[];
  sources?: string[];
  limit?: number;
  offset?: number;
  since?: string;
  minQuality?: number;
  search?: string;
}

export function useMasterDataset() {
  const [queryOptions, setQueryOptions] = useState<DatasetQueryOptions>({
    limit: 100,
    offset: 0,
  });

  // Get total record count
  const { data: totalCount } = useQuery({
    queryKey: ['master-dataset-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('records')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
    staleTime: 60000, // 1 minute
  });

  // Get unique categories
  const { data: categories } = useQuery({
    queryKey: ['master-dataset-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('records')
        .select('category')
        .limit(1000);
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      for (const row of data || []) {
        counts[row.category] = (counts[row.category] || 0) + 1;
      }
      
      return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    },
    staleTime: 60000,
  });

  // Get unique sources
  const { data: sources } = useQuery({
    queryKey: ['master-dataset-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('source_performance')
        .select('source_id, source_name, total_records_collected, reliability_score')
        .order('total_records_collected', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  // Query records with current options
  const { data: records, isLoading, refetch } = useQuery({
    queryKey: ['master-dataset-records', queryOptions],
    queryFn: async () => {
      let query = supabase
        .from('records')
        .select('*')
        .order('collected_at', { ascending: false })
        .range(queryOptions.offset || 0, (queryOptions.offset || 0) + (queryOptions.limit || 100) - 1);
      
      if (queryOptions.categories?.length) {
        query = query.in('category', queryOptions.categories);
      }
      
      if (queryOptions.sources?.length) {
        query = query.in('source_id', queryOptions.sources);
      }
      
      if (queryOptions.since) {
        query = query.gte('collected_at', queryOptions.since);
      }
      
      if (queryOptions.minQuality) {
        query = query.gte('quality_score', queryOptions.minQuality);
      }
      
      if (queryOptions.search) {
        query = query.or(`name.ilike.%${queryOptions.search}%,description.ilike.%${queryOptions.search}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    },
  });

  // Convert records to GeoJSON
  const toGeoJSON = useCallback((): GeoJSONFeatureCollection => {
    if (!records?.length) {
      return { type: 'FeatureCollection', features: [] };
    }
    
    const features: GeoJSONFeature[] = records.map(record => ({
      type: 'Feature',
      geometry: record.geometry as GeoJSONFeature['geometry'],
      properties: {
        source: record.source_id,
        source_id: record.source_record_id,
        category: record.category as DataCategory,
        name: record.name,
        description: record.description,
        timestamp: record.collected_at,
        confidence: record.quality_score,
        ...((record.properties || {}) as Record<string, any>),
      },
    }));
    
    return { type: 'FeatureCollection', features };
  }, [records]);

  // Get recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ['master-dataset-activity'],
    queryFn: async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const [dailyResult, weeklyResult] = await Promise.all([
        supabase
          .from('records')
          .select('*', { count: 'exact', head: true })
          .gte('collected_at', oneDayAgo.toISOString()),
        supabase
          .from('records')
          .select('*', { count: 'exact', head: true })
          .gte('collected_at', oneWeekAgo.toISOString()),
      ]);
      
      return {
        addedToday: dailyResult.count || 0,
        addedThisWeek: weeklyResult.count || 0,
      };
    },
    staleTime: 60000,
  });

  return {
    // Data
    records: records || [],
    totalCount: totalCount || 0,
    categories: categories || [],
    sources: sources || [],
    recentActivity,
    
    // GeoJSON conversion
    toGeoJSON,
    features: toGeoJSON(),
    
    // Query management
    queryOptions,
    setQueryOptions,
    refetch,
    isLoading,
    
    // Pagination helpers
    nextPage: useCallback(() => {
      setQueryOptions(prev => ({
        ...prev,
        offset: (prev.offset || 0) + (prev.limit || 100),
      }));
    }, []),
    prevPage: useCallback(() => {
      setQueryOptions(prev => ({
        ...prev,
        offset: Math.max(0, (prev.offset || 0) - (prev.limit || 100)),
      }));
    }, []),
    
    // Filter helpers
    filterByCategory: useCallback((categories: DataCategory[]) => {
      setQueryOptions(prev => ({ ...prev, categories, offset: 0 }));
    }, []),
    filterBySource: useCallback((sources: string[]) => {
      setQueryOptions(prev => ({ ...prev, sources, offset: 0 }));
    }, []),
    filterBySince: useCallback((since: string) => {
      setQueryOptions(prev => ({ ...prev, since, offset: 0 }));
    }, []),
    filterByQuality: useCallback((minQuality: number) => {
      setQueryOptions(prev => ({ ...prev, minQuality, offset: 0 }));
    }, []),
    search: useCallback((search: string) => {
      setQueryOptions(prev => ({ ...prev, search, offset: 0 }));
    }, []),
    clearFilters: useCallback(() => {
      setQueryOptions({ limit: 100, offset: 0 });
    }, []),
  };
}
