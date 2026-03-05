// BASED DATA — Market & Agency data hooks
// Extracted from useUnifiedData for better modularity

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STALE = {
  static: 30 * 60 * 1000,
  dynamic: 2 * 60 * 1000,
};

export const MARKET_QUERY_KEYS = {
  marketExplorer: (filters: Record<string, string | undefined>) => ["market-explorer", filters] as const,
  marketFilterOptions: ["market-filter-options"] as const,
  agencyDetail: (name: string) => ["agency-detail", name] as const,
  agencyContractors: (name: string) => ["agency-contractors", name] as const,
};

export function useMarketExplorer(filters: {
  state?: string; agency?: string; naics?: string; setAside?: string; keyword?: string;
}) {
  return useQuery({
    queryKey: MARKET_QUERY_KEYS.marketExplorer(filters),
    queryFn: async () => {
      let query = supabase
        .from("contracts")
        .select("*, entity:core_entities!contracts_recipient_entity_id_fkey(id, canonical_name, entity_type)")
        .order("award_amount", { ascending: false, nullsFirst: false })
        .limit(100);

      if (filters.state) query = query.eq("pop_state", filters.state);
      if (filters.agency) query = query.eq("awarding_agency", filters.agency);
      if (filters.naics) query = query.eq("naics_code", filters.naics);
      if (filters.setAside) query = query.eq("set_aside_type", filters.setAside);
      if (filters.keyword) query = query.ilike("description", `%${filters.keyword}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: STALE.dynamic,
  });
}

export function useMarketFilterOptions() {
  return useQuery({
    queryKey: MARKET_QUERY_KEYS.marketFilterOptions,
    queryFn: async () => {
      // Use RPC or paginated queries to get ALL distinct values (default limit is 1000 rows)
      const fetchAllDistinct = async (column: string) => {
        const values = new Set<string>();
        let offset = 0;
        const pageSize = 1000;
        while (true) {
          const { data } = await supabase
            .from("contracts")
            .select(column)
            .not(column, "is", null)
            .range(offset, offset + pageSize - 1);
          if (!data || data.length === 0) break;
          for (const row of data) {
            const val = (row as any)[column];
            if (val) values.add(val);
          }
          if (data.length < pageSize) break;
          offset += pageSize;
        }
        return [...values].sort();
      };

      const [states, agencies, setAsides] = await Promise.all([
        fetchAllDistinct("pop_state"),
        fetchAllDistinct("awarding_agency"),
        fetchAllDistinct("set_aside_type"),
      ]);

      return { states, agencies, setAsides };
    },
    staleTime: STALE.static,
  });
}

export function useAgencyDetail(agencyName: string) {
  return useQuery({
    queryKey: MARKET_QUERY_KEYS.agencyDetail(agencyName),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("awarding_agency", agencyName);
      if (error) throw error;

      const contracts = data || [];
      const totalValue = contracts.reduce((s, c) => s + (Number(c.award_amount) || 0), 0);
      const vendorIds = [...new Set(contracts.map(c => c.recipient_entity_id).filter(Boolean))];
      const naicsCodes = [...new Set(contracts.map(c => c.naics_code).filter(Boolean))];

      return {
        name: agencyName,
        contractCount: contracts.length,
        totalValue,
        vendorCount: vendorIds.length,
        naicsCount: naicsCodes.length,
        contracts,
      };
    },
    staleTime: STALE.dynamic,
    enabled: !!agencyName,
  });
}

export function useAgencyTopContractors(agencyName: string) {
  return useQuery({
    queryKey: MARKET_QUERY_KEYS.agencyContractors(agencyName),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("recipient_entity_id, award_amount")
        .eq("awarding_agency", agencyName)
        .not("recipient_entity_id", "is", null);
      if (error) throw error;

      const entityMap = new Map<string, { total: number; count: number }>();
      for (const c of data || []) {
        if (!c.recipient_entity_id) continue;
        const existing = entityMap.get(c.recipient_entity_id) || { total: 0, count: 0 };
        existing.total += Number(c.award_amount) || 0;
        existing.count += 1;
        entityMap.set(c.recipient_entity_id, existing);
      }

      const topIds = [...entityMap.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 20)
        .map(([id]) => id);

      if (topIds.length === 0) return [];
      const { data: entities } = await supabase
        .from("core_entities")
        .select("id, canonical_name, entity_type")
        .in("id", topIds);

      return (entities || []).map(e => ({
        ...e,
        totalValue: entityMap.get(e.id)?.total || 0,
        contractCount: entityMap.get(e.id)?.count || 0,
      })).sort((a, b) => b.totalValue - a.totalValue);
    },
    staleTime: STALE.dynamic,
    enabled: !!agencyName,
  });
}
