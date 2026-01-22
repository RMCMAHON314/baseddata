// OMNISCIENT v1.1 - Data Service Layer
// Clean, typed API for core data operations

import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// USER OPERATIONS
// ============================================================================

export async function getUserCredits(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("profiles")
    .select("credits_balance")
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data.credits_balance;
}

export async function getUserDatasets(userId: string) {
  const { data, error } = await supabase
    .from("datasets")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "complete")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getDataset(datasetId: string) {
  const { data, error } = await supabase
    .from("datasets")
    .select("*")
    .eq("id", datasetId)
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// DATA TAP OPERATIONS
// ============================================================================

export async function getSourcePerformance() {
  const { data, error } = await supabase
    .from("source_performance")
    .select("*")
    .order("reliability_score", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getRecordCount(): Promise<number> {
  const { count, error } = await supabase
    .from("records")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count || 0;
}

export async function getQueryPatterns() {
  const { data, error } = await supabase
    .from("query_patterns")
    .select("*")
    .order("execution_count", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data;
}

export async function getLocationCache() {
  const { data, error } = await supabase
    .from("location_cache")
    .select("*")
    .order("hit_count", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data;
}

// ============================================================================
// DATA TAP STATS
// ============================================================================

export async function getDataTapStats() {
  const [recordCount, sources, patterns, locations] = await Promise.all([
    getRecordCount(),
    getSourcePerformance(),
    getQueryPatterns(),
    getLocationCache(),
  ]);

  const activeSources = sources?.filter(s => s.is_active) || [];
  const avgReliability = activeSources.length
    ? activeSources.reduce((acc, s) => acc + (s.reliability_score || 0), 0) / activeSources.length
    : 0;

  return {
    totalRecords: recordCount,
    totalSources: sources?.length || 0,
    activeSources: activeSources.length,
    avgReliability: Math.round(avgReliability * 100),
    queryPatterns: patterns?.length || 0,
    cachedLocations: locations?.length || 0,
  };
}
