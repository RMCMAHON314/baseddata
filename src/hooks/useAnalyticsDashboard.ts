import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAnalyticsDashboard() {
  // KPI stats
  const kpis = useQuery({
    queryKey: ['analytics-kpis'],
    queryFn: async () => {
      const [entities, opportunities, grants, insights, statsRes] = await Promise.all([
        supabase.from('core_entities').select('id', { count: 'exact', head: true }),
        supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('grants').select('id', { count: 'exact', head: true }),
        supabase.from('core_derived_insights').select('id', { count: 'exact', head: true }),
        supabase.rpc('get_platform_stats'),
      ]);
      const { data: totalData } = statsRes;
      const stats = totalData as any;
      return {
        totalContractValue: stats?.contract_value || 0,
        entityCount: entities.count || 0,
        opportunityCount: opportunities.count || 0,
        grantCount: grants.count || 0,
        insightCount: insights.count || 0,
      };
    },
    staleTime: 60000,
  });

  // All aggregations in a single RPC call (was 8 separate queries fetching 9K+ rows each)
  const aggregations = useQuery({
    queryKey: ['analytics-aggregations'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_analytics_aggregations');
      if (error) throw error;
      const d = data as any;
      return {
        agencySpending: (d?.agency_spending || []).map((a: any) => ({
          name: a.name?.length > 28 ? a.name.slice(0, 28) + '…' : a.name,
          fullName: a.name,
          value: Number(a.value) || 0,
        })),
        topContractors: (d?.top_contractors || []).map((e: any) => ({
          id: e.id,
          name: e.name?.length > 25 ? e.name.slice(0, 25) + '…' : e.name,
          fullName: e.name,
          value: Number(e.value) || 0,
        })),
        geoDistribution: (d?.geo_distribution || []).map((g: any) => ({
          state: g.state,
          value: Number(g.value) || 0,
          count: Number(g.count) || 0,
        })),
        naicsSectors: (d?.naics_sectors || []).map((n: any) => ({
          code: n.code,
          value: Number(n.value) || 0,
        })),
        setAsideAnalysis: (d?.set_aside || []).map((s: any) => ({
          type: s.type?.length > 20 ? s.type.slice(0, 20) + '…' : s.type,
          value: Number(s.value) || 0,
        })),
        contractTypeMix: (d?.contract_types || []).map((c: any) => ({
          type: c.type,
          value: Number(c.value) || 0,
        })),
        grantsByAgency: (d?.grants_by_agency || []).map((g: any) => ({
          name: g.name?.length > 25 ? g.name.slice(0, 25) + '…' : g.name,
          value: Number(g.value) || 0,
        })),
        laborRates: (d?.labor_rates || []).map((l: any) => ({
          category: l.category?.length > 22 ? l.category.slice(0, 22) + '…' : l.category,
          avg: Number(l.avg) || 0,
          min: Number(l.min) || 0,
          max: Number(l.max) || 0,
        })),
        spendingTimeline: (d?.spending_timeline || []).map((s: any) => ({
          quarter: s.quarter,
          contracts: Number(s.contracts) || 0,
          grants: Number(s.grants) || 0,
        })),
      };
    },
    staleTime: 300000,
  });

  // Return individual query-compatible objects for backward compat
  return {
    kpis,
    agencySpending: { data: aggregations.data?.agencySpending, isLoading: aggregations.isLoading },
    spendingTimeline: { data: aggregations.data?.spendingTimeline, isLoading: aggregations.isLoading },
    topContractors: { data: aggregations.data?.topContractors, isLoading: aggregations.isLoading },
    geoDistribution: { data: aggregations.data?.geoDistribution, isLoading: aggregations.isLoading },
    naicsSectors: { data: aggregations.data?.naicsSectors, isLoading: aggregations.isLoading },
    setAsideAnalysis: { data: aggregations.data?.setAsideAnalysis, isLoading: aggregations.isLoading },
    contractTypeMix: { data: aggregations.data?.contractTypeMix, isLoading: aggregations.isLoading },
    grantsByAgency: { data: aggregations.data?.grantsByAgency, isLoading: aggregations.isLoading },
    laborRates: { data: aggregations.data?.laborRates, isLoading: aggregations.isLoading },
  };
}
