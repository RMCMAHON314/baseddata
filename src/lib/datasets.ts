import { supabase } from "@/integrations/supabase/client";

interface GenerateDatasetParams {
  prompt: string;
  userId: string;
}

interface KeyMetric {
  label: string;
  value: string;
  trend: "up" | "down" | "stable";
}

interface DatasetInsights {
  summary: string;
  totalRecords: number;
  keyFindings: string[];
  topCategories: string[];
  keyMetrics: KeyMetric[];
  recommendations: string[];
  dataQualityScore: number;
}

interface SchemaColumn {
  name: string;
  type: string;
  description: string;
  is_enriched: boolean;
}

interface DatasetSchema {
  entity_type: string;
  columns: SchemaColumn[];
}

interface DatasetResult {
  id: string;
  title: string;
  description: string;
  data: Record<string, unknown>[];
  insights: DatasetInsights;
  schema: DatasetSchema;
  creditsUsed: number;
}

export async function generateDataset({ prompt, userId }: GenerateDatasetParams): Promise<DatasetResult> {
  // Create pending dataset in the SOURCE OF TRUTH
  const { data: dataset, error: createError } = await supabase
    .from("datasets")
    .insert({
      user_id: userId,
      prompt,
      status: "processing",
    })
    .select()
    .single();

  if (createError) throw createError;

  try {
    // Call the AI-powered edge function
    const { data, error } = await supabase.functions.invoke("generate-dataset", {
      body: { prompt, datasetId: dataset.id },
    });

    if (error) throw error;

    return {
      id: dataset.id,
      title: data.title,
      description: data.description,
      data: data.data,
      insights: data.insights,
      schema: data.schema,
      creditsUsed: data.creditsUsed,
    };
  } catch (error) {
    // Mark dataset as failed in the SOURCE OF TRUTH
    await supabase
      .from("datasets")
      .update({ status: "failed" })
      .eq("id", dataset.id);
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
