// BASED DATA — New Data Source Hooks
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

export function useAllSourceCounts() {
  return useQuery({
    queryKey: ['all-source-counts'],
    queryFn: async () => {
      const [contracts, opps, sbir, samEnts, excl, nsf, fpds, grants, entities, subs] = await Promise.all([
        supabase.from('contracts').select('*', { count: 'exact', head: true }),
        supabase.from('opportunities').select('*', { count: 'exact', head: true }),
        supabase.from('sbir_awards').select('*', { count: 'exact', head: true }),
        supabase.from('sam_entities').select('*', { count: 'exact', head: true }),
        supabase.from('sam_exclusions').select('*', { count: 'exact', head: true }),
        supabase.from('nsf_awards').select('*', { count: 'exact', head: true }),
        supabase.from('fpds_awards').select('*', { count: 'exact', head: true }),
        supabase.from('grants').select('*', { count: 'exact', head: true }),
        supabase.from('core_entities').select('*', { count: 'exact', head: true }),
        supabase.from('subawards').select('*', { count: 'exact', head: true }),
      ]);
      return {
        contracts: contracts.count || 0,
        opportunities: opps.count || 0,
        sbir: sbir.count || 0,
        samEntities: samEnts.count || 0,
        exclusions: excl.count || 0,
        nsf: nsf.count || 0,
        fpds: fpds.count || 0,
        grants: grants.count || 0,
        entities: entities.count || 0,
        subawards: subs.count || 0,
        totalRecords: (contracts.count || 0) + (opps.count || 0) + (sbir.count || 0) + (samEnts.count || 0) + (excl.count || 0) + (nsf.count || 0) + (fpds.count || 0) + (grants.count || 0) + (subs.count || 0),
      };
    },
    staleTime: 30 * 1000,
  });
}
