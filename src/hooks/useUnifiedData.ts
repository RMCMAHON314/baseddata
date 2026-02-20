// BASED DATA — Unified Data Access Layer
// Single source of truth for ALL Supabase data access
// Corrected to match actual database column names

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ═══════════════════ QUERY KEYS ═══════════════════
export const QUERY_KEYS = {
  entities: ["entities"] as const,
  entity: (id: string) => ["entity", id] as const,
  entityContracts: (id: string) => ["entity-contracts", id] as const,
  entityGrants: (id: string) => ["entity-grants", id] as const,
  entityRelationships: (id: string) => ["entity-relationships", id] as const,
  entityInsights: (id: string) => ["entity-insights", id] as const,
  entityFacts: (id: string) => ["entity-facts", id] as const,
  entityHealth: (id: string) => ["entity-health", id] as const,
  entityCompetitors: (id: string) => ["entity-competitors", id] as const,
  contracts: ["contracts"] as const,
  grants: ["grants"] as const,
  opportunities: ["opportunities"] as const,
  relationships: ["relationships"] as const,
  platformStats: ["platform-stats"] as const,
  marketExplorer: (filters: Record<string, string | undefined>) => ["market-explorer", filters] as const,
  marketFilterOptions: ["market-filter-options"] as const,
  agencyDetail: (name: string) => ["agency-detail", name] as const,
  agencyContractors: (name: string) => ["agency-contractors", name] as const,
  savedSearches: ["saved-searches"] as const,
  recentContracts: ["recent-contracts"] as const,
  flywheelHealth: ["flywheel-health"] as const,
};

// ═══════════════════ STALE TIME STRATEGY ═══════════════════
const STALE = {
  static: 30 * 60 * 1000,   // 30 min — entities, facts
  dynamic: 2 * 60 * 1000,   // 2 min — contracts, grants
  realtime: 30 * 1000,      // 30 sec — health, pipeline status
  user: 5 * 60 * 1000,      // 5 min — saved searches
};

// ═══════════════════ PLATFORM STATS ═══════════════════
export function usePlatformStats() {
  return useQuery({
    queryKey: QUERY_KEYS.platformStats,
    queryFn: async () => {
      const [entities, contracts, relationships] = await Promise.all([
        supabase.from("core_entities").select("*", { count: "exact", head: true }),
        supabase.from("contracts").select("base_and_all_options"),
        supabase.from("core_relationships").select("*", { count: "exact", head: true }),
      ]);

      const totalContractValue = (contracts.data || []).reduce(
        (sum, c) => sum + (Number(c.base_and_all_options) || 0), 0
      );

      return {
        entityCount: entities.count || 0,
        contractValue: totalContractValue,
        relationshipCount: relationships.count || 0,
      };
    },
    staleTime: STALE.dynamic,
  });
}

// ═══════════════════ ENTITIES ═══════════════════
export function useEntities(options?: {
  search?: string; type?: string; state?: string; limit?: number;
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.entities, options],
    queryFn: async () => {
      let query = supabase
        .from("core_entities")
        .select("*")
        .order("total_contract_value", { ascending: false, nullsFirst: false });

      if (options?.search) query = query.ilike("canonical_name", `%${options.search}%`);
      if (options?.type) query = query.eq("entity_type", options.type);
      if (options?.state) query = query.eq("state", options.state);
      query = query.limit(options?.limit || 50);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: STALE.static,
  });
}

// ═══════════════════ ENTITY DETAIL ═══════════════════
export function useEntity(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.entity(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("core_entities")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: STALE.static,
    enabled: !!id,
  });
}

export function useEntityContracts(entityId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.entityContracts(entityId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("recipient_entity_id", entityId)
        .order("base_and_all_options", { ascending: false, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    staleTime: STALE.dynamic,
    enabled: !!entityId,
  });
}

export function useEntityGrants(entityId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.entityGrants(entityId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grants")
        .select("*")
        .eq("recipient_entity_id", entityId)
        .order("total_funding", { ascending: false, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    staleTime: STALE.dynamic,
    enabled: !!entityId,
  });
}

export function useEntityRelationships(entityId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.entityRelationships(entityId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("core_relationships")
        .select("*")
        .or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`)
        .order("strength", { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    staleTime: STALE.static,
    enabled: !!entityId,
  });
}

export function useEntityInsights(entityId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.entityInsights(entityId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("core_derived_insights")
        .select("*")
        .contains("related_entities", [entityId])
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    staleTime: STALE.dynamic,
    enabled: !!entityId,
  });
}

export function useEntityFacts(entityId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.entityFacts(entityId),
    queryFn: async () => {
      // Try summary table first (fast)
      const { data: summary, error: summaryError } = await supabase
        .from("core_facts_summary")
        .select("*")
        .eq("entity_id", entityId)
        .order("latest_date", { ascending: false, nullsFirst: false });

      if (!summaryError && summary && summary.length > 0) {
        return { type: "summary" as const, data: summary };
      }

      // Fall back to raw facts
      const { data: raw, error: rawError } = await supabase
        .from("core_facts")
        .select("*")
        .eq("entity_id", entityId)
        .order("fact_date", { ascending: false, nullsFirst: false })
        .limit(20);
      if (rawError) throw rawError;
      return { type: "raw" as const, data: raw };
    },
    staleTime: STALE.static,
    enabled: !!entityId,
  });
}

export function useEntityHealth(entityId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.entityHealth(entityId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_health_scores")
        .select("*")
        .eq("entity_id", entityId)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: STALE.dynamic,
    enabled: !!entityId,
  });
}

export function useEntityCompetitors(entityId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.entityCompetitors(entityId),
    queryFn: async () => {
      // Step 1: Get this entity's agencies
      const { data: myContracts } = await supabase
        .from("contracts")
        .select("awarding_agency")
        .eq("recipient_entity_id", entityId);

      if (!myContracts || myContracts.length === 0) return [];
      const myAgencies = [...new Set(myContracts.map(c => c.awarding_agency).filter(Boolean))];

      // Step 2: Find other entities with contracts at same agencies
      const { data, error } = await supabase
        .from("contracts")
        .select("recipient_entity_id, awarding_agency, base_and_all_options")
        .in("awarding_agency", myAgencies)
        .neq("recipient_entity_id", entityId)
        .not("recipient_entity_id", "is", null);
      if (error) throw error;
      if (!data) return [];

      // Aggregate by entity
      const entityMap = new Map<string, { id: string; totalValue: number; contractCount: number; agencies: Set<string> }>();
      for (const row of data) {
        if (!row.recipient_entity_id) continue;
        const existing = entityMap.get(row.recipient_entity_id) || {
          id: row.recipient_entity_id,
          totalValue: 0,
          contractCount: 0,
          agencies: new Set<string>(),
        };
        existing.totalValue += Number(row.base_and_all_options) || 0;
        existing.contractCount += 1;
        if (row.awarding_agency) existing.agencies.add(row.awarding_agency);
        entityMap.set(row.recipient_entity_id, existing);
      }

      // Get entity names
      const entityIds = [...entityMap.keys()].slice(0, 20);
      if (entityIds.length === 0) return [];
      const { data: entities } = await supabase
        .from("core_entities")
        .select("id, canonical_name, entity_type")
        .in("id", entityIds);

      return (entities || [])
        .map(e => {
          const stats = entityMap.get(e.id)!;
          return {
            ...e,
            totalValue: stats.totalValue,
            contractCount: stats.contractCount,
            sharedAgencies: [...stats.agencies],
          };
        })
        .sort((a, b) => b.totalValue - a.totalValue);
    },
    staleTime: STALE.static,
    enabled: !!entityId,
  });
}

// ═══════════════════ MARKET EXPLORER ═══════════════════
export function useMarketExplorer(filters: {
  state?: string; agency?: string; naics?: string; setAside?: string; keyword?: string;
}) {
  return useQuery({
    queryKey: QUERY_KEYS.marketExplorer(filters),
    queryFn: async () => {
      let query = supabase
        .from("contracts")
        .select("*, entity:core_entities!contracts_recipient_entity_id_fkey(id, canonical_name, entity_type)")
        .order("base_and_all_options", { ascending: false, nullsFirst: false })
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
    enabled: Object.values(filters).some(Boolean),
  });
}

export function useMarketFilterOptions() {
  return useQuery({
    queryKey: QUERY_KEYS.marketFilterOptions,
    queryFn: async () => {
      const [states, agencies, setAsides] = await Promise.all([
        supabase.from("contracts").select("pop_state").not("pop_state", "is", null),
        supabase.from("contracts").select("awarding_agency").not("awarding_agency", "is", null),
        supabase.from("contracts").select("set_aside_type").not("set_aside_type", "is", null),
      ]);

      return {
        states: [...new Set((states.data || []).map(r => r.pop_state))].filter(Boolean).sort() as string[],
        agencies: [...new Set((agencies.data || []).map(r => r.awarding_agency))].filter(Boolean).sort() as string[],
        setAsides: [...new Set((setAsides.data || []).map(r => r.set_aside_type))].filter(Boolean).sort() as string[],
      };
    },
    staleTime: STALE.static,
  });
}

// ═══════════════════ AGENCY DETAIL ═══════════════════
export function useAgencyDetail(agencyName: string) {
  return useQuery({
    queryKey: QUERY_KEYS.agencyDetail(agencyName),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("awarding_agency", agencyName);
      if (error) throw error;

      const contracts = data || [];
      const totalValue = contracts.reduce((s, c) => s + (Number(c.base_and_all_options) || 0), 0);
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
    queryKey: QUERY_KEYS.agencyContractors(agencyName),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("recipient_entity_id, base_and_all_options")
        .eq("awarding_agency", agencyName)
        .not("recipient_entity_id", "is", null);
      if (error) throw error;

      const entityMap = new Map<string, { total: number; count: number }>();
      for (const c of data || []) {
        if (!c.recipient_entity_id) continue;
        const existing = entityMap.get(c.recipient_entity_id) || { total: 0, count: 0 };
        existing.total += Number(c.base_and_all_options) || 0;
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

// ═══════════════════ SAVED SEARCHES ═══════════════════
export function useSavedSearches() {
  return useQuery({
    queryKey: QUERY_KEYS.savedSearches,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("saved_searches")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: STALE.user,
  });
}

export function useSaveSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; query: string; filters?: Record<string, unknown>; notify?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("saved_searches")
        .insert([{
          user_id: user.id,
          name: params.name,
          query: params.query,
          filters: (params.filters ?? {}) as unknown as import("@/integrations/supabase/types").Json,
          notify_on_change: params.notify ?? false,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.savedSearches });
    },
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_searches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.savedSearches });
    },
  });
}

// ═══════════════════ RECENT CONTRACTS ═══════════════════
export function useRecentContracts(limit = 50) {
  return useQuery({
    queryKey: [...QUERY_KEYS.recentContracts, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*, entity:core_entities!contracts_recipient_entity_id_fkey(id, canonical_name)")
        .not("award_date", "is", null)
        .order("award_date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    staleTime: STALE.dynamic,
  });
}

// ═══════════════════ EXPIRING CONTRACTS ═══════════════════
export function useExpiringContracts(monthsAhead = 12, limit = 30) {
  return useQuery({
    queryKey: ["expiring-contracts", monthsAhead, limit],
    queryFn: async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + monthsAhead);

      const { data, error } = await supabase
        .from("contracts")
        .select("*, entity:core_entities!contracts_recipient_entity_id_fkey(id, canonical_name)")
        .not("end_date", "is", null)
        .gte("end_date", new Date().toISOString())
        .lte("end_date", futureDate.toISOString())
        .order("end_date", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    staleTime: STALE.dynamic,
  });
}

// ═══════════════════ ANALYTICS OVERVIEW ═══════════════════
export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ["analytics-overview"],
    queryFn: async () => {
      const [contracts, grants, entities, relationships] = await Promise.all([
        supabase.from("contracts").select("base_and_all_options, awarding_agency, naics_code, pop_state, award_date"),
        supabase.from("grants").select("total_funding, awarding_agency"),
        supabase.from("core_entities").select("entity_type, state"),
        supabase.from("core_relationships").select("relationship_type"),
      ]);

      // Aggregate by agency
      const agencyMap = new Map<string, number>();
      for (const c of contracts.data || []) {
        if (c.awarding_agency) {
          agencyMap.set(c.awarding_agency, (agencyMap.get(c.awarding_agency) || 0) + (Number(c.base_and_all_options) || 0));
        }
      }
      const topAgencies = [...agencyMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({ name: name.length > 30 ? name.substring(0, 30) + "…" : name, value }));

      // Aggregate by state
      const stateMap = new Map<string, number>();
      for (const c of contracts.data || []) {
        if (c.pop_state) {
          stateMap.set(c.pop_state, (stateMap.get(c.pop_state) || 0) + 1);
        }
      }
      const topStates = [...stateMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([state, count]) => ({ state, count }));

      // Aggregate by NAICS
      const naicsMap = new Map<string, number>();
      for (const c of contracts.data || []) {
        if (c.naics_code) {
          naicsMap.set(c.naics_code, (naicsMap.get(c.naics_code) || 0) + 1);
        }
      }
      const topNaics = [...naicsMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([code, count]) => ({ code, count }));

      // Timeline (contracts by quarter)
      const timelineMap = new Map<string, number>();
      for (const c of contracts.data || []) {
        if (c.award_date) {
          const d = new Date(c.award_date);
          const key = `${d.getFullYear()} Q${Math.ceil((d.getMonth() + 1) / 3)}`;
          timelineMap.set(key, (timelineMap.get(key) || 0) + (Number(c.base_and_all_options) || 0));
        }
      }
      const timeline = [...timelineMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([quarter, value]) => ({ quarter, value }));

      // Entity types
      const typeMap = new Map<string, number>();
      for (const e of entities.data || []) {
        if (e.entity_type) {
          typeMap.set(e.entity_type, (typeMap.get(e.entity_type) || 0) + 1);
        }
      }
      const entityTypes = [...typeMap.entries()].map(([type, count]) => ({ type, count }));

      const totalContractValue = (contracts.data || []).reduce((s, c) => s + (Number(c.base_and_all_options) || 0), 0);
      const totalGrantValue = (grants.data || []).reduce((s, g) => s + (Number(g.total_funding) || 0), 0);

      return {
        totalContractValue,
        totalGrantValue,
        contractCount: (contracts.data || []).length,
        grantCount: (grants.data || []).length,
        entityCount: (entities.data || []).length,
        relationshipCount: (relationships.data || []).length,
        topAgencies,
        topStates,
        topNaics,
        timeline,
        entityTypes,
      };
    },
    staleTime: STALE.dynamic,
  });
}

// ═══════════════════ FLYWHEEL HEALTH ═══════════════════
export function useFlywheelHealth() {
  return useQuery({
    queryKey: QUERY_KEYS.flywheelHealth,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_flywheel_health");
      if (error) throw error;
      return data;
    },
    staleTime: STALE.realtime,
  });
}
