import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

export function useLastRefresh() {
  return useQuery({
    queryKey: ['last-refresh'],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      return data?.updated_at || null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function formatRefreshTime(timestamp: string | null) {
  if (!timestamp) return null;
  const diff = Date.now() - new Date(timestamp).getTime();
  const hours = diff / (1000 * 60 * 60);
  if (hours < 24) return '📡 Data is current';
  return `📡 Data last refreshed ${formatDistanceToNow(new Date(timestamp), { addSuffix: true })}`;
}
