// BASED DATA — Entity-specific data hooks
// Extracted from useUnifiedData for better modularity

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STALE = {
  static: 30 * 60 * 1000,
  dynamic: 2 * 60 * 1000,
};

export const ENTITY_QUERY_KEYS = {
  entity: (id: string) => ["entity", id] as const,
  entityContracts: (id: string) => ["entity-contracts", id] as const,
  entityGrants: (id: string) => ["entity-grants", id] as const,
  entityRelationships: (id: string) => ["entity-relationships", id] as const,
  entityInsights: (id: string) => ["entity-insights", id] as const,
  entityFacts: (id: string) => ["entity-facts", id] as const,
  entityHealth: (id: string) => ["entity-health", id] as const,
  entityCompetitors: (id: string) => ["entity-competitors", id] as const,
};

export function useEntity(id: string) {
  return useQuery({
    queryKey: ENTITY_QUERY_KEYS.entity(id),
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
    queryKey: ENTITY_QUERY_KEYS.entityContracts(entityId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("recipient_entity_id", entityId)
        .order("award_amount", { ascending: false, nullsFirst: false })
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
    queryKey: ENTITY_QUERY_KEYS.entityGrants(entityId),
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
    queryKey: ENTITY_QUERY_KEYS.entityRelationships(entityId),
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
    queryKey: ENTITY_QUERY_KEYS.entityInsights(entityId),
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
    queryKey: ENTITY_QUERY_KEYS.entityFacts(entityId),
    queryFn: async () => {
      const { data: summary, error: summaryError } = await supabase
        .from("core_facts_summary")
        .select("*")
        .eq("entity_id", entityId)
        .order("latest_date", { ascending: false, nullsFirst: false });

      if (!summaryError && summary && summary.length > 0) {
        return { type: "summary" as const, data: summary };
      }

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
    queryKey: ENTITY_QUERY_KEYS.entityHealth(entityId),
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
    queryKey: ENTITY_QUERY_KEYS.entityCompetitors(entityId),
    queryFn: async () => {
      const { data: myContracts } = await supabase
        .from("contracts")
        .select("awarding_agency")
        .eq("recipient_entity_id", entityId);

      if (!myContracts || myContracts.length === 0) return [];
      const myAgencies = [...new Set(myContracts.map(c => c.awarding_agency).filter(Boolean))];

      const { data, error } = await supabase
        .from("contracts")
        .select("recipient_entity_id, awarding_agency, award_amount")
        .in("awarding_agency", myAgencies)
        .neq("recipient_entity_id", entityId)
        .not("recipient_entity_id", "is", null);
      if (error) throw error;
      if (!data) return [];

      const entityMap = new Map<string, { id: string; totalValue: number; contractCount: number; agencies: Set<string> }>();
      for (const row of data) {
        if (!row.recipient_entity_id) continue;
        const existing = entityMap.get(row.recipient_entity_id) || {
          id: row.recipient_entity_id,
          totalValue: 0,
          contractCount: 0,
          agencies: new Set<string>(),
        };
        existing.totalValue += Number(row.award_amount) || 0;
        existing.contractCount += 1;
        if (row.awarding_agency) existing.agencies.add(row.awarding_agency);
        entityMap.set(row.recipient_entity_id, existing);
      }

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
