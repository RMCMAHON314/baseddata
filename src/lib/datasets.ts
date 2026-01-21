import { supabase } from "@/integrations/supabase/client";

interface GenerateDatasetParams {
  prompt: string;
  userId: string;
}

interface DatasetResult {
  id: string;
  title: string;
  description: string;
  data: any[];
  insights: {
    totalRecords: number;
    summary: string;
    topCategories: string[];
    keyMetric: string;
  };
  creditsUsed: number;
}

export async function generateDataset({ prompt, userId }: GenerateDatasetParams): Promise<DatasetResult> {
  // Create pending dataset
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
    // Call the edge function for AI-powered generation
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
      creditsUsed: data.creditsUsed,
    };
  } catch (error) {
    // Mark dataset as failed
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
