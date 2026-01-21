import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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

    console.log("Starting AI-powered dataset generation for prompt:", prompt);

    // PHASE 1: Analyze the prompt and generate schema
    const schemaResponse = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a world-class data architect and research analyst. Your job is to analyze data requests and design optimal schemas for structured datasets.

When given a prompt, you must:
1. Identify the core entity type (companies, people, products, events, etc.)
2. Design columns that provide maximum value and insight
3. Consider data enrichment opportunities (calculated fields, categorizations, scores)
4. Think about what columns would enable powerful filtering, sorting, and analysis

Be creative but practical. The schema should enable users to derive genuine insights.`,
          },
          {
            role: "user",
            content: `Design the optimal data schema for this request: "${prompt}"

Return a schema that would deliver maximum value for this data need.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "define_schema",
              description: "Define the optimal schema for the requested dataset",
              parameters: {
                type: "object",
                properties: {
                  entity_type: {
                    type: "string",
                    description: "The primary entity type (e.g., 'company', 'person', 'product')",
                  },
                  title: {
                    type: "string",
                    description: "A descriptive title for this dataset",
                  },
                  description: {
                    type: "string",
                    description: "A brief description of what this dataset contains",
                  },
                  columns: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Column name in snake_case" },
                        type: { type: "string", enum: ["string", "number", "boolean", "date", "currency", "percentage", "url", "email"] },
                        description: { type: "string", description: "What this column represents" },
                        is_enriched: { type: "boolean", description: "Whether this is an AI-enriched/calculated field" },
                      },
                      required: ["name", "type", "description", "is_enriched"],
                      additionalProperties: false,
                    },
                  },
                  suggested_row_count: {
                    type: "number",
                    description: "Optimal number of rows (10-50 based on complexity)",
                  },
                  data_sources: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        type: { type: "string", enum: ["api", "database", "web_scrape", "ai_enrichment"] },
                        reliability: { type: "number", description: "0-1 reliability score" },
                      },
                      required: ["name", "type", "reliability"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["entity_type", "title", "description", "columns", "suggested_row_count", "data_sources"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "define_schema" } },
      }),
    });

    if (!schemaResponse.ok) {
      const errorText = await schemaResponse.text();
      console.error("Schema generation error:", errorText);
      if (schemaResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      if (schemaResponse.status === 402) {
        throw new Error("AI credits exhausted. Please add funds to continue.");
      }
      throw new Error("Failed to generate schema");
    }

    const schemaResult = await schemaResponse.json();
    const schemaArgs = JSON.parse(schemaResult.choices[0].message.tool_calls[0].function.arguments);
    
    console.log("Schema generated:", schemaArgs.title);

    // PHASE 2: Generate the actual data based on schema
    const dataResponse = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a world-class data generation specialist. You generate realistic, high-quality structured data that provides genuine value.

Your data should be:
- Realistic and plausible (real company names, realistic metrics, etc.)
- Diverse and representative of the domain
- Internally consistent (dates make sense, numbers are reasonable)
- Rich with useful details that enable analysis

For enriched/calculated fields, provide intelligent analysis and scoring.
Use real-world knowledge to make the data as valuable as possible.`,
          },
          {
            role: "user",
            content: `Generate ${schemaArgs.suggested_row_count} rows of high-quality data for: "${prompt}"

Schema to follow:
${JSON.stringify(schemaArgs.columns, null, 2)}

Make the data realistic, valuable, and ready for analysis. Use real company/product names where applicable. Provide genuine insights in any enriched fields.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_dataset",
              description: "Generate the structured dataset",
              parameters: {
                type: "object",
                properties: {
                  rows: {
                    type: "array",
                    description: "Array of data rows matching the schema",
                    items: { type: "object" },
                  },
                },
                required: ["rows"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_dataset" } },
      }),
    });

    if (!dataResponse.ok) {
      const errorText = await dataResponse.text();
      console.error("Data generation error:", errorText);
      throw new Error("Failed to generate data");
    }

    const dataResult = await dataResponse.json();
    const dataArgs = JSON.parse(dataResult.choices[0].message.tool_calls[0].function.arguments);
    
    console.log("Data generated:", dataArgs.rows.length, "rows");

    // PHASE 3: Generate rich insights
    const insightsResponse = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a senior data analyst providing executive-level insights. Your analysis should be:
- Actionable and specific
- Data-driven with specific numbers
- Forward-looking with recommendations
- Structured for quick consumption`,
          },
          {
            role: "user",
            content: `Analyze this dataset and provide rich insights:

Dataset: ${schemaArgs.title}
Description: ${schemaArgs.description}
Data (${dataArgs.rows.length} rows):
${JSON.stringify(dataArgs.rows.slice(0, 10), null, 2)}

Provide comprehensive analysis including trends, patterns, anomalies, and actionable recommendations.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_insights",
              description: "Provide comprehensive dataset insights",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Executive summary (2-3 sentences)" },
                  total_records: { type: "number" },
                  key_findings: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 key findings from the data",
                  },
                  top_categories: {
                    type: "array",
                    items: { type: "string" },
                    description: "Top categories/segments with percentages",
                  },
                  key_metrics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        value: { type: "string" },
                        trend: { type: "string", enum: ["up", "down", "stable"] },
                      },
                      required: ["label", "value", "trend"],
                      additionalProperties: false,
                    },
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 actionable recommendations",
                  },
                  data_quality_score: {
                    type: "number",
                    description: "Data quality score from 0-100",
                  },
                },
                required: ["summary", "total_records", "key_findings", "top_categories", "key_metrics", "recommendations", "data_quality_score"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_insights" } },
      }),
    });

    if (!insightsResponse.ok) {
      console.error("Insights generation error - using fallback");
      // Fallback insights if AI fails
    }

    let insights = {
      summary: schemaArgs.description,
      totalRecords: dataArgs.rows.length,
      keyFindings: ["Data generated successfully"],
      topCategories: [],
      keyMetrics: [],
      recommendations: ["Explore the data for patterns"],
      dataQualityScore: 85,
    };

    try {
      const insightsResult = await insightsResponse.json();
      const insightsArgs = JSON.parse(insightsResult.choices[0].message.tool_calls[0].function.arguments);
      insights = {
        summary: insightsArgs.summary,
        totalRecords: insightsArgs.total_records,
        keyFindings: insightsArgs.key_findings,
        topCategories: insightsArgs.top_categories,
        keyMetrics: insightsArgs.key_metrics,
        recommendations: insightsArgs.recommendations,
        dataQualityScore: insightsArgs.data_quality_score,
      };
    } catch (e) {
      console.error("Error parsing insights:", e);
    }

    console.log("Insights generated");

    // Calculate credits based on complexity
    const baseCredits = 5;
    const rowCredits = Math.ceil(dataArgs.rows.length / 10);
    const columnCredits = Math.ceil(schemaArgs.columns.length / 5);
    const creditsUsed = Math.min(baseCredits + rowCredits + columnCredits, 50);

    // Deduct credits
    const { data: deductResult, error: deductError } = await supabaseClient.rpc(
      "deduct_credits",
      {
        p_user_id: user.id,
        p_amount: creditsUsed,
        p_description: `Dataset: ${schemaArgs.title}`,
        p_dataset_id: datasetId,
      }
    );

    if (deductError || !deductResult) {
      console.error("Credit deduction failed:", deductError);
      throw new Error("Insufficient credits");
    }

    // Update dataset with results - THE SOURCE OF TRUTH
    const { error: updateError } = await supabaseClient
      .from("datasets")
      .update({
        title: schemaArgs.title,
        description: schemaArgs.description,
        status: "complete",
        row_count: dataArgs.rows.length,
        credits_used: creditsUsed,
        data: dataArgs.rows,
        insights,
        schema_definition: {
          entity_type: schemaArgs.entity_type,
          columns: schemaArgs.columns,
        },
        sources: schemaArgs.data_sources,
      })
      .eq("id", datasetId);

    if (updateError) {
      console.error("Dataset update error:", updateError);
      throw updateError;
    }

    // Update schema registry - LEARNING AND GROWING
    const { data: existingSchema } = await supabaseClient
      .from("schema_registry")
      .select("*")
      .eq("table_name", schemaArgs.entity_type)
      .single();

    if (!existingSchema) {
      // Create new schema entry
      await supabaseClient.from("schema_registry").insert({
        table_name: schemaArgs.entity_type,
        description: schemaArgs.description,
        columns: schemaArgs.columns,
        row_count: dataArgs.rows.length,
        sample_queries: [prompt],
      });
    } else {
      // Update existing schema with new learnings
      const updatedQueries = [...(existingSchema.sample_queries || []), prompt].slice(-10);
      const updatedRowCount = (existingSchema.row_count || 0) + dataArgs.rows.length;
      
      await supabaseClient
        .from("schema_registry")
        .update({
          row_count: updatedRowCount,
          sample_queries: updatedQueries,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSchema.id);
    }

    // Track data sources - EVER GROWING
    for (const source of schemaArgs.data_sources) {
      const { data: existingSource } = await supabaseClient
        .from("data_sources")
        .select("*")
        .eq("domain", source.name)
        .single();

      if (!existingSource) {
        await supabaseClient.from("data_sources").insert({
          domain: source.name,
          url: `https://${source.name.toLowerCase().replace(/\s+/g, '')}.com`,
          source_type: source.type,
          reliability_score: source.reliability,
          last_crawled: new Date().toISOString(),
        });
      } else {
        // Update reliability score (rolling average)
        const newReliability = (existingSource.reliability_score + source.reliability) / 2;
        await supabaseClient
          .from("data_sources")
          .update({
            reliability_score: newReliability,
            last_crawled: new Date().toISOString(),
          })
          .eq("id", existingSource.id);
      }
    }

    console.log("Dataset generation complete - all data persisted to source of truth");

    return new Response(
      JSON.stringify({
        title: schemaArgs.title,
        description: schemaArgs.description,
        data: dataArgs.rows,
        insights,
        schema: schemaArgs,
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
