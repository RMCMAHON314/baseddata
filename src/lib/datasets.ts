// OMNISCIENT - Data Service Layer
// Clean, typed API for data operations

import { supabase } from "@/integrations/supabase/client";

export async function getUserCredits(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("credits_balance")
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data.credits_balance;
}

export async function getCreditTransactions(userId: string) {
  const { data, error } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
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

// Get schema registry entries
export async function getSchemaRegistry() {
  const { data, error } = await supabase
    .from("schema_registry")
    .select("*")
    .order("row_count", { ascending: false });

  if (error) throw error;
  return data;
}

// Get data sources
export async function getDataSources() {
  const { data, error } = await supabase
    .from("data_sources")
    .select("*")
    .order("reliability_score", { ascending: false });

  if (error) throw error;
  return data;
}

// Get platform stats
export async function getPlatformStats() {
  const { data: datasets, error: datasetsError } = await supabase
    .from("datasets")
    .select("row_count, credits_used, created_at")
    .eq("status", "complete");

  if (datasetsError) throw datasetsError;

  const { data: schemas, error: schemasError } = await supabase
    .from("schema_registry")
    .select("table_name, row_count");

  if (schemasError) throw schemasError;

  const { data: sources, error: sourcesError } = await supabase
    .from("data_sources")
    .select("domain, reliability_score");

  if (sourcesError) throw sourcesError;

  const totalRows = datasets?.reduce((acc, d) => acc + (d.row_count || 0), 0) || 0;
  const totalDatasets = datasets?.length || 0;
  const totalSchemas = schemas?.length || 0;
  const totalSources = sources?.length || 0;
  const avgReliability = sources?.length 
    ? sources.reduce((acc, s) => acc + (s.reliability_score || 0), 0) / sources.length 
    : 0;

  return {
    totalRows,
    totalDatasets,
    totalSchemas,
    totalSources,
    avgReliability: Math.round(avgReliability * 100),
  };
}
