// Rate limit awareness hook — checks API key usage and warns user
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useRateLimitGuard() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ['rate-limit-status', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('api_keys')
        .select('requests_today, rate_limit_per_day, requests_this_minute, rate_limit_per_minute')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const isNearDailyLimit = data ? (data.requests_today || 0) >= (data.rate_limit_per_day || 1000) * 0.9 : false;
  const isAtDailyLimit = data ? (data.requests_today || 0) >= (data.rate_limit_per_day || 1000) : false;
  const remainingToday = data ? Math.max(0, (data.rate_limit_per_day || 1000) - (data.requests_today || 0)) : null;

  return { isNearDailyLimit, isAtDailyLimit, remainingToday, usage: data };
}
