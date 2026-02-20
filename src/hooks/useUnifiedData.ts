// BASED DATA — Unified Data Access Layer
// Single source of truth for ALL Supabase data access
// Corrected to match actual database column names

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ═══════════════════ QUERY KEYS ═══════════════════
export const QUERY_KEYS = {
  entities: ["entities"] as const,
  contracts: ["contracts"] as const,
  grants: ["grants"] as const,
  opportunities: ["opportunities"] as const,
  relationships: ["relationships"] as const,
  platformStats: ["platform-stats"] as const,
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
        supabase.from("contracts").select("award_amount"),
        supabase.from("core_relationships").select("*", { count: "exact", head: true }),
      ]);

      const totalContractValue = (contracts.data || []).reduce(
        (sum, c) => sum + (Number(c.award_amount) || 0), 0
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
        .order("award_amount", { ascending: false, nullsFirst: false });

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

// Entity and Market hooks moved to useEntityData.ts and useMarketData.ts
// Re-export for backward compatibility
export { useEntity, useEntityContracts, useEntityGrants, useEntityRelationships, useEntityInsights, useEntityFacts, useEntityHealth, useEntityCompetitors } from "./useEntityData";
export { useMarketExplorer, useMarketFilterOptions, useAgencyDetail, useAgencyTopContractors } from "./useMarketData";

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
        supabase.from("contracts").select("award_amount, awarding_agency, naics_code, pop_state, award_date"),
        supabase.from("grants").select("total_funding, awarding_agency"),
        supabase.from("core_entities").select("entity_type, state"),
        supabase.from("core_relationships").select("relationship_type"),
      ]);

      // Aggregate by agency
      const agencyMap = new Map<string, number>();
      for (const c of contracts.data || []) {
        if (c.awarding_agency) {
          agencyMap.set(c.awarding_agency, (agencyMap.get(c.awarding_agency) || 0) + (Number(c.award_amount) || 0));
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
          timelineMap.set(key, (timelineMap.get(key) || 0) + (Number(c.award_amount) || 0));
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

      const totalContractValue = (contracts.data || []).reduce((s, c) => s + (Number(c.award_amount) || 0), 0);
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
