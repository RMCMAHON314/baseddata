// ============================================================================
// BASED DATA v10.0 - Search History Hook
// Manages persistent query history with snapshots
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HistorySnapshot {
  stats: {
    unique_records: number;
    high_relevance: number;
    avg_relevance: number;
    geo_percent: number;
    query_time_ms: number;
    sources: number;
    categories: number;
  };
  categories: Array<{ name: string; count: number; avg_relevance?: number }>;
  sources: Array<{ name: string; count: number }>;
  top_results: Array<{
    id: string;
    name: string;
    category: string;
    relevance_score: number;
    lat?: number;
    lng?: number;
  }>;
  query_analysis: {
    core_entity: string;
    location: string;
    keywords: string[];
  };
  bounds?: { north: number; south: number; east: number; west: number };
}

export interface HistoryItem {
  id: string;
  title: string;
  prompt: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  last_accessed_at: string | null;
  access_count: number;
  is_saved: boolean;
  result_count: number;
  avg_relevance_score: number | null;
  high_relevance_count: number;
  processing_time_ms: number | null;
  snapshot: HistorySnapshot | null;
  sources_queried: string[];
  categories_matched: string[];
}

export interface GroupedHistory {
  today: HistoryItem[];
  yesterday: HistoryItem[];
  thisWeek: HistoryItem[];
  thisMonth: HistoryItem[];
  older: HistoryItem[];
}

// Session ID for anonymous users
const getSessionId = (): string => {
  let sessionId = localStorage.getItem('baseddata_session_id');
  if (!sessionId) {
    sessionId = `sess_${crypto.randomUUID()}`;
    localStorage.setItem('baseddata_session_id', sessionId);
  }
  return sessionId;
};

export function useSearchHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = useMemo(() => getSessionId(), []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('queries')
        .select(`
          id, title, prompt, status, created_at, last_accessed_at, 
          access_count, is_saved, result_count, avg_relevance_score,
          high_relevance_count, processing_time_ms, snapshot,
          sources_queried, categories_matched
        `)
        .eq('session_id', sessionId)
        .in('status', ['completed', 'failed', 'pending'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      
      const mappedHistory: HistoryItem[] = (data || []).map(item => ({
        id: item.id,
        title: item.title || '',
        prompt: item.prompt,
        status: (item.status as 'pending' | 'completed' | 'failed') || 'pending',
        created_at: item.created_at,
        last_accessed_at: item.last_accessed_at,
        access_count: item.access_count || 1,
        is_saved: item.is_saved || false,
        result_count: item.result_count || 0,
        avg_relevance_score: item.avg_relevance_score,
        high_relevance_count: item.high_relevance_count || 0,
        processing_time_ms: item.processing_time_ms,
        snapshot: item.snapshot ? (item.snapshot as unknown as HistorySnapshot) : null,
        sources_queried: item.sources_queried || [],
        categories_matched: item.categories_matched || [],
      }));
      
      setHistory(mappedHistory);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch history';
      setError(message);
      console.error('History fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Initial fetch
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Real-time subscription for updates
  useEffect(() => {
    const channel = supabase
      .channel('history_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queries',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId, fetchHistory]);

  // Group history by date
  const groupedHistory = useMemo((): GroupedHistory => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const groups: GroupedHistory = {
      today: [],
      yesterday: [],
      thisWeek: [],
      thisMonth: [],
      older: [],
    };

    history.forEach(item => {
      const date = new Date(item.created_at);
      if (date >= today) groups.today.push(item);
      else if (date >= yesterday) groups.yesterday.push(item);
      else if (date >= weekAgo) groups.thisWeek.push(item);
      else if (date >= monthAgo) groups.thisMonth.push(item);
      else groups.older.push(item);
    });

    return groups;
  }, [history]);

  // Toggle saved status
  const toggleSaved = useCallback(async (id: string) => {
    const item = history.find(h => h.id === id);
    if (!item) return;

    const newSaved = !item.is_saved;
    
    // Optimistic update
    setHistory(prev => 
      prev.map(h => h.id === id ? { ...h, is_saved: newSaved } : h)
    );

    try {
      const { error: updateError } = await supabase
        .from('queries')
        .update({ is_saved: newSaved })
        .eq('id', id);

      if (updateError) throw updateError;
    } catch (err) {
      // Revert on error
      setHistory(prev => 
        prev.map(h => h.id === id ? { ...h, is_saved: !newSaved } : h)
      );
      console.error('Failed to toggle saved:', err);
    }
  }, [history]);

  // Delete a query from history
  const deleteQuery = useCallback(async (id: string) => {
    // Optimistic removal
    setHistory(prev => prev.filter(h => h.id !== id));

    try {
      const { error: deleteError } = await supabase
        .from('queries')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
    } catch (err) {
      // Refetch on error
      fetchHistory();
      console.error('Failed to delete query:', err);
    }
  }, [fetchHistory]);

  // Increment access count when viewing a query
  const trackAccess = useCallback(async (id: string) => {
    try {
      await supabase.rpc('increment_query_access_count', { query_uuid: id });
      
      // Update local state
      setHistory(prev =>
        prev.map(h =>
          h.id === id
            ? { ...h, access_count: h.access_count + 1, last_accessed_at: new Date().toISOString() }
            : h
        )
      );
    } catch (err) {
      console.error('Failed to track access:', err);
    }
  }, []);

  // Get saved queries only
  const savedQueries = useMemo(
    () => history.filter(h => h.is_saved),
    [history]
  );

  // Get recent queries (last 5)
  const recentQueries = useMemo(
    () => history.slice(0, 5),
    [history]
  );

  // Stats
  const stats = useMemo(() => ({
    totalQueries: history.length,
    savedCount: savedQueries.length,
    completedCount: history.filter(h => h.status === 'completed').length,
    failedCount: history.filter(h => h.status === 'failed').length,
    avgRelevance: history.length > 0
      ? history.reduce((sum, h) => sum + (h.avg_relevance_score || 0), 0) / history.filter(h => h.avg_relevance_score).length
      : 0,
  }), [history, savedQueries]);

  return {
    history,
    groupedHistory,
    savedQueries,
    recentQueries,
    stats,
    loading,
    error,
    sessionId,
    refresh: fetchHistory,
    toggleSaved,
    deleteQuery,
    trackAccess,
  };
}

// Export session ID getter for edge functions
export { getSessionId };
