import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAnalyticsDashboard() {
  // KPI stats
  const kpis = useQuery({
    queryKey: ['analytics-kpis'],
    queryFn: async () => {
      const [contracts, entities, opportunities, grants, insights] = await Promise.all([
        supabase.from('contracts').select('award_amount.sum()').single(),
        supabase.from('core_entities').select('id', { count: 'exact', head: true }),
        supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('grants').select('id', { count: 'exact', head: true }),
        supabase.from('core_derived_insights').select('id', { count: 'exact', head: true }),
      ]);
      // Fallback: get total from raw query
      const { data: totalData } = await supabase.rpc('get_platform_stats');
      const stats = totalData as any;
      return {
        totalContractValue: stats?.total_contract_value || 0,
        entityCount: entities.count || 0,
        opportunityCount: opportunities.count || 0,
        grantCount: grants.count || 0,
        insightCount: insights.count || 0,
      };
    },
    staleTime: 60000,
  });

  // Spending by agency (top 20)
  const agencySpending = useQuery({
    queryKey: ['analytics-agency-spending'],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('awarding_agency, award_amount')
        .not('awarding_agency', 'is', null)
        .not('award_amount', 'is', null);
      const map = new Map<string, number>();
      (data || []).forEach(c => {
        const key = c.awarding_agency!;
        map.set(key, (map.get(key) || 0) + Number(c.award_amount));
      });
      return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([name, value]) => ({ name: name.length > 28 ? name.slice(0, 28) + '…' : name, fullName: name, value }));
    },
    staleTime: 300000,
  });

  // Timeline (contracts by quarter + grants overlay)
  const spendingTimeline = useQuery({
    queryKey: ['analytics-spending-timeline'],
    queryFn: async () => {
      const [contractRes, grantRes] = await Promise.all([
        supabase.from('contracts').select('award_amount, award_date').not('award_date', 'is', null),
        supabase.from('grants').select('award_amount, start_date').not('start_date', 'is', null),
      ]);
      const map = new Map<string, { contracts: number; grants: number }>();
      (contractRes.data || []).forEach(c => {
        const d = new Date(c.award_date!);
        const key = `${d.getFullYear()} Q${Math.ceil((d.getMonth() + 1) / 3)}`;
        const e = map.get(key) || { contracts: 0, grants: 0 };
        e.contracts += Number(c.award_amount) || 0;
        map.set(key, e);
      });
      (grantRes.data || []).forEach(g => {
        const d = new Date(g.start_date!);
        const key = `${d.getFullYear()} Q${Math.ceil((d.getMonth() + 1) / 3)}`;
        const e = map.get(key) || { contracts: 0, grants: 0 };
        e.grants += Number(g.award_amount) || 0;
        map.set(key, e);
      });
      return Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([quarter, { contracts, grants }]) => ({ quarter, contracts, grants }));
    },
    staleTime: 300000,
  });

  // Top contractors
  const topContractors = useQuery({
    queryKey: ['analytics-top-contractors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('core_entities')
        .select('id, canonical_name, total_contract_value')
        .not('total_contract_value', 'is', null)
        .order('total_contract_value', { ascending: false })
        .limit(20);
      return (data || []).map(e => ({
        id: e.id,
        name: e.canonical_name.length > 25 ? e.canonical_name.slice(0, 25) + '…' : e.canonical_name,
        fullName: e.canonical_name,
        value: Number(e.total_contract_value) || 0,
      }));
    },
    staleTime: 300000,
  });

  // Geographic distribution
  const geoDistribution = useQuery({
    queryKey: ['analytics-geo-distribution'],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('pop_state, award_amount')
        .not('pop_state', 'is', null);
      const map = new Map<string, { value: number; count: number }>();
      (data || []).forEach(c => {
        const e = map.get(c.pop_state!) || { value: 0, count: 0 };
        e.value += Number(c.award_amount) || 0;
        e.count++;
        map.set(c.pop_state!, e);
      });
      return Array.from(map.entries())
        .sort((a, b) => b[1].value - a[1].value)
        .slice(0, 20)
        .map(([state, { value, count }]) => ({ state, value, count }));
    },
    staleTime: 300000,
  });

  // NAICS sectors (2-digit)
  const naicsSectors = useQuery({
    queryKey: ['analytics-naics-sectors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('naics_code, award_amount')
        .not('naics_code', 'is', null);
      const map = new Map<string, number>();
      (data || []).forEach(c => {
        const sector = c.naics_code!.slice(0, 2);
        map.set(sector, (map.get(sector) || 0) + (Number(c.award_amount) || 0));
      });
      return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([code, value]) => ({ code, value }));
    },
    staleTime: 300000,
  });

  // Set-aside analysis
  const setAsideAnalysis = useQuery({
    queryKey: ['analytics-set-aside'],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('set_aside_type, award_amount')
        .not('set_aside_type', 'is', null);
      const map = new Map<string, number>();
      (data || []).forEach(c => {
        const key = c.set_aside_type!;
        map.set(key, (map.get(key) || 0) + (Number(c.award_amount) || 0));
      });
      return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([type, value]) => ({ type: type.length > 20 ? type.slice(0, 20) + '…' : type, value }));
    },
    staleTime: 300000,
  });

  // Contract type mix
  const contractTypeMix = useQuery({
    queryKey: ['analytics-contract-type'],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('contract_type, award_amount')
        .not('contract_type', 'is', null);
      const map = new Map<string, number>();
      (data || []).forEach(c => {
        map.set(c.contract_type!, (map.get(c.contract_type!) || 0) + (Number(c.award_amount) || 0));
      });
      return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([type, value]) => ({ type, value }));
    },
    staleTime: 300000,
  });

  // Grant funding by agency
  const grantsByAgency = useQuery({
    queryKey: ['analytics-grants-agency'],
    queryFn: async () => {
      const { data } = await supabase
        .from('grants')
        .select('awarding_agency, award_amount')
        .not('awarding_agency', 'is', null);
      const map = new Map<string, number>();
      (data || []).forEach(g => {
        map.set(g.awarding_agency!, (map.get(g.awarding_agency!) || 0) + (Number(g.award_amount) || 0));
      });
      return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({ name: name.length > 25 ? name.slice(0, 25) + '…' : name, value }));
    },
    staleTime: 300000,
  });

  // Labor rates
  const laborRates = useQuery({
    queryKey: ['analytics-labor-rates'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gsa_labor_rates')
        .select('labor_category, current_price')
        .not('current_price', 'is', null)
        .order('current_price', { ascending: false })
        .limit(100);
      // Aggregate by category
      const map = new Map<string, { total: number; count: number; min: number; max: number }>();
      (data || []).forEach(r => {
        const key = r.labor_category || 'Other';
        const price = Number(r.current_price) || 0;
        const e = map.get(key) || { total: 0, count: 0, min: Infinity, max: 0 };
        e.total += price; e.count++; e.min = Math.min(e.min, price); e.max = Math.max(e.max, price);
        map.set(key, e);
      });
      return Array.from(map.entries())
        .map(([cat, v]) => ({
          category: cat.length > 22 ? cat.slice(0, 22) + '…' : cat,
          avg: Math.round(v.total / v.count),
          min: v.min === Infinity ? 0 : Math.round(v.min),
          max: Math.round(v.max),
        }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 15);
    },
    staleTime: 300000,
  });

  return {
    kpis,
    agencySpending,
    spendingTimeline,
    topContractors,
    geoDistribution,
    naicsSectors,
    setAsideAnalysis,
    contractTypeMix,
    grantsByAgency,
    laborRates,
  };
}
