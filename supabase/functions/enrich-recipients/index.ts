// BASED DATA — USASpending Recipient Enrichment
// Pulls verified revenue, employees, business types from USASpending recipient profiles
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const USA_SPENDING_BASE = "https://api.usaspending.gov/api/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const body = await req.json().catch(() => ({}));
  const limit = body.limit || 50;
  const results = { enriched: 0, skipped: 0, errors: 0 };

  try {
    // Find entities missing employee_count or annual_revenue that have UEIs
    const { data: entities } = await supabase
      .from("core_entities")
      .select("id, canonical_name, uei, duns")
      .is("employee_count", null)
      .not("uei", "is", null)
      .eq("is_canonical", true)
      .limit(limit);

    console.log(`[enrich-recipients] Found ${entities?.length || 0} entities to enrich`);

    for (const entity of entities || []) {
      try {
        // Rate limit
        await new Promise(r => setTimeout(r, 500));

        // Search USASpending for recipient profile
        const searchResp = await fetch(`${USA_SPENDING_BASE}/recipient/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword: entity.canonical_name,
            limit: 1,
          }),
        });

        if (!searchResp.ok) {
          results.errors++;
          continue;
        }

        const searchData = await searchResp.json();
        const recipient = searchData.results?.[0];

        if (!recipient?.id) {
          results.skipped++;
          continue;
        }

        // Get full recipient profile
        const profileResp = await fetch(`${USA_SPENDING_BASE}/recipient/${recipient.id}/`);
        if (!profileResp.ok) {
          results.errors++;
          continue;
        }

        const profile = await profileResp.json();

        // Extract enrichment data
        const updates: Record<string, any> = {};

        if (profile.business_types?.length) {
          updates.business_types = profile.business_types.map((bt: any) => bt.name || bt);
        }
        if (profile.total_transaction_amount) {
          updates.total_contract_value = Number(profile.total_transaction_amount) || undefined;
        }
        if (profile.total_transactions) {
          updates.contract_count = Number(profile.total_transactions) || undefined;
        }
        // USASpending may provide location info
        if (profile.location?.state_code && !entity.uei) {
          updates.state = profile.location.state_code;
        }
        if (profile.location?.city_name) {
          updates.city = profile.location.city_name;
        }

        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();
          const { error } = await supabase
            .from("core_entities")
            .update(updates)
            .eq("id", entity.id);

          if (error) {
            console.error(`Update error for ${entity.canonical_name}:`, error.message);
            results.errors++;
          } else {
            results.enriched++;
            console.log(`[enrich] ${entity.canonical_name}: +${Object.keys(updates).length - 1} fields`);
          }
        } else {
          results.skipped++;
        }

        // Store enrichment facts
        if (profile.business_types?.length) {
          await supabase.from("core_facts").upsert({
            entity_id: entity.id,
            fact_type: "business_types",
            fact_value: { types: profile.business_types, source: "usaspending_recipient_profile" },
            source_name: "usaspending_api",
            confidence: 0.95,
          }, { onConflict: "entity_id,fact_type,source_name" }).select();
        }

        if (profile.parent_name) {
          await supabase.from("core_facts").upsert({
            entity_id: entity.id,
            fact_type: "parent_organization",
            fact_value: { parent: profile.parent_name, parent_uei: profile.parent_uei },
            source_name: "usaspending_api",
            confidence: 0.95,
          }, { onConflict: "entity_id,fact_type,source_name" }).select();
        }
      } catch (e: any) {
        console.error(`Error enriching ${entity.canonical_name}:`, e.message);
        results.errors++;
      }
    }

    console.log(`[enrich-recipients] Done: ${results.enriched} enriched, ${results.skipped} skipped, ${results.errors} errors`);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Recipient enrichment error:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
