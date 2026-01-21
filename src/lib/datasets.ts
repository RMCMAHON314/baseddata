// Based Data - Dataset Service Layer
// Clean, typed API for dataset operations using Ultimate Engine v3
// ZERO AI CREDITS - Pure algorithmic generation

import { supabase } from "@/integrations/supabase/client";
import type { DatasetResult, DatasetInsights, DatasetSchema, GenerationOptions } from "@/types/dataset";

interface GenerateDatasetParams {
  prompt: string;
  userId: string;
  options?: GenerationOptions;
}

export async function generateDataset({ prompt, userId, options }: GenerateDatasetParams): Promise<DatasetResult> {
  // For test users, skip database record creation (auth disabled)
  const isTestUser = userId.startsWith('test-user-');
  let datasetId: string | null = null;

  if (!isTestUser) {
    // Create pending dataset record first (source of truth pattern)
    const { data: dataset, error: createError } = await supabase
      .from("datasets")
      .insert({
        user_id: userId,
        prompt,
        status: "pending",
      })
      .select()
      .single();

    if (createError) throw createError;
    datasetId = dataset.id;
  }

  try {
    // Invoke Ultimate Engine v3 - ZERO AI CREDITS 🔥
    const { data, error } = await supabase.functions.invoke("generate-dataset-v3", {
      body: { 
        prompt, 
        userId,
        datasetId,
        options: {
          dataSize: options?.dataSize || 'standard',
          freshness: options?.freshness || 'cached',
          includeInsights: options?.includeInsights ?? true
        }
      },
    });

    if (error) throw error;

    // Edge function handles the dataset update to 'complete' status
    // Just return the result with proper typing
    return {
      id: datasetId || data.id || crypto.randomUUID(),
      title: data.title || prompt,
      description: data.description || `Dataset generated from: ${prompt}`,
      data: data.data || [],
      insights: data.insights as DatasetInsights,
      schema: data.schema as DatasetSchema,
      creditsUsed: data.creditsUsed || 8,
    };
  } catch (error) {
    // Mark dataset as failed on error (only if we have a real dataset)
    if (datasetId) {
      await supabase
        .from("datasets")
        .update({ status: "failed" })
        .eq("id", datasetId);
    }
    throw error;
  }
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

// Get schema registry entries - shows what the system has learned
export async function getSchemaRegistry() {
  const { data, error } = await supabase
    .from("schema_registry")
    .select("*")
    .order("row_count", { ascending: false });

  if (error) throw error;
  return data;
}

// Get data sources - shows our ever-growing data network
export async function getDataSources() {
  const { data, error } = await supabase
    .from("data_sources")
    .select("*")
    .order("reliability_score", { ascending: false });

  if (error) throw error;
  return data;
}

// Get platform stats - aggregate insights from the source of truth
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
