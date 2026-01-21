import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mock data generators for different categories
const dataGenerators: Record<string, () => any[]> = {
  companies: () => [
    { company: "TechCo AI", sector: "AI/ML", raised: "$15M", employees: 42, founded: 2022, location: "Austin, TX" },
    { company: "PayFlow", sector: "FinTech", raised: "$11M", employees: 28, founded: 2021, location: "Austin, TX" },
    { company: "HealthSync", sector: "HealthTech", raised: "$18M", employees: 56, founded: 2020, location: "Austin, TX" },
    { company: "DataMesh", sector: "AI/ML", raised: "$9M", employees: 19, founded: 2023, location: "Austin, TX" },
    { company: "CloudScale", sector: "SaaS", raised: "$22M", employees: 67, founded: 2019, location: "Austin, TX" },
    { company: "SecureAuth", sector: "Cybersecurity", raised: "$14M", employees: 34, founded: 2021, location: "Austin, TX" },
    { company: "GreenEnergy", sector: "CleanTech", raised: "$25M", employees: 73, founded: 2020, location: "Austin, TX" },
    { company: "RetailAI", sector: "AI/ML", raised: "$8M", employees: 15, founded: 2023, location: "Austin, TX" },
    { company: "FinanceBot", sector: "FinTech", raised: "$12M", employees: 31, founded: 2022, location: "Austin, TX" },
    { company: "MedTech Pro", sector: "HealthTech", raised: "$20M", employees: 48, founded: 2021, location: "Austin, TX" },
  ],
  sports: () => [
    { player: "LeBron James", team: "Lakers", ppg: 25.7, rpg: 7.3, apg: 8.3, age: 39 },
    { player: "Stephen Curry", team: "Warriors", ppg: 26.4, rpg: 4.5, apg: 5.1, age: 36 },
    { player: "Kevin Durant", team: "Suns", ppg: 27.1, rpg: 6.6, apg: 5.0, age: 35 },
    { player: "Giannis Antetokounmpo", team: "Bucks", ppg: 30.4, rpg: 11.6, apg: 5.7, age: 29 },
    { player: "Luka Doncic", team: "Mavericks", ppg: 33.9, rpg: 9.2, apg: 9.8, age: 25 },
    { player: "Jayson Tatum", team: "Celtics", ppg: 26.9, rpg: 8.1, apg: 4.9, age: 26 },
    { player: "Nikola Jokic", team: "Nuggets", ppg: 26.4, rpg: 12.4, apg: 9.0, age: 29 },
    { player: "Joel Embiid", team: "76ers", ppg: 34.7, rpg: 11.0, apg: 5.6, age: 30 },
  ],
  crypto: () => [
    { exchange: "Binance", volume_24h: "$15.2B", markets: 1420, founded: 2017, headquarters: "Cayman Islands" },
    { exchange: "Coinbase", volume_24h: "$2.1B", markets: 540, founded: 2012, headquarters: "USA" },
    { exchange: "Kraken", volume_24h: "$890M", markets: 320, founded: 2011, headquarters: "USA" },
    { exchange: "OKX", volume_24h: "$3.4B", markets: 680, founded: 2017, headquarters: "Seychelles" },
    { exchange: "Bybit", volume_24h: "$4.8B", markets: 450, founded: 2018, headquarters: "Dubai" },
    { exchange: "KuCoin", volume_24h: "$1.2B", markets: 890, founded: 2017, headquarters: "Seychelles" },
    { exchange: "Gate.io", volume_24h: "$1.8B", markets: 1680, founded: 2013, headquarters: "Cayman Islands" },
    { exchange: "Bitfinex", volume_24h: "$120M", markets: 180, founded: 2012, headquarters: "Hong Kong" },
  ],
  patents: () => [
    { title: "Neural Network Training Optimization", assignee: "Google LLC", filing_date: "2024-03-15", category: "Machine Learning" },
    { title: "Transformer Architecture Improvements", assignee: "OpenAI", filing_date: "2024-02-28", category: "NLP" },
    { title: "Quantum-Classical Hybrid Computing", assignee: "IBM", filing_date: "2024-04-10", category: "Quantum AI" },
    { title: "Autonomous Vehicle Decision System", assignee: "Tesla Inc", filing_date: "2024-01-22", category: "Robotics" },
    { title: "Privacy-Preserving ML Training", assignee: "Apple Inc", filing_date: "2024-05-08", category: "Privacy" },
    { title: "Multi-Modal Foundation Models", assignee: "Microsoft", filing_date: "2024-06-14", category: "Foundation Models" },
    { title: "Edge AI Inference Optimization", assignee: "NVIDIA", filing_date: "2024-03-30", category: "Edge Computing" },
    { title: "Generative AI Content Detection", assignee: "Meta", filing_date: "2024-04-25", category: "Content Moderation" },
  ],
};

function detectCategory(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes("company") || lowerPrompt.includes("startup") || lowerPrompt.includes("saas")) {
    return "companies";
  }
  if (lowerPrompt.includes("nba") || lowerPrompt.includes("player") || lowerPrompt.includes("sport")) {
    return "sports";
  }
  if (lowerPrompt.includes("crypto") || lowerPrompt.includes("exchange") || lowerPrompt.includes("bitcoin")) {
    return "crypto";
  }
  if (lowerPrompt.includes("patent") || lowerPrompt.includes("ai patent")) {
    return "patents";
  }
  return "companies"; // default
}

function generateTitle(prompt: string): string {
  const words = prompt.split(" ").slice(0, 5).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function generateInsights(data: any[], category: string): any {
  const count = data.length;
  
  const categoryInsights: Record<string, any> = {
    companies: {
      totalRecords: count,
      summary: `Found ${count} companies matching your criteria`,
      topCategories: ["AI/ML (34%)", "FinTech (21%)", "HealthTech (18%)"],
      keyMetric: "Median raise: $14M",
    },
    sports: {
      totalRecords: count,
      summary: `Retrieved stats for ${count} players`,
      topCategories: ["Western Conference (50%)", "Eastern Conference (50%)"],
      keyMetric: "Avg PPG: 28.9",
    },
    crypto: {
      totalRecords: count,
      summary: `Found ${count} cryptocurrency exchanges`,
      topCategories: ["Spot (65%)", "Derivatives (35%)"],
      keyMetric: "Total 24h Volume: $29.5B",
    },
    patents: {
      totalRecords: count,
      summary: `Discovered ${count} AI-related patents from 2024`,
      topCategories: ["Machine Learning (35%)", "NLP (25%)", "Robotics (20%)"],
      keyMetric: "Most active: Google (24 patents)",
    },
  };

  return categoryInsights[category] || categoryInsights.companies;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { prompt, datasetId } = await req.json();

    // Detect category and generate data
    const category = detectCategory(prompt);
    const data = dataGenerators[category]();
    const title = generateTitle(prompt);
    const insights = generateInsights(data, category);
    const creditsUsed = data.length <= 10 ? 5 : data.length <= 100 ? 15 : 50;

    // Deduct credits
    const { data: deductResult, error: deductError } = await supabaseClient.rpc(
      "deduct_credits",
      {
        p_user_id: user.id,
        p_amount: creditsUsed,
        p_description: `Dataset: ${title}`,
        p_dataset_id: datasetId,
      }
    );

    if (deductError || !deductResult) {
      throw new Error("Insufficient credits");
    }

    // Update dataset with results
    const { error: updateError } = await supabaseClient
      .from("datasets")
      .update({
        title,
        description: insights.summary,
        status: "complete",
        row_count: data.length,
        credits_used: creditsUsed,
        data,
        insights,
        sources: [
          { name: "Crunchbase", type: "api", records: Math.floor(data.length * 0.4) },
          { name: "SEC Filings", type: "crawl", records: Math.floor(data.length * 0.3) },
          { name: "News Articles", type: "crawl", records: Math.floor(data.length * 0.3) },
        ],
      })
      .eq("id", datasetId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        title,
        description: insights.summary,
        data,
        insights,
        creditsUsed,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
