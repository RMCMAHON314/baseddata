// BASED DATA — New Data Source Hooks
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePlatformStats() {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_platform_stats' as any);
      if (error) throw error;
      const raw = data as any;
      // Handle all possible return shapes from the RPC
      if (!raw) return null;
      // If it's an array (e.g. [{get_platform_stats: {...}}] or [{...}])
      if (Array.isArray(raw)) {
        const first = raw[0];
        if (!first) return null;
        // Nested under function name key
        if (first.get_platform_stats) return first.get_platform_stats;
        return first;
      }
      // Direct object with function name key
      if (raw.get_platform_stats) return raw.get_platform_stats;
      // Direct object with stats keys
      return raw;
    },
    staleTime: 5 * 60_000, // 5 min — stats change infrequently
  });
}

export function useSbirAwards(filters?: { state?: string; agency?: string; phase?: string }) {
  return useQuery({
    queryKey: ['sbir-awards', filters],
    queryFn: async () => {
      let query = supabase.from('sbir_awards').select('*').order('award_amount', { ascending: false }).limit(100);
      if (filters?.state) query = query.eq('state', filters.state);
      if (filters?.agency) query = query.ilike('agency', `%${filters.agency}%`);
      if (filters?.phase) query = query.eq('phase', filters.phase);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useSamEntities(filters?: { state?: string; status?: string }) {
  return useQuery({
    queryKey: ['sam-entities', filters],
    queryFn: async () => {
      let query = supabase.from('sam_entities').select('*').order('legal_business_name').limit(100);
      if (filters?.state) query = query.eq('physical_state', filters.state);
      if (filters?.status) query = query.eq('registration_status', filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useExclusions() {
  return useQuery({
    queryKey: ['sam-exclusions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sam_exclusions').select('*')
        .order('active_date', { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export function useNsfAwards(filters?: { state?: string; keyword?: string }) {
  return useQuery({
    queryKey: ['nsf-awards', filters],
    queryFn: async () => {
      let query = supabase.from('nsf_awards').select('*').order('award_amount', { ascending: false }).limit(100);
      if (filters?.state) query = query.eq('institution_state', filters.state);
      if (filters?.keyword) query = query.ilike('title', `%${filters.keyword}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useFpdsAwards(filters?: { department?: string; naics?: string; state?: string }) {
  return useQuery({
    queryKey: ['fpds-awards', filters],
    queryFn: async () => {
      let query = supabase.from('fpds_awards').select('*').order('dollars_obligated', { ascending: false }).limit(100);
      if (filters?.department) query = query.ilike('contracting_department', `%${filters.department}%`);
      if (filters?.naics) query = query.eq('naics_code', filters.naics);
      if (filters?.state) query = query.eq('pop_state', filters.state);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useSubawards(filters?: { state?: string; prime?: string }) {
  return useQuery({
    queryKey: ['subawards', filters],
    queryFn: async () => {
      let query = supabase.from('subawards').select('*').order('subaward_amount', { ascending: false }).limit(100);
      if (filters?.state) query = query.eq('sub_awardee_state', filters.state);
      if (filters?.prime) query = query.ilike('prime_recipient_name', `%${filters.prime}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useVacuumRuns() {
  return useQuery({
    queryKey: ['vacuum-runs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vacuum_runs').select('*').order('started_at', { ascending: false }).limit(10);
      if (error) throw error;
      return data;
    },
  });
}

export function useGsaLaborRates(keyword?: string) {
  return useQuery({
    queryKey: ['gsa-labor-rates', keyword],
    queryFn: async () => {
      let query = (supabase.from as any)('gsa_labor_rates').select('*').order('current_price', { ascending: false }).limit(200);
      if (keyword) query = query.ilike('labor_category', `%${keyword}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!keyword,
  });
}

export function useLaborRateStats(keyword: string) {
  return useQuery({
    queryKey: ['labor-rate-stats', keyword],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_labor_rate_stats' as any, { p_keyword: keyword });
      if (error) throw error;
      return (data as any)?.[0] || null;
    },
    enabled: !!keyword && keyword.length > 2,
  });
}

// Legacy — kept for backward compat but prefer usePlatformStats
export function useAllSourceCounts() {
  return usePlatformStats();
}
